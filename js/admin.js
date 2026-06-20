import { SUPABASE_READY } from './supabase-client.js';
import { signIn, signOut, getCurrentRole, createLaw, createLicense, getLaws, getLicenses } from './data.js';

const loginGate = document.getElementById('loginGate');
const adminContent = document.getElementById('adminContent');
const userChip = document.getElementById('userChip');

function notice(elId, message, ok = true) {
  const el = document.getElementById(elId);
  el.innerHTML = `<div class="notice ${ok ? 'ok' : 'err'}">${message}</div>`;
  setTimeout(() => { el.innerHTML = ''; }, 5000);
}

async function checkSession() {
  if (!SUPABASE_READY) {
    notice('loginNotice', 'Modo demo: Supabase no está conectado todavía. Revisa SUPABASE_SETUP.md para activar el guardado real.', false);
    return;
  }
  const role = await getCurrentRole();
  if (role && (role.role === 'admin' || role.role === 'editor')) {
    showAdmin(role);
  }
}

function showAdmin(role) {
  loginGate.classList.add('hidden');
  adminContent.classList.remove('hidden');
  userChip.style.display = 'flex';
  document.getElementById('userName').textContent = role.full_name || 'Usuario';
  document.getElementById('userRole').textContent = 'Rol: ' + role.role;
  document.getElementById('userAvatar').textContent = (role.full_name || 'U')[0].toUpperCase();
  refreshList();
}

document.getElementById('loginBtn').addEventListener('click', async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!SUPABASE_READY) { notice('loginNotice', 'Conecta Supabase primero (ver SUPABASE_SETUP.md).', false); return; }
  try {
    await signIn(email, password);
    const role = await getCurrentRole();
    if (!role || (role.role !== 'admin' && role.role !== 'editor')) {
      notice('loginNotice', 'Tu cuenta no tiene permisos de Editor/Administrador.', false);
      await signOut();
      return;
    }
    showAdmin(role);
  } catch (err) {
    notice('loginNotice', 'Credenciales inválidas: ' + err.message, false);
  }
});

// ---- Tabs ----
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tabLeyes').classList.add('hidden');
    document.getElementById('tabLicencias').classList.add('hidden');
    document.getElementById('tabLista').classList.add('hidden');
    const map = { leyes: 'tabLeyes', licencias: 'tabLicencias', lista: 'tabLista' };
    document.getElementById(map[btn.dataset.tab]).classList.remove('hidden');
    if (btn.dataset.tab === 'lista') refreshList();
  });
});

// ---- Guardar ley ----
document.getElementById('lawSaveBtn').addEventListener('click', async () => {
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
  const [laws, licenses] = await Promise.all([getLaws(), getLicenses()]);
  el.innerHTML = `
    <h4 style="font-size:13px;margin-bottom:8px;">Leyes (${laws.length})</h4>
    ${laws.map(l => `<div class="result-row"><div><div class="title">${l.title}</div><div class="snippet">${l.snippet || ''}</div></div></div>`).join('') || '<p class="sub">Sin leyes registradas.</p>'}
    <h4 style="font-size:13px;margin:18px 0 8px;">Licencias / trámites (${licenses.length})</h4>
    ${licenses.map(l => `<div class="alert-row"><div><div class="t">${l.title}</div><div class="d">${l.entidad || ''} · vence ${l.vence_el || ''}</div></div></div>`).join('') || '<p class="sub">Sin trámites registrados.</p>'}
  `;
}

checkSession();
