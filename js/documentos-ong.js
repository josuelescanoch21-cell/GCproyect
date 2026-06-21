import { getMyDocuments, classifyDueDate, logProcess } from './data.js';

const board = document.getElementById('docsBoard');

function session(){ return window.GCAuth?.getSession?.() || null; }
function esc(v){ return String(v ?? '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
function roleName(role){ return window.GCAuth?.roleLabel?.(role) || role || 'Usuario'; }

function row(d){
  const c = classifyDueDate(d.vence_el);
  return `<article class="doc-status-card ${c.color}">
    <div>
      <span class="status-pill ${c.color}">${c.label}</span>
      <h3>${esc(d.title)}</h3>
      <p>${esc(d.entidad || 'Entidad no indicada')}</p>
    </div>
    <div class="doc-date">${c.dias === null ? 'Sin vencimiento' : c.dias + ' días'}</div>
  </article>`;
}

async function render(){
  const s = session();

  if(!s){
    board.innerHTML = `<section class="auth-required-panel"><h2>Inicia sesión</h2><p>Debes iniciar sesión para revisar permisos, documentos vigentes y renovaciones.</p><button id="loginDocs">Iniciar sesión</button></section>`;
    document.getElementById('loginDocs').onclick = () => window.GCAuth?.openAuthModal();
    return;
  }

  if(!['admin','editor'].includes(s.rol)){
    board.innerHTML = `<section class="auth-required-panel"><h2>Solo para Creador ONG</h2><p>Esta sección está orientada a usuarios que crean o gestionan una ONG.</p></section>`;
    return;
  }

  const docs = await getMyDocuments(s);
  const groups = { green:[], yellow:[], red:[] };
  docs.forEach(d => groups[classifyDueDate(d.vence_el).color].push(d));

  const scopeText = s.rol === 'admin'
    ? 'Vista global: estás revisando los documentos de todos los creadores ONG.'
    : 'Vista privada: solo se muestran los documentos asociados a tu cuenta de Creador ONG.';

  board.innerHTML = `
    <section class="card" style="margin-bottom:16px;">
      <h3>${esc(roleName(s.rol))}: ${esc(s.nombre || s.email)}</h3>
      <p class="sub">${scopeText}</p>
    </section>
    <div class="doc-columns">
      <section><h2>Vigentes</h2>${groups.green.map(row).join('') || '<p class="sub">No hay documentos vigentes.</p>'}</section>
      <section><h2>Por renovar</h2>${groups.yellow.map(row).join('') || '<p class="sub">Sin renovaciones próximas.</p>'}</section>
      <section><h2>Muy cerca</h2>${groups.red.map(row).join('') || '<p class="sub">Sin urgencias.</p>'}</section>
    </div>`;

  await logProcess('creador_ONG_revisa_estado_documentos', s.rol, { total: docs.length, scope: s.rol === 'admin' ? 'global' : 'owner' });
}

document.addEventListener('DOMContentLoaded', render);
document.addEventListener('gc-auth-change', render);
