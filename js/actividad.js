/* js/actividad.js — OSYC v2
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
    personal_nuevo:            { icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-.15em;display:inline-block"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>', label:'Persona agregada',          color:'#15803d', bg:'rgba(22,163,74,.10)',   border:'rgba(22,163,74,.24)'   },
    personal_editado:          { icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-.15em;display:inline-block"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',  label:'Datos de persona editados', color:'#2c6eb4', bg:'rgba(44,110,180,.08)', border:'rgba(44,110,180,.20)' },
    personal_traspaso:         { icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-.15em;display:inline-block"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>', label:'Traspaso de área',           color:'#3457a8', bg:'rgba(111,79,176,.10)', border:'rgba(111,79,176,.24)' },
    personal_eliminado:        { icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-.15em;display:inline-block"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',  label:'Persona eliminada',         color:'#b91c1c', bg:'rgba(220,38,38,.10)',   border:'rgba(220,38,38,.24)'   },
    lider_nuevo:               { icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-.15em;display:inline-block"><path d="M15 7a4 4 0 1 0-3.9 5H14v2h2v2h3v-3l2.3-2.3A4 4 0 0 0 15 7z"/><circle cx="11" cy="11" r="1"/></svg>', label:'Líder creado',               color:'#15803d', bg:'rgba(22,163,74,.10)',   border:'rgba(22,163,74,.24)'   },
    lider_editado:             { icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-.15em;display:inline-block"><path d="M15 7a4 4 0 1 0-3.9 5H14v2h2v2h3v-3l2.3-2.3A4 4 0 0 0 15 7z"/><circle cx="11" cy="11" r="1"/></svg>', label:'Líder editado',              color:'#2c6eb4', bg:'rgba(44,110,180,.08)', border:'rgba(44,110,180,.20)' },
    lider_eliminado:           { icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-.15em;display:inline-block"><path d="M15 7a4 4 0 1 0-3.9 5H14v2h2v2h3v-3l2.3-2.3A4 4 0 0 0 15 7z"/><circle cx="11" cy="11" r="1"/></svg>', label:'Líder eliminado',            color:'#b91c1c', bg:'rgba(220,38,38,.10)',   border:'rgba(220,38,38,.24)'   },
    horario_semanal_guardado:  { icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-.15em;display:inline-block"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', label:'Horario semanal guardado',   color:'#3f6aa0', bg:'rgba(63,106,160,.09)', border:'rgba(63,106,160,.24)' },
    horario_semanal_eliminado: { icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-.15em;display:inline-block"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', label:'Horario semanal eliminado',  color:'#b91c1c', bg:'rgba(220,38,38,.10)',   border:'rgba(220,38,38,.24)'   },
    registro_editado:          { icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-.15em;display:inline-block"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>', label:'Registro editado',           color:'#c23d78', bg:'rgba(194,61,120,.08)', border:'rgba(194,61,120,.22)' },
    registro_eliminado:        { icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-.15em;display:inline-block"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',  label:'Registro eliminado',        color:'#b91c1c', bg:'rgba(220,38,38,.10)',   border:'rgba(220,38,38,.24)'   },
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
        if (cfg) showToast(`${payload.new.usuario} — ${payload.new.descripcion}`);
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
      { v: 'personal', lbl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-.15em;display:inline-block"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Personal' },
      { v: 'lider',    lbl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-.15em;display:inline-block"><path d="M15 7a4 4 0 1 0-3.9 5H14v2h2v2h3v-3l2.3-2.3A4 4 0 0 0 15 7z"/><circle cx="11" cy="11" r="1"/></svg> Líderes' },
      { v: 'horario',  lbl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-.15em;display:inline-block"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Horarios' },
      { v: 'registro', lbl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-.15em;display:inline-block"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg> Registros' },
      { v: 'fuera',    lbl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-.15em;display:inline-block"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Fuera de término' },
    ];

    wrap.innerHTML = btns.map(b => `
      <button onclick="Actividad._setFiltro('${b.v}')"
        id="actFBtn-${b.v}"
        style="background:${_filtroTipo===b.v?'rgba(44,110,180,.18)':'rgba(44,74,110,.06)'};
               border:1px solid ${_filtroTipo===b.v?'rgba(44,110,180,.45)':'rgba(30,47,69,.15)'};
               color:${_filtroTipo===b.v?'var(--one-cyan)':'rgba(30,47,69,.7)'};
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
      const cfg = TIPOS[entry.tipo] || { icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-.15em;display:inline-block"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.3L3 18l3 3 6.4-6.3a4 4 0 0 0 5.3-5.4l-2.8 2.8-2.1-2.1z"/></svg>', label: entry.tipo, color:'#5b6b80', bg:'rgba(44,74,110,.05)', border:'rgba(30,47,69,.15)' };
      const det = entry.detalle || {};
      const ac  = typeof areaColor === 'function' ? areaColor(entry.area || '') : '#5b6b80';

      // Tag rol del usuario
      const rolTag = entry.usuario_tipo === 'lider'
        ? `<span style="font-size:9px;padding:1px 6px;border-radius:99px;background:rgba(63,106,160,.15);color:#3f6aa0;border:1px solid rgba(63,106,160,.25);">Líder</span>`
        : `<span style="font-size:9px;padding:1px 6px;border-radius:99px;background:rgba(44,110,180,.13);color:#2c6eb4;border:1px solid rgba(44,110,180,.25);">Admin</span>`;

      // Tag fuera de término
      const fuerTag = entry.fuera_de_termino
        ? `<span style="font-size:9px;padding:1px 8px;border-radius:99px;background:rgba(220,38,38,.18);color:#b91c1c;border:1px solid rgba(220,38,38,.35);font-weight:800;letter-spacing:.03em;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-.15em;display:inline-block"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Fuera de término</span>`
        : '';

      // Tag hist/ahora
      const histTag = entry._hist
        ? `<span style="font-size:9px;padding:1px 6px;border-radius:99px;background:rgba(30,47,69,.07);color:rgba(30,47,69,.38);border:1px solid rgba(30,47,69,.12);">histórico</span>`
        : `<span style="font-size:9px;padding:1px 6px;border-radius:99px;background:rgba(44,110,180,.12);color:#2c6eb4;border:1px solid rgba(44,110,180,.25);">ahora</span>`;

      // Detalle secundario según tipo
      let subDetail = '';
      if (det.area_anterior && det.area_nueva) {
        subDetail = `<div style="display:flex;align-items:center;gap:5px;margin-top:4px;font-size:12px;">
          <span style="color:${areaColor(det.area_anterior)};font-weight:700;">${det.area_anterior.split(' ')[0]}</span>
          <span style="color:rgba(30,47,69,.35);">→</span>
          <span style="color:${areaColor(det.area_nueva)};font-weight:700;">${det.area_nueva.split(' ')[0]}</span>
        </div>`;
      } else if (det.semana) {
        const pers = det.personas ? ` · ${det.personas} persona(s)` : '';
        subDetail = `<div style="font-size:11px;color:rgba(30,47,69,.4);margin-top:3px;">Semana ${det.semana}${pers}</div>`;
      } else if (det.fecha) {
        subDetail = `<div style="font-size:11px;color:rgba(30,47,69,.4);margin-top:3px;">Fecha: ${det.fecha}</div>`;
      } else if (det.campos) {
        subDetail = `<div style="font-size:11px;color:rgba(30,47,69,.38);margin-top:3px;">Campos: ${det.campos}</div>`;
      } else if (det.areas) {
        subDetail = `<div style="font-size:11px;color:rgba(30,47,69,.4);margin-top:3px;">Áreas: ${det.areas}</div>`;
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
            <span style="font-weight:800;color:rgba(30,47,69,.95);">${entry.usuario || '—'}</span>
            ${rolTag}
            ${entry.area ? `<span style="color:${ac};font-size:11px;font-weight:700;">${entry.area.split(' / ')[0]}</span>` : ''}
            ${entry.target_nombre ? `<span style="color:rgba(30,47,69,.6);">→ <strong>${entry.target_nombre}</strong></span>` : ''}
          </div>
          <div style="font-size:12px;color:rgba(30,47,69,.48);">${entry.descripcion || ''}</div>
          ${subDetail}
        </div>
        <div style="flex-shrink:0;font-size:10px;color:rgba(30,47,69,.32);white-space:nowrap;margin-top:2px;">${fmtTs(entry.created_at)}</div>
      </div>`;
    }).join('');
  }

  function _renderEmpty(filtrado = false) {
    const el = document.getElementById('actFeed');
    if (!el) return;
    const msg = filtrado ? 'Sin eventos de este tipo en el historial.' : 'Sin cambios manuales registrados todavía.';
    el.innerHTML = `<div style="text-align:center;padding:60px 16px;color:rgba(30,47,69,.28);">
      <div style="font-size:36px;margin-bottom:12px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;vertical-align:-.15em;display:inline-block"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg></div>
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