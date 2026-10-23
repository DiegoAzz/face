import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { encryptSecret, decryptSecret } from '@newsflow/integrations';
import axios from 'axios';

@Injectable()
export class YouTubeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene las credenciales de Google OAuth desde variables de entorno o configuración de base de datos.
   */
  async getCredentials(organizationId?: string): Promise<{ clientId: string; clientSecret: string; redirectUri: string }> {
    let clientId = process.env.GOOGLE_CLIENT_ID || '';
    let clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

    if ((!clientId || !clientSecret) && organizationId) {
      const setting = await this.prisma.systemSetting.findFirst({
        where: { organizationId, key: 'GOOGLE_OAUTH_CREDENTIALS' },
      });
      if (setting) {
        try {
          const parsed = JSON.parse(setting.valueJson);
          if (parsed.clientId) clientId = parsed.clientId;
          if (parsed.clientSecret) clientSecret = parsed.clientSecret;
        } catch {}
      }
    }

    const appUrl = process.env.APP_URL || 'https://face.appzplay.online';
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI || `${appUrl}/api/youtube/callback`;

    return { clientId, clientSecret, redirectUri };
  }

  /**
   * Guarda las credenciales de Google OAuth configuradas desde el panel administrativo.
   */
  async saveCredentials(organizationId: string, data: { clientId: string; clientSecret: string }) {
    if (!data.clientId || !data.clientSecret) {
      throw new BadRequestException('Client ID y Client Secret son requeridos.');
    }

    await this.prisma.systemSetting.upsert({
      where: {
        organizationId_key: {
          organizationId,
          key: 'GOOGLE_OAUTH_CREDENTIALS',
        },
      },
      update: {
        valueJson: JSON.stringify({
          clientId: data.clientId.trim(),
          clientSecret: data.clientSecret.trim(),
        }),
      },
      create: {
        organizationId,
        key: 'GOOGLE_OAUTH_CREDENTIALS',
        valueJson: JSON.stringify({
          clientId: data.clientId.trim(),
          clientSecret: data.clientSecret.trim(),
        }),
      },
    });

    return { success: true, message: 'Credenciales de Google OAuth guardadas exitosamente.' };
  }

  /**
   * Genera la URL para iniciar el flujo de consentimiento OAuth con Google/YouTube.
   */
  async getOAuthStartUrl(organizationId: string): Promise<string> {
    const { clientId, redirectUri } = await this.getCredentials(organizationId);

    if (!clientId) {
      throw new BadRequestException(
        'Las credenciales de Google OAuth no están configuradas. Ingrésalas en la configuración o en las variables de entorno.'
      );
    }

    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent',
      state: organizationId,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Procesa el código devuelto por Google y registra el canal vinculado.
   */
  async handleOAuthCallback(code: string, organizationId: string): Promise<any> {
    if (!code) {
      throw new BadRequestException('Código de autorización de Google no proporcionado.');
    }

    const { clientId, clientSecret, redirectUri } = await this.getCredentials(organizationId);

    // 1. Canjear código por tokens (access_token y refresh_token)
    let tokenRes: any;
    try {
      tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      });
    } catch (err: any) {
      const gMsg = err.response?.data?.error_description || err.response?.data?.error || err.message;
      throw new BadRequestException(`Google rechazó el código OAuth: ${gMsg}`);
    }

    const { access_token, refresh_token } = tokenRes.data;

    // 2. Obtener información del canal de YouTube asociado
    let channelRes: any;
    try {
      channelRes = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: {
          part: 'snippet',
          mine: true,
        },
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
    } catch (err: any) {
      const yMsg = err.response?.data?.error?.message || err.message;
      throw new BadRequestException(`No se pudo obtener información del canal de YouTube: ${yMsg}`);
    }

    const items = channelRes.data?.items;
    if (!items || items.length === 0) {
      throw new BadRequestException('No se encontró ningún canal de YouTube activo en esta cuenta de Google.');
    }

    const channelItem = items[0];
    const channelId = channelItem.id;
    const channelTitle = channelItem.snippet?.title || 'Mi Canal de YouTube';
    const channelThumbnail = channelItem.snippet?.thumbnails?.default?.url || null;

    // 3. Cifrar refresh token con AES-256-GCM
    const tokenToStore = refresh_token || access_token;
    const encryptedRefreshToken = encryptSecret(tokenToStore);

    // 4. Guardar o actualizar en la base de datos
    const channel = await this.prisma.youTubeChannel.upsert({
      where: {
        organizationId_channelId: {
          organizationId,
          channelId,
        },
      },
      update: {
        channelTitle,
        channelThumbnail,
        encryptedRefreshToken,
        status: 'ACTIVE',
        publishingEnabled: true,
      },
      create: {
        organizationId,
        channelId,
        channelTitle,
        channelThumbnail,
        encryptedRefreshToken,
        status: 'ACTIVE',
        publishingEnabled: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        action: 'CONNECT_YOUTUBE_CHANNEL',
        targetType: 'YOUTUBE_CHANNEL',
        targetId: channel.id,
        metadataRedacted: JSON.stringify({ channelTitle, channelId }),
      },
    });

    return channel;
  }

  /**
   * Obtiene todos los canales vinculados a la organización.
   */
  async getChannels(organizationId: string) {
    return this.prisma.youTubeChannel.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Renueva el Access Token de YouTube usando el Refresh Token cifrado.
   */
  private async getFreshAccessToken(channel: any): Promise<string> {
    const rawToken = decryptSecret(channel.encryptedRefreshToken);
    const { clientId, clientSecret } = await this.getCredentials(channel.organizationId);

    try {
      const res = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: rawToken,
        grant_type: 'refresh_token',
      });
      return res.data.access_token;
    } catch (err: any) {
      return rawToken;
    }
  }

  /**
   * Sube un video vertical directamente como YouTube Short de forma 100% automática.
   */
  async publishShort(
    channelDbId: string,
    organizationId: string,
    data: { title: string; description: string; videoBase64: string }
  ) {
    const channel = await this.prisma.youTubeChannel.findFirst({
      where: { id: channelDbId, organizationId },
    });

    if (!channel) {
      throw new NotFoundException('Canal de YouTube no encontrado.');
    }

    const accessToken = await this.getFreshAccessToken(channel);
    const videoBuffer = Buffer.from(data.videoBase64, 'base64');

    // 1. Iniciar sesión de subida resumible en YouTube
    let initRes: any;
    try {
      const cleanTitle = data.title.includes('#Shorts')
        ? data.title.slice(0, 100)
        : `${data.title.slice(0, 90)} #Shorts`;

      initRes = await axios.post(
        'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
        {
          snippet: {
            title: cleanTitle,
            description: `${data.title}\n\n${data.description}\n\n#Shorts #Noticias #Tendencias`,
            categoryId: '25', // Noticias y Política
            tags: ['Shorts', 'Noticias', 'Actualidad', 'Colombia', 'Viral'],
          },
          status: {
            privacyStatus: 'public',
            selfDeclaredMadeForKids: false,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Upload-Content-Type': 'video/mp4',
            'X-Upload-Content-Length': videoBuffer.length,
          },
        }
      );
    } catch (err: any) {
      const yMsg = err.response?.data?.error?.message || err.message;
      throw new BadRequestException(`Error iniciando subida a YouTube: ${yMsg}`);
    }

    const uploadUrl = initRes.headers.location;
    if (!uploadUrl) {
      throw new BadRequestException('YouTube no devolvió la URL de carga.');
    }

    // 2. Subir los bytes del video
    let uploadRes: any;
    try {
      uploadRes = await axios.put(uploadUrl, videoBuffer, {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': videoBuffer.length,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 120000,
      });
    } catch (err: any) {
      const yMsg = err.response?.data?.error?.message || err.message;
      throw new BadRequestException(`Error enviando bytes de video a YouTube: ${yMsg}`);
    }

    const videoId = uploadRes.data?.id;

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        action: 'PUBLISH_YOUTUBE_SHORT',
        targetType: 'YOUTUBE_CHANNEL',
        targetId: channel.id,
        metadataRedacted: JSON.stringify({ videoId, channelTitle: channel.channelTitle }),
      },
    });

    return {
      success: true,
      videoId,
      url: `https://youtube.com/shorts/${videoId}`,
      channelTitle: channel.channelTitle,
    };
  }
}
