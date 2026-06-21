-- Permisos de demostración para que el frontend pueda guardar datos desde Railway.
-- Ejecutar en Supabase → SQL Editor.

-- Evita recursión infinita en profiles causada por una policy que consulta profiles dentro de profiles.
DROP POLICY IF EXISTS "Admin ve todos los perfiles" ON profiles;
DROP POLICY IF EXISTS "Demo leer perfiles" ON profiles;
CREATE POLICY "Demo leer perfiles"
ON profiles
FOR SELECT
USING (true);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Demo permite crear documentos" ON documents;
CREATE POLICY "Demo permite crear documentos"
ON documents
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Demo permite leer documentos" ON documents;
CREATE POLICY "Demo permite leer documentos"
ON documents
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Demo permite crear versiones" ON document_versions;
CREATE POLICY "Demo permite crear versiones"
ON document_versions
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Lectura publica de versiones" ON document_versions;
CREATE POLICY "Lectura publica de versiones"
ON document_versions
FOR SELECT
USING (true);
