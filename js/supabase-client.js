// =========================================================
// CONFIGURACIÓN DE SUPABASE
// Reemplaza estos dos valores con los de TU proyecto:
// Supabase Dashboard → Project Settings → API
// =========================================================
export const SUPABASE_URL = "https://pofyewiwdbmyxddawhjg.supabase.co/";
export const SUPABASE_ANON_KEY = "sb_publishable_OORze12BxM8I6JSHv17iRA_XkrGtseO";

// Cliente único reutilizado en todo el sitio.
// Se importa el SDK desde CDN como módulo ES (no requiere npm/build step).
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Bandera para saber si ya configuraste tus credenciales reales.
export const SUPABASE_READY = !SUPABASE_URL.includes("TU-PROYECTO");
