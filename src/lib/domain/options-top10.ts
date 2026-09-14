/**
 * Motor Quantitativo de Identificação das Top 10 Opções em Open Interest (CALL & PUT)
 * com Variações 1D e 5D e Filtro Estrito de Vencimentos Mensais B3 (CNPI / B3)
 *
 * REGRAS CRÍTICAS:
 * - 100% dados reais da BRAPI / B3.
 * - Zero simulações, estimativas inventadas ou números teóricos.
 * - Descarte rigoroso de opções semanais (W1-W5) e diárias.
 */

import {
  B3ExpirationInfo,
  OptionPositionItem,
  Top10OIItem,
  Top10OIResult,
} from '../types/financial';
import { isMonthlyB3Option } from './options-tracking-5d';

/**
 * Top 10 Ativos com Maior Liquidez e Volume de Negociação em Opções na B3
 */
export const TOP_10_LIQUID_ASSETS = [
  'PETR4',
  'VALE3',
  'BOVA11',
  'BBAS3',
  'ITUB4',
  'BBDC4',
  'MGLU3',
  'RENT3',
  'PRIO3',
  'ABEV3',
] as const;

export type TopLiquidAsset = (typeof TOP_10_LIQUID_ASSETS)[number];

export interface ComputeTop10OIParams {
  symbol: string;
  selectedExpiration: string;
  availableExpirations: B3ExpirationInfo[];
  currentSpot: number;
  currentPositions: OptionPositionItem[];
  prev1DPositions?: OptionPositionItem[];
  prev5DPositions?: OptionPositionItem[];
  dates?: {
    current: string;
    d1: string;
    d5: string;
  };
}

/**
 * Processa as posições e extrai as Top 10 CALLs e Top 10 PUTs por Open Interest
 * calculando variações diárias (1D) e semanais (5D) em % e contratos.
 */
export function computeTop10OI({
  symbol,
  selectedExpiration,
  availableExpirations,
  currentSpot,
  currentPositions,
  prev1DPositions = [],
  prev5DPositions = [],
  dates = {
    current: new Date().toISOString().split('T')[0],
    d1: '',
    d5: '',
  },
}: ComputeTop10OIParams): Top10OIResult {
  // 1. Filtrar estritamente vencimentos mensais B3 (descarta qualquer semanal W1-W5)
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

  // 2. DTE e aviso de Período de Rolagem
  const selectedInfo = availableExpirations.find((e) => e.date === selectedExpiration);
  const selectedDte = selectedInfo?.dte ?? 0;
  const isRolloverPeriod = selectedDte <= 5;

  // 3. Normalizar posições históricas por chave: `${SIDE}_${STRIKE}`
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
  interface AggregatedPos {
    strike: number;
    type: 'CALL' | 'PUT';
    symbol: string;
    currentOI: number;
  }
  const currentMap = new Map<string, AggregatedPos>();

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

  // 5. Montar lista calculada de todas as posições do vencimento
  const allItems: Top10OIItem[] = [];

  currentMap.forEach((item, key) => {
    const prev1D = map1D.get(key);
    const prev5D = map5D.get(key);

    const prev1DOI = typeof prev1D === 'number' ? prev1D : null;
    const prev5DOI = typeof prev5D === 'number' ? prev5D : null;

    let change1DPercent: number | null = null;
    let change1DContracts: number | null = null;
    if (prev1DOI !== null) {
      change1DContracts = item.currentOI - prev1DOI;
      if (prev1DOI > 0) {
        change1DPercent = Number((((item.currentOI - prev1DOI) / prev1DOI) * 100).toFixed(2));
      }
    }

    let change5DPercent: number | null = null;
    let change5DContracts: number | null = null;
    if (prev5DOI !== null) {
      change5DContracts = item.currentOI - prev5DOI;
      if (prev5DOI > 0) {
        change5DPercent = Number((((item.currentOI - prev5DOI) / prev5DOI) * 100).toFixed(2));
      }
    }

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

    allItems.push({
      strike: item.strike,
      type: item.type,
      symbol: item.symbol,
      currentOI: item.currentOI,
      prev1DOI,
      prev5DOI,
      change1DPercent,
      change1DContracts,
      change5DPercent,
      change5DContracts,
      distanceFromSpotPercent,
      flowSignal,
    });
  });

  // 6. Separar em CALLs e PUTs e ordenar estritamente por maior Open Interest Atual
  const allCalls = allItems.filter((i) => i.type === 'CALL');
  const allPuts = allItems.filter((i) => i.type === 'PUT');

  allCalls.sort((a, b) => b.currentOI - a.currentOI);
  allPuts.sort((a, b) => b.currentOI - a.currentOI);

  const top10Calls = allCalls.slice(0, 10);
  const top10Puts = allPuts.slice(0, 10);

  // 7. Totais agregados e Put/Call Ratio (P/C Ratio)
  const totalCallsOI = allCalls.reduce((acc, c) => acc + c.currentOI, 0);
  const totalPutsOI = allPuts.reduce((acc, p) => acc + p.currentOI, 0);
  const callPutRatio = totalCallsOI > 0 ? Number((totalPutsOI / totalCallsOI).toFixed(2)) : 0;

  return {
    symbol,
    spotPrice: currentSpot,
    selectedExpiration,
    selectedDte,
    isRolloverPeriod,
    availableExpirations,
    top10Calls,
    top10Puts,
    totalCallsOI,
    totalPutsOI,
    callPutRatio,
    dates,
  };
}
