# Trato · prototipo navegable de distribución FX

Prototipo **solo front** (HTML + CSS + JS, sin build) que simula la operativa completa de una plataforma de distribución
de divisa para tres canales: **sala**, **banca telefónica** y **web de empresas**. Datos 100 % ficticios.

## Ejecutar
```bash
python3 -m http.server 8765 --bind 127.0.0.1
```
y abrir <http://localhost:8765>. (Cualquier servidor estático sirve; `file://` no, porque usa módulos ES.)

## Recorrido de demo (5 minutos)
1. **Login → SALA.** Escribir `Nortech Componentes SL` en *Cliente* (o el NIF `B87654321`). Se cargan cuentas, línea 89,
   ordenante y la cabecera pre-trade (MiFID, LEI, margen personalizado…).
2. En el tile **EUR/USD** poner un motivo en *Obs.*, importe `50K` y pulsar **COMPRAR USD** → el ticket se abre *dentro del
   tile*: precio de trading, spot pips, mark-up (editable en SALA), precio final, beneficio, barra de vigencia de 60 s.
   **Aceptar** → Validando → Ejecutando → **Ejecutada** (ref y comisión). Aparece en *Operaciones del usuario* y en
   *Operaciones del cliente → Ejecutadas*.
3. Cambiar el tenor del tile a `3M` → el mismo flujo es un **seguro de cambio** (usa la línea 89, muestra puntos fwd).
4. **RFS** (cabecera) → boleta de **orden limitada / call order / aviso** → *Solicitar* → *Aceptar* → estado *Orden enviada
   a mercado*; en el blotter *Órdenes limitadas* se puede cancelar con ⋯.
5. En *Operaciones del cliente → Ejecutadas*, sobre un seguro de cambio vivo: ⋯ → **Anticipar** o **Cancelar operación**.
6. Menú ☰ → **Consola de integración**: se ve todo lo que "viaja al core" (login, contexto, RFS, DO1, DO2, switch).
7. Salir y entrar por **WEB**: firma ágil (tiempo + nº de operaciones), vista *Estándar* / *Profesional*, precios en vivo,
   **Contratar** sin pantalla intermedia; el contador de firma baja en el pie.
8. Menú ☰ → Tema **Sala** para el modo oscuro de mesa.

## Documentación
- [`CLAUDE.md`](CLAUDE.md) — cerebro del proyecto (léelo primero si vas a tocar código).
- [`docs/FUNCIONAL.md`](docs/FUNCIONAL.md) — qué simula exactamente y con qué reglas.
- [`docs/PETICIONES.md`](docs/PETICIONES.md) — cómo pedir cambios y backlog.
- [`docs/CHANGELOG.md`](docs/CHANGELOG.md).
