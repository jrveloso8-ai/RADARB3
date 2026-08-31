/**
 * Motor de Cálculo Real de Volatilidade Histórica (Padrão Black-Scholes / ANBIMA / B3)
 */
import { CNPI_RULES } from '../config/rules';

/**
 * Calcula a Volatilidade Histórica Anualizada (HV) para um período de N pregões (ex: 21, 63 ou 252 dias)
 * Fórmula: Desvio padrão amostral dos retornos logarítmicos diários multiplicado por sqrt(252).
 */
export function calculateHistoricalVolatility(prices: number[], period = 21): number | null {
  if (!prices || prices.length < period + 1 || period < 2) {
    return null;
  }

  const windowPrices = prices.slice(prices.length - (period + 1));
  const logReturns: number[] = [];

  for (let i = 1; i < windowPrices.length; i++) {
    const pPrev = windowPrices[i - 1];
    const pCurr = windowPrices[i];
    if (pPrev <= 0 || pCurr <= 0) continue;
    logReturns.push(Math.log(pCurr / pPrev));
  }

  if (logReturns.length < period) {
    return null;
  }

  const mean = logReturns.reduce((acc, r) => acc + r, 0) / logReturns.length;
  const variance =
    logReturns.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / (logReturns.length - 1);
  const standardDeviation = Math.sqrt(variance);

  // Anualização considerando ano comercial de 252 dias úteis
  const annualizedHV = standardDeviation * Math.sqrt(252) * 100;
  return Number(annualizedHV.toFixed(1));
}

export type VolatilityRegime = 'MUITO_BAIXA' | 'MODERADA' | 'ALTA' | 'EXTREMA';

/**
 * Classifica o regime de volatilidade comparando a Volatilidade Implícita (IV) com a Volatilidade Histórica (HV)
 */
export function classifyVolatilityRegime(ivAtm: number, hv21: number): {
  regime: VolatilityRegime;
  ivRatio: number;
  label: string;
  isCreditFavorable: boolean;
  description: string;
} {
  const safeHv = hv21 > 0 ? hv21 : 25.0;
  const safeIv = ivAtm > 0 ? ivAtm : safeHv;
  const ivRatio = Number((safeIv / safeHv).toFixed(2));
  const volRules = CNPI_RULES.DERIVATIVES.VOLATILITY;

  // Volatilidade Muito Baixa / Squeeze (IV comprimida < 16% ou ratio < 0.70)
  if (safeIv < volRules.SQUEEZE_IV_THRESHOLD || (ivRatio < volRules.LOW_RATIO_THRESHOLD && safeIv < 22.0)) {
    return {
      regime: 'MUITO_BAIXA',
      ivRatio,
      label: 'VOLATILIDADE COMPRIMIDA (SQUEEZE)',
      isCreditFavorable: false,
      description: 'Opções baratas. Risco elevado de expansão de volatilidade e rompimento direcional violento. Desaconselhada a venda de crédito.',
    };
  }

  // Volatilidade Extrema / Cisne Negro (IV acima de 75% ou ratio >= 2.0)
  if (safeIv >= 75.0 || ivRatio >= 2.0) {
    return {
      regime: 'EXTREMA',
      ivRatio,
      label: 'VOLATILIDADE EXTREMA / ALERTA',
      isCreditFavorable: true,
      description: 'Prêmios hiper-inflados por evento de cauda ou pânico. Exige asas de proteção mais largas.',
    };
  }

  // Volatilidade Alta (IV >= 28% ou IV / HV >= 1.05)
  if (safeIv >= volRules.HIGH_IV_THRESHOLD || ivRatio >= volRules.HIGH_RATIO_THRESHOLD) {
    return {
      regime: 'ALTA',
      ivRatio,
      label: 'VOLATILIDADE ALTA (PRÊMIOS INFLADOS)',
      isCreditFavorable: true,
      description: 'Condição ideal para venda de crédito (Iron Condor e Travas a Crédito), beneficiando-se do decaimento temporal e contração de vol (IV Crush).',
    };
  }

  // Volatilidade Moderada / Normal
  return {
    regime: 'MODERADA',
    ivRatio,
    label: 'VOLATILIDADE MODERADA / EQUILIBRADA',
    isCreditFavorable: true,
    description: 'Equilíbrio entre valor intrínseco e extrínseco. Estruturas a crédito ou a débito são viáveis.',
  };
}
