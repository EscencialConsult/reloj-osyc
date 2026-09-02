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
