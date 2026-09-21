# Changelog

## v0.3.0 — 2026-09-21 · de "clon" a plataforma propia (rama `v0.3-layout`, publicada en `/v3/` para comparar con UAT v0.2)
Decisión de Maxi (21-sep): Trato debe parecer el destilado de varios proyectos de distribución, no un clon. Benchmark en
`docs/BENCHMARK-v0.3.md`; prompt en `docs/PROMPT-v0.3.md`; incógnitas y defaults en `docs/UNKNOWNS.md`.
- **Bloque 1 · glosario** (`js/glossary.js`): códigos internos estables, etiquetas propias. Fuera los términos del sistema de
  referencia: clave de arbitraje → *Spot*, conversión → *Cambio entre cuentas*, línea 89 → *Línea de riesgo FX* (`LR …`),
  firma ágil → *Sesión operativa*, cliente genérico → *Cliente por asignar*, call order / aviso → *Alerta con llamada* /
  *Alerta de precio*, DO1/DO2 → alta / evento de ciclo de vida, switch → *Cobertura en libros*, tutor → *Gestor*, markup
  completado → *Margen confirmado*, bróker → *Empresas*, canales MESA / TEL / WEB. Borrador EN "a validar por negocio".
- **Bloques 2-5 · layout de mesa propio**: cabecera fina solo con lo global (marca, workspace, modo, órdenes, ⌘K, reloj +
  entorno, usuario, menú) · **dos filas visibles** a 1440×900: tiles compactos 5 por fila + paneles *Posición viva*, *Órdenes
  y alertas vivas*, *Estado de la plataforma*, *Últimas operaciones* · **Actividad** a la derecha (360 px, plegable): tarjetas
  por operación en tiempo real, filtros cliente / mías / mesa y todas / vivas / fwd / órdenes / alertas, "ver como tabla",
  ⋯ acciones y clic → detalle · **barra inferior de cliente y contexto** (cliente, cuentas, línea, ordenante + ID, gestor,
  MiFID, LEI, margen, saldo, disponible, contacto), plegable · **paleta ⌘K** (cliente, NIF, par, acciones) · **tema navy por
  defecto en mesa** (claro en empresas), cian de mercado para streaming y chips FWD/FLEX.
- **Bloque 6 · multiventana**: `js/sync.js` (BroadcastChannel, fallback `storage`); `?panel=actividad|posicion|ordenes|
  plataforma|ultimas|precios|consola` abre un panel en ventana propia con cabecera, reloj y entorno; se sincronizan
  operaciones, líneas, configuración, cliente y contexto, modo y tema; una hija puede ejecutar (rango propio de idGlobal y
  referencias); la consola en ventana recibe los eventos de la mesa; aviso con enlace si el navegador bloquea la ventana.
- **Liquidez multi-proveedor** (pedido de Maxi 21-sep): bloque *Liquidez* arriba de la columna de Actividad con **Mejor precio /
  Proveedor A / B / C** (tres proveedores simulados con sesgo y ancho de spread propios; «Mejor precio» toma por cada lado el más
  barato). Los tiles muestran el proveedor que da cada lado (`LP·B`), el ticket y la boleta cotizan con el proveedor activo, la
  elección se sincroniza entre ventanas y aparece en *Estado de la plataforma*.
- **Asistente de mesa (chip NUEVO, demo)** abajo de la columna de Actividad: responde con reglas sobre los datos de la pantalla
  (posición viva, última operación, número de operaciones, precio «EUR/USD 3M», línea de riesgo, proveedor, glosario). Es el hueco
  donde en producción iría el LLM corporativo del banco; sin conexión a ningún modelo.
- **Tema claro equilibrado por defecto**: cabecera navy · tiles blancos con borde navy arriba sobre fondo blanco · Actividad en
  celeste · barra inferior en escala de navys. El todo-navy queda como opción. Fila 2 con altura fija (sin superposición al hacer
  scroll) y tiles más bajos para que las dos filas quepan a 1440×900.
- **Bloque 7 · disposición recordada**: se guarda por usuario qué paneles están en ventana; al entrar se ofrece *Restaurar
  disposición*; sección *Ventanas* en el menú.
- Sin cambios en `core.js` salvo sincronización: toda la lógica de negocio de v0.2.1 se mantiene.
- Pendiente de v0.3 (anotado en UNKNOWNS): capturas en `docs/capturas/v0.3/`, prueba en Safari/Firefox, lock del RFS por tile
  entre ventanas (hoy dos ventanas pueden pedir precio del mismo par), semáforo de divisa y panel de situación del canal
  empresas (queda para v0.3.1: el canal empresas conserva el layout v0.2 con tema claro).

## v0.2.1 — 2026-09-21 · observaciones de Lucio (solo lo actual)
- Reloj del sistema `dd/mm/aaaa · hh:mm:ss` y chip de entorno **LOCAL / UAT / PRO** en cabecera de sala y bróker y en el pie del login (L-obs-2).
- El ticket muestra **FORWARD · SEGURO DE CAMBIO** para que se vea el tipo de orden además del nombre de producto (L-bug-1).
- Tips de Lucio (XLS como reference data, market data real, multi-idioma) → `docs/PETICIONES.md` § Roadmap (R-01…R-03).

## v0.2 — 2026-09-20 · correctivos de la revisión de Camilo (solo funcional heredado, nada nuevo)
Origen: `2Trade-Trato/contexto/2026-09-20-camilo-Review-Trato-v0.1/` (44 defectos, 18 peticiones). Se implementaron **P-001 a P-011, P-016 (parte), P-017 y P-018**. P-012 a P-015 (propuestas aiRoss con chip "nuevo") quedan aparcadas por decisión de Maxi.
- **P-003** signo del margen con un único criterio (`core.marginSign`: ¿el cliente compra la divisa base?) en ticket, anticipo y cancelación; semillas SC-165578 y SC-165601 coherentes.
- **P-001** orden limitada: el límite debe ser mejor que el precio actual del cliente (si ya es alcanzable, se rechaza con mensaje); la vigilancia sigue el nivel de trading y ejecuta al alcanzarlo; el beneficio de la boleta es solo el margen.
- **P-002** línea de seguro de cambio: se consume al ejecutar forwards (también órdenes limitadas a plazo y mark-up completado a posteriori), se restaura con anticipos y cancelaciones, exige que su divisa sea una del par y compara el disponible en la divisa de la línea; cabecera y pre-trade se refrescan; las semillas ya consumen línea al arrancar.
- **P-004** cancelación en **dos patas** enlazadas (`-A` anticipo + contraria) con liquidación por diferencias; posición = nominal vivo (anticipos y cancelaciones descontados).
- **P-005** canal web: sin Precio oficina, Usuario, Canal, Markup ni Observaciones en blotter, menú de columnas, CSV y detalle.
- **P-006** precio oficina de forwards nuevos = mercado a plazo (spot trading + puntos), en ticket y web.
- **P-007** comisión única en `core.comision`: 25 € hasta 100.000, 0 después (como decía FUNCIONAL §5).
- **P-008** precio caducado: estado *Precio expirado*, precio atenuado y tachado, Aceptar deshabilitado, *Solicitar precio* como acción principal.
- **P-009** responsive < 900 px: login en una columna, bróker apilado (módulo de operación, precios, blotter), pie fijo, modales a ancho completo.
- **P-010** fechas: tenores desde **spot** en semanas/meses de calendario con ajuste al siguiente hábil (fin de mes respetado); fecha de arbitraje = fecha valor − 1 hábil (`addBiz` admite negativos); FDE y FDC en día hábil; formato único `dd/mm/aaaa`.
- **P-011** boleta: nominal y límite > 0, fecha de validez ≥ hoy, observaciones reales (contado = clave de arbitraje), *Aceptar* deshabilitado y *Nueva operación* oculto hasta *Solicitar*; anticipo y cancelación rechazan importes ≤ 0.
- **P-016** (parte): lados de precio operables con teclado (Enter/Espacio, foco visible, `role=button`), modales con Escape, foco inicial y `role=dialog`, toasts `aria-live`.
- **P-017** pulido: LEI muestra el código, referencias nuevas `SC-`/`CV-` como las semillas, nombre de cliente en semillas, consola sin cortar entidades HTML, canal web siempre en tema claro, panel de precios también en vista profesional, toasts por encima de la chapa UAT, cabecera del bróker sin recortes, **detalle de operación rediseñado** por bloques (B-01).
- **P-018** higiene: validación de saldo en conversiones; rechazos aleatorios (last look 3 %, asiento 2 %) pasan a interruptor de demo **OFF** por defecto (☰ → Rechazos aleatorios).

## v0.1 — 2026-09-18
- Primera versión navegable: login por canal (SALA / TEL / WEB), cabecera con contexto de operación, pre-trade, tiles con
  precio en vivo, ticket in-place con RFS de 60 s y desglose de márgenes, seguros de cambio y flexibles, anticipos y
  cancelaciones, boleta de órdenes (limitada / call / aviso) con vigilancia de mercado, cliente genérico y reasignación,
  blotters (cliente / posición / usuario) con filtros, columnas, CSV y acciones por fila, canal web con firma ágil y vistas
  estándar / profesional, consola de integración (CORE / WS / FIX / MQ), switch proveedor → libros, tema claro y "Sala".
- Datos 100 % ficticios (entidad 0999). Paleta aiRoss. Distribución en pantalla heredada del sistema de referencia.
- Ajustes tras la primera revisión de Maxi: contornos de panel más definidos, cabecera en una sola línea, campo de
  observaciones en su propia fila con regla conmutable, botones ⋯ / ⓘ en las filas del blotter, resultado del bróker sin
  desbordes, textos legibles en tema oscuro.
