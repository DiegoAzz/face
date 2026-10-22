# NewsFlow AI — Plataforma Profesional de Publicación en Facebook

Plataforma empresarial de curación, verificación editorial con IA, moderación de riesgos y publicación oficial en **Páginas de Facebook** mediante **Meta Graph API**, además de una bandeja asistida manual para **Grupos de Facebook** sin automatizaciones prohibidas.

- **Repositorio Oficial:** [https://github.com/DiegoAzz/face.git](https://github.com/DiegoAzz/face.git)
- **Despliegue en Coolify VPS:** [https://face.appzplay.online](https://face.appzplay.online)
- **Zona Horaria Predeterminada:** `America/Bogota` (Colombia)

---

## 🚀 Arquitectura y Tecnologías

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons.
- **Backend API:** NestJS 10, TypeScript, Passport JWT, Cookies HttpOnly, Throttler.
- **Base de Datos:** PostgreSQL 16 con Prisma ORM (18 entidades relacionales e integridad estricta).
- **Automatización y Colas:** Redis 7 + BullMQ con reintentos controlados, jitter y clave de idempotencia.
- **Seguridad:** Cifrado simétrico AES-256-GCM para tokens de Meta, contraseñas con Bcrypt / Salt 12, protección anti-SSRF (RFC 1918 bloqueado) y auditoría inmutable de decisiones.
- **Integración con Meta:** Graph API oficial (v19.0+) para páginas; cumplimiento 100% de políticas de Meta (asistencia manual en grupos, sin bots ni scraping de cookies).

---

## 📁 Estructura del Monorepo

```text
newsflow-ai/
├── apps/
│   ├── web/          # Frontend React + Vite + Tailwind (10 pantallas completas)
│   └── api/          # Backend NestJS (Auth, RBAC, Meta, Sources, News, Drafts, etc.)
├── workers/
│   ├── ingestion/    # Worker RSS con deduplicación por hash y clustering
│   ├── publisher/    # Worker de publicación BullMQ con reconciliación remota
│   └── scheduler/    # Planificador reentrante con lock distribuido en Redis
├── packages/
│   ├── database/     # Prisma schema, migraciones y seeders reales de Colombia
│   ├── shared-types/ # Tipos TypeScript y contratos de validación Zod
│   └── integrations/ # AES-256-GCM, cliente anti-SSRF, Meta Graph API y LLM Adapter
├── infra/
│   ├── compose.yaml  # Docker Compose listo para producción en Coolify
│   └── docker/       # Dockerfiles optimizados multistage y configuración Nginx
├── docs/             # Manuales de arquitectura, Meta setup, Coolify y runbook
└── PRD.md            # Especificación técnica oficial
```

---

## 🛠️ Despliegue en Coolify

1. En el panel de Coolify en tu VPS, añade un nuevo recurso desde el repositorio Git:
   `https://github.com/DiegoAzz/face.git` (Rama: `main`).
2. Configura el archivo Compose en:
   `infra/compose.yaml`
3. Agrega las Variables de Entorno en el panel de Coolify basándote en `.env.example`:
   - `APP_URL=https://face.appzplay.online`
   - `API_URL=https://face.appzplay.online/api`
   - `META_APP_ID=tu_app_id`
   - `META_APP_SECRET=tu_app_secret`
   - `TOKEN_ENCRYPTION_KEY=clave_hex_64_caracteres_aes_256`
   - `SESSION_SECRET=clave_aleatoria_64_caracteres`
   - `LLM_PROVIDER=openai` (o `gemini` o `mock`)
   - `LLM_API_KEY=tu_api_key`
4. Despliega el proyecto. Coolify compilará los contenedores, correrá las migraciones de Prisma y levantará la aplicación con certificado SSL automático a través de Traefik.
