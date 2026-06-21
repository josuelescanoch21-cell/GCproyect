
import { getDocuments, classifyDueDate, logProcess } from './data.js';
const board = document.getElementById('docsBoard');
function s(){ return window.GCAuth?.getSession?.() || null; }
function esc(v){ return String(v ?? '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
function row(d){ const c = classifyDueDate(d.vence_el); return `<article class="doc-status-card ${c.color}"><div><span class="status-pill ${c.color}">${c.label}</span><h3>${esc(d.title)}</h3><p>${esc(d.entidad || 'Entidad no indicada')}</p></div><div class="doc-date">${c.dias === null ? 'Sin vencimiento' : c.dias + ' días'}</div></article>`; }
async function render(){
  const session = s();
  if(!session){ board.innerHTML = '<section class="auth-required-panel"><h2>Inicia sesión</h2><p>Debes iniciar sesión para revisar permisos, documentos vigentes y renovaciones.</p><button id="loginDocs">Iniciar sesión</button></section>'; document.getElementById('loginDocs').onclick = () => window.GCAuth?.openAuthModal(); return; }
  if(!['representante ONG','admin'].includes(session.rol)){ board.innerHTML = '<section class="auth-required-panel"><h2>Solo para representante ONGes</h2><p>Esta sección está orientada a personas o compañías que crearán o gestionarán una ONG.</p></section>'; return; }
  const docs = await getDocuments();
  const groups = { green:[], yellow:[], red:[] };
  docs.forEach(d => groups[classifyDueDate(d.vence_el).color].push(d));
  board.innerHTML = `<div class="doc-columns"><section><h2>Vigentes</h2>${groups.green.map(row).join('') || '<p class="sub">No hay documentos vigentes.</p>'}</section><section><h2>Por renovar</h2>${groups.yellow.map(row).join('') || '<p class="sub">Sin renovaciones próximas.</p>'}</section><section><h2>Muy cerca</h2>${groups.red.map(row).join('') || '<p class="sub">Sin urgencias.</p>'}</section></div>`;
  await logProcess('representante ONG_revisa_estado_documentos', session.rol, { total: docs.length });
}
document.addEventListener('DOMContentLoaded', render);
document.addEventListener('gc-auth-change', render);
