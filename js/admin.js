import { createLaw, createLicense, getLaws, getLicenses } from './data.js';

const loginGate = document.getElementById('loginGate');
const adminContent = document.getElementById('adminContent');
const userChip = document.getElementById('userChip');

function currentSession(){ return window.GCAuth ? window.GCAuth.getSession() : null; }
function isAdmin(){ const s = currentSession(); return !!s && s.rol === 'admin'; }

function notice(elId, message, ok = true) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = `<div class="notice ${ok ? 'ok' : 'err'}">${message}</div>`;
  setTimeout(() => { el.innerHTML = ''; }, 5000);
}

function showAdmin(session) {
  loginGate.classList.add('hidden');
  adminContent.classList.remove('hidden');
  userChip.style.display = 'flex';
  document.getElementById('userName').textContent = session.nombre || 'Administrador';
  document.getElementById('userRole').textContent = 'Rol: Administrador';
  document.getElementById('userAvatar').textContent = session.avatar || 'A';
  refreshList();
}

function showRestricted() {
  loginGate.classList.remove('hidden');
  adminContent.classList.add('hidden');
  userChip.style.display = 'none';
  loginGate.innerHTML = `
    <h3>Acceso administrativo</h3>
    <p class="sub" style="margin-bottom:16px;">Este panel solo se habilita al iniciar sesión con una cuenta Administrador.</p>
    <button class="btn-save" id="openAdminLogin">Iniciar sesión</button>
  `;
  document.getElementById('openAdminLogin').onclick = () => window.GCAuth?.openAuthModal();
}

function checkSession() {
  const session = currentSession();
  if (session?.rol === 'admin') showAdmin(session);
  else showRestricted();
}

// ---- Tabs ----
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    ['tabLeyes','tabLicencias','tabLista'].forEach(id => document.getElementById(id).classList.add('hidden'));
    const map = { leyes: 'tabLeyes', licencias: 'tabLicencias', lista: 'tabLista' };
    document.getElementById(map[btn.dataset.tab]).classList.remove('hidden');
    if (btn.dataset.tab === 'lista') refreshList();
  });
});

function requireAdminAction(noticeId){
  if (!isAdmin()) {
    notice(noticeId, 'Necesitas iniciar sesión como Administrador para realizar esta acción.', false);
    return false;
  }
  return true;
}

// ---- Guardar ley ----
document.getElementById('lawSaveBtn').addEventListener('click', async () => {
  if (!requireAdminAction('lawNotice')) return;
  const title = document.getElementById('lawTitle').value.trim();
  const snippet = document.getElementById('lawSnippet').value.trim();
  const entidad = document.getElementById('lawEntidad').value.trim();
  const linkExterno = document.getElementById('lawLink').value.trim();
  const tags = document.getElementById('lawTags').value.split(',').map(t => t.trim()).filter(Boolean);

  if (!title || !snippet) { notice('lawNotice', 'Título y resumen son obligatorios.', false); return; }
  try {
    await createLaw({ title, snippet, entidad, linkExterno, tags });
    notice('lawNotice', '✅ Ley publicada. Ya aparece en el buscador.');
    ['lawTitle','lawSnippet','lawEntidad','lawLink','lawTags'].forEach(id => document.getElementById(id).value = '');
  } catch (err) {
    notice('lawNotice', 'Error: ' + err.message, false);
  }
});

// ---- Guardar licencia ----
document.getElementById('licSaveBtn').addEventListener('click', async () => {
  if (!requireAdminAction('licenseNotice')) return;
  const title = document.getElementById('licTitle').value.trim();
  const entidad = document.getElementById('licEntidad').value.trim();
  const venceEl = document.getElementById('licFecha').value;
  const snippet = document.getElementById('licSnippet').value.trim();

  if (!title || !venceEl) { notice('licenseNotice', 'Nombre y fecha de vencimiento son obligatorios.', false); return; }
  try {
    await createLicense({ title, entidad, venceEl, snippet });
    notice('licenseNotice', '✅ Vencimiento registrado. Aparecerá en el inicio.');
    ['licTitle','licEntidad','licFecha','licSnippet'].forEach(id => document.getElementById(id).value = '');
  } catch (err) {
    notice('licenseNotice', 'Error: ' + err.message, false);
  }
});

// ---- Lista de registrados ----
async function refreshList() {
  const el = document.getElementById('adminList');
  if (!el) return;
  const [laws, licenses] = await Promise.all([getLaws(), getLicenses()]);
  el.innerHTML = `
    <h4 style="font-size:13px;margin-bottom:8px;">Leyes (${laws.length})</h4>
    ${laws.map(l => `<div class="result-row"><div><div class="title">${l.title}</div><div class="snippet">${l.snippet || ''}</div></div></div>`).join('') || '<p class="sub">Sin leyes registradas.</p>'}
    <h4 style="font-size:13px;margin:18px 0 8px;">Licencias / trámites (${licenses.length})</h4>
    ${licenses.map(l => `<div class="alert-row"><div><div class="t">${l.title}</div><div class="d">${l.entidad || ''} · vence ${l.vence_el || ''}</div></div></div>`).join('') || '<p class="sub">Sin trámites registrados.</p>'}
  `;
}

document.addEventListener('DOMContentLoaded', checkSession);
document.addEventListener('gc-auth-change', checkSession);
