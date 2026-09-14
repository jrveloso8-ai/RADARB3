import { describe, it, expect } from 'vitest';
import {
  resolveOptionLeg,
  generateStrategies,
  GenerateStrategiesInput,
} from './options-strategy-engine';
import { OptionChainItem, MarketRegime } from '../types/financial';

describe('options-strategy-engine: resolveOptionLeg', () => {
  const mockChain: OptionChainItem[] = [
    {
      symbol: 'VALEJ784',
      underlyingSymbol: 'VALE3',
      side: 'CALL',
      strike: 76.64,
      expirationDate: '2026-10-16',
      bid: 4.04,
      ask: 5.50,
      close: 4.00,
      volume: 16300,
      openInterest: 4918700,
    },
    {
      symbol: 'VALEJ951',
      underlyingSymbol: 'VALE3',
      side: 'CALL',
      strike: 95.14,
      expirationDate: '2026-10-16',
      bid: 0.08,
      ask: 0.90,
      close: 0.16,
      volume: 100,
      openInterest: 15000,
    },
    {
      symbol: 'VALEJ984',
      underlyingSymbol: 'VALE3',
      side: 'CALL',
      strike: 96.64,
      expirationDate: '2026-10-16',
      bid: 0.08,
      ask: 0.10,
      close: 0.08,
      volume: 100,
      openInterest: 10000,
    },
    {
      symbol: 'VALEV752',
      underlyingSymbol: 'VALE3',
      side: 'PUT',
      strike: 70.14,
      expirationDate: '2026-10-16',
      bid: 0.57,
      ask: 0.58,
      close: 0.58,
      volume: 700,
      openInterest: 3200000,
    },
    {
      symbol: 'VALEV634',
      underlyingSymbol: 'VALE3',
      side: 'PUT',
      strike: 61.64,
      expirationDate: '2026-10-16',
      bid: 0.03,
      ask: 0.15,
      close: 0.09,
      volume: 1500,
      openInterest: 45000,
    },
  ];

  it('mapeia strike teórico para o strike real mais próximo da B3', () => {
    // Alvo teórico da banda +3σ é 95.95 — não existe na B3. O mais próximo é 95.14 (VALEJ951) ou 96.64 (VALEJ984)
    const leg = resolveOptionLeg({
      action: 'COMPRAR',
      type: 'CALL',
      targetStrike: 95.95,
      strikeOrigin: 'BANDA_3SIGMA_REAL',
      strikeOriginDescription: 'Banda +3σ real (R$95.95)',
      chain: mockChain,
      spot: 74.0,
      dte: 23,
      hv21: 24.5,
      expiration: '2026-10-16',
      legRationale: 'Cobertura de cauda superior',
    });

    // 95.95 está a 0.81 de 95.14 e a 0.69 de 96.64 → 96.64 é o mais próximo
    expect(leg.strike).toBe(96.64);
    expect(leg.symbol).toBe('VALEJ984');
    expect(leg.ask).toBe(0.10);
    // Para compra, usa ASK do book
    expect(leg.premiumUsed).toBe(0.10);
    expect(leg.premiumReliability).toBe('REAL_BOOK_ASK');
  });

  it('prioriza BID do book na perna de VENDA', () => {
    const leg = resolveOptionLeg({
      action: 'VENDER',
      type: 'CALL',
      targetStrike: 76.64,
      strikeOrigin: 'BARREIRA_CALL_REAL',
      strikeOriginDescription: 'Barreira CALL real maior OI',
      chain: mockChain,
      spot: 74.0,
      dte: 23,
      hv21: 24.5,
      expiration: '2026-10-16',
      legRationale: 'CALL vendida na barreira',
    });

    expect(leg.strike).toBe(76.64);
    expect(leg.symbol).toBe('VALEJ784');
    expect(leg.bid).toBe(4.04);
    expect(leg.premiumUsed).toBe(4.04);
    expect(leg.premiumReliability).toBe('REAL_BOOK_BID');
  });

  it('prioriza ASK do book na perna de COMPRA de PUT', () => {
    // Alvo teórico da banda -3σ é 61.87 — mais próximo é 61.64 (VALEV634)
    const leg = resolveOptionLeg({
      action: 'COMPRAR',
      type: 'PUT',
      targetStrike: 61.87,
      strikeOrigin: 'BANDA_3SIGMA_REAL',
      strikeOriginDescription: 'Banda -3σ real (R$61.87)',
      chain: mockChain,
      spot: 74.0,
      dte: 23,
      hv21: 24.5,
      expiration: '2026-10-16',
      legRationale: 'PUT de proteção de cauda',
    });

    expect(leg.strike).toBe(61.64);
    expect(leg.symbol).toBe('VALEV634');
    expect(leg.ask).toBe(0.15);
    expect(leg.premiumUsed).toBe(0.15);
    expect(leg.premiumReliability).toBe('REAL_BOOK_ASK');
  });

  it('aplica restrição STRICTLY_GREATER_THAN para garantir perna comprada acima da vendida', () => {
    const leg = resolveOptionLeg({
      action: 'COMPRAR',
      type: 'CALL',
      targetStrike: 76.0, // Alvo menor que a perna vendida
      strikeOrigin: 'BANDA_3SIGMA_REAL',
      strikeOriginDescription: 'Banda +3σ',
      chain: mockChain,
      spot: 74.0,
      dte: 23,
      hv21: 24.5,
      expiration: '2026-10-16',
      legRationale: 'Proteção',
      constraint: 'STRICTLY_GREATER_THAN',
      constraintStrike: 76.64, // Deve ser estritamente maior que 76.64
    });

    expect(leg.strike).toBeGreaterThan(76.64);
    expect(['VALEJ951', 'VALEJ984']).toContain(leg.symbol);
  });
});

describe('options-strategy-engine: generateStrategies com cadeia real', () => {
  const mockRegime: MarketRegime = {
    spotPrice: 74.0,
    regime: 'EQUILIBRIO',
    regimeLabel: 'Equilíbrio Estatístico',
    zScore: 0.1,
    flowSignal: 'NEUTRAL',
    flowLabel: 'Neutro',
    pcr: 1.0,
    pcrSignal: 'NEUTRO',
    pcrLabel: 'Equilíbrio',
    tailRiskIndex: 20,
    tailRiskLabel: 'Normal',
    upperBand2Sigma: 85.0,
    upperBand3Sigma: 95.95, // valor contínuo da banda
    lowerBand2Sigma: 68.0,
    lowerBand3Sigma: 61.87, // valor contínuo da banda
    topCallBarrierStrike: 76.64,
    topPutBarrierStrike: 70.14,
    sampleSize: 200,
    hv21: 24.5,
    isInsufficient: false,
  };

  const mockChain: OptionChainItem[] = [
    {
      symbol: 'VALEJ784',
      underlyingSymbol: 'VALE3',
      side: 'CALL',
      strike: 76.64,
      expirationDate: '2026-10-16',
      bid: 4.04,
      ask: 5.50,
      close: 4.00,
    },
    {
      symbol: 'VALEJ951',
      underlyingSymbol: 'VALE3',
      side: 'CALL',
      strike: 95.14,
      expirationDate: '2026-10-16',
      bid: 0.08,
      ask: 0.90,
      close: 0.16,
    },
    {
      symbol: 'VALEV752',
      underlyingSymbol: 'VALE3',
      side: 'PUT',
      strike: 70.14,
      expirationDate: '2026-10-16',
      bid: 0.57,
      ask: 0.58,
      close: 0.58,
    },
    {
      symbol: 'VALEV634',
      underlyingSymbol: 'VALE3',
      side: 'PUT',
      strike: 61.64,
      expirationDate: '2026-10-16',
      bid: 0.03,
      ask: 0.15,
      close: 0.09,
    },
  ];

  it('gera Iron Condor com pernas amarradas aos strikes reais da B3', () => {
    const input: GenerateStrategiesInput = {
      regime: mockRegime,
      expiration: '2026-10-16',
      dte: 23,
      hv21: 24.5,
      dataDate: '2026-09-14',
      optionsChain: mockChain,
    };

    const strategies = generateStrategies(input);
    const condor = strategies.find((s) => s.id === 'IRON_CONDOR');

    expect(condor).toBeDefined();
    expect(condor?.legs).toHaveLength(4);

    // Conferir pernas do Iron Condor
    const [sc, lc, sp, lp] = condor!.legs;

    // CALL Vendida: barreira 76.64
    expect(sc.strike).toBe(76.64);
    expect(sc.symbol).toBe('VALEJ784');
    expect(sc.premiumUsed).toBe(4.04); // Bid

    // CALL Comprada: banda +3σ ajustada para strike real mais próximo (95.14)
    expect(lc.strike).toBe(95.14);
    expect(lc.symbol).toBe('VALEJ951');
    expect(lc.premiumUsed).toBe(0.90); // Ask

    // PUT Vendida: barreira 70.14
    expect(sp.strike).toBe(70.14);
    expect(sp.symbol).toBe('VALEV752');
    expect(sp.premiumUsed).toBe(0.57); // Bid

    // PUT Comprada: banda -3σ ajustada para strike real mais próximo (61.64)
    expect(lp.strike).toBe(61.64);
    expect(lp.symbol).toBe('VALEV634');
    expect(lp.premiumUsed).toBe(0.15); // Ask
  });
});
