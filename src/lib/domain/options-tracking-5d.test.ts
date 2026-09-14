import { describe, it, expect } from 'vitest';
import { calculateSpotStatisticalBands, buildOITracking } from './options-tracking-5d';
import { OptionPositionItem, HistoricalPrice, B3ExpirationInfo } from '../types/financial';

describe('Motor Quantitativo: options-tracking-5d', () => {
  describe('calculateSpotStatisticalBands', () => {
    it('calcula corretamente a média, desvio padrão e bandas +-2σ para 200 períodos', () => {
      // Cria 200 números de 10 a 29.9
      const closes: number[] = [];
      for (let i = 0; i < 200; i++) {
        closes.push(30.0 + (i % 10) * 0.5); // valores entre 30.0 e 34.5
      }

      const spot = 32.5;
      const bands = calculateSpotStatisticalBands(closes, spot);

      expect(bands.sampleSize).toBe(200);
      expect(bands.spotPrice).toBe(32.5);
      expect(bands.mean200).toBeGreaterThan(30.0);
      expect(bands.mean200).toBeLessThan(35.0);
      expect(bands.stdDev200).toBeGreaterThan(0);
      expect(bands.lowerBand2Sigma).toBeLessThan(bands.mean200);
      expect(bands.upperBand2Sigma).toBeGreaterThan(bands.mean200);
      expect(bands.lowerBand2Sigma).toBe(Number((bands.mean200 - 2 * bands.stdDev200).toFixed(2)));
      expect(bands.upperBand2Sigma).toBe(Number((bands.mean200 + 2 * bands.stdDev200).toFixed(2)));
    });

    it('trata graciosamente histórico vazio ou insuficiente (< 2 períodos)', () => {
      const bands = calculateSpotStatisticalBands([], 40.0);
      expect(bands.sampleSize).toBe(0);
      expect(bands.mean200).toBe(40.0);
      expect(bands.stdDev200).toBe(0);
      expect(bands.lowerBand2Sigma).toBe(40.0);
      expect(bands.upperBand2Sigma).toBe(40.0);
      expect(bands.zScore).toBe(0);
    });
  });

  describe('buildOITracking', () => {
    const mockExpirations: B3ExpirationInfo[] = [
      {
        date: '2026-09-18',
        monthName: 'Setembro',
        callLetter: 'I',
        putLetter: 'U',
        dte: 10,
        label: 'Série Setembro',
        badge: 'Mais Líquida',
      },
    ];

    const mockCloses: number[] = Array.from({ length: 200 }, (_, i) => 35 + Math.sin(i / 10) * 3);
    const mockCandles: HistoricalPrice[] = mockCloses.map((c, idx) => ({
      date: 1780000000 + idx * 86400,
      open: c - 0.2,
      high: c + 0.5,
      low: c - 0.5,
      close: c,
      volume: 1000000,
    }));

    const currentPositions: OptionPositionItem[] = [
      // CALLs
      { symbol: 'PETRI40', underlyingSymbol: 'PETR4', side: 'CALL', strike: 40.0, expirationDate: '2026-09-18', openInterest: 20000 },
      { symbol: 'PETRI42', underlyingSymbol: 'PETR4', side: 'CALL', strike: 42.0, expirationDate: '2026-09-18', openInterest: 50000 }, // maior geral
      { symbol: 'PETRI36', underlyingSymbol: 'PETR4', side: 'CALL', strike: 36.0, expirationDate: '2026-09-18', openInterest: 30000 }, // no range
      // PUTs
      { symbol: 'PETRU32', underlyingSymbol: 'PETR4', side: 'PUT', strike: 32.0, expirationDate: '2026-09-18', openInterest: 60000 }, // maior geral
      { symbol: 'PETRU34', underlyingSymbol: 'PETR4', side: 'PUT', strike: 34.0, expirationDate: '2026-09-18', openInterest: 25000 }, // no range
    ];

    const prev1DPositions: OptionPositionItem[] = [
      { symbol: 'PETRI40', underlyingSymbol: 'PETR4', side: 'CALL', strike: 40.0, expirationDate: '2026-09-18', openInterest: 19000 },
      { symbol: 'PETRI42', underlyingSymbol: 'PETR4', side: 'CALL', strike: 42.0, expirationDate: '2026-09-18', openInterest: 48000 },
      { symbol: 'PETRI36', underlyingSymbol: 'PETR4', side: 'CALL', strike: 36.0, expirationDate: '2026-09-18', openInterest: 31000 },
      { symbol: 'PETRU32', underlyingSymbol: 'PETR4', side: 'PUT', strike: 32.0, expirationDate: '2026-09-18', openInterest: 65000 },
      { symbol: 'PETRU34', underlyingSymbol: 'PETR4', side: 'PUT', strike: 34.0, expirationDate: '2026-09-18', openInterest: 26000 },
    ];

    const prev5DPositions: OptionPositionItem[] = [
      { symbol: 'PETRI40', underlyingSymbol: 'PETR4', side: 'CALL', strike: 40.0, expirationDate: '2026-09-18', openInterest: 15000 }, // +33.3%
      { symbol: 'PETRI42', underlyingSymbol: 'PETR4', side: 'CALL', strike: 42.0, expirationDate: '2026-09-18', openInterest: 40000 }, // +25.0%
      { symbol: 'PETRI36', underlyingSymbol: 'PETR4', side: 'CALL', strike: 36.0, expirationDate: '2026-09-18', openInterest: 35000 }, // -14.3% (desmonte)
      { symbol: 'PETRU32', underlyingSymbol: 'PETR4', side: 'PUT', strike: 32.0, expirationDate: '2026-09-18', openInterest: 70000 }, // -14.3%
      { symbol: 'PETRU34', underlyingSymbol: 'PETR4', side: 'PUT', strike: 34.0, expirationDate: '2026-09-18', openInterest: 20000 }, // +25.0%
    ];

    it('cruza e calcula corretamente variações 1D e 5D de Open Interest', () => {
      const result = buildOITracking({
        symbol: 'PETR4',
        selectedExpiration: '2026-09-18',
        availableExpirations: mockExpirations,
        currentSpot: 35.5,
        historicalCloses: mockCloses,
        historicalCandles: mockCandles,
        currentPositions,
        prev1DPositions,
        prev5DPositions,
      });

      expect(result.symbol).toBe('PETR4');
      expect(result.selectedExpiration).toBe('2026-09-18');
      expect(result.spotBands.sampleSize).toBe(200);

      // Verificar maior CALL geral
      expect(result.topCallOverall?.strike).toBe(42.0);
      expect(result.topCallOverall?.currentOI).toBe(50000);
      expect(result.topCallOverall?.change5DPercent).toBe(25.0);

      // Verificar maior PUT geral
      expect(result.topPutOverall?.strike).toBe(32.0);
      expect(result.topPutOverall?.currentOI).toBe(60000);

      // Verificar Top 3 de variações 5D de CALL
      expect(result.top3CallGains5D.length).toBeGreaterThan(0);
      expect(result.top3CallGains5D[0].change5DPercent).toBeGreaterThan(0);
      expect(result.top3CallLosses5D.length).toBeGreaterThan(0);

      // Verificar Top 3 de variações 5D de PUT
      expect(result.top3PutGains5D.length).toBeGreaterThan(0);
      expect(result.top3PutLosses5D.length).toBeGreaterThan(0);

      // Verificar Top 3 globais
      expect(result.top3Gains5D.length).toBeLessThanOrEqual(3);
      expect(result.top3Losses5D.length).toBeLessThanOrEqual(3);
      expect(result.top3Gains5D[0].change5DPercent).toBeGreaterThanOrEqual(result.top3Losses5D[0].change5DPercent ?? 0);

      // Verificar se a tabela está ordenada da menor para a maior variação 5D
      expect(result.strikesTable.length).toBe(5);
      for (let i = 0; i < result.strikesTable.length - 1; i++) {
        const a = result.strikesTable[i].change5DPercent ?? 0;
        const b = result.strikesTable[i + 1].change5DPercent ?? 0;
        expect(a).toBeLessThanOrEqual(b);
      }

      // Verificar velas do gráfico
      expect(result.candles.length).toBeGreaterThan(0);
      expect(result.candles[0]).toHaveProperty('open');
      expect(result.candles[0]).toHaveProperty('close');
      expect(result.candles[0]).toHaveProperty('dateFormatted');
    });

    it('identifica corretamente barreiras contidas no range 2σ', () => {
      const result = buildOITracking({
        symbol: 'PETR4',
        selectedExpiration: '2026-09-18',
        availableExpirations: mockExpirations,
        currentSpot: 35.5,
        historicalCloses: mockCloses,
        historicalCandles: mockCandles,
        currentPositions,
        prev1DPositions,
        prev5DPositions,
      });

      const { lowerBand2Sigma, upperBand2Sigma } = result.spotBands;

      if (result.topCallWithin2Sigma) {
        expect(result.topCallWithin2Sigma.strike).toBeGreaterThanOrEqual(lowerBand2Sigma);
        expect(result.topCallWithin2Sigma.strike).toBeLessThanOrEqual(upperBand2Sigma);
      }

      if (result.topPutWithin2Sigma) {
        expect(result.topPutWithin2Sigma.strike).toBeGreaterThanOrEqual(lowerBand2Sigma);
        expect(result.topPutWithin2Sigma.strike).toBeLessThanOrEqual(upperBand2Sigma);
      }
    });

    it('descarta séries semanais com sufixo W e datas fora da grade mensal oficial', () => {
      const positionsWithWeekly: OptionPositionItem[] = [
        ...currentPositions,
        {
          symbol: 'PETRW1',
          underlyingSymbol: 'PETR4',
          side: 'CALL',
          strike: 45.0,
          expirationDate: '2026-09-11', // semanal (fora da 3ª sexta-feira)
          openInterest: 999999, // gigante, mas deve ser ignorado!
        },
      ];

      const result = buildOITracking({
        symbol: 'PETR4',
        selectedExpiration: '2026-09-18',
        availableExpirations: mockExpirations,
        currentSpot: 35.5,
        historicalCloses: mockCloses,
        historicalCandles: mockCandles,
        currentPositions: positionsWithWeekly,
        prev1DPositions,
        prev5DPositions,
      });

      // A maior CALL geral NÃO deve ser a PETRW1 (que foi expurgada)
      expect(result.topCallOverall?.symbol).not.toBe('PETRW1');
      expect(result.topCallOverall?.strike).toBe(42.0);
      expect(result.strikesTable.some((r) => r.symbol === 'PETRW1')).toBe(false);
    });

    it('ativa isRolloverPeriod quando DTE <= 5 dias úteis', () => {
      const expirationsShortDte: B3ExpirationInfo[] = [
        {
          date: '2026-09-18',
          monthName: 'Setembro',
          callLetter: 'I',
          putLetter: 'U',
          dte: 3, // Período de rolagem ativo!
          label: 'Série Setembro',
          badge: 'Mensal',
        },
      ];

      const result = buildOITracking({
        symbol: 'PETR4',
        selectedExpiration: '2026-09-18',
        availableExpirations: expirationsShortDte,
        currentSpot: 35.5,
        historicalCloses: mockCloses,
        historicalCandles: mockCandles,
        currentPositions,
      });

      expect(result.selectedDte).toBe(3);
      expect(result.isRolloverPeriod).toBe(true);
    });
  });
});

