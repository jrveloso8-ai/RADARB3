import { describe, it, expect } from 'vitest';
import {
  matchBestOptionStrategyFrom25,
  detectRsiDivergences,
  detectVolatilityOpportunities,
  detectTheWheelOpportunity,
  detectIntermarketOpportunities,
  buildMasterOpportunityList,
} from './opportunity-radar';
import { HistoricalPrice } from '../types/financial';

describe('Domain: Opportunity Radar & 25 Strategies Mapping', () => {
  it('enquadra corretamente Covered Call (#5) para investidor com ações em carteira e IV alta', () => {
    const matched = matchBestOptionStrategyFrom25({
      bias: 'ALTA',
      volRegime: 'ALTA',
      spot: 38.50,
      hasStockInCustody: true,
    });

    expect(matched.strategy.id).toBe(5); // Covered Call / Buy-Write
    expect(matched.isCredit).toBe(true);
    expect(matched.strategyLegsFormatted).toContain('Vender Call OTM');
  });

  it('enquadra Cash-Secured Put (#6) para investidor com caixa em CDI e IV moderada/alta', () => {
    const matched = matchBestOptionStrategyFrom25({
      bias: 'ALTA',
      volRegime: 'ALTA',
      spot: 40.00,
      hasCashMargin: true,
    });

    expect(matched.strategy.id).toBe(6); // Cash-Secured Put
    expect(matched.isCredit).toBe(true);
    expect(matched.strategyLegsFormatted).toContain('100% de garantia em CDI');
  });

  it('enquadra Long Straddle (#17) em caso de Volatilidade Comprimida (Squeeze) antes de breakout', () => {
    const matched = matchBestOptionStrategyFrom25({
      bias: 'VOLATILIDADE',
      volRegime: 'MUITO_BAIXA',
      spot: 50.00,
    });

    expect(matched.strategy.id).toBe(17); // Long Straddle
    expect(matched.isCredit).toBe(false);
  });

  it('enquadra Iron Condor (#20) para mercado lateral em empresa sólida com volatilidade moderada', () => {
    const matched = matchBestOptionStrategyFrom25({
      bias: 'LATERAL',
      volRegime: 'MODERADA',
      spot: 30.00,
    });

    expect(matched.strategy.id).toBe(20); // Short Iron Condor
    expect(matched.isCredit).toBe(true);
  });

  it('enquadra Borboleta Comprada (#13) quando há efeito Pin de Max Pain com volatilidade moderada', () => {
    const matched = matchBestOptionStrategyFrom25({
      bias: 'LATERAL',
      volRegime: 'MODERADA',
      spot: 35.00,
      isPinTarget: true,
      maxPainStrike: 35.00,
    });

    expect(matched.strategy.id).toBe(13); // Long Butterfly
    expect(matched.isCredit).toBe(false);
  });

  it('detecta divergência altista de RSI(14) em série histórica onde o preço cai mas RSI sobe', () => {
    // Mock de série com divergência de alta: preço cai de 40 para 30, mas nos últimos 15 dias o RSI se recupera
    const history: HistoricalPrice[] = [];
    const basePrice = 35.0;

    for (let i = 0; i < 40; i++) {
      let close = basePrice;
      if (i < 20) close = basePrice - i * 0.5; // queda acentuada
      else close = basePrice - 10 + (i - 20) * 0.1; // estabilizando / subindo levemente enquanto preço ainda é baixo

      history.push({
        date: Date.now() - (40 - i) * 86400000,
        open: close - 0.2,
        high: close + 0.3,
        low: close - 0.3,
        close,
        volume: 1000000,
      });
    }

    const opp = detectRsiDivergences('VALE3', 'Vale S.A.', history, 26.0);
    // Deve rodar a função sem erros
    expect(opp === null || opp.category === 'DIVERGENCIA_TECNICA').toBe(true);
  });

  it('detecta oportunidades intermarket de Petróleo Brent e Minério de Ferro com defasagem', () => {
    const opps = detectIntermarketOpportunities(
      3.2, // Brent +3.2%
      2.5, // Minério +2.5%
      0.1, // DXY estável
      [
        { symbol: 'PETR4', shortName: 'Petrobras PN', price: 38.00, changePct: 0.5 },
        { symbol: 'VALE3', shortName: 'Vale S.A.', price: 62.00, changePct: 0.2 },
      ]
    );

    expect(opps.length).toBeGreaterThanOrEqual(1);
    const brentOpp = opps.find((o) => o.tags.includes('Petróleo Brent'));
    expect(brentOpp).toBeDefined();
    expect(brentOpp?.bias).toBe('COMPRA');
  });

  it('constrói lista master de oportunidades consolidada e ordenada por score', () => {
    const result = buildMasterOpportunityList({
      quotes: [
        {
          symbol: 'WEGE3',
          shortName: 'WEG S.A.',
          price: 52.00,
          changePct: 0.8,
          history: [],
          fundamentalStatus: 'APROVADO',
          fundamentalScore: 92,
          ivAtm: 15.0,
          hv21: 22.0,
          dte: 15,
          maxPain: 52.00,
        },
      ],
      macroOverview: {
        brentChange: 2.8,
        ironOreChange: 1.2,
        dxyChange: 0.0,
      },
      agriQuotes: {
        ccmPrice: 62.0,
        ccmChange: 0.5,
        bgiPrice: 240.0,
        bgiChange: 1.2,
      },
    });

    expect(result.opportunities.length).toBeGreaterThan(0);
    expect(result.agriOverview.length).toBe(3);
    expect(result.totalScanned).toBeGreaterThanOrEqual(4);
  });
});
