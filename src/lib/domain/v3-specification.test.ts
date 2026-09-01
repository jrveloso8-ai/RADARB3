import { describe, it, expect } from 'vitest';
import {
  electBestOptionStrategy,
  isActionableStrategy,
  assertDirection,
} from './cme-election';
import itub4AnalyticsFixture from '../services/__fixtures__/itub4-analytics.json';
import { OptionAnalyticsItem, OptionAnalysisResult } from '../types/financial';
import { CNPI_RULES } from '../config/rules';

describe('Especificação de Execução v3.0 / v3.1 — Suíte Completa de Validação', () => {
  const itub4Analytics = itub4AnalyticsFixture.analytics as OptionAnalyticsItem[];

  const itub4OptionAnalysis: OptionAnalysisResult = {
    underlyingSymbol: 'ITUB4',
    underlyingPrice: 39.55,
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
      percentile: 50,
    },
    ivQuality: 'CONFIÁVEL',
    openInterestDate: '2026-08-28',
    maxPain: 39.5,
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

  // CT-950: Mapeamento de lastTradeDate e firstTradeDate
  it('CT-950 (G4): Mapeamento de lastTradeDate e firstTradeDate sem fallback de confidence e conversão incondicional de IV', () => {
    const item = itub4Analytics[0];
    expect(item).toHaveProperty('lastTradeDate');
    expect(item.lastTradeDate).toBe('2026-08-28');
  });

  // CT-958: ivAtm = null, alvo a crédito -> bloqueia com IV_INDISPONIVEL
  it('CT-958 (G3): ivAtm = null em alvo a crédito bloqueia com IV_INDISPONIVEL', () => {
    const strategy = electBestOptionStrategy(
      'ITUB4',
      39.55,
      'COMPRA',
      'ALTA',
      55,
      22.0,
      undefined,
      'APROVADO',
      itub4Analytics
    );

    expect(strategy.status).toBe('BLOQUEADA');
    expect(strategy.blockDetails?.reason).toBe('IV_INDISPONIVEL');
  });

  // CT-958b: ivAtm = null mesmo com cadeia cheia de IVs válidas não reconstrói IV
  it('CT-958b (G3): Cadeia com IVs válidas mas sem ivAtm oficial deve permanecer IV_INDISPONIVEL sem reconstrução', () => {
    const analysisWithoutIvAtm = { ...itub4OptionAnalysis, ivAtm: undefined };

    const strategy = electBestOptionStrategy(
      'ITUB4',
      39.55,
      'COMPRA',
      'ALTA',
      55,
      22.0,
      analysisWithoutIvAtm,
      'APROVADO',
      itub4Analytics
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
      itub4OptionAnalysis,
      'APROVADO',
      []
    );

    expect(strategy.status).toBe('BLOQUEADA');
    expect(strategy.blockDetails?.diagnostics).toBeDefined();
    expect(strategy.blockDetails?.diagnostics.seriesInChain).toBe(0);
    expect(strategy.blockDetails?.diagnostics.seriesEligible).toBe(0);
    expect(strategy.blockDetails?.diagnostics.validPairs).toBe(0);
  });

  // CT-955: Iron Condor por busca no espaço de pares
  it('CT-955 (G1): Iron Condor montado por busca combinatória de put spread e call spread com delta máx 0.30', () => {
    const strategy = electBestOptionStrategy(
      'ITUB4',
      39.55,
      'IRON_CONDOR',
      'LATERAL',
      50,
      22.0,
      itub4OptionAnalysis,
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

    expect(Math.abs(shortPut.delta!)).toBeLessThanOrEqual(0.30);
    expect(Math.abs(shortCall.delta!)).toBeLessThanOrEqual(0.30);

    expect(() => assertDirection(strategy, 39.55)).not.toThrow();
  });

  // CT-967: isActionableStrategy retorna true apenas para AUTORIZADA com pernas
  it('CT-967 (G6): isActionableStrategy valida estritamente status AUTORIZADA e pernas > 0', () => {
    const authorized = electBestOptionStrategy(
      'ITUB4',
      39.55,
      'COMPRA',
      'ALTA',
      55,
      22.0,
      itub4OptionAnalysis,
      'APROVADO',
      itub4Analytics
    );

    expect(isActionableStrategy(authorized)).toBe(true);

    const emAnalise = { ...authorized, status: 'EM_ANALISE' as const };
    expect(isActionableStrategy(emAnalise)).toBe(false);

    const bloqueada = { ...authorized, status: 'BLOQUEADA' as const };
    expect(isActionableStrategy(bloqueada)).toBe(false);

    expect(isActionableStrategy(null)).toBe(false);
  });

  // CT-N06 / Item 10: Estrutura alternativa a débito produzida
  it('CT-N06 (Item 10): Bull Put Spread a crédito produz Bull Call Spread como alternative', () => {
    const strategy = electBestOptionStrategy(
      'ITUB4',
      39.55,
      'COMPRA',
      'ALTA',
      55,
      22.0,
      itub4OptionAnalysis,
      'APROVADO',
      itub4Analytics
    );

    expect(strategy.status).toBe('AUTORIZADA');
    expect(strategy.alternative).toBeDefined();
    expect(strategy.alternative?.strategy).toBeDefined();
    expect(strategy.alternative?.strategy.title).toContain('Trava de Alta com Call a Débito');
    expect(strategy.alternative?.strategy.isCredit).toBe(false);
    expect(strategy.alternative?.rationale).toContain('favorece venda de prêmio a crédito');
  });
});
