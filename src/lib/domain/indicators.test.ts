import { describe, it, expect } from 'vitest';
import {
  calculateRSI,
  calculateMACD,
  calculateATR,
  calculateVolumeRatio,
  evaluateTechnicalChecklist,
  calculateRiskReward,
} from './indicators';
import { HistoricalPrice } from '../types/financial';

describe('Indicadores Técnicos CNPI-T', () => {
  it('deve calcular o RSI corretamente', () => {
    // Array simulado de 15 preços ascendentes
    const prices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
    const rsi = calculateRSI(prices, 14);
    expect(rsi).toBe(100);
  });

  it('deve calcular o MACD corretamente', () => {
    const prices = Array.from({ length: 40 }, (_, i) => 10 + i * 0.5);
    const macd = calculateMACD(prices);
    expect(macd.macdLine).toBeGreaterThan(0);
    expect(macd.histogram).not.toBeNull();
  });

  it('deve avaliar o Checklist Técnico de 5 itens', () => {
    const res = evaluateTechnicalChecklist(
      15.0, // spot
      14.0, // mm20
      13.5, // mm50
      12.0, // mm200
      58.0, // rsi saudável
      0.15, // macd positivo
      115 // volume acima da média
    );

    expect(res.score).toBe(5);
    expect(res.statusLabel).toContain('BOM (COMPRA)');
    expect(res.items.every((i) => i.passed)).toBe(true);
  });

  it('deve calcular parâmetros de risco/retorno operacionais para LONG', () => {
    const rr = calculateRiskReward(
      20.0,
      'ALTA',
      0.5,
      [19.0, 18.5, 18.0],
      [22.0, 23.0, 24.0]
    );

    expect(rr.bias).toBe('LONG');
    expect(rr.stopLoss).toBeLessThan(20.0);
    expect(rr.target1).toBeGreaterThan(20.0);
    expect(rr.riskRewardRatio).toBeGreaterThanOrEqual(1.4);
  });
});
