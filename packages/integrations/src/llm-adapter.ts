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
  "headline": "Titular original, conciso y de alto impacto (sin clickbait engañoso)",
  "summary": "Resumen fiel de los hechos de 2 a 3 párrafos objetivos",
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

    const hashtags = ['#NoticiasColombia', '#Tendencia'];
    const cat = (input.category || '').toLowerCase();
    if (cat.includes('deport')) hashtags.unshift('#Deportes');
    else if (cat.includes('tecno')) hashtags.unshift('#Tecnologia');
    else if (cat.includes('entreten') || cat.includes('faran')) hashtags.unshift('#Farándula');
    else if (cat.includes('salud')) hashtags.unshift('#Salud');
    else if (cat.includes('econo')) hashtags.unshift('#Economia');
    else hashtags.unshift('#UltimaHora');

    return {
      headline: cleanTitle,
      summary: cleanExcerpt || cleanTitle,
      source_attribution: input.sourceName,
      source_url: input.sourceUrl,
      verification_notes: `Información contrastada con la sindicación oficial de ${input.sourceName}. Atribución obligatoria incluida.`,
      uncertainties: 'Detalles sujetos a actualización según declaraciones oficiales.',
      hashtags,
      risk_flags: riskFlags,
    };
  }
}
