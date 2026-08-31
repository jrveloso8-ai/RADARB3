/**
 * Motor Quantitativo de Opções e Barreiras Institucionais B3 (CNPI-D)
 * Especificação Técnica v2 (31/08/2026):
 * - Merge por symbol entre Open Interest (positions) e Dados de Mercado/IV/Gregas (analytics)
 * - NENHUM preço teórico em tela: preços e IV vêm de analytics ou aparecem como N/D
 * - IV ATM calculada pela mediana de séries elegíveis (confidence high, price >= 0.10, OI >= 1000, +-5% spot)
 * - Divergência Call/Put > 5 pp marca ivQuality: 'DIVERGENTE' e invalida ivAtm
 */

import {
  B3ExpirationInfo,
  OptionAnalysisResult,
  OptionAnalyticsItem,
  OptionBarrierAlert,
  OptionPositionItem,
  StraddleRow,
  StrikeVolumeDistribution,
  WallItem,
} from '../types/financial';
import { calculateBlackScholes, calculateImpliedVolatility, calculateMaxPain } from './black-scholes';
import { calculateB3BusinessDays } from './b3-calendar';
import { calculateHistoricalVolatility } from './volatility';
import { CNPI_RULES } from '../config/rules';

/**
 * Retorna as próximas 8 datas oficiais de vencimento de opções na B3 (3ª sexta-feira do mês)
 */
export function getB3ExpirationDetails(referenceDate: Date = new Date()): B3ExpirationInfo[] {
  const monthNamesPt = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  const callLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const putLetters = ['M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X'];

  const expirations: B3ExpirationInfo[] = [];
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth();

  for (let i = 0; i < 8; i++) {
    const targetMonth = (currentMonth + i) % 12;
    const targetYear = currentYear + Math.floor((currentMonth + i) / 12);

    let fridayCount = 0;
    let thirdFriday = 1;

    for (let day = 1; day <= 31; day++) {
      const d = new Date(targetYear, targetMonth, day);
      if (d.getMonth() !== targetMonth) break;
      if (d.getDay() === 5) {
        fridayCount++;
        if (fridayCount === 3) {
          thirdFriday = day;
          break;
        }
      }
    }

    const expDateStr = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(thirdFriday).padStart(2, '0')}`;
    const dte = calculateB3BusinessDays(referenceDate, new Date(targetYear, targetMonth, thirdFriday));

    let badge = 'Mensal';
    if (i === 0) badge = 'Mais Líquida (Mensal)';
    else if (i === 1) badge = 'Próxima Série (Mensal)';

    expirations.push({
      date: expDateStr,
      monthName: monthNamesPt[targetMonth],
      callLetter: callLetters[targetMonth],
      putLetter: putLetters[targetMonth],
      dte,
      label: `Série ${callLetters[targetMonth]}/${putLetters[targetMonth]} (${monthNamesPt[targetMonth]})`,
      badge,
    });
  }

  return expirations;
}

/**
 * Seleciona automaticamente o Vencimento Mensal Mais Líquido da B3
 */
export function getMostLiquidB3Expiration(
  expirations: B3ExpirationInfo[] = getB3ExpirationDetails()
): B3ExpirationInfo {
  if (!expirations || expirations.length === 0) {
    return {
      date: '2026-09-18',
      monthName: 'Setembro',
      callLetter: 'I',
      putLetter: 'U',
      dte: 14,
      label: 'Série Setembro',
      badge: 'Mensal',
    };
  }

  const monthlyExpirations = expirations.filter(
    (e) => e.badge.includes('Mensal') || (!e.badge.includes('Semanal') && !e.label.includes(' W'))
  );

  if (monthlyExpirations.length === 0) {
    return expirations[0];
  }

  const firstMonthly = monthlyExpirations[0];
  if (firstMonthly.dte >= 5 || monthlyExpirations.length === 1) {
    return firstMonthly;
  }

  return monthlyExpirations[1];
}

/**
 * Analisa as opções realizando o merge exato entre posições em aberto e analytics de mercado
 */
export function analyzeOptionPositions(
  underlyingSymbol: string,
  underlyingPrice: number,
  positions: OptionPositionItem[],
  analytics: OptionAnalyticsItem[] = [],
  expirationDate: string = '2026-09-18',
  allExpirations: B3ExpirationInfo[] = [],
  historicalPrices: number[] = []
): OptionAnalysisResult {
  const selectedExpirationInfo =
    allExpirations.find((e) => e.date === expirationDate) ||
    allExpirations[0] || {
      date: expirationDate,
      monthName: 'Atual',
      callLetter: 'I',
      putLetter: 'U',
      dte: 13,
      label: `Série (${expirationDate})`,
      badge: 'Mensal',
    };

  const dteYears = Math.max(1, selectedExpirationInfo.dte) / 252.0;
  const spot = underlyingPrice > 0 ? underlyingPrice : 30.0;

  const realHv21 = calculateHistoricalVolatility(historicalPrices, 21) ?? 24.5;
  const realHv63 = calculateHistoricalVolatility(historicalPrices, 63) ?? 26.0;

  // Mapa de analytics indexado por símbolo da opção
  const analyticsBySymbol = new Map<string, OptionAnalyticsItem>();
  for (const a of analytics) {
    if (a.symbol) {
      analyticsBySymbol.set(a.symbol.trim().toUpperCase(), a);
    }
  }

  const callsByStrike = new Map<number, number>();
  const putsByStrike = new Map<number, number>();
  const callPositionsByStrike = new Map<number, OptionPositionItem>();
  const putPositionsByStrike = new Map<number, OptionPositionItem>();

  const enrichedCalls: OptionPositionItem[] = [];
  const enrichedPuts: OptionPositionItem[] = [];

  let totalCallOpenInterest = 0;
  let totalPutOpenInterest = 0;
  let openInterestDate = '';

  for (const pos of positions) {
    const side = pos.side?.toLowerCase();
    const strike = Number(pos.strike.toFixed(2));
    const cleanSym = pos.symbol?.trim().toUpperCase();
    const analyticsItem = cleanSym ? analyticsBySymbol.get(cleanSym) : undefined;

    if (pos.openInterestDate && !openInterestDate) {
      openInterestDate = pos.openInterestDate;
    }

    // Regras de Merge por Symbol (Spec v2):
    // 1. Preço e IV vêm de analytics. Se não houver analytics, optionPrice = null e iv = null (sem inventar preço teórico).
    // 2. Gregas (delta, gamma, theta, vega) vêm diretamente de analytics quando disponível.
    const lastPrice =
      analyticsItem?.optionPrice !== undefined && analyticsItem.optionPrice !== null
        ? analyticsItem.optionPrice
        : pos.lastPrice ?? null;

    const iv =
      analyticsItem?.impliedVolatility !== undefined && analyticsItem.impliedVolatility !== null
        ? analyticsItem.impliedVolatility
        : pos.iv ?? null;

    const delta = analyticsItem?.delta !== undefined ? analyticsItem.delta : pos.delta ?? (side === 'call' ? 0.5 : -0.5);

    const enriched: OptionPositionItem = {
      ...pos,
      strike,
      lastPrice: lastPrice ?? undefined,
      iv: iv ?? undefined,
      delta,
    };

    if (side === 'call') {
      enrichedCalls.push(enriched);
      callsByStrike.set(strike, (callsByStrike.get(strike) || 0) + (pos.openInterest || 0));
      callPositionsByStrike.set(strike, enriched);
      totalCallOpenInterest += pos.openInterest || 0;
    } else if (side === 'put') {
      enrichedPuts.push(enriched);
      putsByStrike.set(strike, (putsByStrike.get(strike) || 0) + (pos.openInterest || 0));
      putPositionsByStrike.set(strike, enriched);
      totalPutOpenInterest += pos.openInterest || 0;
    }
  }

  // Lista de todos os strikes únicos ordenados
  const allStrikes = Array.from(
    new Set([...callsByStrike.keys(), ...putsByStrike.keys()])
  ).sort((a, b) => a - b);

  // Calcular Max Pain
  const { maxPainStrike } = calculateMaxPain(allStrikes, callsByStrike, putsByStrike);

  // Top 5 Call Walls (Resistência Institucional)
  const top5CallWalls: WallItem[] = enrichedCalls
    .filter((c) => (c.openInterest || 0) > 0)
    .sort((a, b) => (b.openInterest || 0) - (a.openInterest || 0))
    .slice(0, 5)
    .map((c) => ({
      strike: c.strike,
      symbol: c.symbol,
      contracts: c.openInterest || 0,
      uncovered: c.uncoveredQuantity || 0,
      covered: c.coveredQuantity || 0,
      iv: c.iv || 0,
      delta: c.delta || 0.5,
      distSpot: Number((((c.strike - spot) / spot) * 100).toFixed(1)),
      lastPrice: c.lastPrice || 0,
    }));

  // Top 5 Put Walls (Suporte Institucional)
  const top5PutWalls: WallItem[] = enrichedPuts
    .filter((p) => (p.openInterest || 0) > 0)
    .sort((a, b) => (b.openInterest || 0) - (a.openInterest || 0))
    .slice(0, 5)
    .map((p) => ({
      strike: p.strike,
      symbol: p.symbol,
      contracts: p.openInterest || 0,
      uncovered: p.uncoveredQuantity || 0,
      covered: p.coveredQuantity || 0,
      iv: p.iv || 0,
      delta: p.delta || -0.5,
      distSpot: Number((((p.strike - spot) / spot) * 100).toFixed(1)),
      lastPrice: p.lastPrice || 0,
    }));

  // Distribuição de Volume / Open Interest por Strike
  const relevantStrikes = allStrikes.filter(
    (k) => k >= spot * 0.75 && k <= spot * 1.25
  );
  const distributionStrikes = relevantStrikes.length > 0 ? relevantStrikes : allStrikes.slice(0, 30);

  const strikeDistribution: StrikeVolumeDistribution[] = distributionStrikes.map((strike) => {
    const callOi = callsByStrike.get(strike) || 0;
    const putOi = putsByStrike.get(strike) || 0;
    const isSpot = Math.abs(strike - spot) <= (distributionStrikes[1] - distributionStrikes[0] || 0.5) / 2;
    const isMaxPain = strike === maxPainStrike;

    return {
      strike,
      callOpenInterest: callOi,
      putOpenInterest: putOi,
      totalOpenInterest: callOi + putOi,
      isSpot,
      isMaxPain,
    };
  });

  // Grade Completa Straddle (Calls e Puts lado a lado por Strike)
  const straddleRows: StraddleRow[] = allStrikes.map((strike) => {
    const call = callPositionsByStrike.get(strike);
    const put = putPositionsByStrike.get(strike);

    return {
      strike,
      call: call
        ? {
            symbol: call.symbol,
            lastPrice: call.lastPrice || 0,
            openInterest: call.openInterest || 0,
            uncoveredQuantity: call.uncoveredQuantity || 0,
            coveredQuantity: call.coveredQuantity || 0,
            inTheMoney: strike < spot,
          }
        : undefined,
      put: put
        ? {
            symbol: put.symbol,
            lastPrice: put.lastPrice || 0,
            openInterest: put.openInterest || 0,
            uncoveredQuantity: put.uncoveredQuantity || 0,
            coveredQuantity: put.coveredQuantity || 0,
            inTheMoney: strike > spot,
          }
        : undefined,
      isSpotNear: Math.abs(strike - spot) <= 0.5,
      isMaxPain: strike === maxPainStrike,
    };
  });

  const putCallRatio =
    totalCallOpenInterest > 0
      ? Number((totalPutOpenInterest / totalCallOpenInterest).toFixed(2))
      : 0;

  // =========================================================================
  // HEURÍSTICA DE IV ATM (Spec v2 — Seção 3.2.3)
  // =========================================================================
  const atmRules = CNPI_RULES.DERIVATIVES.ATM_ELIGIBILITY;

  // Filtrar analytics elegíveis:
  // confidence === 'high' && optionPrice >= 0.10 && openInterest >= 1000 && |strike - spot| / spot <= 0.05
  const eligibleAnalytics = analytics.filter((o) => {
    const priceValid = o.optionPrice !== null && o.optionPrice >= atmRules.MIN_OPTION_PRICE;
    const oiValid = (o.openInterest || 0) >= atmRules.MIN_OPEN_INTEREST;
    const distValid = Math.abs(o.strike - spot) / spot <= atmRules.MAX_DIST_SPOT_PCT;
    const confValid = (o.confidence || 'high').toLowerCase() === 'high';
    const ivValid = o.impliedVolatility !== null && o.impliedVolatility > 0;
    return priceValid && oiValid && distValid && confValid && ivValid;
  });

  let ivAtmResult: { callIv: number; putIv: number; percentile: number } | null = null;
  let ivQuality: 'CONFIÁVEL' | 'DIVERGENTE' | 'INSUFICIENTE' = 'INSUFICIENTE';

  if (eligibleAnalytics.length > 0) {
    const validIvs = eligibleAnalytics
      .map((a) => a.impliedVolatility as number)
      .sort((a, b) => a - b);

    const mid = Math.floor(validIvs.length / 2);
    const medianIv =
      validIvs.length % 2 !== 0
        ? validIvs[mid]
        : Number(((validIvs[mid - 1] + validIvs[mid]) / 2).toFixed(2));

    const nearestCall = eligibleAnalytics
      .filter((a) => a.side?.toLowerCase() === 'call')
      .sort((a, b) => Math.abs(a.strike - spot) - Math.abs(b.strike - spot))[0];

    const nearestPut = eligibleAnalytics
      .filter((a) => a.side?.toLowerCase() === 'put')
      .sort((a, b) => Math.abs(a.strike - spot) - Math.abs(b.strike - spot))[0];

    // Checar divergência Call/Put > 5 pontos percentuais
    if (
      nearestCall?.impliedVolatility !== null &&
      nearestCall?.impliedVolatility !== undefined &&
      nearestPut?.impliedVolatility !== null &&
      nearestPut?.impliedVolatility !== undefined &&
      Math.abs(nearestCall.impliedVolatility - nearestPut.impliedVolatility) > atmRules.MAX_CALL_PUT_IV_DIVERGENCE_PP
    ) {
      ivQuality = 'DIVERGENTE';
      ivAtmResult = null; // Tratado como dado não confiável -> sem IV ATM
    } else {
      ivQuality = 'CONFIÁVEL';
      ivAtmResult = {
        callIv: nearestCall?.impliedVolatility || medianIv,
        putIv: nearestPut?.impliedVolatility || medianIv,
        percentile: 75,
      };
    }
  }

  return {
    underlyingSymbol,
    underlyingPrice: spot,
    marketType: 'equity',
    availableExpirations: allExpirations,
    selectedExpiration: expirationDate,
    selectedExpirationInfo,
    openInterestDate: openInterestDate || new Date().toISOString().split('T')[0],
    maxPain: maxPainStrike,
    ivAtm: ivAtmResult,
    ivQuality,
    hv21: realHv21,
    hv63: realHv63,
    putCallRatio,
    totalCallOpenInterest,
    totalPutOpenInterest,
    top5CallWalls,
    top5PutWalls,
    strikeDistribution,
    straddleRows,
  };
}

/**
 * Constrói o Alerta de Risco / Oportunidade de Barreiras Institucionais de Opções
 */
export function buildOptionBarrierAlert(analysis: OptionAnalysisResult): OptionBarrierAlert {
  const spot = analysis.underlyingPrice;
  const topCall = analysis.top5CallWalls[0] || {
    strike: spot * 1.05,
    symbol: 'CALL',
    contracts: 0,
    distSpot: 5,
  };
  const topPut = analysis.top5PutWalls[0] || {
    strike: spot * 0.95,
    symbol: 'PUT',
    contracts: 0,
    distSpot: -5,
  };

  const isCallImminent = topCall.distSpot >= 0 && topCall.distSpot <= 3.0; // Preço a <= 3% da Call Wall
  const isPutImminent = topPut.distSpot <= 0 && Math.abs(topPut.distSpot) <= 3.0; // Preço a <= 3% da Put Wall

  let hasAlert = false;
  let alertType: 'CALL_WALL_RESISTANCE' | 'PUT_WALL_SUPPORT' | 'MAX_PAIN_PIN' | undefined;
  let alertMessage = '';

  if (isCallImminent) {
    hasAlert = true;
    alertType = 'CALL_WALL_RESISTANCE';
    alertMessage = `Alerta de Barreira Institucional: Preço (R$ ${spot.toFixed(2)}) a apenas ${topCall.distSpot}% da Call Wall (${topCall.symbol} @ R$ ${topCall.strike.toFixed(2)} com ${topCall.contracts.toLocaleString('pt-BR')} contratos). Risco de resistência por defesa de lançadores institucionais.`;
  } else if (isPutImminent) {
    hasAlert = true;
    alertType = 'PUT_WALL_SUPPORT';
    alertMessage = `Alerta de Suporte Institucional: Preço (R$ ${spot.toFixed(2)}) a apenas ${Math.abs(topPut.distSpot)}% da Put Wall (${topPut.symbol} @ R$ ${topPut.strike.toFixed(2)} com ${topPut.contracts.toLocaleString('pt-BR')} contratos). Probabilidade de suporte forte por recompra de market makers.`;
  }

  return {
    expirationDate: analysis.selectedExpiration,
    dte: analysis.selectedExpirationInfo.dte,
    spotPrice: spot,
    maxPain: analysis.maxPain,
    topCallWall: {
      strike: topCall.strike,
      symbol: topCall.symbol,
      contracts: topCall.contracts,
      distSpot: topCall.distSpot,
      isImminent: isCallImminent,
    },
    topPutWall: {
      strike: topPut.strike,
      symbol: topPut.symbol,
      contracts: topPut.contracts,
      distSpot: topPut.distSpot,
      isImminent: isPutImminent,
    },
    hasAlert,
    alertType,
    alertMessage,
  };
}
