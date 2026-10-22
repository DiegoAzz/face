# Manual de Operaciones y Resolución de Incidencias (Runbook) — NewsFlow AI

## 1. Verificación de Salud del Sistema

### Endpoints de Monitoreo
- **Liveness probe**: `GET https://noticias.tudominio.com/api/health/live`
  - Responde `200 OK {"status":"ok"}` si el proceso NestJS está en ejecución.
- **Readiness probe**: `GET https://noticias.tudominio.com/api/health/ready`
  - Responde `200 OK` únicamente si la conexión a PostgreSQL y Redis está activa. Si alguna falla, responde `503 Service Unavailable`.

### Estado de las Colas BullMQ
- Monitoreo en el panel web bajo la sección **Administración > Estado de Workers**.
- Muestra el recuento de trabajos: `Waiting`, `Active`, `Completed`, `Failed`, `Delayed`.

---

## 2. Protocolos de Resolución de Incidencias

### Incidencia 1: Token de Meta Expirado o Revocado (Error 190)
- **Síntoma**: Los trabajos de publicación en la cola fallan con el código de error `META_TOKEN_EXPIRED` (código Meta 190).
- **Acción inmediata**:
  1. El sistema automáticamente desactiva la publicación para esa página (`publishing_enabled: false`) y coloca los borradores en estado `FAILED_RETRYABLE`.
  2. Notifica en el dashboard al Administrador de Organización: "La conexión con la página [Nombre] ha expirado".
  3. El Administrador debe ir a **Páginas de Facebook** y hacer clic en **Reconectar Página con Meta**.
  4. Una vez renovado el token, reactivar la publicación y presionar **Reintentar envíos pendientes**.

### Incidencia 2: Fallo de Conectividad o Timeout de Fuente RSS
- **Síntoma**: Una fuente RSS reporta errores consecutivos de timeout o 404/500 en la vista de Fuentes.
- **Acción inmediata**:
  1. El worker de ingesta aísla el fallo mediante un circuit breaker por fuente: la fuente pasa a estado `DEGRADED`.
  2. Las demás fuentes siguen procesándose normalmente sin interrupción.
  3. En **Fuentes**, el editor o admin puede pulsar **Probar Conexión** para inspeccionar la respuesta HTTP cruda y actualizar la URL del feed si el medio cambió su endpoint.

### Incidencia 3: Falla en Proveedor de IA (Rate Limit / 503 / Salida Inválida)
- **Síntoma**: Los borradores se quedan en estado de análisis o fallan con error de validación JSON.
- **Acción inmediata**:
  1. El worker `editorial-ai` reintenta hasta 3 veces con jitter exponencial.
  2. Si el fallo persiste, el cluster de historias pasa a estado `REVIEW_REQUIRED` con una nota: `AI_GENERATION_FAILED`.
  3. El editor humano puede redactar o completar el borrador directamente en la **Sala Editorial** sin depender de la IA.
  4. Verificar las cuotas y balance de la API del proveedor de IA en la configuración del sistema.

### Incidencia 4: Timeout tras Envío de Publicación a Meta
- **Síntoma**: La petición HTTP a `graph.facebook.com` superó el timeout de 15 segundos sin recibir confirmación del `remote_post_id`.
- **Acción obligatoria (Prevención de Duplicados)**:
  1. **NUNCA reintentar un POST ciegamente**.
  2. El worker de publicación ejecuta una rutina de reconciliación: realiza una consulta `GET /{page_id}/feed?limit=5` con el token de la página.
  3. Compara el texto y el `idempotency_key` o hash del borrador en las publicaciones recientes de los últimos 10 minutos.
  4. Si el post ya existe en Meta, asocia el `remote_post_id` existente y marca el trabajo como `PUBLISHED`.
  5. Si no existe, reintenta el envío de forma segura.

### Incidencia 5: Reinicio Repentino del VPS / Servidor
- **Síntoma**: El contenedor o VPS se reinició durante una ejecución de publicación.
- **Acción del sistema**:
  1. BullMQ sobre Redis persistente mantiene los trabajos en cola con sus bloqueos distribuidos.
  2. Al reiniciar, el scheduler verifica los trabajos en estado `PUBLISHING`. Si un trabajo quedó huérfano, ejecuta la rutina de reconciliación antes de volver a encolar.
  3. Ninguna publicación se duplica.
