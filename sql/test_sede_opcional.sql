-- ============================================================================
-- OPCIONAL — Solo para PROBAR el fichaje desde cualquier lugar (no en producción)
-- Crea una "sede" gigante que cubre todo, así fichar() da OK aunque no estés
-- físicamente en un bar. BORRALA cuando termines de probar.
-- ============================================================================

insert into public.sedes (nombre, direccion, lat, lng, radio_m, precision_max, activo)
values ('ZZ_TEST', 'sede de prueba (borrar)', -34.60, -58.40, 20000000, 1000000, true);

-- Para borrarla después de probar:
--   delete from public.sedes where nombre = 'ZZ_TEST';
