-- ============================================================================
-- FASE 14: Permisos de LÍDERES + ruteo de SOLICITUDES a los líderes
-- Ejecutar en: Supabase → SQL Editor → pegar TODO → Run   (idempotente)
-- ----------------------------------------------------------------------------
-- El admin, al crear un líder, ahora le habilita PERMISOS:
--   • horarios     → cargar/modificar horarios de su(s) área(s)   (lo de siempre)
--   • solicitudes  → recibir y responder solicitudes de su personal
--   • avisos       → enviar avisos a los miembros de su área
--   • informes     → ver informes de su área
--
-- Además: al crear una solicitud, el empleado puede marcar "enviar también a mi
-- líder". El ADMIN siempre la recibe; el líder la ve SOLO si tiene el permiso
-- de solicitudes y el empleado marcó esa opción.
--
-- El líder NO usa el login de Supabase (entra con usuario/contraseña contra la
-- tabla `lideres`). Por eso su acceso a solicitudes/avisos (que llevan RLS por
-- guardar datos sensibles) pasa por FUNCIONES SEGURAS del servidor que validan
-- al líder y le devuelven SOLO lo de su área. Así no se debilita la privacidad.
-- ============================================================================


-- ── 1) Permisos por líder ───────────────────────────────────────────────────
alter table public.lideres
  add column if not exists permisos jsonb not null
  default '{"horarios":true,"solicitudes":false,"avisos":false,"informes":false}'::jsonb;


-- ── 2) Solicitudes: ruteo al líder + foto del área al momento de crearla ─────
alter table public.solicitudes add column if not exists para_lider boolean not null default false;
alter table public.solicitudes add column if not exists area       text;
create index if not exists solicitudes_area_idx on public.solicitudes (area) where para_lider;

-- El trigger sigue fijando identidad/estado desde el servidor, y ahora también
-- guarda el ÁREA del solicitante (foto al momento de crear). `para_lider` viene
-- del cliente (lo elige el empleado) y NO se toca acá.
create or replace function public._solicitud_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  select id, area into new.personal_id, new.area
    from public.personal where user_id = auth.uid() and activo = true limit 1;
  new.estado := 'pendiente';
  new.resuelto_por := null;
  new.resuelto_at  := null;
  return new;
end $$;
drop trigger if exists trg_solicitud_defaults on public.solicitudes;
create trigger trg_solicitud_defaults before insert on public.solicitudes
  for each row execute function public._solicitud_defaults();


-- ── 3) Validador interno del líder (usuario + contraseña) ────────────────────
-- Réplica de la regla del login: contraseña = password (o el usuario si no tiene
-- password), comparado sin distinguir mayúsculas. Se usa DENTRO de las funciones
-- de abajo; no se expone a los roles públicos.
create or replace function public._lider_valido(p_usuario text, p_password text)
returns setof public.lideres language sql security definer stable set search_path = public as $$
  select l.* from public.lideres l
   where l.activo = true
     and upper(l.usuario) = upper(trim(coalesce(p_usuario, '')))
     and upper(trim(coalesce(p_password, ''))) in (upper(coalesce(l.password, l.usuario)), upper(l.usuario))
   limit 1;
$$;


-- ── 4) SOLICITUDES del líder: listar las de su área dirigidas a él ───────────
create or replace function public.lider_solicitudes(p_usuario text, p_password text, p_area text)
returns jsonb language plpgsql security definer stable set search_path = public as $$
declare v public.lideres;
begin
  select * into v from public._lider_valido(p_usuario, p_password);
  if not found then return jsonb_build_object('ok', false, 'msg', 'No autorizado'); end if;
  if not coalesce((v.permisos->>'solicitudes')::boolean, false) then
    return jsonb_build_object('ok', false, 'msg', 'Sin permiso de solicitudes'); end if;
  if not (v.areas ? p_area) then
    return jsonb_build_object('ok', false, 'msg', 'Área no asignada'); end if;

  return jsonb_build_object('ok', true, 'items', coalesce((
    select jsonb_agg(row_to_json(t) order by (t.estado = 'pendiente') desc, t.created_at desc)
    from (
      select s.id, s.tipo, s.estado, s.desde, s.hasta, s.motivo,
             (s.adjunto_path is not null) as tiene_adjunto,
             s.created_at, s.area, p.nombre as solicitante
      from public.solicitudes s
      left join public.personal p on p.id = s.personal_id
      where s.para_lider = true and s.area = p_area
    ) t
  ), '[]'::jsonb));
end $$;


-- ── 5) SOLICITUDES del líder: aprobar / rechazar (con comentario opcional) ───
create or replace function public.lider_resolver_solicitud(
  p_usuario text, p_password text, p_id uuid, p_estado text, p_comentario text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v public.lideres; v_area text;
begin
  select * into v from public._lider_valido(p_usuario, p_password);
  if not found then return jsonb_build_object('ok', false, 'msg', 'No autorizado'); end if;
  if not coalesce((v.permisos->>'solicitudes')::boolean, false) then
    return jsonb_build_object('ok', false, 'msg', 'Sin permiso de solicitudes'); end if;
  if p_estado not in ('aprobado', 'rechazado') then
    return jsonb_build_object('ok', false, 'msg', 'Estado inválido'); end if;

  select area into v_area from public.solicitudes where id = p_id and para_lider = true;
  if v_area is null then return jsonb_build_object('ok', false, 'msg', 'La solicitud no existe o no fue dirigida a un líder'); end if;
  if not (v.areas ? v_area) then return jsonb_build_object('ok', false, 'msg', 'Esa solicitud no es de tu área'); end if;

  update public.solicitudes set estado = p_estado, resuelto_at = now() where id = p_id;
  if p_comentario is not null and trim(p_comentario) <> '' then
    insert into public.solicitud_comentarios (solicitud_id, user_id, autor_nombre, cuerpo)
      values (p_id, null, coalesce(v.nombre, 'Líder') || ' (Líder)', trim(p_comentario));
  end if;
  return jsonb_build_object('ok', true, 'estado', p_estado);
end $$;


-- ── 6) SOLICITUDES del líder: comentar sin resolver ──────────────────────────
create or replace function public.lider_comentar_solicitud(
  p_usuario text, p_password text, p_id uuid, p_comentario text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v public.lideres; v_area text;
begin
  select * into v from public._lider_valido(p_usuario, p_password);
  if not found then return jsonb_build_object('ok', false, 'msg', 'No autorizado'); end if;
  if not coalesce((v.permisos->>'solicitudes')::boolean, false) then
    return jsonb_build_object('ok', false, 'msg', 'Sin permiso de solicitudes'); end if;
  if coalesce(trim(p_comentario), '') = '' then return jsonb_build_object('ok', false, 'msg', 'Comentario vacío'); end if;

  select area into v_area from public.solicitudes where id = p_id and para_lider = true;
  if v_area is null then return jsonb_build_object('ok', false, 'msg', 'La solicitud no existe'); end if;
  if not (v.areas ? v_area) then return jsonb_build_object('ok', false, 'msg', 'Esa solicitud no es de tu área'); end if;

  insert into public.solicitud_comentarios (solicitud_id, user_id, autor_nombre, cuerpo)
    values (p_id, null, coalesce(v.nombre, 'Líder') || ' (Líder)', trim(p_comentario));
  return jsonb_build_object('ok', true);
end $$;


-- ── 7) AVISOS del líder: publicar un aviso a su área ─────────────────────────
create or replace function public.lider_crear_aviso(
  p_usuario text, p_password text, p_area text, p_titulo text, p_cuerpo text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v public.lideres;
begin
  select * into v from public._lider_valido(p_usuario, p_password);
  if not found then return jsonb_build_object('ok', false, 'msg', 'No autorizado'); end if;
  if not coalesce((v.permisos->>'avisos')::boolean, false) then
    return jsonb_build_object('ok', false, 'msg', 'Sin permiso de avisos'); end if;
  if not (v.areas ? p_area) then return jsonb_build_object('ok', false, 'msg', 'Área no asignada'); end if;
  if coalesce(trim(p_titulo), '') = '' or coalesce(trim(p_cuerpo), '') = '' then
    return jsonb_build_object('ok', false, 'msg', 'Completá título y mensaje'); end if;

  insert into public.avisos (titulo, cuerpo, area, autor_id, autor_nombre)
    values (trim(p_titulo), trim(p_cuerpo), p_area, null, coalesce(v.nombre, 'Líder') || ' (Líder)');
  return jsonb_build_object('ok', true);
end $$;


-- ── 8) AVISOS del líder: listar los avisos de su área ────────────────────────
create or replace function public.lider_avisos(p_usuario text, p_password text, p_area text)
returns jsonb language plpgsql security definer stable set search_path = public as $$
declare v public.lideres;
begin
  select * into v from public._lider_valido(p_usuario, p_password);
  if not found then return jsonb_build_object('ok', false, 'msg', 'No autorizado'); end if;
  if not coalesce((v.permisos->>'avisos')::boolean, false) then
    return jsonb_build_object('ok', false, 'msg', 'Sin permiso de avisos'); end if;
  if not (v.areas ? p_area) then return jsonb_build_object('ok', false, 'msg', 'Área no asignada'); end if;

  return jsonb_build_object('ok', true, 'items', coalesce((
    select jsonb_agg(row_to_json(t) order by t.created_at desc)
    from (
      select a.id, a.titulo, a.cuerpo, a.autor_nombre, a.created_at
      from public.avisos a
      where a.area = p_area
      order by a.created_at desc
      limit 50
    ) t
  ), '[]'::jsonb));
end $$;


-- ── 9) Permisos de ejecución (el líder entra como rol anónimo) ───────────────
grant execute on function public.lider_solicitudes(text, text, text)               to anon, authenticated;
grant execute on function public.lider_resolver_solicitud(text, text, uuid, text, text) to anon, authenticated;
grant execute on function public.lider_comentar_solicitud(text, text, uuid, text)  to anon, authenticated;
grant execute on function public.lider_crear_aviso(text, text, text, text, text)   to anon, authenticated;
grant execute on function public.lider_avisos(text, text, text)                    to anon, authenticated;

-- ============================================================================
-- Verificación rápida (opcional):
--   select usuario, activo, areas, permisos from public.lideres;
--   select id, tipo, estado, area, para_lider from public.solicitudes order by created_at desc limit 10;
-- ============================================================================
