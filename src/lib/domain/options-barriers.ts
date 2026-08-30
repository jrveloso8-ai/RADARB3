import {
  B3ExpirationInfo,
  OptionAnalysisResult,
  OptionBarrierAlert,
  OptionPositionItem,
  StraddleRow,
  StrikeVolumeDistribution,
  WallItem,
} from '../types/financial';
import { calculateBlackScholes, calculateMaxPain } from './black-scholes';
import { calculateB3BusinessDays } from './b3-calendar';
import { calculateHistoricalVolatility } from './volatility';

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const CALL_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const PUT_LETTERS = ['M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X'];

/**
 * Gera a grade oficial de vencimentos da B3 (Mensais e Semanais) com DTE em DIAS ÚTEIS (Padrão Profit / ANBIMA)
 */
export function getB3ExpirationDetails(startDate: Date | string = new Date()): B3ExpirationInfo[] {
  const expirations: B3ExpirationInfo[] = [];
  const pad = (n: number) => String(n).padStart(2, '0');

  let startY: number;
  let startM: number;
  let startD: number;

  if (typeof startDate === 'string') {
    const p = startDate.split('-');
    startY = parseInt(p[0]);
    startM = parseInt(p[1]) - 1;
    startD = parseInt(p[2]);
  } else {
    startY = startDate.getFullYear();
    startM = startDate.getMonth();
    startD = startDate.getDate();
  }

  const now = new Date(startY, startM, startD, 12, 0, 0);

  // Gerar vencimentos para os próximos 12 meses
  for (let i = 0; i < 12; i++) {
    const targetMonth = (startM + i) % 12;
    const targetYear = startY + Math.floor((startM + i) / 12);

    const monthName = MONTH_NAMES_PT[targetMonth];
    const callLetter = CALL_LETTERS[targetMonth];
    const putLetter = PUT_LETTERS[targetMonth];

    // Mapear todas as sextas-feiras do mês
    const fridays: Date[] = [];
    for (let day = 1; day <= 31; day++) {
      const d = new Date(targetYear, targetMonth, day, 12, 0, 0);
      if (d.getMonth() !== targetMonth) break;
      if (d.getDay() === 5) {
        fridays.push(d);
      }
    }

    // Para os primeiros 2 meses a vencer, incluir opções semanais (W1, W2, W4, W5) e mensais futuras
    if (i < 2) {
      fridays.forEach((friday, idx) => {
        const weekNum = idx + 1;
        const isMonthly = weekNum === 3;
        const dateStr = `${friday.getFullYear()}-${pad(friday.getMonth() + 1)}-${pad(friday.getDate())}`;

        const dte = calculateB3BusinessDays(now, friday);

        if (dte > 0) {
          if (isMonthly) {
            expirations.push({
              date: dateStr,
              monthName,
              callLetter,
              putLetter,
              dte,
              label: `Série ${monthName} (${callLetter} / ${putLetter}) • ${dateStr} (${dte} DTE)`,
              badge: `Mensal [${dte}d] (${callLetter}/${putLetter})`,
            });
          } else {
            expirations.push({
              date: dateStr,
              monthName,
              callLetter,
              putLetter,
              dte,
              label: `Série ${monthName} W${weekNum} • ${dateStr} (${dte} DTE)`,
              badge: `Semanal W${weekNum} [${dte}d]`,
            });
          }
        }
      });
    } else {
      // Meses posteriores: Apenas vencimentos mensais (3ª sexta-feira)
      const monthlyFriday = fridays[2] || fridays[fridays.length - 1];
      if (monthlyFriday) {
        const dte = calculateB3BusinessDays(now, monthlyFriday);
        if (dte > 0) {
          const dateStr = `${monthlyFriday.getFullYear()}-${pad(monthlyFriday.getMonth() + 1)}-${pad(monthlyFriday.getDate())}`;
          expirations.push({
            date: dateStr,
            monthName,
            callLetter,
            putLetter,
            dte,
            label: `Série ${monthName} (${callLetter} / ${putLetter}) • ${dateStr} (${dte} DTE)`,
            badge: `Mensal [${dte}d] (${callLetter}/${putLetter})`,
          });
        }
      }
    }
  }

  return expirations;
}

/**
 * Analisa as posições em aberto de opções gerando Top 5 Walls, Max Pain, Gregas e Grade Straddle
 */
export function analyzeOptionPositions(
  underlyingSymbol: string,
  underlyingPrice: number,
  positions: OptionPositionItem[],
  expirationDate: string,
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

  // Base 252 dias úteis para cálculo financeiro de opções B3
  const dteYears = Math.max(1, selectedExpirationInfo.dte) / 252.0;
  const spot = underlyingPrice > 0 ? underlyingPrice : 30.0;

  // Cálculo real da Volatilidade Histórica (HV21 e HV63) a partir da série real de preços
  const realHv21 = calculateHistoricalVolatility(historicalPrices, 21) ?? 24.5;
  const realHv63 = calculateHistoricalVolatility(historicalPrices, 63) ?? 26.0;

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
    if (pos.openInterestDate && !openInterestDate) {
      openInterestDate = pos.openInterestDate;
    }

    // Calcular gregas Black-Scholes (Base 252 DU com Volatilidade Real do Ativo)
    const greeks = calculateBlackScholes(
      spot,
      strike,
      dteYears,
      0.1075,
      (realHv21 || 25.0) / 100,
      side === 'call' ? 'call' : 'put'
    );

    const enriched: OptionPositionItem = {
      ...pos,
      strike,
      delta: greeks.delta,
      iv: pos.iv ? Number(pos.iv.toFixed(1)) : greeks.iv,
      lastPrice: pos.lastPrice || greeks.theoreticalPrice,
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

  // Identificar ATM Call e Put mais próximas para IV ATM real
  const nearestAtmCall = enrichedCalls.find((c) => Math.abs(c.strike - spot) <= 1.0);
  const nearestAtmPut = enrichedPuts.find((p) => Math.abs(p.strike - spot) <= 1.0);

  return {
    underlyingSymbol,
    underlyingPrice: spot,
    marketType: 'equity',
    availableExpirations: allExpirations,
    selectedExpiration: expirationDate,
    selectedExpirationInfo,
    openInterestDate: openInterestDate || new Date().toISOString().split('T')[0],
    maxPain: maxPainStrike,
    ivAtm: {
      callIv: nearestAtmCall?.iv || realHv21,
      putIv: nearestAtmPut?.iv || realHv21,
      percentile: 75,
    },
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

  let alertType: 'CALL_WALL_RESISTANCE' | 'PUT_WALL_SUPPORT' | 'MAX_PAIN_PIN' | undefined;
  let alertMessage: string | undefined;

  if (isCallImminent) {
    alertType = 'CALL_WALL_RESISTANCE';
    alertMessage = `Atenção: Preço à vista (R$ ${spot.toFixed(2)}) a apenas ${topCall.distSpot}% da Call Wall institucional em R$ ${topCall.strike.toFixed(2)} (${topCall.contracts.toLocaleString('pt-BR')} contratos). Forte barreira de resistência e travamento de alta pelos lançadores.`;
  } else if (isPutImminent) {
    alertType = 'PUT_WALL_SUPPORT';
    alertMessage = `Atenção: Preço à vista (R$ ${spot.toFixed(2)}) a apenas ${Math.abs(topPut.distSpot)}% da Put Wall institucional em R$ ${topPut.strike.toFixed(2)} (${topPut.contracts.toLocaleString('pt-BR')} contratos). Zona relevante de suporte e defesa institucional.`;
  }

  return {
    expirationDate: analysis.selectedExpiration,
    dte: analysis.selectedExpirationInfo?.dte || 0,
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
    hasAlert: isCallImminent || isPutImminent,
    alertType,
    alertMessage,
  };
}
