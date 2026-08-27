-- ============================================================================
-- OSYC — Arreglo del error 403 al guardar en el panel Admin
-- ----------------------------------------------------------------------------
-- SÍNTOMA: en el panel, al tocar Guardar (áreas, plantillas, URL, sucursales,
--   personal, etc.) aparece "No se pudo guardar" y en la consola del navegador
--   se ve un error 403 (Forbidden) sobre  /rest/v1/<tabla>.
--
-- CAUSA: las tablas del panel quedaron con RLS (Row Level Security) ACTIVADO
--   pero SIN políticas, o sin permisos para los roles públicos → la base
--   rechaza toda escritura.
--
-- SOLUCIÓN: dejar las tablas del panel como en el diseño original (el panel las
--   maneja con la clave pública) y proteger SOLO `fichajes` (que se escribe
--   únicamente a través de la función fichar()).
--
-- Ejecutar en: Supabase → SQL Editor → pegar TODO → Run.   Es idempotente.
-- ============================================================================

-- 1) Permisos de tablas y secuencias para los roles públicos (anon/authenticated)
grant usage on schema public to anon, authenticated;
grant all on all tables    in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;

-- 2) RLS APAGADO en las tablas del panel
alter table public.personal            disable row level security;
alter table public.registros           disable row level security;
alter table public.horarios_semanales  disable row level security;
alter table public.actividad_log       disable row level security;
alter table public.configuracion       disable row level security;
alter table public.lideres             disable row level security;
alter table public.sedes               disable row level security;

-- 3) RLS ENCENDIDO solo en `fichajes` (la tabla sensible: nadie puede inventar
--    un fichaje "validado" desde el navegador; solo entra vía fichar()).
alter table public.fichajes enable row level security;

-- ── Verificación (opcional): fichajes = true, el resto = false ──────────────
-- select relname, relrowsecurity as rls_activo
--   from pg_class
--  where relname in ('personal','registros','horarios_semanales','actividad_log',
--                    'configuracion','lideres','sedes','fichajes')
--  order by relname;
-- ============================================================================
