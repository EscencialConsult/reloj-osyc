# Notificaciones push — Guía de configuración (segura)

> IMPORTANTE (seguridad): **ninguna clave privada ni secreto va en el repo.**
> La clave **pública** VAPID sí va en `app/src/config.js` (es pública por diseño).
> La clave **privada** VAPID y el `WEBHOOK_SECRET` van **solo** en los secretos de
> Supabase. Si alguna vez estuvieron en un archivo, hay que **rotarlas**.

Todo el código ya está. Faltan unos pasos en el **panel de Supabase** de la empresa.

## Paso 0 — SQL base
Correr `sql/fase9_push.sql` (tabla `push_subscriptions`).

## Paso 1 — Generar las claves VAPID (propias de cada empresa)
Generá un par de claves nuevo. Opciones:
- `npx web-push generate-vapid-keys`, o
- desde una consola Node (P-256), o cualquier generador VAPID confiable.

Guardá la **pública** para el paso 3 y la **privada** para el paso 2. **No las pegues en ningún archivo del repo.**

## Paso 2 — Desplegar la Edge Function + secretos
1. Supabase → **Edge Functions** → desplegar `enviar-push` (contenido de
   `supabase/functions/enviar-push/index.ts`). Podés dejar **Verify JWT off**:
   la función ahora **exige un secreto compartido** (`WEBHOOK_SECRET`) y **rechaza**
   cualquier llamada sin él.
2. En **Secrets** cargá:
   - `VAPID_PUBLIC` = tu clave pública nueva
   - `VAPID_PRIVATE` = tu clave privada nueva  (¡solo acá!)
   - `VAPID_SUBJECT` = `mailto:tu-email@empresa.com`
   - `WEBHOOK_SECRET` = un texto **largo y aleatorio** (ej. 32+ caracteres)

## Paso 3 — Config de la app + disparador seguro
1. Poné la **clave pública** en `app/src/config.js` (`VAPID_PUBLIC`).
2. Correr `sql/fase19_push_seguro.sql` (crea la tabla privada `app_secrets` y el
   trigger que llama a la función mandando el secreto).
3. Cargar los valores en `app_secrets` **una sola vez** (esto **no se commitea**):
   ```sql
   insert into public.app_secrets (clave, valor) values
     ('push_url',       'https://<REF>.supabase.co/functions/v1/enviar-push'),
     ('push_anon',      '<ANON KEY del proyecto>'),
     ('webhook_secret', '<EL MISMO WEBHOOK_SECRET del paso 2>')
   on conflict (clave) do update set valor = excluded.valor;
   ```

## Paso 4 — Probar
Como empleado, activar alertas (campana). Cerrar la app. Generar un aviso/solicitud.
Debe llegar la notificación. Si no llega, revisar en Supabase:
`select id, status_code, content, created from net._http_response order by created desc limit 10;`

## Rotación (si un secreto se filtró)
1. Generar nuevas claves VAPID → actualizar `config.js` (pública) y el secret
   `VAPID_PRIVATE` (privada). Los dispositivos deben **volver a activar** las alertas.
2. Cambiar `WEBHOOK_SECRET` (secret de la función) y el valor en `app_secrets`.
3. Nunca dejar los valores viejos en archivos ni en el historial.
