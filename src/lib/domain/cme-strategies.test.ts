import { describe, it, expect } from 'vitest';
import { CME_25_STRATEGIES, getRecommendedCMEStrategy } from './cme-strategies';

describe('Catálogo do Manual CME Group (25 Estratégias Comprovadas)', () => {
  it('deve conter exatamente as 25 estratégias catalogadas de 1 a 25', () => {
    expect(CME_25_STRATEGIES.length).toBe(25);
    for (let i = 1; i <= 25; i++) {
      const strat = CME_25_STRATEGIES.find((s) => s.id === i);
      expect(strat).toBeDefined();
      expect(strat?.name).toBeDefined();
      expect(strat?.whenToUse).toBeDefined();
      expect(strat?.profitProfile).toBeDefined();
    }
  });

  it('deve recomendar Bull Spread (#11) para cenários de COMPRA', () => {
    const strat = getRecommendedCMEStrategy('COMPRA_FORTE', 55, 'ALTA');
    expect(strat.id).toBe(11);
    expect(strat.name).toContain('Bull Spread');
  });

  it('deve recomendar Bear Spread (#12) para cenários de VENDA', () => {
    const strat = getRecommendedCMEStrategy('VENDA_FORTE', 40, 'BAIXA');
    expect(strat.id).toBe(12);
    expect(strat.name).toContain('Bear Spread');
  });

  it('deve recomendar Short Iron Butterfly (#16) para cenários de LATERALIZAÇÃO', () => {
    const strat = getRecommendedCMEStrategy('LATERAL_AGUARDAR', 50, 'LATERAL');
    expect(strat.id).toBe(16);
    expect(strat.name).toContain('Short Iron Butterfly');
  });
});
