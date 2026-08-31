import { HistoricalPrice } from '../types/financial';

/**
 * Cálculo do Índice de Força Relativa (RSI / IFR de 14 períodos - Padrão J. Welles Wilder)
 */
export function calculateRSI(prices: number[], period = 14): number | null {
  if (!prices || prices.length < period + 1) return null;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) {
      gains += diff;
    } else {
      losses += Math.abs(diff);
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(diff)) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);
  return Number(rsi.toFixed(1));
}

/**
 * Cálculo das séries históricas de RSI para plotagem em sub-gráfico
 */
export function calculateHistoricalRSI(prices: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      result.push(null);
    } else {
      const slice = prices.slice(0, i + 1);
      result.push(calculateRSI(slice, period));
    }
  }
  return result;
}

/**
 * Cálculo do MACD (Moving Average Convergence Divergence - 12, 26, 9)
 */
export function calculateMACD(
  prices: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): {
  macdLine: number | null;
  signalLine: number | null;
  histogram: number | null;
} {
  if (!prices || prices.length < slowPeriod + signalPeriod) {
    return { macdLine: null, signalLine: null, histogram: null };
  }

  const calcEMA = (data: number[], p: number): number[] => {
    const k = 2 / (p + 1);
    const emaArray: number[] = [];
    let initialSMA = 0;
    for (let i = 0; i < p; i++) initialSMA += data[i];
    initialSMA /= p;
    emaArray[p - 1] = initialSMA;

    for (let i = p; i < data.length; i++) {
      emaArray[i] = data[i] * k + emaArray[i - 1] * (1 - k);
    }
    return emaArray;
  };

  const fastEMA = calcEMA(prices, fastPeriod);
  const slowEMA = calcEMA(prices, slowPeriod);

  const macdValues: number[] = [];
  for (let i = slowPeriod - 1; i < prices.length; i++) {
    macdValues.push(fastEMA[i] - slowEMA[i]);
  }

  if (macdValues.length < signalPeriod) {
    return { macdLine: null, signalLine: null, histogram: null };
  }

  const signalEMA = calcEMA(macdValues, signalPeriod);
  const currentMACD = macdValues[macdValues.length - 1];
  const currentSignal = signalEMA[signalEMA.length - 1];
  const histogram = currentMACD - currentSignal;

  return {
    macdLine: Number(currentMACD.toFixed(2)),
    signalLine: Number(currentSignal.toFixed(2)),
    histogram: Number(histogram.toFixed(2)),
  };
}

/**
 * Cálculo do Average True Range (ATR de 14 períodos para volatilidade diária)
 */
export function calculateATR(history: HistoricalPrice[], period = 14): number {
  if (!history || history.length < period + 1) return 0.5;

  const trValues: number[] = [];
  for (let i = 1; i < history.length; i++) {
    const current = history[i];
    const prev = history[i - 1];
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - prev.close),
      Math.abs(current.low - prev.close)
    );
    trValues.push(tr);
  }

  const recentTR = trValues.slice(trValues.length - period);
  const avg = recentTR.reduce((acc, v) => acc + v, 0) / period;
  return Number(avg.toFixed(2));
}

/**
 * Cálculo do Volume Relativo vs Média dos últimos 20 dias
 */
export function calculateVolumeRatio(history: HistoricalPrice[], period = 20): number {
  if (!history || history.length < period) return 100;
  const recentVolumes = history.slice(history.length - period).map((h) => h.volume || 0);
  const currentVolume = recentVolumes[recentVolumes.length - 1];
  const avgVolume = recentVolumes.reduce((acc, v) => acc + v, 0) / period;

  if (avgVolume === 0) return 100;
  return Number(((currentVolume / avgVolume) * 100).toFixed(0));
}

/**
 * Identifica Suportes e Resistências Dinâmicos e Estáticos
 */
export function calculateSupportResistance(
  history: HistoricalPrice[],
  currentPrice: number
): {
  supports: number[];
  resistances: number[];
} {
  const closes = history.map((h) => h.close);
  const lows = history.map((h) => h.low);
  const highs = history.map((h) => h.high);

  const min20 = Math.min(...lows.slice(Math.max(0, lows.length - 20)));
  const max20 = Math.max(...highs.slice(Math.max(0, highs.length - 20)));
  const min60 = Math.min(...lows.slice(Math.max(0, lows.length - 60)));
  const max60 = Math.max(...highs.slice(Math.max(0, highs.length - 60)));

  const sup1 = Number((currentPrice * 0.98).toFixed(2));
  const sup2 = Number(min20.toFixed(2));
  const sup3 = Number(min60.toFixed(2));

  const res1 = Number((currentPrice * 1.02).toFixed(2));
  const res2 = Number(max20.toFixed(2));
  const res3 = Number(max60.toFixed(2));

  return {
    supports: [sup1, Math.min(sup1, sup2), Math.min(sup2, sup3)],
    resistances: [res1, Math.max(res1, res2), Math.max(res2, res3)],
  };
}

export interface TechnicalChecklistItem {
  id: string;
  title: string;
  detail: string;
  passed: boolean;
}

export interface OperationalRiskReward {
  bias: 'LONG' | 'SHORT' | 'NEUTRO';
  conviction: 'ALTA' | 'MÉDIA' | 'BAIXA';
  stopLoss: number;
  target1: number;
  target2: number;
  riskRewardRatio: number;
  supports: number[];
  resistances: number[];
}

/**
 * Gera o Checklist Técnico Oficial (5 Itens CNPI-T / CT1)
 */
export function evaluateTechnicalChecklist(
  spot: number,
  mm20: number | null,
  mm50: number | null,
  mm200: number | null,
  rsi: number | null,
  macdHist: number | null,
  volRatio: number
): {
  items: TechnicalChecklistItem[];
  score: number; // 0 a 5
  statusLabel: string;
} {
  const isMaAligned = mm20 !== null && spot >= mm20;
  const isRsiHealthy = rsi !== null && rsi >= 40 && rsi <= 65;
  const isMacdPositive = macdHist !== null && macdHist >= 0;
  const isVolumeConfirming = volRatio >= 90;
  const isAssymetryFavorable = isMaAligned && isMacdPositive;

  const items: TechnicalChecklistItem[] = [
    {
      id: 'ma_alignment',
      title: 'Alinhamento de Médias Altista (Spot >= MA20)',
      detail: `Preço (R$ ${spot.toFixed(2)}) operando ${spot >= (mm20 || 0) ? 'acima' : 'abaixo'} da MA20 (R$ ${mm20 || '-'}) e buscando MA50 (R$ ${mm50 || '-'}).`,
      passed: isMaAligned,
    },
    {
      id: 'rsi_momentum',
      title: 'Momentum RSI(14) Saudável (40 - 65)',
      detail: `RSI(14) em ${rsi || 'N/D'} — ${isRsiHealthy ? 'zona de tração altista sem sobrecompra (>70)' : 'fora da zona ideal de momentum'}.`,
      passed: isRsiHealthy,
    },
    {
      id: 'macd_histogram',
      title: 'MACD Histograma Positivo / Cruzamento',
      detail: `Histograma ${macdHist !== null && macdHist >= 0 ? `positivo (+${macdHist})` : `negativo (${macdHist})`} confirmando pressão compradora.`,
      passed: isMacdPositive,
    },
    {
      id: 'volume_confirmation',
      title: 'Volume de Confirmação (>= 90% da média 20d)',
      detail: `Volume em ${volRatio}% da média de 20 pregões (liquidez e confirmação de fluxo).`,
      passed: isVolumeConfirming,
    },
    {
      id: 'assymetry_rr',
      title: 'Assimetria Suporte vs Resistência (R:R >= 1.4)',
      detail: 'Suporte técnico estrutural permitindo stop loss curto e alvos livres.',
      passed: isAssymetryFavorable,
    },
  ];

  const passedCount = items.filter((i) => i.passed).length;
  let statusLabel = 'NEUTRO (3/5)';
  if (passedCount >= 4) statusLabel = `BOM (COMPRA) (${passedCount}/5)`;
  else if (passedCount <= 2) statusLabel = `FRÁGIL / VENDA (${passedCount}/5)`;

  return {
    items,
    score: passedCount,
    statusLabel,
  };
}

/**
 * Calcula os parâmetros de Risco/Retorno operacionais (Stop Técnico, Alvo 1, Alvo 2, R:R)
 */
export function calculateRiskReward(
  spot: number,
  trend: 'ALTA' | 'BAIXA' | 'LATERAL',
  atr: number,
  supports: number[],
  resistances: number[]
): OperationalRiskReward {
  const atrBuffer = Math.max(atr, spot * 0.02);

  if (trend === 'ALTA') {
    const stopLoss = Number((Math.min(supports[0], spot - atrBuffer * 1.5)).toFixed(2));
    const risk = spot - stopLoss;
    const target1 = Number((spot + risk * 1.5).toFixed(2));
    const target2 = Number((spot + risk * 2.5).toFixed(2));
    const rRatio = Number((((target1 - spot) / risk) || 1.8).toFixed(1));

    return {
      bias: 'LONG',
      conviction: 'MÉDIA',
      stopLoss,
      target1,
      target2,
      riskRewardRatio: rRatio,
      supports,
      resistances,
    };
  } else if (trend === 'BAIXA') {
    const stopLoss = Number((Math.max(resistances[0], spot + atrBuffer * 1.5)).toFixed(2));
    const risk = stopLoss - spot;
    const target1 = Number((spot - risk * 1.5).toFixed(2));
    const target2 = Number((spot - risk * 2.5).toFixed(2));
    const rRatio = Number((((spot - target1) / risk) || 1.8).toFixed(1));

    return {
      bias: 'SHORT',
      conviction: 'MÉDIA',
      stopLoss,
      target1,
      target2,
      riskRewardRatio: rRatio,
      supports,
      resistances,
    };
  }

  const stopLoss = Number((spot * 0.96).toFixed(2));
  const target1 = Number((spot * 1.05).toFixed(2));
  const target2 = Number((spot * 1.10).toFixed(2));

  return {
    bias: 'NEUTRO',
    conviction: 'BAIXA',
    stopLoss,
    target1,
    target2,
    riskRewardRatio: 1.2,
    supports,
    resistances,
  };
}
