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
