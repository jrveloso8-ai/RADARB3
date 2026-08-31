import { describe, it, expect } from 'vitest';
import { analyzeFundamentals } from './fundamentals';

describe('Motor de Análise Fundamentalista (Padrão CNPI-P / CG1)', () => {
  it('deve aprovar empresa sólida (ROE alto, margem saudável e baixa alavancagem)', () => {
    const res = analyzeFundamentals('PETR4', {
      returnOnEquity: 0.22,
      netMargin: 0.18,
      debtToEbitda: 1.2,
      currentRatio: 1.6,
      priceEarnings: 5.5,
      priceToBook: 1.1,
      dividendYield: 0.14,
    });

    expect(res.status).toBe('APROVADO');
    expect(res.score).toBeGreaterThanOrEqual(80);
    expect(res.metrics.roe.status).toBe('BOM');
    expect(res.metrics.debtToEbitda.status).toBe('BOM');
  });

  it('deve reprovar empresa operando em prejuízo líquido (margem negativa)', () => {
    const res = analyzeFundamentals('MGLU3', {
      returnOnEquity: -0.05,
      netMargin: -0.04,
      debtToEbitda: 3.5,
      currentRatio: 1.1,
      priceEarnings: -10.0,
      priceToBook: 2.0,
      dividendYield: 0.0,
    });

    expect(res.status).toBe('REPROVADO');
    expect(res.flags.some((f) => f.includes('prejuízo') || f.includes('negativa'))).toBe(true);
  });

  it('deve reprovar empresa com superendividamento crítico (> 3.5x)', () => {
    const res = analyzeFundamentals('GOLL4', {
      returnOnEquity: 0.10,
      netMargin: 0.02,
      debtToEbitda: 6.5,
      currentRatio: 0.6,
      priceEarnings: 12.0,
      priceToBook: 5.5,
      dividendYield: 0.0,
    });

    expect(res.status).toBe('REPROVADO');
    expect(res.flags.some((f) => f.includes('Alavancagem') || f.includes('segurança'))).toBe(true);
  });

  it('deve REPROVAR e zerar o score quando empresa não possui dados fundamentalistas mínimos (Prevenção de Value Trap)', () => {
    const res = analyzeFundamentals('TICK3', {});

    expect(res.status).toBe('REPROVADO');
    expect(res.score).toBe(0);
    expect(res.flags).toContain('Dados fundamentalistas insuficientes para aprovação no crivo CNPI-P.');
  });
});
