import { describe, it, expect } from 'vitest';
import { getRiskFreeRate, MACRO_CONFIG } from '../config/macro';
import { calculateBlackScholes, calculateImpliedVolatility } from './black-scholes';

describe('Item 3.4 & 4: Unificação da Taxa Livre de Risco (Selic) e Taxonomia Estrita', () => {
  it('macro.ts exporta getRiskFreeRate() com a taxa oficial da Selic Meta (10.75% a.a.)', () => {
    const rate = getRiskFreeRate();
    expect(rate).toBe(0.1075);
    expect(MACRO_CONFIG.riskFreeRate).toBe(0.1075);
    expect(MACRO_CONFIG.riskFreeRatePercent).toBe(10.75);
  });

  it('black-scholes.ts utiliza por padrão a taxa unificada retornada por getRiskFreeRate()', () => {
    // Calculando com default vs calculando passando explicitamente getRiskFreeRate()
    const resultWithDefault = calculateBlackScholes(100, 100, 30 / 252, undefined, 0.30, 'call');
    const resultWithExplicitRate = calculateBlackScholes(100, 100, 30 / 252, getRiskFreeRate(), 0.30, 'call');

    expect(resultWithDefault.theoreticalPrice).toBe(resultWithExplicitRate.theoreticalPrice);
    expect(resultWithDefault.delta).toBe(resultWithExplicitRate.delta);
    expect(resultWithDefault.gamma).toBe(resultWithExplicitRate.gamma);
  });

  it('calculateImpliedVolatility utiliza por padrão a taxa unificada retornada por getRiskFreeRate()', () => {
    const ivDefault = calculateImpliedVolatility(3.5, 100, 100, 30 / 252);
    const ivExplicit = calculateImpliedVolatility(3.5, 100, 100, 30 / 252, getRiskFreeRate());

    expect(ivDefault).not.toBeNull();
    expect(ivDefault).toBe(ivExplicit);
  });
});
