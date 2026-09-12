import { describe, it, expect } from 'vitest';
import { calculateHistoricalMACD, calculateMACD } from './indicators';

describe('Item 3C (b) — MACD Histórico Real Candle a Candle', () => {
  it('para histórico menor que o período mínimo (slow 26 + signal 9), retorna null nas grelhas iniciais sem inventar dados', () => {
    const shortPrices = [30, 31, 32, 31, 33, 34, 35];
    const historical = calculateHistoricalMACD(shortPrices);

    expect(historical.length).toBe(shortPrices.length);
    // Todos os pontos devem ter signalLine e histogram como null
    for (const pt of historical) {
      expect(pt.signalLine).toBeNull();
      expect(pt.histogram).toBeNull();
    }
  });

  it('calcula séries dinâmicas e divergentes candle a candle ao longo do tempo (sem valor estático repetido)', () => {
    // Série simulando 80 pregões de movimento real (alta seguida de queda)
    const prices: number[] = [];
    let p = 20.0;
    for (let i = 0; i < 80; i++) {
      p += i < 40 ? 0.4 + (i % 3) * 0.1 : -0.3 - (i % 2) * 0.1;
      prices.push(Number(p.toFixed(2)));
    }

    const historical = calculateHistoricalMACD(prices);
    expect(historical.length).toBe(80);

    // Seleciona os pontos maduros com histograma calculado (a partir do índice 34)
    const maturePoints = historical.slice(35).filter((pt) => pt.histogram !== null);
    expect(maturePoints.length).toBeGreaterThan(30);

    // Coleta histogramas únicos para verificar que não há repetição estática
    const uniqueHistograms = new Set(maturePoints.map((pt) => pt.histogram));
    expect(uniqueHistograms.size).toBeGreaterThan(15);

    // O último ponto da série histórica deve bater rigorosamente com o cálculo pontual do MACD
    const lastPoint = historical[historical.length - 1];
    const singleMACD = calculateMACD(prices);

    expect(lastPoint.macdLine).toBe(singleMACD.macdLine);
    expect(lastPoint.signalLine).toBe(singleMACD.signalLine);
    expect(lastPoint.histogram).toBe(singleMACD.histogram);
  });
});
