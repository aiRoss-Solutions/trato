# Estimación: construir y desplegar el TO-BE de Lucio · 28-sep-2026

Base: «TRATO · Arquitectura TO-BE» (Lucio, 28-sep, 22 láminas). Estimación hecha por Claude para trabajo **conmigo en sesión,
Maxi supervisando**, sin equipo humano de desarrollo. Datos y sistemas externos **simulados** (decisión de Maxi).

## Unidad de medida
«Día» = una jornada de sesión de Claude Code con Maxi revisando al final. Los rangos asumen que las decisiones del comité
(lámina 19) las toma Maxi sobre la marcha con los defaults que propongo abajo.

## Por capa: qué puedo hacer, qué no, y cuánto

| Capa (lámina) | Qué construyo yo | Qué NO puedo (y sustituto) | Días |
|---|---|---|---|
| **Presentación** (4) React por rol: mesa, telefónica, empresas, API | Portar Trato v0.3 a React + gadgets por rol conectados al BFF por WebSocket; se conserva todo el diseño actual | Nada bloqueante | 3 |
| **Acceso** (4) Gateway OIDC, push gateway con conflation, BFF interno/externo | Spring Cloud Gateway, Keycloak (realm, roles, SSO simulado), push WebSocket con conflation por cliente, dos BFF | SSO real de la entidad: simulado con Keycloak propio | 2 |
| **Dominio** (4-6) pricing, agregación, OMS, ciclo de vida, workflow 7 etapas, reglas y límites, notificación, setup | Microservicios Spring Boot; máquina de estados por producto; workflow con **Flowable**; DSL de reglas sobre **Groovy** con WARNING/EXCEPTION/ERROR y aprobaciones; libro de límites reservar/consumir/liberar con Kafka Streams; outbox | Nada bloqueante. Es la capa más gorda | 9 |
| **Módulos producto** (8) | Spot, forward, forward americano (FDE/FDC), swap (dos patas): completo. Opción FX: prima con Black-Scholes y griegas sobre vol simulada. Bonos, fondos, notas: ciclo de vida y pricing simplificados (limpio/sucio, NAV y cut-off, cupón y barrera) | Sin market data real las opciones y estructurados son ilustrativos, no valorables | 6 |
| **Pricing y agregación** (9) | Los 5 algoritmos enchufables (mejor precio, preferido, sweep, exclusión por latencia/rechazo, round-robin), grilla de mark-up por banda/par/tenor, margen por segmento, sanity check vs mid, auditoría de cada componente del precio | — | incluido en dominio |
| **Integración** (14) API canónica + conectores por vendor | Framework sobre **Apache Camel**; OpenAPI de entrada; codecs FIX (**QuickFIX/J**), FpML, XML propietario, SOAP, REST, MQ, Kafka, SFTP; idempotencia, circuit breaker, dueño único de sesión FIX | **Ningún vendor real**: 360T, Bloomberg, Murex, M50, Temenos no existen aquí. Construyo **4 simuladores** (core SOAP+MQ, tesorería MXML/FpML, 2 LPs FIX, market data REST) con datos inventados y los conectores se certifican contra ellos | 6 (2 de simuladores) |
| **Plataforma** (4, 12, 15) Kubernetes, Kafka, Oracle, Infinispan, OTel, Keycloak, OpenBao | Helm charts; docker-compose para un solo comando; Kafka con Strimzi; **PostgreSQL** por defecto (Oracle XE gratuito como segundo perfil para PL/SQL); Infinispan; OpenTelemetry + Prometheus + Grafana; OpenBao; OpenTofu para AWS (EKS, MSK, RDS) | **Licencias**: Oracle DB, WebLogic y JBoss EAP no las puedo aportar → WildFly/Spring Boot embebido y PostgreSQL/Oracle XE. **AWS**: escribo el OpenTofu pero la cuenta, el pago y el `apply` son de Maxi (~5.200 USD/mes en producción según Lucio; para demo bastan ~300) | 4 |
| **Escalabilidad** (7, 11) 3 réplicas/3 zonas, HPA, KEDA, p99 < 1 s | Manifiestos de HPA/KEDA/PDB, pruebas de carga con k6 a 5.000 ops/día y 25-50k RFS, medición de p99 por tramo | Tres zonas reales solo en AWS; en local se demuestra con réplicas en un nodo | 2 |
| **Transversales** (17) seguridad, observabilidad, IA | RBAC+ABAC, mTLS entre servicios (certs propios), auditoría inmutable, SAST/DAST en GitHub Actions, trazas punta a punta; chatbot y agentes de consulta sobre un LLM local (Ollama) con permisos del usuario | Hardening de producción, pentest y cumplimiento (DORA, etc.) son de un tercero | 3 |
| **Datos** (16) modelo mínimo, caché TTL, Flyway, Debezium | Todo | — | incluido en dominio/plataforma |
| **Pruebas y docs** | Tests de contrato por conector, E2E del flujo spot (lámina 10), runbooks, OpenAPI, ADRs | — | 3 |
| **Total** | | | **≈ 38 días de sesión** |

## Calendario realista
- **Secuencial, una sesión al día**: ≈ 8 semanas.
- **En paralelo** (2-3 sesiones simultáneas por capa, yo orquestando): **≈ 4-5 semanas**. Coste en tokens alto; hay que decidirlo.
- **Lo que ese plazo NO incluye**: certificación con vendors reales, licencias, operación 24×7, auditorías. Es un TO-BE que
  **corre de punta a punta con simuladores**, no un producto en producción en un banco.

## Por fases de Lucio (lámina 18), con mi estimación
| Fase | Entrega | Días | Acumulado |
|---|---|---|---|
| 0 · Fundaciones | Kubernetes local + Kafka + framework de conectores + workflow y DSL base + 4 simuladores | 9 | 9 |
| 1 · MVP FX spot | 1 entidad, core simulado, 2 LPs simulados, pricing y agregación, controles MiFID/KYC/saldo/off-market, React mesa + empresas | 9 | **18 (≈ 3,5 semanas)** |
| 2 · FX completo | Forward, americano, swap; tesorería simulada; límites propios y aprobaciones | 7 | 25 |
| 3 · Multi-entidad y API | Entidades del grupo, Open API, opción FX | 5 | 30 |
| 4 · Otros productos e IA | Bonos, fondos, notas; chatbot y agentes con LLM local | 5 | 35 |
| Pruebas de carga, seguridad, docs | | 3 | **38** |

**Recomendación**: cerrar Fase 0 + 1 (**≈ 18 días**) y enseñar eso. Es lo que demuestra la arquitectura entera con un
producto real de punta a punta; el resto son módulos sobre la misma base.

## Dónde se despliega (decisión de Maxi)
| Opción | Qué da | Qué necesita |
|---|---|---|
| **Local** (docker-compose / kind) | Todo el stack en el Mac con un comando; demo en pantalla | Nada |
| **ServerMini** (k3s en el mini de la oficina, 8 cores / 16 GB) | Entorno vivo permanente para que Lucio, Camilo y Javi lo prueben por Tailscale o URL | Que Maxi quiera darle esa carga al mini (ahora corre 30 tareas) |
| **AWS PaaS** (cuenta aiRoss, OpenTofu) | Lo de la lámina 13 tal cual, 3 zonas | Cuenta AWS, tarjeta y el `apply` por Maxi; ~300 USD/mes en tamaño demo |
| GitHub Pages | **No sirve**: solo estático, sin backend | — |

## Decisiones de la lámina 19, con el default que aplicaría si Maxi no dice otra cosa
1. Enfoque: capa genérica, sí. 2. Workflow: **Flowable**. 3. Reglas: DSL propio sobre **Groovy** (Drools es más pesado
para empezar). 4. Modelo: PaaS. 5. Stack: **PostgreSQL + Spring Boot embebido** para construir; perfil Oracle XE + WildFly
para demostrar portabilidad; WebLogic/JBoss EAP solo con licencia. 6. Piloto: FX spot, mesa + empresas.

## Riesgos honestos
- FIX con QuickFIX/J contra un simulador propio no es lo mismo que contra 360T: habrá ajustes al conectar el real.
- El DSL de reglas es lo que más criterio de negocio exige: lo escribo con las reglas de la lámina 5 como semilla y Lucio
  debería revisarlas.
- Opción FX, bonos, fondos y notas sin market data real quedan como maqueta funcional, no como pricing fiable.
- 38 días de sesión son muchas horas de token: conviene aprobar por fases.
