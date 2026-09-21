# UNKNOWNS · Trato v0.3

Registro de incógnitas: qué no sabíamos, qué default se aplicó y si Maxi lo confirmó. Se actualiza en cada bloque.

| # | Incógnita | Default | Estado |
|---|---|---|---|
| 1 | Tema por defecto de la sala | Navy oscuro en SALA/TEL (`#050F38` / paneles `#0B1C55` / acento `#2F7BFF` / cian mercado `#2AA7DF`), claro en WEB, conmutable | ✅ confirmado por Maxi 21-sep-2026 |
| 2 | ¿Panel vertical de operaciones? ¿Dónde? | Sí, a la derecha, 360 px, plegable, "ver como tabla" y ventana propia | ✅ confirmado por Maxi 21-sep-2026 |
| 3 | Contenido de la segunda fila | Posición viva · órdenes vivas · estado de plataforma · últimas operaciones (orden fijo en v0.3.0) | default aplicado |
| 4 | Altura de la barra inferior de cliente | Una fila a ≥ 1440, dos a < 1200; plegable a "solo cliente" | default |
| 5 | Multiventana en canal web | No en v0.3.0 (el canal empresas conserva v0.2) | pendiente v0.3.1 |
| 6 | ¿La ventana hija ejecuta? | Sí (rango propio de idGlobal/ref); sin lock del RFS todavía (ver 14) | default aplicado |
| 7 | Persistencia de disposición | `localStorage` por usuario demo (`trato.layout.<usuario>`), restaurar/olvidar en ☰ | default aplicado |
| 8 | Pop-ups bloqueados | Modal con enlace «abrir en pestaña nueva»; nunca `alert` | default aplicado |
| 9 | Glosario EN | Borrador en `js/glossary.js` marcado "a validar por negocio"; UI en ES | default aplicado |
| 10 | Nombre | "Trato" provisional (`BRAND.name`) | default |
| 11 | Rol Supervisor | No añadido en v0.3.0 (siguen MESA / TEL / WEB) | pendiente · decidir con Maxi |
| 12 | Subruta en Pages | URLs de ventana relativas (`./?panel=`); probado en localhost, pendiente probar en `/v3/` | default aplicado |
| 13 | Precios en varias ventanas | Cada ventana su random walk; diferencias mínimas aceptadas; R-06 market data real | default aplicado |
| 14 | Lock del RFS por tile entre ventanas (#6) | No implementado en v0.3.0: dos ventanas pueden pedir precio del mismo par a la vez; cada una ejecuta la suya | pendiente v0.3.1 |
| 15 | Canal empresas en v0.3 | Conserva el layout v0.2 (tema claro, glosario nuevo). El panel de situación + semáforo (benchmark CaixaBank) queda para v0.3.1 | default · decidir con Maxi |
| 16 | Paneles de la fila 2 reordenables por arrastre (#3) | No en v0.3.0: orden fijo posición · órdenes · plataforma · últimas | pendiente |
| 17 | Altura de tile compacto | 202 px a 1440 (objetivo ≤ 170): las dos filas caben sin scroll, se deja así | default aplicado |
| 18 | Capturas `docs/capturas/v0.3/` | El navegador integrado no guarda ficheros: Maxi o su Claude en escritorio las hacen | pendiente |
| 19 | Asistente de mesa: ¿reglas locales o LLM real? | Demo con reglas sobre datos locales, chip NUEVO y etiqueta «demo»; en producción, LLM corporativo del banco en su tenant | default · Maxi pidió el hueco 21-sep |
| 20 | Proveedores de liquidez: nombres y número | Tres genéricos (A/B/C) con sesgo y spread propios; «Mejor precio» por lado | default · Maxi pidió el selector 21-sep |
