# Changelog

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
