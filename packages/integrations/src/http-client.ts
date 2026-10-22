import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import * as dns from 'dns';
import { promisify } from 'util';
import * as url from 'url';

const lookupAsync = promisify(dns.lookup);

/**
 * Valida que una dirección IP no pertenezca a rangos privados, loopback o metadata local.
 */
export function isPrivateIp(ip: string): boolean {
  // IPv4 Loopback
  if (ip.startsWith('127.')) return true;
  // IPv4 Link-local / Cloud metadata (AWS/Azure/GCP 169.254.169.254)
  if (ip.startsWith('169.254.')) return true;
  // IPv4 RFC 1918 Private Ranges
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
  // IPv6 Loopback / Link-local
  if (ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd00:')) return true;
  if (ip === '0.0.0.0' || ip === '::') return true;

  return false;
}

/**
 * Valida una URL contra ataques SSRF resolviendo su IP y verificando que sea pública.
 */
export async function validateSafeUrl(targetUrl: string): Promise<void> {
  const parsed = url.parse(targetUrl);

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Protocolo no permitido: ${parsed.protocol}. Solo se permite http o https.`);
  }

  const hostname = parsed.hostname;
  if (!hostname) {
    throw new Error('URL inválida: hostname no encontrado.');
  }

  // Prevenir acceso directo a localhost
  if (hostname.toLowerCase() === 'localhost') {
    throw new Error('Acceso no permitido: el host localhost está bloqueado.');
  }

  try {
    const { address } = await lookupAsync(hostname);
    if (isPrivateIp(address)) {
      throw new Error(`Acceso bloqueado por política SSRF: el host ${hostname} resuelve a una dirección privada (${address}).`);
    }
  } catch (err: any) {
    if (err.message.includes('SSRF')) throw err;
    throw new Error(`Fallo de resolución DNS para el host ${hostname}: ${err.message}`);
  }
}

/**
 * Instancia de cliente HTTP configurada de forma segura para consultas externas.
 */
export function createSafeHttpClient(config?: AxiosRequestConfig): AxiosInstance {
  return axios.create({
    timeout: 10000, // 10 segundos timeout máximo
    maxContentLength: 5 * 1024 * 1024, // Máximo 5MB
    headers: {
      'User-Agent': 'NewsFlowAI-Bot/1.0 (+https://noticias.tudominio.com; contacto-editorial)',
    },
    ...config,
  });
}
