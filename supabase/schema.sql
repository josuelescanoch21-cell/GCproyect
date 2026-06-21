-- =========================================================
-- PORTAL GC — Gestión de ONG · Esquema Supabase (PostgreSQL)
-- Cubre: roles y permisos, categorías y documentos, historial de
-- versiones, y registro de búsquedas para analítica.
-- =========================================================

-- 0. EXTENSIONES -------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";       -- búsqueda flexible (LIKE/similaridad)

-- Migración segura si ya habías corrido una versión anterior de este script:
alter table if exists documents add column if not exists tipo text not null default 'articulo';
alter table if exists documents add column if not exists link_externo text;

-- 1. ROLES Y PERMISOS ------------------------------------------------
create type user_role as enum ('admin', 'creador ONG', 'voluntario');

create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        user_role not null default 'voluntario',
  created_at  timestamptz not null default now()
);

-- Crea automáticamente un perfil "voluntario" cuando alguien se registra
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'voluntario');
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. CATEGORÍAS (jerárquicas) ---------------------------------------
create table if not exists categories (
  id          bigint generated always as identity primary key,
  name        text not null,
  slug        text not null unique,
  parent_id   bigint references categories(id) on delete set null,
  icon        text default '📁',
  created_at  timestamptz not null default now()
);

-- 3. DOCUMENTOS / ARTÍCULOS ----------------------------------------
create table if not exists documents (
  id            bigint generated always as identity primary key,
  title         text not null,
  slug          text unique,
  category_id   bigint references categories(id) on delete set null,
  tipo          text not null default 'articulo', -- articulo | ley | licencia
  entidad       text,                 -- APCI, SUNAT, SUNARP, Interno, etc.
  snippet       text,                 -- párrafo corto para la vista rápida
  content       text,                 -- cuerpo del documento (Markdown/WYSIWYG)
  link_externo  text,                 -- enlace "Ver más información" (norma oficial, etc.)
  tags          text[] default '{}',  -- etiquetas multidimensionales
  status        text default 'vigente', -- vigente | en-revision | vencido
  vence_el      date,                 -- fecha de vencimiento (licencias, informes, leyes a renovar)
  created_by    uuid references profiles(id),
  updated_by    uuid references profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_documents_title_trgm on documents using gin (title gin_trgm_ops);
create index if not exists idx_documents_snippet_trgm on documents using gin (snippet gin_trgm_ops);
create index if not exists idx_documents_tags on documents using gin (tags);
create index if not exists idx_documents_created_by_email on documents (created_by_email);

-- 4. HISTORIAL DE VERSIONES (control de cambios y auditoría) --------
create table if not exists document_versions (
  id           bigint generated always as identity primary key,
  document_id  bigint references documents(id) on delete cascade,
  title        text,
  content      text,
  edited_by    uuid references profiles(id),
  edited_at    timestamptz not null default now()
);

-- Guarda automáticamente la versión anterior antes de cada UPDATE
create or replace function public.save_document_version()
returns trigger language plpgsql as $$
begin
  insert into document_versions (document_id, title, content, edited_by)
  values (old.id, old.title, old.content, old.updated_by);
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_document_versions on documents;
create trigger trg_document_versions
  before update on documents
  for each row execute procedure public.save_document_version();

-- 5. ANALÍTICA DE BÚSQUEDAS ------------------------------------------
create table if not exists search_logs (
  id            bigint generated always as identity primary key,
  query         text not null,
  results_count int not null default 0,
  user_id       uuid references profiles(id),
  searched_at   timestamptz not null default now()
);

-- Vista: "consultas pendientes" -> búsquedas sin resultados
create or replace view v_search_gaps as
  select query, count(*) as veces, max(searched_at) as ultima_busqueda
  from search_logs
  where results_count = 0
  group by query
  order by veces desc;

-- Vista: documentos más consultados (necesitas la tabla document_views, ver abajo)
create table if not exists document_views (
  id           bigint generated always as identity primary key,
  document_id  bigint references documents(id) on delete cascade,
  viewed_at    timestamptz not null default now()
);

create or replace view v_top_documents as
  select d.id, d.title, count(v.id) as vistas
  from documents d
  left join document_views v on v.document_id = d.id
  group by d.id, d.title
  order by vistas desc;

-- 6. RLS (Row Level Security) ----------------------------------------
alter table documents enable row level security;
alter table categories enable row level security;
alter table profiles enable row level security;
alter table search_logs enable row level security;
alter table document_versions enable row level security;

-- Lectura pública de documentos y categorías (portal público)
create policy "Lectura pública de documentos" on documents
  for select using (true);
create policy "Lectura pública de categorías" on categories
  for select using (true);

-- Solo creadores ONG y admin pueden crear/editar documentos
create policy "Creador ONGes y admin escriben documentos" on documents
  for insert with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('creador ONG','admin'))
  );
create policy "Creador ONGes y admin actualizan documentos" on documents
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('creador ONG','admin'))
  );

-- Solo admin puede borrar
create policy "Solo admin borra documentos" on documents
  for delete using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Cada usuario ve y edita su propio perfil; admin ve todos
create policy "Ver propio perfil" on profiles for select using (auth.uid() = id);
create policy "Admin ve todos los perfiles" on profiles for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Cualquiera (incluso anónimo) puede insertar un log de búsqueda
create policy "Insertar logs de búsqueda" on search_logs for insert with check (true);
create policy "Leer logs de búsqueda (autenticados)" on search_logs for select using (auth.role() = 'authenticated');

-- 7. DATOS DE EJEMPLO (migra tu KNOWLEDGE_BASE actual de search.js) -
insert into categories (name, slug, icon) values
  ('Normativa Legal', 'marco-legal', 'DOC'),
  ('Constitución y Gobierno', 'constitucion', 'ONG'),
  ('Gestión de Proyectos y Fondos', 'proyectos-fondos', '💰'),
  ('Recursos Humanos y Voluntariado', 'rrhh-voluntariado', '👥'),
  ('Programas y Proyectos en Campo', 'programas-campo', '🎯'),
  ('Información Institucional', 'información-institucional', '📊')
on conflict (slug) do nothing;

insert into documents (title, category_id, entidad, snippet, tags, status, vence_el) values
  ('Ley N° 28882 — Ley de las Organizaciones No Gubernamentales',
    (select id from categories where slug='marco-legal'), 'APCI',
    'Regula la constitución, registro obligatorio, funcionamiento y supervisión de las ONG.',
    array['#ley','#vigente','#APCI'], 'vigente', null),
  ('Guía de Inscripción APCI — Paso a Paso',
    (select id from categories where slug='marco-legal'), 'APCI',
    'Proceso completo de inscripción en la APCI para ONG que reciben fondos del exterior.',
    array['#manual','#vigente','#APCI'], 'vigente', null),
  ('Manual del Voluntario — Inducción y Protocolo',
    (select id from categories where slug='rrhh-voluntariado'), 'RRHH Interno',
    'Guía completa para nuevos voluntarios: misión, visión, código de conducta y primeros pasos.',
    array['#manual','#interno','#publico'], 'vigente', null),
  ('Ley N° 29733 — Protección de Datos Personales',
    (select id from categories where slug='marco-legal'), 'MINJUSDH',
    'Obligaciones de la ONG al gestionar datos de beneficiarios, voluntarios y donantes.',
    array['#ley','#vigente','#MINJUSDH'], 'vigente', null),
  ('Modelo de Estatutos para ONG — Plantilla Notarial',
    (select id from categories where slug='constitucion'), 'SUNARP',
    'Documento fundacional tipo que define misión, visión, objetivos y estructura orgánica.',
    array['#plantilla','#interno','#SUNARP'], 'vigente', null),
  ('Informe Anual APCI 2025',
    (select id from categories where slug='marco-legal'), 'APCI',
    'Informe anual de actividades y uso de recursos ante la APCI.',
    array['#informe','#APCI'], 'en-revision', current_date + 15),
  ('Declaración Jurada SUNAT',
    (select id from categories where slug='marco-legal'), 'SUNAT',
    'Declaración jurada anual de exoneración tributaria.',
    array['#tributario','#SUNAT'], 'en-revision', current_date + 30),
  ('Renovación Convenio GIZ',
    (select id from categories where slug='proyectos-fondos'), 'MINJUSDH',
    'Convenio de cooperación con GIZ pendiente de renovación.',
    array['#convenio','#en-revision'], 'en-revision', current_date + 45)
on conflict do nothing;


-- Nota: para voluntariados y auditoría ejecuta también supabase/voluntariados_auditoria.sql
