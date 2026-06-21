-- Actualización: Creador ONG + documentos separados por creador.
-- Ejecutar en Supabase > SQL Editor si tu proyecto ya tenía la base creada.

alter table documents
add column if not exists created_by_email text;

-- Coloca al usuario demo como dueño de documentos antiguos sin propietario.
update documents
set created_by_email = 'editor@ong.pe'
where created_by_email is null;

create index if not exists idx_documents_created_by_email
on documents (created_by_email);

-- Permisos demo para que el frontend con localStorage pueda leer/crear documentos.
-- La separación por creador se aplica en js/documentos-ong.js.
alter table documents enable row level security;

drop policy if exists "Demo permite leer documentos" on documents;
drop policy if exists "Demo permite crear documentos" on documents;
drop policy if exists "Demo permite actualizar documentos" on documents;

create policy "Demo permite leer documentos"
on documents for select
using (true);

create policy "Demo permite crear documentos"
on documents for insert
with check (true);

create policy "Demo permite actualizar documentos"
on documents for update
using (true)
with check (true);
