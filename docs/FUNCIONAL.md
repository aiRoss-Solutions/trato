# Especificación funcional — Trato v0.1

Lo que el prototipo **simula** hoy, con las reglas que aplica. Todo corre en memoria del navegador; al recargar se pierde lo
operado (las operaciones semilla vuelven). Los textos entre comillas son los literales que ve el usuario.

## 1. Acceso y canales
| Canal | Usuario demo | Puede | No puede |
|---|---|---|---|
| **SALA** (sales trading) | Laura Bermúdez | ver y **modificar el mark-up**, operar con **cliente genérico**, dar de alta órdenes, ver márgenes y beneficio | — |
| **TEL** (banca telefónica) | Diego Arribas | operar, ver márgenes, dar de alta órdenes | modificar mark-up (va siempre "completado"), cliente genérico |
| **WEB** (web de empresas, "bróker") | Sergio Alcaraz (apoderado del cliente) | operar sobre **su** empresa, órdenes, ver precio final | ver desglose de márgenes, elegir cliente |

- SALA y TEL entran "desde el host del banco" (login por canal). WEB pide **firma ágil**: tiempo (obligatorio) y nº de
  operaciones (opcional); al agotarse cualquiera de los dos, cada operación pediría firma individual (se simula bloqueando
  *Contratar* y ofreciendo "Renovar"). Los **avisos** no descuentan firma.

## 2. Cabecera y contexto de operación (SALA / TEL)
- Modo **SPOT / FWD** o **FWD FLEXIBLE** (un solo tile grande con ventana de disposición).
- **Cliente**: por nombre o NIF (autocompletado). Al conectar, el core devuelve: cuentas, líneas 89, ordenantes, tutor,
  MiFID (ok / warn / ko), titular MiFID, LEI y fecha de renovación, email, teléfono, margen (‰) y si es personalizado (spot/fwd).
- Selectores: **cuenta de cargo**, **cuenta de abono**, **línea de seguro de cambio** (empiezan por 89), **ordenante**
  (apoderado o no). Cambiarlos se registra en la consola como "contexto de operación".
- **Pre-trade** (12 datos de solo lectura): ID persona, tutor, saldo cuenta origen, límite de línea, estado MiFID, titular
  MiFID, código LEI, fecha renovación LEI, email, teléfono, ordenante, margen personalizado.
- **Workspaces** (▦): conjuntos de pares guardados (G10 por defecto), crear/renombrar/borrar/favorito.
- **RFS**: abre la boleta de órdenes (ver §6). **☰**: panel derecho (tema, idioma, consola, switch, reglas demo, salir).
- **Cliente genérico** (solo SALA, solo tras haber conectado un cliente real): todos los tiles pasan a "Otros", solo
  claves de arbitraje, sin margen de cliente; la operación queda pendiente de **reasignar** a un cliente real (§7).

## 3. Tiles de precio
- Rejilla de tiles por par; cada tile: bandera + par (clic = cambiar par), tipo **Otros** (clave de arbitraje / seguro de
  cambio) o **Conversión** (contado entre cuentas del cliente), fila **Obs.** (observaciones), dos lados **COMPRAR X /
  VENDER X** con el precio grande (pips destacados), divisa de operación (⇄ alterna base/cotización), importe con atajos
  `30K`, `6M`, fecha valor, tenor (TOD, TOM, SPOT, 1W…1Y) y reloj desde el último tick.
- Precio en tiempo real: random walk sobre un mid por par, spread de trading por par. Si no hay tick en 3 s el reloj se pone
  en ámbar ("stale"). Reconexión simulada del proveedor a las 06:00.
- Tenor > SPOT ⇒ la operación pasa a **seguro de cambio** (forward) automáticamente y muestra puntos fwd.
- Fecha no hábil ⇒ se ajusta al siguiente hábil (fines de semana + festivos de `data.js`).

## 4. Validaciones pre-trade (antes de pedir precio)
1. Importe > 0. 2. Cliente seleccionado. 3. Cliente **MiFID ko** ⇒ no puede operar.
4. **Clave de arbitraje exige observaciones** (regla del sistema de referencia; conmutable en ☰ → "Observaciones obligatorias").
5. **Forward**: una de las dos divisas debe ser EUR; hace falta línea 89 y disponible suficiente.
6. **Conversión**: cargo y abono de las dos divisas del par y de divisas distintas.
7. Cliente genérico: solo claves de arbitraje.
Cada validación queda en la consola como `core.trading.validacionPreTrade` (OK/KO y motivos).

## 5. Ticket (in-place, dentro del tile)
- Estados visibles: *Solicitud pendiente* → *Precio recibido* (RFS de **60 s**, barra de vigencia) → *Validando operación* →
  *Ejecutando* → **Ejecutada** (o *Rechazada en mercado* por last look ~3 %, *Rechazada* por asiento en core ~2 %,
  *Confirmada en mercado* si falta completar mark-up).
- Desglose (SALA y TEL): **precio trading** (proveedor), **final spot**, **puntos fwd** (si forward), **spot pips** (mark-up
  en pips, editable con ± en SALA), **fwd pips**, **precio final**, **contravalor**, **beneficio** estimado en EUR.
  Fórmula: `PC = PT ± spread_trading ± mark-up`, mark-up = ‰ del cliente (nivel oro/plata/bronce o personalizado spot/fwd),
  el margen siempre empeora el precio al cliente; sobre los puntos fwd se aplica un 10 % (regla del prototipo).
- **Mark-up completado**: checkbox (SALA). Si se desmarca, la operación se ejecuta en mercado pero queda *Confirmada en
  mercado* hasta que alguien la complete desde el blotter de usuario ("Completar markup") y entonces viaja al core (DO1).
- Botones: **Aceptar** (ejecuta), **Rechazar** (descarta el precio), **Solicitar precio** (nuevo RFS), ⇄ cambia dirección.
- Al ejecutar: referencia, idGlobal, comisión (regla: 25 € hasta 100k, 0 a partir de 100k), cuenta de comisión;
  **DO1** a la cola; con **switch ON** la cobertura va al sistema de tesorería, con OFF el proveedor cubre en mercado.
- **Fwd flexible**: además fecha de disponibilidad estándar (20 % del plazo), fecha elegida por el cliente, puntos fwd de
  la FDC y puntos "flexibles".

## 6. Órdenes (boleta RFS)
- Tipos: **Orden limitada** (contado o seguro de cambio), **Call order**, **Aviso**. Campos: par, divisa, nominal, dirección,
  tipo de orden, fecha valor, fecha validez, precio límite, observaciones. *Solicitar* calcula los datos (contravalor,
  fecha arbitraje si fwd) y *Aceptar* la da de alta en estado **Orden enviada a mercado**.
- Vigilancia: cuando el precio de mercado toca el límite la orden pasa a **Ejecutada** (y se asienta), los call orders /
  avisos a **Aviso disparado**. Caducidad por fecha de validez. Cancelable desde el blotter mientras esté viva.

## 7. Blotters (dock inferior, plegable)
- **Operaciones del cliente**: sub-pestañas *Ejecutadas*, *Órdenes limitadas*, *Call orders / Avisos*. Columnas del sistema de
  referencia (fecha, referencia, tipo orden, tipo operación, importes compra/venta, fecha valor, precio cliente, precio
  oficina, liquidación, cuentas, fecha arbitraje, disponibilidad, ejecución, usuario, canal…).
- **Posición en seguros de cambio**: nominal vivo por par y divisa, agregando SC, flexibles, anticipos y cancelaciones.
- **Operaciones del usuario**: todo lo que operó el usuario conectado, con **estado**, mark-up completado o no (fila marcada),
  idGlobal, observaciones y canal.
- Herramientas: **filtros** (fechas, tipo, estado, importes; regla: rango máximo y "sin cliente ⇒ sin datos"), **actualizar**,
  **exportar CSV**, **columnas** visibles/ocultas, plegar.
- Acciones por fila (⋯, clic derecho o doble clic para el detalle): **Anticipar** y **Cancelar operación** (solo sobre SC
  vivos; la cancelación genera dos patas), **Cancelar orden** (órdenes vivas), **Completar markup**, **Cancelar operación
  (reasignar a cliente real)** para las del genérico, **Más info** (todos los campos).

## 8. Canal WEB (bróker de empresas)
- Cabecera con cuentas de cargo/abono (⇄), línea 89 y saldo/límite. Vistas **Estándar** (blotter + precios + un módulo de
  operación) y **Profesional** (varios módulos de operación a la vez).
- Panel **Precios**: lista de pares con tenor seleccionable, añadir/quitar divisas, flechas de dirección.
- **Módulo de operación**: Compra/Venta, par, divisa base/cotización, importe, operación (contado / seguro / flexible), tipo
  de orden (spot-fwd / limitada / call / aviso), fecha vencimiento → **Iniciar operación** → precio ejecutable con
  cuenta atrás → **Contratar** (sin pantalla intermedia; tooltip lo avisa) → resultado con referencia y comisión.
- Pie: operaciones disponibles y tiempo restante de firma (parpadea en rojo al llegar al último cuarto), teléfono de
  atención y enlace "Renovar tiempo y operaciones".

## 9. Consola de integración (demo)
Cajón izquierdo con todo lo que "viaja": `CORE` (login, contexto, altas), `WS` (datos de cliente, validaciones, firma),
`FIX` (RFS al proveedor, ejecuciones, coberturas), `MQ` (DO1 / DO2). Sirve para explicar la arquitectura sin diagramas.

## 10. Lo que NO está (todavía)
- Persistencia (todo en memoria) · multiusuario · idioma EN (el conmutador existe, los textos no) · alertas por correo ·
  informes / auditoría · administración de usuarios y permisos · gestión de márgenes por cliente desde la UI ·
  calendario de festivos por divisa · límites intradía de la mesa · post-trade (confirmaciones, liquidación).
Ver `docs/PETICIONES.md` para el backlog.
