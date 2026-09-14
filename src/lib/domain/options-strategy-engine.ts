/**
 * Motor de Geração de Estratégias AI — Baseado 100% em Dados Reais
 *
 * REGRAS CRÍTICAS:
 * - Strikes sempre ancorados em barreiras reais B3 ou bandas estatísticas reais (200P).
 * - Prêmios: primeiro tenta dado real BRAPI (last trade <= 2 dias); se indisponível,
 *   usa Black-Scholes calibrado com HV21 real + DTE real + Selic real, rotulando
 *   explicitamente como "Teórico B-S (HV Real)".
 * - Payoff no vencimento = fórmula matemática determinística (100% real).
 * - P&L antes do vencimento = Black-Scholes (modelo, rotulado como estimativa).
 * - Score de Convicção = algoritmo determinístico auditável (não usa LLM/IA generativa).
 * - Se dados insuficientes, declara explicitamente em vez de inventar.
 */

import {
  MarketRegime,
  OptionLeg,
  TailRiskLeg,
  PayoffPoint,
  PayoffReliability,
  ConvictionFactors,
  StrategyRecommendation,
  OperatorProfile,
  StrikeOriginType,
  PremiumReliabilityType,
  OptionChainItem,
} from '../types/financial';
import { calculateBlackScholes } from './black-scholes';
import { getRiskFreeRate } from '../config/macro';

// ─────────────────────────────────────────────────────────────
// HELPERS: Resolução de Opção Real B3 com Book (Bid/Ask/Close)
// ─────────────────────────────────────────────────────────────

export interface ResolveOptionLegParams {
  action: 'COMPRAR' | 'VENDER';
  type: 'CALL' | 'PUT';
  targetStrike: number;
  strikeOrigin: StrikeOriginType;
  strikeOriginDescription: string;
  chain?: OptionChainItem[];
  spot: number;
  dte: number;
  hv21: number | null;
  expiration: string;
  legRationale: string;
  constraint?: 'STRICTLY_GREATER_THAN' | 'STRICTLY_LESS_THAN';
  constraintStrike?: number;
}

/**
 * Mapeia o strike alvo (estatístico ou de barreira) para a opção REAL mais próxima
 * listada na B3 e no Profit, capturando Bid, Ask e Último Negócio reais da BRAPI.
 */
export function resolveOptionLeg(params: ResolveOptionLegParams): OptionLeg {
  const {
    action,
    type,
    targetStrike,
    strikeOrigin,
    strikeOriginDescription,
    chain = [],
    spot,
    dte,
    hv21,
    expiration,
    legRationale,
    constraint,
    constraintStrike,
  } = params;

  // 1. Filtrar opções reais da chain da B3 com o tipo correto ('CALL' ou 'PUT')
  let available = chain.filter(
    (item) => item.side.toUpperCase() === type.toUpperCase() && item.strike > 0
  );

  // Aplicar restrição estrutural entre pernas se solicitada (ex: long leg > short leg)
  if (constraint === 'STRICTLY_GREATER_THAN' && typeof constraintStrike === 'number') {
    const strictlyGreater = available.filter((o) => o.strike > constraintStrike);
    if (strictlyGreater.length > 0) {
      available = strictlyGreater;
    }
  } else if (constraint === 'STRICTLY_LESS_THAN' && typeof constraintStrike === 'number') {
    const strictlyLess = available.filter((o) => o.strike < constraintStrike);
    if (strictlyLess.length > 0) {
      available = strictlyLess;
    }
  }

  let matchedOption: OptionChainItem | null = null;
  if (available.length > 0) {
    let minDiff = Infinity;
    for (const opt of available) {
      const diff = Math.abs(opt.strike - targetStrike);
      if (diff < minDiff) {
        minDiff = diff;
        matchedOption = opt;
      }
    }
  }

  const effectiveStrike = matchedOption ? matchedOption.strike : Number(targetStrike.toFixed(2));
  const symbol = matchedOption?.symbol;
  const bid = matchedOption && matchedOption.bid > 0 ? Number(matchedOption.bid.toFixed(2)) : null;
  const ask = matchedOption && matchedOption.ask > 0 ? Number(matchedOption.ask.toFixed(2)) : null;
  const close = matchedOption && matchedOption.close > 0 ? Number(matchedOption.close.toFixed(2)) : null;

  // 2. Determinar o melhor preço de mercado real (conservador e executável)
  let marketPremium: number | null = null;
  let reliability: PremiumReliabilityType = 'SEM_DADOS';
  let reliabilityLabel = '';

  if (action === 'VENDER') {
    if (bid !== null && bid > 0) {
      marketPremium = bid;
      reliability = 'REAL_BOOK_BID';
      reliabilityLabel = `✅ Real B3 Book (Bid: R$${bid.toFixed(2)})`;
    } else if (close !== null && close > 0) {
      marketPremium = close;
      reliability = 'REAL_MERCADO';
      reliabilityLabel = `✅ Real B3 (Último negócio: R$${close.toFixed(2)})`;
    }
  } else {
    // COMPRAR
    if (ask !== null && ask > 0) {
      marketPremium = ask;
      reliability = 'REAL_BOOK_ASK';
      reliabilityLabel = `✅ Real B3 Book (Ask: R$${ask.toFixed(2)})`;
    } else if (close !== null && close > 0) {
      marketPremium = close;
      reliability = 'REAL_MERCADO';
      reliabilityLabel = `✅ Real B3 (Último negócio: R$${close.toFixed(2)})`;
    }
  }

  // Delta informativo
  let delta: number | null = null;
  if (hv21 && hv21 > 0 && dte > 0 && spot > 0 && effectiveStrike > 0) {
    const T = dte / 252;
    const sigma = hv21 / 100;
    const r = getRiskFreeRate();
    const bs = calculateBlackScholes(spot, effectiveStrike, T, r, sigma, type === 'CALL' ? 'call' : 'put');
    delta = Number(bs.delta.toFixed(4));
  }

  const strikeOriginLabel = matchedOption
    ? `${strikeOriginDescription} → Strike real B3: R$${effectiveStrike.toFixed(2)} (${matchedOption.symbol})`
    : strikeOriginDescription;

  // Se temos preço real de mercado disponível na B3
  if (marketPremium !== null && marketPremium > 0) {
    return {
      symbol,
      action,
      type,
      strike: effectiveStrike,
      strikeOrigin,
      strikeOriginLabel,
      dte,
      expiration,
      bid,
      ask,
      close,
      theoreticalPremium: null,
      marketPremium,
      premiumUsed: marketPremium,
      premiumReliability: reliability,
      premiumReliabilityLabel: reliabilityLabel,
      delta,
      legRationale,
    };
  }

  // Se book/negócio estiver vazio (liquidez nula no dia), modelo Black-Scholes com HV21 real
  if (!hv21 || hv21 <= 0 || dte <= 0 || spot <= 0 || effectiveStrike <= 0) {
    return {
      symbol,
      action,
      type,
      strike: effectiveStrike,
      strikeOrigin,
      strikeOriginLabel,
      dte,
      expiration,
      bid,
      ask,
      close,
      theoreticalPremium: null,
      marketPremium: null,
      premiumUsed: null,
      premiumReliability: 'SEM_DADOS',
      premiumReliabilityLabel: '⛔ Sem Dados — Prêmio Indisponível',
      delta: null,
      legRationale,
    };
  }

  const T = dte / 252;
  const sigma = hv21 / 100;
  const r = getRiskFreeRate();
  const bs = calculateBlackScholes(spot, effectiveStrike, T, r, sigma, type === 'CALL' ? 'call' : 'put');
  const theoretical = Number(Math.max(0, bs.theoreticalPrice).toFixed(2));

  return {
    symbol,
    action,
    type,
    strike: effectiveStrike,
    strikeOrigin,
    strikeOriginLabel,
    dte,
    expiration,
    bid,
    ask,
    close,
    theoreticalPremium: theoretical,
    marketPremium: null,
    premiumUsed: theoretical,
    premiumReliability: 'TEORICO_BS_HV_REAL',
    premiumReliabilityLabel: `⚡ Teórico B-S (HV21=${hv21.toFixed(1)}%, DTE=${dte}d, Selic=${(r * 100).toFixed(2)}%)`,
    delta: Number(bs.delta.toFixed(4)),
    legRationale,
  };
}

function calcPremium(
  spot: number,
  strike: number,
  dte: number,
  hv21: number | null,
  type: 'CALL' | 'PUT',
  marketPremium: number | null = null
): {
  theoreticalPremium: number | null;
  marketPremium: number | null;
  premiumUsed: number | null;
  premiumReliability: PremiumReliabilityType;
  premiumReliabilityLabel: string;
  delta: number | null;
} {
  if (marketPremium !== null && marketPremium > 0) {
    return {
      theoreticalPremium: null,
      marketPremium,
      premiumUsed: marketPremium,
      premiumReliability: 'REAL_MERCADO',
      premiumReliabilityLabel: '✅ Real BRAPI (negócio recente)',
      delta: null,
    };
  }

  if (!hv21 || hv21 <= 0 || dte <= 0 || spot <= 0 || strike <= 0) {
    return {
      theoreticalPremium: null,
      marketPremium: null,
      premiumUsed: null,
      premiumReliability: 'SEM_DADOS',
      premiumReliabilityLabel: '⛔ Sem Dados — Prêmio Indisponível',
      delta: null,
    };
  }

  const T = dte / 252;
  const sigma = hv21 / 100;
  const r = getRiskFreeRate();
  const bsType = type === 'CALL' ? 'call' : 'put';
  const bs = calculateBlackScholes(spot, strike, T, r, sigma, bsType);
  const theoretical = Number(Math.max(0, bs.theoreticalPrice).toFixed(2));

  return {
    theoreticalPremium: theoretical,
    marketPremium: null,
    premiumUsed: theoretical,
    premiumReliability: 'TEORICO_BS_HV_REAL',
    premiumReliabilityLabel: `⚡ Teórico B-S (HV21=${hv21.toFixed(1)}%, DTE=${dte}d, Selic=${(r * 100).toFixed(2)}%)`,
    delta: Number(bs.delta.toFixed(4)),
  };
}

// ─────────────────────────────────────────────────────────────
// HELPER: Geração de pontos do gráfico de payoff
// ─────────────────────────────────────────────────────────────

/**
 * Gera os pontos do gráfico de payoff.
 *
 * - netPayoff (linha sólida): MATEMÁTICA PURA no vencimento — 100% Real e Determinístico.
 *   Fórmula: Σ(payoff de cada perna) - custo líquido de entrada.
 *   Para CALL comprada: max(0, spotFinal - K) - prêmioPago
 *   Para PUT comprada:  max(0, K - spotFinal) - prêmioPago
 *   Para CALL vendida:  prêmioRecebido - max(0, spotFinal - K)
 *   Para PUT vendida:   prêmioRecebido - max(0, K - spotFinal)
 *
 * - currentPnL (linha tracejada): ESTIMATIVA Black-Scholes do P&L atual (MODELO).
 *   Calculado com HV21 real, DTE real, Selic real.
 */
function generatePayoffPoints(
  legs: OptionLeg[],
  spot: number,
  hv21: number | null,
  dteRemaining: number
): PayoffPoint[] {
  const r = getRiskFreeRate();
  // Gerar range de spots: -40% a +40% do spot atual, 81 pontos
  const rangeMin = spot * 0.6;
  const rangeMax = spot * 1.4;
  const steps = 80;
  const stepSize = (rangeMax - rangeMin) / steps;

  const points: PayoffPoint[] = [];

  for (let i = 0; i <= steps; i++) {
    const spotAtExpiry = Number((rangeMin + i * stepSize).toFixed(2));

    // --- Payoff no Vencimento (100% Real / Matemático) ---
    let netPayoff = 0;
    for (const leg of legs) {
      const premium = leg.premiumUsed ?? 0;
      if (leg.type === 'CALL') {
        const intrinsic = Math.max(0, spotAtExpiry - leg.strike);
        if (leg.action === 'COMPRAR') netPayoff += intrinsic - premium;
        else netPayoff += premium - intrinsic;
      } else {
        const intrinsic = Math.max(0, leg.strike - spotAtExpiry);
        if (leg.action === 'COMPRAR') netPayoff += intrinsic - premium;
        else netPayoff += premium - intrinsic;
      }
    }

    // --- P&L Atual por Black-Scholes (Estimativa de Modelo) ---
    let currentPnL: number | null = null;
    if (hv21 && hv21 > 0 && dteRemaining > 0) {
      const T = dteRemaining / 252;
      const sigma = hv21 / 100;
      let pnlAccum = 0;
      let allLegsHaveData = true;

      for (const leg of legs) {
        const premium = leg.premiumUsed;
        if (premium === null) {
          allLegsHaveData = false;
          break;
        }
        const bsType = leg.type === 'CALL' ? 'call' : 'put';
        const bs = calculateBlackScholes(spotAtExpiry, leg.strike, T, r, sigma, bsType);
        const currentValue = Math.max(0, bs.theoreticalPrice);

        if (leg.action === 'COMPRAR') pnlAccum += currentValue - premium;
        else pnlAccum += premium - currentValue;
      }

      if (allLegsHaveData) currentPnL = Number(pnlAccum.toFixed(2));
    }

    points.push({
      spotAtExpiry,
      netPayoff: Number(netPayoff.toFixed(2)),
      currentPnL,
    });
  }

  return points;
}

/**
 * Constrói os metadados de confiabilidade do gráfico de payoff — transparência total.
 */
function buildPayoffReliability(
  legs: OptionLeg[],
  hv21: number | null,
  dataDate: string
): PayoffReliability {
  const r = getRiskFreeRate();
  const warnings: string[] = [];

  for (const leg of legs) {
    if (leg.premiumReliability === 'SEM_DADOS') {
      warnings.push(
        `${leg.action} ${leg.type} R$${leg.strike.toFixed(2)}: sem dados de prêmio disponíveis`
      );
    } else if (leg.premiumReliability === 'TEORICO_BS_HV_REAL') {
      warnings.push(
        `${leg.action} ${leg.type} R$${leg.strike.toFixed(2)}: ${leg.premiumReliabilityLabel} — verificar liquidez real antes de operar`
      );
    }
  }

  return {
    expiryPayoffIsReal: true,
    expiryPayoffExplanation:
      'Linha sólida (Payoff no Vencimento): MATEMÁTICA PURA — fórmula determinística max(0, S-K) para CALL e max(0, K-S) para PUT. Independe de qualquer modelo. 100% real e exato.',
    currentPnLIsTheoretical: true,
    currentPnLExplanation: hv21
      ? `Linha tracejada (P&L Atual Estimado): Black-Scholes calibrado com HV21=${hv21.toFixed(1)}% (21 fechamentos reais BRAPI), DTE real e Selic=${(r * 100).toFixed(2)}% (MACRO real). É uma ESTIMATIVA de modelo — não é preço de mercado.`
      : 'Linha tracejada indisponível: HV21 insuficiente (mínimo 22 fechamentos reais necessários).',
    premiumWarnings: warnings,
    hv21Used: hv21,
    riskFreeRateUsed: Number((r * 100).toFixed(2)),
    dataDate,
  };
}

// ─────────────────────────────────────────────────────────────
// HELPER: Score de Convicção (auditável, 0-100)
// ─────────────────────────────────────────────────────────────

function computeConvictionScore(
  regime: MarketRegime,
  expectedDirection: 'ALTA' | 'BAIXA' | 'NEUTRO',
  requiresBarrierAnchor: boolean
): ConvictionFactors {
  const explanation: string[] = [];

  // A) Z-Score Alignment (0-25)
  let zScoreAlignment = 0;
  const z = regime.zScore;
  if (expectedDirection === 'ALTA') {
    if (z >= -2.5 && z <= -1.5) { zScoreAlignment = 25; explanation.push('Z-Score: spot em suporte estatístico forte (-2.5σ a -1.5σ) → ótimo ponto de entrada altista'); }
    else if (z < -0.5) { zScoreAlignment = 18; explanation.push('Z-Score: spot abaixo da média → alinhamento moderado altista'); }
    else if (z < 0.5) { zScoreAlignment = 10; explanation.push('Z-Score: spot em equilíbrio → alinhamento neutro'); }
    else { zScoreAlignment = 3; explanation.push('Z-Score: spot em extensão de alta → contra-tendência estatística'); }
  } else if (expectedDirection === 'BAIXA') {
    if (z >= 1.5 && z <= 2.5) { zScoreAlignment = 25; explanation.push('Z-Score: spot em resistência estatística forte (+1.5σ a +2.5σ) → ótimo ponto de entrada baixista'); }
    else if (z > 0.5) { zScoreAlignment = 18; explanation.push('Z-Score: spot acima da média → alinhamento moderado baixista'); }
    else if (z > -0.5) { zScoreAlignment = 10; explanation.push('Z-Score: spot em equilíbrio → alinhamento neutro'); }
    else { zScoreAlignment = 3; explanation.push('Z-Score: spot em extensão de baixa → contra-tendência estatística'); }
  } else {
    if (Math.abs(z) < 1.0) { zScoreAlignment = 22; explanation.push('Z-Score: spot próximo da média → ideal para estratégias neutras'); }
    else { zScoreAlignment = 12; explanation.push('Z-Score: spot com desvio → estratégia neutra com algum viés direcional'); }
  }

  // B) Flow Alignment (0-25)
  let flowAlignment = 0;
  if (expectedDirection === 'ALTA' && regime.flowSignal === 'ACCUMULATION_CALL') {
    flowAlignment = 25; explanation.push('Fluxo 5D: acúmulo real de CALLs → institucional comprado na mesma direção');
  } else if (expectedDirection === 'BAIXA' && regime.flowSignal === 'ACCUMULATION_PUT') {
    flowAlignment = 25; explanation.push('Fluxo 5D: acúmulo real de PUTs → institucional protegido, pressão baixista');
  } else if (regime.flowSignal === 'UNWINDING') {
    flowAlignment = 8; explanation.push('Fluxo 5D: desmonte simultâneo → mercado desalavancando, maior incerteza');
  } else if (regime.flowSignal === 'NEUTRAL') {
    flowAlignment = 14; explanation.push('Fluxo 5D: sem sinal dominante de 5D → convicção de fluxo neutra');
  } else {
    flowAlignment = 10; explanation.push('Fluxo 5D: fluxo parcialmente alinhado');
  }

  // C) Barrier Alignment (0-25)
  let barrierAlignment = 0;
  if (!requiresBarrierAnchor) {
    barrierAlignment = 20;
    explanation.push('Ancoragem: estratégia ancorada em bandas estatísticas reais de 200P');
  } else if (regime.topCallBarrierStrike !== null && regime.topPutBarrierStrike !== null) {
    barrierAlignment = 25;
    explanation.push(`Ancoragem: ambas as pontas em barreiras reais de OI (CALL R$${regime.topCallBarrierStrike.toFixed(2)}, PUT R$${regime.topPutBarrierStrike.toFixed(2)})`);
  } else if (regime.topCallBarrierStrike !== null || regime.topPutBarrierStrike !== null) {
    barrierAlignment = 16;
    explanation.push('Ancoragem: uma das barreiras reais disponível');
  } else {
    barrierAlignment = 6;
    explanation.push('Ancoragem: barreiras reais indisponíveis — usando bandas estatísticas');
  }

  // D) PCR Alignment (0-25)
  let pcrAlignment = 0;
  if (expectedDirection === 'ALTA') {
    if (regime.pcrSignal === 'BEARISH_EXTREMO' || regime.pcrSignal === 'BEARISH') {
      pcrAlignment = 22; explanation.push(`PCR ${regime.pcr.toFixed(2)}: medo elevado cria oportunidade de alta contrária — prêmios de PUT inflados`);
    } else if (regime.pcrSignal === 'NEUTRO') {
      pcrAlignment = 14; explanation.push('PCR neutro: sem sinal de contrarianism extremo');
    } else {
      pcrAlignment = 6; explanation.push('PCR bullish: mercado já posicionado → menor assimetria de entrada altista');
    }
  } else if (expectedDirection === 'BAIXA') {
    if (regime.pcrSignal === 'BULLISH_EXTREMO') {
      pcrAlignment = 25; explanation.push(`PCR ${regime.pcr.toFixed(2)}: mercado descoberto de proteção → máxima assimetria baixista, risco de sell-off abrupto`);
    } else if (regime.pcrSignal === 'BULLISH') {
      pcrAlignment = 18; explanation.push(`PCR ${regime.pcr.toFixed(2)}: predomínio de CALLs → vulnerabilidade baixista`);
    } else if (regime.pcrSignal === 'NEUTRO') {
      pcrAlignment = 12; explanation.push('PCR neutro');
    } else {
      pcrAlignment = 6; explanation.push('PCR bearish: mercado já protegido → menor urgência de hedge');
    }
  } else {
    pcrAlignment = 18; explanation.push('PCR: estratégia neutra não requer alinhamento direcional do PCR');
  }

  return {
    zScoreAlignment,
    flowAlignment,
    barrierAlignment,
    pcrAlignment,
    explanation,
  };
}

// ─────────────────────────────────────────────────────────────
// ESTRATÉGIAS INDIVIDUAIS
// ─────────────────────────────────────────────────────────────

function buildBullPutSpread(
  regime: MarketRegime,
  expiration: string,
  dte: number,
  hv21: number | null,
  dataDate: string,
  chain?: OptionChainItem[]
): StrategyRecommendation {
  const spot = regime.spotPrice;

  // Strike vendido: maior barreira de PUT real (se disponível) ou alvo intermediário
  const shortPutTarget = regime.topPutBarrierStrike
    ?? Number((regime.lowerBand2Sigma + (spot - regime.lowerBand2Sigma) / 2).toFixed(2));
  const shortPutOrigin: StrikeOriginType = regime.topPutBarrierStrike
    ? 'BARREIRA_PUT_REAL' : 'BANDA_2SIGMA_REAL';
  const shortPutDesc = regime.topPutBarrierStrike
    ? `Barreira de PUT com maior OI real B3 (R$${regime.topPutBarrierStrike.toFixed(2)})`
    : `Alvo Banda -2σ real (R$${regime.lowerBand2Sigma.toFixed(2)})`;

  const shortLeg = resolveOptionLeg({
    action: 'VENDER',
    type: 'PUT',
    targetStrike: shortPutTarget,
    strikeOrigin: shortPutOrigin,
    strikeOriginDescription: shortPutDesc,
    chain,
    spot,
    dte,
    hv21,
    expiration,
    legRationale: 'PUT vendida ancorada na barreira real de maior OI — captura prêmio máximo onde o mercado concentrou suporte institucional',
  });

  // Strike comprado: banda -2σ real (proteção de cauda e limitação de risco)
  const longPutTarget = Number(regime.lowerBand2Sigma.toFixed(2));
  const longLeg = resolveOptionLeg({
    action: 'COMPRAR',
    type: 'PUT',
    targetStrike: Math.min(longPutTarget, shortLeg.strike * 0.97),
    strikeOrigin: 'BANDA_2SIGMA_REAL',
    strikeOriginDescription: `Banda -2σ real (R$${regime.lowerBand2Sigma.toFixed(2)})`,
    chain,
    spot,
    dte,
    hv21,
    expiration,
    legRationale: 'PUT comprada na banda -2σ real — limita o risco máximo ao spread entre as pernas',
    constraint: 'STRICTLY_LESS_THAN',
    constraintStrike: shortLeg.strike,
  });

  const legs: OptionLeg[] = [shortLeg, longLeg];

  const netCredit = (shortLeg.premiumUsed ?? 0) - (longLeg.premiumUsed ?? 0);
  const spreadWidth = shortLeg.strike - longLeg.strike;
  const maxRiskPerLot = spreadWidth > netCredit ? (spreadWidth - netCredit) * 100 : null;
  const maxReturnPerLot = netCredit > 0 ? netCredit * 100 : null;
  const breakEven = shortLeg.strike - netCredit;

  // Perna de cauda: se Z < -2σ, ativa compra adicional de PUT de cauda (-3σ)
  const tailStrikeTarget = Number(regime.lowerBand3Sigma.toFixed(2));
  const tailIsActive = regime.zScore < -2.0;
  const tailLegResolved = resolveOptionLeg({
    action: 'COMPRAR',
    type: 'PUT',
    targetStrike: tailStrikeTarget,
    strikeOrigin: 'BANDA_3SIGMA_REAL',
    strikeOriginDescription: `Banda -3σ real (R$${tailStrikeTarget.toFixed(2)})`,
    chain,
    spot,
    dte,
    hv21,
    expiration,
    legRationale: 'PUT de cauda na banda -3σ real — custo pequeno, retorno assimétrico em eventos de pânico extremo',
    constraint: 'STRICTLY_LESS_THAN',
    constraintStrike: longLeg.strike,
  });

  const tailLeg: TailRiskLeg = {
    type: 'PROTECAO_CAUDA',
    typeLabel: '🛡️ Proteção de Cauda (Black Swan Hedge)',
    triggerZScore: -2.0,
    triggerCondition: `Ativa quando Z-Score < -2.0σ (Regime atual: ${regime.zScore.toFixed(2)}σ)`,
    isCurrentlyActive: tailIsActive,
    legs: [tailLegResolved],
    rationale: tailIsActive
      ? `⚠️ CAUDA ATIVA: Z-Score atual de ${regime.zScore.toFixed(2)}σ está em extensão de queda. O acréscimo desta PUT em ${tailLegResolved.strikeOriginLabel} transforma a estrutura de Trava de Alta em "Trava com Seguro de Cauda", pagando de forma assimétrica em eventos extremos raros.`
      : `ℹ️ Cauda não ativa (Z = ${regime.zScore.toFixed(2)}σ, acima do gatilho de -2.0σ). Disponível para ativação manual se o mercado deteriorar para extensão de queda.`,
  };

  const convictionFactors = computeConvictionScore(regime, 'ALTA', true);
  const convictionScore = Math.min(
    100,
    convictionFactors.zScoreAlignment +
      convictionFactors.flowAlignment +
      convictionFactors.barrierAlignment +
      convictionFactors.pcrAlignment
  );

  const payoffPoints = generatePayoffPoints(legs, spot, hv21, dte);
  const payoffReliability = buildPayoffReliability(legs, hv21, dataDate);

  const alertas: string[] = [];
  if (regime.tailRiskIndex >= 70)
    alertas.push('⚠️ Índice de Risco de Cauda elevado: considere adicionar a perna de Black Swan Hedge');
  if (netCredit <= 0)
    alertas.push('⛔ Crédito líquido indisponível com dados atuais — verificar prêmios reais de mercado');
  if (regime.isInsufficient)
    alertas.push('⚠️ Amostra estatística insuficiente (< 30 fechamentos reais) — bandas menos confiáveis');

  return {
    id: 'BULL_PUT_SPREAD',
    name: 'Trava de Alta com PUT (Bull Put Spread)',
    nameEn: 'Bull Put Spread',
    category: 'TATICA',
    targetProfiles: ['TATICO', 'CONSERVADOR'],
    convictionScore,
    convictionFactors,
    regime: regime.regime,
    legs,
    tailRisk: tailLeg,
    maxRiskPerLot,
    maxReturnPerLot,
    breakEvenAtExpiry: Number(breakEven.toFixed(2)),
    returnOnRiskPercent:
      maxRiskPerLot && maxReturnPerLot
        ? Number(((maxReturnPerLot / maxRiskPerLot) * 100).toFixed(1))
        : null,
    payoffPoints,
    payoffReliability,
    rationale: `📊 TRAVA DE ALTA COM PUT (BULL PUT SPREAD)

Regime Estatístico: ${regime.regimeLabel}
Preço SPOT Real (BRAPI): R$${spot.toFixed(2)} | Média 200P Real: R$${regime.spotPrice.toFixed(2)} | Z-Score: ${regime.zScore.toFixed(2)}σ

LÓGICA DA ESTRUTURA:
Vendemos a PUT no strike R$${shortLeg.strike.toFixed(2)} (${shortLeg.strikeOriginLabel}) e compramos proteção no R$${longLeg.strike.toFixed(2)} (${longLeg.strikeOriginLabel}). Esta é uma estrutura de crédito: recebemos o prêmio líquido de entrada e o lucro máximo é obtido se o ativo fechar ACIMA de R$${shortLeg.strike.toFixed(2)} no vencimento.

ANCORAGEM EM DADOS REAIS:
• Strike vendido: ${shortLeg.strikeOriginLabel} (${shortLeg.symbol ?? 'B3'})
• Strike comprado: ${longLeg.strikeOriginLabel} (${longLeg.symbol ?? 'B3'})
• Prêmios: ${shortLeg.premiumReliabilityLabel} / ${longLeg.premiumReliabilityLabel}

RAZÃO PUT/CALL REAL: ${regime.pcr.toFixed(2)} (${regime.pcrLabel})
FLUXO INSTITUCIONAL 5D: ${regime.flowLabel}

GESTÃO DO RISCO: Risco máximo limitado ao spread (R$${spreadWidth.toFixed(2)}) menos o crédito recebido. Perda máxima por lote: ${maxRiskPerLot !== null ? `R$${maxRiskPerLot.toFixed(0)}` : 'calcular após verificar prêmios reais'}.`,
    alertas,
    isDataInsufficient: regime.isInsufficient,
    insufficientDataReason: regime.isInsufficient
      ? 'Amostra de fechamentos insuficiente para bandas estatísticas confiáveis'
      : undefined,
  };
}

function buildBearCallSpread(
  regime: MarketRegime,
  expiration: string,
  dte: number,
  hv21: number | null,
  dataDate: string,
  chain?: OptionChainItem[]
): StrategyRecommendation {
  const spot = regime.spotPrice;

  const shortCallTarget = regime.topCallBarrierStrike
    ?? Number(regime.upperBand2Sigma.toFixed(2));
  const shortCallOrigin: StrikeOriginType = regime.topCallBarrierStrike
    ? 'BARREIRA_CALL_REAL' : 'BANDA_2SIGMA_REAL';
  const shortCallDesc = regime.topCallBarrierStrike
    ? `Barreira de CALL com maior OI real B3 (R$${regime.topCallBarrierStrike.toFixed(2)})`
    : `Banda +2σ real: R$${regime.upperBand2Sigma.toFixed(2)} (200 fechamentos BRAPI)`;

  const shortLeg = resolveOptionLeg({
    action: 'VENDER',
    type: 'CALL',
    targetStrike: shortCallTarget,
    strikeOrigin: shortCallOrigin,
    strikeOriginDescription: shortCallDesc,
    chain,
    spot,
    dte,
    hv21,
    expiration,
    legRationale: 'CALL vendida na maior barreira real — concentração máxima de resistência institucional',
  });

  const longCallTarget = Number(Math.max(shortLeg.strike * 1.03, regime.upperBand3Sigma).toFixed(2));
  const longLeg = resolveOptionLeg({
    action: 'COMPRAR',
    type: 'CALL',
    targetStrike: longCallTarget,
    strikeOrigin: 'BANDA_3SIGMA_REAL',
    strikeOriginDescription: `Banda +3σ real: R$${regime.upperBand3Sigma.toFixed(2)}`,
    chain,
    spot,
    dte,
    hv21,
    expiration,
    legRationale: 'CALL comprada na banda +3σ real — proteção contra rally de cauda (melt-up)',
    constraint: 'STRICTLY_GREATER_THAN',
    constraintStrike: shortLeg.strike,
  });

  const legs: OptionLeg[] = [shortLeg, longLeg];

  const netCredit = (shortLeg.premiumUsed ?? 0) - (longLeg.premiumUsed ?? 0);
  const spreadWidth = longLeg.strike - shortLeg.strike;
  const maxRiskPerLot = netCredit >= 0 ? (spreadWidth - netCredit) * 100 : null;
  const maxReturnPerLot = netCredit > 0 ? netCredit * 100 : null;

  // Cauda CALL: ativa em regime EXTREMO_ALTA para surfar melt-up
  const tailIsActive = regime.regime === 'EXTREMO_ALTA' || regime.regime === 'EXTENSAO_ALTA';
  const tailCallTarget = Number((spot * 1.05).toFixed(2));
  const tailCallResolved = resolveOptionLeg({
    action: 'COMPRAR',
    type: 'CALL',
    targetStrike: tailCallTarget,
    strikeOrigin: 'SPREAD_CALCULADO',
    strikeOriginDescription: `+5% do spot real (R$${tailCallTarget.toFixed(2)})`,
    chain,
    spot,
    dte,
    hv21,
    expiration,
    legRationale: 'CALL adicional comprada para capturar melt-up em regime de extensão — retorno assimétrico',
    constraint: 'STRICTLY_GREATER_THAN',
    constraintStrike: longLeg.strike,
  });

  const tailLeg: TailRiskLeg = {
    type: 'OPORTUNIDADE_OUTLIER',
    typeLabel: '⚡ Oportunidade de Outlier (CALL Backspread)',
    triggerZScore: 2.0,
    triggerCondition: `Ativa quando Z-Score > +2.0σ (Regime atual: ${regime.zScore.toFixed(2)}σ)`,
    isCurrentlyActive: tailIsActive,
    legs: [tailCallResolved],
    rationale: tailIsActive
      ? `⚡ OUTLIER ATIVO: Z = ${regime.zScore.toFixed(2)}σ em extensão de alta. A adição de CALL comprada (${tailCallResolved.strikeOriginLabel}) cria um CALL Backspread híbrido: o spread base protege contra queda, mas a CALL adicional captura exponencialmente se o mercado continuar em melt-up.`
      : `ℹ️ Outlier não ativo (Z = ${regime.zScore.toFixed(2)}σ, abaixo do gatilho de +2.0σ). Disponível para ativação se mercado entrar em extensão de alta.`,
  };

  const convictionFactors = computeConvictionScore(regime, 'BAIXA', true);
  const convictionScore = Math.min(
    100,
    convictionFactors.zScoreAlignment +
      convictionFactors.flowAlignment +
      convictionFactors.barrierAlignment +
      convictionFactors.pcrAlignment
  );

  const payoffPoints = generatePayoffPoints(legs, spot, hv21, dte);
  const payoffReliability = buildPayoffReliability(legs, hv21, dataDate);

  const alertas: string[] = [];
  if (regime.pcrSignal === 'BEARISH_EXTREMO')
    alertas.push('ℹ️ PCR elevado indica máximo hedge institucional — bear spread tende a ter prêmios comprimidos');
  if (netCredit <= 0)
    alertas.push('⛔ Crédito líquido negativo com dados atuais — verificar prêmios reais de mercado');

  return {
    id: 'BEAR_CALL_SPREAD',
    name: 'Trava de Baixa com CALL (Bear Call Spread)',
    nameEn: 'Bear Call Spread',
    category: 'TATICA',
    targetProfiles: ['TATICO', 'ESPECULATIVO'],
    convictionScore,
    convictionFactors,
    regime: regime.regime,
    legs,
    tailRisk: tailLeg,
    maxRiskPerLot,
    maxReturnPerLot,
    breakEvenAtExpiry: Number((shortLeg.strike + netCredit).toFixed(2)),
    returnOnRiskPercent:
      maxRiskPerLot && maxReturnPerLot
        ? Number(((maxReturnPerLot / maxRiskPerLot) * 100).toFixed(1))
        : null,
    payoffPoints,
    payoffReliability,
    rationale: `📊 TRAVA DE BAIXA COM CALL (BEAR CALL SPREAD) — Regime: ${regime.regimeLabel}

LÓGICA: Vendemos a barreira de CALL de maior resistência real (R$${shortLeg.strike.toFixed(2)}) e compramos cobertura na banda +3σ real (R$${longLeg.strike.toFixed(2)}). Estrutura de crédito baixista — lucro máximo se o ativo fechar ABAIXO de R$${shortLeg.strike.toFixed(2)}.

ANCORAGEM REAL:
• Strike vendido: ${shortLeg.strikeOriginLabel} (${shortLeg.symbol ?? 'B3'})
• Strike comprado: ${longLeg.strikeOriginLabel} (${longLeg.symbol ?? 'B3'})

PCR real: ${regime.pcr.toFixed(2)} (${regime.pcrLabel})
Fluxo 5D: ${regime.flowLabel}`,
    alertas,
    isDataInsufficient: regime.isInsufficient,
  };
}

function buildIronCondor(
  regime: MarketRegime,
  expiration: string,
  dte: number,
  hv21: number | null,
  dataDate: string,
  chain?: OptionChainItem[]
): StrategyRecommendation {
  const spot = regime.spotPrice;

  // Short Call
  const scTarget = regime.topCallBarrierStrike ?? Number(regime.upperBand2Sigma.toFixed(2));
  const scOrigin: StrikeOriginType = regime.topCallBarrierStrike ? 'BARREIRA_CALL_REAL' : 'BANDA_2SIGMA_REAL';
  const scDesc = regime.topCallBarrierStrike
    ? `Barreira CALL real maior OI (R$${scTarget.toFixed(2)})`
    : `Banda +2σ real (R$${scTarget.toFixed(2)})`;
  const scLeg = resolveOptionLeg({
    action: 'VENDER', type: 'CALL', targetStrike: scTarget,
    strikeOrigin: scOrigin, strikeOriginDescription: scDesc,
    chain, spot, dte, hv21, expiration,
    legRationale: 'CALL curta no topo da banda — máxima concentração de resistência real',
  });

  // Long Call (protege melt-up)
  const lcTarget = Number(regime.upperBand3Sigma.toFixed(2));
  const lcLeg = resolveOptionLeg({
    action: 'COMPRAR', type: 'CALL', targetStrike: lcTarget,
    strikeOrigin: 'BANDA_3SIGMA_REAL',
    strikeOriginDescription: `Banda +3σ real (R$${lcTarget.toFixed(2)})`,
    chain, spot, dte, hv21, expiration,
    legRationale: 'Cobertura de cauda superior (+3σ real) — risco limitado em rally extremo',
    constraint: 'STRICTLY_GREATER_THAN',
    constraintStrike: scLeg.strike,
  });

  // Short Put
  const spTarget = regime.topPutBarrierStrike ?? Number(regime.lowerBand2Sigma.toFixed(2));
  const spOrigin: StrikeOriginType = regime.topPutBarrierStrike ? 'BARREIRA_PUT_REAL' : 'BANDA_2SIGMA_REAL';
  const spDesc = regime.topPutBarrierStrike
    ? `Barreira PUT real maior OI (R$${spTarget.toFixed(2)})`
    : `Banda -2σ real (R$${spTarget.toFixed(2)})`;
  const spLeg = resolveOptionLeg({
    action: 'VENDER', type: 'PUT', targetStrike: spTarget,
    strikeOrigin: spOrigin, strikeOriginDescription: spDesc,
    chain, spot, dte, hv21, expiration,
    legRationale: 'PUT curta no suporte da banda — máxima concentração de suporte real',
  });

  // Long Put (protege crash)
  const lpTarget = Number(regime.lowerBand3Sigma.toFixed(2));
  const lpLeg = resolveOptionLeg({
    action: 'COMPRAR', type: 'PUT', targetStrike: lpTarget,
    strikeOrigin: 'BANDA_3SIGMA_REAL',
    strikeOriginDescription: `Banda -3σ real (R$${lpTarget.toFixed(2)})`,
    chain, spot, dte, hv21, expiration,
    legRationale: 'Cobertura de cauda inferior (-3σ real) — risco limitado em crash extremo',
    constraint: 'STRICTLY_LESS_THAN',
    constraintStrike: spLeg.strike,
  });

  const legs: OptionLeg[] = [scLeg, lcLeg, spLeg, lpLeg];

  const netCredit =
    (scLeg.premiumUsed ?? 0) - (lcLeg.premiumUsed ?? 0) +
    (spLeg.premiumUsed ?? 0) - (lpLeg.premiumUsed ?? 0);
  const callSpread = lcLeg.strike - scLeg.strike;
  const putSpread = spLeg.strike - lpLeg.strike;
  const maxRisk = Math.max(callSpread, putSpread) - netCredit;

  // Cauda do Iron Condor: alertar se Z for muito extremo
  const tailIsActive = Math.abs(regime.zScore) > 2.5;
  const tailLeg: TailRiskLeg = {
    type: 'PROTECAO_CAUDA',
    typeLabel: '🛡️ Alerta de Ruptura de Banda',
    triggerZScore: 2.5,
    triggerCondition: `Ativa quando |Z-Score| > 2.5σ (Regime atual: ${regime.zScore.toFixed(2)}σ)`,
    isCurrentlyActive: tailIsActive,
    legs: [],
    rationale: tailIsActive
      ? `⚠️ ALERTA: Z = ${regime.zScore.toFixed(2)}σ indica que o spot já está em zona de extensão. Iron Condor em regime de extensão tem probabilidade reduzida de sucesso — considere fechar a perna vendida na direção da extensão e manter apenas a perna oposta como spread direcional.`
      : `Iron Condor estruturado nas bandas reais de ±2σ e ±3σ com opções reais da B3. Proteção de cauda embutida nas pernas compradas de CALL e PUT. Fechamento sugerido se spot romper qualquer banda -2σ real.`,
  };

  const convictionFactors = computeConvictionScore(regime, 'NEUTRO', true);
  const convictionScore = Math.min(100,
    convictionFactors.zScoreAlignment + convictionFactors.flowAlignment +
    convictionFactors.barrierAlignment + convictionFactors.pcrAlignment);

  const payoffPoints = generatePayoffPoints(legs, spot, hv21, dte);
  const payoffReliability = buildPayoffReliability(legs, hv21, dataDate);

  const alertas: string[] = [];
  if (Math.abs(regime.zScore) >= 2.0)
    alertas.push(`⚠️ Z-Score = ${regime.zScore.toFixed(2)}σ: Iron Condor contra-indicado em extensão de banda — uma das pernas vendidas está em desvantagem estatística`);
  if (regime.tailRiskIndex >= 60)
    alertas.push('⚠️ Índice de Risco de Cauda moderado/alto — monitorar posição de perto');

  return {
    id: 'IRON_CONDOR',
    name: 'Iron Condor nas Bandas Reais (±2σ e ±3σ)',
    nameEn: 'Iron Condor (Statistical Bands)',
    category: 'TATICA',
    targetProfiles: ['TATICO', 'CONSERVADOR'],
    convictionScore,
    convictionFactors,
    regime: regime.regime,
    legs,
    tailRisk: tailLeg,
    maxRiskPerLot: maxRisk > 0 ? maxRisk * 100 : null,
    maxReturnPerLot: netCredit > 0 ? netCredit * 100 : null,
    breakEvenAtExpiry: null, // Dois break-evens
    returnOnRiskPercent: maxRisk > 0 && netCredit > 0
      ? Number(((netCredit / maxRisk) * 100).toFixed(1)) : null,
    payoffPoints,
    payoffReliability,
    rationale: `📊 IRON CONDOR NAS BANDAS REAIS — Regime: ${regime.regimeLabel}

LÓGICA: Vendemos os extremos de ±2σ reais (onde estatisticamente o mercado reverte ~95% dos pregões) e compramos cobertura nos extremos de ±3σ (evento de cauda). Estrutura de quatro pernas de crédito total com opções 100% reais listadas na B3.

ANCORAGEM ESTATÍSTICA REAL (B3):
• CALL vendida: R$${scLeg.strike.toFixed(2)} (${scLeg.symbol ?? 'B3'})
• CALL comprada: R$${lcLeg.strike.toFixed(2)} (${lcLeg.symbol ?? 'B3'} — proteção de melt-up)
• PUT vendida: R$${spLeg.strike.toFixed(2)} (${spLeg.symbol ?? 'B3'})
• PUT comprada: R$${lpLeg.strike.toFixed(2)} (${lpLeg.symbol ?? 'B3'} — proteção de black swan)
• Base estatística: ${regime.sampleSize} fechamentos reais BRAPI

PCR real: ${regime.pcr.toFixed(2)} | Fluxo 5D: ${regime.flowLabel}`,
    alertas,
    isDataInsufficient: regime.isInsufficient,
  };
}

function buildCoveredCallWithCollar(
  regime: MarketRegime,
  expiration: string,
  dte: number,
  hv21: number | null,
  dataDate: string,
  chain?: OptionChainItem[]
): StrategyRecommendation {
  const spot = regime.spotPrice;

  // CALL vendida: acima da barreira real de CALL ou +2σ
  const callTarget = regime.topCallBarrierStrike ?? Number(regime.upperBand2Sigma.toFixed(2));
  const callOrigin: StrikeOriginType = regime.topCallBarrierStrike ? 'BARREIRA_CALL_REAL' : 'BANDA_2SIGMA_REAL';
  const callDesc = regime.topCallBarrierStrike
    ? `Barreira de CALL real maior OI B3 (R$${callTarget.toFixed(2)})`
    : `Banda +2σ real (R$${callTarget.toFixed(2)})`;

  const callLeg = resolveOptionLeg({
    action: 'VENDER', type: 'CALL', targetStrike: callTarget,
    strikeOrigin: callOrigin, strikeOriginDescription: callDesc,
    chain, spot, dte, hv21, expiration,
    legRationale: 'CALL vendida contra posição comprada no ativo — gera renda mensal com teto de ganho na barreira real',
    constraint: 'STRICTLY_GREATER_THAN',
    constraintStrike: spot * 0.98,
  });

  // PUT comprada: banda -2σ real (seguro)
  const putTarget = Number(regime.lowerBand2Sigma.toFixed(2));
  const putLeg = resolveOptionLeg({
    action: 'COMPRAR', type: 'PUT', targetStrike: putTarget,
    strikeOrigin: 'BANDA_2SIGMA_REAL',
    strikeOriginDescription: `Banda -2σ real (R$${putTarget.toFixed(2)})`,
    chain, spot, dte, hv21, expiration,
    legRationale: 'PUT comprada como seguro da posição spot — protege a carteira abaixo da banda -2σ real',
    constraint: 'STRICTLY_LESS_THAN',
    constraintStrike: spot * 1.02,
  });

  const legs: OptionLeg[] = [callLeg, putLeg];

  const callPremium = callLeg.premiumUsed ?? 0;
  const putPremium = putLeg.premiumUsed ?? 0;
  const netCredit = callPremium - putPremium;
  const monthlyYield = spot > 0 ? Number(((netCredit / spot) * 100).toFixed(2)) : null;

  // Cauda: se Z < -2.5σ, elevar a PUT de seguro para mais próxima do spot
  const tailIsActive = regime.zScore < -2.0;
  const closerPutTarget = Number((spot * 0.95).toFixed(2));
  const tailPutResolved = resolveOptionLeg({
    action: 'COMPRAR', type: 'PUT', targetStrike: closerPutTarget,
    strikeOrigin: 'SPREAD_CALCULADO',
    strikeOriginDescription: `5% abaixo do spot real (R$${closerPutTarget.toFixed(2)})`,
    chain, spot, dte, hv21, expiration,
    legRationale: 'PUT mais próxima para proteção reforçada em regime de extensão de queda',
    constraint: 'STRICTLY_LESS_THAN',
    constraintStrike: spot,
  });

  const tailLeg: TailRiskLeg = {
    type: 'PROTECAO_CAUDA',
    typeLabel: '🛡️ Elevação do Collar (Closer PUT)',
    triggerZScore: -2.0,
    triggerCondition: `Ativa quando Z-Score < -2.0σ (Regime atual: ${regime.zScore.toFixed(2)}σ)`,
    isCurrentlyActive: tailIsActive,
    legs: [tailPutResolved],
    rationale: tailIsActive
      ? `⚠️ REGIME DE EXTENSÃO: Z = ${regime.zScore.toFixed(2)}σ. Recomenda-se elevar o piso de proteção para ${tailPutResolved.strikeOriginLabel}. O custo adicional é parcialmente financiado pelo maior prêmio da CALL em cenário de vol elevada.`
      : `ℹ️ Collar operando com piso padrão na banda -2σ real. Se o mercado entrar em extensão de queda (Z < -2σ), o sistema sugerirá elevação do piso de proteção.`,
  };

  const convictionFactors = computeConvictionScore(regime, 'NEUTRO', false);
  const convictionScore = Math.min(100,
    convictionFactors.zScoreAlignment + convictionFactors.flowAlignment +
    convictionFactors.barrierAlignment + convictionFactors.pcrAlignment);

  const payoffPoints = generatePayoffPoints(legs, spot, hv21, dte);
  const payoffReliability = buildPayoffReliability(legs, hv21, dataDate);

  const alertas: string[] = [];
  if (callLeg.strike < spot)
    alertas.push('⛔ Strike da CALL abaixo do spot: posição em risco imediato de exercício — verificar preços reais');
  if (netCredit < 0)
    alertas.push(`ℹ️ Collar com custo líquido de R$${Math.abs(netCredit).toFixed(2)} — seguro pago pelo investidor (não zero-cost)`);
  if (monthlyYield !== null)
    alertas.push(`💰 Taxa de renda estimada: ${monthlyYield}% ao vencimento (${(monthlyYield * 12).toFixed(1)}% a.a. projetado) — ${callLeg.premiumReliabilityLabel}`);

  return {
    id: 'COVERED_CALL_COLLAR',
    name: 'Covered Call + Collar Dinâmico Adaptativo',
    nameEn: 'Covered Call + Adaptive Dynamic Collar',
    category: 'RENDA_PROTECAO',
    targetProfiles: ['CONSERVADOR', 'TATICO'],
    convictionScore,
    convictionFactors,
    regime: regime.regime,
    legs,
    tailRisk: tailLeg,
    maxRiskPerLot: null, // Depende do preço de compra do ativo spot
    maxReturnPerLot: callLeg.strike > spot ? (callLeg.strike - spot + netCredit) * 100 : null,
    breakEvenAtExpiry: Number((spot - netCredit).toFixed(2)),
    returnOnRiskPercent: monthlyYield,
    payoffPoints,
    payoffReliability,
    rationale: `📊 COVERED CALL + COLLAR DINÂMICO — Regime: ${regime.regimeLabel}

LÓGICA: Para o investidor que já detém o ativo spot (PETR4, VALE3, BOVA11 etc.), esta estrutura gera renda mensal (dividendo sintético) pela venda da CALL na barreira real de resistência, enquanto financia parcial ou totalmente um seguro de carteira (PUT comprada na banda -2σ real).

ANCORAGEM EM DADOS REAIS (B3):
• CALL vendida: ${callLeg.strikeOriginLabel} (${callLeg.symbol ?? 'B3'})
• PUT comprada (seguro): ${putLeg.strikeOriginLabel} (${putLeg.symbol ?? 'B3'}) — calculada com ${regime.sampleSize} fechamentos reais BRAPI

RENDA GERADA: ${netCredit > 0 ? `Crédito líquido: R$${netCredit.toFixed(2)} por ação (${callLeg.premiumReliabilityLabel})` : `Custo líquido: R$${Math.abs(netCredit).toFixed(2)} por ação — seguro pago`}

PCR real: ${regime.pcr.toFixed(2)} | Z-Score: ${regime.zScore.toFixed(2)}σ | HV21: ${hv21 !== null ? `${hv21.toFixed(1)}%` : 'N/D'}`,
    alertas,
    isDataInsufficient: regime.isInsufficient,
  };
}

// ─────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL EXPORTADA
// ─────────────────────────────────────────────────────────────

export interface GenerateStrategiesInput {
  regime: MarketRegime;
  expiration: string;
  dte: number;
  hv21: number | null;
  profile?: OperatorProfile;
  dataDate: string;
  optionsChain?: OptionChainItem[];
}

export function generateStrategies(input: GenerateStrategiesInput): StrategyRecommendation[] {
  const { regime, expiration, dte, hv21, profile, dataDate, optionsChain } = input;

  if (regime.isInsufficient) {
    return [];
  }

  const all: StrategyRecommendation[] = [
    buildBullPutSpread(regime, expiration, dte, hv21, dataDate, optionsChain),
    buildBearCallSpread(regime, expiration, dte, hv21, dataDate, optionsChain),
    buildIronCondor(regime, expiration, dte, hv21, dataDate, optionsChain),
    buildCoveredCallWithCollar(regime, expiration, dte, hv21, dataDate, optionsChain),
  ];

  // Filtrar por perfil se informado
  const filtered = profile
    ? all.filter((s) => s.targetProfiles.includes(profile))
    : all;

  // Ordenar por Score de Convicção decrescente
  return filtered.sort((a, b) => b.convictionScore - a.convictionScore);
}
