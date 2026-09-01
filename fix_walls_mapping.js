const fs = require('fs');
const target = 'C:/projetos antigravity/RADAR-TASYTRADE/src/lib/domain/gex-engine.ts';

let content = fs.readFileSync(target, 'utf8');

content = content.replace(
`  const callWalls = [...sortedStrikes].sort((a, b) => b.callGex - a.callGex).slice(0, 5);
  const putWalls = [...sortedStrikes].sort((a, b) => Math.abs(b.putGex) - Math.abs(a.putGex)).slice(0, 5);`,
`  const topCallStrikes = [...sortedStrikes].sort((a, b) => b.callGex - a.callGex).slice(0, 5);
  const topPutStrikes = [...sortedStrikes].sort((a, b) => Math.abs(b.putGex) - Math.abs(a.putGex)).slice(0, 5);

  const callWalls = topCallStrikes.map(s => ({
    strike: s.strike,
    symbol: \`.\${symbol.toUpperCase()}260918C\${Math.round(s.strike)}\`,
    contracts: s.callOi || s.callOpenInterest || 0,
    delta: s.callDelta || 0.5,
    iv: s.callIv || 35,
    distancePct: Number((((s.strike - spotPrice) / spotPrice) * 100).toFixed(1)),
  }));

  const putWalls = topPutStrikes.map(s => ({
    strike: s.strike,
    symbol: \`.\${symbol.toUpperCase()}260918P\${Math.round(s.strike)}\`,
    contracts: s.putOi || s.putOpenInterest || 0,
    delta: s.putDelta || -0.5,
    iv: s.putIv || 35,
    distancePct: Number((((s.strike - spotPrice) / spotPrice) * 100).toFixed(1)),
  }));`
);

content = content.replace(
`  const topCallWall = callWalls[0]?.strike || spotPrice * 1.05;
  const topPutWall = putWalls[0]?.strike || spotPrice * 0.95;`,
`  const topCallWall = topCallStrikes[0]?.strike || spotPrice * 1.05;
  const topPutWall = topPutStrikes[0]?.strike || spotPrice * 0.95;`
);

fs.writeFileSync(target, content, 'utf8');
console.log('Fixed callWalls and putWalls formatting in gex-engine.ts');
