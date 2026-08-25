// js/personal.js — RUNAS (áreas opcionales; el puesto va en "Rol")
const Personal = (() => {
  let all = [];

  const _usaAreas = () => (typeof Features !== 'undefined') && Features.get().usa_areas;

  async function load() {
    const { data } = await SB.from('personal').select('*').order('nombre');
    all = data || [];
    const el = document.getElementById('pCnt');
    if (el) el.textContent = `${all.length} personas en total`;
    render();
  }

  function render() {
    const rows = all;
    const tb = document.getElementById('tbP');
    if (!rows.length) { tb.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:rgba(58,42,26,.3);">Sin personal</td></tr>`; return; }
    tb.innerHTML = rows.map((p, i) => {
      const areaBadge = (p.area && p.area !== 'GENERAL')
        ? ` <span style="font-size:10px;font-weight:800;color:${areaColor(p.area)};background:${areaColor(p.area)}1a;border:1px solid ${areaColor(p.area)}33;padding:1px 7px;border-radius:999px;margin-left:6px;white-space:nowrap;">${p.area}</span>`
        : '';
      return `<tr>
      <td><span class="num-badge">${i + 1}</span></td>
      <td style="font-weight:700;">${p.nombre}${areaBadge}</td>
      <td style="color:rgba(58,42,26,.58);font-size:13px;">${p.rol || '—'}</td>
      <td><span class="badge ${p.activo ? 'badge-green' : 'badge-red'}">${p.activo ? 'Activo' : 'Inactivo'}</span></td>
      <td class="no-print"><div style="display:flex;gap:4px;">
        <button class="btn btn-ghost" style="padding:4px 8px;font-size:11px;" onclick="Personal.openEdit('${p.id}')">✏</button>
        <button class="btn btn-danger" onclick="Personal.del('${p.id}')">✕</button>
      </div></td>
    </tr>`;
    }).join('');
  }

  // Muestra/oculta y llena el desplegable de área según la configuración
  function _applyAreaField(value) {
    const wrap = document.getElementById('mpAWrap');
    const sel = document.getElementById('mpA');
    const on = _usaAreas();
    if (wrap) wrap.style.display = on ? '' : 'none';
    if (sel) {
      sel.innerHTML = '<option value="">— Sin área —</option>' +
        AREAS.map(a => `<option${a === value ? ' selected' : ''}>${a}</option>`).join('');
      sel.value = value || '';
    }
  }

  function openNew() {
    document.getElementById('mpId').value = ''; document.getElementById('mpN').value = '';
    document.getElementById('mpR').value = '';
    document.getElementById('mpE').value = ''; document.getElementById('mpD').value = '';
    document.getElementById('mpAc').checked = true;
    _applyAreaField('');
    document.getElementById('mPT').textContent = 'Agregar Persona';
    document.getElementById('btnSP').textContent = 'Guardar';
    document.getElementById('mPers').style.display = '';
  }

  function openEdit(id) {
    const p = all.find(x => x.id === id); if (!p) return;
    document.getElementById('mpId').value = id; document.getElementById('mpN').value = p.nombre;
    document.getElementById('mpR').value = p.rol || '';
    document.getElementById('mpE').value = p.email || ''; document.getElementById('mpD').value = '';
    document.getElementById('mpAc').checked = p.activo;
    _applyAreaField(p.area && p.area !== 'GENERAL' ? p.area : '');
    document.getElementById('mPT').textContent = 'Editar Persona';
    document.getElementById('btnSP').textContent = 'Actualizar';
    document.getElementById('mPers').style.display = '';
  }

  function closeModal() { document.getElementById('mPers').style.display = 'none'; }

  async function save() {
    const id = document.getElementById('mpId').value;
    const nombre = document.getElementById('mpN').value.trim();
    const rol = document.getElementById('mpR').value.trim();
    const email = document.getElementById('mpE').value.trim().toLowerCase();
    const dni = document.getElementById('mpD').value.trim();
    const activo = document.getElementById('mpAc').checked;
    // Área: solo si la empresa usa áreas; si no, grupo único 'GENERAL'
    const area = _usaAreas() ? (document.getElementById('mpA').value || 'GENERAL') : 'GENERAL';
    if (!nombre) { showToast('El nombre es obligatorio', 'err'); return; }
    if ((email && !dni) || (!email && dni)) { showToast('Para el acceso a la app cargá email Y DNI', 'err'); return; }

    // Datos de la persona (el DNI NO se guarda acá: es la contraseña, va encriptado en el login)
    const fila = { nombre, rol, area, activo };
    if (email) fila.email = email;

    let err;
    if (id) ({ error: err } = await SB.from('personal').update(fila).eq('id', id));
    else ({ error: err } = await SB.from('personal').insert(fila));
    if (err) { showToast('Error: ' + err.message, 'err'); return; }

    // Crear / vincular el ACCESO a la app (login email + DNI) — solo si hay ambos
    if (email && dni) {
      const { data: res, error: e2 } = await SB.rpc('crear_empleado', {
        p_email: email, p_dni: dni, p_nombre: nombre, p_area: area, p_rol: rol || null
      });
      if (e2 || !res?.ok) showToast('Persona guardada, pero el acceso falló: ' + (res?.msg || e2?.message || ''), 'err');
      else showToast(id ? 'Actualizado · acceso ok' : 'Persona + acceso creados');
    } else {
      showToast(id ? 'Actualizado' : 'Persona agregada');
    }
    closeModal();

    // ── LOG DE AUDITORÍA ──
    if (!id) {
      await logActividad('personal_nuevo', area, nombre,
        `Nueva persona agregada: ${nombre} (${rol || 'sin rol'})`, { rol, activo });
    } else {
      await logActividad('personal_editado', area, nombre,
        `Datos editados: ${nombre}`, { rol, activo });
    }

    load();
  }

  async function del(id) {
    const p = all.find(x => x.id === id);
    if (!(await confirmDialog(`¿Eliminar a ${p?.nombre || 'esta persona'}?`))) return;
    const { error } = await SB.from('personal').delete().eq('id', id);
    if (error) { showToast('Error', 'err'); return; }
    showToast('Eliminado');

    if (p) {
      await logActividad('personal_eliminado', p.area, p.nombre,
        `Persona eliminada: ${p.nombre} (${p.rol || 'sin rol'})`, { rol: p.rol, activo: p.activo });
    }

    load();
  }

  return { load, render, openNew, openEdit, closeModal, save, del };
})();
