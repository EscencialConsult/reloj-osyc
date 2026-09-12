-- ============================================================================
-- FASE 22: Verificación facial del lado del SERVIDOR (H-03, Opción B)
-- Ejecutar en: Supabase → SQL Editor → pegar TODO → Run   (idempotente)
-- ⚠️ CORRER PRIMERO EN ONE + subir el código de ONE, PROBAR EL FICHAJE, y recién
--    después en OSYC. (Va junto con el cambio en Fichar.jsx.)
-- ----------------------------------------------------------------------------
-- Antes: mi_biometria() le devolvía el VECTOR guardado al navegador y la
-- comparación se hacía en el celular. Ahora:
--   • mi_biometria() devuelve SOLO si está enrolado (nunca el vector).
--   • verificar_rostro(descriptor): el servidor compara el descriptor en vivo
--     contra el guardado (distancia euclídea, mismo umbral 0.5 que el cliente) y
--     responde solo coincide sí/no. El vector NUNCA sale del servidor.
-- No toca fichar(): el fichaje sigue funcionando igual.
-- ============================================================================

-- ── mi_biometria(): ahora SOLO informa si el usuario está enrolado ───────────
create or replace function public.mi_biometria()
returns jsonb language plpgsql security definer stable set search_path = public as $$
declare v_uid uuid := auth.uid(); v_ok boolean;
begin
  if v_uid is null then return jsonb_build_object('enrolado', false); end if;
  select true into v_ok from public.biometria_facial where user_id = v_uid limit 1;
  return jsonb_build_object('enrolado', coalesce(v_ok, false));
end $$;
grant execute on function public.mi_biometria() to authenticated;

-- ── verificar_rostro(): compara en el servidor, no revela el vector ──────────
create or replace function public.verificar_rostro(p_descriptor jsonb)
returns jsonb language plpgsql security definer stable set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_stored jsonb;
  v_dist   double precision;
  v_umbral constant double precision := 0.5;   -- mismo umbral que facial.js
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'enrolado', false, 'msg', 'No autenticado');
  end if;

  -- validar el descriptor recibido (array de 128 números)
  if p_descriptor is null
     or jsonb_typeof(p_descriptor) <> 'array'
     or jsonb_array_length(p_descriptor) <> 128 then
    return jsonb_build_object('ok', false, 'enrolado', true, 'msg', 'Lectura facial inválida');
  end if;

  select descriptor into v_stored from public.biometria_facial where user_id = v_uid;
  if v_stored is null or jsonb_array_length(v_stored) <> 128 then
    return jsonb_build_object('ok', false, 'enrolado', false, 'msg', 'No hay rostro registrado');
  end if;

  -- distancia euclídea entre el descriptor en vivo y el guardado
  select sqrt(sum(power(a.v::float8 - b.v::float8, 2)))
    into v_dist
    from jsonb_array_elements_text(p_descriptor) with ordinality a(v, i)
    join jsonb_array_elements_text(v_stored)     with ordinality b(v, i) on a.i = b.i;

  return jsonb_build_object('ok', (v_dist is not null and v_dist <= v_umbral), 'enrolado', true);
end $$;
grant execute on function public.verificar_rostro(jsonb) to authenticated;

-- ============================================================================
-- Verificación: verificar_rostro con el mismo vector guardado debería dar ok=true.
-- ============================================================================
