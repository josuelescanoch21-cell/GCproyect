# Integración con Supabase — GestionaONG

## 1. Crear el proyecto
1. Ve a https://supabase.com → **New project**.
2. Elige una contraseña de base de datos y la región (sugerido: `South America`).
3. Espera 1-2 min a que se aprovisione.

## 2. Crear las tablas
1. En el panel izquierdo abre **SQL Creador ONG → New query**.
2. Copia y pega **todo** el contenido de `supabase/schema.sql` (incluido en este zip).
3. Click **Run**. Esto crea:
   - `categories`, `documents`, `document_versions` (organización de trámites + historial/diff)
   - `profiles` con rol `admin / creador ONG / voluntario` (roles y permisos)
   - `search_logs`, `document_views` + vistas `v_search_gaps` / `v_top_documents` (analítica de uso)
   - Políticas RLS (lectura pública, escritura solo creador ONG/admin, borrado solo admin)
   - 6 categorías y 8 documentos de ejemplo (migrados de tu `KNOWLEDGE_BASE` actual)

## 3. Obtener tus llaves
En **Project Settings → API** copia:
- `Project URL`
- `anon public` key

## 4. Conectar el frontend
Abre `js/supabase-client.js` y reemplaza:
```js
export const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
export const SUPABASE_ANON_KEY = "TU-ANON-KEY-PUBLICA";
```
con tus valores reales. **Nunca pongas aquí la `service_role` key** (esa es solo para backend/servidor).

Mientras no cambies estos valores, el dashboard sigue funcionando con datos de ejemplo locales (modo offline) gracias al *fallback* en `js/data.js` — así no se rompe nada antes de que termines la integración.

## 5. Probar
- Abre `index.html` con un servidor local (no `file://`, porque los módulos ES + fetch necesitan `http://`). Ejemplos:
  ```bash
  npx serve .
  # o
  python3 -m http.server 8080
  ```
- Verifica en la consola del navegador que no haya errores de Supabase.
- Haz una búsqueda: debería insertarse una fila en la tabla `search_logs` (verifícalo en **Table Creador ONG**).

## 6. Publicar en GitHub Pages (o el hosting que ya usas)
Como `SUPABASE_ANON_KEY` es una llave **pública** (protegida por RLS, no por secreto), es seguro subirla a tu repo y a GitHub Pages tal cual. Solo asegúrate de que las políticas RLS de `schema.sql` queden activas.

## 7. Siguientes pasos opcionales
- **Login real**: usa `supabase.auth.signInWithPassword()` o magic link, y lee `profiles.role` para mostrar/ocultar botones de editar según el rol.
- **Creador ONG de contenido**: conecta un WYSIWYG (p. ej. Quill o Tiptap) que guarde en `documents.content`; el trigger `save_document_version` ya guarda el historial automáticamente.
- **Panel analítico**: las vistas `v_search_gaps` y `v_top_documents` ya están listas — solo falta una página que las consuma y grafique (puedo ayudarte a construirla cuando quieras).

## Resumen de lo que incluye la base de datos
- **Guía de Trámites y documentos**: organización jerárquica del contenido.
- **Búsqueda**: índices de texto (`pg_trgm`) para resultados rápidos y tolerantes a errores de tipeo.
- **Roles y permisos**: `admin / creador ONG / voluntario` con políticas de acceso (RLS).
- **Historial de versiones**: cada edición de un documento queda guardada automáticamente.
- **Analítica de búsquedas**: registro de qué se busca y qué no encuentra resultados, para detectar contenido faltante.
