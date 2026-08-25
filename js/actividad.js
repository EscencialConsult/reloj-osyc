/* js/actividad.js — Runas Café v2
   Sistema de auditoría de cambios manuales.
   Escucha la tabla `actividad_log` via Supabase Realtime.
   No registra marcaciones normales — solo acciones manuales de admins y líderes.
*/

const Actividad = (() => {

  let _channel = null;
  let _log     = [];
  let _filtroTipo = '';
  const MAX = 150;

  // ── Configuración visual por tipo ──
  const TIPOS = {
    personal_nuevo:            { icon:'👤', label:'Persona agregada',          color:'#15803d', bg:'rgba(22,163,74,.10)',   border:'rgba(22,163,74,.24)'   },
    personal_editado:          { icon:'✏️',  label:'Datos de persona editados', color:'#d26918', bg:'rgba(210,105,24,.08)', border:'rgba(210,105,24,.20)' },
    personal_traspaso:         { icon:'🔀', label:'Traspaso de área',           color:'#6f4fb0', bg:'rgba(111,79,176,.10)', border:'rgba(111,79,176,.24)' },
    personal_eliminado:        { icon:'🗑',  label:'Persona eliminada',         color:'#b91c1c', bg:'rgba(220,38,38,.10)',   border:'rgba(220,38,38,.24)'   },
    lider_nuevo:               { icon:'🔑', label:'Líder creado',               color:'#15803d', bg:'rgba(22,163,74,.10)',   border:'rgba(22,163,74,.24)'   },
    lider_editado:             { icon:'🔑', label:'Líder editado',              color:'#d26918', bg:'rgba(210,105,24,.08)', border:'rgba(210,105,24,.20)' },
    lider_eliminado:           { icon:'🔑', label:'Líder eliminado',            color:'#b91c1c', bg:'rgba(220,38,38,.10)',   border:'rgba(220,38,38,.24)'   },
    horario_semanal_guardado:  { icon:'📅', label:'Horario semanal guardado',   color:'#b9822b', bg:'rgba(185,130,43,.09)', border:'rgba(185,130,43,.24)' },
    horario_semanal_eliminado: { icon:'📅', label:'Horario semanal eliminado',  color:'#b91c1c', bg:'rgba(220,38,38,.10)',   border:'rgba(220,38,38,.24)'   },
    registro_editado:          { icon:'📝', label:'Registro editado',           color:'#c23d78', bg:'rgba(194,61,120,.08)', border:'rgba(194,61,120,.22)' },
    registro_eliminado:        { icon:'🗑',  label:'Registro eliminado',        color:'#b91c1c', bg:'rgba(220,38,38,.10)',   border:'rgba(220,38,38,.24)'   },
  };

  const GRUPOS = {
    personal:  ['personal_nuevo','personal_editado','personal_traspaso','personal_eliminado'],
    lider:     ['lider_nuevo','lider_editado','lider_eliminado'],
    horario:   ['horario_semanal_guardado','horario_semanal_eliminado'],
    registro:  ['registro_editado','registro_eliminado'],
  };

  const fmtTs = iso => {
    if (!iso) return '—';
    const d   = new Date(iso);
    const hoy = new Date();
    const hora = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    const mismodia = d.toDateString() === hoy.toDateString();
    if (mismodia) return hora;
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${hora}`;
  };

  // ── INICIAR ──
  function start() {
    if (_channel) { _renderFiltros(); return; }

    _channel = SB
      .channel('one-actividad-log')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'actividad_log' }, payload => {
        _push(payload.new, false);
        _render();
        _updateBadge();
        const cfg = TIPOS[payload.new.tipo];
        if (cfg) showToast(`${cfg.icon} ${payload.new.usuario} — ${payload.new.descripcion}`);
      })
      .subscribe(status => {
        const dot = document.getElementById('actDot');
        const lbl = document.getElementById('actStatus');
        const ok  = status === 'SUBSCRIBED';
        if (dot) dot.style.background = ok ? '#15803d' : '#b91c1c';
        if (lbl) lbl.textContent       = ok ? 'En vivo' : 'Reconectando...';
      });

    _renderFiltros();
    _loadRecent();
  }

  // ── CARGAR HISTORIAL RECIENTE ──
  async function _loadRecent() {
    const { data } = await SB.from('actividad_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(120);

    if (!data?.length) { _renderEmpty(); return; }
    data.reverse().forEach(r => _push(r, true));
    _render();
  }

  function _push(entry, hist) {
    _log.unshift({ ...entry, _hist: hist });
    if (_log.length > MAX) _log.pop();
  }

  function _updateBadge() {
    const badge = document.getElementById('actBadge');
    if (!badge) return;
    const n = _log.filter(e => !e._hist).length;
    badge.textContent  = n > 0 ? n : '';
    badge.style.display = n > 0 ? '' : 'none';
  }

  // ── FILTROS ──
  function _renderFiltros() {
    const wrap = document.getElementById('actFiltros');
    if (!wrap) return;

    const btns = [
      { v: '',         lbl: 'Todo' },
      { v: 'personal', lbl: '👤 Personal' },
      { v: 'lider',    lbl: '🔑 Líderes' },
      { v: 'horario',  lbl: '📅 Horarios' },
      { v: 'registro', lbl: '📝 Registros' },
      { v: 'fuera',    lbl: '⚠ Fuera de término' },
    ];

    wrap.innerHTML = btns.map(b => `
      <button onclick="Actividad._setFiltro('${b.v}')"
        id="actFBtn-${b.v}"
        style="background:${_filtroTipo===b.v?'rgba(210,105,24,.18)':'rgba(120,82,40,.06)'};
               border:1px solid ${_filtroTipo===b.v?'rgba(210,105,24,.45)':'rgba(58,42,26,.15)'};
               color:${_filtroTipo===b.v?'var(--one-cyan)':'rgba(58,42,26,.7)'};
               padding:5px 13px;border-radius:999px;font-family:var(--font-title);font-size:12px;
               font-weight:700;cursor:pointer;transition:all .15s;white-space:nowrap;">
        ${b.lbl}
      </button>`).join('');
  }

  function _setFiltro(v) {
    _filtroTipo = v;
    _renderFiltros();
    _render();
  }

  // ── RENDER FEED ──
  function _render() {
    const el = document.getElementById('actFeed');
    if (!el) return;

    // Filtrar
    let visible = _log;
    if (_filtroTipo === 'fuera') {
      visible = _log.filter(e => e.fuera_de_termino);
    } else if (_filtroTipo && GRUPOS[_filtroTipo]) {
      visible = _log.filter(e => GRUPOS[_filtroTipo].includes(e.tipo));
    }

    if (!visible.length) { _renderEmpty(true); return; }

    el.innerHTML = visible.map(entry => {
      const cfg = TIPOS[entry.tipo] || { icon:'🔧', label: entry.tipo, color:'#7a6449', bg:'rgba(120,82,40,.05)', border:'rgba(58,42,26,.15)' };
      const det = entry.detalle || {};
      const ac  = typeof areaColor === 'function' ? areaColor(entry.area || '') : '#7a6449';

      // Tag rol del usuario
      const rolTag = entry.usuario_tipo === 'lider'
        ? `<span style="font-size:9px;padding:1px 6px;border-radius:99px;background:rgba(185,130,43,.15);color:#b9822b;border:1px solid rgba(185,130,43,.25);">Líder</span>`
        : `<span style="font-size:9px;padding:1px 6px;border-radius:99px;background:rgba(192,86,46,.13);color:#c0562e;border:1px solid rgba(192,86,46,.25);">Admin</span>`;

      // Tag fuera de término
      const fuerTag = entry.fuera_de_termino
        ? `<span style="font-size:9px;padding:1px 8px;border-radius:99px;background:rgba(220,38,38,.18);color:#b91c1c;border:1px solid rgba(220,38,38,.35);font-weight:800;letter-spacing:.03em;">⚠ Fuera de término</span>`
        : '';

      // Tag hist/ahora
      const histTag = entry._hist
        ? `<span style="font-size:9px;padding:1px 6px;border-radius:99px;background:rgba(58,42,26,.07);color:rgba(58,42,26,.38);border:1px solid rgba(58,42,26,.12);">histórico</span>`
        : `<span style="font-size:9px;padding:1px 6px;border-radius:99px;background:rgba(210,105,24,.12);color:#d26918;border:1px solid rgba(210,105,24,.25);">ahora</span>`;

      // Detalle secundario según tipo
      let subDetail = '';
      if (det.area_anterior && det.area_nueva) {
        subDetail = `<div style="display:flex;align-items:center;gap:5px;margin-top:4px;font-size:12px;">
          <span style="color:${areaColor(det.area_anterior)};font-weight:700;">${det.area_anterior.split(' ')[0]}</span>
          <span style="color:rgba(58,42,26,.35);">→</span>
          <span style="color:${areaColor(det.area_nueva)};font-weight:700;">${det.area_nueva.split(' ')[0]}</span>
        </div>`;
      } else if (det.semana) {
        const pers = det.personas ? ` · ${det.personas} persona(s)` : '';
        subDetail = `<div style="font-size:11px;color:rgba(58,42,26,.4);margin-top:3px;">Semana ${det.semana}${pers}</div>`;
      } else if (det.fecha) {
        subDetail = `<div style="font-size:11px;color:rgba(58,42,26,.4);margin-top:3px;">Fecha: ${det.fecha}</div>`;
      } else if (det.campos) {
        subDetail = `<div style="font-size:11px;color:rgba(58,42,26,.38);margin-top:3px;">Campos: ${det.campos}</div>`;
      } else if (det.areas) {
        subDetail = `<div style="font-size:11px;color:rgba(58,42,26,.4);margin-top:3px;">Áreas: ${det.areas}</div>`;
      }

      return `<div style="display:flex;align-items:flex-start;gap:10px;
        background:${cfg.bg};border:1px solid ${cfg.border};
        border-radius:11px;padding:11px 14px;animation:fadeUp .2s ease both;">
        <div style="flex-shrink:0;font-size:17px;margin-top:2px;">${cfg.icon}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-bottom:5px;">
            <span style="font-size:11px;font-weight:800;color:${cfg.color};">${cfg.label}</span>
            ${histTag}${fuerTag}
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:13px;margin-bottom:2px;">
            <span style="font-weight:800;color:rgba(58,42,26,.95);">${entry.usuario || '—'}</span>
            ${rolTag}
            ${entry.area ? `<span style="color:${ac};font-size:11px;font-weight:700;">${entry.area.split(' / ')[0]}</span>` : ''}
            ${entry.target_nombre ? `<span style="color:rgba(58,42,26,.6);">→ <strong>${entry.target_nombre}</strong></span>` : ''}
          </div>
          <div style="font-size:12px;color:rgba(58,42,26,.48);">${entry.descripcion || ''}</div>
          ${subDetail}
        </div>
        <div style="flex-shrink:0;font-size:10px;color:rgba(58,42,26,.32);white-space:nowrap;margin-top:2px;">${fmtTs(entry.created_at)}</div>
      </div>`;
    }).join('');
  }

  function _renderEmpty(filtrado = false) {
    const el = document.getElementById('actFeed');
    if (!el) return;
    const msg = filtrado ? 'Sin eventos de este tipo en el historial.' : 'Sin cambios manuales registrados todavía.';
    el.innerHTML = `<div style="text-align:center;padding:60px 16px;color:rgba(58,42,26,.28);">
      <div style="font-size:36px;margin-bottom:12px;">🔔</div>
      <div style="font-size:14px;font-weight:700;">${msg}</div>
      <div style="font-size:12px;margin-top:5px;opacity:.6;">Los cambios manuales se registran automáticamente.</div>
    </div>`;
  }

  function clear() {
    _log = [];
    _render();
    const badge = document.getElementById('actBadge');
    if (badge) { badge.textContent = ''; badge.style.display = 'none'; }
  }

  return { start, clear, _setFiltro };
})();