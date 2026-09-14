import { describe, it, expect } from 'vitest';
import { generateStrategies } from './options-strategy-engine';
import { analyzeAgriCommodities } from './agri-commodities';
import { analyzeFundamentals } from './fundamentals';
import { electBestOptionStrategy } from './cme-election';
import { detectIronCondorOpportunity } from './opportunity-radar';
import { generateStudyAudit } from './study-auditor';
import { MarketRegime, OptionChainItem } from '../types/financial';

describe('Auditoria de Integridade 14/09/2026 — Regressão & Remediação', () => {
  // ─────────────────────────────────────────────────────────────
  // N1: Deltas e POP em options-strategy-engine.ts
  // ─────────────────────────────────────────────────────────────
  it('N1: não deve fabricar POP quando as opções não possuírem delta e volatilidade for ausente', () => {
    const dummyRegime: MarketRegime = {
      zScore: 0.2,
      regime: 'EQUILIBRIO',
      regimeLabel: 'Compressão Lateral',
      tailRiskIndex: 0,
      tailRiskLabel: 'Baixo Risco de Cauda',
      flowSignal: 'NEUTRAL',
      flowLabel: 'Fluxo Estável',
      pcr: 0.8,
      pcrSignal: 'NEUTRO',
      pcrLabel: 'Neutro',
      topCallBarrierStrike: 38.0,
      topPutBarrierStrike: 32.0,
      upperBand2Sigma: 38.0,
      lowerBand2Sigma: 32.0,
      upperBand3Sigma: 40.0,
      lowerBand3Sigma: 30.0,
      spotPrice: 35.0,
      hv21: null,
      sampleSize: 200,
      isInsufficient: false,
    };

    // Chain com opções reais mas sem HV21 nem delta
    const chainSemDelta: OptionChainItem[] = [
      { symbol: 'PETR4P320', underlyingSymbol: 'PETR4', expirationDate: '2026-10-16', side: 'PUT', strike: 32.0, bid: 0.75, ask: 0.85, close: 0.80 },
      { symbol: 'PETR4P300', underlyingSymbol: 'PETR4', expirationDate: '2026-10-16', side: 'PUT', strike: 30.0, bid: 0.25, ask: 0.35, close: 0.30 },
      { symbol: 'PETR4C380', underlyingSymbol: 'PETR4', expirationDate: '2026-10-16', side: 'CALL', strike: 38.0, bid: 0.65, ask: 0.75, close: 0.70 },
      { symbol: 'PETR4C400', underlyingSymbol: 'PETR4', expirationDate: '2026-10-16', side: 'CALL', strike: 40.0, bid: 0.20, ask: 0.30, close: 0.25 },
    ];

    const strategies = generateStrategies({
      regime: dummyRegime,
      expiration: '2026-10-16',
      dte: 22,
      hv21: null,
      dataDate: '2026-09-14',
      optionsChain: chainSemDelta,
    });

    expect(strategies.length).toBeGreaterThan(0);

    for (const strat of strategies) {
      // Quando não há delta na BRAPI nem dados para Black-Scholes, POP DEVE ser null
      expect(strat.pop).toBeNull();
      // O rationale não deve exibir percentual fabricado
      expect(strat.rationale).not.toContain('POP Estimado: 72.0%');
      expect(strat.rationale).not.toContain('POP Estimado: 84.0%');
    }
  });

  // ─────────────────────────────────────────────────────────────
  // N2: Preços de commodities e trade opportunities em agri-commodities.ts
  // ─────────────────────────────────────────────────────────────
  it('N2: não deve inventar preço de milho (62.50) nem alvos de trade quando dados não forem fornecidos', () => {
    const results = analyzeAgriCommodities({});
    expect(results).toHaveLength(3);

    const milho = results.find((c) => c.id === 'CCM')!;
    expect(milho.price).toBeNull();
    expect(milho.provenance).toBe('INDISPONIVEL');
    expect(milho.tradeOpportunity?.targetPrice).toBeUndefined();
    expect(milho.tradeOpportunity?.stopLoss).toBeUndefined();
    expect(milho.tradeOpportunity?.bias).toBe('AGUARDAR');

    const boi = results.find((c) => c.id === 'BGI')!;
    expect(boi.price).toBeNull();
    expect(boi.provenance).toBe('INDISPONIVEL');
    expect(boi.tradeOpportunity?.targetPrice).toBeUndefined();
    expect(boi.exchangeRatio).toBeUndefined();

    const soja = results.find((c) => c.id === 'SOJA')!;
    expect(soja.price).toBeNull();
    expect(soja.provenance).toBe('INDISPONIVEL');
    expect(soja.tradeOpportunity?.targetPrice).toBeUndefined();
  });

  it('N2: calcula alvos reais estritamente quando cotação for fornecida', () => {
    const results = analyzeAgriCommodities({
      ccmPrice: 70.0,
      ccmChange: 0.5,
      bgiPrice: 250.0,
    });

    const milho = results.find((c) => c.id === 'CCM')!;
    expect(milho.price).toBe(70.0);
    expect(milho.provenance).toBe('REAL');
    expect(milho.tradeOpportunity?.targetPrice).toBe(75.60); // 70 * 1.08
    expect(milho.tradeOpportunity?.stopLoss).toBe(66.50); // 70 * 0.95

    const boi = results.find((c) => c.id === 'BGI')!;
    expect(boi.price).toBe(250.0);
    expect(boi.exchangeRatio).toBeDefined();
    expect(boi.exchangeRatio?.ratio).toBe(3.57); // 250 / 70
  });

  // ─────────────────────────────────────────────────────────────
  // C1: Prejuízo com FCO positivo em fundamentals.ts
  // ─────────────────────────────────────────────────────────────
  it('C1: empresa com prejuízo contábil não pode ser aprovada no crivo mesmo com FCO > R$ 1 bi', () => {
    const result = analyzeFundamentals('VALE3', {
      netIncome: -800_000_000, // Prejuízo de 800 milhões
      operatingCashFlow: 1_500_000_000, // FCO de 1.5 bi
      returnOnEquity: -15.0,
      netMargin: -12.0,
      debtToEbitda: 2.1,
    });

    // Deve conter flag eliminatória de lucro negativo
    expect(result.eliminatoryFlags).toContain('LUCRO_NEGATIVO');
    expect(result.metrics.netIncome?.status).toBe('RUIM');
    expect(result.metrics.netIncome?.value).toBe(-800_000_000);
    // Não pode dar status APROVADO
    expect(result.status).toBe('REPROVADO');
  });

  // ─────────────────────────────────────────────────────────────
  // C2: ROE normalizado não deve ser grampeado em 18% em fundamentals.ts
  // ─────────────────────────────────────────────────────────────
  it('C2: ROE não deve ser forçado artificialmente para 18.0% na presença de prejuízo', () => {
    const result = analyzeFundamentals('PETR4', {
      netIncome: -50_000_000,
      operatingCashFlow: 80_000_000,
      returnOnEquity: -8.5,
      netMargin: -5.0,
      debtToEbitda: 1.5,
    });

    expect(result.metrics.roe.value).toBe(-8.5);
    expect(result.metrics.roe.value).not.toBe(18.0);
  });

  // ─────────────────────────────────────────────────────────────
  // C4: Break-even do Iron Condor em cme-election.ts
  // ─────────────────────────────────────────────────────────────
  it('C4: break-even do Iron Condor deve refletir os pontos zero de payoff (inferior e superior) e não a média dos strikes', () => {
    const shortPutStrike = 30.0;
    const shortCallStrike = 36.0;

    const condorResult = electBestOptionStrategy(
      'PETR4',
      33.0,
      'NEUTRO',
      'LATERAL',
      50,
      26.0,
      {
        underlyingPrice: 33.0,
        selectedExpiration: '2026-10-16',
        selectedExpirationInfo: { dte: 22 },
        calls: [
          { symbol: 'PETR4C360', strike: shortCallStrike, bid: 0.85, ask: 0.95, close: 0.90, delta: 0.25 },
          { symbol: 'PETR4C380', strike: 38.0, bid: 0.20, ask: 0.30, close: 0.25, delta: 0.10 },
        ],
        puts: [
          { symbol: 'PETR4P300', strike: shortPutStrike, bid: 0.80, ask: 0.90, close: 0.85, delta: -0.25 },
          { symbol: 'PETR4P280', strike: 28.0, bid: 0.15, ask: 0.25, close: 0.20, delta: -0.08 },
        ],
      } as any,
      'APROVADO',
      []
    );

    if (condorResult.strategySpec.name === 'Iron Condor') {
      const expectedLower = Number((shortPutStrike - condorResult.netCostOrCredit).toFixed(2));
      const expectedUpper = Number((shortCallStrike + condorResult.netCostOrCredit).toFixed(2));
      const midpointLucroMaximo = (shortPutStrike + shortCallStrike) / 2;

      expect(condorResult.breakEvenLower).toBe(expectedLower);
      expect(condorResult.breakEvenUpper).toBe(expectedUpper);
      // Não pode ser a média dos strikes vendidos
      expect(condorResult.breakEvenLower).not.toBe(midpointLucroMaximo);
    }
  });

  // ─────────────────────────────────────────────────────────────
  // N3: Contágio de proveniência em opportunity-radar.ts
  // ─────────────────────────────────────────────────────────────
  it('N3: contágio de proveniência deve rebaixar scoreProvenance para SIMULADO quando pop for ausente', () => {
    const ironCondor = detectIronCondorOpportunity(
      'VALE3',
      'Vale ON',
      60.0,
      0.1,
      'LATERAL',
      'APROVADO',
      24.0,
      { netCredit: 1.20 } // sem pop medido
    );

    expect(ironCondor).toBeDefined();
    expect(ironCondor!.execution.probabilityOfProfit).toBeNull();
    expect(ironCondor!.execution.popProvenance).toBe('INDISPONIVEL');
    // Contágio: se não há POP medido, a proveniência do score herda o pior nível ('SIMULADO')
    expect(ironCondor!.scoreProvenance).toBe('SIMULADO');
  });

  // ─────────────────────────────────────────────────────────────
  // N4: study-auditor.ts não deve assumir strategyId: 11 nem R:R: 1.5
  // ─────────────────────────────────────────────────────────────
  it('N4: study-auditor deve retornar strategyId: null e riskRewardRatio: null na ausência de estratégia e plano', () => {
    const report = generateStudyAudit({
      symbol: 'BBAS3',
      regularMarketPrice: 28.0,
      electedOptionStrategy: undefined, // Sem estratégia eleita
      tradePlan: undefined, // Sem trade plan
    } as any);

    expect(report.optionsStrategyJustification.strategyId).toBeNull();
    expect(report.spotTradePlanJustification.riskRewardRatio).toBeNull();
  });
});
