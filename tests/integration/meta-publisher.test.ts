import { describe, it, expect } from 'vitest';
import { MetaPagePublisher } from '../../packages/integrations/src/meta-publisher';

describe('MetaPagePublisher Suite', () => {
  const publisher = new MetaPagePublisher('v19.0');

  it('debe responder exitosamente con ID simulado en modo test explícito', async () => {
    const result = await publisher.publishToPage({
      pageId: '1029384756',
      pageAccessToken: 'mock_token',
      message: 'Noticia de prueba en Colombia',
      isTestMode: true,
    });

    expect(result.success).toBe(true);
    expect(result.remotePostId).toContain('1029384756_mock_test_');
    expect(result.isRetryable).toBe(false);
  });

  it('debe identificar error 190 como no reintentable y requerir reconexión', async () => {
    // Simulación de error de Meta
    const mockError = {
      response: {
        data: {
          error: {
            message: 'Session has expired',
            code: 190,
          },
        },
      },
    };

    const handled = (publisher as any).handleMetaApiError(mockError);
    expect(handled.success).toBe(false);
    expect(handled.errorCode).toBe(190);
    expect(handled.isRetryable).toBe(false);
    expect(handled.errorMessage).toContain('expirado o revocado');
  });

  it('debe clasificar el error 4 o 17 (rate limit) como reintentable con backoff', async () => {
    const mockError = {
      response: {
        data: {
          error: {
            message: 'User request limit reached',
            code: 4,
          },
        },
      },
    };

    const handled = (publisher as any).handleMetaApiError(mockError);
    expect(handled.success).toBe(false);
    expect(handled.isRetryable).toBe(true);
  });
});
