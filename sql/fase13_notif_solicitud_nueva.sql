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
