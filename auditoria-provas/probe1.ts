import { calculateBlackScholes, calculateImpliedVolatility } from './src/lib/domain/black-scholes';
import { calculateHistoricalVolatility, classifyVolatilityRegime } from './src/lib/domain/volatility';
import { analyzeFundamentals } from './src/lib/domain/fundamentals';
import { analyzeOptionPositions, buildOptionBarrierAlert } from './src/lib/domain/options-barriers';
import { calculateRiskReward, calculateSupportResistance, calculateATR, calculateVolumeRatio } from './src/lib/domain/indicators';
import { payoffAt } from './src/lib/domain/cme-election';
import { buildTradePlan } from './src/lib/domain/trade-plan';

const L = (t: string) => console.log('\n===== ' + t + ' =====');

// --------- P1: THETA de PUT (sinal do termo de juros + termo de dividendos ausente)
L('P1 THETA PUT vs Black-Scholes-Merton fechado');
const S = 30, K = 30, T = 30 / 252, r = 0.1075, sig = 0.30, q = 0.03;
const nd = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
// CDF de alta precisão (Hart/erfc via série) para referência independente
function N(x: number) {
  // Zelen & Severo? usa erf via aproximação de dupla precisão (Cody)
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = nd(x);
  let p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
}
const d1 = (Math.log(S / K) + (r - q + 0.5 * sig * sig) * T) / (sig * Math.sqrt(T));
const d2 = d1 - sig * Math.sqrt(T);
const thetaPutRef = (-(S * nd(d1) * sig * Math.exp(-q * T)) / (2 * Math.sqrt(T)) - q * S * Math.exp(-q * T) * N(-d1) + r * K * Math.exp(-r * T) * N(-d2)) / 365;
const thetaCallRef = (-(S * nd(d1) * sig * Math.exp(-q * T)) / (2 * Math.sqrt(T)) + q * S * Math.exp(-q * T) * N(d1) - r * K * Math.exp(-r * T) * N(d2)) / 365;
const put = calculateBlackScholes(S, K, T, r, sig, 'put', q);
const call = calculateBlackScholes(S, K, T, r, sig, 'call', q);
console.log('theta PUT  codigo =', put.theta, ' | referencia BSM =', thetaPutRef.toFixed(6), ' | erro =', (put.theta - thetaPutRef).toFixed(6));
console.log('theta CALL codigo =', call.theta, ' | referencia BSM =', thetaCallRef.toFixed(6), ' | erro =', (call.theta - thetaCallRef).toFixed(6));
// verificacao de paridade: theta_call - theta_put deve ser (-qSe^-qT + rKe^-rT)/365 ... testamos put-call parity de preco tambem
console.log('paridade preco C-P =', (call.theoreticalPrice - put.theoreticalPrice).toFixed(4), ' esperado S*e^-qT-K*e^-rT =', (S * Math.exp(-q * T) - K * Math.exp(-r * T)).toFixed(4));

// --------- P2: solver de IV — precisao real
L('P2 SOLVER DE IV: precisao real vs 1 casa decimal exibida');
for (const [s, k, prem] of [[30, 32, 0.12], [30, 32, 0.13], [30, 30, 1.05], [100, 110, 0.35]] as number[][]) {
  const iv = calculateImpliedVolatility(prem, s, k, 30 / 252, r, 'call', q);
  if (iv === null) { console.log(`S=${s} K=${k} premio=${prem} -> IV null`); continue; }
  const back = calculateBlackScholes(s, k, 30 / 252, r, iv / 100, 'call', q).theoreticalPrice;
  console.log(`S=${s} K=${k} premio=${prem} -> IV=${iv}% ; reprecificando da IV: R$ ${back} ; erro de preco = R$ ${(back - prem).toFixed(3)}`);
}
// sensibilidade: quantos pontos de vol cabem em 1 centavo
const a = calculateImpliedVolatility(0.10, 30, 33, 30 / 252, r, 'call', q);
const b = calculateImpliedVolatility(0.11, 30, 33, 30 / 252, r, 'call', q);
console.log('1 centavo de premio (0,10 -> 0,11) move a IV de', a, '% para', b, '% =>', b !== null && a !== null ? (b - a).toFixed(1) : '?', 'pontos de vol por centavo');

// --------- P3: HV / regime de volatilidade com fonte ausente
L('P3 FALLBACK DE VOLATILIDADE (fonte ausente vira numero)');
console.log('calculateHistoricalVolatility([], 21) =', calculateHistoricalVolatility([], 21));
console.log('classifyVolatilityRegime(0, 0)       =', JSON.stringify(classifyVolatilityRegime(0, 0)));
console.log('classifyVolatilityRegime(0, 0).ivRatio =', classifyVolatilityRegime(0, 0).ivRatio, '<- razao IV/HV = 1,00 sem nenhum dado');

// --------- P4: fundamentos — flag eliminatoria contornada
L('P4 FUNDAMENTOS: prejuizo + FCO positivo neutraliza LUCRO_NEGATIVO e MARGEM_NEGATIVA');
const empresaComPrejuizo = {
  netIncome: -5_000_000_000, netMargin: -0.12, returnOnEquity: 0.03,
  ebitda: 8_000_000_000, debtToEbitda: 2.0, currentRatio: 1.5,
  priceEarnings: 10, priceToBook: 1.2, operatingCashFlow: 6_000_000_000,
};
const rA = analyzeFundamentals('XPTO3', empresaComPrejuizo);
console.log('score =', rA.score, '| status =', rA.status, '| flags eliminatorias =', JSON.stringify(rA.eliminatoryFlags));
console.log('ROE exibido =', rA.metrics.roe.formatted, '| ROE contabil informado = 3%');
console.log('resumo:', rA.summary);

L('P4b MESMA EMPRESA SEM O CAMPO FCO (unico dado alterado)');
const semFco = { ...empresaComPrejuizo, operatingCashFlow: null };
const rB = analyzeFundamentals('XPTO3', semFco);
console.log('score =', rB.score, '| status =', rB.status, '| flags =', JSON.stringify(rB.eliminatoryFlags));

L('P4c ROE NORMALIZADO EXPLODE COM LUCRO NEGATIVO');
const rC = analyzeFundamentals('YPTO3', { ...empresaComPrejuizo, returnOnEquity: 0.03, netIncome: -1000, operatingCashFlow: 6_000_000_000 });
console.log('ROE formatado exibido ao usuario =', rC.metrics.roe.formatted);

// --------- P5: options-barriers com fonte ausente
L('P5 BARREIRAS DE OPCOES SEM PRECO E SEM POSICOES');
const an = analyzeOptionPositions('TESTE3', 0, [], [], '2026-09-18', [], []);
console.log('underlyingPrice (spot) =', an.underlyingPrice, '<- preco real era 0');
console.log('hv21 =', an.hv21, '| hv63 =', an.hv63, '<- sem nenhum historico');
console.log('ivAtm =', JSON.stringify(an.ivAtm), '| ivQuality =', an.ivQuality);
const alert = buildOptionBarrierAlert(an);
console.log('topCallWall =', JSON.stringify(alert.topCallWall));
console.log('topPutWall  =', JSON.stringify(alert.topPutWall));

L('P5b PERCENTIL DE IV E SEMPRE 75');
const mk = (sym: string, side: string, strike: number, price: number, iv: number) => ({ symbol: sym, side, strike, optionPrice: price, impliedVolatility: iv, openInterest: 50000, nullReason: null, delta: 0.3, lastTradeDate: '2026-09-05' } as any);
for (const ivBase of [12, 28, 60]) {
  const res = analyzeOptionPositions('T3', 30, [{ symbol: 'T3I30', side: 'call', strike: 30, openInterest: 9000 } as any], [
    mk('T3I29', 'call', 29, 1.2, ivBase), mk('T3I30', 'call', 30, 0.8, ivBase + 0.5), mk('T3U30', 'put', 30, 0.7, ivBase + 1), mk('T3U29', 'put', 29, 0.4, ivBase - 0.5),
  ], '2026-09-18', [], []);
  console.log(`IV real da cadeia ~${ivBase}% -> percentile exibido =`, res.ivAtm?.percentile);
}

// --------- P6: R:R do indicators e tautologia
L('P6 R:R DE indicators.calculateRiskReward E TAUTOLOGICO');
for (const spot of [10, 35.5, 120]) {
  const sr = calculateSupportResistance(Array.from({ length: 80 }, (_, i) => ({ date: i, open: spot, high: spot * 1.05, low: spot * 0.95, close: spot, volume: 1000 })) as any, spot);
  const rr = calculateRiskReward(spot, 'ALTA', 1.0, sr.supports, sr.resistances);
  console.log(`spot ${spot} -> R:R = ${rr.riskRewardRatio} | stop ${rr.stopLoss} | alvo1 ${rr.target1}`);
}
console.log('suportes gerados p/ spot 35.5:', JSON.stringify(calculateSupportResistance(Array.from({ length: 80 }, () => ({ date: 1, open: 35.5, high: 37, low: 34, close: 35.5, volume: 1 })) as any, 35.5)));

// --------- P7: ATR e volume com historico curto
L('P7 ATR E VOLUME COM HISTORICO INSUFICIENTE');
console.log('calculateATR(historico de 3 dias) =', calculateATR([{ high: 121, low: 119, close: 120 }, { high: 122, low: 120, close: 121 }, { high: 123, low: 121, close: 122 }] as any, 14), '<- R$ para uma acao de R$ 120');
console.log('calculateVolumeRatio(historico curto) =', calculateVolumeRatio([{ volume: 1 }] as any, 20), '% <- "volume na media" fabricado');
const tp = buildTradePlan(120, 'ALTA', [121, 122, 123, 124, 125], [119, 120, 121, 122, 123], [120, 121, 122, 123, 124]);
console.log('buildTradePlan(spot=120, historico curto) =', JSON.stringify(tp));

// --------- P8: IRON CONDOR breakeven
L('P8 BREAK-EVEN DO IRON CONDOR');
const credit = 0.60;
const legs = [
  { action: 'COMPRA', symbol: 'p1', strike: 26, type: 'PUT', unitPrice: 0.20, lotQuantity: 1000, totalFinancial: 0, openInterest: 0 },
  { action: 'VENDA', symbol: 'p2', strike: 28, type: 'PUT', unitPrice: 0.55, lotQuantity: 1000, totalFinancial: 0, openInterest: 0 },
  { action: 'VENDA', symbol: 'c1', strike: 32, type: 'CALL', unitPrice: 0.60, lotQuantity: 1000, totalFinancial: 0, openInterest: 0 },
  { action: 'COMPRA', symbol: 'c2', strike: 34, type: 'CALL', unitPrice: 0.15, lotQuantity: 1000, totalFinancial: 0, openInterest: 0 },
] as any;
const beExibido = (28 + 32) / 2; // formula do codigo (linha 1476)
console.log('credito total por cota =', (0.55 - 0.20 + 0.60 - 0.15).toFixed(2));
console.log('breakEven EXIBIDO pelo sistema (media dos strikes vendidos) =', beExibido);
console.log('payoff nesse "break even" =', payoffAt(legs, beExibido), '<- deveria ser 0 num break even; e o LUCRO MAXIMO');
const beReal1 = 28 - 0.80, beReal2 = 32 + 0.80;
console.log('break-evens REAIS =', beReal1.toFixed(2), 'e', beReal2.toFixed(2), '-> payoff neles:', payoffAt(legs, beReal1), '/', payoffAt(legs, beReal2));
