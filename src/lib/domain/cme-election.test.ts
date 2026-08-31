import { describe, it, expect } from 'vitest';
import {
  electBestOptionStrategy,
  assertDirection,
  payoffAt,
  isEligibleLeg,
  StructureDirectionError,
  OptionLegDetail,
  ElectedOptionStrategy,
} from './cme-election';
import vbbr3AnalyticsFixture from '../services/__fixtures__/vbbr3-analytics.json';
import itub4AnalyticsFixture from '../services/__fixtures__/itub4-analytics.json';
import { OptionAnalysisResult, OptionAnalyticsItem } from '../types/financial';
import { CNPI_RULES } from '../config/rules';

describe('Motor Único de Opções — Especificação Técnica v2.2 (CT-901 a CT-918)', () => {
  const vbbr3BaseOptionAnalysis: OptionAnalysisResult = {
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
    ivAtm: {
      callIv: 28.5,
      putIv: 28.8,
      diffPercent: 1.0,
      status: 'CONFIALVEL',
    },
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

  const itub4BaseOptionAnalysis: OptionAnalysisResult = {
    underlyingSymbol: 'ITUB4',
    underlyingPrice: 39.19,
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
    ivAtm: {
      callIv: 26.5,
      putIv: 26.8,
      diffPercent: 1.1,
      status: 'CONFIALVEL',
    },
    openInterestDate: '2026-08-28',
    maxPain: 39.0,
    hv21: 22.0,
    hv63: 23.0,
    putCallRatio: 0.9,
    totalCallOpenInterest: 5000000,
    totalPutOpenInterest: 6000000,
    top5CallWalls: [],
    top5PutWalls: [],
    strikeDistribution: [],
    straddleRows: [],
  };

  const itub4Analytics: OptionAnalyticsItem[] = itub4AnalyticsFixture.analytics as OptionAnalyticsItem[];
  const vbbr3Analytics: OptionAnalyticsItem[] = vbbr3AnalyticsFixture.analytics as OptionAnalyticsItem[];

  // CT-901: fixture ITUB4, elegibilidade nova (13 séries de put elegíveis na faixa de delta <= 0.38)
  it('CT-901: fixture ITUB4 deve resultar em 13 séries elegíveis de put na faixa de delta analisada (contra 2 da regra antiga com confidence high)', () => {
    const putSeries = itub4Analytics.filter((a) => a.side.toLowerCase() === 'put' && a.strike < 39.55);
    const eligiblePuts = putSeries.filter(
      (p) =>
        (isEligibleLeg(p, 'SHORT', 39.55, '2026-08-28') || isEligibleLeg(p, 'LONG', 39.55, '2026-08-28')) &&
        Math.abs(p.delta!) <= CNPI_RULES.DERIVATIVES.SPREAD.SHORT_LEG_DELTA_MAX
    );
    expect(eligiblePuts.length).toBe(13);

    const eligibleShortPuts = putSeries.filter(
      (p) => isEligibleLeg(p, 'SHORT', 39.55, '2026-08-28') && Math.abs(p.delta!) <= CNPI_RULES.DERIVATIVES.SPREAD.SHORT_LEG_DELTA_MAX
    );
    expect(eligibleShortPuts.length).toBe(11);
  });

  // CT-902 / CT-903 / CT-904: fixture ITUB4, veredito COMPRA produz estrutura eleita válida
  it('CT-902 a CT-904: fixture ITUB4 com veredito COMPRA deve eleger estrutura com perna vendida OTM e largura/crédito válidos', () => {
    const spot = 39.55;
    const strategy = electBestOptionStrategy(
      'ITUB4',
      spot,
      'COMPRA',
      'ALTA',
      55,
      22.0,
      itub4BaseOptionAnalysis,
      'APROVADO',
      itub4Analytics
    );

    expect(strategy).not.toBeNull();
    expect(strategy.status).toBe('AUTORIZADA');
    expect(strategy.bias).toBe('ALTA');
    expect(strategy.legs.length).toBe(2);

    const shortLeg = strategy.legs.find((l) => l.action === 'VENDA')!;
    const longLeg = strategy.legs.find((l) => l.action === 'COMPRA')!;

    expect(shortLeg).toBeDefined();
    expect(longLeg).toBeDefined();

    // CT-903: Perna vendida com |delta| <= 0.38
    expect(Math.abs(shortLeg.delta!)).toBeLessThanOrEqual(0.38);

    // CT-904: Largura >= 1.5% do spot e crédito/largura em [12%, 45%]
    const width = strategy.spreadWidth;
    const credit = strategy.netCostOrCredit;
    const widthPct = width / spot;
    const creditRatio = credit / width;

    expect(widthPct).toBeGreaterThanOrEqual(0.015);
    expect(creditRatio).toBeGreaterThanOrEqual(0.12);
    expect(creditRatio).toBeLessThanOrEqual(0.45);
  });

  // CT-905: Série com confidence 'low', OI alto e preço válido deve ser elegível
  it("CT-905: Série com confidence: 'low', OI 2.977.800 e preço 0.56 deve ser elegível", () => {
    const itubu388 = itub4Analytics.find((a) => a.symbol === 'ITUBU388')!; // strike 38.46, conf: low, oi: 2.977.800
    expect(isEligibleLeg(itubu388, 'SHORT', 39.55, '2026-08-28')).toBe(true);
  });

  // CT-906: Série com nullReason preenchido deve ser inelegível
  it('CT-906: Série com nullReason preenchido deve ser inelegível', () => {
    const corrupted: OptionAnalyticsItem = {
      symbol: 'TESTU10',
      side: 'put',
      strike: 35.0,
      optionPrice: 0.5,
      impliedVolatility: 30.0,
      delta: -0.25,
      openInterest: 10000,
      lastTradeDate: '2026-08-28',
      nullReason: 'INSUFFICIENT_TRADES',
    };
    expect(isEligibleLeg(corrupted, 'SHORT', 39.55, '2026-08-28')).toBe(false);
  });

  // CT-907: Série com lastTradeDate anterior ao snapshot deve ser inelegível
  it('CT-907: Série com lastTradeDate anterior ao snapshot deve ser inelegível', () => {
    const oldTrade: OptionAnalyticsItem = {
      symbol: 'TESTU11',
      side: 'put',
      strike: 35.0,
      optionPrice: 0.5,
      impliedVolatility: 30.0,
      delta: -0.25,
      openInterest: 10000,
      lastTradeDate: '2026-08-20', // anterior a 2026-08-28
      nullReason: null,
    };
    expect(isEligibleLeg(oldTrade, 'SHORT', 39.55, '2026-08-28')).toBe(false);
  });

  // CT-908: Perna comprada a R$ 0,04 elegível como LONG, mas inelegível como SHORT
  it('CT-908: Perna comprada a R$ 0,04 deve ser elegível como LONG (min 0.03) e inelegível como SHORT (min 0.10)', () => {
    const cheapOption: OptionAnalyticsItem = {
      symbol: 'TESTU04',
      side: 'put',
      strike: 30.0,
      optionPrice: 0.04,
      impliedVolatility: 35.0,
      delta: -0.06,
      openInterest: 2000,
      lastTradeDate: '2026-08-28',
      nullReason: null,
    };
    expect(isEligibleLeg(cheapOption, 'LONG', 39.55, '2026-08-28')).toBe(true);
    expect(isEligibleLeg(cheapOption, 'SHORT', 39.55, '2026-08-28')).toBe(false);
  });

  // CT-909: Cadeia com 2 séries elegíveis adjacentes (largura menor que o mínimo) bloqueia com SEM_PAR_VALIDO
  it("CT-909: Cadeia com 2 séries adjacentes deve bloquear com reason: 'SEM_PAR_VALIDO' (nunca mensagem genérica de liquidez)", () => {
    const adjacentOnly: OptionAnalyticsItem[] = [
      {
        symbol: 'ITUBU385',
        side: 'put',
        strike: 37.96,
        optionPrice: 0.4,
        impliedVolatility: 27.5,
        delta: -0.257,
        openInterest: 994500,
        lastTradeDate: '2026-08-28',
        nullReason: null,
      },
      {
        symbol: 'ITUBU38',
        side: 'put',
        strike: 37.71,
        optionPrice: 0.35,
        impliedVolatility: 27.8,
        delta: -0.229,
        openInterest: 714500,
        lastTradeDate: '2026-08-28',
        nullReason: null,
      },
    ];

    const strategy = electBestOptionStrategy(
      'ITUB4',
      39.55,
      'COMPRA',
      'ALTA',
      55,
      22.0,
      itub4BaseOptionAnalysis,
      'APROVADO',
      adjacentOnly
    );

    expect(strategy.status).toBe('BLOQUEADA');
    expect(strategy.blockDetails?.reason).toBe('SEM_PAR_VALIDO');
    expect(strategy.blockDetails?.message).toContain('nenhuma combinação atende');
    expect(strategy.diagnosticsSummary).toBe('2 séries na cadeia · 2 elegíveis · 0 pares válidos');
  });

  // CT-910: Cadeia vazia bloqueia com SEM_ANALYTICS
  it("CT-910: Cadeia vazia deve bloquear com reason: 'SEM_ANALYTICS'", () => {
    const strategy = electBestOptionStrategy(
      'ITUB4',
      39.55,
      'COMPRA',
      'ALTA',
      55,
      22.0,
      itub4BaseOptionAnalysis,
      'APROVADO',
      []
    );

    expect(strategy.status).toBe('BLOQUEADA');
    expect(strategy.blockDetails?.reason).toBe('SEM_ANALYTICS');
  });

  // CT-917: electBestOptionStrategy nunca retorna null em nenhum cenário
  it('CT-917: electBestOptionStrategy nunca retorna null em qualquer cenário de bloqueio ou erro', () => {
    const res1 = electBestOptionStrategy('ITUB4', 39.55, 'BLOQUEADO', 'ALTA', 55, 22.0, undefined, 'REPROVADO', []);
    expect(res1).not.toBeNull();
    expect(res1.status).toBe('BLOQUEADA');

    const res2 = electBestOptionStrategy('ITUB4', 39.55, 'COMPRA', 'ALTA', 55, 22.0, itub4BaseOptionAnalysis, 'REPROVADO', itub4Analytics);
    expect(res2).not.toBeNull();
    expect(res2.status).toBe('BLOQUEADA');
    expect(res2.blockDetails?.reason).toBe('FUNDAMENTOS_REPROVADOS');
  });

  // CT-918: Regressão v2.1 (nenhum teste de delta máximo, drift ou assertDirection quebrado)
  it('CT-918: Regressão v2.1 — VBBR3 continua elegendo Bull Put Spread com delta <= 0.38 e assertDirection verde', () => {
    const spot = 33.38;
    const strategy = electBestOptionStrategy(
      'VBBR3',
      spot,
      'COMPRA',
      'ALTA',
      55,
      25.0,
      vbbr3BaseOptionAnalysis,
      'APROVADO',
      vbbr3Analytics
    );

    expect(strategy.status).toBe('AUTORIZADA');
    expect(strategy.bias).toBe('ALTA');

    const shortLeg = strategy.legs.find((l) => l.action === 'VENDA')!;
    expect(shortLeg.symbol).not.toBe('VBBRU344'); // delta -0.518 bloqueado por delta max 0.38
    expect(Math.abs(shortLeg.delta!)).toBeLessThanOrEqual(0.38);

    // Validação direcional
    expect(() => assertDirection(strategy, spot)).not.toThrow();
  });

  it('CT-918b: assertDirection deve disparar StructureDirectionError se as pernas forem invertidas', () => {
    const invertedStrategy: ElectedOptionStrategy = {
      strategySpec: {
        id: 11,
        code: 'BULL_SPREAD',
        name: 'Bull Spread',
        bias: 'ALTA',
        complexity: 'BASICA',
        profile: 'DIRECIONAL',
        legsCount: 2,
        maxGain: 'LIMITADO',
        maxLoss: 'LIMITADO',
        description: 'Teste invertido',
        whenToUse: 'Alta',
        marketExpectation: 'Alta moderada',
        bestIVRegime: 'Qualquer',
        management: 'Stop',
        b3Tradability: 'Alta',
      },
      title: 'Trava Invertida',
      bias: 'ALTA',
      status: 'AUTORIZADA',
      expirationDate: '2026-09-18',
      dte: 15,
      underlyingSymbol: 'ITUB4',
      underlyingPrice: 39.55,
      legs: [
        {
          action: 'COMPRA',
          symbol: 'ITUBU385',
          strike: 37.96, // compra strike maior
          type: 'PUT',
          unitPrice: 0.4,
          lotQuantity: 1000,
          totalFinancial: 400,
          openInterest: 10000,
        },
        {
          action: 'VENDA',
          symbol: 'ITUBU368',
          strike: 36.46, // vende strike menor -> Bear Put Spread (baixa), mas marcado como ALTA!
          type: 'PUT',
          unitPrice: 0.14,
          lotQuantity: 1000,
          totalFinancial: 140,
          openInterest: 10000,
        },
      ],
      netCostOrCredit: -0.26,
      isCredit: false,
      totalCostOrCreditForLot: -260,
      spreadWidth: 1.5,
      breakEven: 37.7,
      maxProfit: 1.24,
      maxProfitLot: 1240,
      maxLoss: 0.26,
      maxLossLot: 260,
      returnOnRiskPct: 476.9,
      riskRewardRatio: '1 : 4.8',
      takeProfitRule: { targetPrice: '-', profitGoal: '-', description: '-' },
      stopLossRule: { stopPrice: '-', lossLimit: '-', description: '-' },
      timeStopRule: { dteLimit: 0, description: '-' },
      electionRationale: ['Teste'],
      homeBrokerOrderSlip: {
        orderType: 'Teste',
        entryPriceRange: 'Teste',
        maxSlippage: '0',
        legsSummary: 'Teste',
      },
    };

    expect(() => assertDirection(invertedStrategy, 39.55)).toThrow(StructureDirectionError);
  });
});
