# CLAUDE.md — Trato (prototipo navegable de distribución FX)

> Léelo entero antes de tocar nada. Es el cerebro del proyecto para cualquier Claude (el de Maxi, Lucio, Camilo o Javi).
> Última actualización: 2026-09-18.

## Qué es
- **Trato** es un prototipo **navegable, sin backend**, de una plataforma de **distribución de divisa** de un banco:
  sala (sales trading), banca telefónica y web de empresas (bróker).
- Simula la operativa completa: contado, seguro de cambio (forward), seguro de cambio flexible, anticipos y cancelaciones,
  órdenes limitadas / call orders / avisos, cliente genérico, mark-up de la mesa, blotters, posición, firma ágil del canal web.
- **No es 2Trade ni se llama así en ningún sitio.** Toma la *distribución en pantalla* de un sistema de referencia (manuales de
  usuario) pero con estilo propio (paleta aiRoss navy, sin cajas). El nombre "Trato" es provisional y vive en una sola
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
