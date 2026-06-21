-- Ejecuta este archivo UNA VEZ en Supabase > SQL Editor
-- Permite que el editor simulado del frontend guarde artículos sin Supabase Auth.
-- Úsalo para entrega/demo académica. En producción, reemplázalo por login real con Supabase Auth.

create policy if not exists "Demo permite crear documentos" on documents
  for insert
  with check (true);

create policy if not exists "Demo permite crear versiones" on document_versions
  for insert
  with check (true);

create policy if not exists "Lectura pública de versiones" on document_versions
  for select
  using (true);
