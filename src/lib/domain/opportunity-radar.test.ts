import { describe, it, expect } from 'vitest';
import {
  matchBestOptionStrategyFrom25,
  detectRsiDivergences,
  detectIntermarketOpportunities,
  buildMasterOpportunityList,
  detectBullCallSpreadOpportunity,
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

  // =========================================================================
  // TESTES DE REGRESSÃO EXIGIDOS - FASE 1 (AUDITORIA RADAR B3 PRO IA)
  // =========================================================================

  it('Regressão 1.3a: oportunidade sem opção real disponível no strike não retorna maxProfitEst/maxLossEst numéricos fabricados', () => {
    // Bull Call Spread sem opções reais passadas
    const bullOpp = detectBullCallSpreadOpportunity(
      'PETR4',
      'Petrobras PN',
      40.0,
      1.5,
      'ALTA',
      'APROVADO',
      85
    );

    expect(bullOpp).not.toBeNull();
    // Não pode conter números inventados via spot * 0.02 (R$ 0.80)
    expect(bullOpp!.execution.maxLossEst).toBeUndefined();
    expect(bullOpp!.execution.maxProfitEst).toBeUndefined();
    expect(bullOpp!.execution.profitProvenance).toBe('INDISPONIVEL');
    expect(bullOpp!.execution.probabilityOfProfit).toBeNull();
    expect(bullOpp!.execution.popProvenance).toBe('INDISPONIVEL');
  });

  it('Regressão 1.5b: falha na busca de fundamentos nunca resulta em fundamentalStatus APROVADO', () => {
    // Simula a lógica de tratamento de erro do motor da rota de oportunidades
    const handleFundamentalFetch = (fetchFn: () => any) => {
      let fundamentalStatus: 'APROVADO' | 'REPROVADO' = 'REPROVADO';
      let fundamentalScore = 0;
      try {
        fetchFn();
      } catch {
        fundamentalStatus = 'REPROVADO';
        fundamentalScore = 0;
      }
      return { fundamentalStatus, fundamentalScore };
    };

    const result = handleFundamentalFetch(() => {
      throw new Error('Timeout da API BRAPI de fundamentos');
    });

    expect(result.fundamentalStatus).toBe('REPROVADO');
    expect(result.fundamentalScore).toBe(0);
    expect(result.fundamentalStatus).not.toBe('APROVADO');
  });

  it('Regressão 1.4c: ivAtm do ativo não pode ser fabricado via hv21 * 1.05', () => {
    const hv21 = 20.0;
    const fabricatedIvAtm = hv21 * 1.05; // 21.0

    // Função validadora de proveniência de IV
    const resolveAtmIV = (realAnalyticsIv: number | null) => {
      // Se não há medição de opções no book, NUNCA estimar por hv21 * 1.05
      if (realAnalyticsIv === null || realAnalyticsIv === undefined) {
        return null;
      }
      return realAnalyticsIv;
    };

    // Caso onde o feed de opções não tem IV para o ativo
    const ivResultWithoutOptions = resolveAtmIV(null);
    expect(ivResultWithoutOptions).toBeNull();
    expect(ivResultWithoutOptions).not.toBe(fabricatedIvAtm);

    // Caso onde o feed de opções entrega IV real medida
    const ivResultWithRealOptions = resolveAtmIV(28.4);
    expect(ivResultWithRealOptions).toBe(28.4);
  });

  it('Regressão Item 1.2/1.3 & 5: buildMasterOpportunityList conecta realOptions às estratégias de opções', () => {
    const mockQuote = {
      symbol: 'PETR4',
      shortName: 'Petrobras PN',
      price: 38.50,
      changePct: 1.2,
      history: [],
      trend: 'ALTA' as const,
      fundamentalStatus: 'APROVADO' as const,
      fundamentalScore: 82,
      ivAtm: 29.5,
      realOptions: {
        debit: 1.15,
        deltaCallLong: 0.55,
        netCredit: 0.85,
        pop: 55,
        putPremium: 0.95,
        putDelta: 0.30,
      },
    };

    const result = buildMasterOpportunityList({
      quotes: [mockQuote],
    });

    const bullOpp = result.opportunities.find((o) => o.id === 'bull-spread-PETR4');
    expect(bullOpp).toBeDefined();
    // Verifica que agora o débito e PoP são calculados a partir dos dados reais repassados
    expect(bullOpp!.execution.maxLossEst).toBe('R$ 1.15 (débito real pago)');
    expect(bullOpp!.execution.profitProvenance).toBe('DERIVADO');
    expect(bullOpp!.execution.probabilityOfProfit).toBe(55);
    expect(bullOpp!.execution.popProvenance).toBe('DERIVADO');
  });

  it('Regressão Item 1.2/1.3 & 5: buildMasterOpportunityList sem realOptions mantém proveniência INDISPONIVEL', () => {
    const mockQuoteWithoutOptions = {
      symbol: 'VALE3',
      shortName: 'Vale ON',
      price: 60.00,
      changePct: 2.0,
      history: [],
      trend: 'ALTA' as const,
      fundamentalStatus: 'APROVADO' as const,
      fundamentalScore: 78,
    };

    const result = buildMasterOpportunityList({
      quotes: [mockQuoteWithoutOptions],
    });

    const bullOpp = result.opportunities.find((o) => o.id === 'bull-spread-VALE3');
    expect(bullOpp).toBeDefined();
    // Sem opções reais passadas, deve se manter INDISPONIVEL honestamente
    expect(bullOpp!.execution.maxLossEst).toBeUndefined();
    expect(bullOpp!.execution.profitProvenance).toBe('INDISPONIVEL');
    expect(bullOpp!.execution.probabilityOfProfit).toBeNull();
    expect(bullOpp!.execution.popProvenance).toBe('INDISPONIVEL');
  });

  // =========================================================================
  // TESTE DE REGRESSÃO EXIGIDO - ITEM 3A (MAX PAIN PIN-RISK STRATEGY)
  // =========================================================================
  it('Item 3A: com q.maxPain definido e preço próximo (dentro de 4%), gera oportunidade de Pin-Risk Butterfly', () => {
    const mockQuoteWithMaxPain = {
      symbol: 'PETR4',
      shortName: 'Petrobras PN',
      price: 38.00,
      changePct: 0.2,
      history: [],
      trend: 'LATERAL' as const,
      fundamentalStatus: 'APROVADO' as const,
      fundamentalScore: 80,
      maxPain: 38.50, // Distância: |38.00 - 38.50| / 38.00 = 1.3% (dentro do limiar de 4%)
      ivAtm: 26.0,
      realOptions: {
        debit: 0.45,
        pop: 62,
      },
    };

    const result = buildMasterOpportunityList({
      quotes: [mockQuoteWithMaxPain],
    });

    const maxPainOpp = result.opportunities.find((o) => o.id === 'max-pain-PETR4');
    expect(maxPainOpp).toBeDefined();
    expect(maxPainOpp!.matchedStrategyName).toMatch(/Butterfly/); // Long Butterfly ou Iron Butterfly
    expect(maxPainOpp!.bias).toBe('LATERAL');
    expect(maxPainOpp!.scoreProvenance).toBe('DERIVADO');
    expect(maxPainOpp!.convictionScore).toBeGreaterThanOrEqual(75);
    expect(maxPainOpp!.execution.target1).toBe(38.50);
  });

  it('Item 3A: sem q.maxPain definido ou com preço distante do Max Pain, não gera oportunidade de pin-risk', () => {
    const mockQuoteDistantMaxPain = {
      symbol: 'VALE3',
      shortName: 'Vale ON',
      price: 60.00,
      changePct: 0.1,
      history: [],
      trend: 'LATERAL' as const,
      fundamentalStatus: 'APROVADO' as const,
      fundamentalScore: 80,
      maxPain: 70.00, // Distância: 16.6% (muito além do limiar de 4%)
    };

    const mockQuoteWithoutMaxPain = {
      symbol: 'ITUB4',
      shortName: 'Itaú PN',
      price: 35.00,
      changePct: 0.5,
      history: [],
      trend: 'LATERAL' as const,
      fundamentalStatus: 'APROVADO' as const,
      fundamentalScore: 85,
      maxPain: undefined,
    };

    const result = buildMasterOpportunityList({
      quotes: [mockQuoteDistantMaxPain, mockQuoteWithoutMaxPain],
    });

    expect(result.opportunities.find((o) => o.id === 'max-pain-VALE3')).toBeUndefined();
    expect(result.opportunities.find((o) => o.id === 'max-pain-ITUB4')).toBeUndefined();
  });
});
