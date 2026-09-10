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
