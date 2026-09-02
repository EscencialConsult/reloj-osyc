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
