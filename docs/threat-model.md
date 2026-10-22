# Modelo de Amenazas y Seguridad (Threat Model) — NewsFlow AI

## 1. Alcance y Superficie de Ataque

NewsFlow AI interactúa con:
- Usuarios web (autenticados y no autenticados).
- Fuentes externas de noticias (feeds RSS, APIs licenciadas).
- Proveedores de LLM (OpenAI, Anthropic, Gemini u otros).
- Meta Graph API (OAuth, publicación en páginas, lectura de estadísticas).

## 2. Análisis STRIDE y Mitigaciones

| Amenaza (STRIDE) | Vector Potencial | Mitigación Implementada |
|---|---|---|
| **Spoofing** (Suplantación) | Robo de credenciales o sesiones de usuario | Argon2id con salt aleatorio; tokens JWT rotativos en cookies `HttpOnly`, `Secure`, `SameSite=Lax/Strict`; MFA TOTP para administradores; revocación inmediata de sesiones. |
| **Tampering** (Alteración de datos) | Manipulación de borradores o estados de publicación | Validación de esquemas estricta con Zod en backend; verificación de RBAC en cada mutación; historial inmutable de revisiones de borradores (`draft_revisions`). |
| **Repudiation** (Repudio) | Un editor publica o aprueba contenido y lo niega | Tabla inmutable `audit_logs` con `organization_id`, `actor_id`, `action`, `target_type`, `target_id`, timestamp e IP/metadata saneada. |
| **Information Disclosure** (Fuga de información) | Exposición de Page Access Tokens de Meta o API keys de LLM | Cifrado en reposo AES-256-GCM (`TOKEN_ENCRYPTION_KEY`); exclusión total de campos confidenciales en DTOs de salida; logs sanitizados que censuran cabeceras y parámetros `access_token` o `Authorization`. |
| **Denial of Service** (Denegación de servicio) | Inundación de endpoints de login, OAuth o ingesta | Rate limiting con Redis (`@nestjs/throttler`); BullMQ con límites de concurrencia y límites por minuto; timeouts estrictos (5-10s) en consultas HTTP salientes. |
| **Elevation of Privilege** (Elevación de privilegios) | Un Operador o Auditor intenta publicar o cambiar fuentes | RBAC estricto validado en guards de NestJS a nivel de controlador y servicio; aislamiento obligatorio por `organization_id` en cada consulta de base de datos. |

## 3. Mitigación de SSRF (Server-Side Request Forgery)

- **Problema**: Los usuarios agregan URLs para fuentes RSS. Un atacante podría apuntar a `http://169.254.169.254` (metadata de AWS/cloud) o `http://localhost:5432` / `http://redis:6379`.
- **Mitigación**:
  - Validación de esquemas de URL: Solo se permiten protocolos `http:` y `https:`.
  - Resolución DNS previa y filtrado de rangos privados (RFC 1918: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.1`, `::1`), link-local (`169.254.0.0/16`) y dominios locales antes de realizar la petición HTTP.
  - Tiempos de espera máximos de 8 segundos y límites de tamaño de respuesta (máximo 5MB).

## 4. Seguridad en Publicación y Políticas de Meta

- **Sin evasión ni scraping**: Queda estrictamente prohibido simular clics en grupos, inyectar cookies en navegadores headless o usar cuentas personales como bots.
- **Idempotencia**: Todo trabajo de publicación genera un `idempotency_key` único `hash(organization_id + draft_id + page_id + scheduled_slot)`. Si la red falla tras enviar el paquete a Meta, el worker realiza una consulta de conciliación a la Graph API antes de reintentar para evitar publicaciones duplicadas.
