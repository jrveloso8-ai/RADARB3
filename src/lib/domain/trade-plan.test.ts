import { describe, it, expect } from 'vitest';
import { buildTradePlan } from './trade-plan';

describe('Plano de Trade e Cálculo Real de R:R — Testes T1 a T4 (Spec v2)', () => {
  // Série simulando fundo e pivô de alta com suporte em 28 e resistência em 35
  const highs = [28, 29, 30, 29, 31, 32, 31, 33, 34, 35, 33, 32, 34, 35, 33, 32, 33];
  const lows = [26, 27, 28, 27, 29, 30, 29, 31, 32, 33, 31, 30, 32, 33, 31, 30, 31];
  const closes = [27, 28, 29, 28, 30, 31, 30, 32, 33, 34, 32, 31, 33, 34, 32, 31, 32];

  it('T1: deve marcar isViable = true quando R:R medido >= 1.5', () => {
    // Spot em 31.0 com suporte em 30.0 e resistência em 35.0 -> risco ~ 1.5, ganho = 4.0 -> R:R ~ 2.6
    const plan = buildTradePlan(31.0, 'ALTA', highs, lows, closes);
    expect(plan).not.toBeNull();
    if (plan) {
      expect(plan.riskRewardRatio).toBeGreaterThanOrEqual(1.5);
      expect(plan.isViable).toBe(true);
      expect(plan.stop).toBeLessThan(31.0);
      expect(plan.target1).toBeGreaterThan(31.0);
    }
  });

  it('T2: deve marcar isViable = false quando R:R medido for insuficiente (< 1.5)', () => {
    // Spot em 34.5 (muito colado na resistência de 35.0) -> ganho pequeno de 0.5 vs risco de 4.0 -> R:R < 0.2
    const plan = buildTradePlan(34.5, 'ALTA', highs, lows, closes);
    expect(plan).not.toBeNull();
    if (plan) {
      expect(plan.riskRewardRatio).toBeLessThan(1.5);
      expect(plan.isViable).toBe(false);
    }
  });

  it('T3: sem resistência real acima do spot deve resultar em isViable = false sem fallback arbitrário', () => {
    // Spot em 50.0 (muito acima de qualquer máxima do histórico de 35.0)
    const plan = buildTradePlan(50.0, 'ALTA', highs, lows, closes);
    expect(plan).not.toBeNull();
    if (plan) {
      expect(plan.isViable).toBe(false);
      expect(plan.method).toContain('Sem resistência');
    }
  });

  it('T4: R:R nunca deve ser constante (ativos e configurações diferentes produzem R:R diferentes)', () => {
    const plan1 = buildTradePlan(31.0, 'ALTA', highs, lows, closes);
    const plan2 = buildTradePlan(32.5, 'ALTA', highs, lows, closes);
    expect(plan1?.riskRewardRatio).not.toBe(plan2?.riskRewardRatio);
  });
});
