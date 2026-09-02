import { describe, it, expect } from 'vitest';
import {
  calculateMarketSentiment,
  scoreToTemperature,
  classifySentimentZone,
  getMarketSessionInfo,
} from './sentiment';
import { LiveMarketOverview } from '../services/market-quotes';

describe('Sentimento 24h & Termômetro de Mercado', () => {
  it('deve converter scores de 0 a 100 para temperaturas em Celsius plausíveis', () => {
    expect(scoreToTemperature(0)).toBe(10);
    expect(scoreToTemperature(50)).toBe(25);
    expect(scoreToTemperature(100)).toBe(40);
  });

  it('deve classificar corretamente as zonas térmicas', () => {
    expect(classifySentimentZone(15).zone).toBe('PESSIMISMO_EXTREMO');
    expect(classifySentimentZone(35).zone).toBe('CAUTELA_MEDO');
    expect(classifySentimentZone(50).zone).toBe('NEUTRO');
    expect(classifySentimentZone(65).zone).toBe('OTIMISMO_MODERADO');
    expect(classifySentimentZone(85).zone).toBe('EUFORIA_GANANCIA');
  });

  it('deve identificar corretamente as sessões de mercado globais', () => {
    // 14h (Pregão Regular B3)
    const d14 = new Date(2026, 8, 2, 14, 0);
    const s14 = getMarketSessionInfo(d14);
    expect(s14.isB3Open).toBe(true);
    expect(s14.timeSlotLabel).toBe('PREGÃO ATIVO');

    // 03h (Sessão Noturna / Ásia)
    const d3 = new Date(2026, 8, 2, 3, 0);
    const s3 = getMarketSessionInfo(d3);
    expect(s3.isB3Open).toBe(false);
    expect(s3.timeSlotLabel).toBe('ÁSIA & OVERNIGHT');
  });

  it('deve gerar relatório com 5 pilares macro cuja soma dos pesos seja 100%', () => {
    const report = calculateMarketSentiment(new Date(2026, 8, 2, 11, 30));
    expect(report.pillars).toHaveLength(5);
    const totalWeight = report.pillars.reduce((acc, p) => acc + p.weight, 0);
    expect(totalWeight).toBe(100);
    expect(report.hourlyHistory).toHaveLength(24);
    expect(report.schedule.cycleType).toBe('24H_HOURLY');
  });

  it('deve refletir com precisão cenário com Minério de Ferro e Petróleo em queda (TradingView Match)', () => {
    const mockTradingViewMarket: LiveMarketOverview = {
      spy: { symbol: 'SPY', name: 'SPY', price: 761.78, change: -5.27, changePct: -0.69, timestamp: Date.now() },
      ewz: { symbol: 'EWZ', name: 'EWZ', price: 36.57, change: 0.54, changePct: 1.50, timestamp: Date.now() },
      vix: { symbol: '^VIX', name: 'VIX', price: 16.43, change: 0.10, changePct: 0.61, timestamp: Date.now() },
      brent: { symbol: 'UKOIL', name: 'Brent', price: 94.37, change: -0.83, changePct: -0.87, timestamp: Date.now() },
      wti: { symbol: 'USOIL', name: 'WTI', price: 89.68, change: -1.01, changePct: -1.11, timestamp: Date.now() },
      gold: { symbol: 'GOLD', name: 'Gold', price: 4321.59, change: -6.91, changePct: -0.16, timestamp: Date.now() },
      dxy: { symbol: 'DXY', name: 'DXY', price: 99.79, change: 0.14, changePct: 0.14, timestamp: Date.now() },
      ironOre: { symbol: 'FEF1!', name: 'Minério de Ferro', price: 97.90, change: -1.60, changePct: -1.61 },
    };

    const report = calculateMarketSentiment(new Date(2026, 8, 2, 10, 0), mockTradingViewMarket);

    // Pilar 2 (Commodities) deve estar em baixa
    const commodityPillar = report.pillars.find((p) => p.id === 'commodities');
    expect(commodityPillar).toBeDefined();
    expect(commodityPillar?.status).toBe('BAIXISTA');
    expect(commodityPillar?.summary).toContain('Minério de Ferro FEF1!');
    expect(commodityPillar?.summary).toContain('-1.61%');
    expect(commodityPillar?.summary).toContain('-0.87%');

    // Score total deve refletir cautela/pressão de commodities (< 50)
    expect(report.score).toBeLessThan(50);
    expect(report.zone).toBe('CAUTELA_MEDO');
    expect(report.marketQuotes).toHaveLength(8);
  });
});
