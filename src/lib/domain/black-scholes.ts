/**
 * Motor Matemático Black-Scholes & Métricas Derivativas
 * Cálculo de Delta, Gamma, Theta, Vega, Volatilidade Implícita (Solver) e Max Pain
 */

// Função de Distribuição Cumulativa Normal Padrão N(x)
export function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.sqrt(2.0);

  const t = 1.0 / (1.0 + p * absX);
  const erf = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-absX * absX);

  return 0.5 * (1.0 + sign * erf);
}

export interface GreeksResult {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  iv: number;
  theoreticalPrice: number;
}

/**
 * Calcula Gregas e Preço Teórico via Black-Scholes (Merton 1973 com Dividend Yield)
 * @param S Preço à vista (Spot)
 * @param K Strike
 * @param T Tempo até vencimento em anos (DTE / 252)
 * @param r Taxa livre de risco (Selic ~ 10.75% = 0.1075)
 * @param sigma Volatilidade anualizada (ex: 0.32 = 32%)
 * @param type 'call' | 'put'
 * @param q Dividend Yield anualizado (ex: 0.03 = 3%)
 */
export function calculateBlackScholes(
  S: number,
  K: number,
  T: number,
  r = 0.1075,
  sigma = 0.32,
  type: 'call' | 'put' = 'call',
  q = 0.03
): GreeksResult {
  if (S <= 0 || K <= 0 || T <= 0 || sigma <= 0) {
    const intrinsic = type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
    return {
      delta: type === 'call' ? (S >= K ? 1 : 0) : S <= K ? -1 : 0,
      gamma: 0,
      theta: 0,
      vega: 0,
      iv: sigma * 100,
      theoreticalPrice: intrinsic,
    };
  }

  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  const expQT = Math.exp(-q * T);
  const expRT = Math.exp(-r * T);

  let delta = 0;
  let theoreticalPrice = 0;

  if (type === 'call') {
    delta = expQT * normalCDF(d1);
    theoreticalPrice = S * expQT * normalCDF(d1) - K * expRT * normalCDF(d2);
  } else {
    delta = expQT * (normalCDF(d1) - 1);
    theoreticalPrice = K * expRT * normalCDF(-d2) - S * expQT * normalCDF(-d1);
  }

  // Densidade de probabilidade normal
  const phiD1 = Math.exp(-0.5 * d1 * d1) / Math.sqrt(2 * Math.PI);
  const gamma = (expQT * phiD1) / (S * sigma * Math.sqrt(T));
  const vega = (S * expQT * phiD1 * Math.sqrt(T)) / 100; // Por 1% de vol
  const theta =
    (-(S * sigma * expQT * phiD1) / (2 * Math.sqrt(T)) -
      r * K * expRT * (type === 'call' ? normalCDF(d2) : normalCDF(-d2))) /
    365;

  return {
    delta: Number(delta.toFixed(2)),
    gamma: Number(gamma.toFixed(4)),
    theta: Number(theta.toFixed(3)),
    vega: Number(vega.toFixed(3)),
    iv: Number((sigma * 100).toFixed(1)),
    theoreticalPrice: Math.max(0, Number(theoreticalPrice.toFixed(2))),
  };
}

/**
 * Solver de Volatilidade Implícita (IV) via Método Numérico de Bisseção + Newton-Raphson
 * Encontra o valor exato de sigma tal que BlackScholes(sigma) = marketPrice
 * @returns IV em percentual (ex: 28.5) ou null se não convergir
 */
export function calculateImpliedVolatility(
  marketPrice: number,
  S: number,
  K: number,
  T: number,
  r = 0.1075,
  type: 'call' | 'put' = 'call',
  q = 0.03
): number | null {
  if (marketPrice <= 0.01 || S <= 0 || K <= 0 || T <= 0) return null;

  // Valor intrínseco mínimo
  const intrinsic = type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
  if (marketPrice < intrinsic * 0.95) return null;

  let low = 0.01; // 1% ao ano
  let high = 4.0; // 400% ao ano
  let iv = 0.30; // Chute inicial 30%

  for (let i = 0; i < 40; i++) {
    const bs = calculateBlackScholes(S, K, T, r, iv, type, q);
    const diff = bs.theoreticalPrice - marketPrice;

    if (Math.abs(diff) < 0.005) {
      return Number((iv * 100).toFixed(1));
    }

    if (diff > 0) {
      high = iv;
    } else {
      low = iv;
    }

    iv = 0.5 * (low + high);
  }

  const finalBs = calculateBlackScholes(S, K, T, r, iv, type, q);
  if (Math.abs(finalBs.theoreticalPrice - marketPrice) < 0.05) {
    return Number((iv * 100).toFixed(1));
  }

  return null;
}

/**
 * Calcula o Max Pain (Ponto de Menor Prejuízo dos Lançadores / Vendedores de Opções)
 */
export function calculateMaxPain(
  strikes: number[],
  callsByStrike: Map<number, number>,
  putsByStrike: Map<number, number>
): { maxPainStrike: number; totalPain: number } {
  if (!strikes || strikes.length === 0) {
    return { maxPainStrike: 0, totalPain: 0 };
  }

  let minLoss = Infinity;
  let bestStrike = strikes[0];

  for (const testPrice of strikes) {
    let totalLossAtPrice = 0;

    // Prejuízo em CALLs exercidas
    for (const [callStrike, oi] of callsByStrike.entries()) {
      if (testPrice > callStrike) {
        totalLossAtPrice += (testPrice - callStrike) * oi;
      }
    }

    // Prejuízo em PUTs exercidas
    for (const [putStrike, oi] of putsByStrike.entries()) {
      if (testPrice < putStrike) {
        totalLossAtPrice += (putStrike - testPrice) * oi;
      }
    }

    if (totalLossAtPrice < minLoss) {
      minLoss = totalLossAtPrice;
      bestStrike = testPrice;
    }
  }

  return {
    maxPainStrike: Number(bestStrike.toFixed(2)),
    totalPain: minLoss,
  };
}
