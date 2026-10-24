import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { encryptSecret, decryptSecret } from '@newsflow/integrations';
import axios from 'axios';

@Injectable()
export class MetaService {
  constructor(private readonly prisma: PrismaService) {}

  getOAuthStartUrl(organizationId: string) {
    const appId = process.env.META_APP_ID;
    const redirectUri = process.env.META_REDIRECT_URI || 'https://face.appzplay.online/api/meta/connect/callback';

    if (!appId) {
      throw new BadRequestException('META_APP_ID no está configurado en las variables de entorno.');
    }

    // Permisos vigentes requeridos según PRD Sección 4 - M02
    const scopes = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'].join(',');
    const state = Buffer.from(JSON.stringify({ organizationId, timestamp: Date.now() })).toString('base64');

    return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${encodeURIComponent(scopes)}&state=${state}&response_type=code`;
  }

  async handleOAuthCallback(code: string, stateBase64: string) {
    let orgId: string;
    try {
      const decoded = JSON.parse(Buffer.from(stateBase64, 'base64').toString('utf8'));
      orgId = decoded.organizationId;
    } catch {
      throw new BadRequestException('Parámetro state inválido o expirado');
    }

    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const redirectUri = process.env.META_REDIRECT_URI || 'https://face.appzplay.online/api/meta/connect/callback';

    // 1. Intercambiar code por User Access Token
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token`;
    const tokenRes = await axios.get(tokenUrl, {
      params: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code,
      },
      timeout: 10000,
    });

    const shortLivedToken = tokenRes.data.access_token;

    // 2. Intercambiar por Long-Lived Token (60 días)
    const longTokenRes = await axios.get(tokenUrl, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortLivedToken,
      },
      timeout: 10000,
    });

    const longLivedToken = longTokenRes.data.access_token;
    const expiresIn = longTokenRes.data.expires_in;

    // 3. Obtener ID del usuario de Meta
    const meRes = await axios.get('https://graph.facebook.com/v19.0/me', {
      params: { access_token: longLivedToken },
      timeout: 10000,
    });
    const metaUserId = meRes.data.id;

    // 4. Cifrar token con AES-256-GCM
    const encryptedTokenRef = encryptSecret(longLivedToken);

    // 5. Guardar conexión en DB
    const connection = await this.prisma.metaConnection.create({
      data: {
        organizationId: orgId,
        metaUserId,
        encryptedTokenRef,
        scopes: JSON.stringify(['pages_show_list', 'pages_read_engagement', 'pages_manage_posts']),
        expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
        status: 'ACTIVE',
      },
    });

    // 6. Obtener páginas administradas (/me/accounts)
    const accountsRes = await axios.get('https://graph.facebook.com/v19.0/me/accounts', {
      params: { access_token: longLivedToken },
      timeout: 10000,
    });

    const pages = accountsRes.data.data || [];
    for (const p of pages) {
      const pageTokenEncrypted = encryptSecret(p.access_token);

      await this.prisma.facebookPage.upsert({
        where: {
          organizationId_pageId: {
            organizationId: orgId,
            pageId: p.id,
          },
        },
        update: {
          pageName: p.name,
          tokenRef: pageTokenEncrypted,
          status: 'ACTIVE',
        },
        create: {
          organizationId: orgId,
          metaConnectionId: connection.id,
          pageId: p.id,
          pageName: p.name,
          tokenRef: pageTokenEncrypted,
          publishingEnabled: false, // Por defecto deshabilitada hasta configuración
          status: 'ACTIVE',
        },
      });
    }

    return {
      message: 'Conexión con Meta completada exitosamente',
      pagesCount: pages.length,
    };
  }

  async getPages(organizationId: string) {
    const pages = await this.prisma.facebookPage.findMany({
      where: { organizationId },
      select: {
        id: true,
        pageId: true,
        pageName: true,
        publishingEnabled: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        schedules: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return pages;
  }

  async setPublishingStatus(pageDbId: string, organizationId: string, enabled: boolean) {
    const page = await this.prisma.facebookPage.findFirst({
      where: { id: pageDbId, organizationId },
    });

    if (!page) {
      throw new NotFoundException('Página de Facebook no encontrada');
    }

    const updated = await this.prisma.facebookPage.update({
      where: { id: pageDbId },
      data: { publishingEnabled: enabled },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        action: enabled ? 'ENABLE_PAGE_PUBLISHING' : 'DISABLE_PAGE_PUBLISHING',
        targetType: 'FACEBOOK_PAGE',
        targetId: pageDbId,
        metadataRedacted: JSON.stringify({ pageName: page.pageName, enabled }),
      },
    });

    return updated;
  }

  async addManualPage(
    organizationId: string,
    data: { pageId: string; pageName?: string; pageAccessToken: string }
  ) {
    const { pageId, pageAccessToken } = data;
    if (!pageId || !pageAccessToken) {
      throw new BadRequestException('El Page ID y el Page Access Token son requeridos.');
    }

    let resolvedName = data.pageName;
    try {
      const res = await axios.get(`https://graph.facebook.com/v19.0/${pageId.trim()}`, {
        params: {
          fields: 'id,name',
          access_token: pageAccessToken.trim(),
        },
        timeout: 10000,
      });
      if (res.data?.name) {
        resolvedName = res.data.name;
      }
    } catch (err: any) {
      const metaMsg = err.response?.data?.error?.message || err.message;
      throw new BadRequestException(`Meta rechazó las credenciales: ${metaMsg}`);
    }

    const tokenRef = encryptSecret(pageAccessToken.trim());

    const page = await this.prisma.facebookPage.upsert({
      where: {
        organizationId_pageId: {
          organizationId,
          pageId: pageId.trim(),
        },
      },
      update: {
        pageName: resolvedName || 'Mi Página de Facebook',
        tokenRef,
        publishingEnabled: true,
        status: 'ACTIVE',
      },
      create: {
        organization: { connect: { id: organizationId } },
        pageId: pageId.trim(),
        pageName: resolvedName || 'Mi Página de Facebook',
        tokenRef,
        publishingEnabled: true,
        status: 'ACTIVE',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        action: 'CONNECT_FACEBOOK_PAGE_MANUAL',
        targetType: 'FACEBOOK_PAGE',
        targetId: page.id,
        metadataRedacted: JSON.stringify({ pageName: page.pageName, pageId: page.pageId }),
      },
    });

    return {
      message: 'Página vinculada y verificada exitosamente en Meta',
      page,
    };
  }

  async getDecryptedPageToken(pageDbId: string, organizationId: string): Promise<string> {
    const page = await this.prisma.facebookPage.findFirst({
      where: { id: pageDbId, organizationId },
    });

    if (!page) {
      throw new NotFoundException('Página no encontrada');
    }

    return decryptSecret(page.tokenRef);
  }

  async publishVideoToPage(
    pageDbId: string,
    organizationId: string,
    data: { title: string; description: string; videoBase64: string }
  ) {
    const page = await this.prisma.facebookPage.findFirst({
      where: { id: pageDbId, organizationId },
    });

    if (!page) {
      throw new NotFoundException('Página de Facebook no encontrada');
    }

    const token = decryptSecret(page.tokenRef);
    const videoBuffer = Buffer.from(data.videoBase64, 'base64');

    // Usar FormData nativo de Node 20
    const formData = new globalThis.FormData();
    formData.append('access_token', token);
    formData.append('title', data.title || 'Noticia al Instante');
    formData.append('description', data.description || '');
    const blob = new globalThis.Blob([videoBuffer], { type: 'video/mp4' });
    formData.append('source', blob, 'reel.mp4');

    try {
      const res = await axios.post(
        `https://graph.facebook.com/v19.0/${page.pageId}/videos`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 90000,
        }
      );

      await this.prisma.auditLog.create({
        data: {
          organizationId,
          action: 'PUBLISH_VIDEO_REEL',
          targetType: 'FACEBOOK_PAGE',
          targetId: page.id,
          metadataRedacted: JSON.stringify({ pageName: page.pageName, videoId: res.data?.id }),
        },
      });

      return {
        success: true,
        remoteVideoId: res.data?.id,
        pageName: page.pageName,
      };
    } catch (err: any) {
      const metaMsg = err.response?.data?.error?.message || err.message;
      throw new BadRequestException(`Meta rechazó la subida del video: ${metaMsg}`);
    }
  }

  async publishPhotoToPage(
    pageDbId: string,
    organizationId: string,
    data: { caption: string; photoBase64?: string; photoUrl?: string }
  ) {
    const page = await this.prisma.facebookPage.findFirst({
      where: { id: pageDbId, organizationId },
    });

    if (!page) {
      throw new NotFoundException('Página de Facebook no encontrada');
    }

    const token = decryptSecret(page.tokenRef);

    try {
      let res;
      if (data.photoBase64) {
        // Subida de foto en Base64 (con titular viral y trazo negro)
        const photoBuffer = Buffer.from(
          data.photoBase64.replace(/^data:image\/\w+;base64,/, ''),
          'base64'
        );
        const formData = new globalThis.FormData();
        formData.append('access_token', token);
        formData.append('caption', data.caption || '');
        const blob = new globalThis.Blob([photoBuffer], { type: 'image/jpeg' });
        formData.append('source', blob, 'noticia_viral.jpg');

        res = await axios.post(
          `https://graph.facebook.com/v19.0/${page.pageId}/photos`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            timeout: 60000,
          }
        );
      } else if (data.photoUrl) {
        res = await axios.post(
          `https://graph.facebook.com/v19.0/${page.pageId}/photos`,
          {
            access_token: token,
            url: data.photoUrl,
            caption: data.caption || '',
          },
          { timeout: 30000 }
        );
      } else {
        throw new BadRequestException('Se requiere photoBase64 o photoUrl');
      }

      await this.prisma.auditLog.create({
        data: {
          organizationId,
          action: 'PUBLISH_PHOTO_POST',
          targetType: 'FACEBOOK_PAGE',
          targetId: page.id,
          metadataRedacted: JSON.stringify({ pageName: page.pageName, photoId: res.data?.id }),
        },
      });

      return {
        success: true,
        remotePostId: res.data?.post_id || res.data?.id,
        photoId: res.data?.id,
        pageName: page.pageName,
      };
    } catch (err: any) {
      const metaMsg = err.response?.data?.error?.message || err.message;
      throw new BadRequestException(`Meta rechazó la publicación de la foto: ${metaMsg}`);
    }
  }
}
