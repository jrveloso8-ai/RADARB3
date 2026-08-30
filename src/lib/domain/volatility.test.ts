import { describe, it, expect } from 'vitest';
import { calculateHistoricalVolatility, classifyVolatilityRegime } from './volatility';

describe('Cálculo de Volatilidade Histórica Real (HV)', () => {
  it('deve calcular HV21 para preços com volatilidade diária moderada', () => {
    // Série com pequenas oscilações diárias
    const prices = [
      30.0, 30.2, 29.8, 30.5, 30.1, 30.4, 29.9, 30.6, 30.2, 30.0,
      30.3, 29.7, 30.1, 30.5, 30.8, 30.2, 30.4, 30.1, 30.6, 30.3,
      30.5, 30.7, 30.4
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

describe('classifyVolatilityRegime — todos os regimes e valores-limite', () => {
  // ─── Regime MUITO_BAIXA (Squeeze) ───────────────────────────────────────────
  it('deve classificar como MUITO_BAIXA (Squeeze) quando IV < 18%', () => {
    const r = classifyVolatilityRegime(17.9, 25.0);
    expect(r.regime).toBe('MUITO_BAIXA');
    expect(r.isCreditFavorable).toBe(false);
  });

  it('deve classificar como MUITO_BAIXA no limiar exato de 18.0% quando ivRatio < 0.85 (IV comprimida vs HV)', () => {
    // IV = 18.0 exatamente, HV = 25.0 → ivRatio = 0.72 < 0.85 e IV < 24 → ainda MUITO_BAIXA (Squeeze)
    // A fronteira efetiva de saída do squeeze é quando IV >= 18 E ivRatio >= 0.85
    const r = classifyVolatilityRegime(18.0, 25.0);
    expect(r.regime).toBe('MUITO_BAIXA');
    expect(r.isCreditFavorable).toBe(false);
  });

  it('deve escapar do Squeeze quando IV=18.0% e HV=17.0% (ivRatio > 0.85)', () => {
    // IV = 18.0, HV = 17.0 → ratio = 1.05 → não é squeeze, mas passa para ALTA
    const r = classifyVolatilityRegime(18.0, 17.0);
    expect(r.regime).not.toBe('MUITO_BAIXA');
  });

  it('deve classificar como MUITO_BAIXA quando ivRatio < 0.85 e IV < 24%', () => {
    // Ex: IV = 19%, HV = 25% → ratio = 0.76 < 0.85 e IV < 24 → Squeeze
    const r = classifyVolatilityRegime(19.0, 25.0);
    expect(r.regime).toBe('MUITO_BAIXA');
    expect(r.isCreditFavorable).toBe(false);
  });

  // ─── Regime EXTREMA ──────────────────────────────────────────────────────────
  it('deve classificar como EXTREMA quando IV >= 75% (cisne negro)', () => {
    const r = classifyVolatilityRegime(80.0, 25.0);
    expect(r.regime).toBe('EXTREMA');
    expect(r.isCreditFavorable).toBe(true);
  });

  it('deve classificar como EXTREMA quando ivRatio >= 2.0', () => {
    // IV = 50%, HV = 25% → ratio = 2.0 → EXTREMA
    const r = classifyVolatilityRegime(50.0, 25.0);
    expect(r.regime).toBe('EXTREMA');
  });

  // ─── Regime ALTA ─────────────────────────────────────────────────────────────
  it('deve classificar como ALTA quando IV >= 35%', () => {
    const r = classifyVolatilityRegime(35.0, 25.0);
    expect(r.regime).toBe('ALTA');
    expect(r.isCreditFavorable).toBe(true);
  });

  it('deve classificar como ALTA quando IV > HV (ivRatio >= 1.05)', () => {
    // IV = 27%, HV = 25% → ratio = 1.08 → ALTA
    const r = classifyVolatilityRegime(27.0, 25.0);
    expect(r.regime).toBe('ALTA');
    expect(r.isCreditFavorable).toBe(true);
  });

  // ─── Regime MODERADA ─────────────────────────────────────────────────────────
  it('deve classificar como MODERADA quando IV está equilibrada com HV (ratio 0.85–1.04)', () => {
    // IV = 25%, HV = 25% → ratio = 1.0 → MODERADA
    const r = classifyVolatilityRegime(25.0, 25.0);
    expect(r.regime).toBe('MODERADA');
    expect(r.isCreditFavorable).toBe(true);
  });

  // ─── Comportamento defensivo (dado ausente / zero) ───────────────────────────
  it('deve usar fallback seguro quando IV e HV são zero (dado ausente)', () => {
    // Não deve lançar exceção; safeHv=25, safeIv=25 → MODERADA
    const r = classifyVolatilityRegime(0, 0);
    expect(r.regime).toBe('MODERADA');
  });

  it('deve usar fallback quando IV é negativa (dado corrompido)', () => {
    // safeIv usa ivAtm > 0 ? ivAtm : safeHv → usa safeHv (25) como fallback
    const r = classifyVolatilityRegime(-5, 25.0);
    expect(r.regime).toBe('MODERADA');
  });
});
