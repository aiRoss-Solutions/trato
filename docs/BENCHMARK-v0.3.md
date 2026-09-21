# Benchmark de mercado para Trato v0.3 · 21-sep-2026

Lo que hay ahí fuera y qué nos llevamos. Solo fuentes leídas hoy; lo que no se pudo verificar va marcado.

## 1. Plataformas single-dealer de bancos (lo que mira una mesa como la de Bankinter)
| Plataforma | Qué destaca | Qué nos llevamos |
|---|---|---|
| **Citi Velocity 3.0** (mejor SDP FX Markets) | Rediseñada sobre **modularidad**: "eFX à la carte", microservicios que permiten componer la funcionalidad por usuario en vez de una plantilla única | Trato se compone por **rol y workspace**: el usuario elige qué paneles ve, no hay una pantalla fija |
| **UBS Neo** (mejor SDP Euromoney 2025) | "Workspace integrado" de pre-trade → ejecución → post-trade; analítica **embebida junto a la ejecución**; **autoservicio del ciclo de vida** (rolls, allocations, amendments) para depender menos del sales | El canal empresas hace anticipos, cancelaciones y prórrogas **solo**; el precio se explica en contexto (cuando Maxi abra la capa "nuevo") |
| Adaptive (SDPs a medida, Reactive Trader) | UIs de sales y de cliente separadas sobre el mismo core; UAT con despliegues diarios | Dos frontales (sala / empresas) sobre un `core.js` común: **ya es así**, mantenerlo |


## 1b. Ampliación (21-sep, sesión v0.3) — tres SDP más
| Plataforma | Qué se pudo verificar | Qué nos llevamos |
|---|---|---|
| **J.P. Morgan Execute** (mejor SDP 2024) | Un **blotter de órdenes integrado escritorio + móvil**; catálogo de órdenes muy amplio (take profit, stop, trailing, call, TWAP+, *spot contingent forward*, IF Done / OCO); analítica de cartera (exposiciones, ratios de cobertura); liquidación casi en tiempo real (2025); paridad web/escritorio/móvil. Sin capturas de UI: **no verificado** el layout | El **blotter es una sola cosa en todos los canales** (misma fuente, distinta vista); las órdenes son un producto de primera, no un modal escondido |
| **Barclays BARX** | Cross-asset; pre-trade (análisis de volumen) y post-trade (TCA) en la misma plataforma; acceso por GUI propia, FIX y multi-dealer. Sin detalle de UI: **no verificado** | Analítica **antes y después** de la operación en el mismo sitio; Trato ya tiene la consola de integración como "post-trade visible", el pre-trade está en la cabecera |
| **Goldman Marquee** (innovación financiera del año, Euromoney) | **MarketView: dashboards personalizables y compartibles**; Marquee Trader para ejecución FX integrado con la analítica; menús configurables | Los **workspaces guardados y compartibles** entre usuarios (un jefe de mesa publica su disposición al equipo) encajan con las "disposiciones" multiventana |
| Deutsche Autobahn FX | Solo historia (1996/2002) y notas de prensa; **nada de UI verificable** | — |

Conclusión añadida: en los tres, la **personalización del espacio de trabajo** y el **blotter único multi-canal** son lo diferencial; ninguno vende un layout fijo.

## 2. Portales de divisa para empresas de la banca española (competencia directa del canal web)
| | Qué hacen | Qué nos llevamos |
|---|---|---|
| **CaixaBank FX Now** | Contratación **en dos clics** (nominal + plazo), 68 pares spot y plazo, **"semáforo de divisa"** (máximos/mínimos anuales frente al precio), histórico, noticias, anticipar/prorrogar operaciones, wallets en 30 divisas, firma simplificada tras el alta | Ticket web de **dos campos**; un **semáforo** por par en el panel de precios; prórroga como acción del ciclo de vida |
| **BBVA eMarkets** | Spot y forward en tiempo real, ejecución en dos clics, **ventanas de precio independientes (pop-up)**, acceso **multi-entidad** (filiales operan por separado), histórico, 01:00–23:00 CET | La **multiventana ya es estándar** hasta en el canal empresas de un banco español; multi-entidad = selector de empresa del grupo |
| Santander (contratación digital de divisas, 2020) | Digitalización de la contratación para empresas internacionalizadas | Sin detalle de UI verificable |

## 3. Fintechs de gestión de divisa (lo que el cliente empresa compara)
Kantox (mejor e-FX corporates 2019), Ebury, iBanFirst: **dashboard primero** (exposición, coberturas vivas, vencimientos), forwards hasta 12 meses, cuenta multidivisa, pagos. Crítica repetida a Ebury: interfaz "funcional pero **anticuada**". → El canal web de Trato entra por un **panel de situación** (posición viva, vencimientos próximos, semáforo), no por la boleta.

## 4. Multi-dealer (lo que usa la propia mesa para cubrirse)
360T **Bridge**: GUI de RFS "diseñada por traders para traders"; streaming + RFS; EMS para automatizar. Bloomberg **FXGO**: RFQ/RFS, batch multi-leg, algos, pre-trade y riesgo en el mismo flujo. FXall: RFQ/RFS/algo y post-trade. → Vocabulario y ritmo de la sala: **streaming siempre visible, RFS bajo demanda, boleta con lotes**.

## 5. Multiventana y escritorio de trading
- **OpenFin / Finsemble / io.Connect (FDC3)**: la norma en mesas. Vistas en pestañas, en rejilla o en **ventanas separadas**; **snapshots** que guardan y restauran el estado completo del escritorio (posición de ventanas, layout, estado de la app); snapshots preconfigurados por la organización; contexto compartido entre ventanas (FDC3). BidFX lanzó su escritorio FX sobre OpenFin para trabajo remoto.
- **Reactive Trader** (Adaptive, open source): tiles de precio y blotter que se **arrancan a ventanas propias**; layouts guardados.
- En navegador puro: `window.open` + **BroadcastChannel** (o `storage` event) es la técnica documentada para varias ventanas de la misma app.
→ Trato: **pop-out por panel + "disposiciones" guardadas y restaurables + sincronización por BroadcastChannel**. Es exactamente lo que espera un trader; no es un extra.

## 6. Principios de diseño de terminales (fuentes: Charles River, HRT, Devexperts, guías 2026)
1. **Oscuro por defecto** en aplicaciones abiertas horas con alta densidad: el fondo oscuro "retrocede" y los datos destacan; menos fatiga. Claro como opción.
2. **Densidad antes que aire** para profesionales (Bloomberg: rejillas compactas, tipografías pequeñas); **revelación progresiva** para el cliente no profesional.
3. **Color con semántica fija** y contraste comprobado (CVD): un color = un significado en toda la app.
4. **Vista de monitorización separada de las vistas de detalle** (HRT): lo poco relevante fuera de la pantalla principal.
5. **Modular y componible**: cada panel es movible y **cualquier función se abre en ventana propia**; el trader moldea el espacio a su flujo.
6. Evitar lo "**demasiado cargado, demasiado igual a lo heredado, demasiado dato inútil**" (Devexperts): cada elemento sirve al flujo o sobra.
7. Simplicidad a primera vista con "versión completa" a un clic.

## 7. Conclusiones de diseño para Trato v0.3 (recomendación, no dogma)
- **Sala (SALA/TEL): tema oscuro navy por defecto** (`#050F38` base, paneles `#0B1C55`, acento `#2F7BFF`, cian de mercado `#2AA7DF` para streaming/estado). El claro se conserva. Sabadell era negro; el navy nos da lo mismo con marca aiRoss.
- **Estructura**: barra superior fina (global) · **centro en dos filas** (fila 1 tiles compactos; fila 2 paneles configurables: posición viva, órdenes vivas, estado de plataforma, últimas operaciones) · **columna derecha "Actividad"** (360 px, plegable) con las operaciones como **tarjetas verticales en tiempo real**, filtro por estado y "ver como tabla" · **barra inferior de contexto de cliente** plegable (cliente, cuentas, línea, ordenante, MiFID/LEI/margen). Se mantiene la idea de Maxi del panel vertical **a la derecha** porque coincide con el patrón "feed de actividad" de los SDP y libera la fila inferior para la segunda fila de paneles.
- **Cliente como contexto, no como cabecera**: se elige con ⌘K (paleta de comandos: cliente, par, acción) y queda visible abajo. Cambiar de cliente no debe re-pintar toda la pantalla.
- **Teclado primero** en sala: ⌘K, Enter para pedir precio, flechas para pips, Esc cierra.
- **Canal empresas**: entra por **panel de situación** (semáforo, posición viva, vencimientos), ticket de **dos campos**, autoservicio de anticipo/cancelación/prórroga, ventanas de precio independientes, tema claro, móvil.
- **Multiventana**: ⧉ en cada panel, disposiciones guardadas ("Mesa 3 pantallas", "Portátil"), sincronización por BroadcastChannel, URLs relativas para Pages.

## Fuentes
- J.P. Morgan, *Execute* (ficha de producto, App Store) · Corporate Alliance, *Deep dive JPM Execute* · Global Finance, *GW Platt FX Tech 2025*
- Barclays, *BARX FX* · The TRADE, *Barclays adds FX to BARX* · Goldman Sachs, *Marquee* · The Full FX, *Marquee MarketView* · Euromoney, *Financial innovation of the year: Marquee*
- Euromoney, *The world's best FX single-dealer platform 2025: Neo by UBS* · FX Markets, *Best single-dealer platform: Citi* · IFR, *Revenge of the single-dealer platform*
- CaixaBank, *FX Now* (nota de prensa y ficha de producto) · BBVA, *Operativa de divisas / eMarkets* (resumen de buscador; la página de BBVA CIB devolvió 403)
- Kantox, Ebury, iBanFirst (fichas de producto y comparativa iBanFirst vs Ebury) · CTMfile, *Best e-FX platform for corporates*
- 360T, *Products* · Bloomberg, *FXGO for corporate treasury* · LSEG, *FXall*
- Adaptive, *Reactive Trader on OpenFin Platform API* · FlexTrade, *Desktop interoperability on the trading desk* · interop.io, *Multi-window applications* · johnman, *openfin-multi-window-communication*
- Hudson River Trading, *Optimizing UX/UI design for trading* · Devexperts, *Trading platform UX/UI design no-nos* · Charles River, *Why the dark matters* · Lollypop, *Trading app design guide 2026*
