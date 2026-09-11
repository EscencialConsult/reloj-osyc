-- ============================================================================
-- FASE 19: Push seguro — el disparador autentica con un secreto compartido
-- Ejecutar en: Supabase → SQL Editor → pegar TODO → Run   (idempotente)
-- Reemplaza a fase10. Correr en las dos empresas (OSYC y ONE).
-- ----------------------------------------------------------------------------
-- Antes (fase10): el trigger llamaba a la Edge Function sin secreto, y la URL +
-- anon key quedaban escritas en el archivo del repo. Ahora:
--   • La URL, la anon key y el secreto viven en una tabla PRIVADA (`app_secrets`),
--     no en el repo. Solo la cargás vos, una vez, en el SQL Editor.
--   • El trigger manda el header `x-webhook-secret`; la Edge Function rechaza
--     cualquier llamada sin ese secreto (fase Edge Function endurecida).
-- ============================================================================

create extension if not exists pg_net;

-- ── Tabla privada de secretos (NADIE del lado cliente la puede leer) ─────────
create table if not exists public.app_secrets (
  clave text primary key,
  valor text not null
);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;
-- (sin políticas → inaccesible por la API; solo la leen funciones SECURITY DEFINER)

-- ── Disparador de push: lee config de app_secrets y manda el secreto ─────────
create or replace function public._push_on_notif()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_url text; v_anon text; v_secret text;
begin
  select valor into v_url    from public.app_secrets where clave = 'push_url';
  select valor into v_anon   from public.app_secrets where clave = 'push_anon';
  select valor into v_secret from public.app_secrets where clave = 'webhook_secret';
  -- Sin configuración completa, no dispara (no rompe la creación de la notificación)
  if v_url is null or v_secret is null then
    return new;
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(v_anon, ''),
      'x-webhook-secret', v_secret
    ),
    body    := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
end $$;

drop trigger if exists trg_push_on_notif on public.notificaciones;
create trigger trg_push_on_notif
  after insert on public.notificaciones
  for each row execute function public._push_on_notif();

-- ============================================================================
-- CARGÁ LOS VALORES UNA SOLA VEZ (con TUS datos). ⚠ NO commitear esta línea.
-- ----------------------------------------------------------------------------
-- insert into public.app_secrets (clave, valor) values
--   ('push_url',       'https://<REF>.supabase.co/functions/v1/enviar-push'),
--   ('push_anon',      '<ANON KEY del proyecto>'),
--   ('webhook_secret', '<EL MISMO WEBHOOK_SECRET que cargaste en la Edge Function>')
-- on conflict (clave) do update set valor = excluded.valor;
--
-- Verificación:
--   select id, status_code, left(content,120), created from net._http_response order by created desc limit 5;
-- ============================================================================
