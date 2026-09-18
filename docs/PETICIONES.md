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

## Bandeja de entrada
_(vacía)_

## En curso
_(vacío)_

## Backlog propuesto (ordenado)
| # | Qué | Dónde | Por qué | Estado |
|---|---|---|---|---|
| B-01 | Detalle de operación con diseño (no key/value crudo) y acciones dentro del modal | blotters → Más info | primera cosa que abre cualquier usuario | pendiente |
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
- v0.1 (2026-09-18): primera versión navegable completa (ver `docs/CHANGELOG.md`).
