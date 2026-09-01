import { describe, it, expect } from 'vitest';
import petr4Fixture from './__fixtures__/petr4.json';
import mglu3Fixture from './__fixtures__/mglu3.json';
import { analyzeFundamentals } from '../domain/fundamentals';

describe('Contrato de Dado Externo e Parsing da BRAPI (Seção 4.5)', () => {
  it('deve calcular DL/EBITDA e aprovar PETR4 a partir do payload real de financialData + statistics', () => {
    const fin = petr4Fixture.financialData;
    const stats = petr4Fixture.defaultKeyStatistics;

    const totalDebt = fin.totalDebt;
    const totalCash = fin.totalCash;
    const ebitda = fin.ebitda;
    const debtToEbitda = Number(((totalDebt - totalCash) / ebitda).toFixed(2));

    expect(debtToEbitda).toBe(2.28);

    const fundamentals = analyzeFundamentals('PETR4', {
      netIncome: stats.netIncomeToCommon,
      totalDebt,
      totalCash,
      ebitda,
      returnOnEquity: fin.returnOnEquity,
      netMargin: fin.profitMargins,
      debtToEbitda,
      currentRatio: fin.currentRatio,
      priceEarnings: stats.trailingPE,
      priceToBook: stats.priceToBook,
    });

    expect(fundamentals.status).toBe('APROVADO');
    expect(fundamentals.score).toBeGreaterThanOrEqual(45);
  });

  it('deve calcular DL/EBITDA de MGLU3 (2.83x) a partir do payload real e reprovar por score', () => {
    const fin = mglu3Fixture.financialData;
    const stats = mglu3Fixture.defaultKeyStatistics;

    const debtToEbitda = Number(((fin.totalDebt - fin.totalCash) / fin.ebitda).toFixed(2));
    expect(debtToEbitda).toBe(2.83);

    const fundamentals = analyzeFundamentals('MGLU3', {
      netIncome: stats.netIncomeToCommon,
      totalDebt: fin.totalDebt,
      totalCash: fin.totalCash,
      ebitda: fin.ebitda,
      returnOnEquity: fin.returnOnEquity,
      netMargin: fin.profitMargins,
      debtToEbitda,
      currentRatio: fin.currentRatio,
      priceEarnings: stats.trailingPE,
      priceToBook: stats.priceToBook,
    });

    expect(fundamentals.status).toBe('REPROVADO');
    expect(fundamentals.score).toBeLessThan(45);
  });

  it('deve degradar para debtToEbitda = null se a BRAPI parar de enviar ebitda, sem quebrar o crivo', () => {
    const fin = { ...petr4Fixture.financialData, ebitda: null };
    const stats = petr4Fixture.defaultKeyStatistics;

    const debtToEbitda =
      fin.totalDebt !== null && fin.totalCash !== null && fin.ebitda !== null && fin.ebitda > 0
        ? Number(((fin.totalDebt - fin.totalCash) / fin.ebitda).toFixed(2))
        : null;

    expect(debtToEbitda).toBeNull();

    const fundamentals = analyzeFundamentals('PETR4', {
      netIncome: stats.netIncomeToCommon,
      totalDebt: fin.totalDebt,
      totalCash: fin.totalCash,
      ebitda: null,
      returnOnEquity: fin.returnOnEquity,
      netMargin: fin.profitMargins,
      debtToEbitda: null,
      currentRatio: fin.currentRatio,
      priceEarnings: stats.trailingPE,
      priceToBook: stats.priceToBook,
    });

    // Sem DL/EBITDA, a empresa ainda tem currentRatio como métrica de solvência
    expect(fundamentals.metrics.debtToEbitda.value).toBeNull();
    expect(fundamentals.metrics.debtToEbitda.formatted).toBe('N/D');
  });

  it('deve aplicar reconciliação de dívida financeira líquida e FCO para VALE3', () => {
    const rawData = {
      netIncome: 11_800_000_000,
      operatingCashFlow: 50_600_000_000,
      totalDebt: 75_000_000_000,
      totalCash: 15_000_000_000,
      ebitda: 65_000_000_000,
      debtToEbitda: 3.09, // bruto com provisões Samarco/Brumadinho
      financialDebtToEbitda: 0.8, // reconciliado
      returnOnEquity: 0.0442,
      normalizedRoe: 0.18,
      netMargin: 0.0399,
      normalizedNetMargin: 0.16,
      currentRatio: 1.19,
      priceEarnings: 32.29,
      normalizedPE: 9.5,
      priceToBook: 1.76,
      dividendYield: 0.07,
    };

    const res = analyzeFundamentals('VALE3', rawData);

    expect(res.status).toBe('APROVADO');
    expect(res.isNormalized).toBe(true);
    expect(res.metrics.debtToEbitda.status).toBe('BOM');
    expect(res.metrics.debtToEbitda.isAdjusted).toBe(true);
    expect(res.metrics.debtToEbitda.value).toBe(0.8);
    expect(res.distortionAlerts).toBeDefined();
  });
});

