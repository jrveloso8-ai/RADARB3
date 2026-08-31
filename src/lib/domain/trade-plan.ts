/**
 * MOTOR DE PLANO DE TRADE QUANTITATIVO (ENTRADA, STOP E ALVO COM R:R MEDIDO REAL)
 * Radar B3 Pro IA — Especificação Técnica v2 (31/08/2026)
 *
 * O alvo vem da estrutura real de preços (máximas, mínimas e pivôs do histórico).
 * O R:R é medido dinamicamente (não fixado) e serve como filtro de corte (R:R >= 1.5).
 */

import { TrendType } from '../types/financial';
import { calculateATR } from './indicators';
import { CNPI_RULES } from '../config/rules';

export interface TradePlan {
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPerShare: number;
  rewardPerShare: number;
  riskRewardRatio: number; // medido, não fixado
  atr: number;
  isViable: boolean; // riskRewardRatio >= 1.5 e níveis estruturais válidos
  method: string; // texto explicando de onde vieram os níveis
}

/**
 * Encontra topos e fundos estruturais reais a partir das séries de máximas e mínimas
 */
function extractPivotLevels(
  highs: number[],
  lows: number[]
): { resistanceLevels: number[]; supportLevels: number[] } {
  const resistanceSet = new Set<number>();
  const supportSet = new Set<number>();

  const len = Math.min(highs.length, lows.length);
  for (let i = 2; i < len - 2; i++) {
    // Topo local (pivô de alta)
    if (
      highs[i] >= highs[i - 1] &&
      highs[i] >= highs[i - 2] &&
      highs[i] >= highs[i + 1] &&
      highs[i] >= highs[i + 2]
    ) {
      resistanceSet.add(Number(highs[i].toFixed(2)));
    }
    // Fundo local (pivô de baixa)
    if (
      lows[i] <= lows[i - 1] &&
      lows[i] <= lows[i - 2] &&
      lows[i] <= lows[i + 1] &&
      lows[i] <= lows[i + 2]
    ) {
      supportSet.add(Number(lows[i].toFixed(2)));
    }
  }

  // Adicionar máximas e mínimas das janelas de 20 e 60 pregões
  if (len >= 20) {
    const max20 = Math.max(...highs.slice(len - 20));
    const min20 = Math.min(...lows.slice(len - 20));
    resistanceSet.add(Number(max20.toFixed(2)));
    supportSet.add(Number(min20.toFixed(2)));
  }

  if (len >= 60) {
    const max60 = Math.max(...highs.slice(len - 60));
    const min60 = Math.min(...lows.slice(len - 60));
    resistanceSet.add(Number(max60.toFixed(2)));
    supportSet.add(Number(min60.toFixed(2)));
  }

  return {
    resistanceLevels: Array.from(resistanceSet).sort((a, b) => a - b),
    supportLevels: Array.from(supportSet).sort((a, b) => a - b),
  };
}

function calculateATRFromSeries(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14
): number {
  const len = Math.min(highs.length, lows.length, closes.length);
  if (len < period + 1) return 0.5;

  const trValues: number[] = [];
  for (let i = 1; i < len; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trValues.push(tr);
  }

  const recentTR = trValues.slice(trValues.length - period);
  const avg = recentTR.reduce((acc, v) => acc + v, 0) / period;
  return Number(avg.toFixed(2));
}

export function buildTradePlan(
  spot: number,
  trend: TrendType,
  highs: number[],
  lows: number[],
  closes: number[]
): TradePlan | null {
  if (spot <= 0 || !closes || closes.length < 5) {
    return null;
  }

  const atrVal =
    calculateATRFromSeries(highs, lows, closes, CNPI_RULES.TRADE_PLAN.ATR_PERIOD) ||
    Number((spot * 0.025).toFixed(2));
  const atrHalf = Number((atrVal * CNPI_RULES.TRADE_PLAN.ATR_MULTIPLIER_STOP).toFixed(2));

  const { resistanceLevels, supportLevels } = extractPivotLevels(highs, lows);

  if (trend === 'ALTA') {
    // Resistências reais estritamente acima do spot
    const validResistances = resistanceLevels.filter((r) => r > spot * 1.005).sort((a, b) => a - b);
    const validSupports = supportLevels.filter((s) => s < spot * 0.995).sort((a, b) => b - a);

    if (validResistances.length === 0) {
      // Sem resistência real acima do spot -> isViable: false (sem fallback arbitrário)
      return {
        entry: spot,
        stop: Number((spot - atrVal).toFixed(2)),
        target1: Number((spot + atrVal * 1.5).toFixed(2)),
        target2: Number((spot + atrVal * 3.0).toFixed(2)),
        riskPerShare: atrVal,
        rewardPerShare: Number((atrVal * 1.5).toFixed(2)),
        riskRewardRatio: 1.5,
        atr: atrVal,
        isViable: false,
        method: 'Sem resistência histórica acima do spot (Topo Histórico). Operação não viável para trade swing.',
      };
    }

    const target1 = validResistances[0];
    const target2 = validResistances[1] || Number((target1 + (target1 - spot)).toFixed(2));
    const immediateSupport = validSupports[0] || Number((spot - atrVal).toFixed(2));
    const stop = Number((immediateSupport - atrHalf).toFixed(2));

    const risk = Number(Math.max(0.01, spot - stop).toFixed(2));
    const reward = Number(Math.max(0.01, target1 - spot).toFixed(2));
    const rr = Number((reward / risk).toFixed(2));
    const isViable = rr >= CNPI_RULES.TRADE_PLAN.MIN_RISK_REWARD_RATIO && stop < spot && target1 > spot;

    return {
      entry: spot,
      stop,
      target1,
      target2,
      riskPerShare: risk,
      rewardPerShare: reward,
      riskRewardRatio: rr,
      atr: atrVal,
      isViable,
      method: `Entrada na cotação atual (R$ ${spot.toFixed(2)}). Stop loss estrutural abaixo do suporte em R$ ${immediateSupport.toFixed(2)} - 0.5x ATR (R$ ${stop.toFixed(2)}). Alvo 1 na resistência em R$ ${target1.toFixed(2)} (R:R medido: ${rr}:1).`,
    };
  }

  if (trend === 'BAIXA') {
    // Suportes reais estritamente abaixo do spot
    const validSupports = supportLevels.filter((s) => s < spot * 0.995).sort((a, b) => b - a);
    const validResistances = resistanceLevels.filter((r) => r > spot * 1.005).sort((a, b) => a - b);

    if (validSupports.length === 0) {
      // Sem suporte real abaixo do spot -> isViable: false
      return {
        entry: spot,
        stop: Number((spot + atrVal).toFixed(2)),
        target1: Number((spot - atrVal * 1.5).toFixed(2)),
        target2: Number((spot - atrVal * 3.0).toFixed(2)),
        riskPerShare: atrVal,
        rewardPerShare: Number((atrVal * 1.5).toFixed(2)),
        riskRewardRatio: 1.5,
        atr: atrVal,
        isViable: false,
        method: 'Sem suporte histórico abaixo do spot (Mínima Histórica). Operação não viável para trade direcional.',
      };
    }

    const target1 = validSupports[0];
    const target2 = validSupports[1] || Number((target1 - (spot - target1)).toFixed(2));
    const immediateResistance = validResistances[0] || Number((spot + atrVal).toFixed(2));
    const stop = Number((immediateResistance + atrHalf).toFixed(2));

    const risk = Number(Math.max(0.01, stop - spot).toFixed(2));
    const reward = Number(Math.max(0.01, spot - target1).toFixed(2));
    const rr = Number((reward / risk).toFixed(2));
    const isViable = rr >= CNPI_RULES.TRADE_PLAN.MIN_RISK_REWARD_RATIO && stop > spot && target1 < spot;

    return {
      entry: spot,
      stop,
      target1,
      target2,
      riskPerShare: risk,
      rewardPerShare: reward,
      riskRewardRatio: rr,
      atr: atrVal,
      isViable,
      method: `Venda na cotação atual (R$ ${spot.toFixed(2)}). Stop loss estrutural acima da resistência em R$ ${immediateResistance.toFixed(2)} + 0.5x ATR (R$ ${stop.toFixed(2)}). Alvo 1 no suporte em R$ ${target1.toFixed(2)} (R:R medido: ${rr}:1).`,
    };
  }

  // Mercado LATERAL
  return {
    entry: spot,
    stop: Number((spot - atrVal).toFixed(2)),
    target1: Number((spot + atrVal).toFixed(2)),
    target2: Number((spot + atrVal * 2.0).toFixed(2)),
    riskPerShare: atrVal,
    rewardPerShare: atrVal,
    riskRewardRatio: 1.0,
    atr: atrVal,
    isViable: false,
    method: 'Mercado em consolidação lateral. Operação direcional não recomendada; estrutura sugerida: Iron Condor.',
  };
}
