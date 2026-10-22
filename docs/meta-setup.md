# Configuración de Meta Developers y Graph API — NewsFlow AI

## 1. Requisitos Previos y Permisos Oficiales

Para conectar NewsFlow AI con Facebook, se requiere una aplicación registrada en [Meta for Developers](https://developers.facebook.com/).

### Permisos Requeridos (Scopes)

| Permiso | Propósito | Nivel de Aprobación |
|---|---|---|
| `pages_show_list` | Permite a la app listar las páginas administradas por el usuario autenticado. | App Review requerido para usuarios externos. |
| `pages_read_engagement` | Permite leer estadísticas, métricas de engagement y estado de publicaciones. | App Review requerido. |
| `pages_manage_posts` | Permite publicar texto, enlaces e imágenes en el feed de la página. | App Review requerido y verificación comercial (Business Verification). |

> [!IMPORTANT]
> **Retiro de Groups API**: Meta deprecó y retiró permanentemente los permisos de publicación en grupos (`publish_to_groups`) a partir de la versión 19.0 (abril de 2024). NewsFlow AI no incluye ni intenta usar APIs de grupos, sino un panel editorial de asistencia manual para cumplir al 100% las políticas de Meta.

## 2. Paso a Paso en Meta Developers

1. **Crear la App**:
   - Accede a https://developers.facebook.com/apps/ y haz clic en **Crear app**.
   - Tipo de app: Selecciona **Negocio** (Business).
   - Asigna un nombre (ej. `NewsFlow AI`) y tu correo de contacto comercial.

2. **Agregar el Producto "Inicio de sesión de Facebook para empresas"**:
   - En el panel de productos, añade **Facebook Login for Business**.
   - En la configuración de Facebook Login:
     - URIs de redireccionamiento de OAuth válidos:
       - Producción: `https://noticias.tudominio.com/api/meta/connect/callback`
       - Desarrollo: `http://localhost:3000/api/meta/connect/callback`
     - Desactiva el inicio de sesión web con JavaScript si no se utiliza en el frontend.

3. **Obtener Credenciales de la App**:
   - Ve a **Configuración de la app > Básica**.
   - Copia el **Identificador de la app (App ID)** y la **Clave secreta de la app (App Secret)**.
   - Colócalas en tus variables de entorno (`META_APP_ID`, `META_APP_SECRET`).

4. **Modo Desarrollo vs. Producción**:
   - En **Modo Desarrollo**, la integración solo funcionará para administradores, desarrolladores o testers dados de alta en el panel de la app.
   - Para abrir la integración a usuarios finales, debes completar el proceso de **Verificación de Negocio (Business Verification)** y solicitar la **Revisión de la aplicación (App Review)** para los permisos `pages_manage_posts`, `pages_read_engagement` y `pages_show_list`.

## 3. Flujo OAuth y Renovación de Tokens

```text
Usuario (Admin Org)              NewsFlow AI API                  Meta OAuth
     |                                 |                               |
     |--- Inicia conexión ------------>|                               |
     |                                 |--- Genera State seguro + CSRF>|
     |<-- Redirige a URL de Meta ------|                               |
     |                                                                 |
     |--- Autoriza permisos y páginas seleccionadas ------------------>|
     |                                                                 |
     |<-- Redirección con Code + State --------------------------------|
     |                                                                 |
     |--- Callback con Code ---------->|                               |
     |                                 |--- Canjea Code por User Token>|
     |                                 |<-- Short-Lived User Token ----|
     |                                 |--- Intercambia por Long-Lived>|
     |                                 |<-- Long-Lived Token (60 días)-|
     |                                 |--- Consulta /me/accounts ---->|
     |                                 |<-- Lista de Páginas + Tokens -|
     |                                 | [Cifra tokens AES-256-GCM]    |
     |                                 | [Guarda en Base de Datos]     |
     |<-- Notifica páginas conectadas -|                               |
```

## 4. Auditoría y Manejo de Errores Comunes de Meta

| Código de Error Meta | Causa | Acción del Sistema |
|---|---|---|
| `190` | Token expirado, usuario cambió contraseña o revocó permisos. | Desactiva `publishing_enabled` para la página, genera alerta de sistema y solicita reconexión. |
| `4` / `17` / `341` | Rate limit alcanzado de la Graph API. | Pausa envíos a la página, reprograma en cola BullMQ con backoff exponencial. |
| `200` | La aplicación no tiene permiso suficiente para la página. | Marca el borrador como `FAILED_FINAL` y alerta al administrador. |
| `Timeout / 5xx` | Servidor de Meta no responde o tiempo agotado. | Consulta `GET /{page_id}/feed` filtrando por el timestamp reciente para validar si el post se creó antes de reintentar. |
