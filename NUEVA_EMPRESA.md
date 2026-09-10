# Duplicar el sistema para una empresa nueva

Cada empresa = **su propio proyecto Supabase (gratis) + su propio sitio Netlify (gratis) + su rama de git**.
Costo mensual para el cliente: **$0** (mientras esté en el plan gratis).

Con la config centralizada, por empresa solo cambiás: **`app/src/config.js` + el logo + 2 textos**.

---

## 1) Crear la rama de la empresa
```bash
git checkout main
git checkout -b <empresa>        # ej: one-escencial
git push -u origin <empresa>
```
Los arreglos futuros se pasan con: `git checkout <empresa> && git merge main`.

## 2) Crear el proyecto Supabase (idealmente en la cuenta del cliente)
- Nuevo proyecto en supabase.com → anotá **URL** y **anon key** (Settings → API).

## 3) Correr los SQL en la base nueva (SQL Editor → Run, EN ESTE ORDEN)
1. `sql/setup_empresa_nueva.sql`  ← base completa (tablas, fichar, admin, permisos)
   - Al final del archivo, **cambiá el email y contraseña del admin** antes de correrlo.
2. `sql/fase4_biometria.sql`
3. `sql/fase5_avisos_solicitudes.sql`
4. `sql/fase6_avisos_destinatarios.sql`
5. `sql/fase7_notificaciones.sql`
6. `sql/fase8_recibos.sql`
7. `sql/fase9_push.sql`
8. `sql/fase11_notif_texto.sql`
9. `sql/fase12_avisos_admin.sql`
10. `sql/fase13_notif_solicitud_nueva.sql`
11. `sql/fase10_push_trigger.sql`  ← **editar primero**: poné la URL del proyecto nuevo
    (`https://<REF>.supabase.co/functions/v1/enviar-push`) y su **anon key** en el header.
12. `sql/fase15_lider_como_persona.sql`  (rol de líder sobre la persona + ruteo de solicitudes)
    · Reemplaza a `fase14` (líder ya NO es tabla aparte). Si ya corriste fase14, correr fase15 igual encima.

## 4) Configurar la app (en la rama de la empresa)
Editá **`app/src/config.js`**:
- `EMPRESA` = nombre corto de la empresa.
- `SUPABASE_URL` y `SUPABASE_ANON_KEY` = los del proyecto nuevo (paso 2).
- `VAPID_PUBLIC` = clave pública VAPID de esta empresa (ver paso 6).

Reemplazá el **logo/ícono** (misma medida, mismos nombres):
- `app/public/logo.png` (logo horizontal)
- `app/public/icon-192.png` y `app/public/icon-512.png` (ícono cuadrado)
- `app/public/img/favicon.png`

Cambiá 2 textos:
- `app/index.html` → `<title>` y `apple-mobile-web-app-title`.
- `app/public/manifest.webmanifest` → `name` y `short_name`.

## 5) Publicar en Netlify
- Nuevo sitio en Netlify → conectar el repo → **Branch to deploy = `<empresa>`**.
- Netlify detecta `netlify.toml` (base=app, publish=dist). Deploy.
- Asignar el dominio/subdominio de esa empresa.

## 6) Notificaciones push (opcional; se puede sumar después)
- Generar claves VAPID: `npx web-push generate-vapid-keys`.
- Pública → `config.js` (paso 4). Privada → secret en Supabase.
- En Supabase: desplegar la Edge Function `supabase/functions/enviar-push`, cargar secrets
  (`VAPID_PUBLIC`, `VAPID_PRIVATE`, `VAPID_SUBJECT`), y correr `fase10` (paso 3.11).
  Ver detalle en `README_push.md`.

## 7) Dejar lista la app (como admin)
- Entrar → **Configuración**: activar áreas/líderes si corresponde, cargar áreas, plantillas y **sucursales**.
- Poner la **URL base** = el dominio de esa empresa y **generar/imprimir los QR**.
- Cargar el **personal** (individual o por Excel/CSV en Personal → Importar).

Listo: empresa nueva funcionando, aislada, $0/mes.
