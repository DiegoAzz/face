import { describe, it, expect } from 'vitest';
import { encryptSecret, decryptSecret } from '../../packages/integrations/src/crypto';

describe('Integrations - Crypto Suite (AES-256-GCM)', () => {
  it('debe cifrar y descifrar un token de Meta conservando el valor original', () => {
    const rawMetaToken = 'EAABsbCS1iHgBA...token_secreto_de_pagina_meta_facebook_12345';
    const encrypted = encryptSecret(rawMetaToken);

    expect(encrypted).not.toBe(rawMetaToken);
    expect(encrypted.split(':')).toHaveLength(3); // iv:authTag:ciphertext

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(rawMetaToken);
  });

  it('debe fallar si el payload cifrado ha sido alterado (integridad autenticada)', () => {
    const raw = 'clave_confidencial';
    const encrypted = encryptSecret(raw);
    const tampered = encrypted.slice(0, -4) + 'AAAA';

    expect(() => decryptSecret(tampered)).toThrow();
  });
});
