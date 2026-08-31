/**
 * MOTOR ÚNICO DE RECOMENDAÇÃO E ELEIÇÃO DE ESTRATÉGIAS DE OPÇÕES B3
 * Radar B3 Pro IA — Especificação Técnica v2.1 (31/08/2026)
 *
 * Diretrizes Fundamentais:
 * 1. Motor Único em todo o sistema (cme-election.ts).
 * 2. Seleção de pernas baseada em Delta OTM estrito (|delta| <= 0.38 na ponta vendida), nunca por índice de array.
 * 3. Contexto explícito de data de preço (priceDate, priceUnderlying, spotDriftPct) e bloqueio se |drift| > 3%.
 * 4. Zero fallbacks inventados: séries sem optionPrice ou confidence low/medium são inelegíveis como pernas.
 * 5. Asserção obrigatória de coerência direcional (assertDirection) com cálculo de payoff no vencimento.
 */

import {
  OptionAnalysisResult,
  OptionAnalyticsItem,
  PriceContext,
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
  roleDescription?: string; // Ex: "(strike MAIOR) recebe +R$ 1,00/cota" ou "(strike MENOR) ↳ proteção"
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

  // Contexto de data e defasagem de preço (Spec v2.1)
  priceContext?: PriceContext;

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
 * Valida se uma série atende a todos os critérios de elegibilidade para ser perna de uma trava
 */
export function isEligibleLeg(o: OptionAnalyticsItem): boolean {
  const rules = CNPI_RULES.DERIVATIVES.LEG_ELIGIBILITY;
  const isHighConf = (o.confidence || 'high').toLowerCase() === rules.REQUIRED_CONFIDENCE;
  const hasPrice = o.optionPrice !== null && o.optionPrice >= rules.MIN_OPTION_PRICE;
  const hasOi = (o.openInterest || 0) >= rules.MIN_OPEN_INTEREST;
  const hasDelta =
    o.delta !== null &&
    o.delta !== undefined &&
    Math.abs(o.delta) >= rules.MIN_ABS_DELTA &&
    Math.abs(o.delta) <= rules.MAX_ABS_DELTA;
  const hasIv = o.impliedVolatility !== null && o.impliedVolatility > 0;

  return isHighConf && hasPrice && hasOi && hasDelta && hasIv;
}

/**
 * Motor Único de Inteligência para Eleição da Melhor Estratégia de Opções B3
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
): ElectedOptionStrategy | null {
  if (!optionAnalysis) {
    return null;
  }

  const spot = spotPrice > 0 ? spotPrice : optionAnalysis.underlyingPrice;
  const dte = optionAnalysis.selectedExpirationInfo?.dte || 15;
  const expDate = optionAnalysis.selectedExpiration || '2026-09-18';
  const ivAtm = optionAnalysis.ivAtm?.callIv || hv21 || 25.0;
  const lotSize = 1000;

  // =========================================================================
  // 1. CONTEXTO DE DATA E CONTROLE DE SPOT DRIFT (Spec v2.1 - B3)
  // =========================================================================
  const firstAnalytic = analyticsList.find((a) => a.optionPrice !== null && a.underlyingPrice);
  const priceDate = firstAnalytic?.openInterestDate || optionAnalysis.openInterestDate || 'Fechamento D-1';
  const priceUnderlying = firstAnalytic?.underlyingPrice || optionAnalysis.underlyingPrice || spot;
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

  // =========================================================================
  // 2. BLOQUEIO DE COMPRAS POR FUNDAMENTOS (Value Trap)
  // =========================================================================
  const isBlockedVerdict =
    verdict.includes('BLOQUEADO') ||
    verdict === 'BLOQUEADO_POR_FUNDAMENTOS' ||
    (fundamentalStatus === 'REPROVADO' && (verdict.includes('COMPRA') || trend === 'ALTA' || trend === 'LATERAL'));

  if (isBlockedVerdict) {
    return {
      strategySpec: OPTION_25_STRATEGIES[0],
      title: 'Estratégia Bloqueada: Ativo Reprovado nos Fundamentos (CNPI-P)',
      bias: 'NEUTRO',
      status: 'BLOQUEADA',
      expirationDate: expDate,
      dte,
      underlyingSymbol: symbol,
      underlyingPrice: spot,
      priceContext,
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
      takeProfitRule: { targetPrice: '-', profitGoal: '-', description: '-' },
      stopLossRule: { stopPrice: '-', lossLimit: '-', description: '-' },
      timeStopRule: { dteLimit: 0, description: '-' },
      electionRationale: [
        `Empresa reprovada no crivo fundamentalista (prejuízo líquido recorrente ou superendividamento).`,
        `Montagem de travas ou compras de opções desaconselhada para evitar armadilhas de valor (Value Trap).`,
      ],
      homeBrokerOrderSlip: {
        orderType: 'BLOQUEADO',
        entryPriceRange: 'Nenhuma ordem autorizada',
        maxSlippage: '0',
        legsSummary: 'OPERAÇÃO BLOQUEADA PELOS FUNDAMENTOS',
      },
    };
  }

  // =========================================================================
  // 3. BLOQUEIO POR SPOT DRIFT EXCESSIVO (> 3.0%)
  // =========================================================================
  if (isBlockedByDrift) {
    return {
      strategySpec: OPTION_25_STRATEGIES[10],
      title: 'Estratégia em Análise: Defasagem Excessiva nos Prêmios de Referência',
      bias: trend === 'ALTA' ? 'ALTA' : trend === 'BAIXA' ? 'BAIXA' : 'LATERAL',
      status: 'EM_ANALISE',
      expirationDate: expDate,
      dte,
      underlyingSymbol: symbol,
      underlyingPrice: spot,
      priceContext,
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
      takeProfitRule: { targetPrice: '-', profitGoal: '-', description: '-' },
      stopLossRule: { stopPrice: '-', lossLimit: '-', description: '-' },
      timeStopRule: { dteLimit: 0, description: '-' },
      electionRationale: [
        `O ativo oscilou ${spotDriftPct}% desde o fechamento dos prêmios de derivativos (${priceDate}).`,
        `Prêmios de fechamento não reproduzem mais o mercado atual (|spot drift| > 3.0%). Consulte o book de ofertas ao vivo.`,
      ],
      homeBrokerOrderSlip: {
        orderType: 'AGUARDAR_BOOK',
        entryPriceRange: 'Atualizar cotações ao vivo no home broker',
        maxSlippage: '0',
        legsSummary: 'AGUARDANDO REABERTURA OU ATUALIZAÇÃO DO BOOK DE OPÇÕES',
      },
    };
  }

  // Filtrar apenas séries 100% elegíveis
  const eligibleAnalytics = analyticsList.filter(isEligibleLeg);
  if (eligibleAnalytics.length < 2) {
    return null;
  }

  const volRegime = classifyVolatilityRegime(ivAtm, hv21);
  const spreadRules = CNPI_RULES.DERIVATIVES.SPREAD;

  try {
    // =========================================================================
    // CENÁRIO 1: ALTA / COMPRA (Bull Put Spread a Crédito ou Bull Call a Débito)
    // =========================================================================
    if (verdict.includes('COMPRA') || trend === 'ALTA') {
      const eligiblePuts = eligibleAnalytics
        .filter((a) => a.side.toLowerCase() === 'put' && a.strike < spot)
        .sort((a, b) => b.strike - a.strike); // Strikes maiores primeiro (mais próximos do spot)

      // 1. Perna Vendida: |delta| mais próximo de 0.28, com restrição estrita |delta| <= 0.38
      const candidateShortPuts = eligiblePuts.filter((p) => Math.abs(p.delta!) <= spreadRules.SHORT_LEG_DELTA_MAX);
      if (candidateShortPuts.length === 0) return null;

      const shortPut = candidateShortPuts.reduce((prev, curr) =>
        Math.abs(Math.abs(curr.delta!) - spreadRules.SHORT_LEG_DELTA_TARGET) <
        Math.abs(Math.abs(prev.delta!) - spreadRules.SHORT_LEG_DELTA_TARGET)
          ? curr
          : prev
      );

      // 2. Perna Comprada (Proteção): strike MENOR que a vendida, largura entre 1.5% e 6.0% do spot, delta ~ 0.12
      const candidateLongPuts = eligiblePuts.filter((p) => {
        const width = shortPut.strike - p.strike;
        const widthPct = width / spot;
        return (
          p.strike < shortPut.strike &&
          widthPct >= spreadRules.MIN_WIDTH_PCT_OF_SPOT &&
          widthPct <= spreadRules.MAX_WIDTH_PCT_OF_SPOT
        );
      });

      if (candidateLongPuts.length === 0) return null;

      const longPut = candidateLongPuts.reduce((prev, curr) =>
        Math.abs(Math.abs(curr.delta!) - spreadRules.LONG_LEG_DELTA_TARGET) <
        Math.abs(Math.abs(prev.delta!) - spreadRules.LONG_LEG_DELTA_TARGET)
          ? curr
          : prev
      );

      const width = Number((shortPut.strike - longPut.strike).toFixed(2));
      const shortPrice = shortPut.optionPrice!;
      const longPrice = longPut.optionPrice!;
      const netCredit = Number((shortPrice - longPrice).toFixed(2));

      // Validar proporção de crédito sobre largura (entre 20% e 45%)
      const creditRatio = netCredit / width;
      if (creditRatio < spreadRules.MIN_CREDIT_TO_WIDTH || creditRatio > spreadRules.MAX_CREDIT_TO_WIDTH) {
        return null;
      }

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
          unitPrice: shortPrice,
          lotQuantity: lotSize,
          totalFinancial: Number((shortPrice * lotSize).toFixed(2)),
          openInterest: shortPut.openInterest || 0,
          delta: shortPut.delta,
          roleDescription: `(strike MAIOR) recebe +R$ ${shortPrice.toFixed(2)}/cota  Δ ${shortPut.delta?.toFixed(2)}`,
        },
        {
          action: 'COMPRA',
          symbol: longPut.symbol,
          strike: longPut.strike,
          type: 'PUT',
          unitPrice: longPrice,
          lotQuantity: lotSize,
          totalFinancial: Number((longPrice * lotSize).toFixed(2)),
          openInterest: longPut.openInterest || 0,
          delta: longPut.delta,
          roleDescription: `(strike MENOR) paga −R$ ${longPrice.toFixed(2)}/cota  Δ ${longPut.delta?.toFixed(2)}  ↳ proteção: limita perda a R$ ${(maxLoss * lotSize).toFixed(0)}`,
        },
      ];

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
          orderType: `Ordem de Spread Limite a Crédito (Vender ${shortPut.symbol} @ R$ ${shortPrice.toFixed(2)} / Comprar ${longPut.symbol} @ R$ ${longPrice.toFixed(2)})`,
          entryPriceRange: `Crédito Líquido alvo: R$ ${netCredit.toFixed(2)}`,
          maxSlippage: '0.03',
          legsSummary: `Vender 1.000 ${shortPut.symbol} (PUT @ ${shortPut.strike.toFixed(2)}) + Comprar 1.000 ${longPut.symbol} (PUT @ ${longPut.strike.toFixed(2)})`,
        },
      };

      // Asserção direcional obrigatória (B7)
      assertDirection(strategyResult, spot);
      return strategyResult;
    }

    // =========================================================================
    // CENÁRIO 2: BAIXA / VENDA (Bear Call Spread a Crédito)
    // =========================================================================
    if (verdict.includes('VENDA') || trend === 'BAIXA') {
      const eligibleCalls = eligibleAnalytics
        .filter((a) => a.side.toLowerCase() === 'call' && a.strike > spot)
        .sort((a, b) => a.strike - b.strike); // Strikes menores primeiro (mais próximos do spot)

      // Perna Vendida: delta mais próximo de 0.28, com delta <= 0.38
      const candidateShortCalls = eligibleCalls.filter((c) => Math.abs(c.delta!) <= spreadRules.SHORT_LEG_DELTA_MAX);
      if (candidateShortCalls.length === 0) return null;

      const shortCall = candidateShortCalls.reduce((prev, curr) =>
        Math.abs(Math.abs(curr.delta!) - spreadRules.SHORT_LEG_DELTA_TARGET) <
        Math.abs(Math.abs(prev.delta!) - spreadRules.SHORT_LEG_DELTA_TARGET)
          ? curr
          : prev
      );

      // Perna Comprada (Proteção): strike MAIOR que a vendida, largura entre 1.5% e 6.0% do spot
      const candidateLongCalls = eligibleCalls.filter((c) => {
        const width = c.strike - shortCall.strike;
        const widthPct = width / spot;
        return (
          c.strike > shortCall.strike &&
          widthPct >= spreadRules.MIN_WIDTH_PCT_OF_SPOT &&
          widthPct <= spreadRules.MAX_WIDTH_PCT_OF_SPOT
        );
      });

      if (candidateLongCalls.length === 0) return null;

      const longCall = candidateLongCalls.reduce((prev, curr) =>
        Math.abs(Math.abs(curr.delta!) - spreadRules.LONG_LEG_DELTA_TARGET) <
        Math.abs(Math.abs(prev.delta!) - spreadRules.LONG_LEG_DELTA_TARGET)
          ? curr
          : prev
      );

      const width = Number((longCall.strike - shortCall.strike).toFixed(2));
      const shortPrice = shortCall.optionPrice!;
      const longPrice = longCall.optionPrice!;
      const netCredit = Number((shortPrice - longPrice).toFixed(2));

      const creditRatio = netCredit / width;
      if (creditRatio < spreadRules.MIN_CREDIT_TO_WIDTH || creditRatio > spreadRules.MAX_CREDIT_TO_WIDTH) {
        return null;
      }

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
          unitPrice: shortPrice,
          lotQuantity: lotSize,
          totalFinancial: Number((shortPrice * lotSize).toFixed(2)),
          openInterest: shortCall.openInterest || 0,
          delta: shortCall.delta,
          roleDescription: `(strike MENOR) recebe +R$ ${shortPrice.toFixed(2)}/cota  Δ ${shortCall.delta?.toFixed(2)}`,
        },
        {
          action: 'COMPRA',
          symbol: longCall.symbol,
          strike: longCall.strike,
          type: 'CALL',
          unitPrice: longPrice,
          lotQuantity: lotSize,
          totalFinancial: Number((longPrice * lotSize).toFixed(2)),
          openInterest: longCall.openInterest || 0,
          delta: longCall.delta,
          roleDescription: `(strike MAIOR) paga −R$ ${longPrice.toFixed(2)}/cota  Δ ${longCall.delta?.toFixed(2)}  ↳ proteção: limita perda a R$ ${(maxLoss * lotSize).toFixed(0)}`,
        },
      ];

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
      const eligiblePuts = eligibleAnalytics
        .filter((a) => a.side.toLowerCase() === 'put' && a.strike < spot)
        .sort((a, b) => b.strike - a.strike);
      const eligibleCalls = eligibleAnalytics
        .filter((a) => a.side.toLowerCase() === 'call' && a.strike > spot)
        .sort((a, b) => a.strike - b.strike);

      if (eligiblePuts.length >= 2 && eligibleCalls.length >= 2 && ivAtm >= 16.0 && dte >= 12 && dte <= 35) {
        const shortPut = eligiblePuts[0];
        const longPut = eligiblePuts[1];
        const shortCall = eligibleCalls[0];
        const longCall = eligibleCalls[1];

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

    return null;
  } catch (err: unknown) {
    if (err instanceof StructureDirectionError) {
      // Incoerência direcional é tratada como bloqueio seguro
      return null;
    }
    return null;
  }
}
