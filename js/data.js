import { supabase, SUPABASE_READY } from './supabase-client.js';

// ---- Fallback local (se usa solo si Supabase no está configurado aún) ----
const FALLBACK_DOCS = [
  { id: 1, title: "Ley N° 28882 — Ley de las ONG", entidad: "APCI", snippet: "Regula la constitución, registro y supervisión de las ONGs.", tags: ["#ley","#vigente","#APCI"], status: "vigente", categories: { name: "Marco Legal y Normativo", icon: "📋" } },
  { id: 2, title: "Guía de Inscripción APCI", entidad: "APCI", snippet: "Proceso completo de inscripción ante la APCI.", tags: ["#manual","#APCI"], status: "vigente", categories: { name: "Marco Legal y Normativo", icon: "📋" } },
  { id: 3, title: "Manual del Voluntario", entidad: "RRHH Interno", snippet: "Guía de inducción para nuevos voluntarios.", tags: ["#manual","#interno"], status: "vigente", categories: { name: "RRHH y Voluntariado", icon: "👥" } },
  { id: 4, title: "Ley N° 29733 — Protección de Datos", entidad: "MINJUSDH", snippet: "Obligaciones sobre datos de beneficiarios y donantes.", tags: ["#ley","#vigente"], status: "vigente", categories: { name: "Marco Legal y Normativo", icon: "📋" } },
  { id: 5, title: "Informe Anual APCI 2025", entidad: "APCI", snippet: "Informe anual de actividades ante la APCI.", tags: ["#informe"], status: "en-revision", categories: { name: "Marco Legal y Normativo", icon: "📋" } },
];

const FALLBACK_CATEGORIES = [
  { id: 1, name: "Marco Legal y Normativo", icon: "📋", slug: "marco-legal" },
  { id: 2, name: "Constitución y Gobierno", icon: "🏢", slug: "constitucion" },
  { id: 3, name: "Gestión de Proyectos y Fondos", icon: "💰", slug: "proyectos-fondos" },
  { id: 4, name: "RRHH y Voluntariado", icon: "👥", slug: "rrhh-voluntariado" },
  { id: 5, name: "Programas en Campo", icon: "🎯", slug: "programas-campo" },
  { id: 6, name: "Conocimiento Institucional", icon: "📊", slug: "conocimiento-institucional" },
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

  // Registra la búsqueda para detectar contenido faltante
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
// PANEL ADMIN — escritura de datos (requiere sesión con rol editor/admin)
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
