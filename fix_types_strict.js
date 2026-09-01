const fs = require('fs');
const target = 'C:/projetos antigravity/RADAR-TASYTRADE/src/lib/types/index.ts';

let content = fs.readFileSync(target, 'utf8');

content = content.replace(
`export interface GexByStrike {
  strike: number;
  callGex: number;
  putGex: number;
  netGex: number;
  absoluteGex?: number;
  callOi?: number;
  putOi?: number;
  callOpenInterest?: number;
  putOpenInterest?: number;
  callVolume: number;
  putVolume: number;
  callIv?: number;
  putIv?: number;
  callDelta?: number;
  putDelta?: number;
}`,
`export interface GexByStrike {
  strike: number;
  callGex: number;
  putGex: number;
  netGex: number;
  absoluteGex: number;
  callOi: number;
  putOi: number;
  callOpenInterest: number;
  putOpenInterest: number;
  callVolume: number;
  putVolume: number;
  callIv: number;
  putIv: number;
  callDelta: number;
  putDelta: number;
}`
);

fs.writeFileSync(target, content, 'utf8');
console.log('Fixed required numeric types in GexByStrike');
