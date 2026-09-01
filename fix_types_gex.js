const fs = require('fs');
const target = 'C:/projetos antigravity/RADAR-TASYTRADE/src/lib/types/index.ts';

let content = fs.readFileSync(target, 'utf8');

content = content.replace(
  `export interface GexByStrike {
  strike: number;
  callGex: number;
  putGex: number;
  netGex: number;`,
  `export interface GexByStrike {
  strike: number;
  callGex: number;
  putGex: number;
  netGex: number;
  absoluteGex?: number;`
);

fs.writeFileSync(target, content, 'utf8');
console.log('Updated types/index.ts with absoluteGex');
