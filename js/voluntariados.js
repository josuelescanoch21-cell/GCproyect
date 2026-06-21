
import { getVolunteerOpportunities, createVolunteerOpportunity, enrollVolunteer, getVolunteerRegistrations } from './data.js';
import { supabase, SUPABASE_READY } from './supabase-client.js';

const list = document.getElementById('volunteerList');
const empty = document.getElementById('volunteerEmpty');
const createPanel = document.getElementById('createOpportunityPanel');
const regsPanel = document.getElementById('registrationsPanel');
const filters = { q:'', modalidad:'', causa:'' };
let opportunities = [];

function session(){ return window.GCAuth?.getSession?.() || null; }
function canCreate(){ const r = session()?.rol; return r === 'editor' || r === 'admin'; }
function esc(v){ return String(v ?? '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
function notify(msg, ok=true){ const n = document.getElementById('volunteerNotice'); n.innerHTML = `<div class="notice ${ok?'ok':'err'}">${msg}</div>`; setTimeout(()=>n.innerHTML='',4500); }


function safeFileName(name){
  return String(name || 'imagen')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.\-_]/g, '-')
    .replace(/-+/g, '-');
}

async function uploadOpportunityImage(file){
  if(!file) return '';
  if(!SUPABASE_READY) throw new Error('Supabase no está configurado. No se puede subir la imagen.');
  if(!file.type.startsWith('image/')) throw new Error('Selecciona un archivo de imagen válido.');
  if(file.size > 3 * 1024 * 1024) throw new Error('La imagen no debe superar los 3 MB.');

  const path = `eventos/${Date.now()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage
    .from('voluntariados')
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if(error) throw new Error('Error subiendo imagen: ' + error.message);

  const { data } = supabase.storage
    .from('voluntariados')
    .getPublicUrl(path);

  return data.publicUrl;
}

function renderCards(){
  const q = filters.q.toLowerCase();
  const rows = opportunities.filter(o =>
    (!q || [o.title,o.ong_name,o.description,o.location,o.causa].some(v => String(v||'').toLowerCase().includes(q))) &&
    (!filters.modalidad || o.modalidad === filters.modalidad) &&
    (!filters.causa || o.causa === filters.causa)
  );
  list.innerHTML = rows.map(o => `
    <article class="vol-card">
      <div class="vol-image-slot">
        ${o.image_url ? `<img src="${esc(o.image_url)}" alt="${esc(o.title || 'Voluntariado')}" class="vol-card-img">` : `<span>${esc(o.ong_name || 'ONG')}</span><small>Sin imagen</small>`}
      </div>
      <div class="vol-body">
        <div class="vol-cause">${esc(o.causa || 'Voluntariado')}</div>
        <h3>${esc(o.title)}</h3>
        <p class="vol-org">${esc(o.ong_name || 'Organización')}</p>
        <div class="vol-meta"><span>${esc(o.date_start || 'Por definir')}</span><span>${esc(o.schedule || 'Horario flexible')}</span><span>${esc(o.location || 'Perú')}</span><span>${esc(o.modalidad || 'Virtual')}</span></div>
        <p class="vol-desc">${esc(o.description || '')}</p>
        <div class="vol-footer"><strong>Cupos disponibles: ${esc(o.slots || 0)}</strong><button data-enroll="${o.id}">Inscribirme</button></div>
      </div>
    </article>`).join('');
  empty.classList.toggle('hidden', rows.length > 0);
  document.querySelectorAll('[data-enroll]').forEach(btn => btn.onclick = async () => {
    const opp = opportunities.find(x => String(x.id) === String(btn.dataset.enroll));
    if(!session()){ window.GCAuth?.openAuthModal(); return; }
    try { await enrollVolunteer(opp); notify('Inscripción registrada. El proceso quedó auditado.'); await renderRegistrations(); }
    catch(err){ notify('' + err.message, false); }
  });
}

async function renderRegistrations(){
  if(!regsPanel) return;
  const s = session();
  if(!s){ regsPanel.innerHTML = '<p class="sub">Inicia sesión para ver tus inscripciones.</p>'; return; }
  const regs = await getVolunteerRegistrations();
  const visible = s.rol === 'admin' || s.rol === 'editor' ? regs : regs.filter(r => r.user_email === s.email);
  regsPanel.innerHTML = visible.length ? visible.map(r => `<div class="registration-row"><strong>${esc(r.opportunity_title)}</strong><span>${esc(r.user_name)} · ${esc(r.user_email)} · ${esc(r.status)}</span></div>`).join('') : '<p class="sub">Aún no hay inscripciones registradas.</p>';
}

async function init(){
  opportunities = await getVolunteerOpportunities();
  document.body.classList.toggle('editor-mode', canCreate());
  createPanel.classList.toggle('hidden', !canCreate());
  renderCards(); await renderRegistrations();

  document.getElementById('volSearch').oninput = e => { filters.q = e.target.value; renderCards(); };
  document.querySelectorAll('[data-modalidad]').forEach(el => el.onchange = () => { filters.modalidad = el.checked ? el.value : ''; document.querySelectorAll('[data-modalidad]').forEach(x => { if(x!==el) x.checked=false; }); renderCards(); });
  document.querySelectorAll('[data-causa]').forEach(el => el.onclick = () => { filters.causa = el.dataset.causa === filters.causa ? '' : el.dataset.causa; document.querySelectorAll('[data-causa]').forEach(x => x.classList.toggle('selected', x.dataset.causa===filters.causa)); renderCards(); });

  document.getElementById('createOpportunityForm').onsubmit = async e => {
    e.preventDefault();
    if(!canCreate()){ notify('Necesitas rol Representante ONG o Administrador para crear voluntariados.', false); return; }
    const imageFile = document.getElementById('opImage')?.files?.[0] || null;

    const payload = {
      title: document.getElementById('opTitle').value.trim(),
      ong_name: document.getElementById('opOrg').value.trim(),
      modalidad: document.getElementById('opModalidad').value,
      causa: document.getElementById('opCausa').value.trim(),
      location: document.getElementById('opLocation').value.trim(),
      date_start: document.getElementById('opDate').value,
      schedule: document.getElementById('opSchedule').value.trim(),
      duration: document.getElementById('opDuration').value.trim(),
      slots: Number(document.getElementById('opSlots').value || 0),
      description: document.getElementById('opDescription').value.trim()
    };
    if(!payload.title || !payload.ong_name || !payload.date_start){ notify('Completa título, organización y fecha.', false); return; }
    try {
      payload.image_url = await uploadOpportunityImage(imageFile);
      const created = await createVolunteerOpportunity(payload);
      opportunities.unshift(created);
      renderCards();
      e.target.reset();
      notify('Voluntariado creado con imagen y registrado en auditoría.');
    }
    catch(err){ notify('' + err.message, false); }
  };
}

document.addEventListener('DOMContentLoaded', init);
document.addEventListener('gc-auth-change', init);
