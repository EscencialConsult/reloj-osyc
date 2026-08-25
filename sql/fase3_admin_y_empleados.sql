-- ============================================================================
-- RUNAS Café — Admin real (Supabase Auth) + alta de empleados desde el panel
-- Ejecutar en: Supabase → SQL Editor → Run
-- ----------------------------------------------------------------------------
-- Deja listo:
--   • Tabla admins + función es_admin()  → identifica a los administradores.
--   • crear_admin()   → crea/actualiza un admin (bootstrap, se corre 1 vez).
--   • crear_empleado()→ SOLO un admin logueado puede llamarla desde el panel.
--   • Política para que el admin pueda VER todos los fichajes.
-- Todo esto permite que el ALTA de empleados sea un botón en el panel admin,
-- sin exponer nada peligroso a la clave pública.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ── Administradores ─────────────────────────────────────────────────────────
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

-- ── Helper interno: crea/actualiza la cuenta de login (Supabase Auth) ────────
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

-- ── Bootstrap de administrador (se corre desde el SQL Editor, 1 sola vez) ─────
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

-- ── Alta de empleado (la llama el PANEL; solo si el que llama es admin) ───────
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

  -- crea/actualiza la cuenta de login (email + DNI como contraseña)
  v_id := public._upsert_auth_user(v_email, trim(p_dni), p_nombre);

  -- vincula con personal (por email); si no existe, lo crea
  update public.personal
     set user_id = v_id, email = v_email, dni = trim(p_dni), activo = true
   where lower(email) = v_email;
  if not found then
    insert into public.personal (nombre, rol, area, activo, email, dni, user_id)
    values (p_nombre, p_rol, p_area, true, v_email, trim(p_dni), v_id);
  end if;

  return jsonb_build_object('ok',true,'user_id',v_id,'email',v_email,
    'msg', p_nombre || ' dado de alta. Entra con ' || v_email || ' + su DNI.');
end $$;
grant execute on function public.crear_empleado(text,text,text,text,text) to authenticated;

-- ── El admin puede VER todos los fichajes (para el panel/mapa de auditoría) ───
drop policy if exists fichajes_select_admin on public.fichajes;
create policy fichajes_select_admin on public.fichajes
  for select using (public.es_admin());

-- ============================================================================
-- BOOTSTRAP: crear el administrador (correr esta línea 1 vez).
-- Después, TODO se maneja desde el panel; no hace falta volver al SQL Editor.
-- ============================================================================
select public.crear_admin('runasgestion@gmail.com', 'Gerardo001', 'Runas Admin');
