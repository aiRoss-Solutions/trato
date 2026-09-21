# UNKNOWNS · Trato v0.3

Registro de incógnitas: qué no sabíamos, qué default se aplicó y si Maxi lo confirmó. Se actualiza en cada bloque.

| # | Incógnita | Default | Estado |
|---|---|---|---|
| 1 | Tema por defecto de la sala | Navy oscuro en SALA/TEL (`#050F38` / paneles `#0B1C55` / acento `#2F7BFF` / cian mercado `#2AA7DF`), claro en WEB, conmutable | ✅ confirmado por Maxi 21-sep-2026 |
| 2 | ¿Panel vertical de operaciones? ¿Dónde? | Sí, a la derecha, 360 px, plegable, "ver como tabla" y ventana propia | ✅ confirmado por Maxi 21-sep-2026 |
| 3 | Contenido de la segunda fila | Posición viva · órdenes vivas · estado de plataforma · últimas operaciones; reordenables; guardado con el workspace | default |
| 4 | Altura de la barra inferior de cliente | Una fila a ≥ 1440, dos a < 1200; plegable a "solo cliente" | default |
| 5 | Multiventana en canal web | Sí: precios y operaciones; el módulo de operación no se separa | default |
| 6 | ¿La ventana hija ejecuta? | Sí; lock del RFS por `idGlobal` (una ventana posee cada tile) | default |
| 7 | Persistencia de disposición | `localStorage` por usuario demo, borrable en ☰ | default |
| 8 | Pop-ups bloqueados | Toast + enlace; nunca `alert` | default |
| 9 | Glosario EN | Proponer y marcar "a validar por negocio"; UI sigue en ES | default |
| 10 | Nombre | "Trato" provisional (`BRAND.name`) | default |
| 11 | Rol Supervisor | Solo lectura + posición + consola; sin ticket | default |
| 12 | Subruta en Pages | URLs de ventana relativas; probar en UAT | default |
| 13 | Precios en varias ventanas | Cada ventana su random walk; diferencias mínimas aceptadas; R-06 market data real | default |
