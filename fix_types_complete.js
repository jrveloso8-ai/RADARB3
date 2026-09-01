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
  callOi: number;
  putOi: number;
  callVolume: number;
  putVolume: number;
  ivAtm?: number;
}`,
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
  ivAtm?: number;
}`
);

fs.writeFileSync(target, content, 'utf8');
console.log('Complete GexByStrike interface written');
