# Arquitectura de NewsFlow AI

## 1. Visión General del Sistema

NewsFlow AI es una plataforma modular de grado empresarial diseñada para la ingesta, deduplicación, scoring de relevancia, verificación con fuentes cruzadas, redacción editorial asistida por IA y publicación automatizada e idempotente en **Páginas Oficiales de Facebook**, además de un módulo de asistencia manual para **Grupos de Facebook**.

```text
+-----------------------------------------------------------------------------------+
|                                  CLIENTE WEB                                      |
|                 React 18 + Vite + TypeScript + Tailwind CSS                       |
|          Gestión Editorial, Aprobaciones, Calendario, Monitoreo y Auditoría       |
+-----------------------------------------------------------------------------------+
                                          |
                              HTTPS / JSON (REST API)
                                          v
+-----------------------------------------------------------------------------------+
|                              BACKEND API (NestJS)                                 |
|   - M01: Autenticación, RBAC (Superadmin, Org Admin, Editor, Operador, Auditor)   |
|   - M02: Conexión OAuth con Meta Graph API & Cifrado AES-256-GCM                  |
|   - M03: Catálogo y Gestión de Fuentes RSS/News API                               |
|   - M04: Clustering de Historias, Relevancia y Filtro de Riesgo                   |
|   - M05: Redacción Editorial con Adaptadores IA y Validación de Esquemas Zod      |
|   - M06: Calendario, Políticas de Publicación e Idempotencia                      |
|   - M07: Cola de Publicación y Reconciliación con Meta                            |
|   - M08: Bandeja de Asistencia Manual para Grupos (Sin Bots ni Scraping)          |
|   - M09: Dashboard, Métricas Reales y Logs de Auditoría Inmutables                |
+-----------------------------------------------------------------------------------+
            |                                         |
            v                                         v
+-----------------------+                 +-----------------------+
|  PostgreSQL 16        |                 |  Redis 7 / BullMQ     |
|  - Esquema Relacional |                 |  - ingestion-queue    |
|  - Auditoría & Traza  |                 |  - ai-review-queue    |
|  - Índices Únicos     |                 |  - publisher-queue    |
|  - Cifrado en Reposo  |                 |  - Lock Distribuido   |
+-----------------------+                 +-----------------------+
                                                      |
                         +----------------------------+----------------------------+
                         |                            |                            |
                         v                            v                            v
               [Worker Ingesta]                [Worker IA / Review]       [Worker Publisher]
           - Polling RSS/APIs             - LLM Adapter (OpenAI/Anthropic) - Meta Graph API v19+
           - Normalización URL            - Citas estrictas                - Backoff y Jitter
           - Hash SHA-256                 - Scoring y detección de sesgos  - Detección de 401/429
           - Deduplicación semántica      - Cero hechos inventados         - Reconciliación remota
```

## 2. Decisiones de Arquitectura (ADRs)

### ADR-001: Monorepo Modular
- **Decisión**: Estructurar el proyecto como un monorepo con `apps/` (web, api), `workers/` (ingestion, editorial-ai, publisher, scheduler), y `packages/` (database, shared-types, integrations, config).
- **Razón**: Permite compartir tipos TypeScript y contratos de validación entre frontend, backend y workers en tiempo de compilación, eliminando desincronizaciones de esquemas.

### ADR-002: Base de Datos PostgreSQL con Prisma ORM
- **Decisión**: Utilizar PostgreSQL 16 con Prisma ORM.
- **Razón**: Modelo fuertemente tipado, migraciones seguras y reproducibles, soporte nativo para JSONB (`raw_metadata`, `times_json`, `sanitized_response`), e integridad referencial estricta por `organization_id`.

### ADR-003: Cifrado en Reposo de Credenciales Externas (AES-256-GCM)
- **Decisión**: Ningún token de acceso de Meta ni clave de API se almacena en texto plano en la base de datos ni se envía jamás al frontend. Se utiliza cifrado simétrico autenticado AES-256-GCM con Vector de Inicialización (IV) único y Authentication Tag por registro.

### ADR-004: Ingesta y Publicación Desacoplada con BullMQ
- **Decisión**: Los procesos de polling RSS, invocación a LLM y publicación en Meta se delegan a workers asíncronos mediante colas BullMQ sobre Redis.
- **Razón**: Resiliencia ante caídas de red, reintentos exponenciales con jitter, control estricto de concurrencia y prevención de bloqueos en el hilo principal del API.

### ADR-005: Cumplimiento Estricto de Políticas de Meta
- **Decisión**: La publicación en Páginas de Facebook se realiza exclusivamente vía Meta Graph API oficial (`v19.0` o superior).
- **Grupos de Facebook**: No se implementan mecanismos de bots, emulación de clics, cookies de usuario ni extensiones de navegador. El PRD y las políticas de Meta de 2024 retiraron `publish_to_groups`. Se proporciona una interfaz de preparación de contenido con botones de copiar, enlace directo y registro de auditoría manual.

### ADR-006: Zona Horaria y Control Editorial
- **Decisión**: Toda la lógica de negocio y programación editorial opera por defecto bajo la zona horaria `America/Bogota` (Colombia).
- **Seguridad Editorial**: La autopublicación está deshabilitada por defecto (`AUTO_PUBLISH_ENABLED=false`). Cualquier noticia con banderas de riesgo (política, crimen, salud, acusaciones) requiere aprobación humana explícita.
