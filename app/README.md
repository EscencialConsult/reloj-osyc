# OSYC · Sistema integral (React + Vite + Supabase)

**Una sola aplicación** que va sumando módulos. Reemplaza gradualmente al sitio HTML,
usando la **misma base Supabase**. Rama: `react-rrhh`.

## Módulos (hoy)
- **Inicio**: tablero con los módulos como tarjetas. Sumar uno nuevo = una línea en `pages/Home.jsx`.
- **Fichar**: reloj de entrada/salida con **GPS + reconocimiento facial + consentimiento** (reusa `public/facial.js`, mismo motor que el reloj HTML, y las funciones `fichar` / `mi_biometria` / `guardar_biometria`).
- **Login** con email + DNI (reutiliza Supabase Auth).
- **Avisos**: el admin publica comunicados; el equipo los ve, con marca de *no leído* y contador.
- **Solicitudes**: licencia / vacaciones / certificado / otro, con **adjunto** (PDF/JPG/PNG), estados **Pendiente / Aprobado / Rechazado**, **hilo de comentarios**, y **aprobar/rechazar** para el admin.
- **Seguridad (RLS)**: cada empleado ve solo lo suyo; el admin ve todo; los adjuntos van a un bucket privado.

> El reloj HTML viejo (`fichar.html`, etc.) **queda intacto como respaldo**, accesible por su nombre
> directo, hasta validar que la versión integrada anda igual.

## Antes de correr: base de datos
En Supabase → SQL Editor → **Run** de [`../sql/fase5_avisos_solicitudes.sql`](../sql/fase5_avisos_solicitudes.sql).
Crea las tablas, las políticas de seguridad y el bucket `justificativos`. Es idempotente.

> Requiere que ya exista `public.es_admin()` (creada en la fase 3). Ya la tenés.

## Correr en desarrollo
```bash
cd app
npm install      # solo la primera vez
npm run dev      # abre http://localhost:5174/app/
```
La cámara/GPS no hacen falta acá; funciona en `localhost` sin HTTPS.

## Compilar para producción
```bash
cd app
npm run build    # genera app/dist/
```
El `dist/` es estático y se publica en la **raíz** del dominio (`base: '/'`). React pasa a ser
la app principal; los `.html` viejos quedan accesibles por su nombre directo como respaldo.

> Importante para el hosting: como es una SPA (una sola página), configurar el *fallback* a
> `index.html` para que rutas como `/fichar` o `/solicitudes/123` no den 404 al recargar
> (Netlify: `/* /index.html 200`; Vercel: rewrites a `/index.html`).

## Estructura
```
app/
  public/
    facial.js         # motor de reconocimiento facial (copia del reloj HTML)
  src/
    lib/
      supabase.js     # cliente (misma URL/anon key que el sitio actual)
      session.jsx     # sesión + perfil + si es admin (contexto global)
      facial.js       # cargador de public/facial.js
      geo.js          # mejor lectura de GPS
    components/
      Login.jsx  Layout.jsx  icons.jsx  ConsentModal.jsx
    pages/
      Home.jsx  Fichar.jsx  Avisos.jsx  Solicitudes.jsx  SolicitudDetalle.jsx
    App.jsx  main.jsx  index.css
```

### Agregar un módulo nuevo (patrón)
1. Crear `pages/MiModulo.jsx`.
2. Registrar la ruta en `App.jsx`.
3. Sumar la tarjeta en el catálogo `MODULOS` de `pages/Home.jsx` (y, si va, en la barra del `Layout.jsx`).

## Roles (v1)
- **Admin** (los de la tabla `admins`): publica avisos, ve todas las solicitudes y las aprueba/rechaza.
- **Empleado**: ve avisos, crea sus solicitudes y comenta.
- *Pendiente para v2:* que el **líder** del área apruebe (hoy aprueba el admin), y saldo de días de vacaciones.

## Cómo se conecta con el sitio actual
Nada se pisa: el reloj (`fichar.html`, `admin.html`, etc.) sigue igual. Cuando quieras, se agrega
un botón "Gestión" en el sitio actual que apunte a `/app/`. La migración del resto de pantallas a React
se hace de a poco, sin apagar nada.
