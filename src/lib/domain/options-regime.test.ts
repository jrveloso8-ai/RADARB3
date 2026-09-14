import { describe, it, expect } from 'vitest';
import { detectMarketRegime } from './options-regime';
import { SpotStatisticalBands, Top10OIItem } from '../types/financial';

// Helper para criar Top10OIItem mÃ­nimo
function makeOIItem(
  type: 'CALL' | 'PUT',
  strike: number,
  change5D: number | null = null,
  currentOI = 1000
): Top10OIItem {
  return {
    strike,
    type,
    symbol: `TEST${type[0]}${strike}`,
    currentOI,
    prev1DOI: 900,
    prev5DOI: change5D !== null ? Math.round(currentOI / (1 + change5D / 100)) : null,
    change1DPercent: 5,
    change1DContracts: 50,
    change5DPercent: change5D,
    change5DContracts: change5D !== null ? Math.round(currentOI * (change5D / 100)) : null,
    distanceFromSpotPercent: 2.5,
    flowSignal: change5D !== null && change5D > 20 ? 'ACCUMULATION' : 'STABLE',
  };
}

// Helper para criar SpotStatisticalBands mÃ­nimo
function makeBands(
  spot: number,
  zScore: number,
  mean = spot,
  stdDev = spot * 0.05,
  sampleSize = 200
): SpotStatisticalBands {
  return {
    spotPrice: spot,
    mean200: mean,
    stdDev200: stdDev,
    lowerBand2Sigma: Number((mean - 2 * stdDev).toFixed(2)),
    upperBand2Sigma: Number((mean + 2 * stdDev).toFixed(2)),
    sampleSize,
    zScore,
  };
}

describe('detectMarketRegime', () => {
  const baseInput = {
    top10Calls: [makeOIItem('CALL', 30, 5)],
    top10Puts: [makeOIItem('PUT', 28, 5)],
    totalCallsOI: 10000,
    totalPutsOI: 10000,
    topCallBarrierStrike: 30,
    topPutBarrierStrike: 28,
    hv21: 28.5,
  };

  it('detecta EQUILIBRIO quando Z entre -0.5 e +0.5', () => {
    const regime = detectMarketRegime({
      ...baseInput,
      spotBands: makeBands(30, 0.1),
    });
    expect(regime.regime).toBe('EQUILIBRIO');
    expect(regime.zScore).toBeCloseTo(0.1, 1);
  });

  it('detecta EXTENSAO_ALTA quando Z > +2.0', () => {
    const regime = detectMarketRegime({
      ...baseInput,
      spotBands: makeBands(30, 2.3),
    });
    expect(regime.regime).toBe('EXTENSAO_ALTA');
  });

  it('detecta EXTENSAO_BAIXA quando Z < -2.0', () => {
    const regime = detectMarketRegime({
      ...baseInput,
      spotBands: makeBands(30, -2.4),
    });
    expect(regime.regime).toBe('EXTENSAO_BAIXA');
  });

  it('detecta EXTREMO_ALTA quando Z > +3.0', () => {
    const regime = detectMarketRegime({
      ...baseInput,
      spotBands: makeBands(30, 3.2),
    });
    expect(regime.regime).toBe('EXTREMO_ALTA');
  });

  it('detecta EXTREMO_BAIXA quando Z < -3.0', () => {
    const regime = detectMarketRegime({
      ...baseInput,
      spotBands: makeBands(30, -3.1),
    });
    expect(regime.regime).toBe('EXTREMO_BAIXA');
  });

  it('calcula PCR corretamente: totalPutsOI / totalCallsOI', () => {
    const regime = detectMarketRegime({
      ...baseInput,
      totalCallsOI: 10000,
      totalPutsOI: 16000,  // 1.6 → BEARISH_EXTREMO (> 1.5)
      spotBands: makeBands(30, 0),
    });
    expect(regime.pcr).toBeCloseTo(1.6, 1);
    expect(regime.pcrSignal).toBe('BEARISH_EXTREMO');
  });

  it('PCR BULLISH_EXTREMO quando PCR < 0.4', () => {
    const regime = detectMarketRegime({
      ...baseInput,
      totalCallsOI: 20000,
      totalPutsOI: 5000,
      spotBands: makeBands(30, 0),
    });
    expect(regime.pcr).toBeCloseTo(0.25, 1);
    expect(regime.pcrSignal).toBe('BULLISH_EXTREMO');
  });

  it('detecta ACCUMULATION_PUT quando avg OI de PUT sobe > 20% em 5D', () => {
    const puts = [
      makeOIItem('PUT', 28, 30, 1300),
      makeOIItem('PUT', 27, 25, 1250),
    ];
    const calls = [makeOIItem('CALL', 30, 3)];
    const regime = detectMarketRegime({
      ...baseInput,
      top10Calls: calls,
      top10Puts: puts,
      spotBands: makeBands(30, -0.5),
    });
    expect(regime.flowSignal).toBe('ACCUMULATION_PUT');
  });

  it('detecta ACCUMULATION_CALL quando avg OI de CALL sobe > 20% em 5D', () => {
    const calls = [
      makeOIItem('CALL', 30, 35, 1350),
      makeOIItem('CALL', 31, 22, 1220),
    ];
    const puts = [makeOIItem('PUT', 28, 3)];
    const regime = detectMarketRegime({
      ...baseInput,
      top10Calls: calls,
      top10Puts: puts,
      spotBands: makeBands(30, 0.5),
    });
    expect(regime.flowSignal).toBe('ACCUMULATION_CALL');
  });

  it('tailRiskIndex aumenta com Z extremo + PCR extremo', () => {
    const highRisk = detectMarketRegime({
      ...baseInput,
      totalCallsOI: 20000,
      totalPutsOI: 5000,
      spotBands: makeBands(30, 3.5), // EXTREMO
    });
    const lowRisk = detectMarketRegime({
      ...baseInput,
      totalCallsOI: 10000,
      totalPutsOI: 10000,
      spotBands: makeBands(30, 0.1), // EQUILIBRIO
    });
    expect(highRisk.tailRiskIndex).toBeGreaterThan(lowRisk.tailRiskIndex);
  });

  it('isInsufficient = true quando sampleSize < 30', () => {
    const regime = detectMarketRegime({
      ...baseInput,
      spotBands: makeBands(30, 0, 30, 1.5, 15),
    });
    expect(regime.isInsufficient).toBe(true);
  });

  it('isInsufficient = false quando sampleSize >= 30', () => {
    const regime = detectMarketRegime({
      ...baseInput,
      spotBands: makeBands(30, 0, 30, 1.5, 200),
    });
    expect(regime.isInsufficient).toBe(false);
  });

  it('bandas de 3Ïƒ sÃ£o extrapoladas dos dados reais (mean Â± 3*stdDev)', () => {
    const mean = 30;
    const stdDev = 1.5;
    const regime = detectMarketRegime({
      ...baseInput,
      spotBands: makeBands(30, 0, mean, stdDev, 200),
    });
    expect(regime.upperBand3Sigma).toBeCloseTo(mean + 3 * stdDev, 1);
    expect(regime.lowerBand3Sigma).toBeCloseTo(mean - 3 * stdDev, 1);
  });

  it('PCR NEUTRO quando totalCallsOI = 0 resulta em pcr=0', () => {
    const regime = detectMarketRegime({
      ...baseInput,
      totalCallsOI: 0,
      totalPutsOI: 5000,
      spotBands: makeBands(30, 0),
    });
    expect(regime.pcr).toBe(0);
  });
});

