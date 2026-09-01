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
