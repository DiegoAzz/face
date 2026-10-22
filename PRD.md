# PRD — NEWSFLOW AI
## Plataforma automatizada de curación, verificación, redacción y publicación de noticias en Facebook

**Versión:** 1.0  
**Fecha:** 22 de octubre de 2026  
**Destino:** Antigravity IDE, desplegable en VPS con Coolify  
**Idioma de aplicación:** Español (es-CO); zona horaria por defecto `America/Bogota`  
**Estado:** especificación de implementación; no implica que Meta haya concedido permisos.

---

## 0. Instrucción principal a Antigravity

Implementa este PRD como producto real, modular y mantenible. Antes de codificar, inspecciona el repositorio actual y conserva todo componente útil. No inventes integraciones, permisos de Meta, datos de noticias, métricas ni resultados de pruebas. Trabaja por fases con pruebas automatizadas y demostración funcional. Usa API oficial de Meta para páginas, nunca automatices la publicación en grupos mediante simulación de clics, sesiones personales, scraping, cookies o navegadores no oficiales. Cualquier acción de publicar debe requerir consentimiento/configuración explícita del administrador. No publiques contenido no verificado o cuyo uso infrinja derechos de autor.

## 1. Resumen ejecutivo

**NewsFlow AI** busca noticias de fuentes autorizadas, las normaliza, agrupa por acontecimiento, valora su importancia, contrasta información cuando sea viable, redacta borradores originales con IA y programa publicaciones en **Páginas de Facebook** administradas por el usuario mediante permisos oficiales de Meta. Además, proporciona una **bandeja para grupos** que permite preparar publicaciones, copiar contenido, abrir enlaces y registrar envíos realizados manualmente; no promete publicación automática en grupos.

Objetivo: crear una operación editorial configurable y transparente, no una fábrica de spam. Priorizar exactitud, atribución de fuentes, calidad e intervención humana para temas sensibles.

### Objetivos de producto
1. Ahorro de tiempo en descubrimiento y elaboración de noticias.
2. Publicación confiable y programada en una o varias páginas autorizadas.
3. Monitoreo de estado, errores y métricas verificables.
4. Moderación editorial y cumplimiento de derechos de autor y políticas de Meta.
5. Funcionamiento continuo en VPS mediante Coolify (con backups y monitoreo).

### No objetivos / límites explícitos
- No automatizar publicación en grupos con Graph API: la Groups API y `publish_to_groups` fueron retirados en 2024.
- No usar cuentas personales como bots, extensiones invasivas, automatización de UI o cookies para eludir restricciones.
- No garantizar elegibilidad de monetización, alcance, aprobación de Meta ni ganancias.
- No copiar artículos completos ni imágenes sin licencia.
- No declarar que una noticia está verificada simplemente porque una IA la considera probable.
- No publicar predicciones, rumores, contenido inventado ni noticias antiguas presentadas como actuales.

## 2. Actores y roles

| Rol | Permisos |
|---|---|
| Superadministrador | Configuración del sistema, organizaciones, facturación futura, monitoreo técnico. |
| Administrador de organización | Conectar páginas Meta, definir fuentes, cuentas, usuarios, calendario, políticas. |
| Editor | Revisar, corregir, aprobar o rechazar borradores; subir imágenes licenciadas. |
| Operador | Consultar calendario, estados y bandeja de grupos; proponer contenido. |
| Auditor | Acceso solo lectura a publicaciones, fuentes y trazabilidad. |

RBAC validado en backend, aislamiento por organización; ningún endpoint debe confiar únicamente en controles del frontend.

## 3. Flujo editorial de extremo a extremo

1. Planificador inicia importación RSS/API autorizada según frecuencia (ej. cada 30 minutos).
2. Ingesta registra `source_url`, autor cuando exista, nombre del medio, fecha original, fecha de captura, idioma, título, descripción y licencia/metadatos disponibles.
3. Canonicaliza URL, deduplica por hash, similaridad de título y clustering semántico de un mismo suceso.
4. Puntúa relevancia (actualidad, impacto, interés geográfico, fiabilidad de fuentes, novedad, diversidad y alineación temática), con explicación auditable.
5. Para noticias prioritarias, compara información con fuentes independientes cuando existan; etiqueta grado de corroboración e incertidumbres.
6. Clasifica riesgos: salud, emergencias, crimen, reputación, mercados, elecciones/política, violencia, menores, desastres, información sin confirmar. Estas categorías requieren aprobación humana; si falta evidencia se descarta o deja en revisión.
7. IA redacta título y resumen **originales**, citas/atribución y URL del artículo original. Separar hechos, contexto e incertidumbre; prohibir datos inventados y clickbait engañoso.
8. Genera o selecciona imagen con licencia válida; si es ilustración sintética etiquetar conforme a políticas aplicables y evitar representar falsamente eventos reales.
9. Motor de políticas decide `REVIEW_REQUIRED` vs `AUTO_ELIGIBLE` (solo categorías de bajo riesgo, corroboradas y con reglas expresamente habilitadas).
10. Editor revisa y aprueba o autoriza auto-publicación por categoría/página.
11. Scheduler crea envío por página y horario; worker publica mediante API oficial con idempotencia y reconciliación.
12. Guarda `remote_post_id`, hora, estado, respuesta saneada y enlace a publicación cuando se obtenga; mide datos reales disponibles mediante permisos autorizados.
13. Para grupos, ofrece texto para copiar, enlaces para abrir el grupo y checklist manual; permite marcar completado. **No realiza envíos automáticos a grupos.**

## 4. Módulos funcionales

### M01 — Autenticación, organización y seguridad
- Correo y contraseña con Argon2id, invitaciones, verificación de email, MFA TOTP opcional/recomendado a administradores.
- Sesiones con refresh tokens rotativos en cookies HttpOnly/Secure/SameSite; revocación por dispositivo.
- Roles; auditoría de decisiones; protección contra fuerza bruta; rate limits; recuperación de contraseña con tokens de un solo uso.
- Secretos cifrados en reposo, con rotación y nunca expuestos al navegador.

### M02 — Conexión de páginas Meta
- OAuth oficial Meta, autorización explícita, permisos mínimos vigentes comprobados en documentación y panel del desarrollador.
- Revisar requisitos como `pages_manage_posts`, `pages_read_engagement`, `pages_show_list` y los aplicables a la función y versión vigente; **no asumir que disponer del nombre del permiso equivale a estar aprobado**.
- Detectar páginas administrables y mostrar nombre/ID sin mostrar tokens.
- Verificación de token, caducidad y alcance de permisos; revocar/desconectar.
- Distinguir modo desarrollo vs producción, roles de prueba vs usuarios externos y necesidad de App Review/Business Verification cuando corresponda.
- Definir adaptador `MetaPagePublisher` para feed/fotos según endpoints actualmente soportados; versionar la API, manejar cambios y límites.
- Si Meta deniega permisos, mantener aplicación utilizable en modo borradores/exportación; no recurrir a vías no autorizadas.

### M03 — Fuentes de noticias
- CRUD de fuentes RSS y proveedores/API con licencia válida; categorías, países, idioma, prioridad, confiabilidad editorial y estado.
- Recolectores por adaptador (`RssAdapter`, `LicensedNewsApiAdapter`), observancia de términos, rate limits y política de robots donde corresponda.
- No extraer artículos completos ni almacenar material protegido sin autorización.
- Vista de prueba de fuente, salud (errores/latencia/última actualización), deduplicación de feed.

### M04 — Relevancia y corroboración
- Configurable por perfil: Colombia, internacional, economía, tecnología, deportes, cultura, etc.
- Score 0–100 explicable con pesos configurables y clasificación de fiabilidad.
- Deduplicación multinivel y agrupación de un mismo evento.
- Fuentes divergentes se presentan como divergentes; ninguna noticia marcada verificada por una sola inferencia generativa.
- Reglas de caducidad por temática; nunca republicar una noticia como nueva sin nueva información sustancial.

### M05 — Estudio IA de contenido
- Proveedor LLM configurable mediante adaptador; clave en backend.
- Prompt con citas de entrada, prohibición de hechos nuevos y salida JSON validada con Zod.
- Campos: `headline`, `summary`, `source_attribution`, `source_url`, `verification_notes`, `uncertainties`, `hashtags` opcionales, `risk_flags`, `suggested_publish_at`.
- Límites de extensión configurables, tono neutral e informativo, español colombiano.
- Historial de versiones, comparación original vs editado, intervención editorial.
- Media: plantilla propia, fotos con derechos comprobados o generación autorizada; la plataforma debe tener alternativa textual si media falla.

### M06 — Cola y calendario
- Hasta N publicaciones diarias por página (por defecto 3); horas locales configurables (por defecto 08:00, 12:00, 18:00), días activos y zona horaria IANA.
- Intervalo mínimo por página configurable, evitar publicaciones duplicadas sobre el mismo evento.
- Estados: `DISCOVERED`, `REVIEW`, `APPROVED`, `SCHEDULED`, `PUBLISHING`, `PUBLISHED`, `FAILED_RETRYABLE`, `FAILED_FINAL`, `CANCELLED`, `REJECTED`.
- Pausar publicación global o por página, modo simulación, revisión obligatoria, publicación manual inmediata autorizada.
- Programador reentrante con locks distribuidos e idempotencia por `publication_job_id`.

### M07 — Publicación en páginas
- Cola BullMQ con reintentos exponenciales, jitter, límite de concurrencia y respeto a cuotas.
- Distinguir errores transitorios (red, 429, 5xx) de definitivos (permiso, token revocado, contenido denegado).
- **No repetir ciegamente** un POST luego de timeout: consultar estado remoto/reconciliar antes para evitar duplicados.
- Guardar resultado de Meta con datos sensibles redactados y `remote_post_id`.
- Prueba de extremo a extremo exclusivamente con página propia/autorizada, inicialmente con publicación de prueba identificada.

### M08 — Asistente para grupos
- Directorio de grupos con nombre, URL y notas sobre reglas (solo datos añadidos por usuario).
- Vista de noticia aprobada, texto adaptable por contexto del grupo, botón **Copiar**, botón **Abrir grupo**, registro **Compartido manualmente**.
- Recordatorios de revisión de reglas y frecuencia; evitar contenido repetitivo/spam.
- Sin automatización por API, Playwright, Selenium, robo de cookies, sesión personal ni scripts de clics.

### M09 — Panel y reportes
- Dashboard: fuentes activas, artículos encontrados, seleccionados, descartados, en revisión, programados, publicados, fallidos.
- Calendario con drag-and-drop sujeto a validaciones; preview móvil/escritorio aproximado, no falso emulador de Facebook.
- Filtros por página, fuente, categoría, fechas, usuario y estado.
- Métricas reales de Meta solo cuando los endpoints y permisos las permitan; especificar tiempo de actualización y distinguir métricas faltantes de cero.
- Exportación CSV; registro de auditoría; salud de workers.

### M10 — Administración y operación
- Configuración de frecuencias, modelos/costo por IA, cuotas diarias, franjas de silencio, alertas.
- Notificación dentro del panel y opcional correo por errores críticos, tokens caducados o falta de contenido aprobado.
- Visualizador de jobs, reintentos controlados, dead-letter queue y vista de fallos.

## 5. Arquitectura técnica

```text
Navegador (React + Vite + TypeScript)
        | HTTPS
        v
Reverse proxy gestionado por Coolify
        |
        v
NestJS API (Auth, RBAC, News, Editorial, Meta, Reports)
        |                    |
        v                    v
PostgreSQL               Redis / BullMQ
                             |
          +------------------+------------------+
          |                  |                  |
    Ingestion worker     AI/Review worker     Publisher worker
          |                  |                  |
     RSS/News APIs          LLM API         Meta Graph API

S3 compatible / MinIO opcional: medios con licencia + assets
Scheduler: proceso dedicado, único líder o scheduler reentrante con lock
```

### Stack
- Node.js LTS soportado y fijado mediante lockfile e imagen Docker.
- TypeScript estricto, backend NestJS, Prisma o Drizzle (elegir UNO); Zod para validación.
- Frontend React + Vite + Tailwind CSS + shadcn/ui; TanStack Query y React Hook Form.
- PostgreSQL (versión estable soportada en despliegue), Redis + BullMQ.
- Testing: Vitest/Jest, Supertest, Playwright; mocks para Meta y LLM.
- Observabilidad: logs JSON, métricas Prometheus opcionales, Sentry opcional, health endpoints.
- Almacenamiento multimedia S3 compatible para recursos duraderos.

## 6. Modelo de datos mínimo

Todas las tablas sensibles incluyen `organization_id`, auditoría (`created_at`, `updated_at`), y restricciones de integridad.

- `organizations(id, name, timezone, status)`
- `users(id, email, password_hash, mfa_enabled, status)`
- `memberships(id, organization_id, user_id, role)`
- `meta_connections(id, organization_id, meta_user_id, encrypted_token_ref, scopes, expires_at, status)`
- `facebook_pages(id, organization_id, meta_connection_id, page_id, page_name, token_ref, publishing_enabled, status)`
- `news_sources(id, organization_id, name, type, url, locale, category, license_notes, enabled, polling_interval)`
- `news_items(id, organization_id, source_id, canonical_url, title, excerpt, published_at, fetched_at, content_hash, raw_metadata)`
- `story_clusters(id, organization_id, topic, event_fingerprint, relevance_score, verification_status)`
- `story_cluster_items(cluster_id, item_id)`
- `drafts(id, organization_id, story_cluster_id, title, body, source_url, source_attribution, risk_level, status, version)`
- `draft_revisions(id, draft_id, editor_id, title, body, reason, created_at)`
- `media_assets(id, organization_id, object_key, mime_type, licensing_status, credit, synthetic_flag)`
- `schedules(id, organization_id, page_id, timezone, allowed_days, times_json, max_posts_per_day, enabled)`
- `publication_jobs(id, organization_id, draft_id, page_id, scheduled_at, status, idempotency_key, attempts, remote_post_id, last_error_code)`
- `publication_attempts(id, job_id, started_at, finished_at, status, sanitized_response)`
- `group_bookmarks(id, organization_id, name, url, rules_notes)`
- `manual_group_shares(id, organization_id, group_id, draft_id, user_id, shared_at, notes)`
- `audit_logs(id, organization_id, actor_id, action, target_type, target_id, metadata_redacted, created_at)`
- `system_settings(id, organization_id, key, value_json)`

**Índices/unicidad:** `(organization_id, canonical_url)` para artículos; `unique(idempotency_key)` en jobs; `unique(page_id, remote_post_id)` filtrado a IDs no nulos; índices por estado y fechas; índices de claves foráneas; contraseñas y tokens nunca en texto plano.

## 7. Endpoints REST iniciales

```
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/me
GET    /api/meta/connect/start
GET    /api/meta/connect/callback
GET    /api/pages
POST   /api/pages/:id/publishing/enable
POST   /api/pages/:id/publishing/disable
GET    /api/sources
POST   /api/sources
POST   /api/sources/:id/test
GET    /api/news
GET    /api/stories
POST   /api/stories/:id/generate-draft
GET    /api/drafts
PATCH  /api/drafts/:id
POST   /api/drafts/:id/approve
POST   /api/drafts/:id/reject
POST   /api/drafts/:id/schedule
GET    /api/publications
POST   /api/publications/:id/cancel
POST   /api/publications/:id/retry
GET    /api/groups
POST   /api/groups
POST   /api/groups/:id/mark-manual-share
GET    /api/dashboard/summary
GET    /api/audit
GET    /health/live
GET    /health/ready
```

OAuth state con expiración, callback seguro, verificación anti-CSRF, tokens guardados solo en servidor. Nunca permitir SSRF a través de URLs arbitrarias: listas de proveedores y validación de destinos/IP.

## 8. Reglas de autopublicación y seguridad editorial

**Modo inicial predeterminado:** aprobación humana para TODAS las publicaciones. Solo luego de pruebas se puede habilitar autopublicación explícita por página/categoría.

Autopublicar únicamente cuando se cumplan todos los criterios configurados: fuentes permitidas, corroboración suficiente, sin alertas sensibles, fecha vigente, derechos de medios confirmados, score mínimo, sin duplicados, ventana horaria permitida y presupuesto disponible. Si algo falla, `REVIEW_REQUIRED`, nunca una publicación de relleno.

Para política, elecciones, crisis, salud, seguridad, delincuencia y acusaciones: revisión humana obligatoria y verificación de fuente primaria cuando sea posible. Para noticias de última hora no verificadas: no publicar automáticamente.

Todo post debe distinguir hechos y opinión, ofrecer atribución clara y enlace original cuando proceda. El sistema debe poder retirar o corregir contenido propio y guardar historial de corrección.

## 9. UI/UX: pantallas obligatorias

1. **Inicio**: tarjetas KPIs, estado del servicio, calendario próximo, alertas.
2. **Noticias detectadas**: feed, filtros, fuentes, relevancia y por qué fue seleccionada.
3. **Sala editorial**: preview, editor, fuentes contrastadas, banderas de riesgo, versiones, aprobar/rechazar.
4. **Calendario**: día/semana/mes, próximas publicaciones, franjas y cuotas.
5. **Páginas de Facebook**: estado OAuth, permisos, conexión, habilitar publicación.
6. **Grupos (manual)**: tarjetas, enlace de acceso, texto listo para copiar, checklist.
7. **Fuentes**: altas, pruebas de conectividad, latencia, licencia y errores.
8. **Plantillas e IA**: prompt de estilo editable de forma controlada, previsualización, cuotas/costes.
9. **Historial y analítica**: publicados, fallidos, URL remota, métricas verificadas.
10. **Configuración y seguridad**: organización, roles, zona horaria, notificaciones, auditoría.

Diseño responsive profesional, modo claro/oscuro, accesibilidad WCAG 2.2 AA como objetivo, skeletons, errores claros, estados vacíos útiles. No mostrar placeholders como métricas reales.

## 10. Despliegue en Coolify

### Servicios (Docker Compose)

- `web`: aplicación frontend estática detrás de servidor web/proxy HTTPS.
- `api`: NestJS sin credenciales embebidas en imagen.
- `worker-ingestion`: consume trabajos de RSS/API.
- `worker-ai`: análisis y generación.
- `worker-publisher`: envía publicaciones autorizadas.
- `scheduler`: programa trabajos con lock; evitar instancias dobles.
- `postgres`: persistencia mediante volumen.
- `redis`: broker de trabajos, credenciales y red interna.
- Almacenamiento S3 compatible externo u opción MinIO con volumen y backup.

### Reglas de infraestructura
- Solo `web` y `api` expuestos públicamente por HTTPS a través del proxy de Coolify.
- `postgres`, `redis` y workers jamás publicados a internet; red Docker interna.
- `restart: unless-stopped`, healthchecks reales, `depends_on` con comprobación de readiness donde aplique.
- Recursos CPU/memoria asignados, límites de workers, retención de logs y DLQ.
- Migraciones ejecutadas de forma coordinada, con rollback planificado y backup probado.
- Volúmenes persistentes: PostgreSQL, Redis solo si se requiere persistencia de trabajos, medios si son locales.
- Backups automáticos diarios cifrados y copia externa; realizar restore test mensual. **Un volumen NO sustituye el backup**.
- Dominio ej. `noticias.tudominio.com`; certificado TLS gestionado por proxy de Coolify; secretos en Environment Variables / gestor seguro.
- Despliegues versionados desde Git con lockfiles; ramas `main`, `develop`; staging separado.

### Variables de entorno (nombres, sin valores secretos)

```
NODE_ENV=production
TZ=America/Bogota
APP_URL=https://noticias.tudominio.com
API_URL=https://noticias.tudominio.com/api
DATABASE_URL=<secret>
REDIS_URL=<secret>
SESSION_SECRET=<secret>
TOKEN_ENCRYPTION_KEY=<secret>
META_APP_ID=<secret>
META_APP_SECRET=<secret>
META_REDIRECT_URI=https://noticias.tudominio.com/api/meta/connect/callback
META_GRAPH_API_VERSION=<supported-version>
LLM_PROVIDER=<configured-provider>
LLM_API_KEY=<secret>
S3_ENDPOINT=<optional>
S3_BUCKET=<optional>
S3_ACCESS_KEY=<optional-secret>
S3_SECRET_KEY=<optional-secret>
AUTO_PUBLISH_ENABLED=false
DEFAULT_TIMEZONE=America/Bogota
```

**Advertencia:** los parámetros relacionados con Meta se validan contra documentación y revisión actual de la app, no se inventan versiones ni permisos.

## 11. Manejo de fallos: comportamiento esperado

| Problema | Respuesta |
|---|---|
| RSS no responde | Timeout, circuit breaker, registrar fuente degradada; continuar con demás fuentes. |
| Fuente publica noticia repetida | Deduplicar y adjuntar como fuente al cluster, sin crear post adicional. |
| IA no disponible / JSON inválido | Reintentar limitado, validar esquema, enviar a revisión; jamás publicar texto parcial. |
| Noticia sin corroboración suficiente | Retener en cola de revisión. |
| Imagen no autorizada | Bloquear uso de imagen; preferir post con enlace/texto permitido. |
| Token Meta vencido o revocado | Pausar esa página, avisar administrador, solicitar reconexión oficial. |
| Meta devuelve rate limit | Backoff respetuoso, reprogramar dentro de ventana y reportar. |
| Timeout posterior al envío | Reconciliar antes de repetir, evitar post duplicado. |
| Servidor reinicia | Reanudar jobs persistidos sin duplicados; auditoría del reinicio. |
| No hay noticias buenas | No publicar y mostrar explicación. |
| Permisos Meta no aprobados | Modo borradores, no simular publicación exitosa. |
| Grupo Facebook | Solo flujo manual; nunca emitir llamadas de publicación automática. |

## 12. Privacidad, cumplimiento, moderación y derechos

- Cumplir condiciones de plataformas y fuentes, propiedad intelectual y legislación de protección de datos aplicable (incluida Ley 1581 de 2012 en Colombia si trata datos personales).
- Política de retención y eliminación; herramientas para revocar integración y borrar datos propios.
- Minimizar datos de terceros; no almacenar información de perfiles o grupos obtenida sin autorización.
- Evitar campañas de spam, contenido engañoso, suplantación, desinformación y fabricación de testimonios o imágenes de eventos.
- Advertencias claras para contenido generado mediante IA; atribución de fuente original y licencias.
- Auditoría inmutable o resistente a manipulación para quién publicó, qué fuente se usó y qué versión salió.
- Análisis de dependencias, escaneo de secretos, CSRF/CORS/CSP, rate limiting, SQL parametrizado, SSRF protections, logs sin tokens.

## 13. Pruebas obligatorias

### Unitarias
- Scoring reproducible; dedup por URL/contenido; validación de JSON; filtros de riesgos; horario `America/Bogota`; RBAC.

### Integración
- RSS fixture local; proveedor LLM mockeado; Meta Graph mockeado (éxito, 401/403, 429, 5xx, timeout ambiguo); Redis + PostgreSQL de prueba.

### E2E
- Login, añadir fuente, importar noticias, generar borrador, editar, aprobar, programar, procesar worker, ver estado e historial.
- Ruta de grupo únicamente genera texto y permite registro manual.
- Usuario no autorizado no puede aprobar ni publicar.

### Entorno real (con autorización)
- Conectar página de prueba administrada por el usuario.
- Confirmar permisos revisados y vigentes de Meta.
- Enviar UNA publicación identificada como prueba, obtener `remote_post_id` y verificar realmente en la página.
- Simular token revocado, caída de Redis, reinicio worker, timeout de publicación, fuente caída y falta de contenido.
- Prueba de persistencia tras redespliegue Coolify y restauración desde copia externa.

**No declarar prueba aprobada si se utilizó un mock para afirmar publicación real.**

## 14. Criterios medibles de aceptación

- CA01: una fuente RSS permitida se importa y queda trazada con fuente, URL y fecha.
- CA02: una noticia repetida no crea dos publicaciones sobre el mismo evento según regla de dedup definida.
- CA03: cada borrador muestra fuente original, texto editable y banderas de riesgo.
- CA04: autopublicación está deshabilitada por defecto y no publica nada sin configuración/autorización explícita.
- CA05: programación respeta `America/Bogota`, días/horas configurados y máximo diario.
- CA06: reinicio de workers no produce publicaciones duplicadas en pruebas de fallo reproducibles.
- CA07: publicación autorizada de prueba aparece en Facebook y su ID queda almacenado.
- CA08: permiso o token revocado bloquea publicación y genera alerta.
- CA09: módulo de grupos jamás publica automáticamente ni pide cookies de usuario.
- CA10: despliegue con Compose y Coolify preserva PostgreSQL tras redeploy; backups externos y restore probados.
- CA11: cada error crítico tiene código, registro saneado y acción de recuperación.
- CA12: una noticia sensible o insuficientemente corroborada nunca entra al envío automático.
- CA13: métricas no disponibles figuran como “no disponible”, nunca como cero inventado.
- CA14: documentación de instalación, variables, OAuth, pruebas y operación disponible en repositorio.

## 15. Fases de implementación (gates obligatorios)

### Fase 0 — Auditoría y diseño
Inspeccionar repositorio; elaborar mapa de módulos existentes, matriz de riesgos, ADRs, plan de migración y backlog priorizado. Salida: arquitectura aprobable y CI inicial.

### Fase 1 — Plataforma base
Monorepo, API, web, DB, Redis, auth, RBAC, seeds de demostración, Docker Compose, entorno staging. Gate: login funcional y persistencia real en Coolify.

### Fase 2 — Noticias y tablero
Fuentes, ingesta, normalización, dedup, clasificación y dashboard. Gate: importación automatizada de fuente de prueba y ausencia de duplicados demostrada.

### Fase 3 — IA y editorial
Generación de texto verificable, revisión humana, historial, medios licenciados, calendario. Gate: un borrador atraviesa todas las transiciones sin publicar.

### Fase 4 — Facebook Pages oficial
OAuth, páginas, permisos, publisher con mocks/errores, prueba real en página propia tras aprobación Meta. Gate: publicación verificable con ID remoto y manejo de token revocado.

### Fase 5 — Automatización controlada
Scheduler + BullMQ, políticas de autopublicación opt-in, cuotas, reintentos, DLQ, métricas y alertas. Gate: ensayo de 7 días en staging sin publicaciones duplicadas ni errores silenciosos.

### Fase 6 — Grupos manuales y hardening
Panel de grupos asistido, auditoría, backup/restore, carga, seguridad, manual de soporte. Gate: pruebas de aceptación completas.

## 16. Estructura propuesta de monorepo

```
newsflow-ai/
├── apps/
│   ├── web/
│   └── api/
├── workers/
│   ├── ingestion/
│   ├── editorial-ai/
│   ├── publisher/
│   └── scheduler/
├── packages/
│   ├── shared-types/
│   ├── database/
│   ├── integrations/
│   └── config/
├── infra/
│   ├── compose.yaml
│   └── docker/
├── tests/
│   ├── integration/
│   ├── e2e/
│   └── fixtures/
├── docs/
│   ├── architecture.md
│   ├── meta-setup.md
│   ├── coolify-deployment.md
│   ├── runbook.md
│   └── threat-model.md
├── .env.example
└── PRD.md
```

## 17. Prompt maestro listo para pegar en Antigravity

> Desarrolla **NewsFlow AI** siguiendo estrictamente este `PRD.md`. Es una plataforma profesional de noticias para publicar automáticamente en **Páginas de Facebook** autorizadas mediante API oficial y preparar contenido para **grupos con publicación manual**. Se desplegará en Coolify mediante Docker Compose, Node/NestJS, React, PostgreSQL, Redis/BullMQ y adaptadores de IA. Inspecciona primero el proyecto actual para preservar lo reutilizable. Implementa por fases; entrega código real, migraciones, Compose, `.env.example`, tests, documentación y validación en staging. **No declares que publica en Facebook sin una prueba real autorizada ni inventes permisos de Meta**. Nunca automatices grupos con cookies, Selenium o bots. Prioriza fiabilidad, información corroborada, derechos de autor, no duplicados, seguridad y control editorial. Empieza por la Fase 0 y presenta los hallazgos; continúa después con Fase 1 y sus pruebas; no construyas de golpe módulos aún no verificados. Al cerrar cada fase informa archivos cambiados, comandos ejecutados, pruebas aprobadas/fallidas y riesgos pendientes.

## 18. Referencias oficiales y verificación requerida

- Coolify: https://coolify.io/docs/applications/builds/docker-compose
- Coolify almacenamiento: https://coolify.io/docs/core/persistent-storage/storage-mounts/overview
- Meta Developers: https://developers.facebook.com/docs/graph-api/
- Meta Login for Business y permisos: https://developers.facebook.com/docs/facebook-login/
- Meta Groups API: retirada de permisos y funciones con aplicación general desde el 22 de abril de 2024 (ver changelog de Graph API v19.0).

**Importante:** Meta puede cambiar versiones, permisos y revisión de aplicaciones. Antes de escribir código del publisher, Antigravity debe consultar documentación vigente y registrar requisitos efectivamente concedidos a la aplicación del usuario.

---

**FIN DEL PRD**
