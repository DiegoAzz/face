# Despliegue en Coolify con Docker Compose — NewsFlow AI

## 1. Arquitectura de Despliegue en Coolify

Coolify gestiona el ciclo de vida de los contenedores mediante un archivo `compose.yaml`. La arquitectura expone únicamente el frontend (`web`) y el backend (`api`) a través de Traefik (el reverse proxy interno de Coolify), manteniendo PostgreSQL, Redis y los workers completamente aislados en una red interna privada.

```text
                                  INTERNET
                                      |
                     [Traefik / Coolify Reverse Proxy]
                                      |
             +------------------------+------------------------+
             | (HTTPS)                                         | (HTTPS /api)
             v                                                 v
    +-----------------+                               +-----------------+
    |   web (Nginx)   |                               |   api (NestJS)  |
    +-----------------+                               +-----------------+
             |                                                 |
===================== RED INTERNA PRIVADA DOCKER ==============================
                                                               |
             +------------------------+------------------------+
             |                        |                        |
             v                        v                        v
    +-----------------+      +-----------------+      +-----------------+
    |   PostgreSQL    |      |  Redis 7 / Bull |      |  Workers        |
    |  (Volumen Pers) |      | (Volumen Pers)  |      |  - Ingestión    |
    +-----------------+      +-----------------+      |  - Editorial AI |
                                                      |  - Publisher    |
                                                      |  - Scheduler    |
                                                      +-----------------+
```

## 2. Configuración en Coolify Paso a Paso

1. **Crear Nuevo Proyecto en Coolify**:
   - En tu panel de Coolify, crea un nuevo **Proyecto** y un **Entorno** (ej. `Producción`).
   - Selecciona **New Resource** > **Docker Compose**.
   - Conecta tu repositorio Git (rama `main`).

2. **Ruta del Compose y Contexto**:
   - Compose file location: `infra/compose.yaml`
   - Base directory: `/`

3. **Configuración de Variables de Entorno en Coolify**:
   Agrega las variables en la pestaña **Environment Variables** del recurso en Coolify (nunca en el repositorio):
   - `APP_URL`: Dominio público del frontend (ej. `https://noticias.tudominio.com`).
   - `API_URL`: Dominio público del backend (ej. `https://noticias.tudominio.com/api`).
   - `DATABASE_URL`: `postgresql://newsflow_user:${DB_PASSWORD}@postgres:5432/newsflow_db?schema=public`
   - `REDIS_URL`: `redis://:${REDIS_PASSWORD}@redis:6379`
   - `SESSION_SECRET`: Cadena aleatoria segura de 64 caracteres.
   - `TOKEN_ENCRYPTION_KEY`: Cadena hexadecimal de 64 caracteres (32 bytes para AES-256).
   - `META_APP_ID`: ID de tu app en Meta for Developers.
   - `META_APP_SECRET`: Secreto de tu app en Meta.
   - `META_REDIRECT_URI`: `https://noticias.tudominio.com/api/meta/connect/callback`
   - `LLM_PROVIDER`: `openai` o `anthropic` o `gemini`.
   - `LLM_API_KEY`: Tu clave de API del proveedor de IA.
   - `AUTO_PUBLISH_ENABLED`: `false` (inicia en false por seguridad editorial).
   - `DEFAULT_TIMEZONE`: `America/Bogota`.

4. **Volúmenes Persistentes Requeridos**:
   Coolify creará volúmenes Docker gestionados:
   - `postgres_data`: `/var/lib/postgresql/data` (Base de datos).
   - `redis_data`: `/data` (Persistencia de colas y locks).
   - `media_data`: `/app/media` (Almacenamiento de imágenes locales si no se usa S3).

5. **Estrategia de Backup y Restore en Coolify**:
   - Ve a la configuración de la base de datos PostgreSQL dentro de Coolify y activa **Automated Backups**.
   - Frecuencia recomendada: Cada 24 horas a las 02:00 AM UTC.
   - Destino: S3 compatible (AWS S3, Wasabi o Cloudflare R2).
   - **Prueba mensual de restauración**: Descarga el último backup `.sql.gz` y pruébalo en un contenedor efímero local para validar la integridad de las tablas y restricciones.

## 3. Comandos de Despliegue y Migración

Coolify ejecuta automáticamente:
1. `docker compose build --pull`
2. El contenedor `api` o un init-container ejecuta `npx prisma migrate deploy` antes de levantar el servicio web.
3. Healthchecks activos en `/health/ready` verifican que PostgreSQL y Redis respondan antes de enrutar el tráfico entrante.
