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
