import { describe, it, expect } from 'vitest';
import { calculateHistoricalVolatility, classifyVolatilityRegime } from './volatility';

describe('Cálculo de Volatilidade Histórica Real (HV)', () => {
  it('deve calcular HV21 para preços com volatilidade diária moderada', () => {
    const prices = [
      30.0, 30.2, 29.8, 30.5, 30.1, 30.4, 29.9, 30.6, 30.2, 30.0,
      30.3, 29.7, 30.1, 30.5, 30.8, 30.2, 30.4, 30.1, 30.6, 30.3,
      30.5, 30.7, 30.4,
    ];
    const hv21 = calculateHistoricalVolatility(prices, 21);
    expect(hv21).not.toBeNull();
    expect(hv21).toBeGreaterThan(5);
    expect(hv21).toBeLessThan(60);
  });

  it('deve retornar null se o histórico for insuficiente', () => {
    const shortPrices = [30.0, 30.5, 31.0];
    const hv21 = calculateHistoricalVolatility(shortPrices, 21);
    expect(hv21).toBeNull();
  });
});

describe('classifyVolatilityRegime — thresholds oficiais CNPI (Alta >= 28%, Squeeze < 16%)', () => {
  it('deve classificar como MUITO_BAIXA (Squeeze) quando IV < 16%', () => {
    const r = classifyVolatilityRegime(15.5, 25.0);
    expect(r.regime).toBe('MUITO_BAIXA');
    expect(r.isCreditFavorable).toBe(false);
  });

  it('deve classificar como MUITO_BAIXA quando ivRatio < 0.70 e IV < 22%', () => {
    const r = classifyVolatilityRegime(16.5, 25.0); // ratio = 0.66 < 0.70
    expect(r.regime).toBe('MUITO_BAIXA');
    expect(r.isCreditFavorable).toBe(false);
  });

  it('deve classificar como ALTA quando IV >= 28%', () => {
    const r = classifyVolatilityRegime(28.0, 25.0);
    expect(r.regime).toBe('ALTA');
    expect(r.isCreditFavorable).toBe(true);
  });

  it('deve classificar como ALTA quando ivRatio >= 1.05', () => {
    const r = classifyVolatilityRegime(22.0, 20.0); // ratio = 1.10 >= 1.05
    expect(r.regime).toBe('ALTA');
    expect(r.isCreditFavorable).toBe(true);
  });

  it('deve classificar como EXTREMA quando IV >= 75% ou ivRatio >= 2.0', () => {
    const r = classifyVolatilityRegime(80.0, 25.0);
    expect(r.regime).toBe('EXTREMA');
    expect(r.isCreditFavorable).toBe(true);
  });

  it('deve classificar como MODERADA quando em equilíbrio entre 16% e 27.9% sem ratio alto', () => {
    const r = classifyVolatilityRegime(22.0, 23.0); // ratio = 0.96
    expect(r.regime).toBe('MODERADA');
    expect(r.isCreditFavorable).toBe(true);
  });
});
