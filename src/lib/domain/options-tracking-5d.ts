/**
 * Motor Quantitativo de Rastreamento de Variação de Open Interest (1D e 5D)
 * e Filtro de Relevância por Bandas Estatísticas de 200 Períodos (CNPI / B3)
 *
 * REGRAS CRÍTICAS:
 * - 100% dados reais da BRAPI / B3.
 * - Zero números inventados, simulados ou preços teóricos.
 * - Se histórico D-1 ou D-5 não existir na base, marca como null (N/D) e status honesto.
 */

import {
  B3ExpirationInfo,
  HistoricalPrice,
  OptionPositionItem,
  SpotStatisticalBands,
  BarrierTrackingItem,
  BarrierSummaryCard,
  OITrackingCandle,
  OITrackingResult,
} from '../types/financial';

/**
 * Calcula a Média, Desvio Padrão Amostral e as Bandas de +-2 Sigma
 * a partir dos últimos 200 períodos de fechamento do ativo spot.
 */
export function calculateSpotStatisticalBands(
  closes: number[],
  currentSpot: number
): SpotStatisticalBands {
  const validCloses = closes.filter((c) => typeof c === 'number' && !isNaN(c) && c > 0);

  // Usar no máximo os últimos 200 períodos
  const periodWindow = validCloses.slice(-200);
  const n = periodWindow.length;

  if (n < 2) {
    return {
      spotPrice: currentSpot,
      mean200: currentSpot,
      stdDev200: 0,
      lowerBand2Sigma: currentSpot,
      upperBand2Sigma: currentSpot,
      sampleSize: n,
      zScore: 0,
    };
  }

  // 1. Média Aritmética
  const sum = periodWindow.reduce((acc, val) => acc + val, 0);
  const mean200 = sum / n;

  // 2. Variância e Desvio Padrão Amostral (divisão por N - 1)
  const sumSquaredDiff = periodWindow.reduce((acc, val) => acc + Math.pow(val - mean200, 2), 0);
  const variance = sumSquaredDiff / (n - 1);
  const stdDev200 = Math.sqrt(variance);

  // 3. Bandas de 2 Desvios Padrões
  const lowerBand2Sigma = Math.max(0.01, mean200 - 2 * stdDev200);
  const upperBand2Sigma = mean200 + 2 * stdDev200;

  // 4. Z-Score do Spot
  const zScore = stdDev200 > 0 ? (currentSpot - mean200) / stdDev200 : 0;

  return {
    spotPrice: currentSpot,
    mean200: Number(mean200.toFixed(2)),
    stdDev200: Number(stdDev200.toFixed(2)),
    lowerBand2Sigma: Number(lowerBand2Sigma.toFixed(2)),
    upperBand2Sigma: Number(upperBand2Sigma.toFixed(2)),
    sampleSize: n,
    zScore: Number(zScore.toFixed(2)),
  };
}

/**
 * Valida se um ticker ou data de opção pertence estritamente a uma série MENSAL da B3.
 * Descarta automaticamente opções semanais (W1, W2, W4) e datas fora da 3ª sexta-feira.
 */
export function isMonthlyB3Option(
  symbol: string,
  expirationDate?: string,
  validMonthlyDates?: Set<string>
): boolean {
  if (!symbol) return false;
  const s = symbol.trim().toUpperCase();

  // Descartar séries semanais com sufixo W da B3 (ex: PETRW1, VALEW4, etc.)
  if (/W[1-5]/i.test(s)) {
    return false;
  }

  // Se houver validação de datas mensais (3ªs sextas-feiras), exigir correspondência estrita
  if (expirationDate && validMonthlyDates && validMonthlyDates.size > 0) {
    if (!validMonthlyDates.has(expirationDate)) {
      return false;
    }
  }

  return true;
}

export interface BuildOITrackingParams {
  symbol: string;
  selectedExpiration: string;
  availableExpirations: B3ExpirationInfo[];
  currentSpot: number;
  historicalCloses: number[];
  historicalCandles: HistoricalPrice[];
  currentPositions: OptionPositionItem[];
  prev1DPositions?: OptionPositionItem[];
  prev5DPositions?: OptionPositionItem[];
}

/**
 * Constrói o diagnóstico completo de variação de 1D e 5D de Open Interest
 * com identificação das maiores barreiras gerais e filtradas no range de +-2σ.
 */
export function buildOITracking({
  symbol,
  selectedExpiration,
  availableExpirations,
  currentSpot,
  historicalCloses,
  historicalCandles,
  currentPositions,
  prev1DPositions = [],
  prev5DPositions = [],
}: BuildOITrackingParams): OITrackingResult {
  // 1. Calcular Bandas Estatísticas de 200 Períodos
  const spotBands = calculateSpotStatisticalBands(historicalCloses, currentSpot);

  // 2. Trava estrita de Vencimentos Mensais B3 (descarta qualquer resíduo semanal)
  const validMonthlyDates = new Set(availableExpirations.map((e) => e.date));
  const filteredCurrent = currentPositions.filter((p) =>
    isMonthlyB3Option(p.symbol, p.expirationDate, validMonthlyDates)
  );
  const filtered1D = prev1DPositions.filter((p) =>
    isMonthlyB3Option(p.symbol, p.expirationDate, validMonthlyDates)
  );
  const filtered5D = prev5DPositions.filter((p) =>
    isMonthlyB3Option(p.symbol, p.expirationDate, validMonthlyDates)
  );

  // Calcular DTE da série selecionada e indicador de Período de Rolagem
  const selectedInfo = availableExpirations.find((e) => e.date === selectedExpiration);
  const selectedDte = selectedInfo?.dte ?? 0;
  const isRolloverPeriod = selectedDte <= 5;

  // 3. Mapear posições históricas por chave normalizada: `${SIDE}_${STRIKE}`
  const getKey = (side: string, strike: number) => {
    const s = side.toUpperCase().includes('CALL') ? 'CALL' : 'PUT';
    return `${s}_${strike.toFixed(2)}`;
  };

  const map1D = new Map<string, number>();
  for (const pos of filtered1D) {
    if (pos.strike > 0 && typeof pos.openInterest === 'number') {
      const k = getKey(pos.side, pos.strike);
      map1D.set(k, (map1D.get(k) || 0) + pos.openInterest);
    }
  }

  const map5D = new Map<string, number>();
  for (const pos of filtered5D) {
    if (pos.strike > 0 && typeof pos.openInterest === 'number') {
      const k = getKey(pos.side, pos.strike);
      map5D.set(k, (map5D.get(k) || 0) + pos.openInterest);
    }
  }

  // 4. Agrupar posições atuais por Strike e Tipo
  interface AggregatedCurrent {
    strike: number;
    type: 'CALL' | 'PUT';
    symbol: string;
    currentOI: number;
  }
  const currentMap = new Map<string, AggregatedCurrent>();

  for (const pos of filteredCurrent) {
    if (!pos.strike || pos.strike <= 0) continue;
    const type: 'CALL' | 'PUT' = pos.side.toUpperCase().includes('CALL') ? 'CALL' : 'PUT';
    const k = getKey(type, pos.strike);
    const oi = typeof pos.openInterest === 'number' ? pos.openInterest : 0;

    const existing = currentMap.get(k);
    if (existing) {
      existing.currentOI += oi;
      if (!existing.symbol && pos.symbol) existing.symbol = pos.symbol;
    } else {
      currentMap.set(k, {
        strike: pos.strike,
        type,
        symbol: pos.symbol || `${symbol}_${pos.strike}`,
        currentOI: oi,
      });
    }
  }

  // 4. Montar lista completa de itens para a tabela
  const strikesTable: BarrierTrackingItem[] = [];

  currentMap.forEach((item, key) => {
    const prev1D = map1D.get(key);
    const prev5D = map5D.get(key);

    const prev1DOI = typeof prev1D === 'number' ? prev1D : null;
    const prev5DOI = typeof prev5D === 'number' ? prev5D : null;

    let change1DPercent: number | null = null;
    if (prev1DOI !== null && prev1DOI > 0) {
      change1DPercent = Number((((item.currentOI - prev1DOI) / prev1DOI) * 100).toFixed(2));
    }

    let change5DPercent: number | null = null;
    if (prev5DOI !== null && prev5DOI > 0) {
      change5DPercent = Number((((item.currentOI - prev5DOI) / prev5DOI) * 100).toFixed(2));
    }

    const isWithin2Sigma =
      item.strike >= spotBands.lowerBand2Sigma && item.strike <= spotBands.upperBand2Sigma;

    const distanceFromSpotPercent =
      currentSpot > 0 ? Number((((item.strike - currentSpot) / currentSpot) * 100).toFixed(2)) : 0;

    let flowSignal: 'ACCUMULATION' | 'UNWINDING' | 'STABLE' | 'NO_HISTORY' = 'NO_HISTORY';
    if (change5DPercent !== null) {
      if (change5DPercent >= 10) flowSignal = 'ACCUMULATION';
      else if (change5DPercent <= -10) flowSignal = 'UNWINDING';
      else flowSignal = 'STABLE';
    } else if (change1DPercent !== null) {
      if (change1DPercent >= 5) flowSignal = 'ACCUMULATION';
      else if (change1DPercent <= -5) flowSignal = 'UNWINDING';
      else flowSignal = 'STABLE';
    }

    strikesTable.push({
      strike: item.strike,
      type: item.type,
      symbol: item.symbol,
      currentOI: item.currentOI,
      prev1DOI,
      prev5DOI,
      change1DPercent,
      change5DPercent,
      isWithin2Sigma,
      distanceFromSpotPercent,
      flowSignal,
    });
  });

  // Ordenação padrão da tabela: da menor variação 5D para a maior variação 5D (conforme solicitado pelo usuário)
  strikesTable.sort((a, b) => {
    const valA = a.change5DPercent ?? a.change1DPercent ?? 0;
    const valB = b.change5DPercent ?? b.change1DPercent ?? 0;
    return valA - valB;
  });

  // 5. Determinar os 4 Destaques (Top Barreiras)
  const toSummaryCard = (item: BarrierTrackingItem | null): BarrierSummaryCard | null => {
    if (!item) return null;
    return {
      strike: item.strike,
      symbol: item.symbol,
      currentOI: item.currentOI,
      prev1DOI: item.prev1DOI,
      prev5DOI: item.prev5DOI,
      change1DPercent: item.change1DPercent,
      change5DPercent: item.change5DPercent,
      distanceFromSpotPercent: item.distanceFromSpotPercent,
      flowSignal: item.flowSignal,
    };
  };

  const calls = strikesTable.filter((i) => i.type === 'CALL');
  const puts = strikesTable.filter((i) => i.type === 'PUT');

  const topCallOverallItem = calls.reduce<BarrierTrackingItem | null>((max, cur) => {
    if (!max || cur.currentOI > max.currentOI) return cur;
    return max;
  }, null);

  const topCallWithin2SigmaItem = calls
    .filter((i) => i.isWithin2Sigma)
    .reduce<BarrierTrackingItem | null>((max, cur) => {
      if (!max || cur.currentOI > max.currentOI) return cur;
      return max;
    }, null);

  const topPutOverallItem = puts.reduce<BarrierTrackingItem | null>((max, cur) => {
    if (!max || cur.currentOI > max.currentOI) return cur;
    return max;
  }, null);

  const topPutWithin2SigmaItem = puts
    .filter((i) => i.isWithin2Sigma)
    .reduce<BarrierTrackingItem | null>((max, cur) => {
      if (!max || cur.currentOI > max.currentOI) return cur;
      return max;
    }, null);

  // 6. Preparar os últimos candles para o gráfico (últimos 50 pregões)
  const recentCandles = historicalCandles.slice(-50);
  const candles: OITrackingCandle[] = recentCandles.map((c) => {
    const d = new Date(c.date * 1000);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return {
      date: c.date,
      dateFormatted: `${day}/${month}`,
      open: Number(c.open?.toFixed(2) || c.close.toFixed(2)),
      high: Number(c.high?.toFixed(2) || c.close.toFixed(2)),
      low: Number(c.low?.toFixed(2) || c.close.toFixed(2)),
      close: Number(c.close.toFixed(2)),
      volume: c.volume || 0,
    };
  });

  return {
    symbol,
    selectedExpiration,
    selectedDte,
    isRolloverPeriod,
    availableExpirations,
    spotBands,
    topCallOverall: toSummaryCard(topCallOverallItem),
    topCallWithin2Sigma: toSummaryCard(topCallWithin2SigmaItem),
    topPutOverall: toSummaryCard(topPutOverallItem),
    topPutWithin2Sigma: toSummaryCard(topPutWithin2SigmaItem),
    strikesTable,
    candles,
  };
}
