-- ============================================================================
-- RUNAS Café — FASE 2: función fichar()  (validación de fichaje en el servidor)
-- Ejecutar en: Supabase → SQL Editor → Run   (es create or replace, se re-corre sin problema)
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER: valida por dentro; nadie puede insertar un fichaje
-- "validado" salteándola desde el navegador.
-- Valida: identidad (login) · geocerca (GPS) · precisión GPS · hora del
-- servidor · anti-doble (cooldown) · detecta entrada/salida automáticamente.
--
-- EMPLEADOS QUE ROTAN: si p_sede_id viene null, la sede se AUTODETECTA por GPS
-- (se busca cuál geocerca contiene la ubicación). Así el mismo empleado puede
-- fichar en cualquier sucursal sin estar asignado a una fija.
-- Con NFC (más adelante) la etiqueta dirá la sede → se pasa en p_sede_id.
-- ============================================================================

create or replace function public.fichar(
  p_sede_id  uuid,                       -- null = autodetectar por GPS
  p_lat      double precision,
  p_lng      double precision,
  p_accuracy double precision default null,
  p_tipo     text default null           -- 'entrada' | 'salida' | null (auto)
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_p      public.personal;
  v_s      public.sedes;
  v_dist   double precision;
  v_fecha  date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_hora   time := (now() at time zone 'America/Argentina/Buenos_Aires')::time;
  v_lunes  date := date_trunc('week', (now() at time zone 'America/Argentina/Buenos_Aires')::date)::date;
  v_diakey text;
  v_reg    public.registros;
  v_tipo   text;
  v_col    text;
  v_last   timestamptz;
  v_turno  text;
  v_day    jsonb;
  v_vac    text;
  v_dt     text;
  v_e text; v_s2 text; v_e2 text; v_sal text;
  v_sid    uuid;
begin
  -- 1) ¿Está logueado?
  if v_uid is null then
    return jsonb_build_object('ok',false,'error','no_autenticado',
      'msg','Iniciá sesión para fichar.');
  end if;

  -- 2) ¿Empleado válido y activo?
  select * into v_p from public.personal where user_id = v_uid and activo = true limit 1;
  if not found then
    return jsonb_build_object('ok',false,'error','empleado_no_encontrado',
      'msg','Tu usuario no está habilitado para fichar.');
  end if;

  -- 3) Determinar la SEDE + distancia
  if p_sede_id is not null then
    -- sede indicada (ej. NFC)
    select * into v_s from public.sedes where id = p_sede_id and activo = true limit 1;
    if not found then
      return jsonb_build_object('ok',false,'error','sede_invalida','msg','La sucursal no es válida.');
    end if;
    v_dist := 2*6371000*asin(sqrt(
        power(sin(radians(p_lat - v_s.lat)/2),2) +
        cos(radians(v_s.lat))*cos(radians(p_lat))*power(sin(radians(p_lng - v_s.lng)/2),2)));
    if v_dist > v_s.radio_m then
      insert into public.fichajes(personal_id,sede_id,tipo,lat,lng,accuracy,distancia_m,validado,motivo_rechazo,metodo)
        values (v_p.id,v_s.id,coalesce(p_tipo,'entrada'),p_lat,p_lng,p_accuracy,v_dist,false,'fuera_de_zona','gps');
      return jsonb_build_object('ok',false,'error','fuera_de_zona',
        'msg','Estás fuera del área del local ('||round(v_dist)||' m). Acercate para fichar.','distancia',round(v_dist));
    end if;
  else
    -- AUTODETECTAR: la sede activa cuya GEOCERCA CONTIENE la ubicación (la más cercana de esas)
    select q.id, q.dist into v_sid, v_dist
      from (
        select s.id, s.radio_m,
               2*6371000*asin(sqrt(
                 power(sin(radians(p_lat - s.lat)/2),2) +
                 cos(radians(s.lat))*cos(radians(p_lat))*
                 power(sin(radians(p_lng - s.lng)/2),2))) as dist
          from public.sedes s
         where s.activo = true
      ) q
     where q.dist <= q.radio_m
     order by q.dist asc
     limit 1;
    if not found then
      insert into public.fichajes(personal_id,sede_id,tipo,lat,lng,accuracy,distancia_m,validado,motivo_rechazo,metodo)
        values (v_p.id,null,coalesce(p_tipo,'entrada'),p_lat,p_lng,p_accuracy,null,false,'fuera_de_zona','gps');
      return jsonb_build_object('ok',false,'error','fuera_de_zona',
        'msg','No estás dentro de ninguna sucursal. Acercate al local para fichar.');
    end if;
    select * into v_s from public.sedes where id = v_sid;
  end if;

  -- 4) Precisión del GPS (aplica a ambos caminos)
  if p_accuracy is not null and p_accuracy > v_s.precision_max then
    insert into public.fichajes(personal_id,sede_id,tipo,lat,lng,accuracy,distancia_m,validado,motivo_rechazo,metodo)
      values (v_p.id,v_s.id,coalesce(p_tipo,'entrada'),p_lat,p_lng,p_accuracy,v_dist,false,'precision_insuficiente','gps');
    return jsonb_build_object('ok',false,'error','precision_insuficiente',
      'msg','El GPS está impreciso. Salí a un lugar más abierto y probá otra vez.');
  end if;

  -- 5) Anti-doble: ¿fichó validado hace menos de 2 minutos?
  select ts into v_last from public.fichajes
    where personal_id = v_p.id and validado = true
    order by ts desc limit 1;
  if v_last is not null and (now() - v_last) < interval '2 minutes' then
    return jsonb_build_object('ok',false,'error','cooldown',
      'msg','Ya registraste un movimiento recién. Esperá un momento.');
  end if;

  -- 6) Registro del día (resumen que ve el admin)
  select * into v_reg from public.registros
    where nombre = v_p.nombre and fecha = v_fecha limit 1;

  -- 7) Determinar entrada/salida automáticamente si no vino dado
  v_tipo := p_tipo;
  if v_tipo is null then
    if v_reg.id is null or v_reg.hora_entrada is null then v_tipo := 'entrada';
    elsif v_reg.hora_salida  is null then v_tipo := 'salida';
    elsif v_reg.hora_entrada2 is null then v_tipo := 'entrada';   -- 2º turno
    elsif v_reg.hora_salida2  is null then v_tipo := 'salida';    -- fin 2º turno
    else
      return jsonb_build_object('ok',false,'error','jornada_completa',
        'msg','Ya tenés entrada y salida registradas hoy.');
    end if;
  end if;

  -- 8) Columna destino en registros
  if v_tipo = 'entrada' then
    if v_reg.id is null or v_reg.hora_entrada is null then v_col := 'hora_entrada';
    else v_col := 'hora_entrada2'; end if;
  else
    if v_reg.hora_salida is null then v_col := 'hora_salida';
    else v_col := 'hora_salida2'; end if;
  end if;

  -- 9) Turno planificado (solo al crear el registro), leído de horarios_semanales
  v_diakey := case to_char(v_fecha,'ID')
    when '1' then 'lunes'   when '2' then 'martes' when '3' then 'miercoles'
    when '4' then 'jueves'  when '5' then 'viernes' when '6' then 'sabado'
    else 'domingo' end;
  begin
    select (elem -> v_diakey), (elem->>'vacaciones')
      into v_day, v_vac
      from public.horarios_semanales h
           cross join lateral jsonb_array_elements(
             case when jsonb_typeof(h.horarios) = 'array' then h.horarios else '[]'::jsonb end
           ) elem
     where h.semana_desde = v_lunes and elem->>'nombre' = v_p.nombre
     limit 1;
  exception when others then
    v_day := null; v_vac := null;   -- horario mal formado: seguimos sin turno planificado
  end;

  v_turno := null;
  if v_vac = 'true' then
    v_turno := 'Vacaciones';
  elsif v_day is not null then
    v_dt := coalesce(v_day->>'tipo','normal');
    if    v_dt = 'flex'     then v_turno := 'Flex';
    elsif v_dt = 'guardia'  then v_turno := 'Guardia';
    elsif v_dt = 'licencia' then v_turno := 'Licencia';
    else
      v_e  := v_day->>'e';  v_sal := v_day->>'s';
      v_e2 := v_day->>'e2'; v_s2  := v_day->>'s2';
      if v_e is not null and v_e <> '' then
        v_turno := left(v_e,5) || case when v_sal is not null and v_sal<>'' then ' → '||left(v_sal,5) else '' end;
        if v_e2 is not null and v_e2 <> '' then
          v_turno := v_turno || ' | ' || left(v_e2,5) ||
                     case when v_s2 is not null and v_s2<>'' then ' → '||left(v_s2,5) else '' end;
        end if;
      end if;
    end if;
  end if;

  -- 10) Escribir en registros (INSERT si no existe, UPDATE de la columna si existe)
  if v_reg.id is null then
    insert into public.registros(area,nombre,rol,fecha,turno,hora_entrada,hora_salida,hora_entrada2,hora_salida2)
      values (v_p.area, v_p.nombre, v_p.rol, v_fecha, v_turno,
        case when v_col='hora_entrada'  then v_hora end,
        case when v_col='hora_salida'   then v_hora end,
        case when v_col='hora_entrada2' then v_hora end,
        case when v_col='hora_salida2'  then v_hora end);
  else
    execute format('update public.registros set %I = $1 where id = $2', v_col)
      using v_hora, v_reg.id;
  end if;

  -- 11) Guardar el fichaje validado (traza cruda con GPS + sede detectada)
  insert into public.fichajes(personal_id,sede_id,tipo,ts,fecha,lat,lng,accuracy,distancia_m,validado,metodo)
    values (v_p.id,v_s.id,v_tipo,now(),v_fecha,p_lat,p_lng,p_accuracy,v_dist,true,'gps');

  -- 12) Respuesta para la app
  return jsonb_build_object(
    'ok',true,'tipo',v_tipo,'hora',to_char(v_hora,'HH24:MI'),
    'sede',v_s.nombre,'nombre',v_p.nombre,'distancia',round(v_dist),
    'msg', case when v_tipo='entrada' then 'Ingreso registrado' else 'Salida registrada' end);
end $$;

grant execute on function public.fichar(uuid,double precision,double precision,double precision,text)
  to authenticated, anon;
