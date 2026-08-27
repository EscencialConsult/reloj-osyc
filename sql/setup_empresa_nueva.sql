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

select public.crear_admin(
  'admin@empresanueva.com',   -- ⚠ CAMBIAR: email del administrador
  'CambiarEstaClave123',      -- ⚠ CAMBIAR: contraseña del administrador
  'Administrador'             -- nombre visible (opcional)
);

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
