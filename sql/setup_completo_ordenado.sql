-- ############################################################################
-- ChekApp — INSTALACIÓN COMPLETA EN UN SOLO ARCHIVO (orden oficial)
-- ----------------------------------------------------------------------------
-- Generado concatenando los SQL en el orden de NUEVA_EMPRESA.md.
-- CÓMO USAR:
--   1) Creá el proyecto Supabase NUEVO (vacío) para esta demo.
--   2) SQL Editor → New query → pegá TODO este archivo.
--   3) ⚠ ANTES de correr: buscá "crear_admin(" más abajo (BLOQUE 6),
--      DESCOMENTÁ esas 3 líneas y poné el email + contraseña del admin de la demo.
--   4) Run. Es idempotente (se puede correr de nuevo sin romper).
--   5) Copiá URL y anon key (Settings → API) a app/src/config.js de la rama.
--
-- NO incluye: fix_permisos_403 ni fase10 (legacy/inseguros). fase20 (RLS) va
-- al final y es OBLIGATORIO: deja la seguridad por rol activada.
-- NO carga datos reales de ninguna empresa: la base queda vacía (demo limpia).
-- ############################################################################



-- ==== >>> setup_empresa_nueva.sql <<< ============================================

-- ============================================================================
-- ONE Horarios — INSTALACIÓN COMPLETA PARA UNA EMPRESA NUEVA
-- ----------------------------------------------------------------------------
-- Este archivo monta TODA la base de datos de una empresa nueva de una sola vez.
--
-- CÓMO USAR:
--   1) Creá el proyecto nuevo en Supabase (en la cuenta de la empresa nueva).
--   2) Andá a  SQL Editor  →  New query.
--   3) Pegá TODO este archivo y tocá  Run.
--   4) IMPORTANTE: al final del archivo, cambiá el email y la contraseña del
--      administrador (buscá "⚠ CAMBIAR" abajo de todo) ANTES de correrlo.
--   5) Copiá la URL y la anon key del proyecto (Settings → API) y pegalas en
--      el archivo  js/supabase.js  de la app.
--
-- Las SUCURSALES NO se cargan acá: se agregan desde el panel Admin
--   (Configuración → Sucursales → "+ Agregar sucursal").
--
-- Es idempotente: se puede correr más de una vez sin romper nada.
-- Zona horaria de referencia: America/Argentina/Buenos_Aires
-- ============================================================================


-- ═════════════════════════════════════════════════════════════════════════
--  BLOQUE 1 — TABLAS
-- ═════════════════════════════════════════════════════════════════════════

-- ── SEDES (sucursales) — se crea primero porque PERSONAL la referencia
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
  'Radio de la geocerca en metros. Ajustar por sede midiendo el GPS real dentro del local.';
comment on column public.sedes.precision_max is
  'Si el accuracy del GPS es PEOR (mayor) que esto, el fichaje se rechaza.';

-- ── PERSONAL (empleados)
create table if not exists public.personal (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  rol        text,
  area       text not null,
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.personal add column if not exists user_id uuid unique
  references auth.users(id) on delete set null;
alter table public.personal add column if not exists email   text;
alter table public.personal add column if not exists dni     text;
alter table public.personal add column if not exists sede_id uuid
  references public.sedes(id) on delete set null;   -- sede "de base" (informativa)
create unique index if not exists personal_email_uidx
  on public.personal (lower(email)) where email is not null;

-- ── REGISTROS (resumen diario de entrada/salida)
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

-- ── HORARIOS_SEMANALES
create table if not exists public.horarios_semanales (
  id            uuid primary key default gen_random_uuid(),
  area          text not null,
  semana_desde  date not null,
  semana_hasta  date,
  observaciones text,
  horarios      jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists horarios_sem_area_semana_idx
  on public.horarios_semanales (area, semana_desde);

-- ── ACTIVIDAD_LOG (auditoría en vivo)
create table if not exists public.actividad_log (
  id               uuid primary key default gen_random_uuid(),
  usuario          text,
  usuario_tipo     text,
  tipo             text not null,
  area             text,
  target_nombre    text,
  descripcion      text,
  detalle          jsonb not null default '{}'::jsonb,
  fuera_de_termino boolean not null default false,
  created_at       timestamptz not null default now()
);
create index if not exists actividad_log_created_idx on public.actividad_log (created_at desc);

-- ── CONFIGURACION (clave/valor; id es TEXTO)
create table if not exists public.configuracion (
  id         text primary key,
  valor      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ── LIDERES
create table if not exists public.lideres (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  usuario    text not null unique,
  password   text,
  areas      jsonb not null default '[]'::jsonb,
  activo     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── FICHAJES (cada marca con su geolocalización)
create table if not exists public.fichajes (
  id             uuid primary key default gen_random_uuid(),
  personal_id    uuid not null references public.personal(id) on delete cascade,
  sede_id        uuid references public.sedes(id) on delete set null,
  tipo           text not null check (tipo in ('entrada','salida')),
  ts             timestamptz not null default now(),
  fecha          date not null
                 default (now() at time zone 'America/Argentina/Buenos_Aires')::date,
  lat            double precision,
  lng            double precision,
  accuracy       double precision,
  distancia_m    double precision,
  validado       boolean not null default false,
  motivo_rechazo text,
  metodo         text not null default 'gps' check (metodo in ('gps','gps_qr','nfc','manual')),
  selfie_url     text,
  created_at     timestamptz not null default now()
);
create index if not exists fichajes_personal_ts_idx on public.fichajes (personal_id, ts desc);
create index if not exists fichajes_sede_idx         on public.fichajes (sede_id);
create index if not exists fichajes_fecha_idx        on public.fichajes (fecha);


-- ═════════════════════════════════════════════════════════════════════════
--  BLOQUE 2 — REALTIME (feed de auditoría en vivo)
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
--  BLOQUE 3 — SEGURIDAD (RLS)
-- ═════════════════════════════════════════════════════════════════════════
-- Solo `fichajes` queda blindada: nadie puede inventar un fichaje "validado"
-- desde el navegador. La única vía de escritura es la función fichar().
-- Las demás tablas quedan sin RLS (el panel admin las maneja con su sesión).

-- Permisos de tablas/secuencias para los roles públicos (evita errores 403)
grant usage on schema public to anon, authenticated;
grant all on all tables    in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;

alter table public.fichajes enable row level security;

drop policy if exists fichajes_select_own on public.fichajes;
create policy fichajes_select_own on public.fichajes
  for select using (
    personal_id in (select id from public.personal where user_id = auth.uid())
  );

alter table public.personal            disable row level security;
alter table public.registros           disable row level security;
alter table public.horarios_semanales  disable row level security;
alter table public.actividad_log       disable row level security;
alter table public.configuracion       disable row level security;
alter table public.lideres             disable row level security;
alter table public.sedes               disable row level security;


-- ═════════════════════════════════════════════════════════════════════════
--  BLOQUE 4 — FUNCIÓN fichar()  (valida el fichaje en el servidor)
-- ═════════════════════════════════════════════════════════════════════════
create or replace function public.fichar(
  p_sede_id  uuid,                       -- null = autodetectar por GPS
  p_lat      double precision,
  p_lng      double precision,
  p_accuracy double precision default null,
  p_tipo     text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_p      public.personal;
  v_s      public.sedes;
  v_dist   double precision;
  v_fecha  date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_hora   time := (now() at time zone 'America/Argentina/Buenos_Aires')::time;
  v_lunes  date := date_trunc('week', (now() at time zone 'America/Argentina/Buenos_Aires')::date)::date;
  v_diakey text;
  v_reg    public.registros;
  v_tipo   text;
  v_col    text;
  v_last   timestamptz;
  v_turno  text;
  v_day    jsonb;
  v_vac    text;
  v_dt     text;
  v_e text; v_s2 text; v_e2 text; v_sal text;
  v_sid    uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok',false,'error','no_autenticado',
      'msg','Iniciá sesión para fichar.');
  end if;

  select * into v_p from public.personal where user_id = v_uid and activo = true limit 1;
  if not found then
    return jsonb_build_object('ok',false,'error','empleado_no_encontrado',
      'msg','Tu usuario no está habilitado para fichar.');
  end if;

  if p_sede_id is not null then
    select * into v_s from public.sedes where id = p_sede_id and activo = true limit 1;
    if not found then
      return jsonb_build_object('ok',false,'error','sede_invalida','msg','La sucursal no es válida.');
    end if;
    v_dist := 2*6371000*asin(sqrt(
        power(sin(radians(p_lat - v_s.lat)/2),2) +
        cos(radians(v_s.lat))*cos(radians(p_lat))*power(sin(radians(p_lng - v_s.lng)/2),2)));
    if v_dist > v_s.radio_m then
      insert into public.fichajes(personal_id,sede_id,tipo,lat,lng,accuracy,distancia_m,validado,motivo_rechazo,metodo)
        values (v_p.id,v_s.id,coalesce(p_tipo,'entrada'),p_lat,p_lng,p_accuracy,v_dist,false,'fuera_de_zona','gps');
      return jsonb_build_object('ok',false,'error','fuera_de_zona',
        'msg','Estás fuera del área del local ('||round(v_dist)||' m). Acercate para fichar.','distancia',round(v_dist));
    end if;
  else
    select q.id, q.dist into v_sid, v_dist
      from (
        select s.id, s.radio_m,
               2*6371000*asin(sqrt(
                 power(sin(radians(p_lat - s.lat)/2),2) +
                 cos(radians(s.lat))*cos(radians(p_lat))*
                 power(sin(radians(p_lng - s.lng)/2),2))) as dist
          from public.sedes s
         where s.activo = true
      ) q
     where q.dist <= q.radio_m
     order by q.dist asc
     limit 1;
    if not found then
      insert into public.fichajes(personal_id,sede_id,tipo,lat,lng,accuracy,distancia_m,validado,motivo_rechazo,metodo)
        values (v_p.id,null,coalesce(p_tipo,'entrada'),p_lat,p_lng,p_accuracy,null,false,'fuera_de_zona','gps');
      return jsonb_build_object('ok',false,'error','fuera_de_zona',
        'msg','No estás dentro de ninguna sucursal. Acercate al local para fichar.');
    end if;
    select * into v_s from public.sedes where id = v_sid;
  end if;

  if p_accuracy is not null and p_accuracy > v_s.precision_max then
    insert into public.fichajes(personal_id,sede_id,tipo,lat,lng,accuracy,distancia_m,validado,motivo_rechazo,metodo)
      values (v_p.id,v_s.id,coalesce(p_tipo,'entrada'),p_lat,p_lng,p_accuracy,v_dist,false,'precision_insuficiente','gps');
    return jsonb_build_object('ok',false,'error','precision_insuficiente',
      'msg','El GPS está impreciso. Salí a un lugar más abierto y probá otra vez.');
  end if;

  select ts into v_last from public.fichajes
    where personal_id = v_p.id and validado = true
    order by ts desc limit 1;
  if v_last is not null and (now() - v_last) < interval '2 minutes' then
    return jsonb_build_object('ok',false,'error','cooldown',
      'msg','Ya registraste un movimiento recién. Esperá un momento.');
  end if;

  select * into v_reg from public.registros
    where nombre = v_p.nombre and fecha = v_fecha limit 1;

  v_tipo := p_tipo;
  if v_tipo is null then
    if v_reg.id is null or v_reg.hora_entrada is null then v_tipo := 'entrada';
    elsif v_reg.hora_salida  is null then v_tipo := 'salida';
    elsif v_reg.hora_entrada2 is null then v_tipo := 'entrada';
    elsif v_reg.hora_salida2  is null then v_tipo := 'salida';
    else
      return jsonb_build_object('ok',false,'error','jornada_completa',
        'msg','Ya tenés entrada y salida registradas hoy.');
    end if;
  end if;

  if v_tipo = 'entrada' then
    if v_reg.id is null or v_reg.hora_entrada is null then v_col := 'hora_entrada';
    else v_col := 'hora_entrada2'; end if;
  else
    if v_reg.hora_salida is null then v_col := 'hora_salida';
    else v_col := 'hora_salida2'; end if;
  end if;

  v_diakey := case to_char(v_fecha,'ID')
    when '1' then 'lunes'   when '2' then 'martes' when '3' then 'miercoles'
    when '4' then 'jueves'  when '5' then 'viernes' when '6' then 'sabado'
    else 'domingo' end;
  begin
    select (elem -> v_diakey), (elem->>'vacaciones')
      into v_day, v_vac
      from public.horarios_semanales h
           cross join lateral jsonb_array_elements(
             case when jsonb_typeof(h.horarios) = 'array' then h.horarios else '[]'::jsonb end
           ) elem
     where h.semana_desde = v_lunes and elem->>'nombre' = v_p.nombre
     limit 1;
  exception when others then
    v_day := null; v_vac := null;
  end;

  v_turno := null;
  if v_vac = 'true' then
    v_turno := 'Vacaciones';
  elsif v_day is not null then
    v_dt := coalesce(v_day->>'tipo','normal');
    if    v_dt = 'flex'     then v_turno := 'Flex';
    elsif v_dt = 'guardia'  then v_turno := 'Guardia';
    elsif v_dt = 'licencia' then v_turno := 'Licencia';
    else
      v_e  := v_day->>'e';  v_sal := v_day->>'s';
      v_e2 := v_day->>'e2'; v_s2  := v_day->>'s2';
      if v_e is not null and v_e <> '' then
        v_turno := left(v_e,5) || case when v_sal is not null and v_sal<>'' then ' → '||left(v_sal,5) else '' end;
        if v_e2 is not null and v_e2 <> '' then
          v_turno := v_turno || ' | ' || left(v_e2,5) ||
                     case when v_s2 is not null and v_s2<>'' then ' → '||left(v_s2,5) else '' end;
        end if;
      end if;
    end if;
  end if;

  if v_reg.id is null then
    insert into public.registros(area,nombre,rol,fecha,turno,hora_entrada,hora_salida,hora_entrada2,hora_salida2)
      values (v_p.area, v_p.nombre, v_p.rol, v_fecha, v_turno,
        case when v_col='hora_entrada'  then v_hora end,
        case when v_col='hora_salida'   then v_hora end,
        case when v_col='hora_entrada2' then v_hora end,
        case when v_col='hora_salida2'  then v_hora end);
  else
    execute format('update public.registros set %I = $1 where id = $2', v_col)
      using v_hora, v_reg.id;
  end if;

  insert into public.fichajes(personal_id,sede_id,tipo,ts,fecha,lat,lng,accuracy,distancia_m,validado,metodo)
    values (v_p.id,v_s.id,v_tipo,now(),v_fecha,p_lat,p_lng,p_accuracy,v_dist,true,'gps');

  return jsonb_build_object(
    'ok',true,'tipo',v_tipo,'hora',to_char(v_hora,'HH24:MI'),
    'sede',v_s.nombre,'nombre',v_p.nombre,'distancia',round(v_dist),
    'msg', case when v_tipo='entrada' then 'Ingreso registrado' else 'Salida registrada' end);
end $$;

grant execute on function public.fichar(uuid,double precision,double precision,double precision,text)
  to authenticated, anon;


-- ═════════════════════════════════════════════════════════════════════════
--  BLOQUE 5 — ADMIN (Supabase Auth) + alta de empleados desde el panel
-- ═════════════════════════════════════════════════════════════════════════
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  nombre     text,
  created_at timestamptz not null default now()
);

create or replace function public.es_admin() returns boolean
language sql security definer stable
set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
grant execute on function public.es_admin() to authenticated, anon;

create or replace function public._upsert_auth_user(p_email text, p_pwd text, p_nombre text)
returns uuid
language plpgsql security definer
set search_path = public, extensions as $$
declare v_id uuid; v_email text := lower(trim(p_email));
begin
  select id into v_id from auth.users where lower(email) = v_email;
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      v_email, crypt(trim(p_pwd), gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('nombre', p_nombre),
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (
      id, provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_id::text, v_id,
      jsonb_build_object('sub', v_id::text, 'email', v_email),
      'email', now(), now(), now()
    );
  else
    update auth.users
       set encrypted_password = crypt(trim(p_pwd), gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now())
     where id = v_id;
  end if;
  return v_id;
end $$;
revoke all on function public._upsert_auth_user(text,text,text) from public, anon, authenticated;

create or replace function public.crear_admin(p_email text, p_pwd text, p_nombre text default null)
returns jsonb
language plpgsql security definer
set search_path = public, extensions as $$
declare v_id uuid;
begin
  v_id := public._upsert_auth_user(p_email, p_pwd, coalesce(p_nombre,'Administrador'));
  insert into public.admins(user_id, email, nombre)
    values (v_id, lower(trim(p_email)), p_nombre)
    on conflict (user_id) do update set email = excluded.email, nombre = excluded.nombre;
  return jsonb_build_object('ok',true,'user_id',v_id,'email',lower(trim(p_email)));
end $$;
revoke all on function public.crear_admin(text,text,text) from public, anon, authenticated;

-- Alta de empleado (la llama el PANEL; solo si el que llama es admin).
-- No guarda el DNI en `personal`: queda solo encriptado como contraseña de login.
create or replace function public.crear_empleado(
  p_email  text,
  p_dni    text,
  p_nombre text,
  p_area   text,
  p_rol    text default null
) returns jsonb
language plpgsql security definer
set search_path = public, extensions as $$
declare v_id uuid; v_email text := lower(trim(p_email));
begin
  if not public.es_admin() then
    return jsonb_build_object('ok',false,'msg','No autorizado. Iniciá sesión como administrador.');
  end if;
  if v_email = '' or p_dni is null or trim(p_dni) = '' then
    return jsonb_build_object('ok',false,'msg','Email y DNI son obligatorios.');
  end if;

  v_id := public._upsert_auth_user(v_email, trim(p_dni), p_nombre);

  update public.personal
     set user_id = v_id, email = v_email, activo = true
   where lower(email) = v_email;
  if not found then
    insert into public.personal (nombre, rol, area, activo, email, user_id)
    values (p_nombre, p_rol, p_area, true, v_email, v_id);
  end if;

  return jsonb_build_object('ok',true,'user_id',v_id,'email',v_email,
    'msg', p_nombre || ' dado de alta. Entra con ' || v_email || ' + su DNI.');
end $$;
grant execute on function public.crear_empleado(text,text,text,text,text) to authenticated;

-- El admin puede VER todos los fichajes (para el panel/mapa de auditoría)
drop policy if exists fichajes_select_admin on public.fichajes;
create policy fichajes_select_admin on public.fichajes
  for select using (public.es_admin());


-- ═════════════════════════════════════════════════════════════════════════
--  BLOQUE 6 — ⚠ CAMBIAR: crear el ADMINISTRADOR de esta empresa
-- ═════════════════════════════════════════════════════════════════════════
-- Reemplazá el email, la contraseña y el nombre por los de la empresa nueva.
-- Con estos datos se entra al panel Admin. Se corre 1 sola vez.
-- (Podés volver a correr todo el archivo: si el admin ya existe, actualiza su
--  contraseña.)

-- ⚠ Descomentá y CAMBIÁ los valores. NO dejes esta línea con valores reales en el repo.
-- select public.crear_admin(
--   'admin@empresa.com',        -- email del administrador
--   'UNA_CONTRASEÑA_FUERTE',    -- contraseña (fuerte, única)
--   'Administrador'             -- nombre visible (opcional)
-- );

-- ============================================================================
-- LISTO. Verificación rápida (opcional):
--   select table_name from information_schema.tables
--     where table_schema='public' order by table_name;
--   -- Deberías ver: actividad_log, admins, configuracion, fichajes,
--   --               horarios_semanales, lideres, personal, registros, sedes
--
-- Ahora: copiá la URL y la anon key (Settings → API) en  js/supabase.js
-- y cargá las sucursales desde el panel Admin (Configuración → Sucursales).
-- ============================================================================


-- ==== >>> fase2_fichar.sql <<< ============================================

-- ============================================================================
-- RUNAS Café — FASE 2: función fichar()  (validación de fichaje en el servidor)
-- Ejecutar en: Supabase → SQL Editor → Run   (es create or replace, se re-corre sin problema)
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER: valida por dentro; nadie puede insertar un fichaje
-- "validado" salteándola desde el navegador.
-- Valida: identidad (login) · geocerca (GPS) · precisión GPS · hora del
-- servidor · anti-doble (cooldown) · detecta entrada/salida automáticamente.
--
-- EMPLEADOS QUE ROTAN: si p_sede_id viene null, la sede se AUTODETECTA por GPS
-- (se busca cuál geocerca contiene la ubicación). Así el mismo empleado puede
-- fichar en cualquier sucursal sin estar asignado a una fija.
-- Con NFC (más adelante) la etiqueta dirá la sede → se pasa en p_sede_id.
-- ============================================================================

create or replace function public.fichar(
  p_sede_id  uuid,                       -- null = autodetectar por GPS
  p_lat      double precision,
  p_lng      double precision,
  p_accuracy double precision default null,
  p_tipo     text default null           -- 'entrada' | 'salida' | null (auto)
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_p      public.personal;
  v_s      public.sedes;
  v_dist   double precision;
  v_fecha  date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_hora   time := (now() at time zone 'America/Argentina/Buenos_Aires')::time;
  v_lunes  date := date_trunc('week', (now() at time zone 'America/Argentina/Buenos_Aires')::date)::date;
  v_diakey text;
  v_reg    public.registros;
  v_tipo   text;
  v_col    text;
  v_last   timestamptz;
  v_turno  text;
  v_day    jsonb;
  v_vac    text;
  v_dt     text;
  v_e text; v_s2 text; v_e2 text; v_sal text;
  v_sid    uuid;
begin
  -- 1) ¿Está logueado?
  if v_uid is null then
    return jsonb_build_object('ok',false,'error','no_autenticado',
      'msg','Iniciá sesión para fichar.');
  end if;

  -- 1.5) Validar coordenadas y precisión declaradas (evita saltear la geocerca
  --      mandando coordenadas nulas/fuera de rango directamente al RPC).
  if p_lat is null or p_lng is null
     or p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then
    return jsonb_build_object('ok',false,'error','ubicacion_invalida',
      'msg','No pudimos leer tu ubicación. Activá el GPS y probá de nuevo.');
  end if;
  if p_accuracy is null or p_accuracy < 0 then
    return jsonb_build_object('ok',false,'error','precision_invalida',
      'msg','No se pudo verificar la precisión del GPS. Probá en un lugar más abierto.');
  end if;

  -- 2) ¿Empleado válido y activo?
  select * into v_p from public.personal where user_id = v_uid and activo = true limit 1;
  if not found then
    return jsonb_build_object('ok',false,'error','empleado_no_encontrado',
      'msg','Tu usuario no está habilitado para fichar.');
  end if;

  -- 3) Determinar la SEDE + distancia
  if p_sede_id is not null then
    -- sede indicada (ej. NFC)
    select * into v_s from public.sedes where id = p_sede_id and activo = true limit 1;
    if not found then
      return jsonb_build_object('ok',false,'error','sede_invalida','msg','La sucursal no es válida.');
    end if;
    v_dist := 2*6371000*asin(sqrt(
        power(sin(radians(p_lat - v_s.lat)/2),2) +
        cos(radians(v_s.lat))*cos(radians(p_lat))*power(sin(radians(p_lng - v_s.lng)/2),2)));
    if v_dist > v_s.radio_m then
      insert into public.fichajes(personal_id,sede_id,tipo,lat,lng,accuracy,distancia_m,validado,motivo_rechazo,metodo)
        values (v_p.id,v_s.id,coalesce(p_tipo,'entrada'),p_lat,p_lng,p_accuracy,v_dist,false,'fuera_de_zona','gps');
      return jsonb_build_object('ok',false,'error','fuera_de_zona',
        'msg','Estás fuera del área del local ('||round(v_dist)||' m). Acercate para fichar.','distancia',round(v_dist));
    end if;
  else
    -- AUTODETECTAR: la sede activa cuya GEOCERCA CONTIENE la ubicación (la más cercana de esas)
    select q.id, q.dist into v_sid, v_dist
      from (
        select s.id, s.radio_m,
               2*6371000*asin(sqrt(
                 power(sin(radians(p_lat - s.lat)/2),2) +
                 cos(radians(s.lat))*cos(radians(p_lat))*
                 power(sin(radians(p_lng - s.lng)/2),2))) as dist
          from public.sedes s
         where s.activo = true
      ) q
     where q.dist <= q.radio_m
     order by q.dist asc
     limit 1;
    if not found then
      insert into public.fichajes(personal_id,sede_id,tipo,lat,lng,accuracy,distancia_m,validado,motivo_rechazo,metodo)
        values (v_p.id,null,coalesce(p_tipo,'entrada'),p_lat,p_lng,p_accuracy,null,false,'fuera_de_zona','gps');
      return jsonb_build_object('ok',false,'error','fuera_de_zona',
        'msg','No estás dentro de ninguna sucursal. Acercate al local para fichar.');
    end if;
    select * into v_s from public.sedes where id = v_sid;
  end if;

  -- 4) Precisión del GPS (aplica a ambos caminos)
  if p_accuracy is not null and p_accuracy > v_s.precision_max then
    insert into public.fichajes(personal_id,sede_id,tipo,lat,lng,accuracy,distancia_m,validado,motivo_rechazo,metodo)
      values (v_p.id,v_s.id,coalesce(p_tipo,'entrada'),p_lat,p_lng,p_accuracy,v_dist,false,'precision_insuficiente','gps');
    return jsonb_build_object('ok',false,'error','precision_insuficiente',
      'msg','El GPS está impreciso. Salí a un lugar más abierto y probá otra vez.');
  end if;

  -- 5) Anti-doble: ¿fichó validado hace menos de 2 minutos?
  select ts into v_last from public.fichajes
    where personal_id = v_p.id and validado = true
    order by ts desc limit 1;
  if v_last is not null and (now() - v_last) < interval '2 minutes' then
    return jsonb_build_object('ok',false,'error','cooldown',
      'msg','Ya registraste un movimiento recién. Esperá un momento.');
  end if;

  -- 6) Registro del día (resumen que ve el admin)
  select * into v_reg from public.registros
    where nombre = v_p.nombre and fecha = v_fecha limit 1;

  -- 7) Determinar entrada/salida automáticamente si no vino dado
  v_tipo := p_tipo;
  if v_tipo is null then
    if v_reg.id is null or v_reg.hora_entrada is null then v_tipo := 'entrada';
    elsif v_reg.hora_salida  is null then v_tipo := 'salida';
    elsif v_reg.hora_entrada2 is null then v_tipo := 'entrada';   -- 2º turno
    elsif v_reg.hora_salida2  is null then v_tipo := 'salida';    -- fin 2º turno
    else
      return jsonb_build_object('ok',false,'error','jornada_completa',
        'msg','Ya tenés entrada y salida registradas hoy.');
    end if;
  end if;

  -- 8) Columna destino en registros
  if v_tipo = 'entrada' then
    if v_reg.id is null or v_reg.hora_entrada is null then v_col := 'hora_entrada';
    else v_col := 'hora_entrada2'; end if;
  else
    if v_reg.hora_salida is null then v_col := 'hora_salida';
    else v_col := 'hora_salida2'; end if;
  end if;

  -- 9) Turno planificado (solo al crear el registro), leído de horarios_semanales
  v_diakey := case to_char(v_fecha,'ID')
    when '1' then 'lunes'   when '2' then 'martes' when '3' then 'miercoles'
    when '4' then 'jueves'  when '5' then 'viernes' when '6' then 'sabado'
    else 'domingo' end;
  begin
    select (elem -> v_diakey), (elem->>'vacaciones')
      into v_day, v_vac
      from public.horarios_semanales h
           cross join lateral jsonb_array_elements(
             case when jsonb_typeof(h.horarios) = 'array' then h.horarios else '[]'::jsonb end
           ) elem
     where h.semana_desde = v_lunes and elem->>'nombre' = v_p.nombre
     limit 1;
  exception when others then
    v_day := null; v_vac := null;   -- horario mal formado: seguimos sin turno planificado
  end;

  v_turno := null;
  if v_vac = 'true' then
    v_turno := 'Vacaciones';
  elsif v_day is not null then
    v_dt := coalesce(v_day->>'tipo','normal');
    if    v_dt = 'flex'     then v_turno := 'Flex';
    elsif v_dt = 'guardia'  then v_turno := 'Guardia';
    elsif v_dt = 'licencia' then v_turno := 'Licencia';
    else
      v_e  := v_day->>'e';  v_sal := v_day->>'s';
      v_e2 := v_day->>'e2'; v_s2  := v_day->>'s2';
      if v_e is not null and v_e <> '' then
        v_turno := left(v_e,5) || case when v_sal is not null and v_sal<>'' then ' → '||left(v_sal,5) else '' end;
        if v_e2 is not null and v_e2 <> '' then
          v_turno := v_turno || ' | ' || left(v_e2,5) ||
                     case when v_s2 is not null and v_s2<>'' then ' → '||left(v_s2,5) else '' end;
        end if;
      end if;
    end if;
  end if;

  -- 10) Escribir en registros (INSERT si no existe, UPDATE de la columna si existe)
  if v_reg.id is null then
    insert into public.registros(area,nombre,rol,fecha,turno,hora_entrada,hora_salida,hora_entrada2,hora_salida2)
      values (v_p.area, v_p.nombre, v_p.rol, v_fecha, v_turno,
        case when v_col='hora_entrada'  then v_hora end,
        case when v_col='hora_salida'   then v_hora end,
        case when v_col='hora_entrada2' then v_hora end,
        case when v_col='hora_salida2'  then v_hora end);
  else
    execute format('update public.registros set %I = $1 where id = $2', v_col)
      using v_hora, v_reg.id;
  end if;

  -- 11) Guardar el fichaje validado (traza cruda con GPS + sede detectada)
  insert into public.fichajes(personal_id,sede_id,tipo,ts,fecha,lat,lng,accuracy,distancia_m,validado,metodo)
    values (v_p.id,v_s.id,v_tipo,now(),v_fecha,p_lat,p_lng,p_accuracy,v_dist,true,'gps');

  -- 12) Respuesta para la app
  return jsonb_build_object(
    'ok',true,'tipo',v_tipo,'hora',to_char(v_hora,'HH24:MI'),
    'sede',v_s.nombre,'nombre',v_p.nombre,'distancia',round(v_dist),
    'msg', case when v_tipo='entrada' then 'Ingreso registrado' else 'Salida registrada' end);
end $$;

grant execute on function public.fichar(uuid,double precision,double precision,double precision,text)
  to authenticated, anon;


-- ==== >>> fase4_biometria.sql <<< ============================================

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


-- ==== >>> fase5_avisos_solicitudes.sql <<< ============================================

-- ============================================================================
-- OSYC — FASE 5: Avisos + Solicitudes (módulo React)
-- Ejecutar en: Supabase → SQL Editor → Run   (idempotente, se puede re-correr)
-- ----------------------------------------------------------------------------
-- Crea el backend del módulo nuevo:
--   • avisos              → comunicados del admin hacia el equipo (+ quién leyó)
--   • solicitudes         → pedidos de licencia/vacaciones/etc. con estado
--   • solicitud_comentarios → hilo de comentarios por solicitud
--   • bucket 'justificativos' (Storage) → certificados médicos / adjuntos
--
-- SEGURIDAD (importante): estas tablas SÍ llevan RLS (Row Level Security) porque
-- guardan datos personales/sensibles. Cada empleado solo ve LO SUYO; el admin ve
-- todo. Las aprobaciones pasan por una función controlada (nadie se auto-aprueba).
-- Requiere que ya exista la función public.es_admin() (creada en fase3).
-- ============================================================================


-- ═══════════════════════════════════════════════════════════════════════════
--  1) AVISOS (comunicados top-down)
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.avisos (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null,
  cuerpo     text not null,
  area       text,                         -- null = para todos; o un área puntual
  autor_id   uuid references auth.users(id) on delete set null,
  autor_nombre text,
  created_at timestamptz not null default now()
);
create index if not exists avisos_created_idx on public.avisos (created_at desc);

-- Marca de lectura por usuario (para "no leídos")
create table if not exists public.avisos_lecturas (
  aviso_id uuid references public.avisos(id) on delete cascade,
  user_id  uuid references auth.users(id)   on delete cascade,
  leido_at timestamptz not null default now(),
  primary key (aviso_id, user_id)
);

alter table public.avisos          enable row level security;
alter table public.avisos_lecturas enable row level security;
grant select, insert, update, delete on public.avisos          to authenticated;
grant select, insert                 on public.avisos_lecturas to authenticated;

-- Todos los logueados LEEN los avisos; solo el admin los crea/edita/borra
drop policy if exists avisos_select on public.avisos;
create policy avisos_select on public.avisos
  for select to authenticated using (true);
drop policy if exists avisos_admin_write on public.avisos;
create policy avisos_admin_write on public.avisos
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- Cada uno marca/lee SUS propias lecturas
drop policy if exists lecturas_self on public.avisos_lecturas;
create policy lecturas_self on public.avisos_lecturas
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Contador de avisos no leídos del usuario logueado (para el badge)
create or replace function public.avisos_no_leidos()
returns integer language sql security definer stable set search_path = public as $$
  select count(*)::int from public.avisos a
   where not exists (
     select 1 from public.avisos_lecturas l
      where l.aviso_id = a.id and l.user_id = auth.uid());
$$;
grant execute on function public.avisos_no_leidos() to authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
--  2) SOLICITUDES (licencia / vacaciones / certificado / otro)
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.solicitudes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  personal_id  uuid references public.personal(id) on delete set null,
  tipo         text not null,              -- 'licencia'|'vacaciones'|'certificado'|'otro'
  desde        date,
  hasta        date,
  motivo       text,
  estado       text not null default 'pendiente',   -- 'pendiente'|'aprobado'|'rechazado'
  adjunto_path text,                        -- ruta del archivo en el bucket 'justificativos'
  resuelto_por uuid references auth.users(id) on delete set null,
  resuelto_at  timestamptz,
  created_at   timestamptz not null default now(),
  constraint solicitudes_tipo_chk   check (tipo   in ('licencia','vacaciones','certificado','otro')),
  constraint solicitudes_estado_chk check (estado in ('pendiente','aprobado','rechazado'))
);
create index if not exists solicitudes_user_idx   on public.solicitudes (user_id, created_at desc);
create index if not exists solicitudes_estado_idx on public.solicitudes (estado);

-- Al insertar: forzamos identidad/estado desde el servidor (no confiar en el cliente)
create or replace function public._solicitud_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  select id into new.personal_id from public.personal where user_id = auth.uid() and activo = true limit 1;
  new.estado := 'pendiente';
  new.resuelto_por := null;
  new.resuelto_at  := null;
  return new;
end $$;
drop trigger if exists trg_solicitud_defaults on public.solicitudes;
create trigger trg_solicitud_defaults before insert on public.solicitudes
  for each row execute function public._solicitud_defaults();

-- Hilo de comentarios por solicitud
create table if not exists public.solicitud_comentarios (
  id            uuid primary key default gen_random_uuid(),
  solicitud_id  uuid not null references public.solicitudes(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete set null,
  autor_nombre  text,
  cuerpo        text not null,
  created_at    timestamptz not null default now()
);
create index if not exists comentarios_sol_idx on public.solicitud_comentarios (solicitud_id, created_at);

alter table public.solicitudes           enable row level security;
alter table public.solicitud_comentarios enable row level security;
grant select, insert, update, delete on public.solicitudes           to authenticated;
grant select, insert                 on public.solicitud_comentarios to authenticated;

-- Empleado ve/crea LO SUYO; admin ve todo
drop policy if exists sol_select on public.solicitudes;
create policy sol_select on public.solicitudes
  for select to authenticated using (user_id = auth.uid() or public.es_admin());
drop policy if exists sol_insert on public.solicitudes;
create policy sol_insert on public.solicitudes
  for insert to authenticated with check (true);   -- el trigger fija user_id = auth.uid()
drop policy if exists sol_admin_update on public.solicitudes;
create policy sol_admin_update on public.solicitudes
  for update to authenticated using (public.es_admin()) with check (public.es_admin());

-- Comentarios: se ven/crean si podés ver la solicitud
drop policy if exists com_select on public.solicitud_comentarios;
create policy com_select on public.solicitud_comentarios
  for select to authenticated using (
    exists (select 1 from public.solicitudes s
            where s.id = solicitud_id and (s.user_id = auth.uid() or public.es_admin())));
drop policy if exists com_insert on public.solicitud_comentarios;
create policy com_insert on public.solicitud_comentarios
  for insert to authenticated with check (
    user_id = auth.uid() and
    exists (select 1 from public.solicitudes s
            where s.id = solicitud_id and (s.user_id = auth.uid() or public.es_admin())));


-- ═══════════════════════════════════════════════════════════════════════════
--  3) APROBAR / RECHAZAR — solo admin, con comentario opcional (workflow)
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public.resolver_solicitud(
  p_id         uuid,
  p_estado     text,                 -- 'aprobado' | 'rechazado'
  p_comentario text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_nombre text;
begin
  if not public.es_admin() then
    return jsonb_build_object('ok', false, 'msg', 'No autorizado.');
  end if;
  if p_estado not in ('aprobado','rechazado') then
    return jsonb_build_object('ok', false, 'msg', 'Estado inválido.');
  end if;

  update public.solicitudes
     set estado = p_estado, resuelto_por = auth.uid(), resuelto_at = now()
   where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'msg', 'La solicitud no existe.');
  end if;

  if p_comentario is not null and trim(p_comentario) <> '' then
    select nombre into v_nombre from public.personal where user_id = auth.uid() limit 1;
    insert into public.solicitud_comentarios (solicitud_id, user_id, autor_nombre, cuerpo)
      values (p_id, auth.uid(), coalesce(v_nombre,'Administración'), trim(p_comentario));
  end if;

  return jsonb_build_object('ok', true, 'estado', p_estado);
end $$;
grant execute on function public.resolver_solicitud(uuid, text, text) to authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
--  4) STORAGE — bucket privado para adjuntos (certificados médicos, etc.)
-- ═══════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
  values ('justificativos', 'justificativos', false)
  on conflict (id) do nothing;

-- Cada empleado sube/lee en SU carpeta (name empieza con su user_id); admin lee todo
drop policy if exists just_insert on storage.objects;
create policy just_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'justificativos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists just_select on storage.objects;
create policy just_select on storage.objects
  for select to authenticated using (
    bucket_id = 'justificativos' and
    ((storage.foldername(name))[1] = auth.uid()::text or public.es_admin()));

drop policy if exists just_delete on storage.objects;
create policy just_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'justificativos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================================
-- Verificación rápida:
--   select id, name, public from storage.buckets where id = 'justificativos';
--   select tipo, estado, count(*) from public.solicitudes group by 1,2;
-- ============================================================================


-- ==== >>> fase6_avisos_destinatarios.sql <<< ============================================

-- ============================================================================
-- OSYC — FASE 6: Avisos dirigidos (a todos / a un área / a personas)
-- Ejecutar en: Supabase → SQL Editor → Run   (idempotente)
-- ----------------------------------------------------------------------------
-- Antes: un aviso tenía solo "area" (texto). Ahora se puede dirigir a:
--   • TODOS            → area NULL y destinatarios vacío
--   • UN ÁREA          → area = 'Barra' (lo ven los de esa área)
--   • PERSONAS puntuales → destinatarios = {user_id, user_id, ...}
-- La visibilidad se aplica con RLS: cada empleado solo VE los avisos que le
-- corresponden; el admin ve todos.
-- ============================================================================

alter table public.avisos add column if not exists destinatarios uuid[];
comment on column public.avisos.destinatarios is
  'Lista de user_id destinatarios. Vacío/NULL = no dirigido a personas puntuales (usa area o es para todos).';

-- ── Política de lectura: cada uno ve lo que le corresponde ──────────────────
drop policy if exists avisos_select on public.avisos;
create policy avisos_select on public.avisos
  for select to authenticated using (
    public.es_admin()
    or ((area is null) and (destinatarios is null or array_length(destinatarios, 1) is null))
    or (auth.uid() = any(destinatarios))
    or (area is not null and area = (select p.area from public.personal p where p.user_id = auth.uid()))
  );

-- ── Contador de no leídos: respeta la misma visibilidad ─────────────────────
create or replace function public.avisos_no_leidos()
returns integer language sql security definer stable set search_path = public as $$
  select count(*)::int from public.avisos a
   where not exists (
           select 1 from public.avisos_lecturas l
            where l.aviso_id = a.id and l.user_id = auth.uid())
     and (
           public.es_admin()
           or ((a.area is null) and (a.destinatarios is null or array_length(a.destinatarios, 1) is null))
           or (auth.uid() = any(a.destinatarios))
           or (a.area is not null and a.area = (select p.area from public.personal p where p.user_id = auth.uid()))
         );
$$;
grant execute on function public.avisos_no_leidos() to authenticated;

-- Verificación:
--   select titulo, area, destinatarios from public.avisos order by created_at desc;
-- ============================================================================


-- ==== >>> fase7_notificaciones.sql <<< ============================================

-- ============================================================================
-- OSYC — FASE 7: Notificaciones (campana + tiempo real)
-- Ejecutar en: Supabase → SQL Editor → Run   (idempotente)
-- ----------------------------------------------------------------------------
-- Tabla que se llena SOLA con triggers cuando pasa algo relevante:
--   • Nuevo aviso dirigido a mí (todos / mi área / a mí)
--   • Mi solicitud fue aprobada / rechazada
--   • Nuevo comentario en una solicitud (avisa al que corresponde)
-- La app lee esta tabla para la campana y se suscribe por Realtime.
-- (En la Fase 2, el mismo trigger podrá disparar el push web.)
-- ============================================================================

create table if not exists public.notificaciones (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  tipo       text not null,                 -- 'aviso' | 'solicitud' | 'comentario'
  titulo     text not null,
  cuerpo     text,
  link       text,                          -- ruta en la app (ej: '/solicitudes/<id>')
  leido      boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notif_user_idx on public.notificaciones (user_id, created_at desc);

alter table public.notificaciones enable row level security;
grant select, update on public.notificaciones to authenticated;

-- Cada uno ve/actualiza SOLO sus notificaciones (el alta la hacen los triggers)
drop policy if exists notif_self_select on public.notificaciones;
create policy notif_self_select on public.notificaciones
  for select to authenticated using (user_id = auth.uid());
drop policy if exists notif_self_update on public.notificaciones;
create policy notif_self_update on public.notificaciones
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Realtime: publicar la tabla para suscripción en vivo ────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notificaciones'
  ) then
    alter publication supabase_realtime add table public.notificaciones;
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
--  TRIGGER 1 — Nuevo aviso → notifica a sus destinatarios
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public._notif_aviso() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.destinatarios is not null and array_length(new.destinatarios, 1) is not null then
    insert into public.notificaciones (user_id, tipo, titulo, cuerpo, link)
      select uid, 'aviso', 'Nuevo aviso', new.titulo, '/avisos'
        from unnest(new.destinatarios) as uid
       where uid <> coalesce(new.autor_id, '00000000-0000-0000-0000-000000000000');
  elsif new.area is not null then
    insert into public.notificaciones (user_id, tipo, titulo, cuerpo, link)
      select p.user_id, 'aviso', 'Nuevo aviso', new.titulo, '/avisos'
        from public.personal p
       where p.area = new.area and p.activo and p.user_id is not null
         and p.user_id <> coalesce(new.autor_id, '00000000-0000-0000-0000-000000000000');
  else
    insert into public.notificaciones (user_id, tipo, titulo, cuerpo, link)
      select p.user_id, 'aviso', 'Nuevo aviso', new.titulo, '/avisos'
        from public.personal p
       where p.activo and p.user_id is not null
         and p.user_id <> coalesce(new.autor_id, '00000000-0000-0000-0000-000000000000');
  end if;
  return new;
end $$;
drop trigger if exists trg_notif_aviso on public.avisos;
create trigger trg_notif_aviso after insert on public.avisos
  for each row execute function public._notif_aviso();

-- ═══════════════════════════════════════════════════════════════════════════
--  TRIGGER 2 — Solicitud aprobada/rechazada → notifica al solicitante
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public._notif_solicitud() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.estado is distinct from old.estado and new.estado in ('aprobado','rechazado') then
    insert into public.notificaciones (user_id, tipo, titulo, cuerpo, link)
      values (new.user_id, 'solicitud',
              'Tu solicitud fue ' || new.estado,
              'Tocá para ver el detalle',
              '/solicitudes/' || new.id);
  end if;
  return new;
end $$;
drop trigger if exists trg_notif_solicitud on public.solicitudes;
create trigger trg_notif_solicitud after update on public.solicitudes
  for each row execute function public._notif_solicitud();

-- ═══════════════════════════════════════════════════════════════════════════
--  TRIGGER 3 — Nuevo comentario → notifica a la otra parte
-- ═══════════════════════════════════════════════════════════════════════════
create or replace function public._notif_comentario() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select user_id into v_owner from public.solicitudes where id = new.solicitud_id;
  if v_owner is null then return new; end if;

  if new.user_id = v_owner then
    -- comentó el empleado → avisar a los admins
    insert into public.notificaciones (user_id, tipo, titulo, cuerpo, link)
      select a.user_id, 'comentario', 'Nuevo comentario en una solicitud',
             coalesce(new.autor_nombre,'') || ': ' || left(new.cuerpo, 120),
             '/solicitudes/' || new.solicitud_id
        from public.admins a where a.user_id <> new.user_id;
  else
    -- comentó otro (admin) → avisar al dueño
    insert into public.notificaciones (user_id, tipo, titulo, cuerpo, link)
      values (v_owner, 'comentario', 'Nuevo comentario en tu solicitud',
              coalesce(new.autor_nombre,'') || ': ' || left(new.cuerpo, 120),
              '/solicitudes/' || new.solicitud_id);
  end if;
  return new;
end $$;
drop trigger if exists trg_notif_comentario on public.solicitud_comentarios;
create trigger trg_notif_comentario after insert on public.solicitud_comentarios
  for each row execute function public._notif_comentario();

-- Verificación:
--   select tipo, titulo, leido, created_at from public.notificaciones order by created_at desc limit 10;
-- ============================================================================


-- ==== >>> fase8_recibos.sql <<< ============================================

-- ============================================================================
-- OSYC — FASE 8: Acuse de recibo de avisos (quién lo recibió/leyó)
-- Ejecutar en: Supabase → SQL Editor → Run   (idempotente)
-- ----------------------------------------------------------------------------
-- • La notificación guarda de dónde viene (origen_tabla/origen_id) para poder
--   marcar el "recibí" contra el aviso correcto.
-- • El empleado marca "recibido" → queda en avisos_lecturas (ya existía).
-- • El admin ve, por aviso, cuántos/quiénes lo recibieron (RPC avisos_recibos).
-- ============================================================================

alter table public.notificaciones add column if not exists origen_tabla text;
alter table public.notificaciones add column if not exists origen_id    uuid;

-- ── Recrear el trigger de avisos para que guarde el origen ──────────────────
create or replace function public._notif_aviso() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.destinatarios is not null and array_length(new.destinatarios, 1) is not null then
    insert into public.notificaciones (user_id, tipo, titulo, cuerpo, link, origen_tabla, origen_id)
      select uid, 'aviso', 'Nuevo aviso', new.titulo, '/avisos', 'avisos', new.id
        from unnest(new.destinatarios) as uid
       where uid <> coalesce(new.autor_id, '00000000-0000-0000-0000-000000000000');
  elsif new.area is not null then
    insert into public.notificaciones (user_id, tipo, titulo, cuerpo, link, origen_tabla, origen_id)
      select p.user_id, 'aviso', 'Nuevo aviso', new.titulo, '/avisos', 'avisos', new.id
        from public.personal p
       where p.area = new.area and p.activo and p.user_id is not null
         and p.user_id <> coalesce(new.autor_id, '00000000-0000-0000-0000-000000000000');
  else
    insert into public.notificaciones (user_id, tipo, titulo, cuerpo, link, origen_tabla, origen_id)
      select p.user_id, 'aviso', 'Nuevo aviso', new.titulo, '/avisos', 'avisos', new.id
        from public.personal p
       where p.activo and p.user_id is not null
         and p.user_id <> coalesce(new.autor_id, '00000000-0000-0000-0000-000000000000');
  end if;
  return new;
end $$;

-- ── El admin consulta quién recibió/leyó un aviso ───────────────────────────
create or replace function public.avisos_recibos(p_aviso_id uuid)
returns jsonb language plpgsql security definer stable set search_path = public as $$
declare v_av public.avisos; v_total int; v_leidos jsonb;
begin
  if not public.es_admin() then return jsonb_build_object('ok', false, 'msg', 'No autorizado'); end if;
  select * into v_av from public.avisos where id = p_aviso_id;
  if not found then return jsonb_build_object('ok', false); end if;

  if v_av.destinatarios is not null and array_length(v_av.destinatarios, 1) is not null then
    v_total := array_length(v_av.destinatarios, 1);
  elsif v_av.area is not null then
    select count(*) into v_total from public.personal where area = v_av.area and activo and user_id is not null;
  else
    select count(*) into v_total from public.personal where activo and user_id is not null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('nombre', coalesce(p.nombre, l.user_id::text), 'leido_at', l.leido_at)
                            order by l.leido_at desc), '[]'::jsonb)
    into v_leidos
    from public.avisos_lecturas l
    left join public.personal p on p.user_id = l.user_id
   where l.aviso_id = p_aviso_id;

  return jsonb_build_object('ok', true, 'total', coalesce(v_total, 0), 'leidos', v_leidos);
end $$;
grant execute on function public.avisos_recibos(uuid) to authenticated;

-- Verificación:
--   select origen_tabla, origen_id, titulo from public.notificaciones order by created_at desc limit 5;
-- ============================================================================


-- ==== >>> fase9_push.sql <<< ============================================

-- ============================================================================
-- OSYC — FASE 9: Push web (suscripciones de dispositivos)
-- Ejecutar en: Supabase → SQL Editor → Run   (idempotente)
-- ----------------------------------------------------------------------------
-- Guarda la "suscripción push" de cada dispositivo (navegador) del empleado.
-- La Edge Function 'enviar-push' lee esta tabla para mandar la notificación.
-- ============================================================================

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
grant select, insert, delete on public.push_subscriptions to authenticated;

-- Cada uno administra SOLO las suscripciones de sus dispositivos
drop policy if exists push_self_sel on public.push_subscriptions;
create policy push_self_sel on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());
drop policy if exists push_self_ins on public.push_subscriptions;
create policy push_self_ins on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists push_self_del on public.push_subscriptions;
create policy push_self_del on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

-- (La Edge Function usa la service_role key y puede leer todas para enviar.)
-- ============================================================================


-- ==== >>> fase11_notif_texto.sql <<< ============================================

-- ============================================================================
-- OSYC — FASE 11: Mejorar el texto de la notificación de aviso
-- Ejecutar en: Supabase → SQL Editor → Run   (idempotente)
-- ----------------------------------------------------------------------------
-- Antes la notificación mostraba: título "Nuevo aviso" / cuerpo = título del aviso.
-- Ahora muestra: título = título real del aviso / cuerpo = mensaje del aviso.
-- (Se ve mejor tanto en la campana como en el push del celular.)
-- ============================================================================

create or replace function public._notif_aviso() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_titulo text; v_cuerpo text;
begin
  v_titulo := new.titulo;
  v_cuerpo := left(coalesce(new.cuerpo, ''), 140);

  if new.destinatarios is not null and array_length(new.destinatarios, 1) is not null then
    insert into public.notificaciones (user_id, tipo, titulo, cuerpo, link, origen_tabla, origen_id)
      select uid, 'aviso', v_titulo, v_cuerpo, '/avisos', 'avisos', new.id
        from unnest(new.destinatarios) as uid
       where uid <> coalesce(new.autor_id, '00000000-0000-0000-0000-000000000000');
  elsif new.area is not null then
    insert into public.notificaciones (user_id, tipo, titulo, cuerpo, link, origen_tabla, origen_id)
      select p.user_id, 'aviso', v_titulo, v_cuerpo, '/avisos', 'avisos', new.id
        from public.personal p
       where p.area = new.area and p.activo and p.user_id is not null
         and p.user_id <> coalesce(new.autor_id, '00000000-0000-0000-0000-000000000000');
  else
    insert into public.notificaciones (user_id, tipo, titulo, cuerpo, link, origen_tabla, origen_id)
      select p.user_id, 'aviso', v_titulo, v_cuerpo, '/avisos', 'avisos', new.id
        from public.personal p
       where p.activo and p.user_id is not null
         and p.user_id <> coalesce(new.autor_id, '00000000-0000-0000-0000-000000000000');
  end if;
  return new;
end $$;

-- ============================================================================


-- ==== >>> fase12_avisos_admin.sql <<< ============================================

-- ============================================================================
-- OSYC — FASE 12: El admin NO recibe avisos (solo los manda)
-- Ejecutar en: Supabase → SQL Editor → Run   (idempotente)
-- ----------------------------------------------------------------------------
-- avisos_no_leidos() devolvía un conteo también para el admin (porque es_admin()
-- veía todos). Ahora para el admin devuelve 0 (no es destinatario de avisos).
-- ============================================================================

create or replace function public.avisos_no_leidos()
returns integer language sql security definer stable set search_path = public as $$
  select case when public.es_admin() then 0 else (
    select count(*)::int from public.avisos a
     where not exists (
             select 1 from public.avisos_lecturas l
              where l.aviso_id = a.id and l.user_id = auth.uid())
       and (
             ((a.area is null) and (a.destinatarios is null or array_length(a.destinatarios, 1) is null))
             or (auth.uid() = any(a.destinatarios))
             or (a.area is not null and a.area = (select p.area from public.personal p where p.user_id = auth.uid()))
           )
  ) end;
$$;
grant execute on function public.avisos_no_leidos() to authenticated;

-- ============================================================================


-- ==== >>> fase13_notif_solicitud_nueva.sql <<< ============================================

-- ============================================================================
-- OSYC — FASE 13: Avisar a los admins cuando entra una solicitud NUEVA
-- Ejecutar en: Supabase → SQL Editor → Run   (idempotente)
-- ----------------------------------------------------------------------------
-- Antes: el empleado recibía aviso al aprobarse/rechazarse su solicitud (fase7),
-- pero el ADMIN no se enteraba de una solicitud nueva hasta entrar a la pantalla.
-- Ahora, al crearse una solicitud, se notifica a todos los admins (campana + push).
-- ============================================================================

create or replace function public._notif_solicitud_nueva() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_nombre text; v_tipo text;
begin
  select nombre into v_nombre from public.personal where id = new.personal_id;
  v_tipo := case new.tipo
              when 'licencia'    then 'Licencia'
              when 'vacaciones'  then 'Vacaciones'
              when 'certificado' then 'Certificado médico'
              else 'Solicitud'
            end;

  insert into public.notificaciones (user_id, tipo, titulo, cuerpo, link, origen_tabla, origen_id)
    select a.user_id, 'solicitud', 'Nueva solicitud',
           coalesce(v_nombre, 'Un empleado') || ' · ' || v_tipo,
           '/solicitudes/' || new.id, 'solicitudes', new.id
      from public.admins a
     where a.user_id is not null;

  return new;
end $$;

drop trigger if exists trg_notif_solicitud_nueva on public.solicitudes;
create trigger trg_notif_solicitud_nueva after insert on public.solicitudes
  for each row execute function public._notif_solicitud_nueva();

-- ============================================================================


-- ==== >>> fase15_lider_como_persona.sql <<< ============================================

-- ============================================================================
-- FASE 15: El LÍDER ahora es una PERSONA del sistema (con rol de líder)
-- Ejecutar en: Supabase → SQL Editor → pegar TODO → Run   (idempotente)
-- ----------------------------------------------------------------------------
-- Cambio de modelo respecto de fase14: en vez de una tabla `lideres` aparte con
-- login propio, el líder es una fila de `personal` (ficha, aparece en Personal,
-- entra con su email+contraseña como todos) que además tiene "rol de líder":
--   • es_lider       → activa el rol
--   • lider_areas    → área(s) que tiene a cargo  (jsonb array de textos)
--   • lider_permisos → {horarios, solicitudes, avisos, informes}
--
-- Como el líder ahora SÍ es un usuario autenticado (auth.uid()), su acceso a
-- solicitudes/avisos (que llevan RLS por datos sensibles) pasa por funciones
-- seguras que validan al que llama por su sesión — ya no por usuario/contraseña.
--
-- La tabla `lideres` de fase14 queda EN DESUSO (no se borra por seguridad). Los
-- líderes se administran ahora desde Personal.
-- ============================================================================


-- ── 1) Rol de líder sobre la persona ────────────────────────────────────────
alter table public.personal add column if not exists es_lider      boolean not null default false;
alter table public.personal add column if not exists lider_areas   jsonb   not null default '[]'::jsonb;
alter table public.personal add column if not exists lider_permisos jsonb  not null
  default '{"horarios":true,"solicitudes":false,"avisos":false,"informes":false}'::jsonb;


-- ── 1b) Ruteo de solicitudes al líder (autocontenido; también estaba en fase14)
alter table public.solicitudes add column if not exists para_lider boolean not null default false;
alter table public.solicitudes add column if not exists area       text;
create index if not exists solicitudes_area_idx on public.solicitudes (area) where para_lider;

-- El trigger fija identidad/estado desde el servidor y guarda el ÁREA del
-- solicitante (foto al momento de crear). `para_lider` lo elige el empleado.
create or replace function public._solicitud_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  select id, area into new.personal_id, new.area
    from public.personal where user_id = auth.uid() and activo = true limit 1;
  new.estado := 'pendiente';
  new.resuelto_por := null;
  new.resuelto_at  := null;
  return new;
end $$;
drop trigger if exists trg_solicitud_defaults on public.solicitudes;
create trigger trg_solicitud_defaults before insert on public.solicitudes
  for each row execute function public._solicitud_defaults();


-- ── 2) ¿El usuario actual es líder del área dada, con el permiso pedido? ──────
create or replace function public._soy_lider_de(p_area text, p_permiso text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.personal p
     where p.user_id = auth.uid()
       and p.es_lider = true
       and p.activo = true
       and coalesce((p.lider_permisos->>p_permiso)::boolean, false)
       and (p.lider_areas ? p_area)
  );
$$;
grant execute on function public._soy_lider_de(text, text) to authenticated;

-- Nombre de la persona logueada (para firmar comentarios/avisos)
create or replace function public._mi_nombre()
returns text language sql security definer stable set search_path = public as $$
  select nombre from public.personal where user_id = auth.uid() limit 1;
$$;


-- ── 3) Se limpian las funciones de fase14 (tenían usuario/contraseña) ────────
drop function if exists public.lider_solicitudes(text, text, text);
drop function if exists public.lider_resolver_solicitud(text, text, uuid, text, text);
drop function if exists public.lider_comentar_solicitud(text, text, uuid, text);
drop function if exists public.lider_crear_aviso(text, text, text, text, text);
drop function if exists public.lider_avisos(text, text, text);


-- ── 4) SOLICITUDES del líder: listar las de su área dirigidas a él ───────────
create or replace function public.lider_solicitudes(p_area text)
returns jsonb language plpgsql security definer stable set search_path = public as $$
begin
  if not public._soy_lider_de(p_area, 'solicitudes') then
    return jsonb_build_object('ok', false, 'msg', 'Sin permiso de solicitudes en esta área'); end if;

  return jsonb_build_object('ok', true, 'items', coalesce((
    select jsonb_agg(row_to_json(t) order by (t.estado = 'pendiente') desc, t.created_at desc)
    from (
      select s.id, s.tipo, s.estado, s.desde, s.hasta, s.motivo,
             (s.adjunto_path is not null) as tiene_adjunto,
             s.created_at, s.area, p.nombre as solicitante
      from public.solicitudes s
      left join public.personal p on p.id = s.personal_id
      where s.para_lider = true and s.area = p_area
    ) t
  ), '[]'::jsonb));
end $$;
grant execute on function public.lider_solicitudes(text) to authenticated;


-- ── 5) SOLICITUDES del líder: aprobar / rechazar (con comentario opcional) ───
create or replace function public.lider_resolver_solicitud(
  p_id uuid, p_estado text, p_comentario text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_area text;
begin
  if p_estado not in ('aprobado', 'rechazado') then
    return jsonb_build_object('ok', false, 'msg', 'Estado inválido'); end if;

  select area into v_area from public.solicitudes where id = p_id and para_lider = true;
  if v_area is null then return jsonb_build_object('ok', false, 'msg', 'La solicitud no existe o no fue dirigida a un líder'); end if;
  if not public._soy_lider_de(v_area, 'solicitudes') then
    return jsonb_build_object('ok', false, 'msg', 'Esa solicitud no es de tu área'); end if;

  update public.solicitudes set estado = p_estado, resuelto_por = auth.uid(), resuelto_at = now() where id = p_id;
  if p_comentario is not null and trim(p_comentario) <> '' then
    insert into public.solicitud_comentarios (solicitud_id, user_id, autor_nombre, cuerpo)
      values (p_id, auth.uid(), coalesce(public._mi_nombre(), 'Líder') || ' (Líder)', trim(p_comentario));
  end if;
  return jsonb_build_object('ok', true, 'estado', p_estado);
end $$;
grant execute on function public.lider_resolver_solicitud(uuid, text, text) to authenticated;


-- ── 6) SOLICITUDES del líder: comentar sin resolver ──────────────────────────
create or replace function public.lider_comentar_solicitud(p_id uuid, p_comentario text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_area text;
begin
  if coalesce(trim(p_comentario), '') = '' then return jsonb_build_object('ok', false, 'msg', 'Comentario vacío'); end if;
  select area into v_area from public.solicitudes where id = p_id and para_lider = true;
  if v_area is null then return jsonb_build_object('ok', false, 'msg', 'La solicitud no existe'); end if;
  if not public._soy_lider_de(v_area, 'solicitudes') then
    return jsonb_build_object('ok', false, 'msg', 'Esa solicitud no es de tu área'); end if;

  insert into public.solicitud_comentarios (solicitud_id, user_id, autor_nombre, cuerpo)
    values (p_id, auth.uid(), coalesce(public._mi_nombre(), 'Líder') || ' (Líder)', trim(p_comentario));
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.lider_comentar_solicitud(uuid, text) to authenticated;


-- ── 7) AVISOS del líder: publicar un aviso a su área ─────────────────────────
create or replace function public.lider_crear_aviso(p_area text, p_titulo text, p_cuerpo text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public._soy_lider_de(p_area, 'avisos') then
    return jsonb_build_object('ok', false, 'msg', 'Sin permiso de avisos en esta área'); end if;
  if coalesce(trim(p_titulo), '') = '' or coalesce(trim(p_cuerpo), '') = '' then
    return jsonb_build_object('ok', false, 'msg', 'Completá título y mensaje'); end if;

  insert into public.avisos (titulo, cuerpo, area, autor_id, autor_nombre)
    values (trim(p_titulo), trim(p_cuerpo), p_area, auth.uid(), coalesce(public._mi_nombre(), 'Líder') || ' (Líder)');
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.lider_crear_aviso(text, text, text) to authenticated;


-- ── 8) AVISOS del líder: listar los avisos de su área ────────────────────────
create or replace function public.lider_avisos(p_area text)
returns jsonb language plpgsql security definer stable set search_path = public as $$
begin
  if not public._soy_lider_de(p_area, 'avisos') then
    return jsonb_build_object('ok', false, 'msg', 'Sin permiso de avisos en esta área'); end if;

  return jsonb_build_object('ok', true, 'items', coalesce((
    select jsonb_agg(row_to_json(t) order by t.created_at desc)
    from (
      select a.id, a.titulo, a.cuerpo, a.autor_nombre, a.created_at
      from public.avisos a
      where a.area = p_area
      order by a.created_at desc
      limit 50
    ) t
  ), '[]'::jsonb));
end $$;
grant execute on function public.lider_avisos(text) to authenticated;

-- ============================================================================
-- Verificación rápida (opcional):
--   select nombre, es_lider, lider_areas, lider_permisos from public.personal where es_lider;
-- ============================================================================


-- ==== >>> fase16_avisos_respuestas.sql <<< ============================================

-- ============================================================================
-- FASE 16: Respuestas a los AVISOS
-- Ejecutar en: Supabase → SQL Editor → pegar TODO → Run   (idempotente)
-- ----------------------------------------------------------------------------
-- Ahora cada persona puede RESPONDER un aviso con un texto (ej: confirmar
-- disponibilidad). El que responde ve solo SUS respuestas; el ADMIN y el AUTOR
-- del aviso (admin o líder) ven todas. Al responder, se notifica al autor.
-- ============================================================================

create table if not exists public.avisos_respuestas (
  id           uuid primary key default gen_random_uuid(),
  aviso_id     uuid not null references public.avisos(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete set null,
  autor_nombre text,
  cuerpo       text not null,
  created_at   timestamptz not null default now()
);
create index if not exists avisos_resp_idx on public.avisos_respuestas (aviso_id, created_at);

alter table public.avisos_respuestas enable row level security;
grant select, insert on public.avisos_respuestas to authenticated;

-- Cada uno crea SUS respuestas (user_id = quien está logueado)
drop policy if exists resp_insert on public.avisos_respuestas;
create policy resp_insert on public.avisos_respuestas
  for insert to authenticated with check (user_id = auth.uid());

-- Lectura: el propio autor de la respuesta, el admin, o el autor del aviso
drop policy if exists resp_select on public.avisos_respuestas;
create policy resp_select on public.avisos_respuestas
  for select to authenticated using (
    user_id = auth.uid()
    or public.es_admin()
    or exists (select 1 from public.avisos a where a.id = aviso_id and a.autor_id = auth.uid())
  );

-- Al responder → notificar al AUTOR del aviso (campana + push, si está activo)
create or replace function public._notif_aviso_respuesta() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_autor uuid;
begin
  select autor_id into v_autor from public.avisos where id = new.aviso_id;
  if v_autor is not null and v_autor <> new.user_id then
    insert into public.notificaciones (user_id, tipo, titulo, cuerpo, link)
      values (v_autor, 'aviso', 'Nueva respuesta a tu aviso',
              coalesce(new.autor_nombre, '') || ': ' || left(new.cuerpo, 120), '/avisos');
  end if;
  return new;
end $$;
drop trigger if exists trg_notif_aviso_respuesta on public.avisos_respuestas;
create trigger trg_notif_aviso_respuesta after insert on public.avisos_respuestas
  for each row execute function public._notif_aviso_respuesta();

-- ============================================================================
-- Verificación:
--   select aviso_id, autor_nombre, cuerpo, created_at from public.avisos_respuestas order by created_at desc limit 10;
-- ============================================================================


-- ==== >>> fase17_avisos_chat.sql <<< ============================================

-- ============================================================================
-- FASE 17: Chat en los avisos (respuestas por persona + el admin puede responder)
-- Ejecutar en: Supabase → SQL Editor → pegar TODO → Run   (idempotente)
-- ----------------------------------------------------------------------------
-- Antes las respuestas eran una lista plana. Ahora cada respuesta pertenece a
-- una CONVERSACIÓN (hilo) entre una persona y la administración/autor:
--   • con_user_id = de quién es el hilo (la persona que respondió)
--   • el empleado ve/escribe SOLO su hilo; el admin/autor ve todos y puede
--     responder en cualquiera.
-- Además se publica la tabla por Realtime para que el chat se actualice solo.
-- ============================================================================

alter table public.avisos_respuestas
  add column if not exists con_user_id uuid references auth.users(id) on delete cascade;

-- Las respuestas existentes son del propio empleado → su hilo es él mismo
update public.avisos_respuestas set con_user_id = user_id where con_user_id is null;

create index if not exists avisos_resp_hilo_idx on public.avisos_respuestas (aviso_id, con_user_id, created_at);

-- ── Lectura: el dueño del hilo, el admin, o el autor del aviso ───────────────
drop policy if exists resp_select on public.avisos_respuestas;
create policy resp_select on public.avisos_respuestas
  for select to authenticated using (
    con_user_id = auth.uid()
    or user_id = auth.uid()
    or public.es_admin()
    or exists (select 1 from public.avisos a where a.id = aviso_id and a.autor_id = auth.uid())
  );

-- ── Escritura: el empleado SOLO en su hilo; admin/autor en cualquier hilo ────
drop policy if exists resp_insert on public.avisos_respuestas;
create policy resp_insert on public.avisos_respuestas
  for insert to authenticated with check (
    user_id = auth.uid()
    and (
      con_user_id = auth.uid()
      or public.es_admin()
      or exists (select 1 from public.avisos a where a.id = aviso_id and a.autor_id = auth.uid())
    )
  );

-- ── Notificar a la OTRA parte del hilo cuando llega un mensaje ───────────────
create or replace function public._notif_aviso_respuesta() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_autor uuid; v_dest uuid; v_titulo text;
begin
  select autor_id into v_autor from public.avisos where id = new.aviso_id;
  if new.user_id = new.con_user_id then
    -- escribió la persona (dueña del hilo) → avisar al autor del aviso
    v_dest := v_autor; v_titulo := 'Nueva respuesta a tu aviso';
  else
    -- escribió el autor/admin → avisar a la persona del hilo
    v_dest := new.con_user_id; v_titulo := 'Respuesta de la administración';
  end if;

  if v_dest is not null and v_dest <> new.user_id then
    insert into public.notificaciones (user_id, tipo, titulo, cuerpo, link)
      values (v_dest, 'aviso', v_titulo,
              coalesce(new.autor_nombre, '') || ': ' || left(new.cuerpo, 120), '/avisos');
  end if;
  return new;
end $$;

-- ── Realtime: publicar la tabla para el chat en vivo ────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'avisos_respuestas'
  ) then
    alter publication supabase_realtime add table public.avisos_respuestas;
  end if;
end $$;

-- ============================================================================
-- Verificación:
--   select aviso_id, con_user_id, user_id, cuerpo from public.avisos_respuestas order by created_at desc limit 10;
-- ============================================================================


-- ==== >>> fase18_aviso_lider_notifica_admin.sql <<< ============================================

-- ============================================================================
-- FASE 18: Cuando un LÍDER publica un aviso, avisar también al ADMIN
-- Ejecutar en: Supabase → SQL Editor → pegar TODO → Run   (idempotente)
-- Correr en las dos empresas (OSYC y ONE).
-- ----------------------------------------------------------------------------
-- Los avisos que crea un líder van a los miembros de su área. Ahora, además,
-- se notifica a los administradores (para que el admin esté al tanto). El admin
-- ya podía VER todos los avisos; esto agrega la notificación (campana + push).
-- Se recrea la función _notif_aviso agregando ese bloque al final.
-- ============================================================================

create or replace function public._notif_aviso() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- 1) Notificar a los DESTINATARIOS del aviso (como siempre)
  if new.destinatarios is not null and array_length(new.destinatarios, 1) is not null then
    insert into public.notificaciones (user_id, tipo, titulo, cuerpo, link, origen_tabla, origen_id)
      select uid, 'aviso', 'Nuevo aviso', new.titulo, '/avisos', 'avisos', new.id
        from unnest(new.destinatarios) as uid
       where uid <> coalesce(new.autor_id, '00000000-0000-0000-0000-000000000000');
  elsif new.area is not null then
    insert into public.notificaciones (user_id, tipo, titulo, cuerpo, link, origen_tabla, origen_id)
      select p.user_id, 'aviso', 'Nuevo aviso', new.titulo, '/avisos', 'avisos', new.id
        from public.personal p
       where p.area = new.area and p.activo and p.user_id is not null
         and p.user_id <> coalesce(new.autor_id, '00000000-0000-0000-0000-000000000000');
  else
    insert into public.notificaciones (user_id, tipo, titulo, cuerpo, link, origen_tabla, origen_id)
      select p.user_id, 'aviso', 'Nuevo aviso', new.titulo, '/avisos', 'avisos', new.id
        from public.personal p
       where p.activo and p.user_id is not null
         and p.user_id <> coalesce(new.autor_id, '00000000-0000-0000-0000-000000000000');
  end if;

  -- 2) Si lo publicó un LÍDER (autor que NO es admin), avisar también a los admins
  if new.autor_id is not null
     and not exists (select 1 from public.admins a where a.user_id = new.autor_id) then
    insert into public.notificaciones (user_id, tipo, titulo, cuerpo, link, origen_tabla, origen_id)
      select a.user_id, 'aviso',
             'Aviso de ' || coalesce(new.autor_nombre, 'un líder'),
             new.titulo, '/avisos', 'avisos', new.id
        from public.admins a
       where a.user_id is not null and a.user_id <> new.autor_id;
  end if;

  return new;
end $$;

drop trigger if exists trg_notif_aviso on public.avisos;
create trigger trg_notif_aviso after insert on public.avisos
  for each row execute function public._notif_aviso();

-- ============================================================================
-- Verificación: creá un aviso como líder y revisá que el admin reciba notificación:
--   select user_id, titulo, cuerpo, created_at from public.notificaciones
--    order by created_at desc limit 10;
-- ============================================================================


-- ==== >>> fase19_push_seguro.sql <<< ============================================

-- ============================================================================
-- FASE 19: Push seguro — el disparador autentica con un secreto compartido
-- Ejecutar en: Supabase → SQL Editor → pegar TODO → Run   (idempotente)
-- Reemplaza a fase10. Correr en las dos empresas (OSYC y ONE).
-- ----------------------------------------------------------------------------
-- Antes (fase10): el trigger llamaba a la Edge Function sin secreto, y la URL +
-- anon key quedaban escritas en el archivo del repo. Ahora:
--   • La URL, la anon key y el secreto viven en una tabla PRIVADA (`app_secrets`),
--     no en el repo. Solo la cargás vos, una vez, en el SQL Editor.
--   • El trigger manda el header `x-webhook-secret`; la Edge Function rechaza
--     cualquier llamada sin ese secreto (fase Edge Function endurecida).
-- ============================================================================

create extension if not exists pg_net;

-- ── Tabla privada de secretos (NADIE del lado cliente la puede leer) ─────────
create table if not exists public.app_secrets (
  clave text primary key,
  valor text not null
);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;
-- (sin políticas → inaccesible por la API; solo la leen funciones SECURITY DEFINER)

-- ── Disparador de push: lee config de app_secrets y manda el secreto ─────────
create or replace function public._push_on_notif()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_url text; v_anon text; v_secret text;
begin
  select valor into v_url    from public.app_secrets where clave = 'push_url';
  select valor into v_anon   from public.app_secrets where clave = 'push_anon';
  select valor into v_secret from public.app_secrets where clave = 'webhook_secret';
  -- Sin configuración completa, no dispara (no rompe la creación de la notificación)
  if v_url is null or v_secret is null then
    return new;
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(v_anon, ''),
      'x-webhook-secret', v_secret
    ),
    body    := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
end $$;

drop trigger if exists trg_push_on_notif on public.notificaciones;
create trigger trg_push_on_notif
  after insert on public.notificaciones
  for each row execute function public._push_on_notif();

-- ============================================================================
-- CARGÁ LOS VALORES UNA SOLA VEZ (con TUS datos). ⚠ NO commitear esta línea.
-- ----------------------------------------------------------------------------
-- insert into public.app_secrets (clave, valor) values
--   ('push_url',       'https://<REF>.supabase.co/functions/v1/enviar-push'),
--   ('push_anon',      '<ANON KEY del proyecto>'),
--   ('webhook_secret', '<EL MISMO WEBHOOK_SECRET que cargaste en la Edge Function>')
-- on conflict (clave) do update set valor = excluded.valor;
--
-- Verificación:
--   select id, status_code, left(content,120), created from net._http_response order by created desc limit 5;
-- ============================================================================


-- ==== >>> fase22_verificar_rostro.sql <<< ============================================

-- ============================================================================
-- FASE 22: Verificación facial del lado del SERVIDOR (H-03, Opción B)
-- Ejecutar en: Supabase → SQL Editor → pegar TODO → Run   (idempotente)
-- ⚠️ CORRER PRIMERO EN ONE + subir el código de ONE, PROBAR EL FICHAJE, y recién
--    después en OSYC. (Va junto con el cambio en Fichar.jsx.)
-- ----------------------------------------------------------------------------
-- Antes: mi_biometria() le devolvía el VECTOR guardado al navegador y la
-- comparación se hacía en el celular. Ahora:
--   • mi_biometria() devuelve SOLO si está enrolado (nunca el vector).
--   • verificar_rostro(descriptor): el servidor compara el descriptor en vivo
--     contra el guardado (distancia euclídea, mismo umbral 0.5 que el cliente) y
--     responde solo coincide sí/no. El vector NUNCA sale del servidor.
-- No toca fichar(): el fichaje sigue funcionando igual.
-- ============================================================================

-- ── mi_biometria(): ahora SOLO informa si el usuario está enrolado ───────────
create or replace function public.mi_biometria()
returns jsonb language plpgsql security definer stable set search_path = public as $$
declare v_uid uuid := auth.uid(); v_ok boolean;
begin
  if v_uid is null then return jsonb_build_object('enrolado', false); end if;
  select true into v_ok from public.biometria_facial where user_id = v_uid limit 1;
  return jsonb_build_object('enrolado', coalesce(v_ok, false));
end $$;
grant execute on function public.mi_biometria() to authenticated;

-- ── verificar_rostro(): compara en el servidor, no revela el vector ──────────
create or replace function public.verificar_rostro(p_descriptor jsonb)
returns jsonb language plpgsql security definer stable set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_stored jsonb;
  v_dist   double precision;
  -- Umbral de coincidencia (distancia euclídea). MÁS BAJO = MÁS ESTRICTO.
  -- 0.5 = permisivo · 0.45 = estricto (recomendado) · 0.40 = muy estricto.
  -- Si rechaza a gente legítima, subilo; si deja pasar caras parciales, bajalo.
  v_umbral constant double precision := 0.45;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'enrolado', false, 'msg', 'No autenticado');
  end if;

  -- validar el descriptor recibido (array de 128 números)
  if p_descriptor is null
     or jsonb_typeof(p_descriptor) <> 'array'
     or jsonb_array_length(p_descriptor) <> 128 then
    return jsonb_build_object('ok', false, 'enrolado', true, 'msg', 'Lectura facial inválida');
  end if;

  select descriptor into v_stored from public.biometria_facial where user_id = v_uid;
  if v_stored is null or jsonb_array_length(v_stored) <> 128 then
    return jsonb_build_object('ok', false, 'enrolado', false, 'msg', 'No hay rostro registrado');
  end if;

  -- distancia euclídea entre el descriptor en vivo y el guardado
  select sqrt(sum(power(a.v::float8 - b.v::float8, 2)))
    into v_dist
    from jsonb_array_elements_text(p_descriptor) with ordinality a(v, i)
    join jsonb_array_elements_text(v_stored)     with ordinality b(v, i) on a.i = b.i;

  return jsonb_build_object('ok', (v_dist is not null and v_dist <= v_umbral), 'enrolado', true);
end $$;
grant execute on function public.verificar_rostro(jsonb) to authenticated;

-- ============================================================================
-- Verificación: verificar_rostro con el mismo vector guardado debería dar ok=true.
-- ============================================================================


-- ==== >>> fase20_rls.sql <<< ============================================

-- ============================================================================
-- FASE 20: RLS por rol — cierra H-01 (tablas abiertas) y la vía de líder de H-02
-- Ejecutar en: Supabase → SQL Editor → pegar TODO → Run   (idempotente)
-- ⚠️ CORRER PRIMERO EN ONE, PROBAR LOS 4 ROLES, Y RECIÉN DESPUÉS EN OSYC.
-- ----------------------------------------------------------------------------
-- Reactiva Row Level Security con políticas por rol en las 7 tablas que hoy
-- están abiertas a la clave pública. Reglas:
--   • Anónimo (sin login): nada (salvo leer `configuracion`, que no es sensible).
--   • Empleado: su propia fila de `personal`; nada más directo.
--   • Líder: lo de su(s) área(s) (personal, registros, horarios).
--   • Admin: todo.
-- Las funciones del servidor (fichar, crear_empleado, triggers, RPCs de líder)
-- son SECURITY DEFINER → siguen funcionando aunque RLS esté activo.
--
-- ROLLBACK de emergencia si algo legítimo se rompe:
--   alter table public.<tabla> disable row level security;
-- (y avisar para corregir la política)
-- ============================================================================


-- ── Helper: áreas que lidera el usuario logueado ─────────────────────────────
-- SECURITY DEFINER → lee `personal` sin disparar RLS (evita recursión).
create or replace function public.mis_areas_lider()
returns jsonb language sql security definer stable set search_path = public as $$
  select coalesce(
    (select lider_areas from public.personal
      where user_id = auth.uid() and es_lider = true and activo = true limit 1),
    '[]'::jsonb);
$$;
grant execute on function public.mis_areas_lider() to authenticated;

-- ── RPC para el EMPLEADO: ¿mi área tiene un líder (distinto de mí) que reciba
--    solicitudes? Devuelve {nombre} o null. Reemplaza la lectura directa de
--    `personal` que hacía el front (liderDeMiArea). ─────────────────────────────
create or replace function public.mi_lider_de_solicitudes()
returns jsonb language plpgsql security definer stable set search_path = public as $$
declare v_area text; v_nombre text;
begin
  select area into v_area from public.personal where user_id = auth.uid() and activo = true limit 1;
  if v_area is null then return null; end if;
  select nombre into v_nombre from public.personal
    where es_lider = true and activo = true and user_id <> auth.uid()
      and coalesce((lider_permisos->>'solicitudes')::boolean, false) = true
      and lider_areas ? v_area
    limit 1;
  if v_nombre is null then return null; end if;
  return jsonb_build_object('nombre', v_nombre);
end $$;
grant execute on function public.mi_lider_de_solicitudes() to authenticated;


-- ═════════════════════════════════════════════════════════════════════════════
--  PERSONAL
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.personal enable row level security;
revoke all on public.personal from anon;

drop policy if exists personal_select on public.personal;
create policy personal_select on public.personal for select to authenticated
  using (
    user_id = auth.uid()
    or public.es_admin()
    or (area is not null and public.mis_areas_lider() ? area)
  );

-- Escritura SOLO admin → un empleado no puede auto-asignarse es_lider/es_admin/etc.
drop policy if exists personal_write on public.personal;
create policy personal_write on public.personal for all to authenticated
  using (public.es_admin()) with check (public.es_admin());


-- ═════════════════════════════════════════════════════════════════════════════
--  REGISTROS
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.registros enable row level security;
revoke all on public.registros from anon;

drop policy if exists registros_select on public.registros;
create policy registros_select on public.registros for select to authenticated
  using (public.es_admin() or (area is not null and public.mis_areas_lider() ? area));

-- Admin: alta/edición/baja completa
drop policy if exists registros_admin_write on public.registros;
create policy registros_admin_write on public.registros for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- Líder: puede actualizar los registros de su área (sincronización del turno al
-- guardar horarios). El fichaje entra por fichar() (SECURITY DEFINER).
drop policy if exists registros_lider_update on public.registros;
create policy registros_lider_update on public.registros for update to authenticated
  using (area is not null and public.mis_areas_lider() ? area)
  with check (area is not null and public.mis_areas_lider() ? area);


-- ═════════════════════════════════════════════════════════════════════════════
--  HORARIOS_SEMANALES
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.horarios_semanales enable row level security;
revoke all on public.horarios_semanales from anon;

drop policy if exists horarios_rw on public.horarios_semanales;
create policy horarios_rw on public.horarios_semanales for all to authenticated
  using (public.es_admin() or (area is not null and public.mis_areas_lider() ? area))
  with check (public.es_admin() or (area is not null and public.mis_areas_lider() ? area));


-- ═════════════════════════════════════════════════════════════════════════════
--  CONFIGURACION  (lectura abierta — no es sensible y se lee antes del login;
--                  escritura solo admin)
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.configuracion enable row level security;
revoke all on public.configuracion from anon;
grant select on public.configuracion to anon;   -- solo lectura para anónimo

drop policy if exists config_select on public.configuracion;
create policy config_select on public.configuracion for select using (true);

drop policy if exists config_write on public.configuracion;
create policy config_write on public.configuracion for all to authenticated
  using (public.es_admin()) with check (public.es_admin());


-- ═════════════════════════════════════════════════════════════════════════════
--  SEDES  (lectura: logueados · escritura: admin)
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.sedes enable row level security;
revoke all on public.sedes from anon;

drop policy if exists sedes_select on public.sedes;
create policy sedes_select on public.sedes for select to authenticated using (true);

drop policy if exists sedes_write on public.sedes;
create policy sedes_write on public.sedes for all to authenticated
  using (public.es_admin()) with check (public.es_admin());


-- ═════════════════════════════════════════════════════════════════════════════
--  ACTIVIDAD_LOG  (append-only: se inserta, lo lee solo admin, nadie edita/borra)
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.actividad_log enable row level security;
revoke all on public.actividad_log from anon;

drop policy if exists actividad_insert on public.actividad_log;
create policy actividad_insert on public.actividad_log for insert to authenticated with check (true);

drop policy if exists actividad_select on public.actividad_log;
create policy actividad_select on public.actividad_log for select to authenticated using (public.es_admin());


-- ═════════════════════════════════════════════════════════════════════════════
--  LIDERES  (tabla vieja en desuso → sin acceso desde la API)
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.lideres enable row level security;
revoke all on public.lideres from anon, authenticated;
-- (sin políticas → inaccesible; las funciones del servidor no la usan)


-- ═════════════════════════════════════════════════════════════════════════════
--  ADMINS  (solo se administra por funciones SECURITY DEFINER: crear_admin /
--           es_admin lee vía definer). Sin acceso directo desde la API → nadie
--           puede agregarse/editarse como admin. (Cierra la vía admin de H-02.)
-- ═════════════════════════════════════════════════════════════════════════════
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;


-- ============================================================================
-- Verificación rápida (opcional): RLS activo en todas
--   select relname, relrowsecurity from pg_class
--    where relname in ('personal','registros','horarios_semanales','configuracion',
--                      'sedes','actividad_log','lideres') order by relname;
-- ============================================================================
