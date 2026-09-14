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

  it('evita venda ITM (caso MGLU3): rejeita barreira defasada abaixo do spot e ancora em delta OTM real', () => {
    // Caso real diagnosticado em MGLU3:
    // Spot real = 5.59
    // Maior barreira de OI histórica estava em 5.14 (ITM!)
    const mglu3Regime: MarketRegime = {
      ...mockRegime,
      spotPrice: 5.59,
      upperBand2Sigma: 6.50,
      upperBand3Sigma: 7.20,
      lowerBand2Sigma: 4.80,
      lowerBand3Sigma: 4.10,
      topCallBarrierStrike: 5.14, // Barreira ITM defasada!
      topPutBarrierStrike: 5.00,
    };

    const mglu3Chain: OptionChainItem[] = [
      {
        symbol: 'MGLUJ514',
        underlyingSymbol: 'MGLU3',
        side: 'CALL',
        strike: 5.14, // ITM defasada!
        expirationDate: '2026-10-16',
        bid: 0.65,
        ask: 0.68,
        close: 0.66,
      },
      {
        symbol: 'MGLUJ580',
        underlyingSymbol: 'MGLU3',
        side: 'CALL',
        strike: 5.80, // OTM Delta ~0.40
        expirationDate: '2026-10-16',
        bid: 0.28,
        ask: 0.30,
        close: 0.29,
      },
      {
        symbol: 'MGLUJ660',
        underlyingSymbol: 'MGLU3',
        side: 'CALL',
        strike: 6.60, // OTM Delta ~0.16 (1σ exato com HV=52%)
        expirationDate: '2026-10-16',
        bid: 0.12,
        ask: 0.14,
        close: 0.13,
      },
      {
        symbol: 'MGLUJ740',
        underlyingSymbol: 'MGLU3',
        side: 'CALL',
        strike: 7.40, // OTM Delta ~0.05 (proteção de cauda)
        expirationDate: '2026-10-16',
        bid: 0.04,
        ask: 0.06,
        close: 0.05,
      },
      {
        symbol: 'MGLUV480',
        underlyingSymbol: 'MGLU3',
        side: 'PUT',
        strike: 4.80, // OTM Delta ~ -0.16 (-1σ exato com HV=52%)
        expirationDate: '2026-10-16',
        bid: 0.14,
        ask: 0.16,
        close: 0.15,
      },
      {
        symbol: 'MGLUV400',
        underlyingSymbol: 'MGLU3',
        side: 'PUT',
        strike: 4.00, // OTM Delta ~ -0.05 (proteção de cauda)
        expirationDate: '2026-10-16',
        bid: 0.03,
        ask: 0.05,
        close: 0.04,
      },
    ];

    const input: GenerateStrategiesInput = {
      regime: mglu3Regime,
      expiration: '2026-10-16',
      dte: 23,
      hv21: 52.0, // Alta volatilidade típica de MGLU3
      dataDate: '2026-09-14',
      optionsChain: mglu3Chain,
    };

    const strategies = generateStrategies(input);
    const condor = strategies.find((s) => s.id === 'IRON_CONDOR');

    expect(condor).toBeDefined();
    const [sc, lc, sp, lp] = condor!.legs;

    // A CALL vendida NUNCA pode ser a 5.14 (que era ITM)
    expect(sc.strike).toBe(6.60);
    expect(sc.symbol).toBe('MGLUJ660');
    expect(sc.strike).toBeGreaterThan(5.59); // Estritamente OTM

    // A CALL comprada deve ser acima da vendida (cobertura da cauda)
    expect(lc.strike).toBe(7.40);
    expect(lc.symbol).toBe('MGLUJ740');
    expect(lc.strike).toBeGreaterThan(sc.strike);

    // PUT vendida deve ser OTM (abaixo do spot)
    expect(sp.strike).toBe(4.80);
    expect(sp.symbol).toBe('MGLUV480');
    expect(sp.strike).toBeLessThan(5.59);

    // PUT comprada deve ser abaixo da vendida
    expect(lp.strike).toBe(4.00);
    expect(lp.symbol).toBe('MGLUV400');
    expect(lp.strike).toBeLessThan(sp.strike);

    // POP estatístico deve ser calculado e saudável (> 65%)
    expect(condor?.pop).toBeDefined();
    expect(condor?.pop).toBeGreaterThan(0.65);
  });

  it('gera estratégia JADE LIZARD e valida a regra de risco zero na alta quando crédito >= largura do spread', () => {
    const chain: OptionChainItem[] = [
      {
        symbol: 'VALEV650',
        underlyingSymbol: 'VALE3',
        side: 'PUT',
        strike: 68.0, // PUT vendida OTM
        expirationDate: '2026-10-16',
        bid: 1.80,
        ask: 1.90,
        close: 1.85,
      },
      {
        symbol: 'VALEJ800',
        underlyingSymbol: 'VALE3',
        side: 'CALL',
        strike: 78.0, // CALL vendida OTM
        expirationDate: '2026-10-16',
        bid: 1.50,
        ask: 1.60,
        close: 1.55,
      },
      {
        symbol: 'VALEJ802',
        underlyingSymbol: 'VALE3',
        side: 'CALL',
        strike: 80.0, // CALL comprada OTM (largura do spread = 2.00)
        expirationDate: '2026-10-16',
        bid: 0.60,
        ask: 0.70,
        close: 0.65,
      },
    ];

    const input: GenerateStrategiesInput = {
      regime: mockRegime,
      expiration: '2026-10-16',
      dte: 23,
      hv21: 24.5,
      dataDate: '2026-09-14',
      optionsChain: chain,
    };

    const strategies = generateStrategies(input);
    const lizard = strategies.find((s) => s.id === 'JADE_LIZARD');

    expect(lizard).toBeDefined();
    expect(lizard?.legs).toHaveLength(3);

    // Pernas do Jade Lizard:
    // 1. PUT vendida (68.0, bid 1.80)
    // 2. CALL vendida (78.0, bid 1.50)
    // 3. CALL comprada (80.0, ask 0.70)
    const [sp, sc, lc] = lizard!.legs;
    expect(sp.action).toBe('VENDER');
    expect(sp.type).toBe('PUT');
    expect(sp.strike).toBe(68.0);

    expect(sc.action).toBe('VENDER');
    expect(sc.type).toBe('CALL');
    expect(sc.strike).toBe(78.0);

    expect(lc.action).toBe('COMPRAR');
    expect(lc.type).toBe('CALL');
    expect(lc.strike).toBe(80.0);

    // Crédito líquido recebido:
    // + 1.80 (PUT) + 1.50 (CALL vendida) - 0.70 (CALL comprada) = R$ 2.60
    // Largura do spread de CALL: 80.0 - 78.0 = R$ 2.00
    // Como 2.60 >= 2.00, o risco na alta é ZERO (lucro de R$ 0.60 na alta infinita!)
    expect(lizard?.noUpsideRisk).toBe(true);

    // Verificar se no payoff em spot muito alto (ex: R$ 100), o P&L é positivo
    const highSpotPayoff = lizard!.payoffPoints.find((p) => p.spotAtExpiry >= 95);
    expect(highSpotPayoff).toBeDefined();
    expect(highSpotPayoff!.netPayoff).toBeGreaterThanOrEqual(0);

    // POP deve ser alto (> 70%)
    expect(lizard?.pop).toBeGreaterThan(0.70);
  });

  it('gera Bull Put Spread e Bear Call Spread com POP calibrado por Delta e pernas estritamente OTM', () => {
    const chain: OptionChainItem[] = [
      {
        symbol: 'PETRJ380',
        underlyingSymbol: 'PETR4',
        side: 'CALL',
        strike: 38.0, // OTM Delta ~0.28
        expirationDate: '2026-10-16',
        bid: 0.85,
        ask: 0.90,
        close: 0.88,
      },
      {
        symbol: 'PETRJ400',
        underlyingSymbol: 'PETR4',
        side: 'CALL',
        strike: 40.0, // OTM Delta ~0.10
        expirationDate: '2026-10-16',
        bid: 0.25,
        ask: 0.30,
        close: 0.28,
      },
      {
        symbol: 'PETRV340',
        underlyingSymbol: 'PETR4',
        side: 'PUT',
        strike: 34.0, // OTM Delta ~ -0.28
        expirationDate: '2026-10-16',
        bid: 0.70,
        ask: 0.75,
        close: 0.72,
      },
      {
        symbol: 'PETRV320',
        underlyingSymbol: 'PETR4',
        side: 'PUT',
        strike: 32.0, // OTM Delta ~ -0.10
        expirationDate: '2026-10-16',
        bid: 0.20,
        ask: 0.25,
        close: 0.22,
      },
    ];

    const input: GenerateStrategiesInput = {
      regime: {
        ...mockRegime,
        spotPrice: 36.0,
      },
      expiration: '2026-10-16',
      dte: 23,
      hv21: 28.0,
      dataDate: '2026-09-14',
      optionsChain: chain,
    };

    const strategies = generateStrategies(input);

    // 1. Testar Bull Put Spread
    const bullPut = strategies.find((s) => s.id === 'BULL_PUT_SPREAD');
    expect(bullPut).toBeDefined();
    expect(bullPut?.legs).toHaveLength(2);
    expect(bullPut?.legs[0].action).toBe('VENDER');
    expect(bullPut?.legs[0].type).toBe('PUT');
    expect(bullPut?.legs[0].strike).toBeLessThan(36.0); // OTM
    expect(bullPut?.legs[1].action).toBe('COMPRAR');
    expect(bullPut?.legs[1].type).toBe('PUT');
    expect(bullPut?.legs[1].strike).toBeLessThan(bullPut!.legs[0].strike); // Asa de proteção abaixo
    expect(bullPut?.pop).toBeDefined();
    expect(bullPut?.pop).toBeGreaterThan(0.60);

    // 2. Testar Bear Call Spread
    const bearCall = strategies.find((s) => s.id === 'BEAR_CALL_SPREAD');
    expect(bearCall).toBeDefined();
    expect(bearCall?.legs).toHaveLength(2);
    expect(bearCall?.legs[0].action).toBe('VENDER');
    expect(bearCall?.legs[0].type).toBe('CALL');
    expect(bearCall?.legs[0].strike).toBeGreaterThan(36.0); // OTM
    expect(bearCall?.legs[1].action).toBe('COMPRAR');
    expect(bearCall?.legs[1].type).toBe('CALL');
    expect(bearCall?.legs[1].strike).toBeGreaterThan(bearCall!.legs[0].strike); // Asa de proteção acima
    expect(bearCall?.pop).toBeDefined();
    expect(bearCall?.pop).toBeGreaterThan(0.60);

    // 3. Testar Covered Call c/ Collar
    const collar = strategies.find((s) => s.id === 'COVERED_CALL_COLLAR');
    expect(collar).toBeDefined();
    expect(collar?.legs).toHaveLength(2);
    expect(collar?.legs[0].action).toBe('VENDER');
    expect(collar?.legs[0].type).toBe('CALL');
    expect(collar?.legs[0].strike).toBeGreaterThan(36.0); // OTM
    expect(collar?.legs[1].action).toBe('COMPRAR');
    expect(collar?.legs[1].type).toBe('PUT');
    expect(collar?.legs[1].strike).toBeLessThan(36.0); // OTM
    expect(collar?.pop).toBeDefined();
    expect(collar?.pop).toBeGreaterThan(0.60);
  });
});
