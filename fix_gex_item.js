const fs = require('fs');
const target = 'C:/projetos antigravity/RADAR-TASYTRADE/src/lib/domain/gex-engine.ts';

let content = fs.readFileSync(target, 'utf8');

content = content.replace(
`      item = {
        strike: opt.strike,
        callGex: 0,
        putGex: 0,
        netGex: 0,
        absoluteGex: 0,
        callOpenInterest: 0,
        putOpenInterest: 0,
        callVolume: 0,
        putVolume: 0,
        callIv: 0,
        putIv: 0,
        callDelta: 0,
        putDelta: 0,
      };`,
`      item = {
        strike: opt.strike,
        callGex: 0,
        putGex: 0,
        netGex: 0,
        absoluteGex: 0,
        callOi: 0,
        putOi: 0,
        callOpenInterest: 0,
        putOpenInterest: 0,
        callVolume: 0,
        putVolume: 0,
        callIv: 0,
        putIv: 0,
        callDelta: 0,
        putDelta: 0,
      };`
);

content = content.replace(
  `      item.callOpenInterest += opt.openInterest;`,
  `      item.callOi += opt.openInterest;
      item.callOpenInterest += opt.openInterest;`
);

content = content.replace(
  `      item.putOpenInterest += opt.openInterest;`,
  `      item.putOi += opt.openInterest;
      item.putOpenInterest += opt.openInterest;`
);

fs.writeFileSync(target, content, 'utf8');
console.log('Fixed item initializers in gex-engine.ts');
