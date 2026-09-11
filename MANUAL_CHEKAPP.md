# Manual de uso — ChekApp

> **ChekApp** — Control de asistencia con Face ID, GPS y QR + gestión de personal.

---

## 1. ¿Qué es ChekApp?

**ChekApp** es una aplicación web (se instala en el celular como una app) para el **control de asistencia y la gestión del personal** de una empresa. Reúne en un solo lugar:

- **Fichaje** de entrada y salida con **reconocimiento facial (Face ID)**, **ubicación GPS** y **código QR** por sucursal.
- **Comunicación interna** (avisos con respuestas tipo chat).
- **Solicitudes** de licencias, vacaciones y certificados con aprobación.
- **Planificación de horarios** semanales.
- **Informes** de asistencia, puntualidad y horas trabajadas.
- **Roles y permisos** (Administrador, Líder de área, Empleado).

Es una **PWA** (Progressive Web App): funciona desde el navegador y se puede **instalar** en el celular como cualquier app, sin pasar por Play Store o App Store.

---

## 2. ¿Qué problemas resuelve?

- **Fichaje confiable, sin trampas.** La persona ficha con su **cara** (no se puede prestar una tarjeta o clave), y el sistema valida que esté **físicamente en el lugar** (GPS dentro del radio de la sucursal).
- **Fin de las planillas en papel.** Todo queda registrado con fecha y hora, disponible al instante.
- **Comunicación ordenada.** Los avisos llegan a quien corresponde (a todos, a un área o a personas puntuales), con **acuse de recibo** y posibilidad de **responder**.
- **Gestión de licencias y vacaciones.** El empleado hace la solicitud desde el celular, adjunta el certificado, y el responsable aprueba o rechaza dejando registro.
- **Control de horarios.** Se planifica el horario semanal por área y el sistema compara lo **planificado vs. lo real** (tardanzas, horas extra).
- **Visibilidad para la dirección.** Informes y tableros con puntualidad, horas, tardanzas y el detalle día por día, descargable a Excel.

---

## 3. Objetivo del sistema

Centralizar en una sola herramienta, simple y accesible desde el celular, **todo el ciclo de asistencia y gestión de personal**: desde que la persona ficha su entrada, pasando por la comunicación y las solicitudes, hasta los informes para la toma de decisiones — de forma **transparente, verificable y sin costos mensuales elevados**.

---

## 4. Cómo se descarga / instala la app

ChekApp se usa desde el navegador entrando a la **dirección web de tu empresa** (por ejemplo, `https://tuempresa.ejemplo.com`). Para tenerla como una app en la pantalla de inicio:

### En Android (Chrome)
1. Abrí **Chrome** y entrá a la dirección de la empresa.
2. Tocá el menú **⋮** (arriba a la derecha).
3. Elegí **"Instalar aplicación"** o **"Agregar a pantalla de inicio"**.
4. Confirmá. Aparece el ícono de **ChekApp** en tu teléfono.

### En iPhone / iPad (Safari)
1. Abrí **Safari** (tiene que ser Safari, no Chrome) y entrá a la dirección.
2. Tocá el botón **Compartir** (el cuadradito con la flecha hacia arriba).
3. Elegí **"Agregar a inicio"**.
4. Confirmá. Aparece el ícono de **ChekApp**.

> **Importante en iPhone:** para recibir **notificaciones** hay que abrir la app **desde el ícono instalado** (no desde Safari). Es un requisito de Apple.

### Activar las notificaciones (recomendado)
1. Entrá a la app e iniciá sesión.
2. Tocá la **campana** 🔔 (arriba a la derecha).
3. Tocá **"Activar alertas en este dispositivo"** y **Permitir**.
4. Debe quedar en verde **"✓ Alertas activas"**.

*(Si el teléfono es de gama baja o tiene ahorro de batería agresivo, conviene permitir a la app las notificaciones y la "actividad en segundo plano" en los ajustes del teléfono.)*

---

## 5. Ingreso (todos los usuarios)

- Todos entran con **Email** + **Contraseña** que les carga el Administrador.
- Si olvidan la contraseña, el Administrador la puede volver a generar desde **Personal**.
- Cada uno puede cambiar su propia contraseña desde el menú **"Cambiar contraseña"**.

Hay **tres roles**:

| Rol | Quién es | Qué hace |
|-----|----------|----------|
| **Administrador** | Dueño/RRHH | Configura todo, ve todo, aprueba solicitudes, informes. |
| **Líder** | Encargado de un área | Gestiona su área (horarios, solicitudes, avisos, informes) según permisos. **También ficha** como cualquier empleado. |
| **Empleado** | Personal en general | Ficha, recibe avisos, hace solicitudes. |

---

## 6. Manual del EMPLEADO

### 6.1 Fichar entrada y salida
1. Entrá a la app → **Fichar**.
2. La **primera vez** aparece el consentimiento del **reconocimiento facial**: leelo y tocá **"Acepto"** (queda registrada la fecha y hora). *No se guardan fotos, solo un código matemático de tu rostro.*
3. El sistema toma tu **ubicación GPS** (dá permiso de ubicación) y verifica que estés dentro del radio de una **sucursal** habilitada.
4. Se enciende la **cámara** para verificar tu identidad con la cara.
5. Al validarse, queda registrada tu **entrada** (o **salida**, según corresponda) con fecha y hora.

**Fichaje por QR (modo kiosco):** si tu empresa usa un **QR pegado en la sucursal**, escaneás el QR con la cámara del teléfono y se abre directo la pantalla de fichar (sin ver el resto del menú). Igual valida tu cara y ubicación.

> Si el GPS marca "ubicación inválida", asegurate de estar **dentro del local**, con el GPS del teléfono encendido y buena señal (mejor a cielo abierto o cerca de una ventana).

### 6.2 Avisos
1. Entrá a **Avisos**.
2. Los avisos **sin leer** aparecen destacados con un puntito.
3. Al tocar un aviso, se te pide **confirmar la recepción** ("Abrir y confirmar recepción"). Al confirmar, la empresa registra que **lo recibiste**.
4. Podés **responder** el aviso: se abre un chat entre vos y la administración. Escribís tu respuesta y tocás **Enviar**. Si te contestan, te llega una **notificación** y lo ves en el mismo chat.

### 6.3 Solicitudes (licencias, vacaciones, certificados)
1. Entrá a **Solicitudes** → **Nueva**.
2. Elegí el **Tipo**: Licencia, Vacaciones, Certificado médico u Otro.
3. Completá **Desde / Hasta** (si corresponde) y el **Motivo / detalle**.
4. Si es un certificado, adjuntá el archivo (**PDF, JPG o PNG**, hasta 8 MB).
5. Si tu área tiene un **líder** habilitado para recibir solicitudes, vas a ver la opción **"Enviársela también a mi líder"** (la administración **siempre** la recibe).
6. Tocá **Enviar solicitud**.
7. Podés seguir el **estado**: Pendiente, Aprobada o Rechazada. Cuando la resuelven, te llega una **notificación** y podés ver el comentario en el detalle.

### 6.4 Inicio (pantalla principal)
- Muestra un panel **"Sin leer"** con las novedades (respuestas de la administración, solicitudes resueltas, etc.). Tocás una y te lleva al lugar.
- Accesos rápidos a Fichar, Avisos y Solicitudes.

### 6.5 Cambiar contraseña
- Menú → **"Cambiar contraseña"** → ponés la nueva y confirmás.

---

## 7. Manual del LÍDER

El líder es **una persona normal del sistema** (ficha, aparece en el personal, entra con su email y contraseña como todos). Además, tiene el rol de **líder de una o más áreas**, con los **permisos** que le habilite el Administrador.

Al iniciar sesión, además de lo del empleado (Fichar, Avisos, Solicitudes propias), le aparece en el menú la sección **"Mi equipo"**.

### 7.1 Mi equipo
Arriba muestra el **área** que está gestionando (si tiene varias, puede cambiarla con un selector). Abajo, **pestañas** según los permisos que le dieron:

- **Horarios** — carga y modifica los horarios semanales del personal **de su área**:
  1. Elegís la semana (botones "Esta semana" / "Siguiente" o las flechas).
  2. Completás los horarios de cada persona.
  3. Podés **"Copiar semana anterior"** para no cargar todo de nuevo.
  4. Tocás **"Guardar horarios"**.

- **Solicitudes** — recibe las solicitudes que su gente le dirigió:
  1. Ve la lista (las pendientes primero).
  2. Toca una para ver el detalle (tipo, fechas, motivo).
  3. Puede **Aprobar**, **Rechazar** o dejar un **Comentario**.
  4. *(El certificado adjunto lo ve solo la administración, por privacidad.)*

- **Avisos** — envía avisos a los miembros de su área:
  1. Escribe **Título** y **Mensaje** → **Publicar aviso**.
  2. El aviso les llega a los empleados del área **y también al Administrador** (para que esté al tanto).
  3. Puede ver las **respuestas** de su gente en cada aviso.

- **Informes** — ve los informes **de su área**: KPIs (registros, personas, puntualidad, tardanza, horas) y la tabla por persona.

> Un líder **no puede** ver ni gestionar áreas que no tiene asignadas. Todo lo que hace queda acotado a su(s) área(s).

---

## 8. Manual del ADMINISTRADOR

El Administrador ve y controla **todo el sistema**. En el menú tiene: Inicio, Fichar, Avisos, Solicitudes, **Registros**, **Personal**, **Horarios**, **Informes** y **Configuración**.

### 8.1 Configuración (hacer esto primero)
Entrá a **Configuración**:

- **Funciones:**
  - **Usar áreas** → activar si querés agrupar al personal por áreas (ej: Barra, Cocina, Desarrollo). Apagado = un solo grupo.
  - **Usar líderes** → activar si vas a tener líderes de área. Al activarlo, en **Personal** aparece la opción "Es líder".
- **Áreas:** creá las áreas de la empresa (Agregar, editar ✎, eliminar ✕).
- **Plantillas de horario:** horarios reutilizables (ej: "Corrido 09→18", "Cortado 09→13 / 17→21") para cargar rápido en Horarios.
- **Sucursales:**
  - Definí la **URL base** (la dirección donde publicás la app) — se usa para armar los QR.
  - **Agregar sucursal:** nombre, dirección, y la **ubicación GPS** (con "Usar mi ubicación" parado dentro del local, o pegando las coordenadas de Google Maps), el **radio** (metros permitidos alrededor) y la **precisión máxima**.
  - **Ver QR:** genera el QR de esa sucursal para imprimir y pegar; el empleado lo escanea para fichar.

### 8.2 Personal
- **Agregar** persona: Nombre, Rol/puesto, Área, y (opcional) **Email + Contraseña** para que pueda entrar a la app.
- **Marcar como líder** (si está activado "Usar líderes"): al editar una persona, tildá **"Es líder"**, elegí las **áreas a cargo** y los **permisos** (Horarios, Solicitudes, Avisos, Informes). *Un líder necesita email y contraseña para poder ingresar.*
- **Importar CSV / Excel:** para cargar muchas personas de una vez. Descargás la plantilla, la completás y la subís (acepta `.xlsx` o `.csv`). Columnas: Nombre (obligatorio), Rol, Email, Contraseña y Área.
- **Editar** ✎ / **Eliminar** ✕ personas. Para reactivar el acceso o cambiar la contraseña de alguien, editás su ficha y volvés a poner Email + Contraseña.

### 8.3 Horarios
- Planificación **semanal por área**: cargás los turnos de cada persona por día.
- Herramientas: **plantillas**, **copiar semana anterior**, navegación entre semanas, exportar.
- Lo cargado acá es lo que después el informe compara contra el fichaje real (para calcular tardanzas y horas extra).

### 8.4 Avisos
- **Nuevo aviso:** Título + Mensaje, y elegís a quién:
  - **Todos** · **Un área** · **Líderes** (a todos los líderes) · **Personas** (elegís una o varias).
- En cada aviso podés:
  - Ver **quiénes recibieron** (acuse de recibo, con fecha y hora).
  - Entrar al aviso (tipo chat) y ver/responder las **respuestas** de cada persona (conversación privada admin ↔ cada empleado).

### 8.5 Solicitudes
- El Administrador **recibe todas** las solicitudes (aunque el empleado también se la haya mandado al líder).
- En el detalle: ve el tipo, fechas, motivo y el **adjunto** (certificado). Puede **Aprobar** / **Rechazar** y dejar un **comentario**. Al resolver, al empleado le llega la notificación.
- *El Administrador no crea solicitudes (es quien las aprueba).*

### 8.6 Registros
- Historial de todos los **fichajes** (quién, cuándo, dónde). Útil para auditoría.

### 8.7 Informes / Tablero
- **Filtros:** período (semana, mes, etc.), área y persona.
- **KPIs:** registros, personas, tardanza promedio, puntuales, tardes, horas promedio, con extra.
- **Gráficos:** registros por área, % de puntualidad por área, registros por día.
- **Tops:** top de tardanzas y top de horas extra.
- **Tabla por persona:** registros, horas, % de puntualidad y tardanza promedio.
- **Detalle por día (planificado vs. real):** fecha, horario planificado, **entrada y salida reales**, diferencias (tardanza, horas extra, si se fue antes) y **Estado** (Puntual / Tarde / Se fue antes / Licencia / etc.).
  - Botón **"Descargar Excel"**: baja todo el detalle del filtro actual a un archivo `.xlsx`.

### 8.8 Notificaciones
- La **campana** 🔔 muestra las novedades en tiempo real (nuevas solicitudes, respuestas, etc.).
- Con las **alertas activadas**, también llegan como **notificación push** al celular (incluso con la app cerrada).

---

## 9. Glosario rápido

- **Fichar:** registrar la entrada o la salida.
- **Face ID / reconocimiento facial:** verificación de identidad con la cara (no guarda fotos).
- **Sucursal:** lugar físico habilitado para fichar (con ubicación y radio).
- **Área:** agrupación del personal (Cocina, Barra, etc.).
- **Líder:** encargado de un área con permisos delegados.
- **Aviso:** comunicado de la empresa/líder hacia el personal.
- **Solicitud:** pedido del empleado (licencia, vacaciones, certificado) que alguien aprueba.
- **Acuse de recibo:** registro de que la persona recibió/leyó un aviso.
- **Puntualidad (Punt.):** % de veces que la persona llegó a horario respecto de lo planificado.
- **PWA:** app web que se instala en el celular como una aplicación.

---

## 10. Preguntas frecuentes

**¿Necesito bajar la app de Play Store / App Store?**
No. Se entra por el navegador y se **instala desde ahí** (ver punto 4).

**No me llega la notificación al celular.**
Verificá que activaste las **alertas** (campana → activar), que permitiste notificaciones a la app en los ajustes del teléfono, y que la abriste **desde el ícono instalado**. En todo caso, las novedades siempre están en la campana 🔔 y en el panel **"Sin leer"** del Inicio.

**No puedo fichar: dice ubicación inválida.**
Tenés que estar **dentro del local** (dentro del radio de la sucursal), con el **GPS encendido** y buena señal.

**Soy líder, ¿también tengo que fichar?**
Sí. El líder es una persona más del sistema: ficha igual que todos, y además gestiona su área desde **"Mi equipo"**.

**¿Quién aprueba las solicitudes?**
El **Administrador** siempre. Y además el **Líder** del área, si el empleado se la envió y ese líder tiene el permiso de solicitudes.
