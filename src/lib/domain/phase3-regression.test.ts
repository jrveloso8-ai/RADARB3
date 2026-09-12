import { describe, it, expect } from 'vitest';
import { MACRO_CONFIG, getRiskFreeRate } from '../config/macro';
import { calculateBlackScholes } from './black-scholes';
import { calculateATR, calculateVolumeRatio, calculateHistoricalMACD } from './indicators';
import { generateStudyAudit } from './study-auditor';
import { QuoteDetails } from '../types/financial';

describe('Auditoria Radar B3 PRO IA — Testes de Regressão da Fase 3', () => {
  // 3.4: Unificação da Selic / Taxa Livre de Risco
  it('3.4: Taxa livre de risco deve estar centralizada em MACRO_CONFIG (10.75% a.a.)', () => {
    expect(MACRO_CONFIG.riskFreeRate).toBe(0.1075);
    expect(getRiskFreeRate()).toBe(0.1075);
    expect(MACRO_CONFIG.riskFreeRateLabel).toBe('SELIC 10.75%');

    // Black-Scholes deve adotar r = 0.1075 por padrão via MACRO_CONFIG
    const bsDefault = calculateBlackScholes(30, 30, 0.1, undefined, 0.3);
    const bsExplicit = calculateBlackScholes(30, 30, 0.1, 0.1075, 0.3);
    expect(bsDefault.theoreticalPrice).toBeCloseTo(bsExplicit.theoreticalPrice, 4);
  });

  // 3.2: Histograma e MACD Histórico dinâmico por candle
  it('3.2: calculateHistoricalMACD deve calcular série histórica dinâmica por candle e não repetir valor fixo', () => {
    const prices = Array.from({ length: 60 }, (_, i) => 20 + Math.sin(i / 5) * 5 + i * 0.1);
    const macdSeries = calculateHistoricalMACD(prices);

    expect(macdSeries).toHaveLength(60);
    // Antes de 34 candles (26 slow + 9 signal - 1) não há sinal completo
    expect(macdSeries[0].histogram).toBeNull();

    // Candles posteriores devem ter histogramas calculados que variam entre candles
    const validHists = macdSeries.slice(40).map((p) => p.histogram).filter((h): h is number => h !== null);
    expect(validHists.length).toBeGreaterThan(10);
    
    // Histograma não pode ser todo idêntico
    const uniqueHists = new Set(validHists);
    expect(uniqueHists.size).toBeGreaterThan(5);
  });

  // 3.3: ATR e Volume sem histórico devem retornar null (sem fallbacks 0.5 e 100)
  it('3.3: calculateATR e calculateVolumeRatio devem retornar null quando histórico insuficiente', () => {
    expect(calculateATR([])).toBeNull();
    expect(calculateATR([{ date: 1725148800, close: 30, open: 30, high: 31, low: 29, volume: 1000 }])).toBeNull();

    expect(calculateVolumeRatio([])).toBeNull();
    expect(calculateVolumeRatio([{ date: 1725148800, close: 30, open: 30, high: 31, low: 29, volume: 1000 }])).toBeNull();
  });

  // 3.3b: Study Auditor não deve aprovar volume ou ATR quando faltar dado
  it('3.3b: Auditoria não deve usar fallbacks mágicos para aprovar itens técnicos na ausência de dados', () => {
    const emptyQuote: QuoteDetails = {
      symbol: 'TEST3',
      shortName: 'Teste S.A.',
      currency: 'BRL',
      regularMarketPrice: 25.0,
      regularMarketChange: 0,
      regularMarketChangePercent: 0,
      regularMarketTime: '2026-09-12T10:00:00Z',
      regularMarketDayHigh: 25.5,
      regularMarketDayLow: 24.8,
      regularMarketVolume: 0,
      historicalDataPrice: [],
      // Sem indicadores técnicos (ind = undefined)
      indicators: undefined,
    };

    const audit = generateStudyAudit(emptyQuote);
    const volItem = audit.technicalAudit.items.find((i) => i.id === 'volume_liquidity');
    const asymItem = audit.technicalAudit.items.find((i) => i.id === 'support_resistance_asymmetry');

    expect(volItem?.status).not.toBe('APROVADO');
    expect(volItem?.metricValue).toContain('Volume N/D');

    expect(asymItem?.status).not.toBe('APROVADO');
    expect(asymItem?.metricValue).toContain('ATR diário = N/D');
  });

  // 3.7: Rótulo de registro de análise sem conotação regulatória de certificação formal
  it('3.7: auditSeal deve usar Registro de Análise sem alegação regulatória de certificação formal', () => {
    const mockQuote: QuoteDetails = {
      symbol: 'PETR4',
      shortName: 'Petrobras PN',
      currency: 'BRL',
      regularMarketPrice: 38.5,
      regularMarketChange: 0.5,
      regularMarketChangePercent: 1.3,
      regularMarketTime: '2026-09-12T10:00:00Z',
      regularMarketDayHigh: 39.0,
      regularMarketDayLow: 38.0,
      regularMarketVolume: 10000000,
      historicalDataPrice: [],
    };

    const audit = generateStudyAudit(mockQuote);
    expect(audit.auditSeal.label).toContain('REGISTRO DE ANÁLISE');
    expect(audit.auditSeal.label).not.toContain('100% CONFORME (3 CAMADAS CNPI)');
    expect(audit.auditSeal.certificateNumber).toMatch(/^REG-PETR4-\d{6}$/);
  });
});
