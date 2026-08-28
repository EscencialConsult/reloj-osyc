-- ============================================================================
-- OSYC — FASE 4: Biometría facial (MVP)
-- Ejecutar en: Supabase → SQL Editor → Run   (es idempotente, se puede re-correr)
-- ----------------------------------------------------------------------------
-- Guarda el "vector facial" (descriptor de 128 números que describe la cara,
-- NO la foto) de cada empleado. La comparación de caras se hace en el navegador
-- con face-api.js; acá solo se guarda y se devuelve el vector del propio usuario.
--
-- Privacidad: NO se guarda ninguna foto. Solo un vector de números del que no se
-- puede reconstruir la cara. Cada usuario solo puede leer/escribir SU vector
-- (todo pasa por funciones SECURITY DEFINER; la tabla queda cerrada con RLS).
-- ============================================================================

-- ── TABLA: un vector facial por usuario ─────────────────────────────────────
create table if not exists public.biometria_facial (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  personal_id uuid references public.personal(id) on delete set null,
  descriptor  jsonb not null,                 -- array de 128 floats (face-api.js)
  modelo      text  not null default 'faceapi-128',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.biometria_facial is
  'Vector facial (embedding) por empleado para el fichaje con reconocimiento facial. No guarda fotos.';
comment on column public.biometria_facial.descriptor is
  'Array JSON de 128 floats generado por face-api.js. No permite reconstruir la cara.';

-- ── Consentimiento (Ley 25.326): constancia de que el empleado aceptó ───────
-- (ADD COLUMN IF NOT EXISTS para poder re-correr aunque la tabla ya exista)
alter table public.biometria_facial
  add column if not exists consentimiento_ts      timestamptz;   -- cuándo aceptó
alter table public.biometria_facial
  add column if not exists consentimiento_version text;          -- qué texto aceptó (ej. 'v1')
comment on column public.biometria_facial.consentimiento_ts is
  'Fecha/hora en que el empleado aceptó el uso de su dato biométrico.';

-- ── RLS: tabla cerrada. Solo se accede vía las funciones de abajo ───────────
alter table public.biometria_facial enable row level security;
-- (a propósito NO creamos políticas de acceso directo: nadie lee/escribe esta
--  tabla con la clave pública; todo pasa por guardar_biometria() / mi_biometria())

-- ── Guardar / actualizar el vector facial del usuario logueado ──────────────
-- Requiere el consentimiento del empleado (p_consent_version) y deja constancia.
-- Se elimina la versión vieja de 1 argumento por si quedó de una corrida previa.
drop function if exists public.guardar_biometria(jsonb);
create or replace function public.guardar_biometria(
  p_descriptor      jsonb,
  p_consent_version text default null    -- versión del texto de consentimiento aceptado
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_pid uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'msg', 'Iniciá sesión para registrar tu cara.');
  end if;

  -- validar que el descriptor sea un array de 128 números
  if p_descriptor is null
     or jsonb_typeof(p_descriptor) <> 'array'
     or jsonb_array_length(p_descriptor) <> 128 then
    return jsonb_build_object('ok', false, 'msg', 'El registro facial no es válido. Probá de nuevo.');
  end if;

  -- exigir consentimiento (Ley 25.326): sin aceptación no se guarda el dato
  if p_consent_version is null or trim(p_consent_version) = '' then
    return jsonb_build_object('ok', false, 'msg', 'Falta el consentimiento para usar el dato biométrico.');
  end if;

  select id into v_pid from public.personal where user_id = v_uid and activo = true limit 1;
  if v_pid is null then
    return jsonb_build_object('ok', false, 'msg', 'Tu usuario no está habilitado.');
  end if;

  insert into public.biometria_facial
         (user_id, personal_id, descriptor, consentimiento_ts, consentimiento_version, updated_at)
       values
         (v_uid, v_pid, p_descriptor, now(), trim(p_consent_version), now())
  on conflict (user_id) do update
       set descriptor             = excluded.descriptor,
           personal_id            = excluded.personal_id,
           consentimiento_ts      = now(),
           consentimiento_version = excluded.consentimiento_version,
           updated_at             = now();

  return jsonb_build_object('ok', true, 'msg', 'Cara registrada correctamente.');
end $$;
grant execute on function public.guardar_biometria(jsonb, text) to authenticated;

-- ── Devolver el vector facial del usuario logueado (o enrolado=false) ────────
create or replace function public.mi_biometria()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_desc jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('enrolado', false);
  end if;
  select descriptor into v_desc from public.biometria_facial where user_id = v_uid;
  if v_desc is null then
    return jsonb_build_object('enrolado', false);
  end if;
  return jsonb_build_object('enrolado', true, 'descriptor', v_desc);
end $$;
grant execute on function public.mi_biometria() to authenticated;

-- ── (Opcional, para el admin en Fase 2) borrar el registro facial de alguien ─
-- create or replace function public.borrar_biometria(p_user_id uuid) ...  (más adelante)

-- ── Verificación ────────────────────────────────────────────────────────────
-- select relname, relrowsecurity from pg_class where relname = 'biometria_facial';
-- ============================================================================
