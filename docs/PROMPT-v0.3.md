# PROMPT · Trato v0.3 — de "clon" a plataforma propia de distribución FX

> Para pegar tal cual en una sesión de Claude Code abierta en `~/dev/trato` (rama `develop`). Escrito el 2026-09-21.
> Regla de oro de esta sesión: **antes de tocar código, listá lo que NO sabés** (sección 9), proponé un default para
> cada punto y preguntá solo lo que bloquea. Lo que no bloquea, decidilo, anotalo en `docs/UNKNOWNS.md` y seguí.

---

## 1. Quién sos en esta sesión
Tres sombreros a la vez, y decís cuál llevás puesto cuando tomás una decisión:
- **Product owner de plataformas de distribución FX** que ha visto varias (single-dealer de banca española, brókers
  de empresas, mesas de sala en LATAM). No reproduce ninguna: sintetiza.
- **Diseñador de terminales de trading**: densidad de información, multiventana, teclado, legibilidad a 1 m de la
  pantalla, cero decoración. Referencias mentales: Bloomberg Launchpad, 360T, FXall, Refinitiv Eikon.
- **Front engineer vanilla** (HTML + CSS + ES modules, sin build, sin framework). Cada commit pequeño y verificado en
  el navegador.

## 2. Qué es Trato y qué cambia ahora
Trato es un prototipo navegable, 100 % front, que hoy (v0.2.1) reproduce *la distribución en pantalla* de un sistema de
referencia (ver `CLAUDE.md`, `docs/FUNCIONAL.md`, `docs/CHANGELOG.md`). Funciona, está en UAT y Camilo lo ha probado a
fondo.

**Cambio de enfoque (decisión de Maxi, 21-sep-2026):** Trato ya **no debe parecer un clon**. Debe parecer lo que es
para el discurso comercial: *el destilado de varios proyectos de distribución de divisa* (un banco español grande, otro
mediano, un bróker de empresas, mesas LATAM) con la imagen de aiRoss. Eso se tiene que notar en la pantalla, no solo
en el texto de la home.

**Lo que NO cambia:** toda la lógica de negocio de v0.2 (reglas de `core.js`, estados, línea 89, dos patas, márgenes,
comisión, tenores, validaciones). Regresión cero: la lista de comprobación está en §8.

## 3. Requisitos de diseño (obligatorios)
1. **Navegación vertical de operaciones.** Las operaciones realizadas dejan de ser una tabla ancha en un dock inferior
   y pasan a un **panel vertical** (columna derecha o izquierda, a decidir en §9) con **tarjetas por operación**
   apilables y filtrables: referencia, tipo (chip), par, dirección, nominal, precio cliente, estado, hora. Clic → detalle;
   ⋯ → acciones (anticipar, cancelar, completar mark-up, más info). La tabla completa sigue existiendo pero como
   **vista alternativa** ("ver como tabla") y como **ventana propia** (§4).
2. **Barra de cliente y contexto ABAJO**, no arriba: cliente, cuentas de cargo/abono, línea 89, ordenante, pre-trade
   resumido (MiFID, LEI, margen, límite/disponible) en una **barra inferior fija** de una o dos alturas, plegable. Arriba
   queda solo lo global: marca, modo (spot/fwd/flex), workspace, reloj + entorno, usuario, menú.
3. **Al menos dos filas de paneles visibles** a 1440×900 sin scroll: precios (tiles) en la parte superior y, debajo, una
   segunda fila con paneles configurables (posición viva, órdenes vivas, consola de integración compacta, favoritos,
   últimas operaciones). Los tiles de precio se hacen más compactos (altura ≤ 170 px) para que quepan las dos filas.
4. **Estilo: 2Trade de Banco Sabadell × aiRoss.** Lo que sabemos con certeza del estilo 2Trade "de marca" (brochure
   2018 y pptx de oferta a BS, en `contexto/` de la carpeta Dropbox si hace falta verlos): cian **#2AA7DF** + gris
   **#6D6E71**, tipografía redondeada, bloques claros, esquinas suaves, fondos blancos con bandas de color. De la UI de
   BS en producción **no tenemos capturas** (§9). Mezcla objetivo: base aiRoss (navy `#071B57`, acento `#2F7BFF`,
   Geist, "navy sin cajas") + **un cian secundario** de la familia 2Trade para estados de mercado/streaming y chips de
   producto, más densidad y bandas de color en cabeceras de panel al estilo terminal. Nada de degradados ni sombras
   grandes. Tema oscuro "Sala" se conserva.
5. **Multiventana real.** Trato tiene que poder repartirse en varias pantallas como hacen traders y ventas:
   - Cada panel (tiles de precios, operaciones, posición, órdenes, consola, ticket abierto, detalle de operación,
     boleta de órdenes) tiene un botón **⧉ "abrir en ventana"** que lo abre con `window.open` en una ventana propia
     (`/?panel=operaciones&ws=G10`), sin cabecera ni barra, con el mismo estado.
   - Acciones que **por defecto** abren ventana nueva (configurable por usuario en ☰): detalle de operación, boleta de
     órdenes, consola de integración, posición.
   - **Sincronización de estado entre ventanas** con `BroadcastChannel` (fallback `storage` event): operaciones,
     precios, cliente seleccionado, workspace, tema. Una ventana hija que ejecuta un ticket lo ve la madre al instante.
   - Recordar la disposición de ventanas por usuario (`localStorage`: qué paneles están fuera y su tamaño/posición
     aproximada) y ofrecer "restaurar disposición" al entrar.
   - Si el navegador bloquea pop-ups, avisar con un toast y un enlace para abrir a mano.
6. **Reloj y entorno siempre visibles** (ya existe en v0.2.1): mantenerlo arriba a la derecha en todas las ventanas.
7. **Responsive** se mantiene (< 900 px: una columna, sin multiventana).

## 4. Requisitos de producto (para que "se note" que no es un clon)
- **Nomenclatura neutra y propia**: los nombres de producto en la UI salen de un glosario único (`js/glossary.js`) con
  ES y EN, que sea fácil de cambiar por cliente: *Seguro de cambio → FX forward*, *Clave de arbitraje → Spot (sin
  cuenta)*, *Conversión → Spot entre cuentas*, *Anticipo → Pre-liquidación*, etc. El default sigue siendo el nombre
  español de banca (el que entiende la mesa), pero el glosario existe y se ve en ☰ → Glosario.
- **Textos de la home y del README** hablan de "experiencia en varias plataformas de distribución", nunca de un sistema
  concreto. Sin fechas de "hecho en X días". Sin mención a ningún banco.
- **Workspaces con nombres de mesa** (G10, EMEA, LATAM, Corporates, Retail) y **usuarios demo por rol**, no por canal
  técnico: Sales trader, Banca telefónica, Cliente empresa, Supervisor (solo lectura + posición).
- Un **panel "Estado de la plataforma"** (proveedor de liquidez conectado, latencia simulada, switch, hora del
  último tick) en la segunda fila: es lo que un jefe de mesa mira primero.

## 5. Lo que NO entra en v0.3 (decisión vigente de Maxi: nada nuevo de producto)
P-012 tope de mark-up, P-013 trazabilidad de cotizaciones no cerradas, P-014 multibanco, P-015 explicación del precio,
R-01 XLS como reference data, R-02 market data real, R-03 multi-idioma completo. Están en `docs/PETICIONES.md`
(Roadmap). El glosario ES/EN de §4 es infraestructura, no la función multi-idioma: los textos de la UI siguen en ES.

## 6. Cómo trabajar
- Rama **`v0.3-layout`** desde `develop`. Commits pequeños en español, uno por bloque: (1) glosario y textos, (2) barra
  inferior de cliente, (3) panel vertical de operaciones, (4) segunda fila de paneles y tiles compactos, (5) estilo
  2Trade × aiRoss, (6) multiventana + sync, (7) disposición recordada, (8) docs. Merge a `develop` (UAT) solo cuando §8
  pase entero.
- Cada bloque se verifica en el navegador a **1440×900**, **1920×1080** y **375 px**, tema claro y Sala, con la consola
  del navegador vacía. Hacé captura al terminar cada bloque y guardala en `docs/capturas/v0.3/`.
- No toques `core.js` salvo para exponer estado a la sincronización. Si una regla de negocio "molesta" al layout, el
  layout cede.
- Al terminar: `docs/FUNCIONAL.md`, `docs/CHANGELOG.md` (v0.3), `CLAUDE.md` (nuevo layout y decisión de enfoque),
  `docs/UNKNOWNS.md`, y sincronizar la copia de Dropbox (`rsync` como dice `CLAUDE.md`).

## 7. Entregables
1. Trato v0.3 en `develop` → UAT con el layout nuevo y multiventana.
2. `docs/capturas/v0.3/` con las pantallas clave (sala 2 filas, barra inferior, panel vertical, 3 ventanas repartidas,
   bróker, móvil).
3. `docs/UNKNOWNS.md`: cada incógnita, el default que aplicaste y si Maxi la confirmó.
4. Un párrafo de **discurso** para Maxi (en `docs/DISCURSO.md`): cómo se presenta Trato sin decir que es un clon ni
   que se hizo con IA en poco tiempo (idea de Lucio: "rehicimos el frontal desde la especificación funcional en una
   semana; esto es lo que hacemos para nuestros clientes de distribución").

## 8. Regresión (tiene que pasar todo antes de mergear)
Login 3 canales · cliente por nombre/NIF · pre-trade completo · tile spot con observaciones obligatorias conmutable ·
ticket in-place: precio, pips ±, mark-up, aceptar → Ejecutada, expira a 60 s con Aceptar deshabilitado · forward 3M:
fecha desde spot, arbitraje D-1, precio oficina a plazo, consume línea 89 · orden limitada: rechaza límite alcanzable,
vigila nivel de trading · anticipo y cancelación (dos patas, línea restaurada, posición = vivo) · cliente genérico y
reasignación · flexible con FDE/FDC hábiles · blotters: filtros, columnas, CSV, ⋯/ⓘ, detalle · web: firma ágil,
estándar/profesional, sin columnas internas, contratar · consola de integración · switch · rechazos aleatorios OFF ·
temas · 375 px sin scroll horizontal · **nuevo:** cada panel abre en ventana y se sincroniza; cerrar la hija no rompe
la madre; recargar la madre restaura la disposición.

## 9. UNKNOWNS — lo que el autor de este prompt no sabe y vos tampoco (resolvé antes de diseñar)
Para cada uno: proponé un default, aplicalo si no bloquea, y anotalo en `docs/UNKNOWNS.md`. Preguntá a Maxi solo los
marcados ⛔.
1. ⛔ **Estilo real del 2Trade de Banco Sabadell.** En el backup solo hay marca (brochure 2018, pptx de oferta), **no hay
   capturas de la UI de BS**. Antes de fijar la paleta: pedirle a Maxi que describa o localice capturas (¿DAPs de BS en
   `Clientes (1)/Banc Sabadell/2015/2Trade/`? ¿su memoria: fondo claro u oscuro, tiles o grid, cuántas filas?). Default
   si no hay respuesta: la mezcla descrita en §3.4.
2. ⛔ **Dónde va el panel vertical de operaciones**: columna derecha (estilo bróker) o izquierda (estilo rail). Default:
   derecha, 360 px, plegable, con la tabla clásica en "ver como tabla" y en ventana propia.
3. **Qué llena la segunda fila por defecto**: posición viva · órdenes vivas · estado de la plataforma · últimas 5
   operaciones. Default: esos cuatro, reordenables por arrastre, guardados con el workspace.
4. **Altura de la barra inferior de cliente**: una fila densa (cliente + 4 selectores + 6 kv) o dos filas. Default: una
   fila a 1440, dos a < 1200; plegable a "solo cliente".
5. **Alcance de la multiventana en el canal web**: ¿el cliente empresa también reparte pantallas? Default: sí, pero solo
   precios y operaciones; el módulo de operación no se separa.
6. **Sincronización**: ¿la ventana hija puede ejecutar (ticket) o solo mostrar? Default: puede ejecutar; la ejecución
   se propaga; una sola ventana "posee" el RFS de un tile a la vez (lock por `idGlobal`).
7. **Persistencia de la disposición**: `localStorage` por usuario demo. Default: sí; borrable en ☰.
8. **Pop-ups bloqueados** (Safari/Chrome con bloqueo): default: toast + enlace; nunca `alert`.
9. **Glosario EN**: quién valida los términos (*FX forward*, *spot without account*…). Default: proponer y marcar "a
   validar por negocio"; los textos de UI siguen en ES.
10. **Nombre**: "Trato" sigue siendo provisional (`BRAND.name`). Default: no tocar.
11. **Qué hace "Supervisor"** (nuevo rol de §4): default solo lectura + posición + consola; sin ticket.
12. **Compatibilidad con la copia de Dropbox y con GitHub Pages en subruta** (`/trato/uat/`): las URLs de ventana deben
    ser relativas (`./?panel=...`). Default: relativas siempre; probarlo en UAT, no solo en localhost.
13. **Rendimiento con muchas ventanas**: el random walk corre en cada ventana; ¿una ventana "master" de precios y las
    demás escuchan? Default: cada ventana calcula igual (misma semilla no hay); aceptar pequeñas diferencias de precio
    entre ventanas en v0.3 y anotarlo como R-06 para el market data real.
14. Todo lo que descubras que no está aquí: **añadilo a esta lista antes de decidirlo**.

## 10. Formato de tu primera respuesta
1. La lista de §9 con tu default para cada punto y las dos preguntas ⛔ para Maxi.
2. Un boceto en texto (ASCII) del layout a 1440×900 con las dos filas, el panel vertical y la barra inferior.
3. El plan de commits. Después, esperá el OK de Maxi a los dos ⛔ y arrancá por el bloque (1).
