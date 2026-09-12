import { calculateBlackScholes, calculateImpliedVolatility } from './src/lib/domain/black-scholes';
console.log('=== P11: impacto da Selic hardcoded (10,75%) vs vigente (14,50%) ===');
const S=39.55,T=15/252,sig=0.265;
for (const K of [37.50, 39.50, 41.00]) {
  for (const tp of ['call','put'] as const) {
    const a = calculateBlackScholes(S,K,T,0.1075,sig,tp,0.03);
    const b = calculateBlackScholes(S,K,T,0.1450,sig,tp,0.03);
    console.log(`K=${K} ${tp}: preco ${a.theoreticalPrice} -> ${b.theoreticalPrice} (${((b.theoreticalPrice/a.theoreticalPrice-1)*100).toFixed(1)}%) | delta ${a.delta} -> ${b.delta} | theta ${a.theta} -> ${b.theta}`);
  }
}
console.log('\n=== P12: IV extraida do mesmo premio com r errado ===');
const premio = 0.40;
console.log('IV com r=10,75% (codigo) =', calculateImpliedVolatility(premio,S,37.96,T,0.1075,'put',0.03), '%');
console.log('IV com r=14,50% (real)   =', calculateImpliedVolatility(premio,S,37.96,T,0.1450,'put',0.03), '%');
