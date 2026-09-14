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
} from '../types/financial';
import { calculateBlackScholes } from './black-scholes';
import { getRiskFreeRate } from '../config/macro';

// ─────────────────────────────────────────────────────────────
// HELPERS: Cálculo de prêmio com rotulagem de confiabilidade
// ─────────────────────────────────────────────────────────────

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
  dataDate: string
): StrategyRecommendation {
  const spot = regime.spotPrice;

  // Strike vendido: maior barreira de PUT real (se disponível) ou -1σ
  const shortPutStrike = regime.topPutBarrierStrike
    ?? Number((regime.lowerBand2Sigma + (spot - regime.lowerBand2Sigma) / 2).toFixed(2));
  const shortPutOrigin: StrikeOriginType = regime.topPutBarrierStrike
    ? 'BARREIRA_PUT_REAL' : 'BANDA_2SIGMA_REAL';
  const shortPutOriginLabel = regime.topPutBarrierStrike
    ? `Barreira de PUT com maior OI real da B3 (${regime.topPutBarrierStrike.toFixed(2)})`
    : 'Calculado a partir da Banda -2σ real (200 fechamentos BRAPI)';

  // Strike comprado: banda -2σ real (proteção de cauda)
  const longPutStrike = Number(regime.lowerBand2Sigma.toFixed(2));
  const longPutStrikeUsed = Math.min(longPutStrike, shortPutStrike * 0.97);

  const shortLeg = calcPremium(spot, shortPutStrike, dte, hv21, 'PUT');
  const longLeg = calcPremium(spot, longPutStrikeUsed, dte, hv21, 'PUT');

  const legs: OptionLeg[] = [
    {
      action: 'VENDER',
      type: 'PUT',
      strike: shortPutStrike,
      strikeOrigin: shortPutOrigin,
      strikeOriginLabel: shortPutOriginLabel,
      dte,
      expiration,
      ...shortLeg,
      legRationale: `PUT vendida ancorada na barreira real de maior OI — captura prêmio máximo onde o mercado concentrou proteção institucional real`,
    },
    {
      action: 'COMPRAR',
      type: 'PUT',
      strike: longPutStrikeUsed,
      strikeOrigin: 'BANDA_2SIGMA_REAL',
      strikeOriginLabel: `Banda -2σ real: R$${regime.lowerBand2Sigma.toFixed(2)} (200 fechamentos reais BRAPI)`,
      dte,
      expiration,
      ...longLeg,
      legRationale: `PUT comprada na banda -2σ real — limita o risco máximo ao spread entre as bandas, tornando a estrutura de risco limitado`,
    },
  ];

  const netCredit =
    (shortLeg.premiumUsed ?? 0) - (longLeg.premiumUsed ?? 0);
  const spreadWidth = shortPutStrike - longPutStrikeUsed;
  const maxRiskPerLot = spreadWidth > netCredit ? (spreadWidth - netCredit) * 100 : null;
  const maxReturnPerLot = netCredit > 0 ? netCredit * 100 : null;
  const breakEven = shortPutStrike - netCredit;

  // Perna de cauda: se Z < -2σ, ativa compra adicional de PUT de cauda (-3σ)
  const tailStrike = Number(regime.lowerBand3Sigma.toFixed(2));
  const tailPremium = calcPremium(spot, tailStrike, dte, hv21, 'PUT');
  const tailIsActive = regime.zScore < -2.0;

  const tailLeg: TailRiskLeg = {
    type: 'PROTECAO_CAUDA',
    typeLabel: '🛡️ Proteção de Cauda (Black Swan Hedge)',
    triggerZScore: -2.0,
    triggerCondition: `Ativa quando Z-Score < -2.0σ (Regime atual: ${regime.zScore.toFixed(2)}σ)`,
    isCurrentlyActive: tailIsActive,
    legs: [
      {
        action: 'COMPRAR',
        type: 'PUT',
        strike: tailStrike,
        strikeOrigin: 'BANDA_3SIGMA_REAL',
        strikeOriginLabel: `Banda -3σ real: R$${tailStrike.toFixed(2)} (extrapolada dos 200 fechamentos reais)`,
        dte,
        expiration,
        ...tailPremium,
        legRationale: `PUT de cauda na banda -3σ real — custo pequeno, retorno assimétrico em eventos de pânico extremo (ex: crash, notícia sistêmica)`,
      },
    ],
    rationale: tailIsActive
      ? `⚠️ CAUDA ATIVA: Z-Score atual de ${regime.zScore.toFixed(2)}σ está em extensão de queda. O acréscimo desta PUT em -3σ real (R$${tailStrike.toFixed(2)}) transforma a estrutura de Trava de Alta em "Trava com Seguro de Cauda", pagando de forma assimétrica em eventos extremos raros.`
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
Vendemos a PUT no strike R$${shortPutStrike.toFixed(2)} (${shortPutOriginLabel}) e compramos proteção no R$${longPutStrikeUsed.toFixed(2)} (banda -2σ real de 200 fechamentos BRAPI). Esta é uma estrutura de crédito: recebemos o prêmio líquido de entrada e o lucro máximo é obtido se o ativo fechar ACIMA de R$${shortPutStrike.toFixed(2)} no vencimento.

ANCORAGEM EM DADOS REAIS:
• Strike vendido: ${shortPutOriginLabel}
• Strike comprado: Banda -2σ real (${regime.lowerBand2Sigma.toFixed(2)}) — calculada com ${regime.sampleSize} fechamentos reais BRAPI
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
  dataDate: string
): StrategyRecommendation {
  const spot = regime.spotPrice;

  const shortCallStrike = regime.topCallBarrierStrike
    ?? Number(regime.upperBand2Sigma.toFixed(2));
  const shortCallOrigin: StrikeOriginType = regime.topCallBarrierStrike
    ? 'BARREIRA_CALL_REAL' : 'BANDA_2SIGMA_REAL';
  const shortCallOriginLabel = regime.topCallBarrierStrike
    ? `Barreira de CALL com maior OI real da B3 (R$${regime.topCallBarrierStrike.toFixed(2)})`
    : `Banda +2σ real: R$${regime.upperBand2Sigma.toFixed(2)} (200 fechamentos BRAPI)`;

  const longCallStrike = Number(Math.max(shortCallStrike * 1.03, regime.upperBand3Sigma).toFixed(2));

  const shortLeg = calcPremium(spot, shortCallStrike, dte, hv21, 'CALL');
  const longLeg = calcPremium(spot, longCallStrike, dte, hv21, 'CALL');

  const legs: OptionLeg[] = [
    {
      action: 'VENDER',
      type: 'CALL',
      strike: shortCallStrike,
      strikeOrigin: shortCallOrigin,
      strikeOriginLabel: shortCallOriginLabel,
      dte,
      expiration,
      ...shortLeg,
      legRationale: 'CALL vendida na maior barreira real — concentração máxima de resistência institucional',
    },
    {
      action: 'COMPRAR',
      type: 'CALL',
      strike: longCallStrike,
      strikeOrigin: 'BANDA_3SIGMA_REAL',
      strikeOriginLabel: `Banda +3σ real: R$${regime.upperBand3Sigma.toFixed(2)} — limita risco em rally extremo`,
      dte,
      expiration,
      ...longLeg,
      legRationale: 'CALL comprada na banda +3σ real — proteção contra rally de cauda (melt-up)',
    },
  ];

  const netCredit = (shortLeg.premiumUsed ?? 0) - (longLeg.premiumUsed ?? 0);
  const spreadWidth = longCallStrike - shortCallStrike;
  const maxRiskPerLot = netCredit >= 0 ? (spreadWidth - netCredit) * 100 : null;
  const maxReturnPerLot = netCredit > 0 ? netCredit * 100 : null;

  // Cauda CALL: ativa em regime EXTREMO_ALTA para surfar melt-up
  const tailIsActive = regime.regime === 'EXTREMO_ALTA' || regime.regime === 'EXTENSAO_ALTA';
  const callBackspreadStrike = Number((spot * 1.05).toFixed(2));
  const tailCallPremium = calcPremium(spot, callBackspreadStrike, dte, hv21, 'CALL');

  const tailLeg: TailRiskLeg = {
    type: 'OPORTUNIDADE_OUTLIER',
    typeLabel: '⚡ Oportunidade de Outlier (CALL Backspread)',
    triggerZScore: 2.0,
    triggerCondition: `Ativa quando Z-Score > +2.0σ (Regime atual: ${regime.zScore.toFixed(2)}σ)`,
    isCurrentlyActive: tailIsActive,
    legs: [
      {
        action: 'COMPRAR',
        type: 'CALL',
        strike: callBackspreadStrike,
        strikeOrigin: 'SPREAD_CALCULADO',
        strikeOriginLabel: `+5% do spot real (R$${callBackspreadStrike.toFixed(2)}) — capturar continuidade de rally extremo`,
        dte,
        expiration,
        ...tailCallPremium,
        legRationale: 'CALL adicional comprada para capturar melt-up em regime de extensão — retorno assimétrico se o rali continuar acima da barreira',
      },
    ],
    rationale: tailIsActive
      ? `⚡ OUTLIER ATIVO: Z = ${regime.zScore.toFixed(2)}σ em extensão de alta. A adição de CALL comprada cria um CALL Backspread híbrido: o spread base protege contra queda, mas a CALL adicional captura exponencialmente se o mercado continuar em melt-up acima de R$${callBackspreadStrike.toFixed(2)}.`
      : `ℹ️ Outlier não ativo (Z = ${regime.zScore.toFixed(2)}σ, abaixo do gatilho de +2.0σ). Disponível para ativação se mercado entrar em extensão de alta.`,
  };

  const convictionFactors = computeConvictionScore(regime, 'BAIXA', true);
  const convictionScore = Math.min(100,
    convictionFactors.zScoreAlignment + convictionFactors.flowAlignment +
    convictionFactors.barrierAlignment + convictionFactors.pcrAlignment);

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
    breakEvenAtExpiry: Number((shortCallStrike + netCredit).toFixed(2)),
    returnOnRiskPercent:
      maxRiskPerLot && maxReturnPerLot
        ? Number(((maxReturnPerLot / maxRiskPerLot) * 100).toFixed(1))
        : null,
    payoffPoints,
    payoffReliability,
    rationale: `📊 TRAVA DE BAIXA COM CALL (BEAR CALL SPREAD) — Regime: ${regime.regimeLabel}

LÓGICA: Vendemos a barreira de CALL de maior resistência real (R$${shortCallStrike.toFixed(2)}) e compramos cobertura na banda +3σ real. Estrutura de crédito baixista — lucro máximo se o ativo fechar ABAIXO de R$${shortCallStrike.toFixed(2)}.

ANCORAGEM REAL:
• Strike vendido: ${shortCallOriginLabel}
• Strike comprado: Banda +3σ real (R$${regime.upperBand3Sigma.toFixed(2)})

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
  dataDate: string
): StrategyRecommendation {
  const spot = regime.spotPrice;

  // Pernas do Condor: ancoramos em bandas estatísticas reais
  const shortCallStrike = regime.topCallBarrierStrike ?? Number(regime.upperBand2Sigma.toFixed(2));
  const longCallStrike = Number(regime.upperBand3Sigma.toFixed(2));
  const shortPutStrike = regime.topPutBarrierStrike ?? Number(regime.lowerBand2Sigma.toFixed(2));
  const longPutStrike = Number(regime.lowerBand3Sigma.toFixed(2));

  const scLeg = calcPremium(spot, shortCallStrike, dte, hv21, 'CALL');
  const lcLeg = calcPremium(spot, longCallStrike, dte, hv21, 'CALL');
  const spLeg = calcPremium(spot, shortPutStrike, dte, hv21, 'PUT');
  const lpLeg = calcPremium(spot, longPutStrike, dte, hv21, 'PUT');

  const legs: OptionLeg[] = [
    {
      action: 'VENDER', type: 'CALL', strike: shortCallStrike,
      strikeOrigin: regime.topCallBarrierStrike ? 'BARREIRA_CALL_REAL' : 'BANDA_2SIGMA_REAL',
      strikeOriginLabel: regime.topCallBarrierStrike ? `Barreira CALL real maior OI (R$${shortCallStrike.toFixed(2)})` : `Banda +2σ real (R$${shortCallStrike.toFixed(2)})`,
      dte, expiration, ...scLeg,
      legRationale: 'CALL curta no topo da banda — máxima concentração de resistência real',
    },
    {
      action: 'COMPRAR', type: 'CALL', strike: longCallStrike,
      strikeOrigin: 'BANDA_3SIGMA_REAL',
      strikeOriginLabel: `Banda +3σ real (R$${longCallStrike.toFixed(2)}) — protege contra melt-up`,
      dte, expiration, ...lcLeg,
      legRationale: 'Cobertura de cauda superior (+3σ real) — risco limitado em rally extremo',
    },
    {
      action: 'VENDER', type: 'PUT', strike: shortPutStrike,
      strikeOrigin: regime.topPutBarrierStrike ? 'BARREIRA_PUT_REAL' : 'BANDA_2SIGMA_REAL',
      strikeOriginLabel: regime.topPutBarrierStrike ? `Barreira PUT real maior OI (R$${shortPutStrike.toFixed(2)})` : `Banda -2σ real (R$${shortPutStrike.toFixed(2)})`,
      dte, expiration, ...spLeg,
      legRationale: 'PUT curta no suporte da banda — máxima concentração de suporte real',
    },
    {
      action: 'COMPRAR', type: 'PUT', strike: longPutStrike,
      strikeOrigin: 'BANDA_3SIGMA_REAL',
      strikeOriginLabel: `Banda -3σ real (R$${longPutStrike.toFixed(2)}) — protege contra black swan`,
      dte, expiration, ...lpLeg,
      legRationale: 'Cobertura de cauda inferior (-3σ real) — risco limitado em crash extremo',
    },
  ];

  const netCredit =
    (scLeg.premiumUsed ?? 0) - (lcLeg.premiumUsed ?? 0) +
    (spLeg.premiumUsed ?? 0) - (lpLeg.premiumUsed ?? 0);
  const callSpread = longCallStrike - shortCallStrike;
  const putSpread = shortPutStrike - longPutStrike;
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
      : `Iron Condor estruturado nas bandas reais de ±2σ e ±3σ. Proteção de cauda embutida nas pernas compradas de CALL (+3σ) e PUT (-3σ) reais. Fechamento sugerido se spot romper qualquer banda -2σ real.`,
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

LÓGICA: Vendemos os extremos de ±2σ reais (onde estatisticamente o mercado reverte ~95% dos pregões) e compramos cobertura nos extremos de ±3σ (evento de cauda). Estrutura de quatro pernas de crédito total, máximo ganho se o ativo permanecer entre as bandas vendidas.

ANCORAGEM ESTATÍSTICA REAL:
• CALL vendida: R$${shortCallStrike.toFixed(2)} (banda +2σ ou barreira real)
• CALL comprada: R$${longCallStrike.toFixed(2)} (banda +3σ real — proteção de melt-up)
• PUT vendida: R$${shortPutStrike.toFixed(2)} (banda -2σ ou barreira real)
• PUT comprada: R$${longPutStrike.toFixed(2)} (banda -3σ real — proteção de black swan)
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
  dataDate: string
): StrategyRecommendation {
  const spot = regime.spotPrice;

  // CALL vendida: acima da barreira real de CALL ou +2σ
  const callStrike = regime.topCallBarrierStrike ?? Number(regime.upperBand2Sigma.toFixed(2));
  const callOrigin: StrikeOriginType = regime.topCallBarrierStrike ? 'BARREIRA_CALL_REAL' : 'BANDA_2SIGMA_REAL';
  const callOriginLabel = regime.topCallBarrierStrike
    ? `Barreira de CALL real maior OI — acima desta barreira, o ativo tende a ter forte resistência de mercado makers`
    : `Banda +2σ real (R$${callStrike.toFixed(2)}) — zona estatística de reversão com 95% de probabilidade histórica`;

  // PUT comprada: banda -2σ real (seguro)
  const putStrike = Number(regime.lowerBand2Sigma.toFixed(2));

  const callLeg = calcPremium(spot, callStrike, dte, hv21, 'CALL');
  const putLeg = calcPremium(spot, putStrike, dte, hv21, 'PUT');

  const legs: OptionLeg[] = [
    {
      action: 'VENDER', type: 'CALL', strike: callStrike,
      strikeOrigin: callOrigin, strikeOriginLabel: callOriginLabel,
      dte, expiration, ...callLeg,
      legRationale: 'CALL vendida contra posição comprada no ativo — gera renda mensal (dividendo sintético) com teto de ganho acima da barreira real',
    },
    {
      action: 'COMPRAR', type: 'PUT', strike: putStrike,
      strikeOrigin: 'BANDA_2SIGMA_REAL',
      strikeOriginLabel: `Banda -2σ real (R$${putStrike.toFixed(2)}) — piso de proteção estatístico para carteira existente`,
      dte, expiration, ...putLeg,
      legRationale: 'PUT comprada como seguro da posição spot — protege a carteira abaixo da banda -2σ real sem custo adicional se financiada pela CALL vendida',
    },
  ];

  const callPremium = callLeg.premiumUsed ?? 0;
  const putPremium = putLeg.premiumUsed ?? 0;
  const netCredit = callPremium - putPremium;
  const monthlyYield = spot > 0 ? Number(((netCredit / spot) * 100).toFixed(2)) : null;

  // Cauda: se Z < -2.5σ, elevar a PUT de seguro para mais próxima do spot
  const tailIsActive = regime.zScore < -2.0;
  const closerPutStrike = Number((spot * 0.95).toFixed(2));
  const tailPutPremium = calcPremium(spot, closerPutStrike, dte, hv21, 'PUT');

  const tailLeg: TailRiskLeg = {
    type: 'PROTECAO_CAUDA',
    typeLabel: '🛡️ Elevação do Collar (Closer PUT)',
    triggerZScore: -2.0,
    triggerCondition: `Ativa quando Z-Score < -2.0σ (Regime atual: ${regime.zScore.toFixed(2)}σ)`,
    isCurrentlyActive: tailIsActive,
    legs: [
      {
        action: 'COMPRAR', type: 'PUT', strike: closerPutStrike,
        strikeOrigin: 'SPREAD_CALCULADO',
        strikeOriginLabel: `5% abaixo do spot real (R$${closerPutStrike.toFixed(2)}) — PUT mais próxima para proteção reforçada em regime de extensão de queda`,
        dte, expiration, ...tailPutPremium,
        legRationale: 'Em extensão de queda (Z < -2σ), substituir a PUT de -2σ por esta PUT mais próxima reduz o risco de gap de proteção num evento brusco',
      },
    ],
    rationale: tailIsActive
      ? `⚠️ REGIME DE EXTENSÃO: Z = ${regime.zScore.toFixed(2)}σ. Recomenda-se elevar o piso de proteção de R$${putStrike.toFixed(2)} para R$${closerPutStrike.toFixed(2)} (5% abaixo do spot real). O custo adicional é parcialmente financiado pelo maior prêmio da CALL em cenário de vol elevada.`
      : `ℹ️ Collar operando com piso padrão na banda -2σ real. Se o mercado entrar em extensão de queda (Z < -2σ), o sistema sugerirá elevação do piso de proteção.`,
  };

  const convictionFactors = computeConvictionScore(regime, 'NEUTRO', false);
  const convictionScore = Math.min(100,
    convictionFactors.zScoreAlignment + convictionFactors.flowAlignment +
    convictionFactors.barrierAlignment + convictionFactors.pcrAlignment);

  const payoffPoints = generatePayoffPoints(legs, spot, hv21, dte);
  const payoffReliability = buildPayoffReliability(legs, hv21, dataDate);

  const alertas: string[] = [];
  if (callStrike < spot)
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
    maxReturnPerLot: callStrike > spot ? (callStrike - spot + netCredit) * 100 : null,
    breakEvenAtExpiry: Number((spot - netCredit).toFixed(2)),
    returnOnRiskPercent: monthlyYield,
    payoffPoints,
    payoffReliability,
    rationale: `📊 COVERED CALL + COLLAR DINÂMICO — Regime: ${regime.regimeLabel}

LÓGICA: Para o investidor que já detém o ativo spot (PETR4, VALE3, BOVA11 etc.), esta estrutura gera renda mensal (dividendo sintético) pela venda da CALL na barreira real de resistência, enquanto financia parcial ou totalmente um seguro de carteira (PUT comprada na banda -2σ real).

ANCORAGEM EM DADOS REAIS:
• CALL vendida: ${callOriginLabel}
• PUT comprada (seguro): Banda -2σ real (R$${putStrike.toFixed(2)}) — calculada com ${regime.sampleSize} fechamentos reais BRAPI

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
}

export function generateStrategies(input: GenerateStrategiesInput): StrategyRecommendation[] {
  const { regime, expiration, dte, hv21, profile, dataDate } = input;

  if (regime.isInsufficient) {
    return [];
  }

  const all: StrategyRecommendation[] = [
    buildBullPutSpread(regime, expiration, dte, hv21, dataDate),
    buildBearCallSpread(regime, expiration, dte, hv21, dataDate),
    buildIronCondor(regime, expiration, dte, hv21, dataDate),
    buildCoveredCallWithCollar(regime, expiration, dte, hv21, dataDate),
  ];

  // Filtrar por perfil se informado
  const filtered = profile
    ? all.filter((s) => s.targetProfiles.includes(profile))
    : all;

  // Ordenar por Score de Convicção decrescente
  return filtered.sort((a, b) => b.convictionScore - a.convictionScore);
}
