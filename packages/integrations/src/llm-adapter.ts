import axios from 'axios';
import { EditorialOutput, EditorialOutputSchema, RiskFlag } from '@newsflow/shared-types';

export interface GenerateDraftInput {
  title: string;
  excerpt: string;
  sourceName: string;
  sourceUrl: string;
  category: string;
  publishedAt: string;
}

export interface LLMAdapter {
  generateDraft(input: GenerateDraftInput): Promise<EditorialOutput>;
}

/**
 * Adaptador para proveedores LLM externos (OpenAI / Gemini / Anthropic)
 */
export class ExternalLLMAdapter implements LLMAdapter {
  private apiKey: string;
  private provider: string;
  private model: string;

  constructor(provider = 'openai', apiKey?: string, model = 'gpt-4o-mini') {
    this.provider = process.env.LLM_PROVIDER || provider;
    this.apiKey = process.env.LLM_API_KEY || apiKey || '';
    this.model = process.env.LLM_MODEL || model;
  }

  async generateDraft(input: GenerateDraftInput): Promise<EditorialOutput> {
    if (!this.apiKey) {
      throw new Error(`LLM_API_KEY no está configurada para el proveedor ${this.provider}.`);
    }

    const systemPrompt = `Eres un redactor periodístico senior de NewsFlow AI en Colombia.
Tu labor es redactar un borrador de noticia original, riguroso, objetivo y en español neutro colombiano.
REGLAS OBLIGATORIAS:
1. NUNCA inventes hechos, citas, nombres, cifras o información que no esté en el texto de entrada.
2. Si un dato no está confirmado o presenta dudas, indícalo claramente en el campo 'uncertainties'.
3. Siempre atribuye la fuente explícitamente en 'source_attribution'.
4. Identifica factores de riesgo (política, violencia, salud, desastres, crimen) y márcalos en 'risk_flags'.
5. Devuelve ÚNICAMENTE un objeto JSON válido que cumpla con el esquema requerido.`;

    const userPrompt = `Analiza la siguiente información de entrada:
Título original: ${input.title}
Extracto / Hechos: ${input.excerpt}
Medio fuente: ${input.sourceName}
URL canónica: ${input.sourceUrl}
Categoría: ${input.category}
Fecha de publicación: ${input.publishedAt}

Genera el borrador en formato JSON con la siguiente estructura:
{
      "headline": "Titular original, conciso y de alto impacto con 1 o 2 emoticones temáticos referentes al inicio (ej: 🚨, ⚽, 👶, 💰, 🤖) sin clickbait engañoso",
      "summary": "Resumen fiel, atractivo y claro de los hechos (con emoticones referentes como 👉, 📍, ⚠️, ✨ para dinamizar la lectura en Facebook)",
  "source_attribution": "${input.sourceName}",
  "source_url": "${input.sourceUrl}",
  "verification_notes": "Notas sobre la contrastación y origen de la información",
  "uncertainties": "Puntos pendientes de corroboración o hechos en desarrollo",
  "hashtags": ["#NoticiasColombia", "#Tendencia"],
  "risk_flags": ["HEALTH" | "EMERGENCY" | "CRIME" | "REPUTATION" | "MARKETS" | "ELECTIONS_POLITICS" | "VIOLENCE" | "MINORS" | "DISASTERS" | "UNCONFIRMED"]
}`;

    // Llamada a OpenAI compatible
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2, // Baja temperatura para fidelidad periodística
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 25000,
      }
    );

    const rawContent = response.data.choices[0].message.content;
    const parsedJson = JSON.parse(rawContent);

    // Validación estricta con Zod
    return EditorialOutputSchema.parse(parsedJson);
  }
}

function decodeEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(parseInt(dec, 10));
      } catch {
        return _;
      }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return _;
      }
    })
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
    .replace(/&lsquo;|&rsquo;|&#8216;|&#8217;/gi, "'")
    .replace(/&ndash;|&mdash;|&#8211;|&#8212;/gi, '-')
    .replace(/&aacute;/gi, 'á')
    .replace(/&eacute;/gi, 'é')
    .replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó')
    .replace(/&uacute;/gi, 'ú')
    .replace(/&ntilde;/gi, 'ñ')
    .replace(/&Aacute;/gi, 'Á')
    .replace(/&Eacute;/gi, 'É')
    .replace(/&Iacute;/gi, 'Í')
    .replace(/&Oacute;/gi, 'Ó')
    .replace(/&Uacute;/gi, 'Ú')
    .replace(/&Ntilde;/gi, 'Ñ');
}

export function getTopicEmojis(title: string, excerpt: string, category: string = ''): {
  titleEmoji: string;
  bodyEmoji: string;
} {
  const combined = `${title} ${excerpt} ${category}`.toLowerCase();

  // 1. Salud / Nacimientos / Bebés / Medicina
  if (
    combined.includes('cuatrillizo') ||
    combined.includes('nacieron') ||
    combined.includes('bebé') ||
    combined.includes('embarazo')
  ) {
    return { titleEmoji: '👶✨', bodyEmoji: '🍼' };
  }
  if (
    combined.includes('salud') ||
    combined.includes('médic') ||
    combined.includes('hospital') ||
    combined.includes('cirugía') ||
    combined.includes('vacuna') ||
    combined.includes('cáncer')
  ) {
    return { titleEmoji: '🩺🏥', bodyEmoji: '💊' };
  }

  // 2. Seguridad / Atentados / Bombas / Delincuencia / Policía
  if (
    combined.includes('carro bomba') ||
    combined.includes('bomba') ||
    combined.includes('explosión') ||
    combined.includes('atentado')
  ) {
    return { titleEmoji: '🚨💥', bodyEmoji: '⚠️' };
  }
  if (
    combined.includes('policía') ||
    combined.includes('captura') ||
    combined.includes('cárcel') ||
    combined.includes('delincuent') ||
    combined.includes('asesinato') ||
    combined.includes('sicariato') ||
    combined.includes('disparos')
  ) {
    return { titleEmoji: '🚨🚔', bodyEmoji: '🛑' };
  }

  // 3. Deportes / Fútbol / Ciclismo
  if (combined.includes('ciclismo') || combined.includes('tour') || combined.includes('vuelta')) {
    return { titleEmoji: '🚴🔥', bodyEmoji: '🏆' };
  }
  if (
    combined.includes('fútbol') ||
    combined.includes('futbol') ||
    combined.includes('gol') ||
    combined.includes('partido') ||
    combined.includes('champions') ||
    combined.includes('liga') ||
    combined.includes('selección')
  ) {
    return { titleEmoji: '⚽🔥', bodyEmoji: '🎯' };
  }
  if (combined.includes('deporte') || combined.includes('campeón')) {
    return { titleEmoji: '🏆🥇', bodyEmoji: '⚡' };
  }

  // 4. Farándula / Música / Famosos / Cine / Entretenimiento
  if (
    combined.includes('música') ||
    combined.includes('cantante') ||
    combined.includes('concierto') ||
    combined.includes('canción')
  ) {
    return { titleEmoji: '🎶🎤', bodyEmoji: '✨' };
  }
  if (
    combined.includes('farand') ||
    combined.includes('chisme') ||
    combined.includes('famoso') ||
    combined.includes('actor') ||
    combined.includes('actriz') ||
    combined.includes('reality') ||
    combined.includes('espectáculo')
  ) {
    return { titleEmoji: '🎭🌟', bodyEmoji: '👀' };
  }

  // 5. Economía / Dólar / Dinero / Negocios
  if (combined.includes('dólar') || combined.includes('dolar') || combined.includes('peso')) {
    return { titleEmoji: '💵📈', bodyEmoji: '📊' };
  }
  if (
    combined.includes('econom') ||
    combined.includes('inflación') ||
    combined.includes('banco') ||
    combined.includes('impuesto') ||
    combined.includes('tributaria') ||
    combined.includes('salario')
  ) {
    return { titleEmoji: '💰📊', bodyEmoji: '💼' };
  }

  // 6. Tecnología / IA / Celulares / Ciencia
  if (
    combined.includes('inteligencia artificial') ||
    combined.includes('ia') ||
    combined.includes('chatgpt') ||
    combined.includes('robot')
  ) {
    return { titleEmoji: '🤖⚡', bodyEmoji: '💡' };
  }
  if (
    combined.includes('smartphone') ||
    combined.includes('celular') ||
    combined.includes('iphone') ||
    combined.includes('app') ||
    combined.includes('tecnología')
  ) {
    return { titleEmoji: '📱💻', bodyEmoji: '🚀' };
  }
  if (combined.includes('espacio') || combined.includes('nasa') || combined.includes('planeta') || combined.includes('ciencia')) {
    return { titleEmoji: '🪐🔬', bodyEmoji: '✨' };
  }

  // 7. Clima / Desastres / Medio Ambiente
  if (
    combined.includes('lluvia') ||
    combined.includes('inundación') ||
    combined.includes('derrumbe') ||
    combined.includes('clima') ||
    combined.includes('tormenta')
  ) {
    return { titleEmoji: '🌧️⚠️', bodyEmoji: '🌩️' };
  }
  if (combined.includes('animal') || combined.includes('fauna') || combined.includes('naturaleza')) {
    return { titleEmoji: '🐾🌿', bodyEmoji: '🍃' };
  }

  // 8. Política / Gobierno / Presidente
  if (
    combined.includes('petro') ||
    combined.includes('presidente') ||
    combined.includes('gobierno') ||
    combined.includes('congreso') ||
    combined.includes('alcalde')
  ) {
    return { titleEmoji: '🇨🇴🏛️', bodyEmoji: '📌' };
  }

  // 9. Mundo / Internacional
  if (combined.includes('mundo') || combined.includes('internacional') || combined.includes('guerra')) {
    return { titleEmoji: '🌎✈️', bodyEmoji: '🌐' };
  }

  // Por defecto (Última hora / Noticias)
  return { titleEmoji: '🔴📢', bodyEmoji: '👉' };
}

/**
 * Adaptador Determinista Mock para pruebas unitarias y de integración sin consumo de API.
 */
export class MockEditorialLLMAdapter implements LLMAdapter {
  async generateDraft(input: GenerateDraftInput): Promise<EditorialOutput> {
    const riskFlags: RiskFlag[] = [];
    const textLower = (input.title + ' ' + input.excerpt).toLowerCase();

    if (textLower.includes('elección') || textLower.includes('política') || textLower.includes('gobierno')) {
      riskFlags.push(RiskFlag.ELECTIONS_POLITICS);
    }
    if (textLower.includes('accidente') || textLower.includes('desastre') || textLower.includes('inundación')) {
      riskFlags.push(RiskFlag.DISASTERS);
    }
    if (textLower.includes('salud') || textLower.includes('hospital') || textLower.includes('médico')) {
      riskFlags.push(RiskFlag.HEALTH);
    }
    if (textLower.includes('crimen') || textLower.includes('captura') || textLower.includes('policía')) {
      riskFlags.push(RiskFlag.CRIME);
    }

    const cleanTitle = decodeEntities(input.title)
      .replace(/^Actualidad:\s*/i, '')
      .replace(/<[^>]*>?/gm, '')
      .trim();

    let cleanExcerpt = decodeEntities(input.excerpt)
      .replace(/<[^>]*>?/gm, '')
      .replace(/\s+/g, ' ')
      .replace(/\.\.+/g, '.')
      .trim();

    const emojis = getTopicEmojis(cleanTitle, cleanExcerpt, input.category);

    const titleWithEmoji = cleanTitle.startsWith(emojis.titleEmoji.slice(0, 2))
      ? cleanTitle
      : `${emojis.titleEmoji} ${cleanTitle}`;

    const bodyWithEmoji = cleanExcerpt.startsWith(emojis.bodyEmoji)
      ? cleanExcerpt
      : `${emojis.bodyEmoji} ${cleanExcerpt}`;

    const hashtags = ['#NoticiasColombia', '#Tendencia'];
    const cat = (input.category || '').toLowerCase();
    if (cat.includes('deport')) hashtags.unshift('#Deportes');
    else if (cat.includes('tecno')) hashtags.unshift('#Tecnologia');
    else if (cat.includes('entreten') || cat.includes('faran')) hashtags.unshift('#Farándula');
    else if (cat.includes('salud')) hashtags.unshift('#Salud');
    else if (cat.includes('econo')) hashtags.unshift('#Economia');
    else hashtags.unshift('#UltimaHora');

    return {
      headline: titleWithEmoji,
      summary: bodyWithEmoji || titleWithEmoji,
      source_attribution: input.sourceName,
      source_url: input.sourceUrl,
      verification_notes: `Información contrastada con la sindicación oficial de ${input.sourceName}. Atribución obligatoria incluida.`,
      uncertainties: 'Detalles sujetos a actualización según declaraciones oficiales.',
      hashtags,
      risk_flags: riskFlags,
    };
  }
}
