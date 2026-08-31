/**
 * MOTOR ÚNICO DE RECOMENDAÇÃO E ELEIÇÃO DE ESTRATÉGIAS DE OPÇÕES B3
 * Radar B3 Pro IA — Especificação Técnica v2.2 (31/08/2026)
 *
 * Correções Fundamentais v2.2:
 * 1. Remoção do gate de confidence como filtro de elegibilidade (confidence qualifica cálculo analítico, não negociabilidade).
 * 2. Elegibilidade separada por papel: MIN_PRICE e MIN_OI diferenciados para perna vendida (recebe) e comprada (paga seguro).
 * 3. Busca e ranqueamento no Espaço de Pares (Pair Space Search) com função de score multi-critério e desempate determinístico.
 * 4. electBestOptionStrategy nunca mais retorna null por regra de negócio — retorna objeto com motivo estruturado e diagnóstico numérico.
 * 5. IV ATM com mediana, descarte de outliers (+-40%) e amostra mínima de 3 séries.
 * 6. Asserção obrigatória de coerência direcional (assertDirection) mantida em 100% das estruturas.
 */

import {
  OptionAnalysisResult,
  OptionAnalyticsItem,
  PriceContext,
  BlockReason,
  StructureBlock,
  StructureBlockDiagnostics,
} from '../types/financial';
import {
  OPTION_25_STRATEGIES,
  OptionStrategySpec,
} from './cme-strategies';
import { classifyVolatilityRegime } from './volatility';
import { CNPI_RULES } from '../config/rules';

export interface OptionLegDetail {
  action: 'COMPRA' | 'VENDA';
  symbol: string;
  strike: number;
  type: 'CALL' | 'PUT';
  unitPrice: number;
  lotQuantity: number;
  totalFinancial: number;
  openInterest: number;
  delta?: number;
  confidence?: string;
  roleDescription?: string;
}

export type CMELegDetail = OptionLegDetail;

export interface ElectedOptionStrategy {
  strategySpec: OptionStrategySpec;
  title: string;
  bias: 'ALTA' | 'BAIXA' | 'LATERAL' | 'VOLATILIDADE' | 'NEUTRO';
  status: 'AUTORIZADA' | 'EM_ANALISE' | 'BLOQUEADA';
  expirationDate: string;
  dte: number;
  underlyingSymbol: string;
  underlyingPrice: number;

  // Contexto de data e defasagem de preço
  priceContext?: PriceContext;

  // Detalhes de Bloqueio Estruturado e Diagnóstico (Spec v2.2)
  blockDetails?: StructureBlock;
  diagnosticsSummary?: string;

  // Detalhes da montagem financeira
  legs: OptionLegDetail[];
  netCostOrCredit: number; // Por cota
  isCredit: boolean;
  totalCostOrCreditForLot: number; // Para 1 lote padrão (1.000 cotas)
  spreadWidth: number;
  breakEven: number;
  maxProfit: number;
  maxProfitLot: number;
  maxLoss: number;
  maxLossLot: number;
  returnOnRiskPct: number;
  riskRewardRatio: string;

  // Explicação didática de conferência antes da ordem
  tradeCheckGuide?: string;

  // Gatilhos de saída operacionais
  takeProfitRule: {
    targetPrice: string;
    profitGoal: string;
    description: string;
  };
  stopLossRule: {
    stopPrice: string;
    lossLimit: string;
    description: string;
  };
  timeStopRule: {
    dteLimit: number;
    description: string;
  };

  // Racional da Eleição
  electionRationale: string[];

  // Boleta de Envio para Home Broker / Genial / Profit
  homeBrokerOrderSlip: {
    orderType: string;
    entryPriceRange: string;
    maxSlippage: string;
    legsSummary: string;
  };
}

export class StructureDirectionError extends Error {
  constructor(strategyName: string, bias: string, reason: string) {
    super(`Erro de coerência direcional na estratégia "${strategyName}" (${bias}): ${reason}`);
    this.name = 'StructureDirectionError';
  }
}

/**
 * Mensagens padronizadas por motivo de bloqueio (Spec v2.2 - Seção 6)
 */
export const BLOCK_MESSAGES: Record<BlockReason, string> = {
  SEM_ANALYTICS: 'Não há dados de opções publicados para este ativo neste vencimento.',
  SEM_SERIES_ELEGIVEIS:
    'As séries deste vencimento não atendem aos critérios mínimos de negociação (prêmio, contratos em aberto ou negociação recente).',
  SEM_PAR_VALIDO:
    'Há séries negociáveis, mas nenhuma combinação atende à largura e ao prêmio mínimos da trava. Grade de strikes muito curta neste vencimento.',
  DELTA_FORA_DA_FAIXA:
    'Nenhuma série com distância segura do preço atual. Montar a trava exigiria vender opção próxima do dinheiro.',
  VOL_COMPRIMIDA:
    'Volatilidade implícita comprimida — venda de prêmio não compensa o risco de rompimento.',
  DTE_FORA_DA_JANELA: 'Vencimento fora da janela operacional ideal de 12 a 35 dias úteis.',
  PRECO_DEFASADO: 'Preços de referência com defasagem excessiva (> 3%) em relação ao mercado atual.',
  FUNDAMENTOS_REPROVADOS:
    'Montagem de estruturas direcionais de compra/alta bloqueada devido à reprovação nos fundamentos contábeis (evitar Value Trap).',
  IV_INDISPONIVEL: 'Sem volatilidade implícita confiável nas séries próximas ao preço.',
};

/**
 * Calcula o payoff financeiro por cota de um conjunto de pernas em determinado preço no vencimento (S)
 */
export function payoffAt(legs: OptionLegDetail[], spotAtExpiry: number): number {
  let netPayoff = 0;
  for (const leg of legs) {
    const intrinsic =
      leg.type === 'CALL'
        ? Math.max(0, spotAtExpiry - leg.strike)
        : Math.max(0, leg.strike - spotAtExpiry);

    if (leg.action === 'COMPRA') {
      netPayoff += intrinsic - leg.unitPrice;
    } else {
      netPayoff += leg.unitPrice - intrinsic;
    }
  }
  return Number(netPayoff.toFixed(2));
}

/**
 * Validação rigorosa de coerência direcional entre o viés esperado e o payoff real no vencimento
 */
export function assertDirection(strategy: ElectedOptionStrategy, spot: number): void {
  if (strategy.status === 'BLOQUEADA' || strategy.status === 'EM_ANALISE' || strategy.legs.length === 0) {
    return;
  }

  const low = payoffAt(strategy.legs, spot * 0.5);
  const high = payoffAt(strategy.legs, spot * 1.5);
  const mid = payoffAt(strategy.legs, spot);

  if (strategy.bias === 'ALTA' && !(high > low)) {
    throw new StructureDirectionError(
      strategy.title,
      strategy.bias,
      `Payoff na alta (+50%: R$ ${high.toFixed(2)}) deve ser maior que na baixa (-50%: R$ ${low.toFixed(2)}).`
    );
  }

  if (strategy.bias === 'BAIXA' && !(low > high)) {
    throw new StructureDirectionError(
      strategy.title,
      strategy.bias,
      `Payoff na baixa (-50%: R$ ${low.toFixed(2)}) deve ser maior que na alta (+50%: R$ ${high.toFixed(2)}).`
    );
  }

  if (strategy.bias === 'LATERAL' && !(mid > low && mid > high)) {
    throw new StructureDirectionError(
      strategy.title,
      strategy.bias,
      `Payoff no miolo (R$ ${mid.toFixed(2)}) deve ser estritamente maior que nos dois extremos.`
    );
  }
}

/**
 * Valida se uma série atende aos critérios de elegibilidade para um papel específico (SHORT ou LONG)
 * Conforme Spec v2.2 - Seção 7
 */
export function isEligibleLeg(
  o: OptionAnalyticsItem,
  role: 'SHORT' | 'LONG',
  spot: number,
  snapshotDate?: string
): boolean {
  const rules = CNPI_RULES.DERIVATIVES.LEG_ELIGIBILITY;
  const minPrice =
    role === 'SHORT'
      ? Math.max(rules.MIN_PRICE_SHORT_LEG, spot * rules.MIN_PRICE_SHORT_PCT_OF_SPOT)
      : rules.MIN_PRICE_LONG_LEG;
  const minOi = role === 'SHORT' ? rules.MIN_OI_SHORT_LEG : rules.MIN_OI_LONG_LEG;

  // 1. nullReason deve ser nulo
  if (o.nullReason !== null && o.nullReason !== undefined) return false;

  // 2. Preço mínimo para o papel da perna
  if (o.optionPrice === null || o.optionPrice === undefined || o.optionPrice < minPrice) return false;

  // 3. Open Interest mínimo para o papel da perna
  if ((o.openInterest || 0) < minOi) return false;

  // 4. Negociação no pregão do snapshot (se fornecido)
  if (rules.REQUIRE_TRADED_ON_SNAPSHOT_DATE && snapshotDate && o.lastTradeDate) {
    if (o.lastTradeDate !== snapshotDate) return false;
  }

  // 5. Delta na faixa operacional [0.05, 0.95]
  if (o.delta === null || o.delta === undefined) return false;
  const absDelta = Math.abs(o.delta);
  if (absDelta < rules.MIN_ABS_DELTA || absDelta > rules.MAX_ABS_DELTA) return false;

  // 6. IV presente e positiva
  if (o.impliedVolatility === null || o.impliedVolatility === undefined || o.impliedVolatility <= 0) return false;

  return true;
}

/**
 * Converte confiança em pontuação numérica para desempate
 */
function confidenceScore(conf?: string): number {
  const c = (conf || 'medium').toLowerCase();
  if (c === 'high') return 2;
  if (c === 'medium') return 1;
  return 0;
}

/**
 * Cria um objeto padronizado de estratégia bloqueada com diagnósticos completos
 */
function createBlockedStrategy(
  symbol: string,
  spot: number,
  expDate: string,
  dte: number,
  bias: 'ALTA' | 'BAIXA' | 'LATERAL' | 'NEUTRO',
  reason: BlockReason,
  diagnostics: StructureBlockDiagnostics,
  priceContext?: PriceContext,
  customRationale?: string[]
): ElectedOptionStrategy {
  const message = BLOCK_MESSAGES[reason] || 'Estrutura de opções não autorizada neste vencimento.';
  const blockDetails: StructureBlock = {
    status: 'BLOQUEADA',
    reason,
    message,
    diagnostics,
  };

  const diagnosticsSummary = `${diagnostics.seriesInChain} séries na cadeia · ${diagnostics.seriesEligible} elegíveis · ${diagnostics.validPairs} pares válidos`;

  return {
    strategySpec: OPTION_25_STRATEGIES[0],
    title: `Estratégia Não Autorizada: ${message}`,
    bias,
    status: reason === 'PRECO_DEFASADO' ? 'EM_ANALISE' : 'BLOQUEADA',
    expirationDate: expDate,
    dte,
    underlyingSymbol: symbol,
    underlyingPrice: spot,
    priceContext,
    blockDetails,
    diagnosticsSummary,
    legs: [],
    netCostOrCredit: 0,
    isCredit: false,
    totalCostOrCreditForLot: 0,
    spreadWidth: 0,
    breakEven: spot,
    maxProfit: 0,
    maxProfitLot: 0,
    maxLoss: 0,
    maxLossLot: 0,
    returnOnRiskPct: 0,
    riskRewardRatio: '0 : 0',
    takeProfitRule: { targetPrice: '—', profitGoal: '—', description: '—' },
    stopLossRule: { stopPrice: '—', lossLimit: '—', description: '—' },
    timeStopRule: { dteLimit: 0, description: '—' },
    electionRationale: customRationale || [message, diagnosticsSummary],
    homeBrokerOrderSlip: {
      orderType: 'BLOQUEADO',
      entryPriceRange: 'Nenhuma ordem autorizada',
      maxSlippage: '0',
      legsSummary: `OPERAÇÃO BLOQUEADA (${reason}): ${message}`,
    },
  };
}

/**
 * Motor Único de Inteligência para Eleição da Melhor Estratégia de Opções B3 (Spec v2.2)
 */
export function electBestOptionStrategy(
  symbol: string,
  spotPrice: number,
  verdict: string,
  trend: 'ALTA' | 'BAIXA' | 'LATERAL',
  rsi: number | null,
  hv21: number,
  optionAnalysis?: OptionAnalysisResult,
  fundamentalStatus?: 'APROVADO' | 'REPROVADO',
  analyticsList: OptionAnalyticsItem[] = []
): ElectedOptionStrategy {
  const spot = spotPrice > 0 ? spotPrice : optionAnalysis?.underlyingPrice || 10.0;
  const dte = optionAnalysis?.selectedExpirationInfo?.dte || 15;
  const expDate = optionAnalysis?.selectedExpiration || '2026-09-18';
  const lotSize = 1000;
  const bias: 'ALTA' | 'BAIXA' | 'LATERAL' | 'NEUTRO' =
    trend === 'ALTA' ? 'ALTA' : trend === 'BAIXA' ? 'BAIXA' : trend === 'LATERAL' ? 'LATERAL' : 'NEUTRO';

  // 1. Verificação se há analytics disponível
  if (!analyticsList || analyticsList.length === 0) {
    return createBlockedStrategy(symbol, spot, expDate, dte, bias, 'SEM_ANALYTICS', {
      seriesInChain: 0,
      seriesEligible: 0,
      validPairs: 0,
      bestShortDelta: null,
      dte,
      spotDriftPct: 0,
    });
  }

  // 2. Contexto de Data e Drift de Preço (Spec v2.1/v2.2)
  const firstAnalyticWithUnderlying = analyticsList.find((a) => a.underlyingPrice !== undefined && a.underlyingPrice > 0);
  const priceUnderlying = firstAnalyticWithUnderlying?.underlyingPrice || optionAnalysis?.underlyingPrice || spot;
  const snapshotDate = firstAnalyticWithUnderlying?.lastTradeDate || firstAnalyticWithUnderlying?.openInterestDate || optionAnalysis?.openInterestDate;
  const priceDate = snapshotDate || 'Fechamento D-1';
  const spotDriftPct = Number((((spot - priceUnderlying) / priceUnderlying) * 100).toFixed(2));
  const isStale = Math.abs(spotDriftPct) > CNPI_RULES.DERIVATIVES.SPOT_DRIFT.WARN_THRESHOLD_PCT;
  const isBlockedByDrift = Math.abs(spotDriftPct) > CNPI_RULES.DERIVATIVES.SPOT_DRIFT.BLOCK_THRESHOLD_PCT;

  const priceContext: PriceContext = {
    priceDate,
    priceUnderlying,
    currentSpot: spot,
    spotDriftPct,
    isStale,
    warningMessage: isStale
      ? `⚠️ Prêmios de fechamento de ${priceDate}, com o ativo em R$ ${priceUnderlying.toFixed(2)}. O ativo está ${spotDriftPct > 0 ? '+' : ''}${spotDriftPct}% distante desse nível — confirme os preços das duas pontas no book antes de enviar a ordem.`
      : undefined,
  };

  // 3. Bloqueio por Fundamentos Reprovados (Value Trap)
  const isBlockedVerdict =
    verdict.includes('BLOQUEADO') ||
    verdict === 'BLOQUEADO_POR_FUNDAMENTOS' ||
    (fundamentalStatus === 'REPROVADO' && (verdict.includes('COMPRA') || trend === 'ALTA' || trend === 'LATERAL'));

  if (isBlockedVerdict) {
    return createBlockedStrategy(
      symbol,
      spot,
      expDate,
      dte,
      bias,
      'FUNDAMENTOS_REPROVADOS',
      {
        seriesInChain: analyticsList.length,
        seriesEligible: 0,
        validPairs: 0,
        bestShortDelta: null,
        dte,
        spotDriftPct,
      },
      priceContext,
      [
        `Empresa reprovada no crivo fundamentalista (prejuízo líquido recorrente ou superendividamento).`,
        `Montagem de estratégias altistas bloqueada para mitigar o risco de Armadilha de Valor (Value Trap).`,
      ]
    );
  }

  // 4. Bloqueio por Spot Drift Excessivo (> 3.0%)
  if (isBlockedByDrift) {
    return createBlockedStrategy(
      symbol,
      spot,
      expDate,
      dte,
      bias,
      'PRECO_DEFASADO',
      {
        seriesInChain: analyticsList.length,
        seriesEligible: 0,
        validPairs: 0,
        bestShortDelta: null,
        dte,
        spotDriftPct,
      },
      priceContext,
      [
        `O ativo oscilou ${spotDriftPct}% desde o fechamento dos prêmios de derivativos (${priceDate}).`,
        `Prêmios de fechamento não reproduzem mais o mercado atual (|spot drift| > 3.0%). Consulte o book de ofertas ao vivo.`,
      ]
    );
  }

  // 5. Verificação de DTE (12 a 35 dias úteis)
  const expRules = CNPI_RULES.DERIVATIVES.EXPIRATION;
  if (dte < expRules.MIN_DTE || dte > expRules.MAX_DTE) {
    return createBlockedStrategy(
      symbol,
      spot,
      expDate,
      dte,
      bias,
      'DTE_FORA_DA_JANELA',
      {
        seriesInChain: analyticsList.length,
        seriesEligible: 0,
        validPairs: 0,
        bestShortDelta: null,
        dte,
        spotDriftPct,
      },
      priceContext,
      [`Vencimento a ${dte} dias úteis está fora da janela recomendada de ${expRules.MIN_DTE} a ${expRules.MAX_DTE} dias úteis.`]
    );
  }

  const spreadRules = CNPI_RULES.DERIVATIVES.SPREAD;
  const maxChainOi = Math.max(...analyticsList.map((a) => a.openInterest || 0), 1);

  // =========================================================================
  // CENÁRIO 1: ALTA / COMPRA (Bull Put Spread a Crédito com Busca no Espaço de Pares)
  // =========================================================================
  if (verdict.includes('COMPRA') || trend === 'ALTA') {
    const putSeries = analyticsList.filter((a) => a.side.toLowerCase() === 'put' && a.strike < spot);
    const eligibleShortPuts = putSeries.filter((p) => isEligibleLeg(p, 'SHORT', spot, snapshotDate));
    const eligibleLongPuts = putSeries.filter((p) => isEligibleLeg(p, 'LONG', spot, snapshotDate));
    const totalEligibleCount = new Set([...eligibleShortPuts.map((p) => p.symbol), ...eligibleLongPuts.map((p) => p.symbol)]).size;

    if (eligibleShortPuts.length === 0 && eligibleLongPuts.length === 0) {
      return createBlockedStrategy(symbol, spot, expDate, dte, bias, 'SEM_SERIES_ELEGIVEIS', {
        seriesInChain: putSeries.length,
        seriesEligible: 0,
        validPairs: 0,
        bestShortDelta: null,
        dte,
        spotDriftPct,
      }, priceContext);
    }

    // Filtrar candidatos a perna vendida com |delta| <= SHORT_LEG_DELTA_MAX (0.38)
    const validShortCandidates = eligibleShortPuts.filter((p) => Math.abs(p.delta!) <= spreadRules.SHORT_LEG_DELTA_MAX);
    const bestShortDelta = validShortCandidates.length > 0
      ? validShortCandidates.reduce((prev, curr) => Math.abs(Math.abs(curr.delta!) - spreadRules.SHORT_LEG_DELTA_TARGET) < Math.abs(Math.abs(prev.delta!) - spreadRules.SHORT_LEG_DELTA_TARGET) ? curr : prev).delta || null
      : eligibleShortPuts[0]?.delta || null;

    if (validShortCandidates.length === 0) {
      return createBlockedStrategy(symbol, spot, expDate, dte, bias, 'DELTA_FORA_DA_FAIXA', {
        seriesInChain: putSeries.length,
        seriesEligible: totalEligibleCount,
        validPairs: 0,
        bestShortDelta,
        dte,
        spotDriftPct,
      }, priceContext);
    }

    // Gerar todos os pares válidos (curta, longa)
    interface CandidatePair {
      shortLeg: OptionAnalyticsItem;
      longLeg: OptionAnalyticsItem;
      width: number;
      netCredit: number;
      creditRatio: number;
      score: number;
    }

    const validPairs: CandidatePair[] = [];

    for (const shortLeg of validShortCandidates) {
      for (const longLeg of eligibleLongPuts) {
        if (shortLeg.strike <= longLeg.strike) continue;

        const width = Number((shortLeg.strike - longLeg.strike).toFixed(2));
        const widthPct = width / spot;
        if (widthPct < spreadRules.MIN_WIDTH_PCT_OF_SPOT || widthPct > spreadRules.MAX_WIDTH_PCT_OF_SPOT) {
          continue;
        }

        const shortPrice = shortLeg.optionPrice!;
        const longPrice = longLeg.optionPrice!;
        const netCredit = Number((shortPrice - longPrice).toFixed(2));
        if (netCredit <= 0) continue;

        const creditRatio = netCredit / width;
        if (creditRatio < spreadRules.MIN_CREDIT_TO_WIDTH || creditRatio > spreadRules.MAX_CREDIT_TO_WIDTH) {
          continue;
        }

        // Função de Score (Spec v2.2 - Seção 3: Pesos 0.40, 0.15, 0.25, 0.20)
        const scoreShortDelta = 1 - Math.min(1, Math.abs(Math.abs(shortLeg.delta!) - spreadRules.SHORT_LEG_DELTA_TARGET) / spreadRules.SHORT_LEG_DELTA_TARGET);
        const scoreLongDelta = 1 - Math.min(1, Math.abs(Math.abs(longLeg.delta!) - spreadRules.LONG_LEG_DELTA_TARGET) / spreadRules.LONG_LEG_DELTA_TARGET);
        const scoreReturn = Math.min(1, (netCredit / (width - netCredit)) / 0.50);
        const minPairOi = Math.min(shortLeg.openInterest || 0, longLeg.openInterest || 0);
        const scoreLiquidity = Math.min(1, minPairOi / maxChainOi);

        const score = Number((0.40 * scoreShortDelta + 0.15 * scoreLongDelta + 0.25 * scoreReturn + 0.20 * scoreLiquidity).toFixed(4));

        validPairs.push({
          shortLeg,
          longLeg,
          width,
          netCredit,
          creditRatio,
          score,
        });
      }
    }

    if (validPairs.length === 0) {
      return createBlockedStrategy(symbol, spot, expDate, dte, bias, 'SEM_PAR_VALIDO', {
        seriesInChain: putSeries.length,
        seriesEligible: totalEligibleCount,
        validPairs: 0,
        bestShortDelta,
        dte,
        spotDriftPct,
      }, priceContext);
    }

    // Ranquear pares por score decrescente com desempate determinístico
    validPairs.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const confA = confidenceScore(a.shortLeg.confidence) + confidenceScore(a.longLeg.confidence);
      const confB = confidenceScore(b.shortLeg.confidence) + confidenceScore(b.longLeg.confidence);
      if (confB !== confA) return confB - confA;
      const minOiA = Math.min(a.shortLeg.openInterest || 0, a.longLeg.openInterest || 0);
      const minOiB = Math.min(b.shortLeg.openInterest || 0, b.longLeg.openInterest || 0);
      if (minOiB !== minOiA) return minOiB - minOiA;
      return a.width - b.width;
    });

    const electedPair = validPairs[0];
    const shortPut = electedPair.shortLeg;
    const longPut = electedPair.longLeg;
    const width = electedPair.width;
    const netCredit = electedPair.netCredit;
    const maxProfit = netCredit;
    const maxLoss = Number((width - netCredit).toFixed(2));
    const breakEven = Number((shortPut.strike - netCredit).toFixed(2));
    const returnPct = Number(((netCredit / maxLoss) * 100).toFixed(1));

    const legs: OptionLegDetail[] = [
      {
        action: 'VENDA',
        symbol: shortPut.symbol,
        strike: shortPut.strike,
        type: 'PUT',
        unitPrice: shortPut.optionPrice!,
        lotQuantity: lotSize,
        totalFinancial: Number((shortPut.optionPrice! * lotSize).toFixed(2)),
        openInterest: shortPut.openInterest || 0,
        delta: shortPut.delta,
        confidence: shortPut.confidence,
        roleDescription: `(strike MAIOR) recebe +R$ ${shortPut.optionPrice!.toFixed(2)}/cota  Δ ${shortPut.delta?.toFixed(2)} [conf: ${shortPut.confidence || 'low'}]`,
      },
      {
        action: 'COMPRA',
        symbol: longPut.symbol,
        strike: longPut.strike,
        type: 'PUT',
        unitPrice: longPut.optionPrice!,
        lotQuantity: lotSize,
        totalFinancial: Number((longPut.optionPrice! * lotSize).toFixed(2)),
        openInterest: longPut.openInterest || 0,
        delta: longPut.delta,
        confidence: longPut.confidence,
        roleDescription: `(strike MENOR) paga −R$ ${longPut.optionPrice!.toFixed(2)}/cota  Δ ${longPut.delta?.toFixed(2)}  ↳ proteção: limita perda a R$ ${(maxLoss * lotSize).toFixed(0)}`,
      },
    ];

    const diagnosticsSummary = `${putSeries.length} séries na cadeia · ${totalEligibleCount} elegíveis · ${validPairs.length} pares válidos`;

    const strategyResult: ElectedOptionStrategy = {
      strategySpec: OPTION_25_STRATEGIES[10], // #11 Bull Spread
      title: `Trava de Alta com Put a Crédito (Bull Put Spread ${shortPut.strike.toFixed(2)} / ${longPut.strike.toFixed(2)})`,
      bias: 'ALTA',
      status: 'AUTORIZADA',
      expirationDate: expDate,
      dte,
      underlyingSymbol: symbol,
      underlyingPrice: spot,
      priceContext,
      diagnosticsSummary,
      legs,
      netCostOrCredit: netCredit,
      isCredit: true,
      totalCostOrCreditForLot: Number((netCredit * lotSize).toFixed(2)),
      spreadWidth: width,
      breakEven,
      maxProfit,
      maxProfitLot: Number((maxProfit * lotSize).toFixed(2)),
      maxLoss,
      maxLossLot: Number((maxLoss * lotSize).toFixed(2)),
      returnOnRiskPct: returnPct,
      riskRewardRatio: `1 : ${(maxLoss / maxProfit).toFixed(1)}`,
      tradeCheckGuide: `Nesta trava você vende a put de strike maior (${shortPut.strike.toFixed(2)}) e compra a de strike menor (${longPut.strike.toFixed(2)}). Se no home broker a estrutura aparecer como "trava de baixa", as pernas foram invertidas — confira antes de enviar.`,
      takeProfitRule: {
        targetPrice: `R$ ${shortPut.strike.toFixed(2)} (ou superior no vencimento)`,
        profitGoal: `Capturar 75% a 80% do crédito máximo (R$ ${(netCredit * 0.8 * lotSize).toFixed(2)} no lote)`,
        description: `Encerrar a trava quando as opções perderem a maior parte do valor por decaimento temporal (Theta).`,
      },
      stopLossRule: {
        stopPrice: `Fechamento abaixo de R$ ${longPut.strike.toFixed(2)} ou perda do suporte`,
        lossLimit: `Stop se a perda atingir 2x o crédito recebido (R$ ${(netCredit * 2 * lotSize).toFixed(2)})`,
        description: `Desmontar imediatamente se o ativo romper o suporte e colocar em risco a perna vendida.`,
      },
      timeStopRule: {
        dteLimit: 5,
        description: `Desmontar a operação a 5 dias úteis do vencimento para evitar riscos de atribuição.`,
      },
      electionRationale: [
        `Ativo aprovado no crivo fundamentalista (CNPI-P) e com médias alinhadas em Tendência de Alta.`,
        `Perna vendida selecionada estritamente fora do dinheiro (OTM) no strike R$ ${shortPut.strike.toFixed(2)} (Δ ${shortPut.delta?.toFixed(2)}) com margem de segurança.`,
        `Perna de proteção comprada no strike R$ ${longPut.strike.toFixed(2)} garantindo perda máxima estritamente limitada.`,
      ],
      homeBrokerOrderSlip: {
        orderType: `Ordem de Spread Limite a Crédito (Vender ${shortPut.symbol} @ R$ ${shortPut.optionPrice!.toFixed(2)} / Comprar ${longPut.symbol} @ R$ ${longPut.optionPrice!.toFixed(2)})`,
        entryPriceRange: `Crédito Líquido alvo: R$ ${netCredit.toFixed(2)}`,
        maxSlippage: '0.03',
        legsSummary: `Vender 1.000 ${shortPut.symbol} (PUT @ ${shortPut.strike.toFixed(2)}) + Comprar 1.000 ${longPut.symbol} (PUT @ ${longPut.strike.toFixed(2)})`,
      },
    };

    assertDirection(strategyResult, spot);
    return strategyResult;
  }

  // =========================================================================
  // CENÁRIO 2: BAIXA / VENDA (Bear Call Spread a Crédito no Espaço de Pares)
  // =========================================================================
  if (verdict.includes('VENDA') || trend === 'BAIXA') {
    const callSeries = analyticsList.filter((a) => a.side.toLowerCase() === 'call' && a.strike > spot);
    const eligibleShortCalls = callSeries.filter((c) => isEligibleLeg(c, 'SHORT', spot, snapshotDate));
    const eligibleLongCalls = callSeries.filter((c) => isEligibleLeg(c, 'LONG', spot, snapshotDate));
    const totalEligibleCount = new Set([...eligibleShortCalls.map((c) => c.symbol), ...eligibleLongCalls.map((c) => c.symbol)]).size;

    if (eligibleShortCalls.length === 0 && eligibleLongCalls.length === 0) {
      return createBlockedStrategy(symbol, spot, expDate, dte, bias, 'SEM_SERIES_ELEGIVEIS', {
        seriesInChain: callSeries.length,
        seriesEligible: 0,
        validPairs: 0,
        bestShortDelta: null,
        dte,
        spotDriftPct,
      }, priceContext);
    }

    const validShortCandidates = eligibleShortCalls.filter((c) => Math.abs(c.delta!) <= spreadRules.SHORT_LEG_DELTA_MAX);
    const bestShortDelta = validShortCandidates.length > 0
      ? validShortCandidates.reduce((prev, curr) => Math.abs(Math.abs(curr.delta!) - spreadRules.SHORT_LEG_DELTA_TARGET) < Math.abs(Math.abs(prev.delta!) - spreadRules.SHORT_LEG_DELTA_TARGET) ? curr : prev).delta || null
      : eligibleShortCalls[0]?.delta || null;

    if (validShortCandidates.length === 0) {
      return createBlockedStrategy(symbol, spot, expDate, dte, bias, 'DELTA_FORA_DA_FAIXA', {
        seriesInChain: callSeries.length,
        seriesEligible: totalEligibleCount,
        validPairs: 0,
        bestShortDelta,
        dte,
        spotDriftPct,
      }, priceContext);
    }

    interface CandidatePair {
      shortLeg: OptionAnalyticsItem;
      longLeg: OptionAnalyticsItem;
      width: number;
      netCredit: number;
      creditRatio: number;
      score: number;
    }

    const validPairs: CandidatePair[] = [];

    for (const shortLeg of validShortCandidates) {
      for (const longLeg of eligibleLongCalls) {
        if (shortLeg.strike >= longLeg.strike) continue;

        const width = Number((longLeg.strike - shortLeg.strike).toFixed(2));
        const widthPct = width / spot;
        if (widthPct < spreadRules.MIN_WIDTH_PCT_OF_SPOT || widthPct > spreadRules.MAX_WIDTH_PCT_OF_SPOT) {
          continue;
        }

        const shortPrice = shortLeg.optionPrice!;
        const longPrice = longLeg.optionPrice!;
        const netCredit = Number((shortPrice - longPrice).toFixed(2));
        if (netCredit <= 0) continue;

        const creditRatio = netCredit / width;
        if (creditRatio < spreadRules.MIN_CREDIT_TO_WIDTH || creditRatio > spreadRules.MAX_CREDIT_TO_WIDTH) {
          continue;
        }

        const scoreShortDelta = 1 - Math.min(1, Math.abs(Math.abs(shortLeg.delta!) - spreadRules.SHORT_LEG_DELTA_TARGET) / spreadRules.SHORT_LEG_DELTA_TARGET);
        const scoreLongDelta = 1 - Math.min(1, Math.abs(Math.abs(longLeg.delta!) - spreadRules.LONG_LEG_DELTA_TARGET) / spreadRules.LONG_LEG_DELTA_TARGET);
        const scoreReturn = Math.min(1, (netCredit / (width - netCredit)) / 0.50);
        const minPairOi = Math.min(shortLeg.openInterest || 0, longLeg.openInterest || 0);
        const scoreLiquidity = Math.min(1, minPairOi / maxChainOi);

        const score = Number((0.40 * scoreShortDelta + 0.15 * scoreLongDelta + 0.25 * scoreReturn + 0.20 * scoreLiquidity).toFixed(4));

        validPairs.push({
          shortLeg,
          longLeg,
          width,
          netCredit,
          creditRatio,
          score,
        });
      }
    }

    if (validPairs.length === 0) {
      return createBlockedStrategy(symbol, spot, expDate, dte, bias, 'SEM_PAR_VALIDO', {
        seriesInChain: callSeries.length,
        seriesEligible: totalEligibleCount,
        validPairs: 0,
        bestShortDelta,
        dte,
        spotDriftPct,
      }, priceContext);
    }

    validPairs.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const confA = confidenceScore(a.shortLeg.confidence) + confidenceScore(a.longLeg.confidence);
      const confB = confidenceScore(b.shortLeg.confidence) + confidenceScore(b.longLeg.confidence);
      if (confB !== confA) return confB - confA;
      const minOiA = Math.min(a.shortLeg.openInterest || 0, a.longLeg.openInterest || 0);
      const minOiB = Math.min(b.shortLeg.openInterest || 0, b.longLeg.openInterest || 0);
      if (minOiB !== minOiA) return minOiB - minOiA;
      return a.width - b.width;
    });

    const electedPair = validPairs[0];
    const shortCall = electedPair.shortLeg;
    const longCall = electedPair.longLeg;
    const width = electedPair.width;
    const netCredit = electedPair.netCredit;
    const maxProfit = netCredit;
    const maxLoss = Number((width - netCredit).toFixed(2));
    const breakEven = Number((shortCall.strike + netCredit).toFixed(2));
    const returnPct = Number(((netCredit / maxLoss) * 100).toFixed(1));

    const legs: OptionLegDetail[] = [
      {
        action: 'VENDA',
        symbol: shortCall.symbol,
        strike: shortCall.strike,
        type: 'CALL',
        unitPrice: shortCall.optionPrice!,
        lotQuantity: lotSize,
        totalFinancial: Number((shortCall.optionPrice! * lotSize).toFixed(2)),
        openInterest: shortCall.openInterest || 0,
        delta: shortCall.delta,
        confidence: shortCall.confidence,
        roleDescription: `(strike MENOR) recebe +R$ ${shortCall.optionPrice!.toFixed(2)}/cota  Δ ${shortCall.delta?.toFixed(2)} [conf: ${shortCall.confidence || 'low'}]`,
      },
      {
        action: 'COMPRA',
        symbol: longCall.symbol,
        strike: longCall.strike,
        type: 'CALL',
        unitPrice: longCall.optionPrice!,
        lotQuantity: lotSize,
        totalFinancial: Number((longCall.optionPrice! * lotSize).toFixed(2)),
        openInterest: longCall.openInterest || 0,
        delta: longCall.delta,
        confidence: longCall.confidence,
        roleDescription: `(strike MAIOR) paga −R$ ${longCall.optionPrice!.toFixed(2)}/cota  Δ ${longCall.delta?.toFixed(2)}  ↳ proteção: limita perda a R$ ${(maxLoss * lotSize).toFixed(0)}`,
      },
    ];

    const diagnosticsSummary = `${callSeries.length} séries na cadeia · ${totalEligibleCount} elegíveis · ${validPairs.length} pares válidos`;

    const strategyResult: ElectedOptionStrategy = {
      strategySpec: OPTION_25_STRATEGIES[11], // #12 Bear Spread
      title: `Trava de Baixa com Call a Crédito (Bear Call Spread ${shortCall.strike.toFixed(2)} / ${longCall.strike.toFixed(2)})`,
      bias: 'BAIXA',
      status: 'AUTORIZADA',
      expirationDate: expDate,
      dte,
      underlyingSymbol: symbol,
      underlyingPrice: spot,
      priceContext,
      diagnosticsSummary,
      legs,
      netCostOrCredit: netCredit,
      isCredit: true,
      totalCostOrCreditForLot: Number((netCredit * lotSize).toFixed(2)),
      spreadWidth: width,
      breakEven,
      maxProfit,
      maxProfitLot: Number((maxProfit * lotSize).toFixed(2)),
      maxLoss,
      maxLossLot: Number((maxLoss * lotSize).toFixed(2)),
      returnOnRiskPct: returnPct,
      riskRewardRatio: `1 : ${(maxLoss / maxProfit).toFixed(1)}`,
      tradeCheckGuide: `Nesta trava você vende a call de strike menor (${shortCall.strike.toFixed(2)}) e compra a de strike maior (${longCall.strike.toFixed(2)}). Se no home broker a estrutura aparecer como "trava de alta", as pernas foram invertidas.`,
      takeProfitRule: {
        targetPrice: `R$ ${shortCall.strike.toFixed(2)} (ou inferior no vencimento)`,
        profitGoal: `Capturar 75% a 80% do crédito (R$ ${(netCredit * 0.8 * lotSize).toFixed(2)} no lote)`,
        description: `Encerrar a operação com o decaimento temporal completo das calls vendidas.`,
      },
      stopLossRule: {
        stopPrice: `Fechamento acima de R$ ${longCall.strike.toFixed(2)}`,
        lossLimit: `Stop se a perda atingir 2x o crédito (R$ ${(netCredit * 2 * lotSize).toFixed(2)})`,
        description: `Desmontar imediatamente se o papel romper a resistência para cima.`,
      },
      timeStopRule: {
        dteLimit: 5,
        description: `Desmontar a 5 dias úteis do vencimento.`,
      },
      electionRationale: [
        `Ativo em Tendência de Baixa e com fundamentos reprovados.`,
        `Trava de baixa montada a crédito sem necessidade de aluguel de ações (BTC).`,
        `Risco máximo estritamente limitado na ponta compradora.`,
      ],
      homeBrokerOrderSlip: {
        orderType: `Ordem de Spread Limite a Crédito (Vender ${shortCall.symbol} / Comprar ${longCall.symbol})`,
        entryPriceRange: `Crédito Líquido alvo: R$ ${netCredit.toFixed(2)}`,
        maxSlippage: '0.03',
        legsSummary: `Vender 1.000 ${shortCall.symbol} + Comprar 1.000 ${longCall.symbol}`,
      },
    };

    assertDirection(strategyResult, spot);
    return strategyResult;
  }

  // =========================================================================
  // CENÁRIO 3: LATERAL / CONSOLIDAÇÃO (Iron Condor a Crédito)
  // =========================================================================
  if (trend === 'LATERAL' && fundamentalStatus === 'APROVADO') {
    const putSeries = analyticsList.filter((a) => a.side.toLowerCase() === 'put' && a.strike < spot);
    const callSeries = analyticsList.filter((a) => a.side.toLowerCase() === 'call' && a.strike > spot);

    const eligiblePuts = putSeries.filter((p) => isEligibleLeg(p, 'SHORT', spot, snapshotDate) || isEligibleLeg(p, 'LONG', spot, snapshotDate));
    const eligibleCalls = callSeries.filter((c) => isEligibleLeg(c, 'SHORT', spot, snapshotDate) || isEligibleLeg(c, 'LONG', spot, snapshotDate));

    if (eligiblePuts.length >= 2 && eligibleCalls.length >= 2) {
      const sortedPuts = [...eligiblePuts].sort((a, b) => b.strike - a.strike);
      const sortedCalls = [...eligibleCalls].sort((a, b) => a.strike - b.strike);

      const shortPut = sortedPuts[0];
      const longPut = sortedPuts[1];
      const shortCall = sortedCalls[0];
      const longCall = sortedCalls[1];

      const putCredit = shortPut.optionPrice! - longPut.optionPrice!;
      const callCredit = shortCall.optionPrice! - longCall.optionPrice!;
      const totalCredit = Number((putCredit + callCredit).toFixed(2));
      const width = Number((shortPut.strike - longPut.strike).toFixed(2));
      const maxLoss = Number((width - totalCredit).toFixed(2));

      if (totalCredit > 0 && maxLoss > 0) {
        const legs: OptionLegDetail[] = [
          {
            action: 'COMPRA',
            symbol: longPut.symbol,
            strike: longPut.strike,
            type: 'PUT',
            unitPrice: longPut.optionPrice!,
            lotQuantity: lotSize,
            totalFinancial: Number((longPut.optionPrice! * lotSize).toFixed(2)),
            openInterest: longPut.openInterest || 0,
            delta: longPut.delta,
            confidence: longPut.confidence,
            roleDescription: `(Asa Put Comprada) proteção inferior`,
          },
          {
            action: 'VENDA',
            symbol: shortPut.symbol,
            strike: shortPut.strike,
            type: 'PUT',
            unitPrice: shortPut.optionPrice!,
            lotQuantity: lotSize,
            totalFinancial: Number((shortPut.optionPrice! * lotSize).toFixed(2)),
            openInterest: shortPut.openInterest || 0,
            delta: shortPut.delta,
            confidence: shortPut.confidence,
            roleDescription: `(Perna Put Vendida) strike ${shortPut.strike.toFixed(2)}`,
          },
          {
            action: 'VENDA',
            symbol: shortCall.symbol,
            strike: shortCall.strike,
            type: 'CALL',
            unitPrice: shortCall.optionPrice!,
            lotQuantity: lotSize,
            totalFinancial: Number((shortCall.optionPrice! * lotSize).toFixed(2)),
            openInterest: shortCall.openInterest || 0,
            delta: shortCall.delta,
            confidence: shortCall.confidence,
            roleDescription: `(Perna Call Vendida) strike ${shortCall.strike.toFixed(2)}`,
          },
          {
            action: 'COMPRA',
            symbol: longCall.symbol,
            strike: longCall.strike,
            type: 'CALL',
            unitPrice: longCall.optionPrice!,
            lotQuantity: lotSize,
            totalFinancial: Number((longCall.optionPrice! * lotSize).toFixed(2)),
            openInterest: longCall.openInterest || 0,
            delta: longCall.delta,
            confidence: longCall.confidence,
            roleDescription: `(Asa Call Comprada) proteção superior`,
          },
        ];

        const strategyResult: ElectedOptionStrategy = {
          strategySpec: OPTION_25_STRATEGIES[19], // #20 Iron Condor
          title: `Iron Condor a Crédito (Faixa R$ ${shortPut.strike.toFixed(2)} a R$ ${shortCall.strike.toFixed(2)})`,
          bias: 'LATERAL',
          status: 'AUTORIZADA',
          expirationDate: expDate,
          dte,
          underlyingSymbol: symbol,
          underlyingPrice: spot,
          priceContext,
          diagnosticsSummary: `${analyticsList.length} séries na cadeia · ${eligiblePuts.length + eligibleCalls.length} elegíveis`,
          legs,
          netCostOrCredit: totalCredit,
          isCredit: true,
          totalCostOrCreditForLot: Number((totalCredit * lotSize).toFixed(2)),
          spreadWidth: width,
          breakEven: Number(((shortPut.strike + shortCall.strike) / 2).toFixed(2)),
          maxProfit: totalCredit,
          maxProfitLot: Number((totalCredit * lotSize).toFixed(2)),
          maxLoss,
          maxLossLot: Number((maxLoss * lotSize).toFixed(2)),
          returnOnRiskPct: Number(((totalCredit / maxLoss) * 100).toFixed(1)),
          riskRewardRatio: `1 : ${(maxLoss / totalCredit).toFixed(1)}`,
          tradeCheckGuide: `Estrutura de 4 pernas vendendo as opções intermediárias (${shortPut.strike.toFixed(2)} PUT e ${shortCall.strike.toFixed(2)} CALL) e comprando as extremidades para limitar risco total.`,
          takeProfitRule: {
            targetPrice: `Preço oscilando entre R$ ${shortPut.strike.toFixed(2)} e R$ ${shortCall.strike.toFixed(2)}`,
            profitGoal: `50% a 60% do crédito recebido (R$ ${(totalCredit * 0.55 * lotSize).toFixed(2)})`,
            description: `Realizar lucro parcial quando a passagem do tempo consumir mais da metade do prêmio.`,
          },
          stopLossRule: {
            stopPrice: `Preço rompendo os strikes vendidos`,
            lossLimit: `Perda máxima de 1.5x o crédito`,
            description: `Encerrar a estrutura se o papel romper a consolidação lateral.`,
          },
          timeStopRule: {
            dteLimit: 7,
            description: `Desmontar a 7 dias úteis do vencimento para eliminar risco gamma.`,
          },
          electionRationale: [
            `Mercado em consolidação lateral e empresa sólida aprovada nos fundamentos.`,
            `Captura de prêmio duplo (venda de call e put OTM) com proteção em ambas as pontas.`,
          ],
          homeBrokerOrderSlip: {
            orderType: `Iron Condor Limite a Crédito`,
            entryPriceRange: `Crédito Líquido alvo: R$ ${totalCredit.toFixed(2)}`,
            maxSlippage: '0.04',
            legsSummary: `4 Pernas: Venda ${shortPut.symbol} + ${shortCall.symbol}, Compra ${longPut.symbol} + ${longCall.symbol}`,
          },
        };

        assertDirection(strategyResult, spot);
        return strategyResult;
      }
    }
  }

  // Fallback padrão com diagnóstico estruturado
  return createBlockedStrategy(symbol, spot, expDate, dte, bias, 'SEM_PAR_VALIDO', {
    seriesInChain: analyticsList.length,
    seriesEligible: 0,
    validPairs: 0,
    bestShortDelta: null,
    dte,
    spotDriftPct,
  }, priceContext);
}
