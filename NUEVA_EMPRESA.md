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
   - Al final del archivo, **descomentá y cambiá el email y contraseña del admin** antes de correrlo. NO dejar valores por defecto.
2. `sql/fase2_fichar.sql`  (fichar con validación de GPS — H-04)
3. `sql/fase4_biometria.sql`
4. `sql/fase5_avisos_solicitudes.sql`
5. `sql/fase6_avisos_destinatarios.sql`
6. `sql/fase7_notificaciones.sql`
7. `sql/fase8_recibos.sql`
8. `sql/fase9_push.sql`
9. `sql/fase11_notif_texto.sql`
10. `sql/fase12_avisos_admin.sql`
11. `sql/fase13_notif_solicitud_nueva.sql`
12. `sql/fase15_lider_como_persona.sql`  (rol de líder; reemplaza a `fase14`)
13. `sql/fase16_avisos_respuestas.sql`
14. `sql/fase17_avisos_chat.sql`
15. `sql/fase18_aviso_lider_notifica_admin.sql`
16. `sql/fase19_push_seguro.sql`  (push seguro; **reemplaza a `fase10`** — después cargá `app_secrets`, ver `README_push.md`)
17. `sql/fase22_verificar_rostro.sql`  (verificación facial del lado del servidor)
18. `sql/fase20_rls.sql`  ← **ÚLTIMO Y OBLIGATORIO (seguridad): activa RLS por rol. NO omitir.**

> ⚠️ **`sql/fix_permisos_403.sql` es LEGACY: APAGA la seguridad (RLS). No correrlo.** Solo existe como rollback de emergencia. Si alguna vez lo corrés, volvé a correr `fase20_rls.sql` después.
> ⚠️ `fase10_push_trigger.sql` quedó reemplazado por `fase19_push_seguro.sql` — no correr `fase10`.

## 4) Configurar la app (en la rama de la empresa)
Editá **`app/src/config.js`**:
- `EMPRESA` = nombre corto de la empresa.
- `SUPABASE_URL` y `SUPABASE_ANON_KEY` = los del proyecto nuevo (paso 2).
- `VAPID_PUBLIC` = clave pública VAPID de esta empresa (ver paso 6).

Reemplazá el **logo de la empresa** (se ve DENTRO de la app: login, barra lateral):
- `app/public/logo.png` (logo de la empresa)
- `app/public/icon-192.png` y `app/public/icon-512.png` (logo cuadrado de la empresa; se usa en el ícono de las notificaciones)
- `app/public/img/favicon.png`
- Regenerá `app/public/badge.png` = el logo de la empresa en blanco/transparente (ícono chico del push).

**NO toques** `app/public/chekapp-192.png` / `chekapp-512.png`: es el **ícono FIJO de ChekApp** (el espiral) con el que se **instala** la app en el celular. Es el mismo para todas las empresas (identidad del producto). Adentro manda `logo.png` (la empresa).

Cambiá 2 textos (dejá el nombre de instalación en "ChekApp"):
- `app/index.html` → `<title>` (podés poner la empresa). El `apple-mobile-web-app-title` va **"ChekApp"**.
- `app/public/manifest.webmanifest` → `name`/`short_name` = **"ChekApp"** (fijo); `theme_color`/`background_color` con el color de la empresa.

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
