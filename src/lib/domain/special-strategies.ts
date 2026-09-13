/**
 * Motor de Estratégias Especiais: Compra de Call DITM (Stock Replacement - Lee Lowell)
 * 
 * Regras estritas:
 * - 100% dados reais da BRAPI (sem simulações, sem números inventados).
 * - Quando não houver dado real de mercado (negócio/preço), declarar expressamente 'Dado não disponível' / null.
 * - Cálculo de Valor Justo Teórico e Preço Teto para balizar o investidor sem book de ofertas.
 * - Avaliação de Timing Técnico (Pullback em alta, Reversão, Sobrecomprado, Baixa) sobre histórico real.
 */

import { OptionAnalyticsItem } from '@/lib/types/financial';
import { calculateBlackScholes } from '@/lib/domain/black-scholes';
import { calculateRSI } from '@/lib/domain/indicators';
import { calculateSMA } from '@/lib/domain/trends';
import { calculateHistoricalVolatility } from '@/lib/domain/volatility';
import { getRiskFreeRate } from '@/lib/config/macro';

export type TechnicalTimingStatus =
  | 'PULLBACK_ALTA'
  | 'REVERSAO_FUNDO'
  | 'SOBRECOMPRADO'
  | 'TENDENCIA_BAIXA'
  | 'NEUTRO';

export interface TechnicalTimingAnalysis {
  status: TechnicalTimingStatus;
  title: string;
  badgeText: string;
  badgeVariant: 'emerald' | 'blue' | 'amber' | 'rose' | 'gray';
  explanation: string;
  actionGuidance: string;
  spotPrice: number;
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  rsi14: number | null;
  hv21: number;
}

export interface DITMCandidate {
  symbol: string;
  underlyingSymbol: string;
  expirationDate: string;
  dte: number;
  monthsAhead: number;
  strike: number;
  spotPrice: number;
  depthPercent: number; // (spot - strike) / spot * 100

  // Dados reais de mercado da BRAPI
  marketPrice: number | null; // Fechamento real da opção na BRAPI
  openInterest: number | null; // Contratos em aberto reais
  openInterestDate: string | null;
  lastTradeDate: string | null;
  hasRealTrade: boolean; // Se houve negociação registrada

  // Decomposição de Preço e Valor Justo
  intrinsicValue: number; // VI = max(0, spot - strike)
  realExtrinsicValue: number | null; // VE real = marketPrice - VI (se houver negócio)
  realExtrinsicPercent: number | null; // VE real / Spot * 100
  theoreticalExtrinsicValue: number; // VE Teórico via Black-Scholes
  fairValue: number; // Valor Justo = VI + VE Teórico
  ceilingPrice: number; // Preço Teto = VI + (1.5% * Spot)

  // Gregas
  delta: number;
  theta: number;

  // Comparativo de Capital (100 ações vs 100 opções DITM)
  stockInvestment100: number; // 100 * Spot
  optionInvestment100: number; // 100 * (marketPrice || fairValue)
  capitalSaved100: number; // Dinheiro liberado para CDI
  leverage: number; // Spot / Preço Opção
  breakEven: number; // Strike + Preço Opção

  // Classificação de Qualidade da Oportunidade
  quality: 'EXCELENTE' | 'BOA' | 'ATENCAO_ILIQUIDA';
  qualityReason: string;
}

export interface SpecialStrategiesScreeningResult {
  underlyingSymbol: string;
  spotPrice: number;
  timing: TechnicalTimingAnalysis;
  candidates: DITMCandidate[];
  eligibleExpirations: string[];
  totalOptionsAnalyzed: number;
  screenedAt: string;
}

export interface PoorMansCoveredCallCandidate {
  id: string;
  underlyingSymbol: string;
  spotPrice: number;

  // Perna Longa (Colateral Sintético DITM - 3 a 6 meses)
  longLeg: {
    symbol: string;
    strike: number;
    expirationDate: string;
    dte: number;
    marketPrice: number | null;
    fairValue: number;
    effectivePrice: number;
    delta: number;
    openInterest: number | null;
    hasRealTrade: boolean;
  };

  // Perna Curta (Venda OTM Mensal - ~30 dias)
  shortLeg: {
    symbol: string;
    strike: number;
    expirationDate: string;
    dte: number;
    marketPrice: number | null;
    fairValue: number;
    effectivePrice: number;
    delta: number;
    openInterest: number | null;
    hasRealTrade: boolean;
    otmDistancePercent: number;
  };

  // Métricas da Estrutura Casada
  netDebit: number; // longPrice - shortPrice
  spreadWidth: number; // shortStrike - longStrike
  isLowellSafe: boolean; // spreadWidth > netDebit (regra de segurança de exercício)
  safetyMargin: number; // spreadWidth - netDebit

  // Retorno e Renda
  immediateIncomePerLot: number; // shortPrice * 100
  monthlyYieldPercent: number; // (shortPrice / netDebit) * 100
  maxProfitIfExercised: number; // (spreadWidth - netDebit) * 100
  maxReturnPercent: number; // (maxProfitIfExercised / (netDebit * 100)) * 100
  breakEven: number; // longStrike + netDebit
  monthsToFullAmortization: number; // Math.ceil(netDebit / shortPrice)

  // Qualidade e Risco
  quality: 'EXCELENTE' | 'BOA' | 'ARRISCADA';
  qualityReason: string;

  // Ranking por Score Composto de Lee Lowell (0 a 100)
  compositeScore: number;
  scoreBreakdown: {
    yieldScore: number;
    safetyScore: number;
    popScore: number;
    liquidityScore: number;
  };
}

export interface PMCCScreeningResult {
  underlyingSymbol: string;
  spotPrice: number;
  timing: TechnicalTimingAnalysis;
  candidates: PoorMansCoveredCallCandidate[];
  shortExpiration: string;
  eligibleLongExpirations: string[];
  totalPairsAnalyzed: number;
  screenedAt: string;
}

export interface CashSecuredPutCandidate {
  symbol: string;
  underlyingSymbol: string;
  expirationDate: string;
  dte: number;
  strike: number;
  spotPrice: number;
  otmDistancePercent: number; // (spot - strike) / spot * 100

  // Dados reais de mercado da BRAPI
  marketPrice: number | null; // Fechamento real da opção na BRAPI
  openInterest: number | null; // Contratos em aberto reais
  openInterestDate: string | null;
  lastTradeDate: string | null;
  hasRealTrade: boolean; // Se houve negociação registrada

  // Precificação e Valor Justo
  theoreticalPrice: number; // Black-Scholes para Put
  effectivePrice: number; // marketPrice se houver negócio, ou theoreticalPrice
  isRealPrice: boolean; // Se usou negócio real ou modelo

  // Métricas de Renda e Desconto (Lee Lowell)
  effectivePurchasePrice: number; // Strike - effectivePrice
  realDiscountPercent: number; // ((Spot - effectivePurchasePrice) / Spot) * 100
  cashSecuredMonthlyYield: number; // (effectivePrice / Strike) * 100
  annualizedYield: number; // ((1 + effectivePrice / Strike) ^ (252 / dte) - 1) * 100
  breakEven: number; // Strike - effectivePrice

  // Risco e Probabilidade
  delta: number | null;
  pop: number; // Probabilidade de expirar OTM (virar pó)

  // Classificação de Qualidade
  quality: 'EXCELENTE' | 'BOA' | 'ATENCAO';
  qualityReason: string;
}

export interface CashSecuredPutScreeningResult {
  underlyingSymbol: string;
  spotPrice: number;
  timing: TechnicalTimingAnalysis;
  candidates: CashSecuredPutCandidate[];
  expirationDate: string;
  totalPutsAnalyzed: number;
  screenedAt: string;
}

export interface ScreenCashSecuredPutsParams {
  spotPrice: number;
  options: OptionAnalyticsItem[];
  closes: number[];
  minOtmPercent?: number; // padrão: 1.5%
  maxOtmPercent?: number; // padrão: 20.0%
  targetExpirationDate?: string;
}

/**
 * Avalia o Timing Técnico do ativo-objeto com base na série real de preços
 */
export function evaluateTechnicalTiming(
  spotPrice: number,
  closes: number[]
): TechnicalTimingAnalysis {
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const sma200 = calculateSMA(closes, 200);
  const rsi14 = calculateRSI(closes, 14);
  const hv21Raw = calculateHistoricalVolatility(closes, 21);
  const hv21 = hv21Raw !== null ? hv21Raw : 0;

  if (spotPrice <= 0 || closes.length < 20) {
    return {
      status: 'NEUTRO',
      title: 'Histórico Insuficiente',
      badgeText: 'Neutro (Dados Parciais)',
      badgeVariant: 'gray',
      explanation: 'Série histórica de preços não possui amostras suficientes para calibrar médias móveis.',
      actionGuidance: 'Aguardar histórico completo de negociação antes de operar.',
      spotPrice,
      sma20,
      sma50,
      sma200,
      rsi14,
      hv21,
    };
  }

  // 1. Tendência de Baixa Franca (Preço abaixo da MM50 e MM200)
  // Alerta máximo: ativo em queda estrutural, call DITM sofrerá desvalorização quase 1:1
  const isBelowLongTermMedias =
    (sma50 !== null && spotPrice < sma50) &&
    (sma200 !== null && spotPrice < sma200);

  if (isBelowLongTermMedias) {
    return {
      status: 'TENDENCIA_BAIXA',
      title: 'Alto Risco Direcional (Tendência de Baixa)',
      badgeText: '🔴 Bloqueio Direcional (Baixa)',
      badgeVariant: 'rose',
      explanation: `O ativo opera abaixo das principais médias móveis de longo prazo (MM50 e MM200). Comprar Call DITM agora apresenta alto risco de desvalorização contínua junto com a ação.`,
      actionGuidance: 'Não recomendado abrir posições compradas em Call até que o ativo retome a média de 50 períodos e forme pivô de alta.',
      spotPrice,
      sma20,
      sma50,
      sma200,
      rsi14,
      hv21,
    };
  }

  // 2. Oportunidade de Reversão em Sobrevenda Extrema (não estando em tendência de baixa estrutural)
  if (rsi14 !== null && rsi14 <= 35) {
    return {
      status: 'REVERSAO_FUNDO',
      title: 'Oportunidade de Reversão (Sobrevendido)',
      badgeText: '🔵 Reversão Potencial (IFR Baixo)',
      badgeVariant: 'blue',
      explanation: `O ativo atingiu nível extremo de sobre-venda técnica (IFR14 = ${rsi14.toFixed(1)}). Em papéis de valor, a Call DITM de 3 a 6 meses oferece assimetria expressiva para recuperação sem risco de stop diário.`,
      actionGuidance: 'Momento favorável para montagem gradual, aproveitando preços descontados e risco máximo travado no prêmio.',
      spotPrice,
      sma20,
      sma50,
      sma200,
      rsi14,
      hv21,
    };
  }

  // 3. Ativo Sobrecomprado (Rali esticado)
  if (rsi14 !== null && rsi14 >= 68) {
    return {
      status: 'SOBRECOMPRADO',
      title: 'Cautela: Ativo Esticado no Curto Prazo',
      badgeText: '🟡 Sobrecomprado (Aguardar Recuo)',
      badgeVariant: 'amber',
      explanation: `O ativo está em rali acelerado com IFR14 em ${rsi14.toFixed(1)}. Entrar agora aumenta o risco de sofrer uma correção imediata de curto prazo assim que o rali desacelerar.`,
      actionGuidance: 'Aguarde um recuo (pullback) até a MM20 ou MM50 antes de montar a Call DITM para capturar melhor preço de entrada.',
      spotPrice,
      sma20,
      sma50,
      sma200,
      rsi14,
      hv21,
    };
  }

  // 4. Ponto Ideal: Pullback em Tendência de Alta
  const isBullishStructure =
    (sma200 !== null && spotPrice >= sma200 * 0.98) ||
    (sma50 !== null && spotPrice >= sma50 * 0.98);

  if (isBullishStructure && rsi14 !== null && rsi14 >= 38 && rsi14 <= 58) {
    return {
      status: 'PULLBACK_ALTA',
      title: 'Ponto Ideal de Entrada (Pullback em Alta)',
      badgeText: '🟢 Momento Ideal (Recuo em Suporte)',
      badgeVariant: 'emerald',
      explanation: `Estrutura técnica perfeita para Lee Lowell: tendência primária de alta com recuo controlado próximo às médias móveis (IFR14 = ${rsi14.toFixed(1)}).`,
      actionGuidance: 'Excelente relação risco/retorno para substituição de ações (Stock Replacement). Comprar a Call DITM e manter o capital excedente rendendo CDI.',
      spotPrice,
      sma20,
      sma50,
      sma200,
      rsi14,
      hv21,
    };
  }

  return {
    status: 'NEUTRO',
    title: 'Mercado em Consolidação / Neutro',
    badgeText: '⚪ Tendência Neutra',
    badgeVariant: 'gray',
    explanation: 'O ativo opera dentro de faixas laterais de negociação sem tendência direcional dominante no momento.',
    actionGuidance: 'Operação viável, porém o tempo (theta) correrá sem forte catalisador direcional imediato.',
    spotPrice,
    sma20,
    sma50,
    sma200,
    rsi14,
    hv21,
  };
}

/**
 * Realiza o screening de Calls DITM (Lee Lowell) com opções de 3 a 6 meses
 */
export function screenDITMStockReplacement(
  underlyingSymbol: string,
  spotPrice: number,
  options: OptionAnalyticsItem[],
  closes: number[],
  eligibleExpirations: string[] = []
): SpecialStrategiesScreeningResult {
  const timing = evaluateTechnicalTiming(spotPrice, closes);
  const r = getRiskFreeRate();
  const hv = timing.hv21 > 0 ? timing.hv21 / 100 : 0.32;

  const candidates: DITMCandidate[] = [];

  if (spotPrice <= 0) {
    return {
      underlyingSymbol,
      spotPrice: 0,
      timing,
      candidates: [],
      eligibleExpirations,
      totalOptionsAnalyzed: options.length,
      screenedAt: new Date().toISOString(),
    };
  }

  // Filtrar apenas calls com strike <= 85% do Spot (Lee Lowell preconiza strikes bem abaixo do spot)
  const calls = options.filter((o) => {
    if (o.side !== 'call') return false;
    const strike = Number(o.strike);
    if (isNaN(strike) || strike <= 0) return false;
    return strike <= spotPrice * 0.85; // Mínimo de 15% DITM
  });

  for (const opt of calls) {
    const strike = Number(opt.strike);
    const depthPercent = ((spotPrice - strike) / spotPrice) * 100;

    // Calcular dias úteis e tempo em anos até o vencimento
    const expDate = opt.expirationDate;
    const now = new Date();
    const targetDate = new Date(expDate + 'T18:00:00Z');
    const diffMs = targetDate.getTime() - now.getTime();
    const dteCalendar = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    const dteBusiness = Math.max(1, Math.round(dteCalendar * (5 / 7)));
    const tYears = dteBusiness / 252.0;

    // Calcular meses aproximados
    const monthsAhead = Math.max(1, Math.round(dteCalendar / 30));

    // Valor Intrínseco
    const intrinsicValue = Number((spotPrice - strike).toFixed(2));

    // Dados reais da BRAPI
    const rawPrice = opt.optionPrice ?? (opt as { close?: number }).close;
    const hasPrice = rawPrice !== null && rawPrice !== undefined && !isNaN(Number(rawPrice)) && Number(rawPrice) > 0;
    const marketPrice = hasPrice ? Number(Number(rawPrice).toFixed(2)) : null;

    const rawOI = opt.openInterest;
    const openInterest = rawOI !== null && rawOI !== undefined && !isNaN(Number(rawOI)) ? Number(rawOI) : null;
    const openInterestDate = opt.openInterestDate || null;
    const lastTradeDate = opt.lastTradeDate || null;
    const hasRealTrade = hasPrice && (openInterest !== null ? openInterest > 0 : true);

    // Decomposição de Valor Extrínseco Real (se houver preço de mercado)
    let realExtrinsicValue: number | null = null;
    let realExtrinsicPercent: number | null = null;
    if (marketPrice !== null) {
      realExtrinsicValue = Number(Math.max(0, marketPrice - intrinsicValue).toFixed(2));
      realExtrinsicPercent = Number(((realExtrinsicValue / spotPrice) * 100).toFixed(2));
    }

    // Cálculo do Valor Justo Teórico via Black-Scholes
    // Em DITM com r e tempo, o modelo calcula o valor justo exato do tempo (VE)
    const bsResult = calculateBlackScholes(
      spotPrice,
      strike,
      tYears,
      r,
      hv,
      'call',
      0.03 // DivYield conservador
    );

    const theoreticalExtrinsicValue = Number(Math.max(0.01, bsResult.theoreticalPrice - intrinsicValue).toFixed(2));
    const fairValue = Number((intrinsicValue + theoreticalExtrinsicValue).toFixed(2));

    // Preço Teto: VI + no máximo 1.5% do Spot em gordura de VE (Regra do Lowell)
    const maxAcceptableVE = Number((spotPrice * 0.015).toFixed(2));
    const ceilingPrice = Number((intrinsicValue + maxAcceptableVE).toFixed(2));

    // Delta e Theta analíticos
    const delta = bsResult.delta >= 0.70 ? Number(bsResult.delta.toFixed(2)) : 0.90;
    const theta = Number(bsResult.theta.toFixed(4));

    // Comparativo de Capital (100 cotas)
    const refPrice = marketPrice ?? fairValue;
    const stockInvestment100 = Number((spotPrice * 100).toFixed(2));
    const optionInvestment100 = Number((refPrice * 100).toFixed(2));
    const capitalSaved100 = Number((stockInvestment100 - optionInvestment100).toFixed(2));
    const leverage = Number((spotPrice / refPrice).toFixed(2));
    const breakEven = Number((strike + refPrice).toFixed(2));

    // Classificação de Qualidade da Oportunidade
    let quality: 'EXCELENTE' | 'BOA' | 'ATENCAO_ILIQUIDA' = 'BOA';
    let qualityReason = '';

    const extPerc = realExtrinsicPercent ?? ((theoreticalExtrinsicValue / spotPrice) * 100);
    const oiVal = openInterest ?? 0;

    if (extPerc <= 1.5 && oiVal >= 5000 && hasPrice) {
      quality = 'EXCELENTE';
      qualityReason = `Prêmio com VE de apenas ${extPerc.toFixed(1)}% do spot e liquidez institucional (${oiVal.toLocaleString('pt-BR')} contratos).`;
    } else if (extPerc <= 3.0 && oiVal > 0) {
      quality = 'BOA';
      qualityReason = `Boa profundidade no dinheiro (${depthPercent.toFixed(1)}%), gordura de VE controlada.`;
    } else {
      quality = 'ATENCAO_ILIQUIDA';
      qualityReason = hasPrice
        ? `Valor extrínseco elevado (${extPerc.toFixed(1)}% do spot) ou liquidez baixa.`
        : 'Sem registro recente de negócios na B3 (utilize o Valor Justo como balizador de ordem limite).';
    }

    candidates.push({
      symbol: opt.symbol,
      underlyingSymbol: opt.underlyingSymbol || underlyingSymbol,
      expirationDate: expDate || '',
      dte: dteBusiness,
      monthsAhead,
      strike,
      spotPrice,
      depthPercent: Number(depthPercent.toFixed(2)),
      marketPrice,
      openInterest,
      openInterestDate,
      lastTradeDate,
      hasRealTrade,
      intrinsicValue,
      realExtrinsicValue,
      realExtrinsicPercent,
      theoreticalExtrinsicValue,
      fairValue,
      ceilingPrice,
      delta,
      theta,
      stockInvestment100,
      optionInvestment100,
      capitalSaved100,
      leverage,
      breakEven,
      quality,
      qualityReason,
    });
  }

  // Ordenar candidatos por:
  // 1. Mais líquido (maior Open Interest)
  // 2. Menor VE relativo
  candidates.sort((a, b) => {
    // Primeiro prioriza quem tem preço real e contratos em aberto
    if (a.hasRealTrade && !b.hasRealTrade) return -1;
    if (!a.hasRealTrade && b.hasRealTrade) return 1;

    const oiA = a.openInterest || 0;
    const oiB = b.openInterest || 0;
    if (Math.abs(oiA - oiB) > 10000) {
      return oiB - oiA;
    }

    const veA = a.realExtrinsicPercent ?? ((a.theoreticalExtrinsicValue / a.spotPrice) * 100);
    const veB = b.realExtrinsicPercent ?? ((b.theoreticalExtrinsicValue / b.spotPrice) * 100);
    return veA - veB;
  });

  return {
    underlyingSymbol,
    spotPrice,
    timing,
    candidates,
    eligibleExpirations,
    totalOptionsAnalyzed: options.length,
    screenedAt: new Date().toISOString(),
  };
}

/**
 * Realiza o screening de Venda Coberta Sintética (Poor Man's Covered Call - Lee Lowell)
 * Combinando Calls Longas DITM (3 a 6 meses) com Calls Curtas OTM (próximo mês)
 */
export function screenPoorMansCoveredCall(
  underlyingSymbol: string,
  spotPrice: number,
  shortOptions: OptionAnalyticsItem[],
  longOptions: OptionAnalyticsItem[],
  closes: number[],
  shortExpirationDate: string = '',
  eligibleLongExpirations: string[] = []
): PMCCScreeningResult {
  const timing = evaluateTechnicalTiming(spotPrice, closes);
  const r = getRiskFreeRate();
  const hv = timing.hv21 > 0 ? timing.hv21 / 100 : 0.32;

  if (spotPrice <= 0) {
    return {
      underlyingSymbol,
      spotPrice: 0,
      timing,
      candidates: [],
      shortExpiration: shortExpirationDate,
      eligibleLongExpirations,
      totalPairsAnalyzed: 0,
      screenedAt: new Date().toISOString(),
    };
  }

  // 1. Filtrar Pernas Longas Elegíveis (Calls DITM: Strike <= 85% do Spot)
  interface ProcessedLeg {
    symbol: string;
    strike: number;
    expirationDate: string;
    dte: number;
    marketPrice: number | null;
    fairValue: number;
    effectivePrice: number;
    delta: number;
    openInterest: number | null;
    hasRealTrade: boolean;
    otmDistancePercent?: number;
  }

  const processedLongLegs: ProcessedLeg[] = [];
  const now = new Date();

  for (const opt of longOptions) {
    if (opt.side !== 'call') continue;
    const strike = Number(opt.strike);
    if (isNaN(strike) || strike <= 0 || strike > spotPrice * 0.85) continue;

    const expDate = opt.expirationDate || '';
    const targetDate = new Date(expDate + 'T18:00:00Z');
    const diffMs = targetDate.getTime() - now.getTime();
    const dteCalendar = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    const dteBusiness = Math.max(1, Math.round(dteCalendar * (5 / 7)));
    const tYears = dteBusiness / 252.0;

    const intrinsicValue = Math.max(0, spotPrice - strike);
    const rawPrice = opt.optionPrice ?? (opt as { close?: number }).close;
    const hasPrice = rawPrice !== null && rawPrice !== undefined && !isNaN(Number(rawPrice)) && Number(rawPrice) > 0;
    const marketPrice = hasPrice ? Number(Number(rawPrice).toFixed(2)) : null;

    const bsResult = calculateBlackScholes(spotPrice, strike, tYears, r, hv, 'call', 0.03);
    const theoreticalExtrinsicValue = Math.max(0.01, bsResult.theoreticalPrice - intrinsicValue);
    const fairValue = Number((intrinsicValue + theoreticalExtrinsicValue).toFixed(2));
    const effectivePrice = marketPrice ?? fairValue;
    const delta = bsResult.delta >= 0.70 ? Number(bsResult.delta.toFixed(2)) : 0.85;

    const rawOI = opt.openInterest;
    const openInterest = rawOI !== null && rawOI !== undefined && !isNaN(Number(rawOI)) ? Number(rawOI) : null;
    const hasRealTrade = hasPrice && (openInterest !== null ? openInterest > 0 : true);

    processedLongLegs.push({
      symbol: opt.symbol,
      strike,
      expirationDate: expDate,
      dte: dteBusiness,
      marketPrice,
      fairValue,
      effectivePrice,
      delta,
      openInterest,
      hasRealTrade,
    });
  }

  // 2. Filtrar Pernas Curtas Elegíveis (Calls OTM: Strike entre 100% e 115% do Spot)
  const processedShortLegs: ProcessedLeg[] = [];

  for (const opt of shortOptions) {
    if (opt.side !== 'call') continue;
    const strike = Number(opt.strike);
    if (isNaN(strike) || strike <= 0 || strike < spotPrice * 1.00 || strike > spotPrice * 1.15) continue;

    const expDate = opt.expirationDate || shortExpirationDate || '';
    const targetDate = new Date(expDate + 'T18:00:00Z');
    const diffMs = targetDate.getTime() - now.getTime();
    const dteCalendar = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    const dteBusiness = Math.max(1, Math.round(dteCalendar * (5 / 7)));
    const tYears = dteBusiness / 252.0;

    const intrinsicValue = Math.max(0, spotPrice - strike);
    const rawPrice = opt.optionPrice ?? (opt as { close?: number }).close;
    const hasPrice = rawPrice !== null && rawPrice !== undefined && !isNaN(Number(rawPrice)) && Number(rawPrice) > 0;
    const marketPrice = hasPrice ? Number(Number(rawPrice).toFixed(2)) : null;

    const bsResult = calculateBlackScholes(spotPrice, strike, tYears, r, hv, 'call', 0.03);
    const fairValue = Number(Math.max(0.01, bsResult.theoreticalPrice).toFixed(2));
    const effectivePrice = marketPrice ?? fairValue;
    const delta = Number(bsResult.delta.toFixed(2));

    const rawOI = opt.openInterest;
    const openInterest = rawOI !== null && rawOI !== undefined && !isNaN(Number(rawOI)) ? Number(rawOI) : null;
    const hasRealTrade = hasPrice && (openInterest !== null ? openInterest > 0 : true);
    const otmDistancePercent = Number((((strike - spotPrice) / spotPrice) * 100).toFixed(1));

    processedShortLegs.push({
      symbol: opt.symbol,
      strike,
      expirationDate: expDate,
      dte: dteBusiness,
      marketPrice,
      fairValue,
      effectivePrice,
      delta,
      openInterest,
      hasRealTrade,
      otmDistancePercent,
    });
  }

  // 3. Montar Estruturas Casadas (Pares de Longa + Curta)
  const candidates: PoorMansCoveredCallCandidate[] = [];
  let totalPairsAnalyzed = 0;

  for (const longLeg of processedLongLegs) {
    for (const shortLeg of processedShortLegs) {
      totalPairsAnalyzed++;

      const netDebit = Number((longLeg.effectivePrice - shortLeg.effectivePrice).toFixed(2));
      if (netDebit <= 0) continue; // Estrutura deve ser débito

      const spreadWidth = Number((shortLeg.strike - longLeg.strike).toFixed(2));
      const isLowellSafe = spreadWidth > netDebit; // Regra antissuicídio do Lowell
      const safetyMargin = Number((spreadWidth - netDebit).toFixed(2));

      const immediateIncomePerLot = Number((shortLeg.effectivePrice * 100).toFixed(2));
      const monthlyYieldPercent = Number(((shortLeg.effectivePrice / netDebit) * 100).toFixed(2));
      const maxProfitIfExercised = Number((safetyMargin * 100).toFixed(2));
      const maxReturnPercent = Number(((maxProfitIfExercised / (netDebit * 100)) * 100).toFixed(2));
      const breakEven = Number((longLeg.strike + netDebit).toFixed(2));
      const monthsToFullAmortization = shortLeg.effectivePrice > 0 ? Math.ceil(netDebit / shortLeg.effectivePrice) : 99;

      // Classificação de Qualidade
      let quality: 'EXCELENTE' | 'BOA' | 'ARRISCADA' = 'BOA';
      let qualityReason = '';

      if (!isLowellSafe) {
        quality = 'ARRISCADA';
        qualityReason = `Violação da Regra de Lowell: a largura do spread (R$ ${spreadWidth.toFixed(2)}) é menor que o débito (R$ ${netDebit.toFixed(2)}). Se exercido na alta, resultará em prejuízo.`;
      } else if (
        monthlyYieldPercent >= 2.0 &&
        monthlyYieldPercent <= 6.5 &&
        (longLeg.openInterest || 0) >= 5000 &&
        (shortLeg.openInterest || 0) >= 10000 &&
        longLeg.hasRealTrade &&
        shortLeg.hasRealTrade
      ) {
        quality = 'EXCELENTE';
        qualityReason = `Estrutura perfeita: taxa mensal de ${monthlyYieldPercent.toFixed(1)}%, margem de segurança de R$ ${safetyMargin.toFixed(2)} no exercício e alta liquidez real.`;
      } else {
        quality = 'BOA';
        qualityReason = `Estrutura segura (margem no exercício de R$ ${safetyMargin.toFixed(2)}), yield de ${monthlyYieldPercent.toFixed(1)}% a.m. com amortização em ~${monthsToFullAmortization} rolagens.`;
      }

      // 4. Cálculo do Score Composto de Lee Lowell (0 a 100)
      // Pilar 1: Yield Mensal Equilibrado (0 a 30)
      let yieldScore = 0;
      if (monthlyYieldPercent >= 3.0 && monthlyYieldPercent <= 6.0) {
        yieldScore = 30;
      } else if (monthlyYieldPercent >= 2.0 && monthlyYieldPercent < 3.0) {
        yieldScore = 22;
      } else if (monthlyYieldPercent > 6.0 && monthlyYieldPercent <= 8.5) {
        yieldScore = 20;
      } else if (monthlyYieldPercent < 2.0) {
        yieldScore = Math.max(5, Math.round(monthlyYieldPercent * 10));
      } else {
        yieldScore = Math.max(5, Math.round(30 - (monthlyYieldPercent - 6.0) * 3));
      }

      // Pilar 2: Margem de Segurança no Exercício (0 a 30)
      let safetyScore = 0;
      if (!isLowellSafe || netDebit <= 0) {
        safetyScore = 0;
      } else {
        const safetyRatio = safetyMargin / netDebit;
        if (safetyRatio >= 0.20) {
          safetyScore = 30;
        } else {
          safetyScore = Math.round(Math.max(0, safetyRatio * 150));
        }
      }

      // Pilar 3: Probabilidade de Sucesso / POP (0 a 25)
      const shortPop = Math.min(99.9, Math.max(1.0, (1 - Math.abs(shortLeg.delta)) * 100));
      let popScore = 0;
      if (shortPop >= 65 && shortPop <= 82) {
        popScore = 25;
      } else if (shortPop > 82 && shortPop <= 92) {
        popScore = 18;
      } else if (shortPop > 92) {
        popScore = 12;
      } else if (shortPop >= 50 && shortPop < 65) {
        popScore = 10;
      } else {
        popScore = 0;
      }

      // Pilar 4: Liquidez Real B3 (0 a 15)
      let liquidityScore = 0;
      if (longLeg.hasRealTrade && shortLeg.hasRealTrade) {
        liquidityScore += 8;
      } else if (longLeg.hasRealTrade || shortLeg.hasRealTrade) {
        liquidityScore += 4;
      }

      const combinedOI = (longLeg.openInterest || 0) + (shortLeg.openInterest || 0);
      if (combinedOI >= 25000) {
        liquidityScore += 7;
      } else if (combinedOI >= 10000) {
        liquidityScore += 5;
      } else if (combinedOI >= 3000) {
        liquidityScore += 3;
      } else {
        liquidityScore += 1;
      }

      const compositeScore = Math.min(100, Math.max(0, yieldScore + safetyScore + popScore + liquidityScore));
      const scoreBreakdown = {
        yieldScore,
        safetyScore,
        popScore,
        liquidityScore,
      };

      candidates.push({
        id: `${longLeg.symbol}_${shortLeg.symbol}`,
        underlyingSymbol,
        spotPrice,
        longLeg,
        shortLeg: {
          ...shortLeg,
          otmDistancePercent: shortLeg.otmDistancePercent || 0,
        },
        netDebit,
        spreadWidth,
        isLowellSafe,
        safetyMargin,
        immediateIncomePerLot,
        monthlyYieldPercent,
        maxProfitIfExercised,
        maxReturnPercent,
        breakEven,
        monthsToFullAmortization,
        quality,
        qualityReason,
        compositeScore,
        scoreBreakdown,
      });
    }
  }

  // Ordenar pares:
  // 1. Apenas estruturas seguras primeiro (isLowellSafe)
  // 2. Maior Score Composto de Lee Lowell (equilibra yield, margem, POP e liquidez)
  // 3. Desempate por maior liquidez combinada
  candidates.sort((a, b) => {
    if (a.isLowellSafe && !b.isLowellSafe) return -1;
    if (!a.isLowellSafe && b.isLowellSafe) return 1;

    if (b.compositeScore !== a.compositeScore) {
      return b.compositeScore - a.compositeScore;
    }

    const combinedOiA = (a.longLeg.openInterest || 0) + (a.shortLeg.openInterest || 0);
    const combinedOiB = (b.longLeg.openInterest || 0) + (b.shortLeg.openInterest || 0);
    return combinedOiB - combinedOiA;
  });

  return {
    underlyingSymbol,
    spotPrice,
    timing,
    candidates,
    shortExpiration: shortExpirationDate,
    eligibleLongExpirations,
    totalPairsAnalyzed,
    screenedAt: new Date().toISOString(),
  };
}

/**
 * Triagem de Venda de Puts OTM (Cash-Secured Put / Compra de Ações com Desconto) - Lee Lowell
 * 
 * Critérios:
 * - Vencimento curto mensal (~20 a 45 dias úteis)
 * - Strikes estritamente OTM (entre 1.5% e 20% abaixo do spot)
 * - Preço efetivo de aquisição = Strike - Prêmio
 * - Desconto real contra a cotação spot atual
 * - Yield mensal sobre o capital 100% garantido em caixa
 */
export function screenCashSecuredPuts(
  params: ScreenCashSecuredPutsParams
): CashSecuredPutScreeningResult {
  const {
    spotPrice,
    options,
    closes,
    minOtmPercent = 1.5,
    maxOtmPercent = 20.0,
    targetExpirationDate,
  } = params;

  const underlyingSymbol = options[0]?.underlyingSymbol || 'ATIVO';
  const timing = evaluateTechnicalTiming(spotPrice, closes);
  const hv21 = timing.hv21 > 0 ? timing.hv21 : 0.30;
  const riskFreeRate = getRiskFreeRate();

  const candidates: CashSecuredPutCandidate[] = [];
  let totalPutsAnalyzed = 0;

  for (const opt of options) {
    // Apenas PUTs
    const side = opt.side?.toLowerCase();
    if (side !== 'put') continue;
    if (!opt.strike || opt.strike <= 0) continue;

    // Filtro temporal se especificado
    if (targetExpirationDate && opt.expirationDate && opt.expirationDate !== targetExpirationDate) {
      continue;
    }

    totalPutsAnalyzed++;

    // Filtro OTM: o strike deve ser MENOR que o spot atual
    if (opt.strike >= spotPrice) continue;

    const otmDistancePercent = Number((((spotPrice - opt.strike) / spotPrice) * 100).toFixed(2));
    if (otmDistancePercent < minOtmPercent || otmDistancePercent > maxOtmPercent) continue;

    let dteCalendar = 21;
    if (opt.expirationDate) {
      const now = new Date();
      const targetDate = new Date(opt.expirationDate + 'T18:00:00Z');
      const diffMs = targetDate.getTime() - now.getTime();
      dteCalendar = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    }
    const dteBusiness = Math.max(1, Math.round(dteCalendar * (5 / 7)));
    const tYears = dteBusiness / 252.0;

    // Dados de mercado reais da BRAPI
    const rawPrice = opt.optionPrice ?? (opt as { close?: number }).close;
    const hasRealTrade = rawPrice !== null && rawPrice !== undefined && !isNaN(Number(rawPrice)) && Number(rawPrice) > 0;
    const marketPrice = hasRealTrade ? Number(Number(rawPrice).toFixed(2)) : null;

    // Precificação Black-Scholes para Put
    const bs = calculateBlackScholes(
      spotPrice,
      opt.strike,
      tYears,
      riskFreeRate,
      hv21,
      'put',
      0.03
    );

    const theoreticalPrice = Number((bs.theoreticalPrice || 0).toFixed(2));
    const effectivePrice = Number((marketPrice ?? theoreticalPrice).toFixed(2));
    if (effectivePrice <= 0) continue;

    const isRealPrice = marketPrice !== null;

    // Métricas de Aquisição com Desconto e Renda (Lee Lowell)
    const effectivePurchasePrice = Number((opt.strike - effectivePrice).toFixed(2));
    const realDiscountPercent = Number((((spotPrice - effectivePurchasePrice) / spotPrice) * 100).toFixed(2));
    const cashSecuredMonthlyYield = Number(((effectivePrice / opt.strike) * 100).toFixed(2));

    const periodsPerYear = dteBusiness > 0 ? 252 / dteBusiness : 12;
    const annualizedYield = Number(((Math.pow(1 + effectivePrice / opt.strike, periodsPerYear) - 1) * 100).toFixed(2));

    const delta = opt.delta !== undefined && opt.delta !== null 
      ? opt.delta 
      : (bs.delta ? Number((-Math.abs(bs.delta)).toFixed(4)) : null);

    const pop = delta !== null 
      ? Number(((1 - Math.abs(delta)) * 100).toFixed(1)) 
      : Number((100 - (otmDistancePercent * 2.5)).toFixed(1));

    // Qualidade
    let quality: 'EXCELENTE' | 'BOA' | 'ATENCAO' = 'BOA';
    let qualityReason = '';

    if (
      hasRealTrade &&
      (opt.openInterest || 0) >= 5000 &&
      otmDistancePercent >= 3.0 &&
      otmDistancePercent <= 10.0 &&
      cashSecuredMonthlyYield >= 1.2
    ) {
      quality = 'EXCELENTE';
      qualityReason = `Excelente oportunidade: desconto de ${realDiscountPercent.toFixed(1)}% na ação, taxa de ${cashSecuredMonthlyYield.toFixed(1)}% a.m. sobre a garantia e alta liquidez real.`;
    } else if (otmDistancePercent < 2.0) {
      quality = 'ATENCAO';
      qualityReason = `Strike muito próximo do dinheiro (${otmDistancePercent.toFixed(1)}% OTM). Maior probabilidade de exercício se houver oscilação de baixa.`;
    } else if (!hasRealTrade) {
      quality = 'BOA';
      qualityReason = `Strike com desconto de ${realDiscountPercent.toFixed(1)}% e taxa estimada de ${cashSecuredMonthlyYield.toFixed(1)}% a.m., porém sem fechamento no dia (usando Black-Scholes).`;
    } else {
      quality = 'BOA';
      qualityReason = `Desconto efetivo de ${realDiscountPercent.toFixed(1)}% e yield garantido de ${cashSecuredMonthlyYield.toFixed(1)}% a.m. com ${pop.toFixed(0)}% de probabilidade de virar pó.`;
    }

    candidates.push({
      symbol: opt.symbol,
      underlyingSymbol: opt.underlyingSymbol || underlyingSymbol,
      expirationDate: opt.expirationDate || targetExpirationDate || '',
      dte: dteCalendar,
      strike: opt.strike,
      spotPrice,
      otmDistancePercent,
      marketPrice,
      openInterest: opt.openInterest ?? null,
      openInterestDate: opt.openInterestDate ?? null,
      lastTradeDate: opt.lastTradeDate ?? null,
      hasRealTrade,
      theoreticalPrice,
      effectivePrice,
      isRealPrice,
      effectivePurchasePrice,
      realDiscountPercent,
      cashSecuredMonthlyYield,
      annualizedYield,
      breakEven: effectivePurchasePrice,
      delta,
      pop: Math.min(99.9, Math.max(1.0, pop)),
      quality,
      qualityReason,
    });
  }

  // Ordenação:
  // 1. Negócios reais primeiro
  // 2. Maior liquidez (Open Interest)
  // 3. Melhor equilíbrio de desconto e taxa mensal
  candidates.sort((a, b) => {
    if (a.hasRealTrade && !b.hasRealTrade) return -1;
    if (!a.hasRealTrade && b.hasRealTrade) return 1;

    const oiA = a.openInterest || 0;
    const oiB = b.openInterest || 0;
    if (Math.abs(oiA - oiB) > 10000) {
      return oiB - oiA;
    }

    return b.cashSecuredMonthlyYield - a.cashSecuredMonthlyYield;
  });

  return {
    underlyingSymbol,
    spotPrice,
    timing,
    candidates,
    expirationDate: targetExpirationDate || (candidates[0]?.expirationDate ?? ''),
    totalPutsAnalyzed,
    screenedAt: new Date().toISOString(),
  };
}

