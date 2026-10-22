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
  "hashtags": ["#NoticiasColombia", "#Actualidad"],
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

    return {
      headline: `Actualidad: ${input.title.slice(0, 100)}`,
      summary: `De acuerdo con la información reportada por ${input.sourceName}, ${input.excerpt.slice(0, 300)}. Los detalles continúan bajo seguimiento editorial.`,
      source_attribution: input.sourceName,
      source_url: input.sourceUrl,
      verification_notes: `Información obtenida a través de la sindicación oficial de ${input.sourceName}. Atribución obligatoria incluida.`,
      uncertainties: 'Detalles adicionales en desarrollo conforme a declaraciones oficiales.',
      hashtags: ['#Noticias', '#ActualidadColombia'],
      risk_flags: riskFlags,
    };
  }
}
