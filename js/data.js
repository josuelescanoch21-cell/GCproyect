import { supabase, SUPABASE_READY } from './supabase-client.js';

// ---- Fallback local (se usa solo si Supabase no está configurado aún) ----
const FALLBACK_DOCS = [
  { id: 1, title: "Ley N° 28882 — Ley de las ONG", entidad: "APCI", snippet: "Regula la constitución, registro y supervisión de las ONG.", tags: ["#ley","#vigente","#APCI"], status: "vigente", categories: { name: "Normativa Legal", icon: "DOC" } },
  { id: 2, title: "Guía de Inscripción APCI", entidad: "APCI", snippet: "Proceso completo de inscripción ante la APCI.", tags: ["#manual","#APCI"], status: "vigente", categories: { name: "Normativa Legal", icon: "DOC" } },
  { id: 3, title: "Manual del Voluntario", entidad: "RRHH Interno", snippet: "Guía de inducción para nuevos voluntarios.", tags: ["#manual","#interno"], status: "vigente", categories: { name: "RRHH y Voluntariado", icon: "VOL" } },
  { id: 4, title: "Ley N° 29733 — Protección de Datos", entidad: "MINJUSDH", snippet: "Obligaciones sobre datos de beneficiarios y donantes.", tags: ["#ley","#vigente"], status: "vigente", categories: { name: "Normativa Legal", icon: "DOC" } },
  { id: 5, title: "Informe Anual APCI 2025", entidad: "APCI", snippet: "Informe anual de actividades ante la APCI.", tags: ["#informe"], status: "en-revision", categories: { name: "Normativa Legal", icon: "DOC" } },
];

const FALLBACK_CATEGORIES = [
  { id: 1, name: "Normativa Legal", icon: "DOC", slug: "marco-legal" },
  { id: 2, name: "Constitución y Gobierno", icon: "ONG", slug: "constitucion" },
  { id: 3, name: "Gestión de Proyectos y Fondos", icon: "FON", slug: "proyectos-fondos" },
  { id: 4, name: "RRHH y Voluntariado", icon: "VOL", slug: "rrhh-voluntariado" },
  { id: 5, name: "Programas en Campo", icon: "PRG", slug: "programas-campo" },
  { id: 6, name: "Información Institucional", icon: "INF", slug: "información-institucional" },
];

export async function getDocuments() {
  if (!SUPABASE_READY) return FALLBACK_DOCS;
  const { data, error } = await supabase
    .from('documents')
    .select('id, title, entidad, snippet, tags, status, vence_el, categories ( name, icon )')
    .order('created_at', { ascending: false });
  if (error) { console.warn('Supabase error, usando datos locales:', error.message); return FALLBACK_DOCS; }
  return data;
}

export async function getCategories() {
  if (!SUPABASE_READY) return FALLBACK_CATEGORIES;
  const { data, error } = await supabase.from('categories').select('*').order('id');
  if (error) { console.warn(error.message); return FALLBACK_CATEGORIES; }
  return data;
}

export async function searchDocuments(query) {
  const docs = await getDocuments();
  const q = query.toLowerCase();
  const results = docs.filter(d =>
    d.title.toLowerCase().includes(q) ||
    (d.snippet || '').toLowerCase().includes(q) ||
    (d.tags || []).some(t => t.toLowerCase().includes(q)) ||
    (d.entidad || '').toLowerCase().includes(q)
  );

  // Registra la búsqueda para detectar información solicitada
  if (SUPABASE_READY) {
    await supabase.from('search_logs').insert({ query, results_count: results.length });
  }
  return results;
}

export async function getAlerts() {
  if (!SUPABASE_READY) {
    return [
      { title: "Informe Anual APCI 2025", entidad: "APCI", status: "en-revision", dias: 15 },
      { title: "Declaración Jurada SUNAT", entidad: "SUNAT", status: "en-revision", dias: 30 },
      { title: "Renovación Convenio GIZ", entidad: "MINJUSDH", status: "en-revision", dias: 45 },
    ];
  }
  const { data, error } = await supabase
    .from('documents')
    .select('title, entidad, status, vence_el')
    .not('vence_el', 'is', null)
    .order('vence_el', { ascending: true });
  if (error) return [];
  return data.map(d => ({ ...d, dias: Math.ceil((new Date(d.vence_el) - new Date()) / 86400000) }));
}

// ---------------------------------------------------------------
// PANEL ADMIN — escritura de datos (requiere sesión con rol representante ONG/admin)
// ---------------------------------------------------------------

// Registra una ley nueva o una modificación de ley vigente.
// Aparece en el buscador con vista rápida (snippet) + enlace a la norma completa.
export async function createLaw({ title, snippet, entidad, categoryId, linkExterno, tags }) {
  if (!SUPABASE_READY) throw new Error('Conecta Supabase primero (ver SUPABASE_SETUP.md).');
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('documents').insert({
    title,
    snippet,
    entidad,
    category_id: categoryId || null,
    tipo: 'ley',
    link_externo: linkExterno || null,
    tags: tags || [],
    status: 'vigente',
    created_by: userData?.user?.id || null,
  }).select();
  if (error) throw error;
  return data;
}

// Registra una licencia, permiso o trámite de la ONG que está por vencer.
export async function createLicense({ title, entidad, venceEl, snippet }) {
  if (!SUPABASE_READY) throw new Error('Conecta Supabase primero (ver SUPABASE_SETUP.md).');
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('documents').insert({
    title,
    entidad,
    snippet: snippet || null,
    tipo: 'licencia',
    status: 'en-revision',
    vence_el: venceEl,
    created_by: userData?.user?.id || null,
  }).select();
  if (error) throw error;
  return data;
}

// Trae solo leyes (para listarlas en el panel admin)
export async function getLaws() {
  const docs = await getDocuments();
  return docs.filter(d => d.tipo === 'ley' || !d.tipo); // !d.tipo cubre datos de ejemplo viejos
}

// Trae solo licencias/trámites (para el panel admin y el widget de alertas)
export async function getLicenses() {
  const docs = await getDocuments();
  return docs.filter(d => d.tipo === 'licencia');
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getCurrentRole() {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return null;
  const { data, error } = await supabase.from('profiles').select('role, full_name').eq('id', userData.user.id).single();
  if (error) return null;
  return data;
}


// ---------------------------------------------------------------
// VOLUNTARIADOS Y AUDITORÍA DE PROCESOS
// ---------------------------------------------------------------
const LOCAL_VOLUNTEERS_KEY = 'ong_volunteer_opportunities_v1';
const LOCAL_REGISTRATIONS_KEY = 'ong_volunteer_registrations_v1';
const LOCAL_AUDIT_KEY = 'ong_process_audit_v1';

const DEFAULT_OPPORTUNITIES = [
  { id: 1, title: 'Mentoría para constitución de ONG', ong_name: 'GestionaONG', modalidad: 'Virtual', causa: 'Educación', location: 'Lima', date_start: '2026-07-22', schedule: '16:00 a 18:00', duration: '2 horas', slots: 15, description: 'Acompañamiento para personas que desean formalizar una ONG y ordenar sus requisitos legales.', created_by_email: 'editor@ong.pe' },
  { id: 2, title: 'Taller de documentación legal', ong_name: 'GestionaONG', modalidad: 'Híbrido', causa: 'Gestión institucional', location: 'Lima', date_start: '2026-07-28', schedule: '19:00 a 21:00', duration: '2 horas', slots: 12, description: 'Revisión de documentos, permisos vigentes y alertas de renovación para organizaciones sociales.', created_by_email: 'editor@ong.pe' },
  { id: 3, title: 'Campaña de voluntariado comunitario', ong_name: 'ONG Aliada', modalidad: 'Presencial', causa: 'Comunidad', location: 'Lima', date_start: '2026-08-05', schedule: '09:00 a 13:00', duration: '4 horas', slots: 20, description: 'Apoyo en orientación ciudadana y difusión de requisitos para organizaciones sin fines de lucro.', created_by_email: 'editor@ong.pe' }
];

function getLocal(key, fallback){
  try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch { return fallback; }
}
function setLocal(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function currentLocalSession(){ try { return JSON.parse(localStorage.getItem('gc_portal_session_v2') || 'null'); } catch { return null; } }

export async function logProcess(action, role, detail = {}) {
  const session = currentLocalSession();
  const record = {
    action,
    role: role || session?.rol || 'anonimo',
    user_email: session?.email || detail.user_email || null,
    user_name: session?.nombre || detail.user_name || null,
    detail,
    created_at: new Date().toISOString()
  };
  if (SUPABASE_READY) {
    const { error } = await supabase.from('audit_logs').insert(record);
    if (!error) return record;
    console.warn('No se pudo registrar auditoría en Supabase:', error.message);
  }
  const logs = getLocal(LOCAL_AUDIT_KEY, []);
  logs.unshift({ id: Date.now(), ...record });
  setLocal(LOCAL_AUDIT_KEY, logs.slice(0, 200));
  return record;
}

export async function getAuditLogs() {
  if (SUPABASE_READY) {
    const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending:false }).limit(100);
    if (!error) return data;
  }
  return getLocal(LOCAL_AUDIT_KEY, []);
}

export async function getVolunteerOpportunities() {
  if (SUPABASE_READY) {
    const { data, error } = await supabase.from('volunteer_opportunities').select('*').order('created_at', { ascending:false });
    if (!error) return data;
    console.warn('Voluntariados desde local:', error.message);
  }
  const local = getLocal(LOCAL_VOLUNTEERS_KEY, null);
  if (!local) { setLocal(LOCAL_VOLUNTEERS_KEY, DEFAULT_OPPORTUNITIES); return DEFAULT_OPPORTUNITIES; }
  return local;
}

export async function createVolunteerOpportunity(payload) {
  const session = currentLocalSession();
  const item = { ...payload, created_by_email: session?.email || null };
  if (SUPABASE_READY) {
    const { data, error } = await supabase.from('volunteer_opportunities').insert(item).select().single();
    if (!error) { await logProcess('representante ONG_crea_voluntariado', session?.rol, { opportunity_id: data.id, title: data.title }); return data; }
    throw error;
  }
  const rows = await getVolunteerOpportunities();
  const created = { id: Date.now(), created_at: new Date().toISOString(), ...item };
  rows.unshift(created); setLocal(LOCAL_VOLUNTEERS_KEY, rows);
  await logProcess('representante ONG_crea_voluntariado', session?.rol, { opportunity_id: created.id, title: created.title });
  return created;
}

export async function enrollVolunteer(opportunity) {
  const session = currentLocalSession();
  if (!session) throw new Error('Debes iniciar sesión o registrarte para inscribirte.');
  const record = { opportunity_id: opportunity.id, opportunity_title: opportunity.title, user_email: session.email, user_name: session.nombre, role: session.rol, status: 'inscrito' };
  if (SUPABASE_READY) {
    const { data, error } = await supabase.from('volunteer_registrations').insert(record).select().single();
    if (!error) { await logProcess('voluntario_se_inscribe_voluntariado', session.rol, { opportunity_id: opportunity.id, title: opportunity.title }); return data; }
    throw error;
  }
  const regs = getLocal(LOCAL_REGISTRATIONS_KEY, []);
  if (regs.some(r => r.opportunity_id == opportunity.id && r.user_email === session.email)) throw new Error('Ya estás inscrito en este voluntariado.');
  const created = { id: Date.now(), created_at: new Date().toISOString(), ...record };
  regs.unshift(created); setLocal(LOCAL_REGISTRATIONS_KEY, regs);
  await logProcess('voluntario_se_inscribe_voluntariado', session.rol, { opportunity_id: opportunity.id, title: opportunity.title });
  return created;
}

export async function getVolunteerRegistrations() {
  if (SUPABASE_READY) {
    const { data, error } = await supabase.from('volunteer_registrations').select('*').order('created_at', { ascending:false });
    if (!error) return data;
  }
  return getLocal(LOCAL_REGISTRATIONS_KEY, []);
}

export function classifyDueDate(venceEl) {
  if (!venceEl) return { label:'Vigente', color:'green', dias:null };
  const dias = Math.ceil((new Date(venceEl) - new Date()) / 86400000);
  if (dias <= 7) return { label:'Muy cerca de vencer', color:'red', dias };
  if (dias <= 30) return { label:'Por renovar', color:'yellow', dias };
  return { label:'Vigente', color:'green', dias };
}
