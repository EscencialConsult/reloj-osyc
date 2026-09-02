-- ============================================================================
-- OSYC — FASE 9: Push web (suscripciones de dispositivos)
-- Ejecutar en: Supabase → SQL Editor → Run   (idempotente)
-- ----------------------------------------------------------------------------
-- Guarda la "suscripción push" de cada dispositivo (navegador) del empleado.
-- La Edge Function 'enviar-push' lee esta tabla para mandar la notificación.
-- ============================================================================

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
grant select, insert, delete on public.push_subscriptions to authenticated;

-- Cada uno administra SOLO las suscripciones de sus dispositivos
drop policy if exists push_self_sel on public.push_subscriptions;
create policy push_self_sel on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());
drop policy if exists push_self_ins on public.push_subscriptions;
create policy push_self_ins on public.push_subscriptions
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists push_self_del on public.push_subscriptions;
create policy push_self_del on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

-- (La Edge Function usa la service_role key y puede leer todas para enviar.)
-- ============================================================================
