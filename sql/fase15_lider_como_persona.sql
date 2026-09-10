-- ============================================================================
-- FASE 15: El LÍDER ahora es una PERSONA del sistema (con rol de líder)
-- Ejecutar en: Supabase → SQL Editor → pegar TODO → Run   (idempotente)
-- ----------------------------------------------------------------------------
-- Cambio de modelo respecto de fase14: en vez de una tabla `lideres` aparte con
-- login propio, el líder es una fila de `personal` (ficha, aparece en Personal,
-- entra con su email+contraseña como todos) que además tiene "rol de líder":
--   • es_lider       → activa el rol
--   • lider_areas    → área(s) que tiene a cargo  (jsonb array de textos)
--   • lider_permisos → {horarios, solicitudes, avisos, informes}
--
-- Como el líder ahora SÍ es un usuario autenticado (auth.uid()), su acceso a
-- solicitudes/avisos (que llevan RLS por datos sensibles) pasa por funciones
-- seguras que validan al que llama por su sesión — ya no por usuario/contraseña.
--
-- La tabla `lideres` de fase14 queda EN DESUSO (no se borra por seguridad). Los
-- líderes se administran ahora desde Personal.
-- ============================================================================


-- ── 1) Rol de líder sobre la persona ────────────────────────────────────────
alter table public.personal add column if not exists es_lider      boolean not null default false;
alter table public.personal add column if not exists lider_areas   jsonb   not null default '[]'::jsonb;
alter table public.personal add column if not exists lider_permisos jsonb  not null
  default '{"horarios":true,"solicitudes":false,"avisos":false,"informes":false}'::jsonb;


-- ── 1b) Ruteo de solicitudes al líder (autocontenido; también estaba en fase14)
alter table public.solicitudes add column if not exists para_lider boolean not null default false;
alter table public.solicitudes add column if not exists area       text;
create index if not exists solicitudes_area_idx on public.solicitudes (area) where para_lider;

-- El trigger fija identidad/estado desde el servidor y guarda el ÁREA del
-- solicitante (foto al momento de crear). `para_lider` lo elige el empleado.
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


-- ── 2) ¿El usuario actual es líder del área dada, con el permiso pedido? ──────
create or replace function public._soy_lider_de(p_area text, p_permiso text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.personal p
     where p.user_id = auth.uid()
       and p.es_lider = true
       and p.activo = true
       and coalesce((p.lider_permisos->>p_permiso)::boolean, false)
       and (p.lider_areas ? p_area)
  );
$$;
grant execute on function public._soy_lider_de(text, text) to authenticated;

-- Nombre de la persona logueada (para firmar comentarios/avisos)
create or replace function public._mi_nombre()
returns text language sql security definer stable set search_path = public as $$
  select nombre from public.personal where user_id = auth.uid() limit 1;
$$;


-- ── 3) Se limpian las funciones de fase14 (tenían usuario/contraseña) ────────
drop function if exists public.lider_solicitudes(text, text, text);
drop function if exists public.lider_resolver_solicitud(text, text, uuid, text, text);
drop function if exists public.lider_comentar_solicitud(text, text, uuid, text);
drop function if exists public.lider_crear_aviso(text, text, text, text, text);
drop function if exists public.lider_avisos(text, text, text);


-- ── 4) SOLICITUDES del líder: listar las de su área dirigidas a él ───────────
create or replace function public.lider_solicitudes(p_area text)
returns jsonb language plpgsql security definer stable set search_path = public as $$
begin
  if not public._soy_lider_de(p_area, 'solicitudes') then
    return jsonb_build_object('ok', false, 'msg', 'Sin permiso de solicitudes en esta área'); end if;

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
grant execute on function public.lider_solicitudes(text) to authenticated;


-- ── 5) SOLICITUDES del líder: aprobar / rechazar (con comentario opcional) ───
create or replace function public.lider_resolver_solicitud(
  p_id uuid, p_estado text, p_comentario text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_area text;
begin
  if p_estado not in ('aprobado', 'rechazado') then
    return jsonb_build_object('ok', false, 'msg', 'Estado inválido'); end if;

  select area into v_area from public.solicitudes where id = p_id and para_lider = true;
  if v_area is null then return jsonb_build_object('ok', false, 'msg', 'La solicitud no existe o no fue dirigida a un líder'); end if;
  if not public._soy_lider_de(v_area, 'solicitudes') then
    return jsonb_build_object('ok', false, 'msg', 'Esa solicitud no es de tu área'); end if;

  update public.solicitudes set estado = p_estado, resuelto_por = auth.uid(), resuelto_at = now() where id = p_id;
  if p_comentario is not null and trim(p_comentario) <> '' then
    insert into public.solicitud_comentarios (solicitud_id, user_id, autor_nombre, cuerpo)
      values (p_id, auth.uid(), coalesce(public._mi_nombre(), 'Líder') || ' (Líder)', trim(p_comentario));
  end if;
  return jsonb_build_object('ok', true, 'estado', p_estado);
end $$;
grant execute on function public.lider_resolver_solicitud(uuid, text, text) to authenticated;


-- ── 6) SOLICITUDES del líder: comentar sin resolver ──────────────────────────
create or replace function public.lider_comentar_solicitud(p_id uuid, p_comentario text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_area text;
begin
  if coalesce(trim(p_comentario), '') = '' then return jsonb_build_object('ok', false, 'msg', 'Comentario vacío'); end if;
  select area into v_area from public.solicitudes where id = p_id and para_lider = true;
  if v_area is null then return jsonb_build_object('ok', false, 'msg', 'La solicitud no existe'); end if;
  if not public._soy_lider_de(v_area, 'solicitudes') then
    return jsonb_build_object('ok', false, 'msg', 'Esa solicitud no es de tu área'); end if;

  insert into public.solicitud_comentarios (solicitud_id, user_id, autor_nombre, cuerpo)
    values (p_id, auth.uid(), coalesce(public._mi_nombre(), 'Líder') || ' (Líder)', trim(p_comentario));
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.lider_comentar_solicitud(uuid, text) to authenticated;


-- ── 7) AVISOS del líder: publicar un aviso a su área ─────────────────────────
create or replace function public.lider_crear_aviso(p_area text, p_titulo text, p_cuerpo text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public._soy_lider_de(p_area, 'avisos') then
    return jsonb_build_object('ok', false, 'msg', 'Sin permiso de avisos en esta área'); end if;
  if coalesce(trim(p_titulo), '') = '' or coalesce(trim(p_cuerpo), '') = '' then
    return jsonb_build_object('ok', false, 'msg', 'Completá título y mensaje'); end if;

  insert into public.avisos (titulo, cuerpo, area, autor_id, autor_nombre)
    values (trim(p_titulo), trim(p_cuerpo), p_area, auth.uid(), coalesce(public._mi_nombre(), 'Líder') || ' (Líder)');
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.lider_crear_aviso(text, text, text) to authenticated;


-- ── 8) AVISOS del líder: listar los avisos de su área ────────────────────────
create or replace function public.lider_avisos(p_area text)
returns jsonb language plpgsql security definer stable set search_path = public as $$
begin
  if not public._soy_lider_de(p_area, 'avisos') then
    return jsonb_build_object('ok', false, 'msg', 'Sin permiso de avisos en esta área'); end if;

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
grant execute on function public.lider_avisos(text) to authenticated;

-- ============================================================================
-- Verificación rápida (opcional):
--   select nombre, es_lider, lider_areas, lider_permisos from public.personal where es_lider;
-- ============================================================================
