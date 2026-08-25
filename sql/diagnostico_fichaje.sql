-- ============================================================================
-- Diagnóstico de fichaje — Supabase → SQL Editor → Run
-- ============================================================================

-- 1) Últimos intentos de fichaje (cada intento queda acá, aunque sea rechazado)
select ts,
       tipo,
       validado,
       motivo_rechazo,
       round(distancia_m) as dist_m,
       round(accuracy)    as acc_m,
       metodo
from public.fichajes
order by created_at desc
limit 10;
--  validado=true  → OK (debería estar en registros)
--  validado=false, motivo='fuera_de_zona' → no estás dentro de ninguna sede (falta ZZ_TEST o estar en el bar)
--  0 filas → la función fichar() sigue fallando antes de guardar

-- 2) ¿Hay una sede que te cubra? (ZZ_TEST cubre todo)
select nombre, radio_m, activo from public.sedes order by nombre;

-- 3) ¿Se crearon registros?
select nombre, fecha, hora_entrada, hora_salida, area
from public.registros
order by created_at desc
limit 5;
