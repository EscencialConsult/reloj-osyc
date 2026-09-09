# MANUAL DE USO — SISTEMA OSYC DE HORARIOS Y FICHAJE

Fichaje de asistencia con GPS y reconocimiento facial, gestión de personal, horarios,
avisos, solicitudes e informes.

> Documento destinado a empleados, líderes de área y administradores del sistema.
> El sistema funciona desde el navegador del celular o la computadora y se puede
> **instalar como app** en el teléfono.

---

## ÍNDICE DE CONTENIDOS

1. ¿Qué es el Sistema OSYC?
2. Conceptos clave
3. Acceso y navegación
   - 3.1. Instalar la app en el celular (PWA)
   - 3.2. Iniciar sesión
   - 3.3. La pantalla principal y el menú
   - 3.4. La campana de notificaciones
   - 3.5. Cambiar mi contraseña
   - 3.6. Cerrar sesión
4. Roles y permisos
5. Fichar (ingreso y salida)
   - 5.1. Requisitos para poder fichar
   - 5.2. Registro facial la primera vez (consentimiento)
   - 5.3. Fichar paso a paso
   - 5.4. Fichar con el QR de la sucursal (modo kiosco)
   - 5.5. Mensajes al fichar y qué hacer
6. Avisos
   - 6.1. Ver y confirmar avisos (empleado)
   - 6.2. Publicar un aviso (administrador)
   - 6.3. Recibos de lectura
7. Solicitudes
   - 7.1. Crear una solicitud (empleado)
   - 7.2. Estados de una solicitud
   - 7.3. Detalle, comentarios y adjunto
   - 7.4. Aprobar o rechazar (administrador)
8. Inicio (tablero de resumen)
9. Registros de fichaje (administrador)
10. Personal (administrador)
    - 10.1. Agregar una persona
    - 10.2. Dar acceso a la app
    - 10.3. Importar personal por Excel/CSV
    - 10.4. Editar, desactivar y eliminar
11. Horarios semanales (administrador)
12. Panel de Líder
13. Informes / Tablero (administrador)
14. Configuración del sistema (administrador)
    - 14.1. Funciones (áreas y líderes)
    - 14.2. Áreas / sectores
    - 14.3. Plantillas de horario
    - 14.4. Sucursales, GPS y códigos QR
15. Notificaciones y alertas push
16. Cómo se calculan los datos (tardanzas, horas, puntualidad)
17. Reglas de carga y buenas prácticas
18. Privacidad del dato biométrico (Ley 25.326)
19. Solución de problemas frecuentes
20. Guía rápida de operaciones

---

## 1. ¿QUÉ ES EL SISTEMA OSYC?

El **Sistema OSYC de Horarios** es una herramienta digital para registrar y controlar la
**asistencia del personal**, junto con la gestión operativa de recursos humanos.

Con una sola aplicación, cada empresa puede:

- Que los empleados **fichen su ingreso y su salida** desde el celular, con verificación por
  **GPS** (que estén realmente en el local) y **reconocimiento facial** (que sea la persona correcta).
- **Planificar los horarios semanales** de cada persona o área.
- Comparar lo planificado con lo realmente fichado, y detectar **tardanzas, horas extra y ausencias**.
- Publicar **avisos** internos y recibir la confirmación de que fueron leídos.
- Gestionar **solicitudes** de licencia, vacaciones o certificados, con adjuntos y aprobación.
- Generar **informes** y exportar la información a Excel/CSV.

El sistema es una **app web** (funciona en el navegador y se puede instalar en el teléfono).
Toda la información se guarda de forma centralizada, de modo que la empresa trabaja sobre una
única fuente de datos en vez de planillas sueltas o mensajes informales.

---

## 2. CONCEPTOS CLAVE

Antes de empezar conviene entender algunos términos que aparecen en todo el sistema:

| Concepto | Qué significa |
|---|---|
| **Fichaje** | Cada marca de ingreso o de salida que hace un empleado. El sistema decide solo si es entrada o salida. |
| **Registro** | El resumen del día de una persona: entrada, salida (y hasta un 2º turno), horas trabajadas y tardanza. |
| **Sucursal (sede)** | Un local de la empresa. Tiene una ubicación en el mapa y un **radio** permitido para fichar. |
| **Geocerca / radio** | La zona circular alrededor de la sucursal dentro de la cual se acepta el fichaje. Si el empleado está afuera, no puede fichar. |
| **Área / sector** | Agrupación del personal (ej.: Barra, Cocina, Salón). Es **opcional**: se puede trabajar con un solo grupo. |
| **Horario planificado (turno)** | El horario que se espera que cumpla la persona ese día. Puede ser un rango de horas, o un tipo especial: Flex, Guardia, Licencia o Vacaciones. |
| **Tardanza** | La diferencia entre la hora de entrada real y la planificada. |
| **Rol** | El tipo de usuario: **empleado**, **líder** o **administrador** (ver sección 4). |
| **PWA** | La app se puede **instalar** en el celular como si fuera una aplicación común, y queda con su ícono en la pantalla de inicio. |

---

## 3. ACCESO Y NAVEGACIÓN

El sistema se abre desde la dirección web que le indique la empresa (por ejemplo,
`https://osyc.tudominio.com`). Se adapta al dispositivo: en la computadora muestra un menú
lateral; en el celular, un menú que se despliega con el botón ☰.

### 3.1. Instalar la app en el celular (PWA)

Se recomienda **instalar** el sistema en el teléfono para tenerlo a mano y para poder recibir
notificaciones:

- **Android (Chrome):** abrí la dirección web → menú del navegador (⋮) → **"Agregar a pantalla de inicio"** / **"Instalar app"**.
- **iPhone (Safari, iOS 16.4 o superior):** abrí la dirección web → botón **Compartir** → **"Agregar a pantalla de inicio"**. En iPhone este paso es **obligatorio** para poder activar las notificaciones.

Una vez instalada, se abre desde su ícono como cualquier otra app.

> La app se actualiza sola. Si se publicó una versión nueva mientras la tenías abierta, se
> recarga automáticamente para traer los cambios.

### 3.2. Iniciar sesión

Existen tres formas de entrar, según el rol:

**Empleado y administrador** (misma pantalla de acceso):

1. Abrí la app.
2. Ingresá tu **Email**.
3. Ingresá tu **Contraseña**.
4. Presioná **Ingresar →**.

> **Importante:** cuando el administrador da de alta a un empleado, la contraseña inicial suele
> ser el **DNI** (sin puntos). Por eso al empezar se ingresa con **email + DNI**. Después, cada
> empleado puede cambiar su contraseña (ver 3.5).

**Líder de área:** en la pantalla de acceso, si la empresa usa líderes, aparece el enlace
**"Soy líder · cargar horarios →"**. El líder entra con su **Usuario** y **Contraseña** propios
(ver sección 12).

Mensajes posibles:
- **"Completá email y contraseña"** — falta uno de los datos.
- **"Email o contraseña incorrectos"** — revisá los datos; si persiste, pedile al administrador que verifique tu acceso.

### 3.3. La pantalla principal y el menú

Al ingresar se ve la pantalla **Inicio** y un menú de navegación. El menú muestra **solo las
secciones habilitadas para tu rol**:

| Sección | Para quién | Para qué sirve |
|---|---|---|
| **Inicio** | Todos | Resumen del día y accesos rápidos. |
| **Fichar** | Todos | Registrar ingreso / salida. |
| **Avisos** | Todos | Comunicados internos. Muestra un contador de no leídos. |
| **Solicitudes** | Todos | Licencias, vacaciones, certificados. Muestra un contador de pendientes. |
| **Registros** | Administrador | Todos los fichajes registrados. |
| **Personal** | Administrador | Alta y edición de empleados. |
| **Horarios** | Administrador | Planificación semanal. |
| **Informes** | Administrador | Tablero con estadísticas. |
| **Configuración** | Administrador | Áreas, plantillas, sucursales y funciones. |

En la parte superior siempre están la **campana de notificaciones** y, en el menú, los botones
**Cambiar contraseña** y **Salir**.

### 3.4. La campana de notificaciones

La campana (arriba a la derecha) muestra un número con las notificaciones **no leídas**. Al tocarla se abre el listado de las últimas novedades: nuevos avisos, solicitudes, comentarios y
resoluciones.

- Cada notificación muestra título, texto y cuándo llegó ("recién", "hace 5 min", etc.).
- Al **tocar** una notificación, se abre la pantalla relacionada y queda marcada como leída.
- **"Marcar todas"** deja todo el listado como leído.
- Cuando llega una notificación nueva con la app abierta, suena un **beep** y el teléfono **vibra**.
- Al pie del panel está la opción **"🔔 Activar alertas en este dispositivo"** para recibir
  notificaciones aunque la app esté cerrada (ver sección 15).

> Marcar una notificación como leída **no** es lo mismo que confirmar la recepción de un aviso:
> la confirmación de un aviso se registra recién cuando lo abrís desde la sección **Avisos** (ver 6.1).

### 3.5. Cambiar mi contraseña

Cualquier usuario (empleado o administrador) puede cambiar su contraseña:

1. Abrí el menú y tocá **Cambiar contraseña**.
2. Ingresá tu **Contraseña actual**.
3. Ingresá la **Nueva contraseña** (mínimo **6 caracteres**).
4. **Repetí** la nueva contraseña.
5. Tocá **Cambiar contraseña**.

Mensajes posibles: *"La contraseña nueva debe tener al menos 6 caracteres."*, *"Las contraseñas
nuevas no coinciden."*, *"La contraseña actual no es correcta."*. Al terminar aparece
*"✓ Contraseña actualizada. La próxima vez ingresá con la nueva."*.

### 3.6. Cerrar sesión

Tocá **Salir** en el menú (o el botón **Salir** de la barra superior en el celular). En
dispositivos compartidos es importante cerrar sesión para que otra persona no registre
información con tu identidad.

---

## 4. ROLES Y PERMISOS

El sistema tiene tres tipos de usuario:

| Rol | Cómo ingresa | Qué puede hacer |
|---|---|---|
| **Empleado** | Email + contraseña (DNI inicial) | Fichar, ver avisos y confirmarlos, crear y comentar sus solicitudes, cambiar su contraseña, activar notificaciones. Ve solo lo suyo. |
| **Líder de área** | Usuario + contraseña propios (acceso `/lider`) | Cargar/ver los horarios semanales de su(s) área(s), dentro de la ventana de carga habilitada. |
| **Administrador** | Email + contraseña | Acceso total: Registros, Personal, Horarios, Informes, Configuración; publicar avisos; aprobar/rechazar solicitudes; gestionar sucursales y usuarios. |

Notas importantes:

- El **"Rol / puesto"** que se carga en la ficha de una persona (ej.: Mozo, Cajero) es solo un
  **cargo descriptivo**; no otorga permisos.
- Cada pantalla de administración está protegida: si un empleado intenta abrirla, ve el mensaje
  **"Esta sección es solo para administradores."**
- El acceso de **Líder** es independiente del de empleado/administrador y se habilita desde
  **Configuración → Funciones → Usar líderes**.

---

## 5. FICHAR (INGRESO Y SALIDA)

El fichaje es el corazón del sistema. Cada empleado registra su ingreso y su salida desde la
sección **Fichar**. La pantalla muestra un **reloj grande** con la hora y la fecha actual, y un
botón **Fichar**.

**El sistema decide automáticamente** si es entrada o salida, según lo que ya hayas registrado
ese día:

1. Si todavía no fichaste → registra **entrada**.
2. Si ya tenés entrada pero no salida → registra **salida**.
3. Si tenés un turno cortado, admite una **2ª entrada** y una **2ª salida**.
4. Si ya tenés entrada y salida completas del día → avisa *"Ya tenés entrada y salida
   registradas hoy."*

### 5.1. Requisitos para poder fichar

- **Ubicación (GPS) activada** y permiso de ubicación concedido al navegador/app.
- **Cámara** disponible y permiso concedido (para el reconocimiento facial).
- **Conexión a internet.**
- Estar **físicamente dentro del radio** de una sucursal activa.

### 5.2. Registro facial la primera vez (consentimiento)

La **primera vez** que tocás **Fichar**, el sistema te pide **registrar tu cara** (una sola vez).
Antes de abrir la cámara aparece la pantalla de **consentimiento** con el título *"Registro
facial para fichar"*, que explica:

- Se guarda un **código matemático** de tu rostro (un vector), **no una foto**.
- No se puede reconstruir tu cara a partir de ese código.
- Se usa **únicamente** para verificar tu identidad al fichar.
- Podés pedir que se **borre** cuando dejes de trabajar o si revocás el consentimiento.

Botones:
- **Acepto** → se abre la cámara para registrar tu cara (título *"Registrá tu cara (1ª vez)"*,
  botón **Registrar**). Queda guardada la fecha y hora de tu aceptación (Ley 25.326).
- **Ahora no** → no se registra la cara y no podrás fichar con este método. Mensaje: *"Para
  fichar con reconocimiento facial necesitás aceptar el uso del dato biométrico."*

De ahí en más, cada fichaje **verifica** tu cara (título *"Verificá tu identidad"*, botón
**Verificar**), comparándola con la que registraste.

### 5.3. Fichar paso a paso

1. Entrá a **Fichar**.
2. Tocá el botón **Fichar**.
3. **Reconocimiento facial:** el botón muestra *"Preparando cámara…"* y luego se abre la cámara.
   Acomodá tu cara en el círculo con buena luz y confirmá.
4. **GPS:** el botón muestra *"Afinando GPS…"* mientras toma tu ubicación más precisa.
5. **Registro:** muestra *"Registrando…"* y guarda el fichaje.
6. Aparece la confirmación: **"¡Ingreso registrado!"** o **"¡Salida registrada!"**, con el
   nombre de la sucursal y la hora.

> Consejo: para que el GPS y la cámara respondan rápido, fichá con buena señal y, si es posible,
> cerca de una ventana o a cielo abierto.

### 5.4. Fichar con el QR de la sucursal (modo kiosco)

Cada sucursal puede tener un **cartel con código QR** (lo genera el administrador, ver 14.4).
Cuando el empleado **escanea el QR**:

1. Se abre la app directamente en la pantalla de **Fichar** de esa sucursal (modo kiosco).
2. Si es la primera vez, inicia sesión (email + contraseña).
3. Toca **Fichar** y sigue el mismo flujo (cara + GPS).

Al escanear el QR, el fichaje queda asociado a esa sucursal puntual. Si se ficha sin QR, el
sistema **detecta automáticamente** en qué sucursal estás según tu ubicación.

Desde el modo kiosco también hay un botón **"Ver mis avisos y solicitudes"** para pasar al resto
de la app.

### 5.5. Mensajes al fichar y qué hacer

| Mensaje | Causa | Qué hacer |
|---|---|---|
| **"Activá el GPS y probá de nuevo."** | El dispositivo no permite ubicación. | Activá la ubicación del teléfono. |
| **"Necesitás permitir la ubicación para fichar."** | Permiso de ubicación denegado. | Dale permiso de ubicación a la app/navegador. |
| **"No pudimos obtener tu ubicación..."** | Señal de GPS pobre. | Salí a un lugar más abierto y reintentá. |
| **"Estás fuera del área del local..."** | Estás fuera del radio de la sucursal. | Acercate al local. |
| **"No estás dentro de ninguna sucursal..."** | No hay ninguna sucursal cerca. | Verificá que estés en el local correcto. |
| **"El GPS está impreciso..."** | La precisión del GPS es peor que la permitida. | Salí a un lugar más abierto y reintentá. |
| **"No te reconocimos..."** | La cara no coincide con la registrada. | Buscá buena luz, sacate lentes de sol/barbijo y reintentá. |
| **"No pudimos usar la cámara."** | La cámara no está disponible o sin permiso. | Dale permiso de cámara y reintentá. |
| **"Ya registraste un movimiento recién. Esperá un momento."** | Fichaste hace menos de 2 minutos. | Esperá y reintentá (evita fichajes duplicados). |
| **"Ya tenés entrada y salida registradas hoy."** | La jornada ya está completa. | No es necesario volver a fichar. |

---

## 6. AVISOS

Los **Avisos** son comunicados que el administrador envía al personal.

### 6.1. Ver y confirmar avisos (empleado)

- En la sección **Avisos** se listan los comunicados, del más nuevo al más viejo.
- Un aviso **sin leer** se muestra con un **punto azul** y el texto *"📩 Tocá para leer y
  confirmar recepción"*.
- Al tocarlo aparece un cartel: *"Al abrir este aviso, queda registrado que lo recibiste.
  ¿Querés abrirlo ahora?"*
  - **Abrir y confirmar recepción** → se muestra el contenido y queda registrado que lo recibiste.
  - **Ahora no** → el aviso queda sin confirmar.
- El botón **Buscar** permite filtrar por texto, y por fechas **Desde/Hasta**.

### 6.2. Publicar un aviso (administrador)

1. En **Avisos**, tocá **Nuevo aviso**.
2. Completá **Título** (ej.: *"Cambio de horario"*) y **Mensaje**.
3. Elegí el destinatario en **"¿A quién se lo enviás?"**:
   - **Todos** — todo el personal.
   - **Un área** — solo un sector (aparece si la empresa usa áreas).
   - **Personas** — elegís individualmente de la lista (con buscador por nombre).
4. Tocá **Publicar aviso**.

Al publicar, a los destinatarios les llega una notificación (y push, si la tienen activada).

Validaciones: *"Completá título y mensaje"*, *"Elegí un área"*, *"Elegí al menos una persona"*.

### 6.3. Recibos de lectura

En cada aviso, el administrador ve **"Para: ..."** (a quién se envió) y un enlace **"Ver
recibos"** que muestra **"Recibido por N/total"** y la lista de quiénes lo confirmaron con la
fecha y hora. Sirve para saber quién tomó conocimiento y quién todavía no.

---

## 7. SOLICITUDES

El módulo **Solicitudes** permite que los empleados pidan formalmente licencias, vacaciones o
presenten certificados, y que el administrador los apruebe o rechace.

### 7.1. Crear una solicitud (empleado)

1. En **Solicitudes**, tocá **Nueva**.
2. Elegí el **Tipo**:
   - **Licencia**
   - **Vacaciones**
   - **Certificado médico**
   - **Otro**
3. Completá **Desde** y **Hasta** (fechas).
4. Escribí el **Motivo / detalle** (obligatorio si el tipo es *Otro*).
5. Adjuntá, si corresponde, un archivo en **Adjunto (certificado/justificativo)**: solo **PDF,
   JPG o PNG**, hasta **8 MB**.
6. Tocá **Enviar solicitud**.

La solicitud se crea con estado **Pendiente** y les llega una notificación a los administradores.

### 7.2. Estados de una solicitud

| Estado | Significado |
|---|---|
| **Pendiente** | Aún no fue resuelta. |
| **Aprobado** | El administrador la aprobó. |
| **Rechazado** | El administrador la rechazó. |

En el listado, las **pendientes** aparecen primero. Se puede filtrar con **Buscar** por estado,
tipo, texto y rango de fechas. El administrador ve un selector **Todas / Solo mías**.

### 7.3. Detalle, comentarios y adjunto

Al abrir una solicitud se ve: el tipo, el estado, el solicitante, las fechas, el motivo y un
botón **Ver adjunto** (si tiene). Debajo hay un **hilo de comentarios**: cualquiera de las partes
puede escribir y tocar **Comentar**. Cada comentario notifica a la otra parte.

### 7.4. Aprobar o rechazar (administrador)

Cuando la solicitud está **Pendiente**, el administrador ve dos botones:

- **Aprobar** (verde)
- **Rechazar** (rojo)

Si escribe un texto en el cuadro de comentario antes de decidir, ese texto queda registrado como
el **motivo de la decisión**. Al resolver, el empleado recibe una notificación *"Tu solicitud fue
aprobada / rechazada"*.

---

## 8. INICIO (TABLERO DE RESUMEN)

La pantalla **Inicio** da un panorama rápido al ingresar.

**Para el administrador**, muestra tarjetas con:
- **Fichajes hoy** — cantidad de registros del día.
- **Solicitudes pendientes** — se resalta si hay alguna.
- **Avisos sin leer.**
- **Personas activas.**

**Para el empleado**, muestra:
- **Mis solicitudes pendientes.**
- **Avisos sin leer.**

Debajo hay **Accesos rápidos** a las secciones y dos columnas: **Últimos avisos** y **Solicitudes
pendientes** (o *Mis solicitudes pendientes*), con enlaces para ver todo.

---

## 9. REGISTROS DE FICHAJE (ADMINISTRADOR)

La sección **Registros** muestra todos los fichajes cargados, uno por persona y día.

**Filtros disponibles:**
- **Período:** Hoy, Ayer, Esta semana, Semana pasada, Este mes, Mes pasado, Este año, Todos, Día
  específico o **Personalizado** (con **Desde/Hasta**).
- **Área** (si la empresa usa áreas).
- **Buscar persona** por nombre.
- **Salida:** Todas / Con salida / Sin salida (para detectar jornadas sin cierre).

**Columnas de la tabla:** Área, Nombre, Fecha, Entrada, Salida, Hs (horas trabajadas), Tard.
(tardanza), Obs. (observaciones) y acciones. Si hay 2º turno, se muestra debajo con el prefijo
"2º". La columna **Tard.** puede mostrar:
- **✓ Exacto** — llegó justo.
- **✓ N m ant.** — llegó N minutos antes (en verde).
- **+N m** — llegó N minutos tarde (en rojo).
- **Flex** / **Guardia** — el turno no se evalúa por horario.

**Acciones por fila:**
- **✎ Editar** — abre la ficha del registro para corregir área, nombre, fecha, turno (texto),
  entrada, salida, 2º turno y observaciones. Campos obligatorios: Área, Nombre y Fecha.
- **✕ Eliminar** — pide confirmación *"¿Eliminar registro de {nombre} del {fecha}?"*.

Cada edición o eliminación queda asentada en el registro interno de **Actividad** (con marca de
"fuera de término" si el registro es de un día anterior).

**Exportar:** el botón **CSV** descarga el listado filtrado (archivo
`OSYC_registros_<fecha>.csv`) con columnas Área, Nombre, Rol, Fecha, Horario planificado, Entrada,
Salida, Entrada 2, Salida 2, Hs, Min tardanza, Puntual (SÍ/NO/N/A) y Observaciones. Se puede
abrir en Excel.

Los listados largos se paginan de a **100** por página.

---

## 10. PERSONAL (ADMINISTRADOR)

La sección **Personal** permite mantener la lista de empleados. Muestra el total de personas y
una tabla con **#, Nombre, Rol, Estado** (Activo/Inactivo) y acciones.

### 10.1. Agregar una persona

1. Tocá **Agregar**.
2. Completá **Nombre** (obligatorio).
3. Opcional: **Rol / puesto** (ej.: Mozo, Cajero) y **Área** (si la empresa usa áreas).
4. Dejá tildado **Activo**.
5. Tocá **Guardar**.

### 10.2. Dar acceso a la app

Para que la persona pueda **entrar y fichar**, cargá en su ficha:

- **Email** (será su usuario).
- **Contraseña** (habitualmente el **DNI** sin puntos).

> Los dos campos van **juntos**: o cargás ambos, o ninguno. Si cargás solo uno, aparece *"Para el
> acceso a la app cargá email Y contraseña"*.

Al guardar con email + contraseña, se le crea el acceso automáticamente. En modo edición, si dejás
la contraseña vacía, **no se cambia** (etiqueta *"(dejar vacío = no cambiar)"*).

### 10.3. Importar personal por Excel/CSV

Para cargar muchas personas de una vez:

1. Tocá **Importar CSV**.
2. Tocá **Descargar plantilla** — baja un archivo `plantilla_personal.csv` con las columnas
   **Nombre** (obligatorio), **Rol**, **Email**, **Contraseña** (y **Área** si se usan áreas).
3. Completá las filas (podés usar Excel).
4. Subí el archivo (acepta **.xlsx** o **.csv**).
5. Revisá la cantidad de filas detectadas y tocá **Importar**.
6. Al terminar se muestra un resumen: **Creados: N** y, si hubo problemas, el detalle por fila.

Email y contraseña son opcionales: solo hacen falta para las personas que van a entrar a la app.

### 10.4. Editar, desactivar y eliminar

- **✎ Editar** — cambia los datos de la persona.
- **Desactivar** — en la ficha, destildá **Activo** y guardá. La persona deja de aparecer para
  fichar, pero se conserva su historial. Es la forma recomendada de dar de baja a alguien.
- **✕ Eliminar** — borra la persona por completo (pide confirmación *"¿Eliminar a {nombre}?"*).
  Usalo solo si cargaste a alguien por error.

---

## 11. HORARIOS SEMANALES (ADMINISTRADOR)

La sección **Horarios** sirve para planificar qué horario cumple cada persona en la semana. Lo
planificado se compara luego con lo fichado para calcular tardanzas y horas.

**Encabezado:** indicadores de Personas, Áreas, Hs total y Especiales; navegación de semanas
(**Esta semana**, **← Anterior**, flechas `‹ ›`, y un selector de fecha). Se puede navegar desde
4 semanas atrás hasta 1 adelante.

**Cómo se organiza:**
- Si la empresa **usa áreas**, se muestra una **tarjeta por área** con su total de horas y un
  distintivo **✓ N** (cargada) o **Sin cargar**. Tocá una tarjeta para abrir su editor.
- Si **no usa áreas**, se edita directamente el grupo **"Todos los empleados"**.

**Editor de horarios — por cada persona:**
- Un botón **Vac.** marca toda la semana como **vacaciones**.
- **Carga rápida:** elegí los días (chips **Lun–Dom**, de lunes a viernes vienen preseleccionados),
  escribí la **entrada** y la **salida**, y tocá **Aplicar**.
- Si hay **plantillas** cargadas (ver 14.3), elegí una y tocá **Aplicar** para completar de una vez.
- **Grilla de 7 días:** por cada día se elige el **tipo**:
  - **Fijo** — con hora de entrada y salida. Admite un **2º turno** (botón **2°**) para horarios cortados.
  - **Flex** — horario flexible (no se evalúa tardanza).
  - **Guardia** — cuenta como 1 hora.
  - **Licencia** — no computa horas.
- Campo de **observación** por persona y **observación del área**.

**Guardar:** tocá **Guardar**. Además de guardar la planificación, el sistema **sincroniza los
registros** ya existentes de esa semana/área para que el "turno" de cada fichaje coincida con lo
planificado. También podés **Copiar semana anterior** o **Eliminar semana**.

**Exportar:** botones **CSV** (planilla completa) e **Imagen** (una foto PNG de la grilla, útil
para compartir por WhatsApp o imprimir).

---

## 12. PANEL DE LÍDER

El **Líder** es un usuario que puede cargar los horarios de su(s) área(s) sin ser administrador.
Se habilita desde **Configuración → Usar líderes** y se crea/gestiona por área.

**Ingreso:** desde la pantalla de acceso, enlace **"Soy líder · cargar horarios →"** (o la
dirección `/lider`). El líder entra con su **Usuario** y **Contraseña**. Si tiene varias áreas,
elige cuál va a cargar.

**Panel del líder:**
- Por defecto muestra la **semana siguiente** (botones **Esta semana / Siguiente** y flechas).
- Carga los horarios con el mismo editor por persona que el administrador (tipos Fijo/Flex/
  Guardia/Licencia, 2º turno, **Copiar semana anterior**).
- Tocá **Guardar horarios** para confirmar (*"✓ Horarios guardados"*).

**Ventana de carga:** el administrador puede definir en qué días y hasta qué hora los líderes
pueden modificar. Fuera de esa ventana, el líder ve el mensaje *"Fuera del horario de carga
habilitado. Podés ver los horarios pero no modificarlos."* y solo puede consultar (vista de solo
lectura).

---

## 13. INFORMES / TABLERO (ADMINISTRADOR)

La sección **Informes** presenta estadísticas de asistencia. Se filtra por **Período**, **Área**
(si se usan áreas) y **Persona**, y admite rango personalizado o día específico.

**Indicadores (KPIs):** Registros, Personas, Tardanza promedio (en rojo si supera 5 min),
Puntuales, Tardes, Horas promedio y personas Con extra.

**Gráficos:**
- **Registros por área** (torta) — si se usan áreas.
- **% Puntualidad por área** (barras) — si se usan áreas.
- **Registros por día** (línea).

**Rankings:**
- **Top tardanzas** y **Top horas extra**, cada uno con vista **Total** (suma acumulada) o **Máx.**
  (el mayor caso), y opción **Ver más**.

**Tabla por persona:** para cada empleado, cantidad de registros, horas, % de puntualidad y
tardanza promedio.

> Para exportar datos crudos a Excel, usá el botón **CSV** de **Registros** o de **Horarios**.

---

## 14. CONFIGURACIÓN DEL SISTEMA (ADMINISTRADOR)

En **Configuración** se ajustan las funciones y los datos maestros de la empresa.

### 14.1. Funciones (áreas y líderes)

Dos interruptores:
- **Usar áreas** — agrupa al personal por sector (Barra, Cocina, etc.). Apagado = un solo grupo
  con todo el personal.
- **Usar líderes** — habilita usuarios líderes que cargan los horarios de su área. Apagado = solo
  el administrador carga horarios.

### 14.2. Áreas / sectores

(Visible solo si **Usar áreas** está activado.) Permite **agregar**, **editar** (✎) y **eliminar**
(✕) las áreas de la empresa. Si eliminás un área, el personal que la tenía queda **sin área**.

### 14.3. Plantillas de horario

Horarios reutilizables para cargar más rápido (ej.: *Corrido 09→18*, *Cortado 09→13 / 17→21*).
Cada plantilla tiene un **nombre**, un **1er turno** (entrada/salida) y, opcionalmente, un **2do
turno**. Se usan en el editor de horarios con **Aplicar plantilla**.

### 14.4. Sucursales, GPS y códigos QR

Aquí se definen los locales donde se puede fichar y su geocerca.

**URL de la app:** cargá la dirección donde está publicada la app (ej.:
`https://osyc.tudominio.com`) y tocá **Guardar URL**. Se usa para armar los enlaces de los QR.

**Agregar / editar una sucursal:**
1. Tocá **Agregar sucursal** (o **Editar** en una existente).
2. Completá **Nombre** y **Dirección**.
3. Definí la **ubicación GPS** del centro del local:
   - Parado dentro del local, tocá **Usar mi ubicación** (el sistema toma la posición más precisa),
   - o pegá el par **"lat, lng"** copiado de Google Maps en el campo **Latitud**.
4. **Radio (m):** tamaño de la zona permitida para fichar (se recomienda entre 80 y 150 m según el
   local). Mínimo 5 m.
5. **Precisión máx. (m):** peor precisión de GPS que se acepta; si el GPS del empleado es menos
   preciso que este valor, se rechaza el fichaje.
6. Dejá tildado **Activa**.
7. Tocá **Guardar sucursal**.

**Código QR:** tocá **Ver QR** en una sucursal para ver su código. El botón **Imprimir** genera
una hoja A4 lista para pegar en el local con la leyenda *"Escaneá para fichar"*. El QR lleva a la
pantalla de fichaje de esa sucursal.

**Eliminar sucursal:** pide confirmación e impide que los empleados fichen ahí.

---

## 15. NOTIFICACIONES Y ALERTAS PUSH

El sistema avisa dentro de la app (campana) y también puede enviar **notificaciones push** al
celular aunque la app esté cerrada.

**Qué dispara una notificación:**
- Se **publica un aviso** dirigido a la persona.
- Se **resuelve** (aprueba/rechaza) una de sus solicitudes.
- Alguien **comenta** en una solicitud (al empleado dueño o a los administradores).
- Se **crea una nueva solicitud** (les llega a los administradores).

**Activar push en el celular:**
1. Tocá la **campana** → al pie, **"🔔 Activar alertas en este dispositivo"**.
2. Aceptá el pedido de permiso (**Permitir**).
3. Listo: aparece *"✓ Alertas activas en este dispositivo"*.

Notas:
- **Android:** funciona directo.
- **iPhone (iOS 16.4+):** primero hay que **"Agregar a pantalla de inicio"** y abrir la app desde
  ese ícono; recién ahí iOS permite activar el push.
- Si están bloqueadas, aparece *"Notificaciones bloqueadas. Activalas desde los permisos del
  navegador."*
- Cada dispositivo se activa por separado.

---

## 16. CÓMO SE CALCULAN LOS DATOS

Para interpretar correctamente Registros e Informes:

- **Horas trabajadas:** diferencia entre salida y entrada (sumando el 2º turno si existe). Se
  muestran como "Xh Ym".
- **Tardanza:** hora de entrada real menos la hora de entrada planificada. Si es 0 o negativa, la
  persona fue **puntual**; si es positiva, llegó **tarde** (ej.: "+7m").
- **Horas extra:** tiempo que la persona se quedó **después** de la hora de salida planificada.
- **Puntualidad %:** proporción de registros puntuales sobre el total de registros con horario
  evaluable.
- **Turnos especiales:** los días marcados como **Flex**, **Guardia**, **Licencia** o
  **Vacaciones** **no** se cuentan para tardanza (Guardia computa 1 hora; Flex y Licencia, 0).
- **Zona horaria de referencia:** Argentina (Buenos Aires). La hora del fichaje la pone el
  servidor, no el teléfono, para evitar manipulaciones.

---

## 17. REGLAS DE CARGA Y BUENAS PRÁCTICAS

| Regla | Por qué |
|---|---|
| No compartir la contraseña. | Protege la identidad del responsable de cada fichaje. |
| Cerrar sesión en dispositivos compartidos. | Evita registros bajo un usuario que no corresponde. |
| Fichar dentro del local, con buena señal. | Reduce rechazos por GPS impreciso o fuera de zona. |
| Registrar la cara con buena luz y sin lentes/barbijo. | Evita el mensaje "No te reconocimos". |
| Cargar los horarios antes de que empiece la semana. | Las tardanzas se calculan contra lo planificado. |
| Confirmar los avisos al leerlos. | Deja constancia de recepción para la empresa. |
| Adjuntar el certificado en la solicitud. | Agiliza la aprobación. |
| Desactivar (no eliminar) al dar de baja a alguien. | Conserva el historial de asistencia. |
| Mantener actualizadas áreas, sucursales y personal. | Los informes y el fichaje dependen de estos datos. |

---

## 18. PRIVACIDAD DEL DATO BIOMÉTRICO (LEY 25.326)

El reconocimiento facial usa un **dato biométrico**, considerado sensible por la Ley 25.326 de
Protección de los Datos Personales. El sistema está preparado para cumplirla:

- **No se guardan fotos:** solo un **vector** de 128 números que describe el rostro y del que **no
  se puede reconstruir** la cara.
- Se pide **consentimiento explícito** la primera vez, y queda registrada la **fecha/hora** y la
  **versión** del texto aceptado.
- Se usa **únicamente** para verificar la identidad al fichar.
- El empleado puede **revocar** el consentimiento y pedir que se **borre** su registro facial
  (el administrador lo gestiona).

---

## 19. SOLUCIÓN DE PROBLEMAS FRECUENTES

| Problema | Causa probable | Qué hacer |
|---|---|---|
| No puedo ingresar. | Email o contraseña incorrectos. | Verificá los datos; recordá que la contraseña inicial suele ser el DNI. Pedile al administrador que revise tu acceso. |
| No veo una sección (Personal, Informes...). | Tu rol no es administrador. | Esas secciones son solo para administradores. |
| No me deja fichar por "fuera de zona". | Estás fuera del radio de la sucursal. | Acercate al local; si el problema persiste, avisá al administrador para revisar el radio. |
| El GPS da "impreciso". | Señal pobre o precisión baja. | Salí a un lugar más abierto; el administrador puede ajustar la "Precisión máx." de la sucursal. |
| "No te reconocimos". | Poca luz, lentes, barbijo o cambio de aspecto. | Buscá buena luz y reintentá. Si no funciona, pedí al administrador que reinicie tu registro facial. |
| No llegan las notificaciones push. | Push no activado o app no instalada (iPhone). | Activá las alertas desde la campana; en iPhone, instalá la app primero. |
| No aparece una persona para fichar. | La persona está inactiva o sin acceso cargado. | Verificá en Personal que esté Activa y tenga email + contraseña. |
| Un empleado no puede entrar aunque lo di de alta. | Falta cargarle email + contraseña. | Editá su ficha y cargá ambos datos. |
| El líder no puede modificar horarios. | Está fuera de la ventana de carga. | Ajustá la ventana de carga (Configuración) o cargá vos como administrador. |
| Las tardanzas salen raras. | No hay horario planificado esa semana. | Cargá los horarios semanales del área/persona. |
| No puedo exportar registros. | No hay datos en el período. | Verificá que haya fichajes cargados en el rango elegido. |

Ante cualquier duda, evitá cargar información incorrecta solo para avanzar; consultá al
administrador.

---

## 20. GUÍA RÁPIDA DE OPERACIONES

| Necesidad | Dónde | Acción |
|---|---|---|
| Fichar ingreso/salida | Fichar | Tocar **Fichar** (cara + GPS) |
| Cambiar mi contraseña | Menú → Cambiar contraseña | Actual + nueva (mín. 6) |
| Ver un comunicado | Avisos | Abrir y confirmar recepción |
| Pedir licencia/vacaciones | Solicitudes → Nueva | Completar y **Enviar solicitud** |
| Ver mis notificaciones | Campana | Tocar la campana |
| Activar alertas en el celular | Campana → Activar alertas | Permitir |
| Publicar un aviso | Avisos → Nuevo aviso | Elegir destinatarios y **Publicar** |
| Aprobar/rechazar solicitud | Solicitudes → (abrir) | **Aprobar** / **Rechazar** |
| Ver todos los fichajes | Registros | Filtrar y revisar |
| Corregir un fichaje | Registros → ✎ | Editar y **Guardar cambios** |
| Exportar fichajes a Excel | Registros → CSV | Descargar |
| Alta de empleado | Personal → Agregar | Cargar datos (+ email/contraseña) |
| Cargar muchos empleados | Personal → Importar CSV | Descargar plantilla y subir |
| Planificar la semana | Horarios | Cargar por persona/área y **Guardar** |
| Crear plantilla de horario | Configuración → Plantillas | Nombre + turnos |
| Alta de sucursal | Configuración → Sucursales | Ubicación + radio + **Guardar** |
| Imprimir QR de sucursal | Configuración → Ver QR → Imprimir | Colgar en el local |
| Ver estadísticas | Informes | Filtrar por período/área/persona |
| Cargar horarios como líder | Acceso "Soy líder" (/lider) | Usuario + contraseña |
| Cerrar sesión | Menú → Salir | — |

---

### CRITERIOS FINALES

El Sistema OSYC funciona mejor cuando se usa de forma **consistente y diaria**: fichar siempre por
la app, mantener los horarios cargados, confirmar los avisos y resolver las solicitudes en tiempo.
Cada dato ingresado con precisión mejora los informes y la trazabilidad de la asistencia de toda
la empresa.

---

*Anexo — Panel clásico de administración (respaldo):* además de la app, existe un panel web
clásico (`admin.html`) que cumple las mismas funciones de administración (Dashboard, Registros,
Personal, Líderes, Horarios Semanales, Actividad y Configuración) y una pantalla de informe
imprimible (`informe.html`). Se mantiene como respaldo; las funciones descritas en este manual
son equivalentes en ambos.
