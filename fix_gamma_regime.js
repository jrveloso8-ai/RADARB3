const fs = require('fs');
const target = 'C:/projetos antigravity/RADAR-TASYTRADE/src/lib/domain/gex-engine.ts';

let content = fs.readFileSync(target, 'utf8');

content = content.replace(
  "gammaRegime: totalNetGex >= 0 ? 'POSITIVE' : 'NEGATIVE',",
  "gammaRegime: totalNetGex > 0 ? 'LONG_GAMMA_STABLE' : totalNetGex < 0 ? 'SHORT_GAMMA_VOLATILE' : 'NEUTRAL',"
);

fs.writeFileSync(target, content, 'utf8');
console.log('Fixed gammaRegime enum in gex-engine.ts');
