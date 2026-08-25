-- ============================================================================
-- ONE Horarios — ESQUEMA COMPLETO (proyecto Supabase NUEVO / cliente nuevo)
-- ----------------------------------------------------------------------------
-- Crea TODA la base desde cero:
--   • 6 tablas que ya usa el sistema actual (para que la app siga igual)
--   • 2 tablas nuevas para el fichaje con GPS (sedes, fichajes)
--   • Realtime del log de auditoría
--
-- Cómo usar:  Supabase (proyecto nuevo)  →  SQL Editor  →  pegar todo  →  Run
-- Es idempotente: se puede correr más de una vez sin romper nada.
-- Zona horaria de referencia para fechas: America/Argentina/Buenos_Aires
-- ============================================================================


-- ═════════════════════════════════════════════════════════════════════════
--  PARTE A — TABLAS QUE YA USA EL SISTEMA (recreadas idénticas)
-- ═════════════════════════════════════════════════════════════════════════

-- ── SEDES (sucursales / bares) — se crea primero porque PERSONAL la referencia
create table if not exists public.sedes (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  direccion     text,
  lat           double precision not null,
  lng           double precision not null,
  radio_m       integer not null default 30,     -- radio de la geocerca (m)
  precision_max integer not null default 40,     -- precisión GPS mínima aceptada (m)
  activo        boolean not null default true,
  created_at    timestamptz not null default now()
);
comment on column public.sedes.radio_m is
  'Radio de la geocerca en metros. Ajustar por sede midiendo el GPS real dentro del bar.';
comment on column public.sedes.precision_max is
  'Si el accuracy del GPS es PEOR (mayor) que esto, el fichaje se rechaza.';

-- ── PERSONAL (empleados) + columnas nuevas de identidad para el login
create table if not exists public.personal (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  rol        text,
  area       text not null,
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);
-- columnas nuevas (login = email + DNI; sesión persistente vía Supabase Auth)
alter table public.personal add column if not exists user_id uuid unique
  references auth.users(id) on delete set null;
alter table public.personal add column if not exists email   text;
alter table public.personal add column if not exists dni     text;
alter table public.personal add column if not exists sede_id uuid
  references public.sedes(id) on delete set null;   -- sede "de base" (informativa)
create unique index if not exists personal_email_uidx
  on public.personal (lower(email)) where email is not null;

-- ── REGISTROS (marcas de entrada/salida por día — resumen diario)
create table if not exists public.registros (
  id            uuid primary key default gen_random_uuid(),
  area          text not null,
  nombre        text not null,
  rol           text,
  fecha         date not null,
  turno         text,
  hora_entrada  time,
  hora_salida   time,
  hora_entrada2 time,
  hora_salida2  time,
  observaciones text,
  created_at    timestamptz not null default now()
);
create index if not exists registros_fecha_idx  on public.registros (fecha desc);
create index if not exists registros_nombre_idx on public.registros (nombre);
create index if not exists registros_area_idx   on public.registros (area);

-- ── HORARIOS_SEMANALES (horario planificado por área y semana)
create table if not exists public.horarios_semanales (
  id            uuid primary key default gen_random_uuid(),
  area          text not null,
  semana_desde  date not null,
  semana_hasta  date,
  observaciones text,
  horarios      jsonb not null default '[]'::jsonb,   -- array de personas con sus días
  created_at    timestamptz not null default now()
);
create index if not exists horarios_sem_area_semana_idx
  on public.horarios_semanales (area, semana_desde);

-- ── ACTIVIDAD_LOG (auditoría de cambios manuales; se muestra en vivo)
create table if not exists public.actividad_log (
  id               uuid primary key default gen_random_uuid(),
  usuario          text,
  usuario_tipo     text,                       -- 'admin' | 'lider'
  tipo             text not null,              -- ej: 'personal_eliminado'
  area             text,
  target_nombre    text,
  descripcion      text,
  detalle          jsonb not null default '{}'::jsonb,
  fuera_de_termino boolean not null default false,
  created_at       timestamptz not null default now()
);
create index if not exists actividad_log_created_idx on public.actividad_log (created_at desc);

-- ── CONFIGURACION (clave/valor; ej: 'ventana_carga'). OJO: id es TEXTO
create table if not exists public.configuracion (
  id         text primary key,
  valor      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ── LIDERES (usuarios líderes de área)
create table if not exists public.lideres (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  usuario    text not null unique,
  password   text,
  areas      jsonb not null default '[]'::jsonb,   -- array de áreas que administra
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);


-- ═════════════════════════════════════════════════════════════════════════
--  PARTE B — TABLA NUEVA DE FICHAJE CON GPS
-- ═════════════════════════════════════════════════════════════════════════

-- ── FICHAJES (cada marca de entrada/salida, con su geolocalización)
create table if not exists public.fichajes (
  id             uuid primary key default gen_random_uuid(),
  personal_id    uuid not null references public.personal(id) on delete cascade,
  sede_id        uuid references public.sedes(id) on delete set null,
  tipo           text not null check (tipo in ('entrada','salida')),
  ts             timestamptz not null default now(),   -- HORA DEL SERVIDOR (no del teléfono)
  fecha          date not null
                 default (now() at time zone 'America/Argentina/Buenos_Aires')::date,
  lat            double precision,     -- ubicación reportada por el celular
  lng            double precision,
  accuracy       double precision,     -- precisión que informó el GPS (m)
  distancia_m    double precision,     -- distancia calculada a la sede (m)
  validado       boolean not null default false,
  motivo_rechazo text,                 -- si validado=false, por qué
  metodo         text not null default 'gps' check (metodo in ('gps','gps_qr','nfc','manual')),
  selfie_url     text,                 -- opcional, para auditorías al azar
  created_at     timestamptz not null default now()
);
create index if not exists fichajes_personal_ts_idx on public.fichajes (personal_id, ts desc);
create index if not exists fichajes_sede_idx         on public.fichajes (sede_id);
create index if not exists fichajes_fecha_idx        on public.fichajes (fecha);


-- ═════════════════════════════════════════════════════════════════════════
--  PARTE C — REALTIME (para el feed de auditoría en vivo)
-- ═════════════════════════════════════════════════════════════════════════
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'actividad_log'
  ) then
    execute 'alter publication supabase_realtime add table public.actividad_log';
  end if;
end $$;


-- ═════════════════════════════════════════════════════════════════════════
--  PARTE D — SEGURIDAD (RLS)
-- ═════════════════════════════════════════════════════════════════════════
--
-- ⚠ NOTA DE SEGURIDAD (importante):
-- El panel admin/líder actual usa la clave pública (anon) y un login propio en
-- localStorage — NO usa Supabase Auth todavía. Para que ese panel siga
-- funcionando IGUAL que hoy, las 6 tablas heredadas + sedes quedan SIN RLS
-- (acceso abierto con la anon key, tal como está hoy en el proyecto viejo).
-- Esto se blindará cuando migremos los admins a Supabase Auth (fase futura).
--
-- La ÚNICA tabla que SÍ blindamos ahora es `fichajes`, porque es la sensible
-- al fraude: así nadie puede inventar un fichaje "validado" desde el navegador.

alter table public.fichajes enable row level security;

-- El empleado puede LEER solo sus propios fichajes.
drop policy if exists fichajes_select_own on public.fichajes;
create policy fichajes_select_own on public.fichajes
  for select using (
    personal_id in (select id from public.personal where user_id = auth.uid())
  );

-- NO se crea policy de INSERT/UPDATE/DELETE: con RLS activo y sin policy de
-- escritura, NADIE puede insertar fichajes con la anon key. La única vía será
-- la función  fichar()  de la Fase 2 (SECURITY DEFINER), que valida
-- GPS + radio + precisión + hora del servidor por dentro.


-- ============================================================================
-- FIN.  Verificación rápida (opcional):
--   select table_name from information_schema.tables
--     where table_schema='public' order by table_name;
--   -- Deberías ver: actividad_log, configuracion, fichajes, horarios_semanales,
--   --               lideres, personal, registros, sedes
-- ============================================================================
