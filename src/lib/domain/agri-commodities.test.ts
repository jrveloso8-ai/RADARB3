import { describe, it, expect } from 'vitest';
import {
  getAgriSeasonality,
  calculateBoiMilhoRatio,
  analyzeAgriCommodities,
} from './agri-commodities';

describe('Domain: Agri Commodities (Milho, Boi Gordo, Soja)', () => {
  it('identifica corretamente a sazonalidade do milho na entressafra (Dezembro) vs safrinha (Julho)', () => {
    const safraDate = new Date(2026, 6, 15); // Julho
    const entressafraDate = new Date(2026, 11, 15); // Dezembro

    const safraSeason = getAgriSeasonality('CCM', safraDate);
    expect(safraSeason.seasonPhase).toBe('SAFRA_COLHEITA');
    expect(safraSeason.bias).toBe('BAIXA');

    const entressafraSeason = getAgriSeasonality('CCM', entressafraDate);
    expect(entressafraSeason.seasonPhase).toBe('ENTRESSAFRA');
    expect(entressafraSeason.bias).toBe('ALTA');
  });

  it('identifica a sazonalidade do Boi Gordo na entressafra do 2º semestre (Agosto)', () => {
    const agostoDate = new Date(2026, 7, 20); // Agosto
    const boiSeason = getAgriSeasonality('BGI', agostoDate);

    expect(boiSeason.seasonPhase).toBe('ENTRESSAFRA');
    expect(boiSeason.bias).toBe('ALTA');
  });

  it('calcula a Relação de Troca Boi Gordo vs Milho com status FAVORAVEL_CONFINADOR quando ratio >= 5.8', () => {
    // Boi R$ 250, Milho R$ 40 -> 250 / 40 = 6.25 sacas/@
    const ratioResult = calculateBoiMilhoRatio(250, 40);
    expect(ratioResult.ratio).toBe(6.25);
    expect(ratioResult.status).toBe('FAVORAVEL_CONFINADOR');
  });

  it('calcula a Relação de Troca Boi Gordo vs Milho com status DESFAVORAVEL_CONFINADOR quando ratio <= 4.2', () => {
    // Boi R$ 220, Milho R$ 60 -> 220 / 60 = 3.67 sacas/@
    const ratioResult = calculateBoiMilhoRatio(220, 60);
    expect(ratioResult.ratio).toBe(3.67);
    expect(ratioResult.status).toBe('DESFAVORAVEL_CONFINADOR');
  });

  it('gera análise completa com mapeamento de ações correlacionadas (SLCE3, BEEF3, JBSS3)', () => {
    const analyses = analyzeAgriCommodities({
      ccmPrice: 65.0,
      ccmChange: 1.2,
      bgiPrice: 245.0,
      bgiChange: 0.8,
      sojaPrice: 135.0,
      sojaChange: -0.4,
      referenceDate: new Date(2026, 8, 3), // Setembro
    });

    expect(analyses.length).toBe(3);

    const milho = analyses.find((a) => a.id === 'CCM');
    expect(milho).toBeDefined();
    expect(milho?.correlatedStocks.some((s) => s.symbol === 'SLCE3')).toBe(true);

    const boi = analyses.find((a) => a.id === 'BGI');
    expect(boi).toBeDefined();
    expect(boi?.exchangeRatio).toBeDefined();
    expect(boi?.correlatedStocks.some((s) => s.symbol === 'BEEF3')).toBe(true);
  });
});
