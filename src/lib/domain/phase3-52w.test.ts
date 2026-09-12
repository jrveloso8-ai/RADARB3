import { describe, it, expect } from 'vitest';
import { calculate52WeekRange } from './indicators';
import { HistoricalPrice } from '../types/financial';

describe('Item 3C (a) — Faixa de 52 Semanas Real a partir do Histórico B3', () => {
  it('retorna null e label N/D quando histórico de preços está vazio', () => {
    const result = calculate52WeekRange([]);
    expect(result.min52w).toBeNull();
    expect(result.max52w).toBeNull();
    expect(result.candleCount).toBe(0);
    expect(result.isCompleteYear).toBe(false);
    expect(result.label).toBe('52w: N/D');
  });

  it('quando houver menos de 252 pregões, calcula min/max real e indica explicitamente a quantidade de pregões', () => {
    const mockCandles: HistoricalPrice[] = Array.from({ length: 60 }, (_, i) => ({
      date: 1725148800 + i * 86400,
      open: 30 + (i % 5),
      high: 35 + (i % 5),
      low: 25 - (i % 5),
      close: 32,
      volume: 10000,
    }));

    const result = calculate52WeekRange(mockCandles);
    expect(result.candleCount).toBe(60);
    expect(result.isCompleteYear).toBe(false);
    expect(result.min52w).toBe(21); // 25 - 4
    expect(result.max52w).toBe(39); // 35 + 4
    expect(result.label).toContain('Mín/Máx (60 pregões)');
    expect(result.label).not.toContain('52w: R$');
  });

  it('quando houver 252 ou mais pregões, calcula faixa exata de 52 semanas (252 pregões)', () => {
    const mockCandles: HistoricalPrice[] = Array.from({ length: 300 }, (_, i) => ({
      date: 1700000000 + i * 86400,
      open: 50,
      high: i === 10 ? 100 : i === 280 ? 75 : 55, // i=10 está fora dos últimos 252 pregões (300-252 = 48)
      low: i === 10 ? 10 : i === 290 ? 42 : 48,
      close: 52,
      volume: 20000,
    }));

    const result = calculate52WeekRange(mockCandles);
    expect(result.candleCount).toBe(252);
    expect(result.isCompleteYear).toBe(true);
    // Não pode considerar i=10 (preço antigo fora dos 252 pregões mais recentes)
    expect(result.max52w).toBe(75);
    expect(result.min52w).toBe(42);
    expect(result.label).toContain('52w: R$ 42.00 - R$ 75.00');
  });
});
