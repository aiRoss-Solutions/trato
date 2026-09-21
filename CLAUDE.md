# CLAUDE.md — Trato (prototipo navegable de distribución FX)

> Léelo entero antes de tocar nada. Es el cerebro del proyecto para cualquier Claude (el de Maxi, Lucio, Camilo o Javi).
> Última actualización: 2026-09-18.

## Qué es
- **Trato** es un prototipo **navegable, sin backend**, de una plataforma de **distribución de divisa** de un banco:
  sala (sales trading), banca telefónica y web de empresas (bróker).
- Simula la operativa completa: contado, seguro de cambio (forward), seguro de cambio flexible, anticipos y cancelaciones,
  órdenes limitadas / call orders / avisos, cliente genérico, mark-up de la mesa, blotters, posición, firma ágil del canal web.
- **No lleva el nombre del sistema original en ningún sitio.** Toma la *distribución en pantalla* de un sistema de
  referencia (sus manuales de usuario) pero con estilo propio (paleta aiRoss navy, sin cajas). El nombre "Trato" es provisional y vive en una sola
  constante: `BRAND.name` en `js/data.js`.
- Todo dato es **ficticio**: clientes, personas, NIF, LEI, cuentas (entidad 0999, que no existe). Nunca meter nombres,
  códigos de entidad ni identificadores reales de ningún banco.

## Cómo se ejecuta
- Vanilla HTML + CSS + ES modules. Sin build, sin dependencias, sin npm install.
- Hace falta un servidor estático (los módulos ES no cargan por `file://`):
  `python3 -m http.server 8765 --bind 127.0.0.1` dentro de la carpeta y abrir <http://localhost:8765>.
- En el Claude desktop está declarado en `.claude/launch.json` (nombre `trato`).
- Comprobación de sintaxis rápida: `for f in js/*.js; do node --check "$f"; done`.

## Estructura
```
index.html            shell (#root) + carga js/app.js
css/tokens.css        tokens aiRoss (+ tema oscuro "sala" en [data-theme="sala"])
css/app.css           todos los estilos (login, topbar, pretrade, tiles, ticket, dock/blotters, rpanel, console, broker)
js/data.js            BRAND, pares, tipos, festivos, CLIENTES ficticios, operaciones semilla, USUARIOS por canal
js/prices.js          motor de precios simulado (random walk), puntos fwd, tenores, calendario hábil, RFS 60 s
js/core.js            "core bancario" simulado: validaciones pre-trade, precio (PT + spread + mark-up), estados,
                      máquina de estados de ejecución, DO1/DO2, órdenes, anticipos/cancelaciones, log de integración
js/state.js           estado de sesión (S) + bus + workspaces
js/ui.js              helpers DOM, formato, toast, modal, menú contextual, CSV
js/ui-desk.js         canales SALA y TEL: topbar, pretrade, tiles, workspaces, dock, panel derecho
js/ui-ticket.js       ticket in-place (RFS), boleta de órdenes, anticipo, cancelación, cancelación genérica, detalle
js/ui-blotters.js     blotters (cliente: ejecutadas/OL/CO · posición · usuario), filtros, columnas, export, acciones fila
js/ui-broker.js       canal WEB (bróker de empresas): firma ágil, vista estándar/profesional, módulo de operación
js/app.js             login por canal, tema, consola de integración
docs/FUNCIONAL.md     especificación funcional (lo que simula y las reglas)
docs/PETICIONES.md    cómo pedir cambios + backlog vivo
docs/CHANGELOG.md     qué cambió en cada versión
```

## Convenciones que NO se rompen
1. **Posición de las cosas = la del sistema de referencia**; lo que cambia es el estilo. No mover bloques sin que Maxi lo pida.
2. **Identidad aiRoss**: navy `#071B57`, deep `#050F38`, acento `#2F7BFF`, gris `#55647A`, fondos `#F4F7FD`, líneas `#C7D2E8`,
   tipografía Geist / Geist Mono. Nada de cian ni lima. Sin "cajas" innecesarias: bordes finos, sombras suaves.
3. Lo editable por el usuario va en color acento (lo que en el sistema de referencia era naranja).
4. Sin frameworks ni build. Si un cambio "necesita React", no va.
5. Sin datos reales. Sin nombres de bancos ni de proveedores reales en el código ni en la UI ("core", "proveedor de
   liquidez", "sistema de tesorería").
6. Un cambio = un commit pequeño con mensaje en español. La rama de trabajo es `main` hasta que haya equipo tocando a la vez.
7. Antes de dar por hecho un cambio visual: abrirlo en el navegador, sin errores de consola, y mirar el tema claro y el oscuro.

## Repo, ramas y despliegue
- Repo: **`aiRoss-Solutions/trato`** (privado). Rama por defecto **`develop`**.
- Circuito del equipo (regla de **Javi Hombrados / Kairos**): se trabaja en `develop` = **UAT**, y se promueve a
  `main` = **PRO**. Claude y el resto **solo tocan código, commit y push**.
- **No se toca la infra**: ni proyectos/settings/dominios de Vercel, ni GitHub Actions, ni secretos
  (`VERCEL_TOKEN`, `ORG_ID`, `PROJECT_ID`). Eso lo cablea Javi, que es el dueño del circuito.
- El sitio es **estático puro**: no hay build. Quien monte el deploy solo necesita servir la raíz del repo
  (sin install, sin build command, output = `.`). `robots.txt` ya deja el entorno como no indexable.
- Si el deploy no sale o hace falta permiso/config, **avisar a Javi, no tocar**.

## Estado 21-sep-2026 · v0.3 en rama `v0.3-layout` (publicada en `/v3/`)
- **Cambio de enfoque**: Trato ya no es un clon; es "el destilado de varios proyectos de distribución" con imagen aiRoss.
  Layout propio (ver `docs/FUNCIONAL.md` §0), glosario propio (`js/glossary.js`), multiventana (`js/sync.js`), navy por
  defecto en mesa. Benchmark en `docs/BENCHMARK-v0.3.md`, prompt en `docs/PROMPT-v0.3.md`, incógnitas en `docs/UNKNOWNS.md`,
  discurso en `docs/DISCURSO.md`.
- **Tres entornos publicados**: PRO `/trato/` (main), UAT `/trato/uat/` (develop = v0.2.1, la versión anterior, guardada
  también como tag `v0.2.1`), **V3 `/trato/v3/`** (rama `v0.3-layout`). Cuando Maxi apruebe v0.3 se mergea a `develop`.
- Regla del glosario: **nunca** volver a escribir en la UI "clave de arbitraje", "línea 89", "firma ágil", "cliente
  genérico", "call order", "DO1/DO2", "switch", "tutor", "bróker". Los códigos internos (`tipoOp`, estados) sí se mantienen.

## Estado 20-sep-2026 · decisión vigente
- Camilo revisó v0.1 (44 defectos, 18 peticiones; material en la carpeta Dropbox compartida). En v0.2 se implementó **todo lo
  correctivo/heredado** (P-001…P-011, P-017, P-018, parte de P-016).
- **Decisión de Maxi (20-sep): solo lo heredado.** **Revisada el 21-sep: «metamos todo lo nuevo»** → P-012…P-015 implementadas
  en v0.3.1 con chip NUEVO y un interruptor global (☰ → Capa aiRoss) para apagar la capa en una demo solo heredada.
- Estado por petición en `docs/PETICIONES.md`.

## Cómo se pide un cambio (para Lucio, Camilo, Javi)
- Escribir la petición en `docs/PETICIONES.md` (o en la carpeta compartida de Dropbox `peticiones/`) con la plantilla:
  **qué**, **dónde** (pantalla / canal), **por qué** (valor para el cliente o para la demo), **prioridad**.
- Su Claude puede implementarla directamente en una rama `peticion/<slug>` y abrir PR, o dejarla escrita para que la haga Maxi.
- Regla: lo funcional que salga de los manuales del sistema de referencia se **respeta**; lo nuevo se **marca como nuevo** en la UI
  (chip "nuevo") para que en demo se distinga lo heredado de lo que aporta aiRoss.

## Glosario mínimo
- **Clave de arbitraje**: operación de contado que no es conversión entre cuentas del cliente (exige observaciones).
- **Conversión**: contado entre cuenta de cargo y cuenta de abono del cliente (spot, hoy o mañana).
- **Seguro de cambio (SC)**: forward con fecha valor > spot; consume línea "89 …". **Flexible**: con ventana de disposición
  (fecha disponibilidad estándar = 20 % del plazo; el cliente puede elegir una posterior).
- **Anticipo / Cancelación**: operaciones sobre un SC vivo (cancelación = dos patas).
- **PT** precio de trading (proveedor) · **Spread de trading** (mesa) · **Mark-up** (margen cliente, ‰ por nivel oro/plata/bronce
  o personalizado) · **PC** precio cliente = PT ± spread ± mark-up.
- **DO1 / DO2**: mensajes al core al ejecutar (alta) y al completar (cierre). Se ven en la *Consola de integración*.
- **Switch proveedor → libros**: ON = la cobertura va al sistema de tesorería del banco; OFF = el proveedor cubre en mercado.
- **Canales**: SALA (mark-up editable, cliente genérico, órdenes) · TEL (ve márgenes, no los toca) · WEB (solo precio final).

## Entornos publicados (GitHub Pages)
- **PRO** ← rama `main` → <https://aiross-solutions.github.io/trato/>
- **UAT** ← rama `develop` → <https://aiross-solutions.github.io/trato/uat/> (chapa naranja "UAT · v0.2")
- **V3** ← rama `v0.3-layout` → <https://aiross-solutions.github.io/trato/v3/> (chapa azul "V3 · rediseño")
- Los publica `.github/workflows/pages.yml` en cada push a `main` o `develop`. No hay build: se copian los ficheros tal cual.
- El repo es **público** para poder usar Pages con el plan free de la org; por eso aquí no entra **ningún** dato, nombre ni
  documento real de cliente. Todo eso vive en Dropbox, no en el repo.
- Esto **no** es el circuito de Vercel de Javi: no comparte workflows ni secretos con `el_espacio` / `aiross_web`.
