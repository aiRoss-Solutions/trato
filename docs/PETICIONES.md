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

## Backlog propuesto (ordenado)
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
