-- ============================================================================
-- OSYC — FASE 10: Disparar el push desde la base (reemplaza al "Webhook")
-- Ejecutar en: Supabase → SQL Editor → Run   (idempotente)
-- ----------------------------------------------------------------------------
-- En vez de configurar un Database Webhook por el panel (que Supabase movió),
-- este trigger llama a la Edge Function 'enviar-push' cada vez que se crea una
-- notificación. Necesita que la función YA esté desplegada (Paso 1) y los
-- secrets cargados (Paso 2).
-- ============================================================================

-- Extensión para hacer llamadas HTTP desde la base
create extension if not exists pg_net;

create or replace function public._push_on_notif()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url     := 'https://xgmhcerbdnspdhyibnxi.supabase.co/functions/v1/enviar-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnbWhjZXJiZG5zcGRoeWlibnhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5OTIzMDQsImV4cCI6MjEwNDU2ODMwNH0.n-Ba6PbJmgmG-qurFuQtbVpTUCgVa4nsBJtwxew7hTA'
    ),
    body    := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
end $$;

drop trigger if exists trg_push_on_notif on public.notificaciones;
create trigger trg_push_on_notif
  after insert on public.notificaciones
  for each row execute function public._push_on_notif();

-- Verificación (opcional): ver las últimas llamadas HTTP que hizo la base
--   select id, status_code, created from net._http_response order by created desc limit 5;
-- ============================================================================
