# Reconocimiento facial en el fichaje — Fase 1 (MVP)

Rama: **`Biometrico`**. El reloj de `main` no se toca hasta que pruebes y apruebes esto.

## Qué hace

Antes de fichar (entrada o salida), la app pide una **selfie** y verifica que sea el empleado:

- **La primera vez** que un empleado toca *Fichar*, la app le pide **registrar su cara** (una sola vez). Se guarda un *vector facial* (128 números que describen la cara) en Supabase — **no se guarda ninguna foto**.
- **De ahí en más**, cada fichaje abre la cámara, saca una selfie, la compara contra el vector guardado y solo continúa (GPS + registro) si **coincide**.

La comparación corre en el celular con **face-api.js** (gratis, sin servidor extra). El GPS y el login siguen funcionando igual que antes.

**Consentimiento (Ley 25.326):** la 1ª vez, antes de abrir la cámara, aparece una pantalla explicando qué se guarda y para qué. El empleado debe tocar **Acepto** para continuar; se guarda en la base la **fecha/hora** y la **versión del texto** que aceptó. Si toca *Ahora no*, no se registra la cara y no puede fichar con este método.

## Archivos que se agregaron / cambiaron

| Archivo | Qué es |
|---|---|
| `sql/fase4_biometria.sql` | Tabla `biometria_facial` + funciones `guardar_biometria()` y `mi_biometria()`. **Hay que correrlo en Supabase.** |
| `js/facial.js` | Módulo de reconocimiento facial (carga la librería, abre la cámara, captura y compara). |
| `fichar.html` | Se integró la "puerta facial" antes del GPS. |
| `sw.js` | Se subió `CACHE_VERSION` a 3 (para que los celulares bajen la versión nueva). |

## Cómo probarlo

### 1) Correr el SQL en Supabase (una vez)
Supabase → **SQL Editor** → **New query** → pegá todo `sql/fase4_biometria.sql` → **Run**.
Es idempotente (se puede correr de nuevo sin romper nada).

### 2) Abrir la app
La cámara del navegador **solo funciona en HTTPS o en `localhost`**. Para probar en la compu:

```bash
# parada en la carpeta del proyecto:
python -m http.server 5500
# o con Node:  npx serve .
```

Abrí `http://localhost:5500/fichar.html`.

> **En el celular** necesitás HTTPS. Lo más práctico para testear en teléfono es publicar la rama `Biometrico` en un entorno de prueba (ej. GitHub Pages de una rama, Netlify, Vercel) — **NO** el sitio de producción — o usar un túnel HTTPS (ngrok / cloudflared) apuntando al server local.

### 3) Probar el flujo
1. Ingresá con un empleado de prueba (email + DNI).
2. Tocá **Fichar** → te pide **Registrar tu cara** (1ª vez). Acomodá la cara en el círculo y tocá *Registrar*.
3. Se guarda y sigue el fichaje normal (GPS + registro).
4. Volvé a tocar **Fichar**: ahora abre la cámara para **Verificar**. Si sos vos → ficha. Si ponés otra cara → *"No te reconocimos"* y no ficha.

### 4) Verificar en la base
```sql
select user_id, personal_id, modelo,
       consentimiento_ts, consentimiento_version, updated_at
  from public.biometria_facial;
```
`consentimiento_ts` es la constancia de cuándo aceptó el empleado. Si querés cambiar el texto del consentimiento más adelante, subí `_CONSENT_VER` en `fichar.html` (ej. `'v2'`) y así queda registrado quién aceptó qué versión.

## Ajustes

- **Umbral de coincidencia** (`js/facial.js` → `THRESHOLD`, por defecto `0.5`):
  - Más **bajo** (ej. 0.45) = más estricto (menos que alguien pase por otro, pero puede rechazar al titular con mala luz).
  - Más **alto** (ej. 0.55) = más permisivo.
  - Se puede sobreescribir sin tocar el código con `window.FACIAL_CONFIG = { threshold: 0.5 }` antes de cargar `facial.js`.

- **Modelos desde CDN**: hoy `js/facial.js` baja la librería y los modelos (~6 MB) desde jsDelivr. Para producción conviene **auto-hostearlos** (descargar la carpeta `model` de `@vladmandic/face-api` al repo y apuntar `window.FACIAL_CONFIG.modelUrl` ahí) para no depender del CDN y que ande mejor con poca señal.

## Límites conocidos de este MVP (a tener en cuenta)

- **Sin liveness (anti-foto):** alguien podría, en teoría, mostrarle a la cámara **una foto** de un compañero. Combinado con el GPS y el login es un buen disuasivo, pero si necesitás bloquear esto del todo, es la **Fase 2** (pedir un parpadeo/giro).
- **La comparación corre en el navegador:** un empleado muy técnico podría intentar saltearla. Para máxima seguridad, mover la comparación al servidor es la **Fase 3**.
- **Necesita internet** (como el resto de la app) para bajar los modelos la primera vez y para hablar con Supabase.
- **Privacidad (Ley 25.326):** el dato biométrico es sensible. Ya se pide **consentimiento explícito** (con constancia en la base) y **no se guardan fotos**, solo el vector. Falta, si querés cerrar el círculo, un botón en el panel admin para **borrar** el registro facial de alguien que revoque el consentimiento (Fase 2).

## Cómo desactivarlo / volver atrás

Todo está aislado en la rama. `main` sigue intacto. Si querés quitar la biometría de esta rama, alcanza con sacar la "puerta facial" de `fichar.html` (la llamada a `_puertaFacial`) — el resto del fichaje queda igual.
