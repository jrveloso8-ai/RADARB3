/**
 * Guardas de Integridade e Resolução de Dados do Radar de Oportunidades
 * Regra: NUNCA fabricar dados. Se houver falha de rede ou ausência de dados no book,
 * adotar postura estritamente conservadora (REPROVADO / null).
 */

import { analyzeFundamentals, RawFundamentalData } from './fundamentals';

export interface ConservativeFundamentalResult {
  status: 'APROVADO' | 'REPROVADO';
  score: number;
}

/**
 * Resolução conservadora de análise fundamentalista.
 * Em caso de erro de consulta, payload nulo ou inconsistência contábil,
 * a postura obrigatória de auditoria é REPROVADO com Score 0.
 */
export function resolveConservativeFundamentals(
  symbol: string,
  rawFundamentals: RawFundamentalData | null | undefined,
  analyzer: typeof analyzeFundamentals = analyzeFundamentals
): ConservativeFundamentalResult {
  if (!rawFundamentals) {
    return { status: 'REPROVADO', score: 0 };
  }

  try {
    const analyzed = analyzer(symbol, rawFundamentals);
    return {
      status: analyzed.status,
      score: analyzed.score,
    };
  } catch {
    return { status: 'REPROVADO', score: 0 };
  }
}

/**
 * Resolução da Volatilidade Implícita (IV ATM) do ativo a partir do book de opções.
 * Regra de integridade: exige no mínimo 3 cotações de IV válidas para calcular a mediana real.
 * Se houver liquidez insuficiente ou falha, retorna estritamente null (NUNCA fabrica via hv21 * 1.05).
 */
export function resolveRealIvAtm(
  analytics: Array<{ impliedVolatility?: number | null }> | null | undefined
): number | null {
  if (!analytics || !Array.isArray(analytics) || analytics.length === 0) {
    return null;
  }

  const validIvs = analytics
    .filter((a): a is { impliedVolatility: number } => typeof a.impliedVolatility === 'number' && a.impliedVolatility > 0)
    .map((a) => a.impliedVolatility)
    .sort((a, b) => a - b);

  if (validIvs.length < 3) {
    return null;
  }

  const mid = Math.floor(validIvs.length / 2);
  return validIvs.length % 2 !== 0 ? validIvs[mid] : Number(((validIvs[mid - 1] + validIvs[mid]) / 2).toFixed(2));
}
