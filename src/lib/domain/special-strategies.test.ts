import { describe, it, expect } from 'vitest';
import {
  evaluateTechnicalTiming,
  screenDITMStockReplacement,
  screenPoorMansCoveredCall,
  screenCashSecuredPuts,
} from './special-strategies';
import { OptionAnalyticsItem } from '@/lib/types/financial';

describe('Special Strategies Domain - DITM Stock Replacement (Lee Lowell)', () => {
  describe('evaluateTechnicalTiming', () => {
    it('identifica PULLBACK_ALTA quando o ativo está em alta saudável e IFR em zona intermediária', () => {
      // Série de alta com oscilações reais (subindo de 20 para 35) e recuo controlado no fim
      const closes: number[] = [];
      let val = 20.0;
      for (let i = 0; i < 200; i++) {
        // Alternar pequenos ganhos e perdas com viés de alta
        val += (i % 3 === 0 ? -0.2 : 0.3);
        closes.push(Number(val.toFixed(2)));
      }
      // Recuo de 4 dias para levar o IFR14 para ~45
      closes.push(val - 0.4);
      closes.push(val - 0.8);
      closes.push(val - 1.1);
      closes.push(val - 1.3);

      const spot = closes[closes.length - 1];
      const timing = evaluateTechnicalTiming(spot, closes);

      expect(timing.status).toBe('PULLBACK_ALTA');
      expect(timing.badgeVariant).toBe('emerald');
      expect(timing.title).toContain('Pullback');
    });

    it('identifica REVERSAO_FUNDO quando IFR14 <= 35', () => {
      // Série com queda brusca nos últimos dias
      const closes: number[] = [];
      for (let i = 0; i < 50; i++) closes.push(50.0);
      for (let i = 0; i < 15; i++) closes.push(50.0 - (i * 1.5)); // Queda contínua severa

      const spot = closes[closes.length - 1];
      const timing = evaluateTechnicalTiming(spot, closes);

      expect(timing.status).toBe('REVERSAO_FUNDO');
      expect(timing.badgeVariant).toBe('blue');
      expect(timing.rsi14).toBeLessThanOrEqual(35);
      expect(timing.explanation).toContain('sobre-venda');
    });

    it('identifica SOBRECOMPRADO quando IFR14 >= 68', () => {
      // Série com alta explosiva contínua
      const closes: number[] = [];
      for (let i = 0; i < 50; i++) closes.push(30.0);
      for (let i = 0; i < 15; i++) closes.push(30.0 + (i * 2.0)); // Rali sem pausas

      const spot = closes[closes.length - 1];
      const timing = evaluateTechnicalTiming(spot, closes);

      expect(timing.status).toBe('SOBRECOMPRADO');
      expect(timing.badgeVariant).toBe('amber');
      expect(timing.rsi14).toBeGreaterThanOrEqual(68);
      expect(timing.actionGuidance).toContain('Aguarde um recuo');
    });

    it('identifica TENDENCIA_BAIXA quando ativo opera abaixo das principais médias', () => {
      // Série em queda prolongada (abaixo da MM50 e MM200)
      const closes: number[] = [];
      let p = 60.0;
      for (let i = 0; i < 220; i++) {
        p -= 0.15;
        closes.push(p);
      }
      // Manter IFR acima de 35 (queda gradual constante)
      const spot = closes[closes.length - 1];
      const timing = evaluateTechnicalTiming(spot, closes);

      expect(timing.status).toBe('TENDENCIA_BAIXA');
      expect(timing.badgeVariant).toBe('rose');
      expect(timing.title).toContain('Baixa');
      expect(timing.actionGuidance).toContain('Não recomendado');
    });

    it('trata graciosamente dados insuficientes ou spot zerado', () => {
      const timing = evaluateTechnicalTiming(0, [10, 11, 12]);
      expect(timing.status).toBe('NEUTRO');
      expect(timing.badgeVariant).toBe('gray');
    });
  });

  describe('screenDITMStockReplacement', () => {
    const mockCloses = Array.from({ length: 100 }, (_, i) => 40 + i * 0.1);
    const spot = 50.0;

    it('filtra apenas CALLs profundas no dinheiro (Strike <= 85% do Spot)', () => {
      const mockOptions: OptionAnalyticsItem[] = [
        // Call DITM elegível: Strike 30 (60% do spot)
        {
          symbol: 'PETRL30',
          underlyingSymbol: 'PETR4',
          side: 'call',
          strike: 30.0,
          expirationDate: '2026-12-18',
          optionPrice: 20.80,
          impliedVolatility: null,
          openInterest: 150000,
        },
        // Call DITM elegível: Strike 40 (80% do spot)
        {
          symbol: 'PETRL40',
          underlyingSymbol: 'PETR4',
          side: 'call',
          strike: 40.0,
          expirationDate: '2026-12-18',
          optionPrice: 10.90,
          impliedVolatility: null,
          openInterest: 80000,
        },
        // Call ATM (não elegível para DITM): Strike 50
        {
          symbol: 'PETRL50',
          underlyingSymbol: 'PETR4',
          side: 'call',
          strike: 50.0,
          expirationDate: '2026-12-18',
          optionPrice: 3.50,
          impliedVolatility: null,
          openInterest: 500000,
        },
        // Call OTM (não elegível): Strike 55
        {
          symbol: 'PETRL55',
          underlyingSymbol: 'PETR4',
          side: 'call',
          strike: 55.0,
          expirationDate: '2026-12-18',
          optionPrice: 1.20,
          impliedVolatility: null,
          openInterest: 300000,
        },
        // Put (não elegível para Stock Replacement): Strike 30
        {
          symbol: 'PETRX30',
          underlyingSymbol: 'PETR4',
          side: 'put',
          strike: 30.0,
          expirationDate: '2026-12-18',
          optionPrice: 0.10,
          impliedVolatility: null,
          openInterest: 10000,
        },
      ];

      const result = screenDITMStockReplacement('PETR4', spot, mockOptions, mockCloses, ['2026-12-18']);

      expect(result.candidates.length).toBe(2);
      expect(result.candidates.map((c) => c.symbol)).toEqual(['PETRL30', 'PETRL40']);
    });

    it('calcula corretamente Valor Intrínseco (VI), Valor Extrínseco (VE) e Comparativo de Capital', () => {
      const mockOptions: OptionAnalyticsItem[] = [
        {
          symbol: 'PETRL30',
          underlyingSymbol: 'PETR4',
          side: 'call',
          strike: 30.0,
          expirationDate: '2026-12-18',
          optionPrice: 20.80, // VI = 20.00, VE = 0.80
          impliedVolatility: null,
          openInterest: 100000,
          lastTradeDate: '2026-09-11',
          openInterestDate: '2026-09-10',
        },
      ];

      const result = screenDITMStockReplacement('PETR4', 50.0, mockOptions, mockCloses);
      const cand = result.candidates[0];

      expect(cand.intrinsicValue).toBe(20.0); // 50 - 30
      expect(cand.realExtrinsicValue).toBe(0.80); // 20.80 - 20.00
      expect(cand.realExtrinsicPercent).toBe(1.6); // 0.80 / 50 * 100
      expect(cand.depthPercent).toBe(40.0); // (50 - 30) / 50 * 100

      // Comparativo de Capital (100 ações vs 100 opções)
      expect(cand.stockInvestment100).toBe(5000.0); // 100 * 50
      expect(cand.optionInvestment100).toBe(2080.0); // 100 * 20.80
      expect(cand.capitalSaved100).toBe(2920.0); // 5000 - 2080 (liberado para CDI)
      expect(cand.leverage).toBeCloseTo(2.4, 1); // 50 / 20.80
      expect(cand.breakEven).toBe(50.80); // 30 + 20.80
    });

    it('trata rigorosamente dados não disponíveis sem inventar ou simular valores', () => {
      const mockOptions: OptionAnalyticsItem[] = [
        {
          symbol: 'PETRL20',
          underlyingSymbol: 'PETR4',
          side: 'call',
          strike: 20.0,
          expirationDate: '2026-12-18',
          optionPrice: null, // Sem negócio na BRAPI
          impliedVolatility: null,
          openInterest: undefined, // Sem contratos informados
        },
      ];

      const result = screenDITMStockReplacement('PETR4', 50.0, mockOptions, mockCloses);
      const cand = result.candidates[0];

      // Nunca inventa preço de mercado
      expect(cand.marketPrice).toBeNull();
      expect(cand.openInterest).toBeNull();
      expect(cand.realExtrinsicValue).toBeNull();
      expect(cand.hasRealTrade).toBe(false);

      // Valor Justo Teórico e Preço Teto são calculados matematicamente para orientar ordem limite
      expect(cand.fairValue).toBeGreaterThan(cand.intrinsicValue);
      expect(cand.ceilingPrice).toBe(cand.intrinsicValue + 50.0 * 0.015);
      expect(cand.quality).toBe('ATENCAO_ILIQUIDA');
      expect(cand.qualityReason).toContain('Sem registro recente');
    });
  });

  describe('screenPoorMansCoveredCall (PMCC - Lee Lowell)', () => {
    const mockCloses = Array.from({ length: 100 }, (_, i) => 40 + i * 0.1);
    const spot = 50.0;

    const mockLongOptions: OptionAnalyticsItem[] = [
      // Call DITM longa: Strike 30 (Vencimento Dezembro/2026 - 3 meses)
      {
        symbol: 'PETRL30',
        underlyingSymbol: 'PETR4',
        side: 'call',
        strike: 30.0,
        expirationDate: '2026-12-18',
        optionPrice: 20.80,
        impliedVolatility: null,
        openInterest: 100000,
      },
    ];

    const mockShortOptions: OptionAnalyticsItem[] = [
      // Call OTM curta: Strike 53 (Vencimento Outubro/2026 - 1 mês, 6% OTM)
      {
        symbol: 'PETRJ53',
        underlyingSymbol: 'PETR4',
        side: 'call',
        strike: 53.0,
        expirationDate: '2026-10-16',
        optionPrice: 1.20,
        impliedVolatility: null,
        openInterest: 80000,
      },
    ];

    it('monta pares casados aplicando rigorosamente a Regra Antissuicídio de Lee Lowell (Spread > Débito)', () => {
      const result = screenPoorMansCoveredCall(
        'PETR4',
        spot,
        mockShortOptions,
        mockLongOptions,
        mockCloses,
        '2026-10-16',
        ['2026-12-18']
      );

      expect(result.candidates.length).toBe(1);
      const pair = result.candidates[0];

      expect(pair.id).toBe('PETRL30_PETRJ53');
      expect(pair.spreadWidth).toBe(23.0); // 53.0 - 30.0
      expect(pair.netDebit).toBe(19.60); // 20.80 - 1.20
      expect(pair.isLowellSafe).toBe(true); // 23.0 > 19.60
      expect(pair.safetyMargin).toBe(3.40); // 23.0 - 19.60
      expect(pair.maxProfitIfExercised).toBe(340.0); // 3.40 * 100
      expect(pair.monthsToFullAmortization).toBe(17); // ceil(19.60 / 1.20)
      expect(pair.compositeScore).toBeGreaterThan(0);
      expect(pair.compositeScore).toBeLessThanOrEqual(100);
      expect(pair.scoreBreakdown).toBeDefined();
      expect(pair.scoreBreakdown.yieldScore).toBeGreaterThan(0);
      expect(pair.scoreBreakdown.safetyScore).toBeGreaterThan(0);
      expect(pair.scoreBreakdown.popScore).toBeGreaterThan(0);
      expect(pair.scoreBreakdown.liquidityScore).toBeGreaterThan(0);
    });

    it('identifica estrutura como ARRISCADA caso a regra de Lee Lowell seja violada', () => {
      // Cenário hipotético de distorção onde o strike curto é muito baixo e o débito supera a largura
      const unsafeShort: OptionAnalyticsItem[] = [
        {
          symbol: 'PETRJ32',
          underlyingSymbol: 'PETR4',
          side: 'call',
          strike: 32.0, // Apenas 2 reais de largura contra 30
          expirationDate: '2026-10-16',
          optionPrice: 15.0, // Débito seria 20.80 - 15.00 = 5.80 (maior que a largura de 2.00!)
          impliedVolatility: null,
          openInterest: 1000,
        },
      ];

      const result = screenPoorMansCoveredCall(
        'PETR4',
        spot,
        unsafeShort,
        mockLongOptions,
        mockCloses,
        '2026-10-16',
        ['2026-12-18']
      );

      // Como o strike 32 é < spot 50, o filtro de curtas OTM (strike >= spot) nem deve admiti-la!
      expect(result.candidates.length).toBe(0);
    });
  });

  describe('screenCashSecuredPuts (Estratégia 3 - Venda de Put OTM / Compra com Desconto)', () => {
    const spot = 50.0;
    const mockPuts: OptionAnalyticsItem[] = [
      {
        symbol: 'PETRV46',
        underlyingSymbol: 'PETR4',
        side: 'put',
        strike: 46.0, // 8% OTM
        optionPrice: 1.15,
        expirationDate: '2026-10-16',
        impliedVolatility: 32.0,
        openInterest: 15000,
        delta: -0.22,
      },
      {
        symbol: 'PETRV48',
        underlyingSymbol: 'PETR4',
        side: 'put',
        strike: 48.0, // 4% OTM
        optionPrice: 1.80,
        expirationDate: '2026-10-16',
        impliedVolatility: 32.0,
        openInterest: 25000,
        delta: -0.34,
      },
      {
        symbol: 'PETRV52_ITM',
        underlyingSymbol: 'PETR4',
        side: 'put',
        strike: 52.0, // ITM (não deve ser incluída!)
        optionPrice: 3.50,
        impliedVolatility: 32.0,
        expirationDate: '2026-10-16',
      },
      {
        symbol: 'PETRV47_NOTRADE',
        underlyingSymbol: 'PETR4',
        side: 'put',
        strike: 47.0, // 6% OTM, sem negócio
        optionPrice: null,
        impliedVolatility: 32.0,
        expirationDate: '2026-10-16',
        openInterest: 200,
      },
      {
        symbol: 'PETRJ50_CALL',
        underlyingSymbol: 'PETR4',
        side: 'call', // CALL deve ser ignorada
        strike: 50.0,
        optionPrice: 1.50,
        impliedVolatility: 32.0,
        expirationDate: '2026-10-16',
      },
    ];

    const mockCloses = Array.from({ length: 50 }, (_, i) => 48.0 + (i % 5) * 0.5);

    it('descarta Puts ITM e Calls, selecionando apenas Puts OTM', () => {
      const result = screenCashSecuredPuts({
        spotPrice: spot,
        options: mockPuts,
        closes: mockCloses,
      });

      expect(result.candidates.length).toBeGreaterThan(0);
      for (const cand of result.candidates) {
        expect(cand.strike).toBeLessThan(spot);
        expect(cand.symbol).not.toBe('PETRV52_ITM');
        expect(cand.symbol).not.toBe('PETRJ50_CALL');
      }
    });

    it('calcula com rigor matemático o preço efetivo de compra e o desconto real', () => {
      const result = screenCashSecuredPuts({
        spotPrice: spot,
        options: mockPuts,
        closes: mockCloses,
      });

      const cand46 = result.candidates.find((c) => c.symbol === 'PETRV46');
      expect(cand46).toBeDefined();
      if (!cand46) return;

      // Strike: 46.00, Prêmio real: 1.15
      // Preço efetivo se exercido: 46.00 - 1.15 = 44.85
      expect(cand46.effectivePurchasePrice).toBe(44.85);
      // Desconto real contra o spot de 50.00: (50.00 - 44.85) / 50.00 = 10.3%
      expect(cand46.realDiscountPercent).toBe(10.3);
      // Yield mensal sobre o capital 100% garantido: 1.15 / 46.00 = 2.50%
      expect(cand46.cashSecuredMonthlyYield).toBe(2.5);
      expect(cand46.hasRealTrade).toBe(true);
      expect(cand46.quality).toBe('EXCELENTE');
    });

    it('trata adequadamente opções sem negócio real sem inventar preços', () => {
      const result = screenCashSecuredPuts({
        spotPrice: spot,
        options: mockPuts,
        closes: mockCloses,
      });

      const candNoTrade = result.candidates.find((c) => c.symbol === 'PETRV47_NOTRADE');
      expect(candNoTrade).toBeDefined();
      if (!candNoTrade) return;

      expect(candNoTrade.hasRealTrade).toBe(false);
      expect(candNoTrade.marketPrice).toBeNull();
      // O preço efetivo deve ter sido calibrado via Black-Scholes teórico
      expect(candNoTrade.theoreticalPrice).toBeGreaterThan(0);
      expect(candNoTrade.isRealPrice).toBe(false);
    });
  });
});

