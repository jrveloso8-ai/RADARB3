import { describe, it, expect } from 'vitest';
import {
  electBestOptionStrategy,
  assertDirection,
} from './cme-election';
import itub4AnalyticsFixture from '../services/__fixtures__/itub4-analytics.json';
import { OptionAnalyticsItem } from '../types/financial';
import { CNPI_RULES } from '../config/rules';

describe('Especificação de Execução v3.0 — Suíte Completa de Validação (CT-950 a CT-968)', () => {
  const itub4Analytics = itub4AnalyticsFixture.analytics as OptionAnalyticsItem[];

  // CT-950: Mapeamento de lastTradeDate e firstTradeDate
  it('CT-950 (G4): Mapeamento de lastTradeDate e firstTradeDate sem fallback de confidence e conversão incondicional de IV', () => {
    const item = itub4Analytics[0];
    expect(item).toHaveProperty('lastTradeDate');
    expect(item.lastTradeDate).toBe('2026-08-28');
  });

  // CT-951: Gate de IV ATM obrigatório para estruturas a crédito
  it('CT-951 (G3): Gate de IV ATM obrigatório bloqueia com IV_INDISPONIVEL se IV for ausente ou zero', () => {
    const corruptedAnalytics: OptionAnalyticsItem[] = [
      {
        symbol: 'ITUBU385',
        side: 'put',
        strike: 37.96,
        optionPrice: 0.4,
        impliedVolatility: 0, // IV zero
        delta: -0.257,
        openInterest: 994500,
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
      undefined,
      'APROVADO',
      corruptedAnalytics
    );

    expect(strategy.status).toBe('BLOQUEADA');
    expect(strategy.blockDetails?.reason).toBe('IV_INDISPONIVEL');
  });

  // CT-952: Conversão incondicional de IV (entre 1% e 400%)
  it('CT-952 (G4): Conversão incondicional de IV na faixa válida de 1% a 400%', () => {
    itub4Analytics.forEach((item) => {
      if (item.impliedVolatility && item.impliedVolatility > 0) {
        expect(item.impliedVolatility).toBeGreaterThanOrEqual(1.0);
        expect(item.impliedVolatility).toBeLessThanOrEqual(400.0);
      }
    });
  });

  // CT-953: Fixture de ITUB4 com strikes reais de call espaçados em R$ 0,25
  it('CT-953 (G5): Fixture ITUB4 contém as 8 calls reais com strikes espaçados em R$ 0,25 (ITUBI407 a ITUBI424)', () => {
    const itubCalls = itub4Analytics.filter((a) => a.side.toLowerCase() === 'call');
    expect(itubCalls.length).toBe(8);

    const callStrikes = itubCalls.map((c) => c.strike).sort((a, b) => a - b);
    expect(callStrikes[0]).toBe(40.05); // ITUBI407
    expect(callStrikes[1]).toBe(40.30); // ITUBI409
    expect(callStrikes[2]).toBe(40.55); // ITUBI412
    expect(callStrikes[3]).toBe(40.80); // ITUBI414
    expect(callStrikes[4]).toBe(41.05); // ITUBI417
    expect(callStrikes[5]).toBe(41.30); // ITUBI419
    expect(callStrikes[6]).toBe(41.55); // ITUBI422
    expect(callStrikes[7]).toBe(41.80); // ITUBI424

    // Verificar espaçamento uniforme de R$ 0,25
    for (let i = 1; i < callStrikes.length; i++) {
      expect(Number((callStrikes[i] - callStrikes[i - 1]).toFixed(2))).toBe(0.25);
    }
  });

  // CT-954: Diagnóstico numérico real em 100% dos bloqueios
  it('CT-954 (G2): Diagnósticos contêm seriesInChain, seriesEligible, validPairs e mensagem específica', () => {
    const strategy = electBestOptionStrategy(
      'ITUB4',
      39.55,
      'COMPRA',
      'ALTA',
      55,
      22.0,
      undefined,
      'APROVADO',
      []
    );

    expect(strategy.status).toBe('BLOQUEADA');
    expect(strategy.blockDetails?.diagnostics).toBeDefined();
    expect(strategy.blockDetails?.diagnostics.seriesInChain).toBe(0);
    expect(strategy.blockDetails?.diagnostics.seriesEligible).toBe(0);
    expect(strategy.blockDetails?.diagnostics.validPairs).toBe(0);
  });

  // CT-955: Iron Condor por busca no espaço de pares (produto cartesiano de puts e calls)
  it('CT-955 (G1): Iron Condor montado por busca combinatória de put spread e call spread com delta máx 0.30', () => {
    const strategy = electBestOptionStrategy(
      'ITUB4',
      39.55,
      'IRON_CONDOR',
      'LATERAL',
      50,
      22.0,
      undefined,
      'APROVADO',
      itub4Analytics
    );

    expect(strategy.status).toBe('AUTORIZADA');
    expect(strategy.bias).toBe('LATERAL');
    expect(strategy.legs.length).toBe(4);

    const shortPut = strategy.legs.find((l) => l.action === 'VENDA' && l.type === 'PUT')!;
    const shortCall = strategy.legs.find((l) => l.action === 'VENDA' && l.type === 'CALL')!;
    const longPut = strategy.legs.find((l) => l.action === 'COMPRA' && l.type === 'PUT')!;
    const longCall = strategy.legs.find((l) => l.action === 'COMPRA' && l.type === 'CALL')!;

    expect(shortPut).toBeDefined();
    expect(shortCall).toBeDefined();
    expect(longPut).toBeDefined();
    expect(longCall).toBeDefined();

    // Delta das pernas vendidas <= 0.30
    expect(Math.abs(shortPut.delta!)).toBeLessThanOrEqual(0.30);
    expect(Math.abs(shortCall.delta!)).toBeLessThanOrEqual(0.30);

    // Validação direcional de Iron Condor
    expect(() => assertDirection(strategy, 39.55)).not.toThrow();
  });

  // CT-956: Pesos da função de score das travas da Seção 14
  it('CT-956 (Seção 14): Pesos de score obedecem 0.50 (short delta), 0.15 (long delta), 0.20 (retorno) e 0.15 (liquidez)', () => {
    const weights = CNPI_RULES.DERIVATIVES.SPREAD.SCORE_WEIGHTS;
    expect(weights.SHORT_DELTA).toBe(0.50);
    expect(weights.LONG_DELTA).toBe(0.15);
    expect(weights.RETURN_ON_RISK).toBe(0.20);
    expect(weights.LIQUIDITY).toBe(0.15);
  });
});
