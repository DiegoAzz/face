import { describe, it, expect } from 'vitest';
import { EditorialOutputSchema, RiskFlag } from '../../packages/shared-types/src';

describe('Zod Validation - EditorialOutputSchema', () => {
  it('debe validar un output periodístico conforme', () => {
    const validData = {
      headline: 'Gobierno de Colombia anuncia medidas económicas para el sector agropecuario',
      summary: 'El Ministerio de Agricultura presentó un paquete de créditos con tasas subsidiadas para pequeños y medianos productores del campo.',
      source_attribution: 'El Espectador',
      source_url: 'https://www.elespectador.com/economia/medidas-agro',
      verification_notes: 'Información verificada mediante comunicado oficial del ministerio y reporte en medio nacional.',
      uncertainties: 'El cronograma de desembolsos iniciará en el próximo trimestre.',
      hashtags: ['#Colombia', '#Economia'],
      risk_flags: [RiskFlag.MARKETS, RiskFlag.ELECTIONS_POLITICS],
    };

    const parsed = EditorialOutputSchema.parse(validData);
    expect(parsed.headline).toBe(validData.headline);
    expect(parsed.risk_flags).toHaveLength(2);
  });

  it('debe rechazar salidas que carezcan de titular o URL de origen', () => {
    const invalidData = {
      headline: 'Corto',
      summary: 'Resumen',
      source_attribution: 'Medio',
      // Falta source_url
    };

    expect(() => EditorialOutputSchema.parse(invalidData)).toThrow();
  });
});
