// js/features.js — Interruptores de funciones opcionales (áreas, líderes)
// Se guardan en la tabla configuracion (id='features').
const Features = (() => {
  let flags = { usa_areas: false, usa_lideres: false };

  async function load() {
    try {
      const { data } = await SB.from('configuracion').select('valor').eq('id', 'features').maybeSingle();
      if (data?.valor) flags = { ...flags, ...data.valor };
    } catch (_) {}
    return flags;
  }

  function get() { return flags; }

  async function save(patch) {
    flags = { ...flags, ...patch };
    const { error } = await SB.from('configuracion').upsert({ id: 'features', valor: flags });
    return !error;
  }

  // ── Áreas definidas por la empresa (config id='areas') ──
  async function loadAreas() {
    let arr = [];
    try {
      const { data } = await SB.from('configuracion').select('valor').eq('id', 'areas').maybeSingle();
      if (data?.valor && Array.isArray(data.valor)) arr = data.valor;
    } catch (_) {}
    if (typeof setAreas === 'function') setAreas(arr);
    return arr;
  }
  async function saveAreas(arr) {
    if (typeof setAreas === 'function') setAreas(arr);
    const { error } = await SB.from('configuracion').upsert({ id: 'areas', valor: arr });
    return !error;
  }

  // ── Plantillas de horario (config id='plantillas') ──
  async function loadPlantillas() {
    let arr = [];
    try {
      const { data } = await SB.from('configuracion').select('valor').eq('id', 'plantillas').maybeSingle();
      if (data?.valor && Array.isArray(data.valor)) arr = data.valor;
    } catch (_) {}
    if (typeof setPlantillas === 'function') setPlantillas(arr);
    return arr;
  }
  async function savePlantillas(arr) {
    if (typeof setPlantillas === 'function') setPlantillas(arr);
    const { error } = await SB.from('configuracion').upsert({ id: 'plantillas', valor: arr });
    return !error;
  }

  return { load, get, save, loadAreas, saveAreas, loadPlantillas, savePlantillas };
})();
