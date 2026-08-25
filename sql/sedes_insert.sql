-- ============================================================================
-- RUNAS Café — Carga de sucursales (geocercas para el fichaje GPS)
-- Ejecutar en: Supabase (proyecto nuevo) → SQL Editor → Run
-- Coordenadas exactas obtenidas del pin de Google Maps de cada local.
-- Idempotente: se puede volver a correr (actualiza en vez de duplicar).
-- Ajustar radio_m midiendo el GPS real parado dentro de cada bar.
-- ============================================================================

-- Clave única por nombre para poder actualizar sin duplicar
create unique index if not exists sedes_nombre_uidx on public.sedes (nombre);

insert into public.sedes (nombre, direccion, lat, lng, radio_m, precision_max, activo) values
  ('Lomas del Mirador',             'Av. Gral. Enrique Mosconi 62 – Lomas del Mirador', -34.6573609, -58.5264770, 40, 50, true),
  ('Liniers',                       'Tuyutí 7201 – Liniers, CABA',                      -34.6447144, -58.5274646, 40, 50, true),
  ('Villa Madero – P. de Mendoza',  'Pedro de Mendoza 1435 – Villa Madero',             -34.6846323, -58.4924068, 40, 50, true),
  ('Villa Madero – Constituyentes', 'Constituyentes 843 – Villa Madero',                -34.6866750, -58.5033802, 40, 50, true)
on conflict (nombre) do update set
  direccion     = excluded.direccion,
  lat           = excluded.lat,
  lng           = excluded.lng,
  radio_m       = excluded.radio_m,
  precision_max = excluded.precision_max,
  activo        = excluded.activo;

-- Verificación:
--   select nombre, lat, lng, radio_m, activo from public.sedes order by nombre;
