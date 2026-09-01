import { describe, it, expect } from 'vitest';
import { analyzeFundamentals } from './fundamentals';

describe('Crivo Fundamentalista CNPI-P — Testes Obrigatórios F1 a F11 (Spec v2.2)', () => {
  // F1: PETR4 com dados reais da BRAPI
  it('F1: deve APROVAR PETR4 com dados reais da BRAPI (liquidez < 1.0 não é eliminatória)', () => {
    const res = analyzeFundamentals('PETR4', {
      returnOnEquity: 0.2781,
      netMargin: 0.2439,
      debtToEbitda: 2.28,
      currentRatio: 0.854,
      priceEarnings: 4.66,
      priceToBook: 1.167,
      netIncome: 133_376_000_000,
    });

    expect(res.status).toBe('APROVADO');
    expect(res.score).toBeGreaterThanOrEqual(45);
    expect(res.eliminatoryFlags).toHaveLength(0);
    expect(res.metrics.currentLiquidity.status).toBe('RUIM'); // 0 pts em liquidez, mas aprovado no total
  });

  // F2: MGLU3 com dados reais da BRAPI
  it('F2: deve REPROVAR MGLU3 com dados reais por score insuficiente (< 45)', () => {
    const res = analyzeFundamentals('MGLU3', {
      returnOnEquity: 0.0079,
      netMargin: 0.0023,
      debtToEbitda: 2.83,
      currentRatio: 1.099,
      priceEarnings: 45.2,
      priceToBook: 1.45,
      netIncome: 85_000_000,
    });

    expect(res.status).toBe('REPROVADO');
    expect(res.score).toBeLessThan(45);
  });

  // F3: Prejuízo Líquido (LUCRO_NEGATIVO)
  it('F3: deve REPROVAR empresa com prejuízo contábil e emitir flag eliminatória LUCRO_NEGATIVO', () => {
    const res = analyzeFundamentals('PREJ3', {
      netIncome: -500_000_000,
      returnOnEquity: 0.15,
      netMargin: 0.10,
      debtToEbitda: 1.5,
      currentRatio: 1.5,
      priceEarnings: 10.0,
      priceToBook: 1.0,
    });

    expect(res.status).toBe('REPROVADO');
    expect(res.eliminatoryFlags).toContain('LUCRO_NEGATIVO');
  });

  // F4: Superendividada (> 3.5x DL/EBITDA)
  it('F4: deve REPROVAR empresa superendividada (> 3.5x) e emitir flag SUPERENDIVIDAMENTO', () => {
    const res = analyzeFundamentals('DIV3', {
      netIncome: 50_000_000,
      returnOnEquity: 0.15,
      netMargin: 0.10,
      debtToEbitda: 4.0,
      currentRatio: 1.5,
      priceEarnings: 10.0,
      priceToBook: 1.0,
    });

    expect(res.status).toBe('REPROVADO');
    expect(res.eliminatoryFlags).toContain('SUPERENDIVIDAMENTO');
  });

  // F5: EBITDA negativo
  it('F5: deve REPROVAR empresa com EBITDA <= 0 e emitir flag SUPERENDIVIDAMENTO', () => {
    const res = analyzeFundamentals('EBIT3', {
      ebitda: -100_000_000,
      netIncome: 10_000_000,
      returnOnEquity: 0.12,
      netMargin: 0.08,
      currentRatio: 1.2,
      priceEarnings: 10.0,
      priceToBook: 1.0,
    });

    expect(res.status).toBe('REPROVADO');
    expect(res.eliminatoryFlags).toContain('SUPERENDIVIDAMENTO');
  });

  // F6: Só Valuation (Defeito D3 — sem dados de rentabilidade nem solvência)
  it('F6: deve REPROVAR empresa que só possui múltiplos de Valuation sem rentabilidade ou solvência', () => {
    const res = analyzeFundamentals('VALU3', {
      priceEarnings: 10.0,
      priceToBook: 1.0,
    });

    expect(res.status).toBe('REPROVADO');
  });

  // F7: Valores-limite (score 44 reprova, 45 aprova, 46 aprova)
  it('F7: deve testar valores-limite do score (44 REPROVADO, 45 APROVADO)', () => {
    // Score 45: LL (5) + ROE 15 (15) + Margem 15 (15) + DL 2.8x (10) = 45 pts
    const res45 = analyzeFundamentals('LIM45', {
      netIncome: 100_000_000,
      returnOnEquity: 0.15,
      netMargin: 0.12,
      debtToEbitda: 2.8,
    });
    expect(res45.score).toBe(45);
    expect(res45.status).toBe('APROVADO');

    // Score 39: LL (5) + ROE 8% (7) + Margem 5% (7) + DL 1.5x (20) = 39 pts (< 45)
    const res41 = analyzeFundamentals('LIM41', {
      netIncome: 100_000_000,
      returnOnEquity: 0.08,
      netMargin: 0.05,
      debtToEbitda: 1.5,
    });
    expect(res41.score).toBe(39);
    expect(res41.status).toBe('REPROVADO');
  });

  // F8: Sem dado nenhum ({})
  it('F8: deve REPROVAR empresa sem nenhum dado com score 0', () => {
    const res = analyzeFundamentals('VAZIA3', {});
    expect(res.status).toBe('REPROVADO');
    expect(res.score).toBe(0);
  });

  // F9: Liquidez 0.99 com resto excelente (RUIM não é eliminatório)
  it('F9: deve APROVAR empresa com liquidez corrente 0.99 quando o resto for excelente', () => {
    const res = analyzeFundamentals('SOLIDA3', {
      netIncome: 1_000_000_000,
      returnOnEquity: 0.25,
      netMargin: 0.20,
      debtToEbitda: 1.2,
      currentRatio: 0.99,
      priceEarnings: 8.0,
      priceToBook: 1.5,
    });

    expect(res.status).toBe('APROVADO');
    expect(res.score).toBeGreaterThanOrEqual(75);
  });

  // F10: Caso VALE3 com distorção de impairment e reconciliação de dívida financeira
  it('F10: deve APROVAR VALE3 com reconciliação de dívida financeira (0.8x) e normalização de FCO (50.6 Bi vs 11.8 Bi)', () => {
    const res = analyzeFundamentals('VALE3', {
      netIncome: 11_800_000_000, // Lucro contábil pós-impairment de R$ 25,1 Bi
      operatingCashFlow: 50_600_000_000, // FCO TTM robusto
      returnOnEquity: 0.0442, // 4.42% contábil
      normalizedRoe: 0.18, // 18% normalizado ex-impairment
      netMargin: 0.0399, // 3.99% contábil
      normalizedNetMargin: 0.16, // 16% normalizado
      debtToEbitda: 3.09, // 3.09x bruto com provisões Samarco/Brumadinho + IFRS-16
      financialDebtToEbitda: 0.8, // 0.8x dívida financeira líquida oficial 2T26
      currentRatio: 1.19,
      priceEarnings: 32.29,
      normalizedPE: 9.5,
      priceToBook: 1.76,
      dividendYield: 0.07,
    });

    expect(res.status).toBe('APROVADO');
    expect(res.score).toBeGreaterThanOrEqual(60);
    expect(res.isNormalized).toBe(true);
    expect(res.distortionAlerts).toBeDefined();
    expect(res.distortionAlerts!.length).toBeGreaterThan(0);
    expect(res.metrics.debtToEbitda.status).toBe('BOM'); // Pontuou pela dívida financeira 0.8x
    expect(res.metrics.debtToEbitda.isAdjusted).toBe(true);
    expect(res.metrics.roe.status).toBe('BOM'); // Pontuou pelo ROE normalizado de 18%
    expect(res.metrics.pbRatio.status).toBe('BOM');
  });

  // F11: Empresa com queima real de caixa (FCO < 0) e prejuízo líquido
  it('F11: deve REPROVAR empresa com prejuízo real e queima de caixa (FCO negativo)', () => {
    const res = analyzeFundamentals('QUEIMA3', {
      netIncome: -200_000_000,
      operatingCashFlow: -150_000_000,
      returnOnEquity: -0.10,
      netMargin: -0.05,
      debtToEbitda: 4.5,
      currentRatio: 0.7,
      priceEarnings: -5.0,
      priceToBook: 0.8,
    });

    expect(res.status).toBe('REPROVADO');
    expect(res.eliminatoryFlags).toContain('LUCRO_NEGATIVO');
    expect(res.eliminatoryFlags).toContain('MARGEM_NEGATIVA');
    expect(res.eliminatoryFlags).toContain('SUPERENDIVIDAMENTO');
  });
});
