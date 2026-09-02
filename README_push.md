# Fase 2 — Notificaciones push · GUÍA FÁCIL (solo con clicks, sin terminal)

Ya está todo el código. Faltan 4 cosas en el **panel web de Supabase**. Seguí en orden.

Las 2 claves VAPID ya están generadas:
- **Pública** (ya está en el código, no la tocás): `BPzqOcIRrdhP_nrJnSCsUTbVnE9-jo6zXGKp5VJTKDUaieJnIuvSLXnzArv31Kja-ahbZab1q69u41vCv1qLmAQ`
- **Privada** (la pegás en el paso 2): `Hlv83tkx1IeXdJgDNrRYW3gJH2dgxN24G5XI3TkG5sc`

---

## ✅ Paso 0 — SQL (ya lo hiciste)
`sql/fase9_push.sql` → Run. Listo.

## Paso 1 — Crear la función en Supabase (desde el navegador)
1. En Supabase, menú izquierdo → **Edge Functions**.
2. Botón **Deploy a new function** → elegí la opción **"Via editor"** (editar en el navegador).
3. Nombre: **`enviar-push`**
4. **Borrá** el código de ejemplo y **pegá TODO** el contenido del archivo
   `supabase/functions/enviar-push/index.ts` (de este proyecto).
5. Si ves una opción **"Verify JWT"** / "Enforce JWT" → **DESACTIVALA** (off).
6. **Deploy**.

## Paso 2 — Cargar las claves (secrets)
1. En **Edge Functions** → pestaña **Secrets** (o Project Settings → Edge Functions → Secrets).
2. Agregá estos 3 (nombre = valor):
   - `VAPID_PUBLIC` = `BPzqOcIRrdhP_nrJnSCsUTbVnE9-jo6zXGKp5VJTKDUaieJnIuvSLXnzArv31Kja-ahbZab1q69u41vCv1qLmAQ`
   - `VAPID_PRIVATE` = `Hlv83tkx1IeXdJgDNrRYW3gJH2dgxN24G5XI3TkG5sc`
   - `VAPID_SUBJECT` = `mailto:gestion@osyc.com`  (poné tu email)
3. Guardar.

## Paso 3 — Conectar el disparador (con SQL, más fácil)
Supabase movió la opción "Webhooks" del panel. En vez de buscarla, corré un SQL:
1. **SQL Editor → New query**.
2. Pegá TODO el contenido de `sql/fase10_push_trigger.sql`.
3. **Run**.

Eso crea un trigger que llama a la función `enviar-push` cada vez que se crea una
notificación (hace lo mismo que el webhook).

## Paso 4 — Subir el front y probar
1. Subís los cambios del código (git add/commit/push a `react-rrhh`); Netlify redepliega solo.
2. En el celular, entrás como empleado → tocás la **campana** → **"Activar alertas en este celular"** → **Permitir**.
3. **Cerrás la app.**
4. Desde admin, publicás un aviso para esa persona.
5. Llega la **notificación al celular** con la app cerrada. 🎉

---

### Notas
- **Android:** anda directo. **iPhone (iOS 16.4+):** el empleado primero debe **"Agregar a pantalla de inicio"** y abrir desde ese ícono; recién ahí iOS deja activar el push.
- **Íconos (opcional):** subí `icon-192.png` y `icon-512.png` a `app/public/` para que la notificación y la app instalada tengan logo. Sin ellos anda igual.
- **¿No querés usar el editor web?** Se puede por terminal con `npx supabase functions deploy enviar-push --no-verify-jwt`, pero el editor web es más simple.
