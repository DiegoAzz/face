import axios from 'axios';
import { MetaPostPublishResult } from '@newsflow/shared-types';

export interface MetaPagePublishOptions {
  pageId: string;
  pageAccessToken: string;
  message: string;
  link?: string;
  imageUrl?: string;
  isTestMode?: boolean;
}

export interface MetaRecentPost {
  id: string;
  message?: string;
  created_time: string;
}

export class MetaPagePublisher {
  private apiVersion: string;
  private baseUrl: string;

  constructor(apiVersion = 'v19.0') {
    this.apiVersion = process.env.META_GRAPH_API_VERSION || apiVersion;
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * Publica un mensaje o enlace en el feed de la Página de Facebook autorizada.
   */
  async publishToPage(options: MetaPagePublishOptions): Promise<MetaPostPublishResult> {
    const { pageId, pageAccessToken, message, link, isTestMode } = options;

    // Si está en modo prueba explícito sin llamadas remotas a Facebook
    if (isTestMode) {
      return {
        success: true,
        remotePostId: `${pageId}_mock_test_${Date.now()}`,
        isRetryable: false,
      };
    }

    try {
      let endpoint = `${this.baseUrl}/${pageId}/feed`;
      const payload: Record<string, any> = {
        message,
        access_token: pageAccessToken,
      };

      if (options.imageUrl) {
        endpoint = `${this.baseUrl}/${pageId}/photos`;
        payload.url = options.imageUrl;
        payload.caption = link ? `${message}\n\nEnlace oficial: ${link}` : message;
        delete payload.message;
      } else if (link) {
        payload.link = link;
      }

      const response = await axios.post(endpoint, payload, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.data && response.data.id) {
        return {
          success: true,
          remotePostId: response.data.id,
          isRetryable: false,
        };
      }

      return {
        success: false,
        errorMessage: 'Respuesta de Meta no contiene ID de publicación',
        isRetryable: true,
      };
    } catch (error: any) {
      return this.handleMetaApiError(error);
    }
  }

  /**
   * Reconcilia el estado remoto consultando las publicaciones recientes de la página.
   * Evita duplicados si ocurrió un timeout tras el envío inicial.
   */
  async reconcileRecentPost(
    pageId: string,
    pageAccessToken: string,
    messageSignature: string
  ): Promise<string | null> {
    try {
      const endpoint = `${this.baseUrl}/${pageId}/feed`;
      const response = await axios.get(endpoint, {
        params: {
          access_token: pageAccessToken,
          limit: 5,
          fields: 'id,message,created_time',
        },
        timeout: 10000,
      });

      const posts: MetaRecentPost[] = response.data?.data || [];
      const match = posts.find((p) => p.message && p.message.includes(messageSignature.slice(0, 50)));

      return match ? match.id : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Clasifica los códigos de error de Meta Graph API.
   */
  private handleMetaApiError(error: any): MetaPostPublishResult {
    const metaError = error.response?.data?.error;
    const code = metaError?.code;
    const subcode = metaError?.error_subcode;
    const message = metaError?.message || error.message;

    // Token expirado o revocado (190)
    if (code === 190) {
      return {
        success: false,
        errorCode: 190,
        errorMessage: 'Token de acceso de la página expirado o revocado. Se requiere reconexión oficial.',
        isRetryable: false,
      };
    }

    // Rate limits (4, 17, 341)
    if (code === 4 || code === 17 || code === 341) {
      return {
        success: false,
        errorCode: code,
        errorMessage: 'Límite de peticiones de Meta alcanzado (Rate Limit). Reprogramando con backoff.',
        isRetryable: true,
      };
    }

    // Falta de permisos (200, 283)
    if (code === 200 || code === 283) {
      return {
        success: false,
        errorCode: code,
        errorMessage: `Permiso insuficiente en Meta (${code}): Verifique que la app tenga pages_manage_posts aprobado.`,
        isRetryable: false,
      };
    }

    // Error de red transitorio o timeout
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || !error.response) {
      return {
        success: false,
        errorCode: 504,
        errorMessage: 'Timeout o problema de red al comunicar con Meta Graph API.',
        isRetryable: true,
      };
    }

    return {
      success: false,
      errorCode: code || 500,
      errorMessage: `Error de Meta API: ${message}`,
      isRetryable: false,
    };
  }
}
