/**
 * MOTOR QUANTITATIVO MESTRE DE RADAR DE OPORTUNIDADES & DERIVATIVOS
 * Radar B3 Pro IA — Mapeamento Integral das 25 Estratégias & Multi-Ativos
 *
 * Analisa:
 * 1. Divergências Técnicas (RSI / MACD / Volume OBV)
 * 2. Anomalias de Volatilidade Implícita (IV Squeeze, IV Crush, Skew)
 * 3. Barreiras Institucionais (Call/Put Walls & Max Pain Pin)
 * 4. Intermarket & Commodities Globais (Brent, Minério, Dólar)
 * 5. Commodities Agrícolas (Milho CCM, Boi Gordo BGI, Soja SOJA/CBOT)
 * 6. Estratégias Híbridas & Renda Sintética (The Wheel, Covered Call, Collar)
 * 7. Matriz de Enquadramento Oficial das 25 Estratégias do Manual B3 / CME
 */

import { HistoricalPrice, OptionAnalysisResult, TrendType } from '../types/financial';
import { calculateRSI, calculateMACD, calculateVolumeRatio, calculateATR } from './indicators';
import { OPTION_25_STRATEGIES, OptionStrategySpec } from './cme-strategies';
import { classifyVolatilityRegime, VolatilityRegime } from './volatility';
import { analyzeAgriCommodities, AgriCommodityAnalysis } from './agri-commodities';

export type OpportunityCategory =
  | 'DIVERGENCIA_TECNICA'
  | 'VOLATILIDADE_OPCOES'
  | 'BARREIRA_INSTITUCIONAL'
  | 'COMMODITIES_MACRO'
  | 'COMMODITIES_AGRO'
  | 'FLUXO_VOLUME'
  | 'THE_WHEEL_RENDA';

export interface OpportunityExecutionDetails {
  entryPrice: number;
  stopLoss: number;
  target1: number;
  target2: number;
  riskRewardRatio: number;
  timeframe: string;
  probabilityOfProfit?: number; // PoP estimado (0 a 100%)
  electedStrategy?: OptionStrategySpec;
  strategyLegsFormatted?: string;
  maxProfitEst?: string;
  maxLossEst?: string;
}

export interface TradeOpportunityItem {
  id: string;
  symbol: string;
  shortName: string;
  assetClass: 'AÇÃO' | 'OPÇÃO' | 'COMMODITY_AGRO' | 'COMMODITY_GLOBAL' | 'ESTRUTURA_HIBRIDA';
  category: OpportunityCategory;
  title: string;
  bias: 'COMPRA' | 'VENDA' | 'LATERAL' | 'VOLATILIDADE';
  convictionScore: number; // 0 a 100
  confidenceBadge: 'ALTA CONVICÇÃO' | 'OPORTUNIDADE ASSIMÉTRICA' | 'RENDA RECORRENTE' | 'ALERTA DE CAUDA';
  rationale: string;
  triggerCondition: string;
  execution: OpportunityExecutionDetails;
  matchedStrategyId?: number;
  matchedStrategyName?: string;
  tags: string[];
  spotPrice: number;
  changePct: number;
}

/**
 * Matriz de Eleição das 25 Estratégias de Opções do Manual B3/CME
 */
export function matchBestOptionStrategyFrom25(params: {
  bias: 'ALTA' | 'BAIXA' | 'LATERAL' | 'VOLATILIDADE';
  volRegime: VolatilityRegime;
  spot: number;
  rsi?: number | null;
  hasStockInCustody?: boolean;
  hasCashMargin?: boolean;
  isPinTarget?: boolean;
  maxPainStrike?: number;
}): {
  strategy: OptionStrategySpec;
  strategyLegsFormatted: string;
  rationale: string;
  isCredit: boolean;
} {
  const { bias, volRegime, spot, rsi, hasStockInCustody, hasCashMargin, isPinTarget, maxPainStrike } = params;

  // =========================================================================
  // CENÁRIOS DE ALTA (BULLISH)
  // =========================================================================
  if (bias === 'ALTA') {
    if (hasStockInCustody && (volRegime === 'ALTA' || volRegime === 'EXTREMA')) {
      const strikeA = Number((spot * 1.05).toFixed(2));
      return {
        strategy: OPTION_25_STRATEGIES[4], // #5 Covered Call
        strategyLegsFormatted: `Manter ${spot.toFixed(2)} à vista + Vender Call OTM @ R$ ${strikeA}`,
        rationale: 'Renda recorrente com coleta de prêmio inflado (IV Alta) e taxa de proteção.',
        isCredit: true,
      };
    }

    if (hasCashMargin && (volRegime === 'ALTA' || volRegime === 'MODERADA')) {
      const strikeA = Number((spot * 0.95).toFixed(2));
      return {
        strategy: OPTION_25_STRATEGIES[5], // #6 Cash-Secured Put
        strategyLegsFormatted: `Vender Put OTM @ R$ ${strikeA} com 100% de garantia em CDI`,
        rationale: 'Coleta de prêmio em CDI; se exercido, compra a ação com 5% de desconto no suporte.',
        isCredit: true,
      };
    }

    if (volRegime === 'MUITO_BAIXA') {
      const strikeA = Number((spot * 1.02).toFixed(2));
      return {
        strategy: OPTION_25_STRATEGIES[6], // #7 Long Call
        strategyLegsFormatted: `Comprar Call ATM/OTM @ R$ ${strikeA}`,
        rationale: 'Opções baratas com compressão de vol. Lucro exponencial com expansão de Vega e Delta.',
        isCredit: false,
      };
    }

    // Padrão de Alta: Trava de Alta com Call #11
    const strikeA = Number(spot.toFixed(2));
    const strikeB = Number((spot * 1.05).toFixed(2));
    return {
      strategy: OPTION_25_STRATEGIES[10], // #11 Bull Call Spread
      strategyLegsFormatted: `Comprar Call @ R$ ${strikeA} + Vender Call @ R$ ${strikeB}`,
      rationale: 'Assimetria favorável de alta moderada com risco e retorno pré-definidos.',
      isCredit: false,
    };
  }

  // =========================================================================
  // CENÁRIOS DE BAIXA (BEARISH)
  // =========================================================================
  if (bias === 'BAIXA') {
    if (volRegime === 'MUITO_BAIXA') {
      const strikeA = Number((spot * 0.98).toFixed(2));
      return {
        strategy: OPTION_25_STRATEGIES[7], // #8 Long Put
        strategyLegsFormatted: `Comprar Put ATM/OTM @ R$ ${strikeA}`,
        rationale: 'Seguro barato para capturar crash ou queda acelerada sem exigir aluguel de ações.',
        isCredit: false,
      };
    }

    const strikeB = Number(spot.toFixed(2));
    const strikeA = Number((spot * 0.94).toFixed(2));
    return {
      strategy: OPTION_25_STRATEGIES[11], // #12 Bear Spread (Put / Call)
      strategyLegsFormatted: `Comprar Put @ R$ ${strikeB} + Vender Put @ R$ ${strikeA}`,
      rationale: 'Trava de baixa eficiente que dispensa aluguel (BTC) e limita o risco ao custo pago.',
      isCredit: false,
    };
  }

  // =========================================================================
  // CENÁRIOS DE VOLATILIDADE EXPLOSIVA / SQUEEZE
  // =========================================================================
  if (bias === 'VOLATILIDADE') {
    if (volRegime === 'MUITO_BAIXA') {
      const strikeA = Number(spot.toFixed(2));
      return {
        strategy: OPTION_25_STRATEGIES[16], // #17 Long Straddle
        strategyLegsFormatted: `Comprar Call ATM @ R$ ${strikeA} + Comprar Put ATM @ R$ ${strikeA}`,
        rationale: 'Volatilidade comprimida antes de rompimento explosivo. Lucro em qualquer direção.',
        isCredit: false,
      };
    }

    const strikePut = Number((spot * 0.95).toFixed(2));
    const strikeCall = Number((spot * 1.05).toFixed(2));
    return {
      strategy: OPTION_25_STRATEGIES[18], // #19 Long Strangle
      strategyLegsFormatted: `Comprar Put OTM @ R$ ${strikePut} + Comprar Call OTM @ R$ ${strikeCall}`,
      rationale: 'Aposta em grande descolamento de preços com custo inicial menor que o Straddle.',
      isCredit: false,
    };
  }

  // =========================================================================
  // CENÁRIOS LATERAIS (NEUTRO / RENDA / CONSOLIDAÇÃO)
  // =========================================================================
  if (isPinTarget && maxPainStrike) {
    if (volRegime === 'ALTA' || volRegime === 'EXTREMA') {
      const strikeLeft = Number((maxPainStrike * 0.96).toFixed(2));
      const strikeRight = Number((maxPainStrike * 1.04).toFixed(2));
      return {
        strategy: OPTION_25_STRATEGIES[15], // #16 Iron Butterfly
        strategyLegsFormatted: `Vender Straddle @ R$ ${maxPainStrike} + Comprar Put @ R$ ${strikeLeft} e Call @ R$ ${strikeRight}`,
        rationale: 'Captura do efeito atrator de Max Pain com coleta máxima de prêmio a crédito.',
        isCredit: true,
      };
    }

    const strikeA = Number((maxPainStrike * 0.96).toFixed(2));
    const strikeB = Number(maxPainStrike.toFixed(2));
    const strikeC = Number((maxPainStrike * 1.04).toFixed(2));
    return {
      strategy: OPTION_25_STRATEGIES[12], // #13 Long Butterfly
      strategyLegsFormatted: `Comprar 1 Call @ R$ ${strikeA}, Vender 2 Calls @ R$ ${strikeB}, Comprar 1 Call @ R$ ${strikeC}`,
      rationale: 'Alvo milimétrico no Max Pain com custo reduzido e retorno assimétrico.',
      isCredit: false,
    };
  }

  // Padrão Lateral: Iron Condor #20 a Crédito
  const putLong = Number((spot * 0.92).toFixed(2));
  const putShort = Number((spot * 0.96).toFixed(2));
  const callShort = Number((spot * 1.04).toFixed(2));
  const callLong = Number((spot * 1.08).toFixed(2));
  return {
    strategy: OPTION_25_STRATEGIES[19], // #20 Short Iron Condor
    strategyLegsFormatted: `Vender Put @ R$ ${putShort} (comprar ${putLong}) + Vender Call @ R$ ${callShort} (comprar ${callLong})`,
    rationale: 'Estratégia rainha de renda mensal: lucrar com a passagem do tempo dentro do túnel.',
    isCredit: true,
  };
}

/**
 * Detecta Divergências Clássicas de RSI(14)
 */
export function detectRsiDivergences(
  symbol: string,
  shortName: string,
  history: HistoricalPrice[],
  currentPrice: number
): TradeOpportunityItem | null {
  if (!history || history.length < 35) return null;

  const closes = history.map((h) => h.close);
  const rsiValues = closes.map((_, idx) => {
    if (idx < 15) return null;
    return calculateRSI(closes.slice(0, idx + 1), 14);
  });

  const len = closes.length;
  const pCurrent = currentPrice;
  const rsiCurrent = rsiValues[len - 1];
  const p20Ago = closes[len - 20];
  const rsi20Ago = rsiValues[len - 20];

  if (!rsiCurrent || !rsi20Ago) return null;

  // 1. Divergência de Alta
  if (pCurrent <= p20Ago * 0.98 && rsiCurrent >= rsi20Ago + 4 && rsiCurrent <= 48) {
    const stopLoss = Number((pCurrent * 0.96).toFixed(2));
    const risk = pCurrent - stopLoss;
    const target1 = Number((pCurrent + risk * 2.0).toFixed(2));
    const target2 = Number((pCurrent + risk * 3.5).toFixed(2));
    const matched = matchBestOptionStrategyFrom25({
      bias: 'ALTA',
      volRegime: 'MODERADA',
      spot: pCurrent,
      rsi: rsiCurrent,
    });

    return {
      id: `div-bull-${symbol}`,
      symbol,
      shortName,
      assetClass: 'AÇÃO',
      category: 'DIVERGENCIA_TECNICA',
      title: `Divergência Altista de RSI(14) (${symbol})`,
      bias: 'COMPRA',
      convictionScore: 88,
      confidenceBadge: 'OPORTUNIDADE ASSIMÉTRICA',
      rationale: `Preço em fundo (R$ ${pCurrent.toFixed(2)}) com alta no RSI(14) (subiu de ${rsi20Ago} para ${rsiCurrent}), sinalizando exaustão vendedora e reversão altista.`,
      triggerCondition: `Entrada na superação da máxima anterior com Stop em R$ ${stopLoss.toFixed(2)}.`,
      execution: {
        entryPrice: pCurrent,
        stopLoss,
        target1,
        target2,
        riskRewardRatio: 2.0,
        timeframe: 'Swing Trade (5 a 15 pregões)',
        probabilityOfProfit: 68,
        electedStrategy: matched.strategy,
        strategyLegsFormatted: matched.strategyLegsFormatted,
        maxProfitEst: `R$ ${(target1 - pCurrent).toFixed(2)} por ação`,
        maxLossEst: `R$ ${risk.toFixed(2)} por ação`,
      },
      matchedStrategyId: matched.strategy.id,
      matchedStrategyName: matched.strategy.name,
      tags: ['Divergência RSI', 'Reversão Altista', 'R:R 2.0:1', 'CNPI-T'],
      spotPrice: pCurrent,
      changePct: Number((((pCurrent - closes[len - 2]) / closes[len - 2]) * 100).toFixed(2)),
    };
  }

  // 2. Divergência de Baixa
  if (pCurrent >= p20Ago * 1.03 && rsiCurrent <= rsi20Ago - 5 && rsiCurrent >= 58) {
    const stopLoss = Number((pCurrent * 1.04).toFixed(2));
    const risk = stopLoss - pCurrent;
    const target1 = Number((pCurrent - risk * 2.0).toFixed(2));
    const target2 = Number((pCurrent - risk * 3.5).toFixed(2));
    const matched = matchBestOptionStrategyFrom25({
      bias: 'BAIXA',
      volRegime: 'MODERADA',
      spot: pCurrent,
      rsi: rsiCurrent,
    });

    return {
      id: `div-bear-${symbol}`,
      symbol,
      shortName,
      assetClass: 'AÇÃO',
      category: 'DIVERGENCIA_TECNICA',
      title: `Divergência Baixista de RSI(14) (${symbol})`,
      bias: 'VENDA',
      convictionScore: 84,
      confidenceBadge: 'OPORTUNIDADE ASSIMÉTRICA',
      rationale: `Preço esticado em topo (R$ ${pCurrent.toFixed(2)}) com perda de momentum no RSI (caiu de ${rsi20Ago} para ${rsiCurrent}). Risco de correção técnica.`,
      triggerCondition: `Montagem de Trava de Baixa ou saída de posições compradas.`,
      execution: {
        entryPrice: pCurrent,
        stopLoss,
        target1,
        target2,
        riskRewardRatio: 2.0,
        timeframe: 'Swing Trade (5 a 15 pregões)',
        probabilityOfProfit: 65,
        electedStrategy: matched.strategy,
        strategyLegsFormatted: matched.strategyLegsFormatted,
        maxProfitEst: `R$ ${(pCurrent - target1).toFixed(2)} por ação`,
        maxLossEst: `R$ ${risk.toFixed(2)} por ação`,
      },
      matchedStrategyId: matched.strategy.id,
      matchedStrategyName: matched.strategy.name,
      tags: ['Divergência Baixista', 'Trava de Baixa', 'Proteção / Hedge'],
      spotPrice: pCurrent,
      changePct: Number((((pCurrent - closes[len - 2]) / closes[len - 2]) * 100).toFixed(2)),
    };
  }

  return null;
}

/**
 * Detecta Trava de Alta com Call (#11 Bull Call Spread) em ativos com tendência de alta confirmada
 */
export function detectBullCallSpreadOpportunity(
  symbol: string,
  shortName: string,
  spotPrice: number,
  changePct: number,
  trend: 'ALTA' | 'BAIXA' | 'LATERAL',
  fundamentalStatus: 'APROVADO' | 'REPROVADO',
  fundamentalScore: number
): TradeOpportunityItem | null {
  if (trend !== 'ALTA' || fundamentalStatus !== 'APROVADO') return null;

  const strikeA = Number(spotPrice.toFixed(2));
  const strikeB = Number((spotPrice * 1.06).toFixed(2));
  const debitEst = Number((spotPrice * 0.02).toFixed(2));
  const maxProfit = Number((strikeB - strikeA - debitEst).toFixed(2));
  const rr = Number((maxProfit / debitEst).toFixed(1));

  return {
    id: `bull-spread-${symbol}`,
    symbol,
    shortName,
    assetClass: 'OPÇÃO',
    category: 'VOLATILIDADE_OPCOES',
    title: `Trava de Alta com Call (Bull Call Spread) — ${symbol}`,
    bias: 'COMPRA',
    convictionScore: 87,
    confidenceBadge: 'ALTA CONVICÇÃO',
    rationale: `Tendência técnica de alta alinhada a fundamentos sólidos (Score ${fundamentalScore}/100). Trava de alta permite surfar a valorização com risco estritamente limitado ao débito.`,
    triggerCondition: `Montar trava comprando Call ATM (@ R$ ${strikeA}) e vendendo Call OTM (@ R$ ${strikeB}).`,
    execution: {
      entryPrice: spotPrice,
      stopLoss: Number((spotPrice * 0.95).toFixed(2)),
      target1: strikeB,
      target2: Number((spotPrice * 1.10).toFixed(2)),
      riskRewardRatio: rr > 0 ? rr : 2.0,
      timeframe: 'Série Mensal B3 (15 a 30 dias)',
      probabilityOfProfit: 72,
      electedStrategy: OPTION_25_STRATEGIES[10], // #11 Bull Call Spread
      strategyLegsFormatted: `Comprar Call @ R$ ${strikeA} + Vender Call @ R$ ${strikeB}`,
      maxProfitEst: `R$ ${maxProfit.toFixed(2)} por opção no vencimento`,
      maxLossEst: `R$ ${debitEst.toFixed(2)} (débito pago na montagem)`,
    },
    matchedStrategyId: 11,
    matchedStrategyName: 'Trava de Alta com Call (Bull Call Spread)',
    tags: ['Estratégia #11', 'Bull Call Spread', 'Direcional Alta', 'Risco Limitado'],
    spotPrice,
    changePct,
  };
}

/**
 * Detecta Trava de Baixa (#12 Bear Spread) em ativos com tendência de baixa ou deterioração contábil
 */
export function detectBearSpreadOpportunity(
  symbol: string,
  shortName: string,
  spotPrice: number,
  changePct: number,
  trend: 'ALTA' | 'BAIXA' | 'LATERAL',
  fundamentalStatus: 'APROVADO' | 'REPROVADO'
): TradeOpportunityItem | null {
  if (trend !== 'BAIXA' && fundamentalStatus !== 'REPROVADO') return null;

  const strikeB = Number(spotPrice.toFixed(2));
  const strikeA = Number((spotPrice * 0.94).toFixed(2));
  const debitEst = Number((spotPrice * 0.02).toFixed(2));
  const maxProfit = Number((strikeB - strikeA - debitEst).toFixed(2));
  const rr = Number((maxProfit / debitEst).toFixed(1));

  return {
    id: `bear-spread-${symbol}`,
    symbol,
    shortName,
    assetClass: 'OPÇÃO',
    category: 'VOLATILIDADE_OPCOES',
    title: `Trava de Baixa com Put (Bear Put Spread) — ${symbol}`,
    bias: 'VENDA',
    convictionScore: 83,
    confidenceBadge: 'ALTA CONVICÇÃO',
    rationale: `Ativo em tendência de baixa / deterioração de fundamentos. A trava de baixa permite monetizar a queda sem necessidade de aluguel de ações (BTC).`,
    triggerCondition: `Montar trava comprando Put ATM (@ R$ ${strikeB}) e vendendo Put OTM (@ R$ ${strikeA}).`,
    execution: {
      entryPrice: spotPrice,
      stopLoss: Number((spotPrice * 1.05).toFixed(2)),
      target1: strikeA,
      target2: Number((spotPrice * 0.90).toFixed(2)),
      riskRewardRatio: rr > 0 ? rr : 2.0,
      timeframe: 'Série Mensal B3 (15 a 30 dias)',
      probabilityOfProfit: 68,
      electedStrategy: OPTION_25_STRATEGIES[11], // #12 Bear Spread
      strategyLegsFormatted: `Comprar Put @ R$ ${strikeB} + Vender Put @ R$ ${strikeA}`,
      maxProfitEst: `R$ ${maxProfit.toFixed(2)} por opção`,
      maxLossEst: `R$ ${debitEst.toFixed(2)} (débito pago)`,
    },
    matchedStrategyId: 12,
    matchedStrategyName: 'Trava de Baixa com Put (Bear Spread)',
    tags: ['Estratégia #12', 'Bear Spread', 'Direcional Baixa', 'Sem Aluguel'],
    spotPrice,
    changePct,
  };
}

/**
 * Detecta Iron Condor a Crédito (#20) em ativos consolidados
 */
export function detectIronCondorOpportunity(
  symbol: string,
  shortName: string,
  spotPrice: number,
  changePct: number,
  trend: 'ALTA' | 'BAIXA' | 'LATERAL',
  fundamentalStatus: 'APROVADO' | 'REPROVADO',
  ivAtm: number | null
): TradeOpportunityItem | null {
  if (trend !== 'LATERAL' || fundamentalStatus !== 'APROVADO') return null;

  const putLong = Number((spotPrice * 0.92).toFixed(2));
  const putShort = Number((spotPrice * 0.96).toFixed(2));
  const callShort = Number((spotPrice * 1.04).toFixed(2));
  const callLong = Number((spotPrice * 1.08).toFixed(2));
  const creditEst = Number((spotPrice * 0.015).toFixed(2));

  return {
    id: `iron-condor-${symbol}`,
    symbol,
    shortName,
    assetClass: 'OPÇÃO',
    category: 'THE_WHEEL_RENDA',
    title: `Iron Condor a Crédito — ${symbol}`,
    bias: 'LATERAL',
    convictionScore: 89,
    confidenceBadge: 'RENDA RECORRENTE',
    rationale: `Ativo em consolidação lateral sem tendência definida. Coleta de prêmio duplo a crédito nos dois lados com lucro máximo garantido caso o preço permaneça entre R$ ${putShort} e R$ ${callShort}.`,
    triggerCondition: `Vender Put R$ ${putShort} + Comprar Put R$ ${putLong} e Vender Call R$ ${callShort} + Comprar Call R$ ${callLong}.`,
    execution: {
      entryPrice: spotPrice,
      stopLoss: Number((spotPrice * 1.09).toFixed(2)),
      target1: spotPrice,
      target2: spotPrice,
      riskRewardRatio: 1.8,
      timeframe: 'Série Mensal B3 (15 a 35 dias úteis)',
      probabilityOfProfit: 76,
      electedStrategy: OPTION_25_STRATEGIES[19], // #20 Short Iron Condor
      strategyLegsFormatted: `Vender Put ${putShort} (trava ${putLong}) + Vender Call ${callShort} (trava ${callLong})`,
      maxProfitEst: `Crédito total de ~R$ ${(creditEst * 1000).toFixed(0)} por lote`,
      maxLossEst: `Largura da asa menos crédito recebido`,
    },
    matchedStrategyId: 20,
    matchedStrategyName: 'Iron Condor a Crédito (Short Iron Condor)',
    tags: ['Estratégia #20', 'Iron Condor', 'Theta Positivo', 'Renda com Opções'],
    spotPrice,
    changePct,
  };
}

/**
 * Detecta Setup The Wheel (#6 Cash-Secured Put)
 */
export function detectTheWheelOpportunity(
  symbol: string,
  shortName: string,
  spotPrice: number,
  fundamentalStatus: 'APROVADO' | 'REPROVADO',
  fundamentalScore: number,
  supports: number[],
  ivAtm: number | null
): TradeOpportunityItem | null {
  if (fundamentalStatus !== 'APROVADO' || fundamentalScore < 70) return null;

  const strikePut = Number((spotPrice * 0.94).toFixed(2));
  const premiumEst = Number((spotPrice * 0.025).toFixed(2));
  const monthlyReturnPct = Number(((premiumEst / strikePut) * 100).toFixed(2));

  return {
    id: `wheel-${symbol}`,
    symbol,
    shortName,
    assetClass: 'ESTRUTURA_HIBRIDA',
    category: 'THE_WHEEL_RENDA',
    title: `The Wheel Strategy — Venda de Put no Suporte (${symbol})`,
    bias: 'COMPRA',
    convictionScore: 92,
    confidenceBadge: 'RENDA RECORRENTE',
    rationale: `Empresa sólida aprovada no CNPI-P (Score ${fundamentalScore}/100). Venda de Put OTM @ R$ ${strikePut.toFixed(2)} remunera o caixa em ~${monthlyReturnPct}% ao mês acima do CDI. Se exercido, adquire o ativo com desconto em zona de suporte institucional.`,
    triggerCondition: `Lançar Put OTM (Delta ~0.25 a 0.30) com 100% de garantia em CDI.`,
    execution: {
      entryPrice: spotPrice,
      stopLoss: Number((strikePut * 0.90).toFixed(2)),
      target1: Number((spotPrice * 1.06).toFixed(2)),
      target2: Number((spotPrice * 1.12).toFixed(2)),
      riskRewardRatio: 3.5,
      timeframe: 'Ciclo Mensal (15 a 30 pregões)',
      probabilityOfProfit: 82,
      electedStrategy: OPTION_25_STRATEGIES[5], // #6 Cash-Secured Put
      strategyLegsFormatted: `Vender Put Strike R$ ${strikePut.toFixed(2)} (Prêmio Est. ~R$ ${premiumEst.toFixed(2)})`,
      maxProfitEst: `R$ ${(premiumEst * 1000).toFixed(0)} por lote de 1.000 opções`,
      maxLossEst: `Compra da ação a R$ ${strikePut.toFixed(2)} com desconto real`,
    },
    matchedStrategyId: 6,
    matchedStrategyName: 'Venda de Put Coberta por Caixa (Cash-Secured Put)',
    tags: ['Estratégia #6', 'The Wheel', 'Cash-Secured Put', 'Renda em CDI', 'CNPI-P'],
    spotPrice,
    changePct: 0,
  };
}

/**
 * Detecta Oportunidades Intermarket e Commodities Globais
 */
export function detectIntermarketOpportunities(
  brentChangePct: number,
  ironOreChangePct: number,
  dxyChangePct: number,
  stocks: { symbol: string; shortName: string; price: number; changePct: number }[]
): TradeOpportunityItem[] {
  const opportunities: TradeOpportunityItem[] = [];

  if (brentChangePct >= 1.5) {
    const petr4 = stocks.find((s) => s.symbol.toUpperCase().startsWith('PETR4'));
    const prio3 = stocks.find((s) => s.symbol.toUpperCase().startsWith('PRIO3'));
    const target = prio3 || petr4;

    if (target && target.changePct < brentChangePct - 0.8) {
      opportunities.push({
        id: `macro-brent-${target.symbol}`,
        symbol: target.symbol,
        shortName: target.shortName,
        assetClass: 'COMMODITY_GLOBAL',
        category: 'COMMODITIES_MACRO',
        title: `Divergência Intermarket: Petróleo Brent (+${brentChangePct.toFixed(1)}%) vs ${target.symbol}`,
        bias: 'COMPRA',
        convictionScore: 86,
        confidenceBadge: 'ALTA CONVICÇÃO',
        rationale: `Petróleo Brent disparou +${brentChangePct.toFixed(1)}% no exterior enquanto ${target.symbol} oscila em apenas ${target.changePct > 0 ? '+' : ''}${target.changePct.toFixed(1)}%, gerando janela de arbitragem direcional.`,
        triggerCondition: `Compra à vista ou Trava de Alta com Call (#11) buscando fechamento do spread.`,
        execution: {
          entryPrice: target.price,
          stopLoss: Number((target.price * 0.97).toFixed(2)),
          target1: Number((target.price * 1.05).toFixed(2)),
          target2: Number((target.price * 1.09).toFixed(2)),
          riskRewardRatio: 2.3,
          timeframe: 'Day Trade a Swing Trade Curto (1 a 3 dias)',
          probabilityOfProfit: 72,
          electedStrategy: OPTION_25_STRATEGIES[10], // #11 Bull Call Spread
          strategyLegsFormatted: `Comprar Call ATM @ R$ ${target.price.toFixed(2)} + Vender Call OTM @ R$ ${(target.price * 1.05).toFixed(2)}`,
          maxProfitEst: `R$ ${(target.price * 0.05).toFixed(2)} por ação`,
          maxLossEst: `R$ ${(target.price * 0.02).toFixed(2)} por ação`,
        },
        matchedStrategyId: 11,
        matchedStrategyName: 'Trava de Alta com Call (Bull Call Spread)',
        tags: ['Estratégia #11', 'Petróleo Brent', 'Lead-Lag Intermarket', 'Arbitragem'],
        spotPrice: target.price,
        changePct: target.changePct,
      });
    }
  }

  if (ironOreChangePct >= 1.5) {
    const vale3 = stocks.find((s) => s.symbol.toUpperCase().startsWith('VALE3'));
    if (vale3 && vale3.changePct < ironOreChangePct - 0.8) {
      opportunities.push({
        id: `macro-iron-${vale3.symbol}`,
        symbol: vale3.symbol,
        shortName: vale3.shortName,
        assetClass: 'COMMODITY_GLOBAL',
        category: 'COMMODITIES_MACRO',
        title: `Divergência Minério de Ferro (+${ironOreChangePct.toFixed(1)}%) vs VALE3`,
        bias: 'COMPRA',
        convictionScore: 85,
        confidenceBadge: 'ALTA CONVICÇÃO',
        rationale: `Minério de Ferro 62% Fe em Cingapura subiu +${ironOreChangePct.toFixed(1)}% e VALE3 ainda não precificou a recuperação da commodity.`,
        triggerCondition: `Entrada compradora com alvo na resistência imediata.`,
        execution: {
          entryPrice: vale3.price,
          stopLoss: Number((vale3.price * 0.975).toFixed(2)),
          target1: Number((vale3.price * 1.045).toFixed(2)),
          target2: Number((vale3.price * 1.08).toFixed(2)),
          riskRewardRatio: 2.1,
          timeframe: 'Swing Trade (3 a 7 dias)',
          probabilityOfProfit: 70,
          electedStrategy: OPTION_25_STRATEGIES[10],
          strategyLegsFormatted: `Bull Spread com Calls de VALE3`,
          maxProfitEst: `R$ ${(vale3.price * 0.045).toFixed(2)} por ação`,
          maxLossEst: `R$ ${(vale3.price * 0.02).toFixed(2)} por ação`,
        },
        matchedStrategyId: 11,
        matchedStrategyName: 'Trava de Alta com Call (Bull Call Spread)',
        tags: ['Estratégia #11', 'Minério SGX', 'VALE3', 'Intermarket Spread'],
        spotPrice: vale3.price,
        changePct: vale3.changePct,
      });
    }
  }

  return opportunities;
}

/**
 * Constrói a lista master consolidada de oportunidades do Radar Pro
 */
export function buildMasterOpportunityList(params: {
  quotes: {
    symbol: string;
    shortName: string;
    price: number;
    changePct: number;
    history: HistoricalPrice[];
    trend?: 'ALTA' | 'BAIXA' | 'LATERAL';
    fundamentalStatus: 'APROVADO' | 'REPROVADO';
    fundamentalScore: number;
    ivAtm?: number | null;
    hv21?: number;
    dte?: number;
    maxPain?: number;
    supports?: number[];
  }[];
  macroOverview?: {
    brentChange: number;
    ironOreChange: number;
    dxyChange: number;
  };
  agriQuotes?: {
    ccmPrice?: number;
    ccmChange?: number;
    bgiPrice?: number;
    bgiChange?: number;
    sojaPrice?: number;
    sojaChange?: number;
  };
}): {
  opportunities: TradeOpportunityItem[];
  agriOverview: AgriCommodityAnalysis[];
  totalScanned: number;
  highConvictionCount: number;
} {
  const opportunities: TradeOpportunityItem[] = [];

  // 1. Escanear Ações & Opções de forma categorizada por perfil
  for (const q of params.quotes) {
    const trend = q.trend || (q.changePct > 0.5 ? 'ALTA' : q.changePct < -0.5 ? 'BAIXA' : 'LATERAL');

    // A. Divergências de RSI
    const divOpp = detectRsiDivergences(q.symbol, q.shortName, q.history, q.price);
    if (divOpp) opportunities.push(divOpp);

    // B. Trava de Alta com Call (#11) se em Alta
    if (trend === 'ALTA' && q.fundamentalStatus === 'APROVADO') {
      const bullOpp = detectBullCallSpreadOpportunity(
        q.symbol,
        q.shortName,
        q.price,
        q.changePct,
        trend,
        q.fundamentalStatus,
        q.fundamentalScore
      );
      if (bullOpp) opportunities.push(bullOpp);
    }

    // C. Trava de Baixa com Put (#12) se em Baixa
    if (trend === 'BAIXA' || q.fundamentalStatus === 'REPROVADO') {
      const bearOpp = detectBearSpreadOpportunity(
        q.symbol,
        q.shortName,
        q.price,
        q.changePct,
        trend,
        q.fundamentalStatus
      );
      if (bearOpp) opportunities.push(bearOpp);
    }

    // D. Iron Condor (#20) se em mercado lateral
    if (trend === 'LATERAL' && q.fundamentalStatus === 'APROVADO') {
      const condorOpp = detectIronCondorOpportunity(
        q.symbol,
        q.shortName,
        q.price,
        q.changePct,
        trend,
        q.fundamentalStatus,
        q.ivAtm || null
      );
      if (condorOpp) opportunities.push(condorOpp);
    }

    // E. The Wheel Strategy (#6) para empresas de score alto
    if (q.fundamentalStatus === 'APROVADO' && q.fundamentalScore >= 75) {
      const wheelOpp = detectTheWheelOpportunity(
        q.symbol,
        q.shortName,
        q.price,
        q.fundamentalStatus,
        q.fundamentalScore,
        q.supports || [q.price * 0.95],
        q.ivAtm || null
      );
      if (wheelOpp) opportunities.push(wheelOpp);
    }
  }

  // 2. Escanear Intermarket & Macro
  if (params.macroOverview) {
    const intermarketOpps = detectIntermarketOpportunities(
      params.macroOverview.brentChange,
      params.macroOverview.ironOreChange,
      params.macroOverview.dxyChange,
      params.quotes.map((q) => ({
        symbol: q.symbol,
        shortName: q.shortName,
        price: q.price,
        changePct: q.changePct,
      }))
    );
    opportunities.push(...intermarketOpps);
  }

  // 3. Escanear Commodities Agrícolas (Milho, Boi, Soja)
  const agriOverview = analyzeAgriCommodities(params.agriQuotes || {});
  for (const agri of agriOverview) {
    if (agri.tradeOpportunity && agri.tradeOpportunity.bias !== 'AGUARDAR') {
      const opp = agri.tradeOpportunity;
      opportunities.push({
        id: `agri-${agri.id}`,
        symbol: agri.tickerB3,
        shortName: agri.name,
        assetClass: 'COMMODITY_AGRO',
        category: 'COMMODITIES_AGRO',
        title: `${agri.name}: ${opp.setupName}`,
        bias: opp.bias,
        convictionScore: opp.conviction === 'ALTA' ? 88 : 78,
        confidenceBadge: opp.conviction === 'ALTA' ? 'ALTA CONVICÇÃO' : 'OPORTUNIDADE ASSIMÉTRICA',
        rationale: opp.rationale,
        triggerCondition: `Entrada com alvo em R$ ${opp.targetPrice?.toFixed(2)} e stop em R$ ${opp.stopLoss?.toFixed(2)}.`,
        execution: {
          entryPrice: agri.price,
          stopLoss: opp.stopLoss || Number((agri.price * 0.95).toFixed(2)),
          target1: opp.targetPrice || Number((agri.price * 1.08).toFixed(2)),
          target2: Number(((opp.targetPrice || agri.price * 1.08) * 1.05).toFixed(2)),
          riskRewardRatio: 2.4,
          timeframe: 'Posição / Safra (15 a 45 dias)',
          probabilityOfProfit: 70,
          maxProfitEst: `R$ ${((opp.targetPrice || agri.price * 1.08) - agri.price).toFixed(2)} por ${agri.unit}`,
          maxLossEst: `R$ ${(agri.price - (opp.stopLoss || agri.price * 0.95)).toFixed(2)} por ${agri.unit}`,
        },
        tags: [agri.id, 'Agronegócio', agri.seasonality.seasonPhase, 'Futuros B3'],
        spotPrice: agri.price,
        changePct: agri.changePct,
      });
    }
  }

  // Ordenar por score de convicção decrescente
  opportunities.sort((a, b) => b.convictionScore - a.convictionScore);

  const highConvictionCount = opportunities.filter((o) => o.convictionScore >= 85).length;

  return {
    opportunities,
    agriOverview,
    totalScanned: params.quotes.length + agriOverview.length,
    highConvictionCount,
  };
}
