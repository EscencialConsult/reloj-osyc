// js/horarios-sem.js — v4 (Flex + Guardia)

const HorariosSem = (() => {

  const DIAS      = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
  const DIA_LBL   = {lunes:'Lunes',martes:'Martes',miercoles:'Miércoles',jueves:'Jueves',viernes:'Viernes',sabado:'Sábado',domingo:'Domingo'};
  const DIA_CORTO = {lunes:'Lun',martes:'Mar',miercoles:'Mié',jueves:'Jue',viernes:'Vie',sabado:'Sáb',domingo:'Dom'};
  // Grupos de la grilla de horarios: por área si la empresa las usa, si no un solo grupo.
  // (AREAS es global — las áreas de la empresa; vacío si no usa áreas.)
  const _usaAreas = () => (typeof Features !== 'undefined') && Features.get().usa_areas && AREAS.length > 0;
  const _grupos   = () => _usaAreas() ? [...AREAS, 'GENERAL'] : ['GENERAL'];

  let semActual = '';
  let semViendo = '';
  let allData   = [];
  let regsReal  = [];
  let editArea  = null;
  let editRows  = [];
  let editRowId = null;
  let _inline   = false;   // true = editor directo en la pantalla (sin áreas)
  let _antData  = null;    // horarios de la semana anterior (para "copiar")

  // ─── INIT ───
  function init() {
    semActual = getLunes(today(), 0);
    semViendo = semActual;
    load();
  }

  // ─── CARGA ───
  async function load() {
    const desde = semViendo;
    const hasta = getSabado(desde);

    ['hsKP','hsKA','hsKE','hsKH'].forEach(id => {
      const el = document.getElementById(id); if (el) el.textContent = '…';
    });
    const grid = document.getElementById('hsemAreaGrid');
    if (grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:rgba(58,42,26,.3);"><span class="sp"></span></div>';

    const [{ data: hsData }, { data: rdData }] = await Promise.all([
      SB.from('horarios_semanales').select('*').eq('semana_desde', desde).order('area'),
      SB.from('registros').select('*').gte('fecha', desde).lte('fecha', hasta),
    ]);

    allData  = hsData  || [];
    regsReal = rdData  || [];

    _renderKPIs();
    _renderNav();
    _renderAreaGrid();
  }

  // ─── KPIs ───
  function _renderKPIs() {
    const personas = _flatPersonas(allData);
    const areas    = new Set(personas.map(p => p.area)).size;

    let totalHs = 0, conExtra = 0;
    const byNombre = {};
    personas.forEach(p => {
      const hs = _hsPersona(p);
      totalHs += hs;
      if (!byNombre[p.nombre]) byNombre[p.nombre] = { plan: 0, real: 0 };
      byNombre[p.nombre].plan += hs;
    });
    regsReal.forEach(r => {
      if (!r.hora_entrada || !r.hora_salida || r.turno === 'Flex' || r.turno === 'Guardia') return;
      const h = calcHs(r.hora_entrada.slice(0,5), r.hora_salida.slice(0,5));
      if (h && byNombre[r.nombre]) byNombre[r.nombre].real += h;
    });
    const s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    s('hsKP', personas.length);
    s('hsKA', areas);
    s('hsKH', totalHs > 0 ? fmtHs(totalHs) : '—');

    const conEspecial = personas.filter(p =>
      DIAS.some(d => p[d+'_tipo']==='flex' || p[d+'_tipo']==='guardia' || p[d+'_tipo']==='licencia')
    ).length;
    s('hsKE', conEspecial || '—');
  }

  // ─── NAV BAR ───
  function _renderNav() {
    const nav = document.getElementById('hsemNavBar');
    if (!nav) return;

    const limAnt   = getLunes(semActual, -4);
    const limPost  = getLunes(semActual,  1);
    const esActual = semViendo === semActual;
    const esAnt    = semViendo === getLunes(semActual, -1);
    const puedeAnt = semViendo > limAnt;
    const puedeSig = semViendo < limPost;

    const semD   = new Date(semViendo+'T12:00:00');
    const semH   = new Date(getSabado(semViendo)+'T12:00:00');
    const meses  = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    const label  = `${semD.getDate()} al ${semH.getDate()} de ${meses[semH.getMonth()]} ${semH.getFullYear()}`;

    nav.innerHTML = `
      <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;">
        <button class="tab-btn ${esActual?'active':''}" onclick="HorariosSem.irSemana(0)" style="font-size:12px;padding:6px 14px;">📅 Esta semana</button>
        <button class="tab-btn ${esAnt?'active':''}"    onclick="HorariosSem.irSemana(-1)" style="font-size:12px;padding:6px 14px;">← Semana ant.</button>
        <button class="wnav-sm ${puedeAnt?'':'op30'}" onclick="HorariosSem.movSem(-1)" ${puedeAnt?'':'disabled'}>‹</button>
        <span class="week-pill">📅 ${label}</span>
        <button class="wnav-sm ${puedeSig?'':'op30'}" onclick="HorariosSem.movSem(1)" ${puedeSig?'':'disabled'}>›</button>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:11px;color:rgba(58,42,26,.4);">Ir a fecha:</span>
          <input class="inp" type="date" style="padding:5px 10px;font-size:12px;max-width:150px;"
            onchange="HorariosSem.irFecha(this.value)"/>
        </div>
        <button class="btn btn-gold no-print" onclick="HorariosSem.exportCSV()" style="font-size:12px;padding:6px 14px;"><svg class="tab-ic" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>CSV</button>
      </div>`;
  }

  function movSem(dir) {
    const lim  = dir < 0 ? getLunes(semActual,-4) : getLunes(semActual,1);
    const nueva = getLunes(semViendo, dir);
    if (dir < 0 && nueva < lim) return;
    if (dir > 0 && nueva > lim) return;
    semViendo = nueva; load();
  }

  function irSemana(off) { semViendo = getLunes(semActual, off); load(); }

  async function irFecha(dateStr) {
    if (!dateStr) return;
    const lunes  = getLunes(dateStr, 0);
    const limAnt = getLunes(semActual, -4);
    if (lunes < limAnt) {
      if (!(await confirmDialog(`Fecha fuera del rango rápido (más de 1 mes).\n¿Cargar igual? (puede ser más lento)`, 'Cargar igual'))) return;
    }
    semViendo = lunes; load();
  }

  // ─── FLAT PERSONAS ───
  function _flatPersonas(data) {
    const out = [];
    data.forEach(row => {
      const hs = row.horarios;
      if (!Array.isArray(hs) || !hs.length) return;
      hs.forEach(h => {
        const p = { _rowId:row.id, area:row.area, nombre:h.nombre, rol:h.rol||'', obs:h.obs||'', obsArea:row.observaciones||'' };
        DIAS.forEach(d => {
          p[d+'_e']    = h[d]?.e    || '';
          p[d+'_s']    = h[d]?.s    || '';
          p[d+'_e2']   = h[d]?.e2   || '';
          p[d+'_s2']   = h[d]?.s2   || '';
          p[d+'_tipo'] = h[d]?.tipo  || 'normal';
        });
      p.vacaciones    = h.vacaciones    || false;  // ← agregar
      p.vacaciones_hs = h.vacaciones_hs || 0;     // ← agregar
        out.push(p);
      });
    });
    return out;
  }

function _hsPersona(p) {
  if (p.vacaciones) return p.vacaciones_hs || 0;
  let t=0;
  DIAS.forEach(d=>{
    const tipo = p[d+'_tipo'] || 'normal';
    if (tipo === 'guardia') { t += 1; return; }
    if (tipo === 'flex') return;
    if (tipo === 'licencia') return;
    const h1=calcHs(p[d+'_e'],p[d+'_s']);
    const h2=calcHs(p[d+'_e2'],p[d+'_s2']);
    if(h1)t+=h1; if(h2)t+=h2;
  });
  return t;
}


  // ─── GRID DE ÁREAS ───
  function _renderAreaGrid() {
    const grid = document.getElementById('hsemAreaGrid');
    if (!grid) return;
    if (!_usaAreas()) { _renderInlineEditor(grid); return; }  // sin áreas → editor directo en pantalla

    const byArea = {};
    allData.forEach(row => { byArea[row.area] = row; });

    grid.innerHTML = _grupos().map(area => {
      const row      = byArea[area];
      const col      = area==='GENERAL' ? (_usaAreas() ? '#7a6449' : '#d26918') : areaColor(area);
      const personas = row ? _flatPersonas([row]) : [];
      const totalHs  = personas.reduce((a,p) => a+_hsPersona(p), 0);
      const cargado  = !!row;

const flexCount     = personas.filter(p => DIAS.some(d => p[d+'_tipo']==='flex')).length;
const guardiaCount  = personas.filter(p => DIAS.some(d => p[d+'_tipo']==='guardia')).length;
const licenciaCount = personas.filter(p => DIAS.some(d => p[d+'_tipo']==='licencia')).length;
const vacCount      = personas.filter(p => p.vacaciones).length;  // ← agregar

      const persHtml = personas.slice(0,5).map(p => {
        const hs = _hsPersona(p);
        const refTipo = DIAS.map(d=>p[d+'_tipo']).find(t=>t&&t!=='normal') || 'normal';
        const refE = DIAS.map(d=>p[d+'_e']).find(x=>x) || '';
        const refS = DIAS.map(d=>p[d+'_s']).find(x=>x) || '';
        let horStr;
        if (refTipo==='flex')          horStr = `<span style="font-size:10px;color:var(--one-purple);">🔄 Flex</span>`;
        else if (refTipo==='guardia')  horStr = `<span style="font-size:10px;color:var(--one-gold);">🛡 Guardia</span>`;
        else if (refTipo==='licencia') horStr = `<span style="font-size:10px;color:#2563eb;">📋 Licencia</span>`;
        else horStr = refE ? `<span style="font-size:10px;color:rgba(58,42,26,.4);">${refE}${refS?' → '+refS:''}</span>` : '';
        return `<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(58,42,26,.05);">
          <div>
            <span style="font-size:12px;font-weight:700;">${p.nombre}</span>
            <span style="margin-left:6px;">${horStr}</span>
          </div>
          <span style="font-size:11px;color:var(--one-cyan);font-weight:700;flex-shrink:0;margin-left:8px;">${hs>0?fmtHs(hs):'—'}</span>
        </div>`;
      }).join('');

      const masHtml = personas.length > 5
        ? `<div style="font-size:11px;color:rgba(58,42,26,.35);padding-top:4px;">+${personas.length-5} más...</div>` : '';

      const badge = cargado
        ? `<span style="background:rgba(22,163,74,.14);border:1px solid rgba(22,163,74,.3);color:var(--color-success-text);padding:2px 9px;border-radius:999px;font-size:10px;font-weight:800;">✓ ${personas.length} personas</span>`
        : `<span style="background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.22);color:var(--color-danger-text);padding:2px 9px;border-radius:999px;font-size:10px;font-weight:800;">Sin cargar</span>`;

const extraBadges = [
  flexCount    ? `<span style="background:rgba(111,79,176,.14);border:1px solid rgba(111,79,176,.24);color:var(--one-purple);padding:2px 8px;border-radius:999px;font-size:9px;font-weight:800;">🔄 ${flexCount} Flex</span>` : '',
  guardiaCount  ? `<span style="background:rgba(185,130,43,.14);border:1px solid rgba(185,130,43,.24);color:var(--one-gold);padding:2px 8px;border-radius:999px;font-size:9px;font-weight:800;">🛡 ${guardiaCount} Guardia</span>` : '',
  licenciaCount ? `<span style="background:rgba(37,99,235,.14);border:1px solid rgba(37,99,235,.24);color:#2563eb;padding:2px 8px;border-radius:999px;font-size:9px;font-weight:800;">📋 ${licenciaCount} Lic.</span>` : '',
  vacCount      ? `<span style="background:rgba(22,163,74,.14);border:1px solid rgba(22,163,74,.24);color:var(--color-success-text);padding:2px 8px;border-radius:999px;font-size:9px;font-weight:800;">🏖 ${vacCount} Vac.</span>` : '',
].filter(Boolean).join(' ');

      return `<div class="area-card" onclick="HorariosSem.openAreaModal('${area}')">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;gap:8px;">
          <div>
            <div style="font-size:13px;font-weight:800;color:${col};">${area==='GENERAL'?(_usaAreas()?'<svg class="tab-ic" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>Sin área asignada':'<svg class="tab-ic" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Todos los empleados'):area}</div>
            ${cargado?`<div style="font-size:11px;color:rgba(58,42,26,.4);margin-top:1px;">Total: <strong style="color:var(--one-cyan);">${fmtHs(totalHs)}</strong></div>`:''}
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px;">
            ${badge}
            ${extraBadges ? `<div style="display:flex;gap:3px;flex-wrap:wrap;justify-content:flex-end;margin-top:3px;">${extraBadges}</div>` : ''}
            <span style="font-size:9px;color:rgba(58,42,26,.28);">${cargado?'Click para editar →':'Click para cargar →'}</span>
          </div>
        </div>
        <div style="border-top:1px solid rgba(58,42,26,.07);padding-top:8px;min-height:52px;">
          ${cargado ? (persHtml+masHtml) : '<div style="font-size:12px;color:rgba(58,42,26,.25);padding:4px 0;">No hay horarios para esta semana</div>'}
        </div>
        ${row?.observaciones?`<div style="margin-top:6px;font-size:11px;color:rgba(58,42,26,.38);padding-top:6px;border-top:1px solid rgba(58,42,26,.06);">📝 ${row.observaciones}</div>`:''}
      </div>`;
    }).join('');

    const tablaWrap = document.getElementById('hsemTablaWrap');
    if (tablaWrap && tablaWrap.style.display !== 'none') _renderTabla();
  }

  // ─── MODAL EDITOR ───
  async function openAreaModal(area) {
    _inline   = false;
    editArea  = area;
    editRowId = null;
    editRows  = [];

    const existing = allData.find(r => r.area === area);
    editRowId = existing?.id || null;

    let _q = SB.from('personal').select('nombre,rol').eq('activo', true);
    if (area !== 'GENERAL') _q = _q.eq('area', area);           // área específica
    else if (_usaAreas())  _q = _q.eq('area', 'GENERAL');       // "sin área asignada"
    const { data: personal } = await _q.order('nombre');

    if (!personal?.length) { showToast('No hay empleados en este grupo','err'); return; }

    const savedMap = {};
    (existing?.horarios || []).forEach(h => savedMap[h.nombre] = h);

    editRows = personal.map(p => {
      const sv = savedMap[p.nombre];
      const r  = { nombre:p.nombre, rol:p.rol||'', obs:sv?.obs||'', split:false };
      DIAS.forEach(d => {
        r[d+'_e']     = sv?.[d]?.e    || '';
        r[d+'_s']     = sv?.[d]?.s    || '';
        r[d+'_e2']    = sv?.[d]?.e2   || '';
        r[d+'_s2']    = sv?.[d]?.s2   || '';
        r[d+'_tipo']  = sv?.[d]?.tipo  || 'normal';
        r[d+'_split'] = !!(sv?.[d]?.e2 || sv?.[d]?.s2);
      });
      r.vacaciones    = sv?.vacaciones    || false;  // ← agregar
    r.vacaciones_hs = sv?.vacaciones_hs || 0;      // ← agregar
    r.split = DIAS.some(d => r[d+'_e2']);
      return r;
    });

    const { data: antRow } = await SB
      .from('horarios_semanales').select('*')
      .eq('area', area).eq('semana_desde', getLunes(semViendo,-1))
      .maybeSingle();

    const col   = areaColor(area);
    const desde = semViendo;
    const hasta = getSabado(desde);

    document.getElementById('mhAreaTitle').innerHTML =
      `<span style="color:${area === 'GENERAL' ? '#d26918' : areaColor(area)};">${area === 'GENERAL' ? (_usaAreas() ? '<svg class="tab-ic" viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>Sin área asignada' : '<svg class="tab-ic" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Todos los empleados') : area}</span>`;
    document.getElementById('mhSemLabel').textContent = `${_dd(desde)} al ${_dd(hasta)}`;
    document.getElementById('mhAreaObs').value = existing?.observaciones || '';

    const btnAnt = document.getElementById('btnCopiarAnt');
    if (btnAnt) {
      const hay = antRow?.horarios?.length > 0;
      btnAnt.style.display = hay ? '' : 'none';
      btnAnt._antData = hay ? antRow.horarios : null;
    }
    _antData = antRow?.horarios?.length > 0 ? antRow.horarios : null;

    _modalView = 'dias';
    _renderEditCards();
    document.getElementById('mHsem').style.display = '';
  }

  // ─── EDITOR INLINE (sin áreas: se muestra directo en la pantalla) ───
  async function _renderInlineEditor(grid) {
    _inline = true;
    editArea = 'GENERAL'; editRowId = null; editRows = [];
    const existing = allData.find(r => r.area === 'GENERAL');
    editRowId = existing?.id || null;
    const { data: personal } = await SB.from('personal').select('nombre,rol').eq('activo', true).order('nombre');
    if (!personal?.length) {
      grid.innerHTML = '<div class="glass" style="padding:20px;text-align:center;color:rgba(58,42,26,.45);">No hay empleados activos. Cargá personal en la pestaña <strong>Personal</strong>.</div>';
      return;
    }
    const savedMap = {}; (existing?.horarios || []).forEach(h => savedMap[h.nombre] = h);
    editRows = personal.map(p => {
      const sv = savedMap[p.nombre];
      const r = { nombre: p.nombre, rol: p.rol || '', obs: sv?.obs || '', split: false };
      DIAS.forEach(d => {
        r[d + '_e'] = sv?.[d]?.e || ''; r[d + '_s'] = sv?.[d]?.s || '';
        r[d + '_e2'] = sv?.[d]?.e2 || ''; r[d + '_s2'] = sv?.[d]?.s2 || '';
        r[d + '_tipo'] = sv?.[d]?.tipo || 'normal'; r[d + '_split'] = !!(sv?.[d]?.e2 || sv?.[d]?.s2);
      });
      r.vacaciones = sv?.vacaciones || false; r.vacaciones_hs = sv?.vacaciones_hs || 0;
      r.split = DIAS.some(d => r[d + '_e2']);
      return r;
    });
    const { data: antRow } = await SB.from('horarios_semanales').select('*')
      .eq('area', 'GENERAL').eq('semana_desde', getLunes(semViendo, -1)).maybeSingle();
    _antData = (antRow?.horarios?.length > 0) ? antRow.horarios : null;
    grid.innerHTML = `
      <div class="glass" style="padding:16px 18px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
          <h4 style="font-size:15px;font-weight:800;">Horario semanal · todos los empleados</h4>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${_antData ? '<button class="btn btn-ghost" style="font-size:12px;padding:7px 14px;" onclick="HorariosSem.copiarAntModal()">Copiar semana anterior</button>' : ''}
            <button class="btn btn-success" style="width:auto;padding:9px 22px;font-size:14px;" onclick="HorariosSem.saveArea()"><svg class="tab-ic" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Guardar</button>
          </div>
        </div>
        <div id="hsemInlineBody"></div>
      </div>`;
    _renderPersonGrid();
  }

  function _dd(s) {
    if (!s) return '';
    const [y,m,d] = s.split('-');
    return `${d}/${m}/${y}`;
  }

  function _diasArr(lunes) {
    return Array.from({length:7}, (_,i) => {
      const d = new Date(lunes+'T12:00:00');
      d.setDate(d.getDate()+i);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    });
  }

  let _modalView = 'dias';
  let _modalDia  = 0;

  function _renderEditCards() { _renderPersonGrid(); }

  // ── EDITOR POR PERSONA: la semana completa de cada uno en una grilla ──
  function _renderPersonGrid() {
    const cont = document.getElementById(_inline ? 'hsemInlineBody' : 'mhPersonasBody');
    if (!cont) return;
    const fArr = _diasArr(semViendo);
    const DCORTO = { lunes:'LUN', martes:'MAR', miercoles:'MIÉ', jueves:'JUE', viernes:'VIE', sabado:'SÁB', domingo:'DOM' };

    if (!editRows.length) { cont.innerHTML = '<div style="padding:30px;text-align:center;color:rgba(58,42,26,.35);">No hay empleados en este grupo.</div>'; return; }

    const cards = editRows.map((r, i) => {
      const vac = !!r.vacaciones;
      const cols = DIAS.map((d, di) => {
        const tipo  = r[d+'_tipo'] || 'normal';
        const spDia = !!(r[d+'_split'] || r[d+'_e2'] || r[d+'_s2']);
        let cell;
        if (tipo === 'flex')          cell = `<div class="hc-badge" style="color:var(--one-purple);background:rgba(111,79,176,.1);">🔄 Flex</div>`;
        else if (tipo === 'guardia')  cell = `<div class="hc-badge" style="color:var(--one-gold);background:rgba(185,130,43,.1);">🛡 1h</div>`;
        else if (tipo === 'licencia') cell = `<div class="hc-badge" style="color:#2563eb;background:rgba(37,99,235,.1);">📋 Lic</div>`;
        else cell = `
          <input class="ht-edit ${r[d+'_e']?'v':''}" type="text" maxlength="5" placeholder="—" value="${r[d+'_e']}"
            oninput="HorariosSem._uf(${i},'${d}_e',this)" onblur="HorariosSem._ff(${i},'${d}_e',this)"/>
          <input class="ht-edit ${r[d+'_s']?'v':''}" type="text" maxlength="5" placeholder="—" value="${r[d+'_s']}"
            oninput="HorariosSem._uf(${i},'${d}_s',this)" onblur="HorariosSem._ff(${i},'${d}_s',this)" style="margin-top:3px;"/>
          ${spDia ? `
          <input class="ht-edit ht-gold ${r[d+'_e2']?'v':''}" type="text" maxlength="5" placeholder="2°e" value="${r[d+'_e2']}"
            oninput="HorariosSem._uf(${i},'${d}_e2',this)" onblur="HorariosSem._ff(${i},'${d}_e2',this)" style="margin-top:3px;"/>
          <input class="ht-edit ht-gold ${r[d+'_s2']?'v':''}" type="text" maxlength="5" placeholder="2°s" value="${r[d+'_s2']}"
            oninput="HorariosSem._uf(${i},'${d}_s2',this)" onblur="HorariosSem._ff(${i},'${d}_s2',this)" style="margin-top:3px;"/>` : ''}`;

        return `<div class="hc-col">
          <div class="hc-day">${DCORTO[d]} <span class="hc-date">${_ddShort(fArr[di])}</span></div>
          <select class="hc-tipo" onchange="HorariosSem._setTipo(${i},'${d}',this.value)">
            <option value="normal"${tipo==='normal'?' selected':''}>Fijo</option>
            <option value="flex"${tipo==='flex'?' selected':''}>Flex</option>
            <option value="guardia"${tipo==='guardia'?' selected':''}>Guardia</option>
            <option value="licencia"${tipo==='licencia'?' selected':''}>Licencia</option>
          </select>
          ${cell}
          ${tipo==='normal' ? `<button class="hc-split ${spDia?'on':''}" onclick="HorariosSem._tsDia(${i},'${d}')" title="2° turno">✂ 2° turno</button>` : ''}
        </div>`;
      }).join('');

      return `<div class="hc-card">
        <div class="hc-head">
          <div style="min-width:0;">
            <span style="font-size:14px;font-weight:800;">${r.nombre}</span>
            <span style="font-size:11px;color:rgba(58,42,26,.4);margin-left:6px;">${r.rol||''}</span>
          </div>
          <div class="hc-tools">
            <button class="hc-vac ${vac?'on':''}" onclick="HorariosSem._toggleVac(${i})"><svg class="tab-ic" viewBox="0 0 24 24"><path d="M23 12a11.05 11.05 0 0 0-22 0zm-5 7a3 3 0 0 1-6 0v-7"/></svg>Vac.</button>
            <span class="hc-tot" id="mhTot${i}">${_calcTot(r)>0?fmtHs(_calcTot(r)):'—'}</span>
          </div>
        </div>
        ${!vac ? `
        <div class="hc-tpl">
          <span style="font-size:11px;color:rgba(58,42,26,.6);font-weight:800;">Días:</span>
          <span class="hc-days">${DIAS.map((d, di) => `<button type="button" class="hc-daychip${di < 5 ? ' on' : ''}" id="tplD${i}_${di}" onclick="this.classList.toggle('on')">${DCORTO[d]}</button>`).join('')}</span>
          <span class="hc-vsep"></span>
          <span style="font-size:11px;color:rgba(58,42,26,.5);font-weight:700;">Horario:</span>
          <input class="ht-edit" id="qfE${i}" type="text" maxlength="5" placeholder="09:00" style="width:52px;"/>
          <span style="color:rgba(58,42,26,.3);">→</span>
          <input class="ht-edit" id="qfS${i}" type="text" maxlength="5" placeholder="17:00" style="width:52px;"/>
          <button class="hc-apply" onclick="HorariosSem._fillWeek(${i})">Aplicar</button>
          ${PLANTILLAS.length ? `
          <span class="hc-vsep"></span>
          <span style="font-size:11px;color:rgba(58,42,26,.5);font-weight:700;">o Plantilla:</span>
          <select id="tplSel${i}" class="hc-tplsel">
            <option value="">Elegir…</option>
            ${PLANTILLAS.map((t, ti) => `<option value="${ti}">${t.nombre}${t.e ? ` (${t.e}${t.s ? '→' + t.s : ''}${t.e2 ? ' | ' + t.e2 + (t.s2 ? '→' + t.s2 : '') : ''})` : ''}</option>`).join('')}
          </select>
          <button class="hc-apply" onclick="HorariosSem._applyTemplate(${i})">Aplicar plantilla</button>` : ''}
        </div>` : ''}
        ${vac
          ? `<div style="padding:16px;text-align:center;color:var(--color-success-text);font-weight:800;font-size:13px;background:rgba(22,163,74,.06);border-radius:10px;">🏖 Semana de vacaciones</div>`
          : `<div class="hc-grid">${cols}</div>`}
        <input type="text" placeholder="Observación de ${r.nombre} (opcional)..." value="${(r.obs||'').replace(/"/g,'&quot;')}"
          oninput="HorariosSem._uo(${i}, this.value)" class="hc-obs"/>
      </div>`;
    }).join('');

    cont.innerHTML = `
      <style>
        .ht-edit{width:100%;text-align:center;padding:5px 3px;border:1px solid rgba(58,42,26,.18);border-radius:7px;background:#fffdf8;color:#3a2a1a;font-family:var(--font-body);font-size:13px;font-weight:700;}
        .ht-edit:focus{outline:none;border-color:rgba(210,105,24,.55);}
        .ht-edit.v{border-color:rgba(210,105,24,.4);color:#d26918;}
        .ht-edit.err{border-color:#dc2626;}
        .ht-gold.v{border-color:rgba(185,130,43,.5);color:#b9822b;}
        .hc-card{border:1px solid rgba(58,42,26,.1);border-radius:12px;padding:12px 14px;margin-bottom:10px;background:rgba(255,255,255,.55);}
        .hc-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px;}
        .hc-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
        .hc-quick{display:inline-flex;align-items:center;gap:5px;background:rgba(210,105,24,.06);border:1px solid rgba(210,105,24,.16);border-radius:999px;padding:4px 10px;}
        .hc-apply{background:#d26918;color:#fff;border:none;border-radius:999px;padding:4px 12px;font-family:var(--font-title);font-size:11px;font-weight:800;cursor:pointer;}
        .hc-apply:hover{background:#b9560f;}
        .hc-vac{background:rgba(120,82,40,.06);border:1px solid rgba(58,42,26,.16);color:rgba(58,42,26,.6);border-radius:999px;padding:4px 11px;font-family:var(--font-title);font-size:11px;font-weight:800;cursor:pointer;}
        .hc-vac.on{background:rgba(22,163,74,.14);border-color:rgba(22,163,74,.4);color:var(--color-success-text);}
        .hc-tot{font-size:13px;font-weight:800;color:#d26918;min-width:34px;text-align:right;}
        .hc-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;}
        .hc-col{background:rgba(120,82,40,.03);border:1px solid rgba(58,42,26,.08);border-radius:9px;padding:6px 5px;display:flex;flex-direction:column;gap:3px;}
        .hc-day{font-size:10px;font-weight:800;color:rgba(58,42,26,.65);text-align:center;}
        .hc-date{font-weight:600;color:rgba(58,42,26,.35);}
        .hc-tipo{width:100%;font-size:10px;padding:2px 3px;border:1px solid rgba(58,42,26,.14);border-radius:6px;background:#fffdf8;color:rgba(58,42,26,.7);cursor:pointer;margin-bottom:1px;}
        .hc-badge{text-align:center;font-size:11px;font-weight:800;padding:8px 2px;border-radius:7px;}
        .hc-split{background:none;border:1px dashed rgba(185,130,43,.3);color:rgba(185,130,43,.7);border-radius:6px;font-size:9px;font-weight:700;padding:2px;cursor:pointer;}
        .hc-split.on{background:rgba(185,130,43,.12);border-style:solid;}
        .hc-obs{margin-top:8px;width:100%;background:rgba(120,82,40,.04);border:1px solid rgba(58,42,26,.1);border-radius:8px;padding:6px 10px;font-family:var(--font-body);font-size:12px;color:rgba(58,42,26,.7);}
        .hc-tpl{display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:rgba(210,105,24,.05);border:1px solid rgba(210,105,24,.14);border-radius:10px;padding:7px 10px;margin-bottom:10px;}
        .hc-tplsel{font-size:12px;padding:5px 8px;border:1px solid rgba(58,42,26,.16);border-radius:8px;background:#fffdf8;color:#3a2a1a;font-weight:700;cursor:pointer;max-width:230px;}
        .hc-days{display:inline-flex;gap:3px;flex-wrap:wrap;}
        .hc-daychip{background:rgba(120,82,40,.06);border:1px solid rgba(58,42,26,.16);color:rgba(58,42,26,.5);border-radius:7px;font-size:10px;font-weight:800;padding:4px 7px;cursor:pointer;}
        .hc-daychip.on{background:rgba(210,105,24,.16);border-color:rgba(210,105,24,.45);color:#d26918;}
        .hc-vsep{width:1px;height:20px;background:rgba(58,42,26,.14);display:inline-block;}
        @media(max-width:720px){ .hc-grid{grid-template-columns:repeat(4,1fr);} }
      </style>` + cards;
  }

  // Días tildados (chips) de una persona — compartidos por "Aplicar" y "Aplicar plantilla"
  function _selectedDays(i) {
    return DIAS.filter((d, di) => document.getElementById('tplD' + i + '_' + di)?.classList.contains('on'));
  }

  // Cargar la misma entrada/salida a los días tildados de una persona
  function _fillWeek(i) {
    const e = _nh(document.getElementById('qfE'+i)?.value || '');
    const s = _nh(document.getElementById('qfS'+i)?.value || '');
    if (!e) { showToast('Ingresá la hora de entrada','err'); return; }
    const dias = _selectedDays(i);
    if (!dias.length) { showToast('Elegí al menos un día','err'); return; }
    dias.forEach(d => {
      editRows[i][d+'_tipo'] = 'normal';
      editRows[i][d+'_e'] = e; editRows[i][d+'_s'] = s;
      editRows[i][d+'_e2'] = ''; editRows[i][d+'_s2'] = ''; editRows[i][d+'_split'] = false;
    });
    _renderPersonGrid();
    showToast(`✓ Horario aplicado a ${dias.length} día(s)`);
  }

  function _toggleVac(i) {
    editRows[i].vacaciones = !editRows[i].vacaciones;
    _renderPersonGrid();
  }

  // Aplicar una plantilla a los días tildados de una persona (queda editable)
  function _applyTemplate(i) {
    const sel = document.getElementById('tplSel' + i);
    const idx = sel ? parseInt(sel.value, 10) : NaN;
    const t = PLANTILLAS[idx];
    if (!t) { showToast('Elegí una plantilla', 'err'); return; }
    const dias = _selectedDays(i);
    if (!dias.length) { showToast('Elegí al menos un día', 'err'); return; }
    dias.forEach(d => {
      editRows[i][d + '_tipo'] = 'normal';
      editRows[i][d + '_e'] = t.e || ''; editRows[i][d + '_s'] = t.s || '';
      if (t.e2) { editRows[i][d + '_e2'] = t.e2; editRows[i][d + '_s2'] = t.s2 || ''; editRows[i][d + '_split'] = true; }
      else { editRows[i][d + '_e2'] = ''; editRows[i][d + '_s2'] = ''; editRows[i][d + '_split'] = false; }
    });
    _renderPersonGrid();
    showToast(`✓ "${t.nombre}" aplicada a ${dias.length} día(s)`);
  }

  function _renderDiasList() {
    const cont = document.getElementById('mhPersonasBody');
    if (!cont) return;
    const fArr = _diasArr(semViendo);

    const rows = DIAS.map((d, di) => {
      const conH    = editRows.filter(r => r[d+'_e'] || r[d+'_tipo']==='flex' || r[d+'_tipo']==='guardia' || r[d+'_tipo']==='licencia');
      const primerH = conH[0];
      const todosIgual = conH.length > 1 && conH.every(r =>
        r[d+'_tipo'] === conH[0][d+'_tipo'] &&
        r[d+'_e'] === conH[0][d+'_e'] &&
        r[d+'_s'] === conH[0][d+'_s']
      );

      let resumen;
      if (conH.length === 0) {
        resumen = `<span style="font-size:12px;color:rgba(58,42,26,.28);">Sin horario</span>`;
      } else {
        const tipo0 = primerH[d+'_tipo'] || 'normal';
        let horStr;
        if (tipo0==='flex')          horStr = `<span style="color:var(--one-purple);font-weight:800;font-size:13px;">🔄 Flex</span>`;
        else if (tipo0==='guardia')  horStr = `<span style="color:var(--one-gold);font-weight:800;font-size:13px;">🛡 Guardia 1h</span>`;
        else if (tipo0==='licencia') horStr = `<span style="color:#2563eb;font-weight:800;font-size:13px;">📋 Licencia</span>`;
        else horStr = `<span style="font-size:13px;font-weight:800;color:var(--one-cyan);">${primerH[d+'_e']}${primerH[d+'_s']?' → '+primerH[d+'_s']:''}</span>`;
        resumen = `${horStr}
          ${todosIgual
            ? `<span style="font-size:11px;color:rgba(58,42,26,.4);margin-left:8px;">todos igual</span>`
            : `<span style="font-size:11px;color:rgba(58,42,26,.4);margin-left:6px;">${conH.length}/${editRows.length} cargados</span>`}`;
      }

      const statusDot = conH.length === 0
        ? `<span style="width:8px;height:8px;border-radius:50%;background:rgba(220,38,38,.4);display:inline-block;flex-shrink:0;"></span>`
        : conH.length === editRows.length
          ? `<span style="width:8px;height:8px;border-radius:50%;background:rgba(22,163,74,.55);display:inline-block;flex-shrink:0;"></span>`
          : `<span style="width:8px;height:8px;border-radius:50%;background:rgba(185,130,43,.55);display:inline-block;flex-shrink:0;"></span>`;

      return `<div onclick="HorariosSem._goDia(${di})"
        style="display:flex;align-items:center;justify-content:space-between;padding:13px 18px;border:1px solid rgba(58,42,26,.09);border-radius:10px;cursor:pointer;background:rgba(120,82,40,.03);transition:all .15s;margin-bottom:7px;"
        onmouseover="this.style.borderColor='rgba(210,105,24,.3)';this.style.background='rgba(210,105,24,.04)'"
        onmouseout="this.style.borderColor='rgba(58,42,26,.09)';this.style.background='rgba(120,82,40,.03)'">
        <div style="display:flex;align-items:center;gap:14px;">
          ${statusDot}
          <div>
            <span style="font-size:15px;font-weight:800;">${DIA_LBL[d]}</span>
            <span style="font-size:11px;color:rgba(58,42,26,.4);margin-left:8px;">${_ddShort(fArr[di])}</span>
          </div>
          <div>${resumen}</div>
        </div>
        <span style="font-size:16px;color:rgba(58,42,26,.35);">›</span>
      </div>`;
    }).join('');

    cont.innerHTML = rows;
  }

  function _renderDiaDetail(di) {
    const cont = document.getElementById('mhPersonasBody');
    if (!cont) return;
    const d    = DIAS[di];
    const fArr = _diasArr(semViendo);

    const personaRows = editRows.map((r, i) => {
      const tipo  = r[d+'_tipo'] || 'normal';
      const spDia = !!(r[d+'_split'] || r[d+'_e2'] || r[d+'_s2']);

      const tipoSelector = `
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">
          <button class="tipo-btn ${tipo==='normal'?'tipo-active-cyan':''}" onclick="HorariosSem._setTipo(${i},'${d}','normal')">🕐 Fijo</button>
          <button class="tipo-btn ${tipo==='flex'?'tipo-active-purple':''}" onclick="HorariosSem._setTipo(${i},'${d}','flex')">🔄 Flex</button>
          <button class="tipo-btn ${tipo==='guardia'?'tipo-active-gold':''}" onclick="HorariosSem._setTipo(${i},'${d}','guardia')">🛡 Guardia</button>
          <button class="tipo-btn ${tipo==='licencia'?'tipo-active-blue':''}" onclick="HorariosSem._setTipo(${i},'${d}','licencia')">📋 Licencia</button>
        </div>`;

      let contenido;
      if (tipo === 'flex') {
        contenido = `<div style="padding:10px 14px;background:rgba(111,79,176,.07);border:1px solid rgba(111,79,176,.2);border-radius:8px;font-size:12px;color:var(--one-purple);">🔄 <strong>Horario Flex</strong> — Sin horario fijo.</div>`;
      } else if (tipo === 'guardia') {
        contenido = `<div style="padding:10px 14px;background:rgba(185,130,43,.07);border:1px solid rgba(185,130,43,.2);border-radius:8px;font-size:12px;color:var(--one-gold);">🛡 <strong>Guardia</strong> — 1 hora computable.</div>`;
      } else if (tipo === 'licencia') {
        contenido = `<div style="padding:10px 14px;background:rgba(37,99,235,.07);border:1px solid rgba(37,99,235,.2);border-radius:8px;font-size:12px;color:#2563eb;">📋 <strong>Licencia</strong> — Ausencia avisada, 0 horas. No se registra ni computa.</div>`;
      } else {
        contenido = `
          <div style="display:grid;grid-template-columns:1fr 18px 1fr;align-items:center;gap:6px;">
            <input class="ht-edit ${r[d+'_e']?'v':''}" type="text" maxlength="5" placeholder="09:00" value="${r[d+'_e']}"
              oninput="HorariosSem._uf(${i},'${d}_e',this)" onblur="HorariosSem._ff(${i},'${d}_e',this)"/>
            <span style="font-size:13px;color:rgba(58,42,26,.3);text-align:center;">→</span>
            <input class="ht-edit ${r[d+'_s']?'v':''}" type="text" maxlength="5" placeholder="17:00" value="${r[d+'_s']}"
              oninput="HorariosSem._uf(${i},'${d}_s',this)" onblur="HorariosSem._ff(${i},'${d}_s',this)"/>
          </div>
          ${spDia ? `
          <div style="margin-top:6px;padding-top:6px;border-top:1px dashed rgba(185,130,43,.25);">
            <div style="font-size:9px;color:rgba(185,130,43,.6);font-weight:800;margin-bottom:4px;">✂ 2° TURNO</div>
            <div style="display:grid;grid-template-columns:1fr 18px 1fr;align-items:center;gap:6px;">
              <input class="ht-edit ht-gold ${r[d+'_e2']?'v':''}" type="text" maxlength="5" placeholder="—" value="${r[d+'_e2']}"
                oninput="HorariosSem._uf(${i},'${d}_e2',this)" onblur="HorariosSem._ff(${i},'${d}_e2',this)"/>
              <span style="font-size:13px;color:rgba(185,130,43,.28);text-align:center;">→</span>
              <input class="ht-edit ht-gold ${r[d+'_s2']?'v':''}" type="text" maxlength="5" placeholder="—" value="${r[d+'_s2']}"
                oninput="HorariosSem._uf(${i},'${d}_s2',this)" onblur="HorariosSem._ff(${i},'${d}_s2',this)"/>
            </div>
          </div>` : ''}
          <button class="btn-split-sm ${spDia?'on':''}" onclick="HorariosSem._tsDia(${i},'${d}')" style="font-size:11px;margin-top:4px;">
            ${spDia?'✂ Quitar 2° turno':'✂ Agregar 2° turno'}
          </button>`;
      }

      let hsDay = '—';
      if (tipo === 'guardia') hsDay = '1h';
      else if (tipo === 'normal') {
        const h1 = calcHs(r[d+'_e'], r[d+'_s']);
        const h2 = calcHs(r[d+'_e2'], r[d+'_s2']);
        const tot = (h1||0)+(h2||0);
        hsDay = tot > 0 ? fmtHs(tot) : '—';
      }

return `<div id="mh-member-${i}" style="padding:12px 16px;border-bottom:1px solid rgba(58,42,26,.06);">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
    <div>
      <span style="font-size:13px;font-weight:800;">${r.nombre}</span>
      <span style="font-size:11px;color:rgba(58,42,26,.4);margin-left:6px;">${r.rol||''}</span>
    </div>
    <span style="font-size:12px;font-weight:800;color:var(--one-cyan);">${hsDay}</span>
  </div>
  ${tipoSelector}
  ${contenido}
  <input type="text" placeholder="Observación de ${r.nombre} (opcional)..."
    value="${(r.obs||'').replace(/"/g,'&quot;')}"
    oninput="HorariosSem._uo(${i}, this.value)"
    style="margin-top:8px;background:rgba(120,82,40,.05);border:1px solid rgba(58,42,26,.12);
      color:rgba(58,42,26,.7);padding:6px 10px;border-radius:8px;
      font-family:var(--font-body);font-size:12px;width:100%;"/>
</div>`;
    }).join('');

    const daySidebar = DIAS.map((dd, ddi) => {
      const isActive = ddi === di;
      const conH = editRows.filter(r => r[dd+'_e'] || r[dd+'_tipo']==='flex' || r[dd+'_tipo']==='guardia' || r[dd+'_tipo']==='licencia');
      const dot = conH.length === 0 ? 'rgba(220,38,38,.4)'
        : conH.length === editRows.length ? 'rgba(22,163,74,.55)' : 'rgba(185,130,43,.55)';
      return `<button onclick="HorariosSem._goDia(${ddi})"
        style="width:100%;padding:8px 6px;border-radius:8px;border:none;cursor:pointer;transition:all .15s;text-align:center;
          background:${isActive?'rgba(111,79,176,.18)':'transparent'};
          border:1px solid ${isActive?'rgba(111,79,176,.45)':'transparent'};">
        <div style="width:6px;height:6px;border-radius:50%;background:${dot};margin:0 auto 4px;"></div>
        <div style="font-size:9px;font-weight:800;letter-spacing:.05em;color:${isActive?'#6f4fb0':'rgba(58,42,26,.45)'};text-transform:uppercase;">${DIA_CORTO[dd]}</div>
        <div style="font-size:8px;color:${isActive?'rgba(111,79,176,.7)':'rgba(58,42,26,.25)'};">${_ddShort(fArr[ddi])}</div>
      </button>`;
    }).join('');

    const memberBar = editRows.map((r, i) => {
      const tipo = r[d+'_tipo'] || 'normal';
      const tCol = tipo==='flex' ? '#6f4fb0' : tipo==='guardia' ? '#b9822b' : tipo==='licencia' ? '#2563eb' : (r[d+'_e'] ? '#d26918' : 'rgba(58,42,26,.28)');
      const initials = r.nombre.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
      const firstName = r.nombre.split(' ')[0];
      return `<button onclick="document.getElementById('mh-member-${i}').scrollIntoView({behavior:'smooth',block:'nearest'})"
        style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:4px;background:none;border:none;cursor:pointer;padding:0;transition:transform .15s;"
        onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
        <div style="width:40px;height:40px;border-radius:50%;border:2px solid ${tCol};background:${tCol}18;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:${tCol};">${initials}</div>
        <span style="font-size:9px;color:rgba(58,42,26,.5);white-space:nowrap;max-width:44px;overflow:hidden;text-overflow:ellipsis;">${firstName}</span>
      </button>`;
    }).join('');

    cont.innerHTML = `
      <style>
        .tipo-btn{background:rgba(120,82,40,.06);border:1px solid rgba(58,42,26,.18);color:rgba(58,42,26,.6);padding:4px 10px;border-radius:999px;font-family:var(--font-title);font-size:11px;font-weight:700;cursor:pointer;transition:all .18s;}
        .tipo-btn:hover{background:rgba(120,82,40,.11);}
        .tipo-active-cyan{background:rgba(210,105,24,.15)!important;border-color:rgba(210,105,24,.45)!important;color:var(--one-cyan)!important;}
        .tipo-active-purple{background:rgba(111,79,176,.15)!important;border-color:rgba(111,79,176,.45)!important;color:var(--one-purple)!important;}
        .tipo-active-gold{background:rgba(185,130,43,.15)!important;border-color:rgba(185,130,43,.45)!important;color:var(--one-gold)!important;}
        .tipo-active-blue{background:rgba(37,99,235,.15)!important;border-color:rgba(37,99,235,.45)!important;color:#2563eb!important;}
      </style>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <button onclick="HorariosSem._backDias()" style="background:rgba(120,82,40,.07);border:1px solid rgba(58,42,26,.18);color:rgba(58,42,26,.8);padding:6px 14px;border-radius:999px;font-family:var(--font-title);font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0;">‹ Volver</button>
        <div>
          <span style="font-size:16px;font-weight:800;">${DIA_LBL[d]}</span>
          <span style="font-size:13px;color:rgba(58,42,26,.45);margin-left:8px;">${_ddShort(fArr[di])}</span>
        </div>
      </div>
      <div style="margin-bottom:12px;padding:8px 12px;background:rgba(111,79,176,.06);border:1px solid rgba(111,79,176,.18);border-radius:10px;">
        <div style="font-size:9px;font-weight:800;letter-spacing:.1em;color:rgba(111,79,176,.55);text-transform:uppercase;margin-bottom:8px;">Miembros del área</div>
        <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:thin;scrollbar-color:rgba(111,79,176,.3) transparent;">${memberBar}</div>
      </div>
      <div style="display:flex;gap:8px;">
        <div style="display:flex;flex-direction:column;gap:3px;flex-shrink:0;width:48px;padding:8px 4px;background:rgba(111,79,176,.05);border:1px solid rgba(111,79,176,.18);border-radius:10px;">${daySidebar}</div>
        <div style="flex:1;background:rgba(120,82,40,.03);border:1px solid rgba(58,42,26,.09);border-radius:10px;overflow:hidden;min-width:0;">${personaRows}</div>
      </div>`;
  }

  function _setTipo(i, d, tipo) {
    editRows[i][d+'_tipo'] = tipo;
    if (tipo !== 'normal') {
      editRows[i][d+'_e'] = ''; editRows[i][d+'_s'] = '';
      editRows[i][d+'_e2'] = ''; editRows[i][d+'_s2'] = '';
    }
    _renderEditCards();
  }

  function _goDia(di)   { _modalView = 'dia-X'; _modalDia = di; _renderEditCards(); }
  function _backDias()  { _modalView = 'dias'; _renderEditCards(); }
  function _ddShort(s)  { if(!s)return''; const[y,m,d]=s.split('-'); return`${d}/${m}`; }

  function _tsDia(i, d) {
    const activo = editRows[i][d+'_split'];
    if (activo) {
      editRows[i][d+'_split'] = false;
      editRows[i][d+'_e2'] = ''; editRows[i][d+'_s2'] = '';
    } else {
      editRows[i][d+'_split'] = true;
    }
    _renderEditCards();
  }

  function _nh(raw) {
    if (!raw||!raw.trim()) return '';
    let s = raw.trim().replace(/[.,]/,':');
    let h, m;
    if (s.includes(':')) [h,m]=s.split(':');
    else if (s.length<=2) { h=s; m='0'; }
    else { h=s.slice(0,s.length-2); m=s.slice(-2); }
    h=parseInt(h,10); m=parseInt(m,10);
    if (isNaN(h)||isNaN(m)||h<0||h>23||m<0||m>59) return '';
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  }

  function _uf(i,k,inp) {
    editRows[i][k]=inp.value;
    inp.classList.remove('err'); inp.classList.toggle('v',!!inp.value.trim());
    _ut(i);
  }
  function _ff(i,k,inp) {
    const n=_nh(inp.value); editRows[i][k]=n; inp.value=n;
    inp.classList.remove('err'); inp.classList.toggle('v',!!n);
    _ut(i);
  }
  function _uo(i,v) { editRows[i].obs=v; }
  function _ut(i) {
    const el=document.getElementById('mhTot'+i);
    if(el) el.textContent=_calcTot(editRows[i])>0?fmtHs(_calcTot(editRows[i])):'—';
  }
  function _calcTot(r) {
    let t=0;
    DIAS.forEach(d=>{
      const tipo = r[d+'_tipo'] || 'normal';
      if (tipo === 'guardia') { t += 1; return; }
      if (tipo === 'flex') return;
      const h1=calcHs(r[d+'_e'],r[d+'_s']);
      const h2=calcHs(r[d+'_e2'],r[d+'_s2']);
      if(h1)t+=h1; if(h2)t+=h2;
    });
    return t;
  }

  function copiarAntModal() {
    if(!_antData) return;
    const antMap={}; _antData.forEach(h=>antMap[h.nombre]=h);
    let c=0;
    editRows.forEach(r=>{
      const a=antMap[r.nombre]; if(!a)return;
      DIAS.forEach(d=>{
        r[d+'_e']    = a[d]?.e    || '';
        r[d+'_s']    = a[d]?.s    || '';
        r[d+'_e2']   = a[d]?.e2   || '';
        r[d+'_s2']   = a[d]?.s2   || '';
        r[d+'_tipo'] = a[d]?.tipo  || 'normal';
      });
      if(a.obs) r.obs=a.obs;
      r.split=DIAS.some(d=>r[d+'_e2']);
      c++;
    });
    _renderEditCards();
    showToast(`✓ ${c} horario(s) copiados`);
  }

  // ─── GUARDAR ÁREA ───
  async function saveArea() {
    if (!editArea||!semViendo) return;
    const btn=document.getElementById('btnSHsem');
    btn.disabled=true; btn.textContent='Guardando...';

    const horarios=editRows.map(r=>{
      const obj={
  nombre:r.nombre, rol:r.rol, obs:r.obs||'',
  vacaciones: r.vacaciones || false,
  vacaciones_hs: r.vacaciones_hs || 0,
};
      DIAS.forEach(d=>{
        obj[d]={
          e:r[d+'_e']||'', s:r[d+'_s']||'',
          e2:r[d+'_e2']||'', s2:r[d+'_s2']||'',
          tipo:r[d+'_tipo']||'normal',
        };
      });
      return obj;
    });

    const payload={
      semana_desde: semViendo,
      semana_hasta: getSabado(semViendo),
      area: editArea,
      observaciones: document.getElementById('mhAreaObs').value.trim()||null,
      horarios,
    };

    let error;
    if (editRowId) {
      ({error}=await SB.from('horarios_semanales').update(payload).eq('id',editRowId));
    } else {
      const res=await SB.from('horarios_semanales').insert(payload).select('id').single();
      error=res.error;
      if(!error&&res.data?.id) editRowId=res.data.id;
    }

    btn.disabled=false; btn.textContent='✓ Guardar área completa';
    if (error) { showToast('Error: '+error.message,'err'); return; }

    await _sincronizarRegistros(editArea, semViendo, horarios);
    showToast(`✓ Horarios de ${editArea} guardados`);

    const fuera = esFueraDeTerm(semViendo);
    await logActividad(
      'horario_semanal_guardado', editArea, null,
      `Horario semanal ${editRowId?'actualizado':'creado'} para ${editArea} — semana ${semViendo}`,
      { semana:semViendo, personas:editRows.length, accion:editRowId?'actualizado':'creado' },
      fuera
    );

    closeModal();
    load();
  }

  // ─── SINCRONIZAR TURNO EN REGISTROS ───
  async function _sincronizarRegistros(area, semDesde, horarios) {
    const semHasta = getSabado(semDesde);
    const { data: regs } = await SB.from('registros')
      .select('id, nombre, fecha, turno')
      .eq('area', area).gte('fecha', semDesde).lte('fecha', semHasta);

    if (!regs?.length) return;

    const DIAS_SEM = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
    const horariosMap = {};
    horarios.forEach(h => horariosMap[h.nombre] = h);

    const updates = [];
regs.forEach(reg => {
      const p = horariosMap[reg.nombre];
      if (!p) return;
      if (p.vacaciones) {
        if (reg.turno !== 'Vacaciones') updates.push({ id: reg.id, turno: 'Vacaciones' });
        return;
      }
      const dKey = DIAS_SEM[new Date(reg.fecha + 'T12:00:00').getDay()];
      const dia  = p[dKey];
      if (!dia) return;
      const tipo = dia.tipo || 'normal';
      let nuevoTurno;
      if (tipo === 'flex')          nuevoTurno = 'Flex';
      else if (tipo === 'guardia')  nuevoTurno = 'Guardia';
      else if (tipo === 'licencia') nuevoTurno = 'Licencia';
      else {
        if (!dia.e) return;
        nuevoTurno = dia.e + (dia.s ? ' → ' + dia.s : '');
        if (dia.e2) nuevoTurno += ' | ' + dia.e2 + (dia.s2 ? ' → ' + dia.s2 : '');
      }
      if (reg.turno !== nuevoTurno) updates.push({ id: reg.id, turno: nuevoTurno });
    });

    if (updates.length) {
      await Promise.all(updates.map(u => SB.from('registros').update({ turno: u.turno }).eq('id', u.id)));
      showToast(`✓ Horarios guardados · ${updates.length} registro(s) sincronizado(s)`);
    }
  }

  function closeModal() {
    document.getElementById('mHsem').style.display='none';
    editArea=null; editRows=[]; editRowId=null;
  }

  // ─── ELIMINAR ÁREA ───
  async function delArea() {
    if (!editRowId) { showToast('No hay datos para eliminar','err'); return; }
    if (!(await confirmDialog(`¿Eliminar los horarios de "${editArea}" para esta semana?`))) return;
    const{error}=await SB.from('horarios_semanales').delete().eq('id',editRowId);
    if(error){showToast('Error','err');return;}
    showToast(`Horarios de ${editArea} eliminados`);

    await logActividad(
      'horario_semanal_eliminado', editArea, null,
      `Horario semanal eliminado para ${editArea} — semana ${semViendo}`,
      { semana:semViendo, personas:editRows.length },
      esFueraDeTerm(semViendo)
    );

    closeModal(); load();
  }

  // ─── TABLA DETALLADA ───
  function _renderTabla() {
    const tbody=document.getElementById('tbHsem');
    if(!tbody) return;
    const personas=_flatPersonas(allData);
    if(!personas.length){
      tbody.innerHTML=`<tr><td colspan="12" style="text-align:center;padding:30px;color:rgba(58,42,26,.3);">No hay horarios para esta semana</td></tr>`;
      return;
    }
    tbody.innerHTML=personas.map(p=>{
      const col=areaColor(p.area);
      const tp=_hsPersona(p);
      const re=regsReal.filter(r=>r.nombre===p.nombre&&r.turno!=='Flex'&&r.turno!=='Guardia')
        .reduce((a,r)=>{const h=calcHs(r.hora_entrada?.slice(0,5),r.hora_salida?.slice(0,5));return h?a+h:a;},0);
      const extra=re>tp&&tp>0?re-tp:0;
      const eb=extra>0?`<span class="badge badge-gold" style="font-size:10px;margin-left:4px;">+${fmtHs(extra)}</span>`:'';
      const fd=(e,s,tipo)=>{
        if(tipo==='flex')     return `<span style="color:var(--one-purple);font-size:11px;font-weight:700;">🔄 Flex</span>`;
        if(tipo==='guardia')  return `<span style="color:var(--one-gold);font-size:11px;font-weight:700;">🛡 1h</span>`;
        if(tipo==='licencia') return `<span style="color:#2563eb;font-size:11px;font-weight:700;">📋 Lic.</span>`;
        if(!e) return '<span style="color:rgba(58,42,26,.2);font-size:11px;">—</span>';
        return s?`<b style="font-size:12px;">${e}</b><span style="color:rgba(58,42,26,.35);font-size:10px;"> → ${s}</span>`
                :`<b style="font-size:12px;">${e}</b>`;
      };

      let obsCell;
      if (p.obs) {
        const preview = p.obs.length > 18 ? p.obs.slice(0,18)+'…' : p.obs;
        const safe    = p.obs.replace(/\\/g,'\\\\').replace(/`/g,'\\`');
        obsCell = `<div style="display:flex;align-items:center;gap:5px;">
          <span style="font-size:11px;color:rgba(58,42,26,.45);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:90px;">${preview}</span>
          <button onclick="HorariosSem._showObs(\`${safe}\`)" title="Ver completo"
            style="flex-shrink:0;background:rgba(210,105,24,.12);border:1px solid rgba(210,105,24,.25);color:#d26918;border-radius:6px;padding:2px 7px;font-size:10px;cursor:pointer;font-weight:700;line-height:1.5;">👁</button>
        </div>`;
      } else {
        obsCell = `<span style="color:rgba(58,42,26,.2);font-size:11px;">—</span>`;
      }

      return`<tr>
        <td><span style="color:${col};font-weight:800;font-size:11px;">${p.area.split(' ')[0]}</span></td>
        <td style="font-weight:700;white-space:nowrap;">${p.nombre}${eb}</td>
        ${DIAS.map(d=>`<td style="font-size:12px;line-height:1.6;">${fd(p[d+'_e'],p[d+'_s'],p[d+'_tipo'])}${p[d+'_e2']?'<br/>'+fd(p[d+'_e2'],p[d+'_s2'],'normal'):''}</td>`).join('')}
        <td><span class="badge badge-cyan" style="font-size:10px;">${tp>0?fmtHs(tp):'—'}</span></td>
        <td>${obsCell}</td>
        <td class="no-print"><button class="btn btn-ghost" style="padding:4px 8px;font-size:11px;" onclick="HorariosSem.openAreaModal('${p.area}')">✏</button></td>
      </tr>`;
    }).join('');
  }

  // ─── POPUP OBSERVACIÓN ───
  function _showObs(text) {
    document.getElementById('hsemObsPopup')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'hsemObsPopup';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,.72);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;';
    overlay.innerHTML = `
      <div style="background:#fffdf8;border:1px solid rgba(210,105,24,.22);border-radius:16px;padding:24px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.6);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div style="font-size:12px;font-weight:700;color:rgba(210,105,24,.7);text-transform:uppercase;letter-spacing:.07em;">💬 Observación</div>
          <button onclick="document.getElementById('hsemObsPopup').remove()" style="background:none;border:none;color:rgba(58,42,26,.5);font-size:20px;cursor:pointer;">✕</button>
        </div>
        <div style="background:rgba(120,82,40,.05);border:1px solid rgba(58,42,26,.1);border-radius:10px;padding:14px 16px;font-size:14px;line-height:1.7;color:rgba(58,42,26,.88);word-break:break-word;">${text}</div>
        <button onclick="document.getElementById('hsemObsPopup').remove()" style="margin-top:14px;width:100%;padding:10px;border-radius:10px;background:rgba(210,105,24,.12);border:1px solid rgba(210,105,24,.28);color:#d26918;font-weight:700;font-size:13px;cursor:pointer;">Cerrar</button>
      </div>`;
    overlay.addEventListener('click', e => { if(e.target===overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  // ─── DESCARGAR IMAGEN ───
  function descargarImagen() {
    const personas = _flatPersonas(allData);
    if (!personas.length) { showToast('Sin datos para generar imagen','err'); return; }

    const desde = semViendo;
    const DLAN  = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

    const fd = (e,s,tipo) => {
      if (tipo==='flex')     return 'Flex';
      if (tipo==='guardia')  return '1h';
      if (tipo==='licencia') return 'Licencia';
      if (!e) return '—';
      return s ? `${e}→${s}` : e;
    };

    const filas = personas.map(p => {
      const tp  = _hsPersona(p);
      const dias = DIAS.map(d => {
        let txt = fd(p[d+'_e'], p[d+'_s'], p[d+'_tipo']);
        if (p[d+'_e2']) txt += ` / ${fd(p[d+'_e2'], p[d+'_s2'], 'normal')}`;
        return txt;
      });
      return { area:p.area, nombre:p.nombre, dias, hs:tp>0?fmtHs(tp):'—', obs:p.obs||'' };
    });

    const colW=108, col0=88, col1=155, colHs=56, colObs=130, rowH=34, headH=42, pad=18;
    const totalW = pad*2 + col0 + col1 + colW*7 + colHs + colObs;
    const totalH = pad*2 + headH*2 + rowH*filas.length + 46;

    const canvas = document.createElement('canvas');
    const scale  = 2;
    canvas.width  = totalW*scale;
    canvas.height = totalH*scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    const ACOLORS = {
    'ADMINISTRACION':'#d26918','COMERCIAL':'#c0562e','RECURSOS HUMANOS':'#b9822b',
    'MARKETING':'#c23d78','ACADEMICO / GT':'#6f4fb0',
    'INNOVACION Y DESARROLLO':'#1f8f5f','MAESTRANZA':'#c2560f','PASANTIAS':'#2563eb',
  };

    ctx.fillStyle='#f5e9d0'; ctx.fillRect(0,0,totalW,totalH);

    ctx.fillStyle='#3a2a1a'; ctx.font=`bold 14px "Segoe UI",sans-serif`;
    ctx.fillText(`Runas Café · Semana ${_dd(desde)} al ${_dd(getSabado(desde))}`, pad, pad+14);
    ctx.fillStyle='rgba(58,42,26,.4)'; ctx.font=`11px "Segoe UI",sans-serif`;
    ctx.fillText('Runas Café', pad, pad+30);

    const hY = pad+headH;
    const cols = [
      {lbl:'ÁREA',   x:pad},
      {lbl:'NOMBRE', x:pad+col0},
      ...DLAN.map((d,i)=>({lbl:d, x:pad+col0+col1+colW*i})),
      {lbl:'HS/SEM', x:pad+col0+col1+colW*7},
      {lbl:'OBS',    x:pad+col0+col1+colW*7+colHs},
    ];

    ctx.fillStyle='rgba(120,82,40,.06)';
    ctx.fillRect(pad, hY-rowH+6, totalW-pad*2, rowH);
    ctx.fillStyle='rgba(58,42,26,.45)'; ctx.font=`bold 10px "Segoe UI",sans-serif`;
    cols.forEach(c => ctx.fillText(c.lbl, c.x+7, hY-8));

    ctx.strokeStyle='rgba(58,42,26,.12)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(pad,hY+3); ctx.lineTo(totalW-pad,hY+3); ctx.stroke();

    filas.forEach((row,ri) => {
      const y = hY+3+rowH*ri;
      if (ri%2===0) { ctx.fillStyle='rgba(120,82,40,.02)'; ctx.fillRect(pad,y,totalW-pad*2,rowH); }

      const ac = ACOLORS[row.area]||'#7a6449';
      ctx.fillStyle=ac; ctx.font=`bold 10px "Segoe UI",sans-serif`;
      ctx.fillText(row.area.split(' ')[0], pad+7, y+rowH*.62);

      ctx.fillStyle='#3a2a1a'; ctx.font=`bold 12px "Segoe UI",sans-serif`;
      ctx.fillText(row.nombre, pad+col0+7, y+rowH*.62);

      ctx.font=`11px "Segoe UI",sans-serif`;
      row.dias.forEach((txt,di) => {
        const isEsp = txt==='Flex'||txt==='1h';
        ctx.fillStyle = isEsp ? (txt==='Flex'?'#6f4fb0':'#b9822b') : (txt==='—'?'rgba(58,42,26,.25)':'#d26918');
        ctx.fillText(txt, pad+col0+col1+colW*di+7, y+rowH*.62);
      });

      ctx.fillStyle='#d26918'; ctx.font=`bold 11px "Segoe UI",sans-serif`;
      ctx.fillText(row.hs, pad+col0+col1+colW*7+7, y+rowH*.62);

      if (row.obs) {
        ctx.fillStyle='rgba(58,42,26,.5)'; ctx.font=`10px "Segoe UI",sans-serif`;
        ctx.fillText(row.obs.length>18?row.obs.slice(0,18)+'…':row.obs, pad+col0+col1+colW*7+colHs+7, y+rowH*.62);
      }

      ctx.strokeStyle='rgba(58,42,26,.06)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(pad,y+rowH); ctx.lineTo(totalW-pad,y+rowH); ctx.stroke();
    });

    const fy = hY+3+rowH*filas.length+16;
    ctx.fillStyle='rgba(58,42,26,.28)'; ctx.font=`10px "Segoe UI",sans-serif`;
    ctx.fillText(`Runas Café · ${new Date().toLocaleDateString('es-AR')}`, pad, fy);

    const a = document.createElement('a');
    a.download = `Runas_horarios_${semViendo}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
    showToast('✓ Imagen descargada');
  }

  // ─── EXPORT CSV ───
  function exportCSV() {
    const personas=_flatPersonas(allData);
    if(!personas.length){showToast('Sin datos','err');return;}
    const cols=['Área','Nombre','Rol',
      ...DIAS.flatMap(d=>[`${DIA_LBL[d]} Tipo`,`${DIA_LBL[d]} E`,`${DIA_LBL[d]} S`,`${DIA_LBL[d]} E2`,`${DIA_LBL[d]} S2`]),
      'Hs/sem','Obs. persona','Obs. área'];
    const lines=[cols.join(',')];
    personas.forEach(p=>{
      lines.push([
        `"${p.area}"`,`"${p.nombre}"`,`"${p.rol}"`,
        ...DIAS.flatMap(d=>[
          `"${p[d+'_tipo']||'normal'}"`,
          `"${p[d+'_e']||''}"`,`"${p[d+'_s']||''}"`,`"${p[d+'_e2']||''}"`,`"${p[d+'_s2']||''}"`
        ]),
        _calcTot(p).toFixed(2),`"${p.obs||''}"`,`"${p.obsArea||''}"`
      ].join(','));
    });
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob(['\uFEFF'+lines.join('\n')],{type:'text/csv;charset=utf-8;'}));
    a.download=`Runas_horarios_${semViendo}.csv`;
    a.click(); showToast('CSV descargado ✓');
  }

  return {
    init, load, movSem, irSemana, irFecha,
    openAreaModal, copiarAntModal, closeModal, saveArea, delArea,
    exportCSV, _renderTabla, _showObs, descargarImagen,
    _uf, _ff, _uo, _tsDia, _goDia, _backDias, _setTipo,
    _fillWeek, _toggleVac, _applyTemplate,
  };

  
})();


const CfgVentana = (() => {
  const DIAS_CFG = [
    { key:'lunes',     label:'Lunes' },
    { key:'martes',    label:'Martes' },
    { key:'miercoles', label:'Miércoles' },
    { key:'jueves',    label:'Jueves' },
    { key:'viernes',   label:'Viernes' },
    { key:'sabado',    label:'Sábado' },
    { key:'domingo',   label:'Domingo' },
  ];

  let _cfg = {};

  async function load() {
    const { data } = await SB.from('configuracion')
      .select('valor').eq('id','ventana_carga').maybeSingle();
    _cfg = data?.valor || {};
    _render();
  }

function _render() {
    const wrap = document.getElementById('cfgDias');
    if (!wrap) return;

    wrap.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:12px;">
        ${DIAS_CFG.map(d => {
          const activo = (_cfg[d.key]||{}).activo;
          return `<button onclick="CfgVentana._toggle('${d.key}', ${!activo})"
            style="padding:10px 4px;border-radius:12px;font-family:var(--font-title);
              font-size:12px;font-weight:800;cursor:pointer;transition:all .2s;
              border:2px solid ${activo?'rgba(210,105,24,.6)':'rgba(58,42,26,.14)'};
              background:${activo?'rgba(210,105,24,.15)':'rgba(120,82,40,.03)'};
              color:${activo?'var(--one-cyan)':'rgba(58,42,26,.28)'};
              text-align:center;">
            ${d.label.slice(0,3)}
            <div style="font-size:8px;margin-top:3px;color:${activo?'rgba(210,105,24,.6)':'rgba(58,42,26,.2)'};">
              ${activo?'✓ ON':'OFF'}
            </div>
          </button>`;
        }).join('')}
      </div>
      ${DIAS_CFG.some(d => (_cfg[d.key]||{}).activo) ? `
        <div style="font-size:10px;font-weight:700;color:rgba(58,42,26,.35);
          text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">
          Hora límite por día (vacío = todo el día)
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${DIAS_CFG.filter(d => (_cfg[d.key]||{}).activo).map(d => {
            const hasta = _cfg[d.key]?.hasta ?? '';
            return `<div style="display:flex;align-items:center;gap:10px;
              background:rgba(210,105,24,.05);border:1px solid rgba(210,105,24,.12);
              border-radius:9px;padding:7px 14px;">
              <span style="font-size:12px;font-weight:800;color:var(--one-cyan);
                min-width:28px;">${d.label.slice(0,3)}</span>
              <div style="flex:1;height:1px;background:rgba(58,42,26,.07);"></div>
              <input type="number" min="0" max="23" placeholder="Sin límite"
                value="${hasta}"
                onchange="CfgVentana._setHasta('${d.key}', this.value)"
                style="background:rgba(120,82,40,.07);border:1px solid rgba(210,105,24,.25);
                  color:var(--one-cyan);padding:4px 8px;border-radius:7px;
                  font-family:var(--font-title);font-size:13px;font-weight:800;
                  width:80px;text-align:center;"/>
              <span style="font-size:11px;color:rgba(58,42,26,.3);">hs</span>
            </div>`;
          }).join('')}
        </div>` :
        `<div style="font-size:12px;color:rgba(58,42,26,.25);text-align:center;padding:8px 0;">
          Activá al menos un día para configurar la hora límite
        </div>`
      }`;
  }

  function _toggle(key, activo) {
    if (!_cfg[key]) _cfg[key] = { activo: false, hasta: null };
    _cfg[key].activo = activo;
    _render();
  }

  function _setHasta(key, val) {
    if (!_cfg[key]) _cfg[key] = { activo: true, hasta: null };
    const n = parseInt(val);
    _cfg[key].hasta = isNaN(n) || val === '' ? null : n;
  }

  async function guardar() {
    const st = document.getElementById('cfgStatus');
    st.textContent = '⏳ Guardando...';
    st.style.color = 'rgba(58,42,26,.5)';
    const { error } = await SB.from('configuracion')
      .upsert({ id: 'ventana_carga', valor: _cfg });
    if (error) {
      st.textContent = '⚠ Error: ' + error.message;
      st.style.color = 'var(--color-danger-text)';
    } else {
      st.textContent = '✓ Guardado';
      st.style.color = 'var(--color-success-text)';
      showToast('✓ Ventana de carga actualizada');
    }
  }

  return { load, guardar, _toggle, _setHasta };
})();




window.loadHsem      = () => HorariosSem.load();
window.exportHsemCSV = () => HorariosSem.exportCSV();