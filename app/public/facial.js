// ============================================================================
// js/facial.js — Reconocimiento facial en el navegador (OSYC) — Fase 1 (MVP)
// ----------------------------------------------------------------------------
// Usa face-api.js para convertir una cara en un "descriptor" (vector de 128
// números). No sube fotos: solo el vector. La comparación se hace acá, en el
// celular del empleado.
//
// API pública (global `Facial`):
//   await Facial.ready()                  → carga la librería + modelos (1 sola vez)
//   const r = await Facial.capture(opts)  → abre la cámara y devuelve { descriptor:[128] }
//                                           (rechaza con {code:'cancel'|'nocam'|'timeout'})
//   Facial.distance(a, b)                 → distancia euclídea entre dos vectores
//   Facial.match(a, b)                    → true si a y b son la misma persona
//   Facial.THRESHOLD                      → umbral de coincidencia (más bajo = más estricto)
//
// Config opcional (definir ANTES de cargar este archivo):
//   window.FACIAL_CONFIG = { libUrl, modelUrl, threshold }
//   Para producción conviene auto-hostear los modelos (ver README_biometria.md).
// ============================================================================
(function () {
  'use strict';

  var CFG = window.FACIAL_CONFIG || {};
  var LIB_URL   = CFG.libUrl   || 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js';
  var MODEL_URL = CFG.modelUrl || 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
  var THRESHOLD = typeof CFG.threshold === 'number' ? CFG.threshold : 0.5;

  var _loadPromise = null;   // promesa de carga (lib + modelos), se hace una sola vez

  // ── Cargar el <script> de face-api.js una sola vez ─────────────────────────
  function _loadScript(url) {
    return new Promise(function (resolve, reject) {
      if (window.faceapi) return resolve();
      var s = document.createElement('script');
      s.src = url; s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('No se pudo cargar face-api.js')); };
      document.head.appendChild(s);
    });
  }

  // ── Cargar librería + modelos (idempotente) ────────────────────────────────
  function ready() {
    if (_loadPromise) return _loadPromise;
    _loadPromise = _loadScript(LIB_URL).then(function () {
      var f = window.faceapi;
      if (!f) throw new Error('face-api.js no quedó disponible');
      return Promise.all([
        f.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        f.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        f.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
    }).catch(function (err) {
      _loadPromise = null;   // permitir reintento si falló la carga
      throw err;
    });
    return _loadPromise;
  }

  // ── Comparación ────────────────────────────────────────────────────────────
  function distance(a, b) {
    if (!a || !b || a.length !== b.length) return Infinity;
    var s = 0;
    for (var i = 0; i < a.length; i++) { var d = a[i] - b[i]; s += d * d; }
    return Math.sqrt(s);
  }
  function match(a, b) { return distance(a, b) <= THRESHOLD; }

  // ── Estilos del modal de cámara (se inyectan una vez) ──────────────────────
  function _injectStyle() {
    if (document.getElementById('facial-style')) return;
    var css = ''
      + '.fcm-ov{position:fixed;inset:0;z-index:10000;background:rgba(20,30,45,.92);'
      +   'display:flex;flex-direction:column;align-items:center;justify-content:center;'
      +   'padding:22px;backdrop-filter:blur(4px);animation:fcmFade .2s ease both;}'
      + '@keyframes fcmFade{from{opacity:0}to{opacity:1}}'
      + '.fcm-title{color:#fff;font-family:var(--font-title,inherit);font-weight:800;'
      +   'font-size:20px;text-align:center;margin-bottom:4px;}'
      + '.fcm-hint{color:#bcd0e6;font-size:13px;text-align:center;margin-bottom:16px;min-height:18px;}'
      + '.fcm-stage{position:relative;width:min(78vw,300px);height:min(78vw,300px);}'
      + '.fcm-video{width:100%;height:100%;object-fit:cover;border-radius:50%;'
      +   'transform:scaleX(-1);background:#0d1622;border:4px solid rgba(255,255,255,.25);}'
      + '.fcm-video.ok{border-color:#22c55e;}'
      + '.fcm-ring{position:absolute;inset:-4px;border-radius:50%;pointer-events:none;'
      +   'box-shadow:0 0 0 3px rgba(255,255,255,.06);}'
      + '.fcm-actions{display:flex;gap:12px;margin-top:22px;width:min(78vw,300px);}'
      + '.fcm-btn{flex:1;min-height:52px;border:none;border-radius:15px;font-size:16px;'
      +   'font-weight:800;cursor:pointer;font-family:var(--font-title,inherit);}'
      + '.fcm-cap{background:linear-gradient(135deg,#2c6eb4,#5a97d4);color:#fff;}'
      + '.fcm-cap:disabled{opacity:.5;cursor:default;}'
      + '.fcm-cancel{background:rgba(255,255,255,.14);color:#fff;}'
      + '.fcm-spin{display:inline-block;width:18px;height:18px;border:3px solid rgba(255,255,255,.4);'
      +   'border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;vertical-align:-3px;}';
    var st = document.createElement('style');
    st.id = 'facial-style'; st.textContent = css;
    document.head.appendChild(st);
  }

  // ── Abrir cámara, detectar y capturar el descriptor ────────────────────────
  // opts: { title, hint, captureLabel, timeoutMs }
  function capture(opts) {
    opts = opts || {};
    _injectStyle();

    return new Promise(function (resolve, reject) {
      var f = window.faceapi;
      var stream = null, rafTimer = null, closed = false;

      // ---- construir el modal ----
      var ov = document.createElement('div');
      ov.className = 'fcm-ov';
      ov.innerHTML =
        '<div class="fcm-title">' + _esc(opts.title || 'Verificá tu identidad') + '</div>' +
        '<div class="fcm-hint" id="fcmHint">Acomodá tu cara dentro del círculo…</div>' +
        '<div class="fcm-stage">' +
          '<video class="fcm-video" id="fcmVideo" autoplay playsinline muted></video>' +
          '<div class="fcm-ring"></div>' +
        '</div>' +
        '<div class="fcm-actions">' +
          '<button class="fcm-btn fcm-cancel" id="fcmCancel">Cancelar</button>' +
          '<button class="fcm-btn fcm-cap" id="fcmCap" disabled>' + _esc(opts.captureLabel || 'Capturar') + '</button>' +
        '</div>';
      document.body.appendChild(ov);

      var video  = ov.querySelector('#fcmVideo');
      var hintEl = ov.querySelector('#fcmHint');
      var capBtn = ov.querySelector('#fcmCap');

      function cleanup() {
        if (closed) return; closed = true;
        if (rafTimer) clearTimeout(rafTimer);
        if (stream) stream.getTracks().forEach(function (t) { try { t.stop(); } catch (_) {} });
        if (ov.parentNode) ov.parentNode.removeChild(ov);
      }
      function fail(code, msg) { cleanup(); reject({ code: code, msg: msg }); }

      ov.querySelector('#fcmCancel').onclick = function () { fail('cancel'); };

      // ---- pedir la cámara frontal ----
      var md = navigator.mediaDevices;
      if (!md || !md.getUserMedia) { fail('nocam', 'Tu dispositivo no permite usar la cámara.'); return; }
      md.getUserMedia({ video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } }, audio: false })
        .then(function (s) {
          stream = s; video.srcObject = s;
          video.onloadedmetadata = function () { video.play().then(loop).catch(loop); };
        })
        .catch(function (err) {
          var denied = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
          fail('nocam', denied
            ? 'Necesitás permitir el acceso a la cámara para fichar.'
            : 'No pudimos abrir la cámara. Cerrá otras apps que la estén usando y probá de nuevo.');
        });

      // ---- bucle liviano: detecta si hay una cara centrada ----
      var detOpts = new f.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
      function loop() {
        if (closed) return;
        f.detectSingleFace(video, detOpts).then(function (det) {
          if (closed) return;
          if (det && det.score > 0.55) {
            video.classList.add('ok');
            hintEl.textContent = 'Perfecto. Tocá "' + (opts.captureLabel || 'Capturar') + '".';
            capBtn.disabled = false;
          } else {
            video.classList.remove('ok');
            hintEl.textContent = 'Acomodá tu cara dentro del círculo…';
            capBtn.disabled = true;
          }
          rafTimer = setTimeout(loop, 350);
        }).catch(function () { rafTimer = setTimeout(loop, 500); });
      }

      // ---- capturar: descriptor de 128 números ----
      capBtn.onclick = function () {
        if (closed) return;
        capBtn.disabled = true;
        capBtn.innerHTML = '<span class="fcm-spin"></span>';
        hintEl.textContent = 'Procesando…';
        f.detectSingleFace(video, detOpts)
          .withFaceLandmarks()
          .withFaceDescriptor()
          .then(function (res) {
            if (closed) return;
            if (!res || !res.descriptor) {
              hintEl.textContent = 'No detectamos bien tu cara. Buscá buena luz y reintentá.';
              capBtn.disabled = false;
              capBtn.textContent = opts.captureLabel || 'Capturar';
              return;
            }
            var descriptor = Array.prototype.slice.call(res.descriptor); // Float32Array → array
            cleanup();
            resolve({ descriptor: descriptor });
          })
          .catch(function () {
            if (closed) return;
            hintEl.textContent = 'Hubo un problema al leer la cara. Reintentá.';
            capBtn.disabled = false;
            capBtn.textContent = opts.captureLabel || 'Capturar';
          });
      };
    });
  }

  function _esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  window.Facial = {
    ready: ready,
    capture: capture,
    distance: distance,
    match: match,
    THRESHOLD: THRESHOLD
  };
})();
