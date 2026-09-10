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
