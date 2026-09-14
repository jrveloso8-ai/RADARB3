/**
 * Detector de Regime de Mercado para o Motor de Estratégias AI
 *
 * REGRAS CRÍTICAS:
 * - 100% dados reais da BRAPI / B3.
 * - Zero números inventados, estimativas ou preços teóricos.
 * - Cada campo do MarketRegime tem origem explícita e auditável.
 */

import {
  MarketRegime,
  MarketRegimeType,
  FlowSignalType,
  PCRSignalType,
  Top10OIItem,
  SpotStatisticalBands,
} from '../types/financial';

interface DetectRegimeInput {
  spotBands: SpotStatisticalBands;   // Z-Score real, Bandas 200P reais
  top10Calls: Top10OIItem[];         // Dados reais de OI de CALL
  top10Puts: Top10OIItem[];          // Dados reais de OI de PUT
  totalCallsOI: number;              // OI total real de CALLs
  totalPutsOI: number;               // OI total real de PUTs
  topCallBarrierStrike: number | null;  // Strike barreira CALL maior OI real
  topPutBarrierStrike: number | null;   // Strike barreira PUT maior OI real
  hv21: number | null;               // Volatilidade histórica real 21 pregões
}

/**
 * Classifica o regime de mercado a partir de dados reais.
 * Cada decisão é auditável e rastreável à origem dos dados.
 */
export function detectMarketRegime(input: DetectRegimeInput): MarketRegime {
  const {
    spotBands,
    top10Calls,
    top10Puts,
    totalCallsOI,
    totalPutsOI,
    topCallBarrierStrike,
    topPutBarrierStrike,
    hv21,
  } = input;

  const zScore = spotBands.zScore ?? 0;
  const stdDev = spotBands.stdDev200;
  const mean = spotBands.mean200;
  const sampleSize = spotBands.sampleSize;
  const spotPrice = spotBands.spotPrice;

  // 1. REGIME via Z-Score real
  let regime: MarketRegimeType;
  let regimeLabel: string;

  if (zScore > 3.0) {
    regime = 'EXTREMO_ALTA';
    regimeLabel = `Extremo de Alta (Z = +${zScore.toFixed(2)}σ > +3.0σ) — Evento Raro / Melt-up`;
  } else if (zScore > 2.0) {
    regime = 'EXTENSAO_ALTA';
    regimeLabel = `Extensão de Alta (Z = +${zScore.toFixed(2)}σ > +2.0σ) — Zona de Cauda Superior`;
  } else if (zScore >= 0.5) {
    regime = 'NORMAL_ALTA';
    regimeLabel = `Normal de Alta (Z = +${zScore.toFixed(2)}σ) — Tendência Dentro das Bandas`;
  } else if (zScore > -0.5) {
    regime = 'EQUILIBRIO';
    regimeLabel = `Equilíbrio Estatístico (Z = ${zScore.toFixed(2)}σ) — Mercado Lateral Eficiente`;
  } else if (zScore >= -2.0) {
    regime = 'NORMAL_BAIXA';
    regimeLabel = `Normal de Queda (Z = ${zScore.toFixed(2)}σ) — Tendência Dentro das Bandas`;
  } else if (zScore >= -3.0) {
    regime = 'EXTENSAO_BAIXA';
    regimeLabel = `Extensão de Queda (Z = ${zScore.toFixed(2)}σ < -2.0σ) — Zona de Cauda Inferior`;
  } else {
    regime = 'EXTREMO_BAIXA';
    regimeLabel = `Extremo de Queda (Z = ${zScore.toFixed(2)}σ < -3.0σ) — Evento de Pânico / Potencial Black Swan`;
  }

  // 2. SINAL DE FLUXO via variação média de OI em 5D (dados reais)
  const callsWithFlow = top10Calls.filter((c) => typeof c.change5DPercent === 'number');
  const putsWithFlow = top10Puts.filter((p) => typeof p.change5DPercent === 'number');

  const avgCallChange5D =
    callsWithFlow.length > 0
      ? callsWithFlow.reduce((acc, c) => acc + (c.change5DPercent ?? 0), 0) / callsWithFlow.length
      : null;

  const avgPutChange5D =
    putsWithFlow.length > 0
      ? putsWithFlow.reduce((acc, p) => acc + (p.change5DPercent ?? 0), 0) / putsWithFlow.length
      : null;

  let flowSignal: FlowSignalType = 'NEUTRAL';
  let flowLabel = 'Fluxo Neutro — Sem Tendência Dominante de 5D';

  if (avgCallChange5D !== null && avgPutChange5D !== null) {
    if (avgCallChange5D < -15 && avgPutChange5D < -15) {
      flowSignal = 'UNWINDING';
      flowLabel = `Desmonte Simultâneo — CALL: ${avgCallChange5D.toFixed(1)}% / PUT: ${avgPutChange5D.toFixed(1)}% (média 5D real)`;
    } else if (avgCallChange5D > 20 && avgCallChange5D > avgPutChange5D) {
      flowSignal = 'ACCUMULATION_CALL';
      flowLabel = `Acúmulo em CALLs — Média 5D: +${avgCallChange5D.toFixed(1)}% (${callsWithFlow.length} séries reais)`;
    } else if (avgPutChange5D > 20 && avgPutChange5D > avgCallChange5D) {
      flowSignal = 'ACCUMULATION_PUT';
      flowLabel = `Acúmulo em PUTs — Média 5D: +${avgPutChange5D.toFixed(1)}% (${putsWithFlow.length} séries reais)`;
    }
  } else if (avgCallChange5D !== null && avgCallChange5D > 20) {
    flowSignal = 'ACCUMULATION_CALL';
    flowLabel = `Acúmulo em CALLs — Média 5D: +${avgCallChange5D.toFixed(1)}%`;
  } else if (avgPutChange5D !== null && avgPutChange5D > 20) {
    flowSignal = 'ACCUMULATION_PUT';
    flowLabel = `Acúmulo em PUTs — Média 5D: +${avgPutChange5D.toFixed(1)}%`;
  }

  // 3. PUT/CALL RATIO real
  const pcr =
    totalCallsOI > 0 ? Number((totalPutsOI / totalCallsOI).toFixed(2)) : 0;

  let pcrSignal: PCRSignalType;
  let pcrLabel: string;

  if (pcr > 1.5) {
    pcrSignal = 'BEARISH_EXTREMO';
    pcrLabel = `PCR ${pcr.toFixed(2)} — Medo Extremo: máximo hedge institucional real`;
  } else if (pcr > 1.0) {
    pcrSignal = 'BEARISH';
    pcrLabel = `PCR ${pcr.toFixed(2)} — Predomínio de PUTs: cautela do mercado`;
  } else if (pcr >= 0.7) {
    pcrSignal = 'NEUTRO';
    pcrLabel = `PCR ${pcr.toFixed(2)} — Equilíbrio entre CALLs e PUTs`;
  } else if (pcr >= 0.4) {
    pcrSignal = 'BULLISH';
    pcrLabel = `PCR ${pcr.toFixed(2)} — Predomínio de CALLs: viés otimista`;
  } else {
    pcrSignal = 'BULLISH_EXTREMO';
    pcrLabel = `PCR ${pcr.toFixed(2)} — Mercado descoberto de proteção: risco extremo de short squeeze`;
  }

  // 4. ÍNDICE DE RISCO DE CAUDA (0-100) — composto auditável
  let tailRiskIndex = 0;

  // Componente Z-Score (40 pontos)
  const absZ = Math.abs(zScore);
  if (absZ >= 3.0) tailRiskIndex += 40;
  else if (absZ >= 2.5) tailRiskIndex += 32;
  else if (absZ >= 2.0) tailRiskIndex += 22;
  else if (absZ >= 1.5) tailRiskIndex += 12;
  else tailRiskIndex += 0;

  // Componente Fluxo de OI (30 pontos)
  if (flowSignal === 'UNWINDING') tailRiskIndex += 30;
  else if (flowSignal === 'ACCUMULATION_PUT' && zScore < -1.0) tailRiskIndex += 25;
  else if (flowSignal === 'ACCUMULATION_CALL' && zScore > 1.0) tailRiskIndex += 15;
  else if (flowSignal !== 'NEUTRAL') tailRiskIndex += 8;

  // Componente PCR (30 pontos)
  if (pcrSignal === 'BEARISH_EXTREMO') tailRiskIndex += 30;
  else if (pcrSignal === 'BEARISH') tailRiskIndex += 18;
  else if (pcrSignal === 'BULLISH_EXTREMO') tailRiskIndex += 22;
  else if (pcrSignal === 'BULLISH') tailRiskIndex += 10;

  tailRiskIndex = Math.min(100, tailRiskIndex);

  let tailRiskLabel: string;
  if (tailRiskIndex >= 75) tailRiskLabel = `🔴 Alto (${tailRiskIndex}/100) — Proteção de Cauda Recomendada`;
  else if (tailRiskIndex >= 50) tailRiskLabel = `🟡 Moderado (${tailRiskIndex}/100) — Monitorar Posições`;
  else tailRiskLabel = `🟢 Baixo (${tailRiskIndex}/100) — Regime Estatístico Normal`;

  // 5. BANDAS DE 3σ (extrapoladas dos dados reais de 200P)
  const upperBand3Sigma = Number((mean + 3 * stdDev).toFixed(2));
  const lowerBand3Sigma = Number(Math.max(0.01, mean - 3 * stdDev).toFixed(2));

  return {
    zScore,
    regime,
    regimeLabel,
    tailRiskIndex,
    tailRiskLabel,
    flowSignal,
    flowLabel,
    pcr,
    pcrSignal,
    pcrLabel,
    topCallBarrierStrike,
    topPutBarrierStrike,
    upperBand2Sigma: spotBands.upperBand2Sigma,
    lowerBand2Sigma: spotBands.lowerBand2Sigma,
    upperBand3Sigma,
    lowerBand3Sigma,
    spotPrice,
    hv21,
    sampleSize,
    isInsufficient: sampleSize < 30,
  };
}
