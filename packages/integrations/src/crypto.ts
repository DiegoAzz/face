import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recomendado para GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Obtiene la clave de 32 bytes a partir de la variable de entorno TOKEN_ENCRYPTION_KEY.
 */
function getEncryptionKey(): Buffer {
  const hexKey = process.env.TOKEN_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  if (hexKey.length !== 64) {
    throw new Error('TOKEN_ENCRYPTION_KEY debe ser una cadena hexadecimal de 64 caracteres (32 bytes).');
  }
  return Buffer.from(hexKey, 'hex');
}

/**
 * Cifra un texto plano utilizando AES-256-GCM.
 * Devuelve una cadena con formato: iv:authTag:ciphertext en base64.
 */
export function encryptSecret(plainText: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Descifra una cadena cifrada en formato iv:authTag:ciphertext.
 */
export function decryptSecret(encryptedPayload: string): string {
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Formato de secreto cifrado inválido.');
  }

  const [ivBase64, authTagBase64, cipherTextBase64] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(cipherTextBase64, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
