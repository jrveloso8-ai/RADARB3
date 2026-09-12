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
    expect(Array.isArray(report.hourlyHistory)).toBe(true);
    expect(report.schedule.cycleType).toBe('24H_HOURLY');
  });

  it('deve refletir com precisão cenário com Minério de Ferro e Petróleo em queda (TradingView Match)', () => {
    const mockTradingViewMarket: LiveMarketOverview = {
      spy: { symbol: 'SPY', name: 'SPY', price: 761.78, change: -5.27, changePct: -0.69, timestamp: Date.now(), source: 'fallback', isStale: true, provenance: 'ESTIMADO' },
      ewz: { symbol: 'EWZ', name: 'EWZ', price: 36.57, change: 0.54, changePct: 1.50, timestamp: Date.now(), source: 'fallback', isStale: true, provenance: 'ESTIMADO' },
      vix: { symbol: '^VIX', name: 'VIX', price: 16.43, change: 0.10, changePct: 0.61, timestamp: Date.now(), source: 'fallback', isStale: true, provenance: 'ESTIMADO' },
      brent: { symbol: 'UKOIL', name: 'Brent', price: 94.37, change: -0.83, changePct: -0.87, timestamp: Date.now(), source: 'fallback', isStale: true, provenance: 'ESTIMADO' },
      wti: { symbol: 'USOIL', name: 'WTI', price: 89.68, change: -1.01, changePct: -1.11, timestamp: Date.now(), source: 'fallback', isStale: true, provenance: 'ESTIMADO' },
      gold: { symbol: 'GOLD', name: 'Gold', price: 4321.59, change: -6.91, changePct: -0.16, timestamp: Date.now(), source: 'fallback', isStale: true, provenance: 'ESTIMADO' },
      dxy: { symbol: 'DXY', name: 'DXY', price: 99.79, change: 0.14, changePct: 0.14, timestamp: Date.now(), source: 'fallback', isStale: true, provenance: 'ESTIMADO' },
      ironOre: { symbol: 'FEF1!', name: 'Minério de Ferro', price: 97.90, change: -1.60, changePct: -1.61 },
    };

    const report = calculateMarketSentiment(new Date(2026, 8, 2, 10, 0), mockTradingViewMarket);
    // Score total deve refletir cautela/pressão de commodities (< 50)
    expect(report.score).toBeLessThan(50);
    expect(report.zone).toBe('CAUTELA_MEDO');
    expect(report.marketQuotes).toHaveLength(8);
  });

  // =========================================================================
  // TESTES DE REGRESSÃO EXIGIDOS - FASE 2 (AUDITORIA RADAR B3 PRO IA)
  // =========================================================================

  it('Regressão 2.1: TradingViewOverview não contém sectorData estático com números fictícios', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const overviewFile = path.join(process.cwd(), 'src/components/tradingview/TradingViewOverview.tsx');
    const content = fs.readFileSync(overviewFile, 'utf-8');

    // Não pode conter sectorData estático
    expect(content).not.toContain('const sectorData = [');
    expect(content).not.toContain('IFNC');
  });

  it('Regressão 2.2: hourlyHistory não usa Math.sin para fabricar curva senoidal', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const sentimentFile = path.join(process.cwd(), 'src/lib/domain/sentiment.ts');
    const content = fs.readFileSync(sentimentFile, 'utf-8');

    // Código fonte de sentiment.ts não pode invocar Math.sin
    expect(content).not.toContain('Math.sin');
  });

  it('Regressão 2.3: Pilares 4 e 5 são rotulados explicitamente como Proxy EWZ e não afirmam medir DI/Fluxo B3', () => {
    const report = calculateMarketSentiment(new Date());
    const pilar4 = report.pillars.find((p) => p.id === 'risk_ewz');
    const pilar5 = report.pillars.find((p) => p.id === 'flow_ewz_spy');

    expect(pilar4).toBeDefined();
    expect(pilar4!.name).toContain('Proxy de Risco-Brasil via ETF EWZ');
    expect(pilar4!.name).not.toContain('Curva de Juros');

    expect(pilar5).toBeDefined();
    expect(pilar5!.name).toContain('Co-Movimento EWZ vs S&P 500');
    expect(pilar5!.name).not.toContain('Fluxo Institucional & Estrangeiro na B3');
  });

  it('Regressão 2.4 & 2.5: fetchLiveMarketQuote propaga source fallback e isStale true em caso de falha', async () => {
    const { fetchLiveMarketQuote } = await import('../services/market-quotes');
    // Força símbolo inexistente com fetch mockado ou rota offline
    const fallbackQuote = await fetchLiveMarketQuote('INVALID_TEST_SYMBOL_XYZ', 'Símbolo Inválido Teste');

    expect(fallbackQuote.source).toBe('fallback');
    expect(fallbackQuote.isStale).toBe(true);
    expect(fallbackQuote.provenance).toBe('ESTIMADO');
  });
});
