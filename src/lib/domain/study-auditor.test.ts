import { describe, it, expect } from 'vitest';
import { generateStudyAudit } from './study-auditor';
import { QuoteDetails } from '../types/financial';
import { OPTION_25_STRATEGIES } from './cme-strategies';

describe('Auditor de Estudos & Justificativas do Veredito', () => {
  const mockApprovedQuote: QuoteDetails = {
    symbol: 'PETR4',
    shortName: 'PETROBRAS PN',
    currency: 'BRL',
    regularMarketPrice: 38.5,
    regularMarketChange: 0.48,
    regularMarketChangePercent: 1.25,
    regularMarketTime: '2026-09-02T10:00:00Z',
    regularMarketDayHigh: 38.8,
    regularMarketDayLow: 38.1,
    regularMarketVolume: 45000000,
    historicalDataPrice: [],
    indicators: {
      rsi: 58.2,
      macd: {
        macdLine: 0.45,
        signalLine: 0.3,
        histogram: 0.15,
      },
      atr: 0.65,
      volumeRatio: 110,
      checklist: {
        items: [],
        score: 5,
        statusLabel: 'BOM (COMPRA) (5/5)',
      },
    },
    fundamentals: {
      symbol: 'PETR4',
      score: 88,
      status: 'APROVADO',
      summary: 'Empresa sólida com margens robustas e dívida sob controle.',
      metrics: {
        roe: { name: 'ROE', value: 24.5, formatted: '24.5%', benchmark: '>= 10%', status: 'BOM', description: '' },
        netMargin: { name: 'Margem Líquida', value: 21.0, formatted: '21.0%', benchmark: '> 5%', status: 'BOM', description: '' },
        debtToEbitda: { name: 'Dívida Líquida / EBITDA', value: 1.1, formatted: '1.1x', benchmark: '<= 3.0x', status: 'BOM', description: '' },
        currentLiquidity: { name: 'Liquidez Corrente', value: 1.4, formatted: '1.4x', benchmark: '>= 1.0x', status: 'BOM', description: '' },
        peRatio: { name: 'P/L', value: 4.8, formatted: '4.8x', benchmark: '< 15x', status: 'BOM', description: '' },
        pbRatio: { name: 'P/VP', value: 1.2, formatted: '1.2x', benchmark: '< 2.0x', status: 'BOM', description: '' },
        dividendYield: { name: 'Dividend Yield', value: 14.5, formatted: '14.5%', benchmark: '> 6%', status: 'BOM', description: '' },
      },
      reasons: [],
      analyzedAt: new Date().toISOString(),
    },
    verdict: {
      symbol: 'PETR4',
      currentPrice: 38.5,
      verdict: 'COMPRA_FORTE',
      verdictLabel: 'COMPRA FORTE',
      actionRecommendation: 'COMPRA',
      fundamentalStatus: 'APROVADO',
      technicalTrend: 'ALTA',
      rationale: ['Tendência de alta', 'Fundamentos aprovados'],
      updatedAt: new Date().toISOString(),
    },
    barrierAlert: {
      expirationDate: '2026-09-18',
      dte: 12,
      spotPrice: 38.5,
      maxPain: 38.0,
      topCallWall: { strike: 41.0, symbol: 'PETRI410', contracts: 50000, distSpot: 6.5, isImminent: false },
      topPutWall: { strike: 37.0, symbol: 'PETRU370', contracts: 45000, distSpot: -3.9, isImminent: false },
      hasAlert: false,
    },
    trendAnalysis: {
      symbol: 'PETR4',
      currentPrice: 38.5,
      changePercent: 1.25,
      trend: 'ALTA',
      movingAverages: {
        mm20: 37.8,
        mm50: 36.5,
        mm200: 34.0,
      },
      historicalCount: 200,
      summary: 'Tendência de Alta',
      updatedAt: new Date().toISOString(),
    },
    tradePlan: {
      entry: 38.5,
      stop: 37.2,
      target1: 40.45,
      target2: 41.75,
      riskPerShare: 1.3,
      rewardPerShare: 1.95,
      riskRewardRatio: 1.8,
      atr: 0.65,
      isViable: true,
      method: 'Rompimento de pivô com suporte na MM20',
    },
    electedOptionStrategy: {
      strategySpec: OPTION_25_STRATEGIES[10], // Trava de Alta com Put (#11)
      title: 'Trava de Alta com Put a Crédito (Bull Put Spread 38.00 / 37.00)',
      bias: 'ALTA',
      status: 'AUTORIZADA',
      expirationDate: '2026-09-18',
      dte: 12,
      underlyingSymbol: 'PETR4',
      underlyingPrice: 38.5,
      netCostOrCredit: 0.35,
      isCredit: true,
      totalCostOrCreditForLot: 350.0,
      spreadWidth: 1.0,
      breakEven: 37.65,
      maxProfit: 0.35,
      maxProfitLot: 350.0,
      maxLoss: 0.65,
      maxLossLot: 650.0,
      returnOnRiskPct: 35.0,
      riskRewardRatio: '0.54 : 1',
      legs: [
        { symbol: 'PETRU380', strike: 38.0, action: 'VENDA', type: 'PUT', unitPrice: 0.6, totalFinancial: 600, openInterest: 25000, lotQuantity: 1000 },
        { symbol: 'PETRU370', strike: 37.0, action: 'COMPRA', type: 'PUT', unitPrice: 0.25, totalFinancial: 250, openInterest: 18000, lotQuantity: 1000 },
      ],
      takeProfitRule: { targetPrice: 'R$ 0.17', profitGoal: 'Realizar com 50% do prêmio', description: '' },
      stopLossRule: { stopPrice: 'R$ 0.70', lossLimit: 'Desmontar ao romper strike vendido', description: '' },
      timeStopRule: { dteLimit: 4, description: '' },
      electionRationale: ['Viés de alta confirmado', 'Volatilidade favorável para venda de prêmio'],
      homeBrokerOrderSlip: {
        orderType: 'SPREAD_CREDITO',
        entryPriceRange: 'R$ 0.33 a R$ 0.37',
        maxSlippage: 'R$ 0.03',
        legsSummary: 'Vender PETRU380 e Comprar PETRU370',
      },
    },
  };

  it('deve gerar relatório completo de auditoria para ativo aprovado em COMPRA', () => {
    const audit = generateStudyAudit(mockApprovedQuote);

    expect(audit.symbol).toBe('PETR4');
    expect(audit.isBlocked).toBe(false);
    expect(audit.isActionable).toBe(true);
    expect(audit.auditSeal.status).toBe('CERTIFICADO_CONFORME');

    // Checagem Técnica
    expect(audit.technicalAudit.items).toHaveLength(5);
    expect(audit.technicalAudit.score).toBe(5);
    expect(audit.technicalAudit.passed).toBe(true);

    // Checagem Fundamentalista
    expect(audit.fundamentalAudit.status).toBe('APROVADO');
    expect(audit.fundamentalAudit.items.length).toBeGreaterThanOrEqual(4);

    // Checagem de Barreiras
    expect(audit.barrierAudit.hasImmediateBarrier).toBe(false);
    expect(audit.barrierAudit.callWallDistancePct).toBe(6.5);

    // Justificativa de Opções
    expect(audit.optionsStrategyJustification.strategyId).toBe(11);
    expect(audit.optionsStrategyJustification.whySelected).toContain('Trava de Alta com Put a Crédito');

    // Justificativa do Plano à Vista
    expect(audit.spotTradePlanJustification.riskRewardRatio).toBe(1.8);
    expect(audit.spotTradePlanJustification.stopLossRationale).toContain('Stop Loss');
  });

  it('deve bloquear a auditoria e justificar o risco quando os fundamentos forem REPROVADOS', () => {
    const blockedQuote: QuoteDetails = {
      ...mockApprovedQuote,
      symbol: 'CSAN3',
      fundamentals: {
        ...mockApprovedQuote.fundamentals!,
        status: 'REPROVADO',
        score: 32,
        summary: 'Superendividamento com Dívida/EBITDA > 4.5x e margens pressionadas.',
      },
      verdict: {
        ...mockApprovedQuote.verdict!,
        verdict: 'BLOQUEADO_POR_FUNDAMENTOS',
        verdictLabel: 'BLOQUEADO POR FUNDAMENTOS',
        actionRecommendation: 'BLOQUEADO',
        fundamentalStatus: 'REPROVADO',
      },
    };

    const audit = generateStudyAudit(blockedQuote);

    expect(audit.isBlocked).toBe(true);
    expect(audit.auditSeal.status).toBe('BLOQUEADO_RISCO');
    expect(audit.overallVerdictRationale.summary).toContain('REPROVADO no Crivo Fundamentalista');
    expect(audit.optionsStrategyJustification.whySelected).toContain('bloqueadas');
  });
});
