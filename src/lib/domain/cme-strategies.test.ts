import { describe, it, expect } from 'vitest';
import { OPTION_25_STRATEGIES, getRecommendedOptionStrategy } from './cme-strategies';

describe('Catálogo Oficial de 25 Estratégias de Opções B3', () => {
  it('deve conter exatamente as 25 estratégias catalogadas de 1 a 25', () => {
    expect(OPTION_25_STRATEGIES.length).toBe(25);
    for (let i = 1; i <= 25; i++) {
      const strat = OPTION_25_STRATEGIES.find((s) => s.id === i);
      expect(strat).toBeDefined();
      expect(strat?.name).toBeDefined();
      expect(strat?.whenToUse).toBeDefined();
      expect(strat?.profitProfile).toBeDefined();
    }
  });

  it('deve recomendar Trava de Alta (#11) para cenários de COMPRA', () => {
    const strat = getRecommendedOptionStrategy('COMPRA_FORTE', 55, 'ALTA');
    expect(strat.id).toBe(11);
    expect(strat.name).toContain('Trava de Alta');
  });

  it('deve recomendar Trava de Baixa (#12) para cenários de VENDA', () => {
    const strat = getRecommendedOptionStrategy('VENDA_FORTE', 40, 'BAIXA');
    expect(strat.id).toBe(12);
    expect(strat.name).toContain('Trava de Baixa');
  });

  it('deve recomendar Iron Butterfly (#16) para cenários de LATERALIZAÇÃO', () => {
    const strat = getRecommendedOptionStrategy('LATERAL_AGUARDAR', 50, 'LATERAL');
    expect(strat.id).toBe(16);
    expect(strat.name).toContain('Iron Butterfly');
  });
});
