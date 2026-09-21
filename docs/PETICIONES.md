# Peticiones y backlog — Trato

## Cómo pedir algo
Copiá esta plantilla debajo de **Bandeja de entrada**, una petición por bloque. Tu Claude (o el de Maxi) la implementa,
mueve el bloque a **En curso / Hecho** y anota el commit.

```
### P-XXX · <título corto>
- Quién: <Lucio | Camilo | Javi | Maxi>   · Fecha: AAAA-MM-DD   · Prioridad: alta | media | baja
- Dónde: <canal / pantalla / componente>  (ej. SALA → tile → ticket)
- Qué: <qué debería pasar, en una o dos frases>
- Por qué: <valor para la demo o para el cliente>
- Heredado o nuevo: <"así lo hace el sistema de referencia" | "propuesta aiRoss" → llevará chip "nuevo">
```

Reglas: no mover bloques de sitio (solo estilo) salvo petición explícita; datos siempre ficticios; sin nombres reales de
bancos/proveedores en la UI; cada petición = un commit.

## Revisión de Camilo (20-sep-2026) — estado
Fuente: `2Trade-Trato/contexto/2026-09-20-camilo-Review-Trato-v0.1/` y `peticiones/2026-09-20-camilo-p-0XX-*.md`. Regla de Maxi: **solo lo heredado; nada nuevo de momento.**

| P | Qué | Tipo | Estado |
|---|---|---|---|
| P-001 | Orden limitada: validar límite frente al mercado | heredado | ✅ v0.2 |
| P-002 | Línea 89: consumir, restaurar, validar divisa | heredado | ✅ v0.2 |
| P-003 | Signo del margen en anticipos/cancelaciones, semillas | heredado | ✅ v0.2 |
| P-004 | Posición viva y dos patas de la cancelación | heredado | ✅ v0.2 |
| P-005 | Canal web sin datos internos | heredado | ✅ v0.2 |
| P-006 | Precio oficina a plazo en forwards nuevos | heredado | ✅ v0.2 |
| P-007 | Una sola regla de comisión | heredado | ✅ v0.2 (25 € ≤ 100k, 0 después) |
| P-008 | Ticket con precio caducado | heredado | ✅ v0.2 |
| P-009 | Bróker responsive | heredado | ✅ v0.2 (< 900 px apilado; la vista profesional se apila, no va en pestañas) |
| P-010 | Fechas: tenor desde spot, arbitraje, disponibilidad, formato | heredado | ✅ v0.2 |
| P-011 | Boleta: beneficio, botones, observaciones, importes | heredado | ✅ v0.2 |
| P-012 | Tope al mark-up manual y aviso fuera de mercado | **nuevo aiRoss** | ⏸ aparcada (decisión Maxi 20-sep) |
| P-013 | Trazabilidad de cotizaciones no cerradas | **nuevo aiRoss** | ⏸ aparcada |
| P-014 | Multibanco: varios proveedores y mejor precio | **nuevo aiRoss** | ⏸ aparcada |
| P-015 | Explicación del precio en una frase | **nuevo aiRoss** | ⏸ aparcada |
| P-016 | Accesibilidad básica | propuesta | ◐ v0.2 parcial (teclado en lados, Escape/foco en modales, aria-live); falta contraste de `ink-3`/`warn` y flechas de dirección |
| P-017 | Presentación y datos | pulido | ✅ v0.2 |
| P-018 | Higiene de código | higiene | ◐ v0.2 (saldo, rechazos como switch); pendiente: RFS huérfanos al re-renderizar tiles, estados muertos |

## Bandeja de entrada
_(vacía)_

## En curso
_(vacío)_

## Observaciones de Lucio (WhatsApp, 21-sep-2026) — qué se aplicó y qué va a roadmap
| # | Qué dijo | Tipo | Estado |
|---|---|---|---|
| L-bug-1 | "quedan todos como seguro de cambio, no como fwd" | actual | ✅ v0.2.1: el ticket muestra **FORWARD · SEGURO DE CAMBIO** (tipo de orden + tipo de operación). Nota: *seguro de cambio* es el nombre del forward en la banca española y en el sistema de referencia; se mantiene, pero ya no se oculta que es un FWD |
| L-obs-2 | falta la **fecha del sistema** arriba: los traders la miran para saber si están en PRO o en pruebas | actual | ✅ v0.2.1: reloj `dd/mm/aaaa · hh:mm:ss` + chip de entorno **LOCAL / UAT / PRO** en cabecera de sala, bróker y login |
| L-obs-1 | ¿back-end o 100 % JS? con la doc oficial se podría deducir la arquitectura actual (y hay que llevarla a otro territorio) | estratégico | anotado: es 100 % front, sin back; la arquitectura objetivo se decide en la propuesta, no en el prototipo |
| L-tip-1 | prototipo autocontenido con **XLS como reference data** que se lee al arrancar (contratos, usuarios, pares, operaciones previas); primero exportar a xls lo que se ve, luego alimentar a mano | mejora | 🗺 roadmap R-01 |
| L-tip-2 | conectar el **market data a Yahoo Finance** para que el precio sea real, no random | mejora | 🗺 roadmap R-02 (ojo CORS desde GitHub Pages: hará falta un proxy o un fichero de precios refrescado por Action) |
| L-tip-3 | **multi-idioma por usuario**; cuidado con la traducción de "seguros de cambio" | mejora | 🗺 roadmap R-03 (ya existe el conmutador ES/EN sin textos; el glosario EN lo fija negocio: *FX forward*, no traducción literal) |
| L-estrategia | cómo contarlo: no decir "lo hice en un rato con IA"; sí "rehicimos el frontal en una semana desde las specs originales"; no decir que tenemos el código fuente; añadir 3-4 puntos de mejora (multiproducto, microservicios, renovación tecnológica) | discurso | anotado para Maxi; no toca código |

## Roadmap (mejoras, no correctivos) — para la versión mejorada
| R | Qué | Origen | Notas |
|---|---|---|---|
| R-01 | Reference data en XLS/CSV leído al arrancar (clientes, cuentas, líneas, usuarios, pares, operaciones históricas) + exportación completa | Lucio tip 1 | permite cientos de clientes y miles de operaciones sin tocar código; encaja con B-08 |
| R-02 | Market data real (Yahoo Finance u otra fuente pública) con refresco periódico y fallback al random walk | Lucio tip 2 | CORS: proxy mínimo o fichero JSON regenerado por GitHub Action cada N minutos |
| R-03 | Multi-idioma por usuario (ES/EN) con glosario de negocio validado | Lucio tip 3 · B-02 | "seguro de cambio" → *FX forward*; "clave de arbitraje" → *FX spot (non-account)* a validar |
| R-04 | Capa "nuevo" aiRoss: P-012 tope mark-up, P-013 trazabilidad de cotizaciones no cerradas, P-014 multibanco, P-015 explicación del precio | Camilo | aparcadas por decisión de Maxi (20-sep) |
| R-05 | Rediseño v0.3: layout propio (no clon), navegación vertical de operaciones, barra de cliente abajo, ≥ 2 filas de paneles, multiventana para varias pantallas | Maxi 21-sep | ver `docs/PROMPT-v0.3.md` |

## Backlog propuesto v0.1 (ordenado)
| # | Qué | Dónde | Por qué | Estado |
|---|---|---|---|---|
| B-01 | Detalle de operación con diseño (no key/value crudo) y acciones dentro del modal | blotters → Más info | primera cosa que abre cualquier usuario | ✅ v0.2 (diseño por bloques; acciones dentro del modal, pendiente) |
| B-02 | Idioma EN completo (topbar, tiles, ticket, blotters) | global | demo con no hispanohablantes | pendiente |
| B-03 | Persistencia en `localStorage` (operaciones, workspaces, tema) | core/state | no perder lo operado al recargar | pendiente |
| B-04 | Panel de margen por cliente (‰ spot/fwd, nivel) editable desde SALA | ☰ o pre-trade | enseñar la palanca comercial | pendiente |
| B-05 | Avisos de mercado con notificación visual/sonora al dispararse | órdenes | hoy solo cambia el estado en el blotter | pendiente |
| B-06 | Pantalla de administración: usuarios, permisos por canal, switch, horarios del proveedor | nuevo módulo | completar el "producto" | pendiente |
| B-07 | Capa "asistente" (chip nuevo): resumen de la posición del cliente, sugerencia de cobertura, explicación del precio en lenguaje natural | SALA/TEL | es lo que aporta aiRoss encima de lo heredado | pendiente |
| B-08 | Modo presentación: datos semilla más ricos (20 clientes, 200 operaciones), reloj acelerado | data.js | demo más creíble | pendiente |
| B-09 | Responsive tablet (canal WEB) | broker | el bróker de empresas se usa fuera de la mesa | pendiente |
| B-10 | Tests de humo (Playwright) del recorrido de demo | tooling | que nadie rompa la demo | pendiente |

## Hecho
- v0.2 (2026-09-20): correctivos P-001…P-011, P-017, P-018 y parte de P-016 de la revisión de Camilo (ver `docs/CHANGELOG.md`).
- v0.1 (2026-09-18): primera versión navegable completa (ver `docs/CHANGELOG.md`).
