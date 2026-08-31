import { describe, it, expect } from 'vitest';
import {
  electBestOptionStrategy,
  assertDirection,
  payoffAt,
  isEligibleLeg,
  StructureDirectionError,
  OptionLegDetail,
} from './cme-election';
import vbbr3AnalyticsFixture from '../services/__fixtures__/vbbr3-analytics.json';
import { OptionAnalysisResult, OptionAnalyticsItem } from '../types/financial';

describe('Motor Único de Opções — Especificação Técnica v2.1', () => {
  const baseOptionAnalysis: OptionAnalysisResult = {
    underlyingSymbol: 'VBBR3',
    underlyingPrice: 33.38,
    marketType: 'equity',
    availableExpirations: [],
    selectedExpiration: '2026-09-18',
    selectedExpirationInfo: {
      date: '2026-09-18',
      monthName: 'SET/2026',
      callLetter: 'I',
      putLetter: 'U',
      dte: 15,
      label: '18/09/2026 (15d)',
      badge: 'Mensal',
    },
    openInterestDate: '2026-08-28',
    maxPain: 33.5,
    hv21: 25.0,
    hv63: 26.0,
    putCallRatio: 0.8,
    totalCallOpenInterest: 200000,
    totalPutOpenInterest: 250000,
    top5CallWalls: [],
    top5PutWalls: [],
    strikeDistribution: [],
    straddleRows: [],
  };

  const analytics: OptionAnalyticsItem[] = vbbr3AnalyticsFixture.analytics as OptionAnalyticsItem[];

  // B6 / B7: Filtro de Elegibilidade de Pernas
  it('B6/B7: Deve filtrar apenas séries com confidence high, openInterest >= 5000 e delta na faixa saudável', () => {
    const vbbru349 = analytics.find((a) => a.symbol === 'VBBRU349')!; // confidence: medium
    expect(isEligibleLeg(vbbru349)).toBe(false);

    const vbbru344 = analytics.find((a) => a.symbol === 'VBBRU344')!; // confidence: high, delta: -0.518
    expect(isEligibleLeg(vbbru344)).toBe(true);

    const vbbru325 = analytics.find((a) => a.symbol === 'VBBRU325')!; // delta: -0.275, high
    expect(isEligibleLeg(vbbru325)).toBe(true);

    const vbbru310 = analytics.find((a) => a.symbol === 'VBBRU310')!; // delta: -0.115, high
    expect(isEligibleLeg(vbbru310)).toBe(true);
  });

  // B2: Seleção por delta OTM estrito (|delta| <= 0.38)
  it('B2: Na fixture VBBR3, VBBRU344 (delta -0.518) NÃO pode ser eleita na ponta vendida; deve eleger delta <= 0.38', () => {
    // Spot próximo do preço de referência da fixture
    const spot = 33.38;
    const strategy = electBestOptionStrategy(
      'VBBR3',
      spot,
      'COMPRA',
      'ALTA',
      55,
      25.0,
      baseOptionAnalysis,
      'APROVADO',
      analytics
    );

    expect(strategy).not.toBeNull();
    expect(strategy?.status).toBe('AUTORIZADA');
    expect(strategy?.bias).toBe('ALTA');

    const shortLeg = strategy?.legs.find((l) => l.action === 'VENDA');
    const longLeg = strategy?.legs.find((l) => l.action === 'COMPRA');

    expect(shortLeg).toBeDefined();
    expect(longLeg).toBeDefined();

    // VBBRU344 tem delta -0.518, logo NÃO pode ser a perna vendida!
    expect(shortLeg?.symbol).not.toBe('VBBRU344');
    expect(shortLeg?.symbol).toBe('VBBRU325'); // delta -0.275 (alvo 0.28)
    expect(longLeg?.symbol).toBe('VBBRU310'); // delta -0.115 (alvo 0.12)
    expect(Math.abs(shortLeg?.delta || 0)).toBeLessThanOrEqual(0.38);
  });

  // B4: Spot drift moderado (+2.67%) gera advertência (isStale: true)
  it('B4: Spot drift de +2.67% deve eleger estrutura com isStale: true e aviso no priceContext', () => {
    const spot = 34.27; // Spot atual (2.67% acima de 33.38)
    const strategy = electBestOptionStrategy(
      'VBBR3',
      spot,
      'COMPRA',
      'ALTA',
      55,
      25.0,
      baseOptionAnalysis,
      'APROVADO',
      analytics
    );

    expect(strategy).not.toBeNull();
    expect(strategy?.priceContext?.isStale).toBe(true);
    expect(strategy?.priceContext?.spotDriftPct).toBeCloseTo(2.67, 1);
    expect(strategy?.priceContext?.warningMessage).toContain('⚠️ Prêmios de fechamento');
  });

  // B5: Spot drift excessivo (> 3.0%) bloqueia a estrutura com status EM_ANALISE
  it('B5: Spot drift de +4.0% deve bloquear eleição de estrutura com status EM_ANALISE', () => {
    const spot = 34.72; // ~4.0% acima de 33.38
    const strategy = electBestOptionStrategy(
      'VBBR3',
      spot,
      'COMPRA',
      'ALTA',
      55,
      25.0,
      baseOptionAnalysis,
      'APROVADO',
      analytics
    );

    expect(strategy).not.toBeNull();
    expect(strategy?.status).toBe('EM_ANALISE');
    expect(strategy?.legs.length).toBe(0);
    expect(strategy?.electionRationale[0]).toContain('oscilou');
  });

  // B8: Asserção de Direção em Bull Put Spread
  it('B8: assertDirection deve validar que Bull Put possui payoff(1.5*spot) > payoff(0.5*spot)', () => {
    const legs: OptionLegDetail[] = [
      {
        action: 'VENDA',
        symbol: 'VBBRU325',
        strike: 32.33,
        type: 'PUT',
        unitPrice: 0.38,
        lotQuantity: 1000,
        totalFinancial: 380,
        openInterest: 42000,
      },
      {
        action: 'COMPRA',
        symbol: 'VBBRU310',
        strike: 30.83,
        type: 'PUT',
        unitPrice: 0.15,
        lotQuantity: 1000,
        totalFinancial: 150,
        openInterest: 15000,
      },
    ];

    const lowPayoff = payoffAt(legs, 33.38 * 0.5); // Ativo despenca para 16.69
    const highPayoff = payoffAt(legs, 33.38 * 1.5); // Ativo sobe para 50.07

    expect(highPayoff).toBeGreaterThan(lowPayoff);
    expect(highPayoff).toBe(0.23); // Crédito líquido = 0.38 - 0.15 = 0.23
    expect(lowPayoff).toBe(-1.27); // Perda máxima = 1.50 - 0.23 = 1.27
  });

  // B9: Asserção de Direção em Bear Call Spread
  it('B9: assertDirection deve validar que Bear Call possui payoff(0.5*spot) > payoff(1.5*spot)', () => {
    const legs: OptionLegDetail[] = [
      {
        action: 'VENDA',
        symbol: 'VBBRI350',
        strike: 35.0,
        type: 'CALL',
        unitPrice: 0.85,
        lotQuantity: 1000,
        totalFinancial: 850,
        openInterest: 85000,
      },
      {
        action: 'COMPRA',
        symbol: 'VBBRI360',
        strike: 36.0,
        type: 'CALL',
        unitPrice: 0.45,
        lotQuantity: 1000,
        totalFinancial: 450,
        openInterest: 62000,
      },
    ];

    const lowPayoff = payoffAt(legs, 33.38 * 0.5);
    const highPayoff = payoffAt(legs, 33.38 * 1.5);

    expect(lowPayoff).toBeGreaterThan(highPayoff);
    expect(lowPayoff).toBe(0.4); // Crédito líquido = 0.85 - 0.45 = 0.40
    expect(highPayoff).toBe(-0.6); // Perda máxima = 1.00 - 0.40 = 0.60
  });

  // B11: Pernas invertidas injetadas de propósito disparam StructureDirectionError
  it('B11: Injeção de pernas com sinal invertido em assertDirection dispara StructureDirectionError', () => {
    const invertedLegs: OptionLegDetail[] = [
      {
        action: 'COMPRA', // Invertido: compra a put maior
        symbol: 'VBBRU325',
        strike: 32.33,
        type: 'PUT',
        unitPrice: 0.38,
        lotQuantity: 1000,
        totalFinancial: 380,
        openInterest: 42000,
      },
      {
        action: 'VENDA', // Invertido: vende a put menor
        symbol: 'VBBRU310',
        strike: 30.83,
        type: 'PUT',
        unitPrice: 0.15,
        lotQuantity: 1000,
        totalFinancial: 150,
        openInterest: 15000,
      },
    ];

    const invalidStrategy = {
      strategySpec: {} as any,
      title: 'Trava Invertida',
      bias: 'ALTA' as const,
      status: 'AUTORIZADA' as const,
      expirationDate: '2026-09-18',
      dte: 15,
      underlyingSymbol: 'VBBR3',
      underlyingPrice: 33.38,
      legs: invertedLegs,
      netCostOrCredit: 0.23,
      isCredit: false,
      totalCostOrCreditForLot: 230,
      spreadWidth: 1.5,
      breakEven: 32.1,
      maxProfit: 1.27,
      maxProfitLot: 1270,
      maxLoss: 0.23,
      maxLossLot: 230,
      returnOnRiskPct: 552,
      riskRewardRatio: '1 : 5.5',
      takeProfitRule: { targetPrice: '', profitGoal: '', description: '' },
      stopLossRule: { stopPrice: '', lossLimit: '', description: '' },
      timeStopRule: { dteLimit: 5, description: '' },
      electionRationale: [],
      homeBrokerOrderSlip: { orderType: '', entryPriceRange: '', maxSlippage: '', legsSummary: '' },
    };

    expect(() => assertDirection(invalidStrategy, 33.38)).toThrow(StructureDirectionError);
  });
});
