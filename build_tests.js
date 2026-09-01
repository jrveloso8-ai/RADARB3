const fs = require('fs');
const path = require('path');

const targetBase = 'C:/projetos antigravity/RADAR-TASYTRADE';

function writeFile(relPath, content) {
  const fullPath = path.join(targetBase, relPath);
  fs.writeFileSync(fullPath, content.trim(), 'utf8');
  console.log('Created test: ' + relPath);
}

// 1. Symbol Parser Test
writeFile('src/lib/domain/symbol-parser.test.ts', `
import { describe, it, expect } from 'vitest';
import { parseOptionSymbol } from './symbol-parser';

describe('SymbolParser Domain', () => {
  it('should parse dot OCC standard symbol correctly (.SPXW260918C6000)', () => {
    const res = parseOptionSymbol('.SPXW260918C6000');
    expect(res).not.toBeNull();
    expect(res?.underlying).toBe('SPXW');
    expect(res?.type).toBe('CALL');
    expect(res?.strike).toBe(6000);
    expect(res?.expiration).toBe('2026-09-18');
  });

  it('should parse put option correctly (.SPY260918P595)', () => {
    const res = parseOptionSymbol('.SPY260918P595');
    expect(res).not.toBeNull();
    expect(res?.underlying).toBe('SPY');
    expect(res?.type).toBe('PUT');
    expect(res?.strike).toBe(595);
    expect(res?.expiration).toBe('2026-09-18');
  });

  it('should return null for invalid symbol format', () => {
    const res = parseOptionSymbol('INVALID_TICKER');
    expect(res).toBeNull();
  });
});
`);

// 2. GEX Engine Test
writeFile('src/lib/domain/gex-engine.test.ts', `
import { describe, it, expect } from 'vitest';
import { calculateGex, RawOptionData } from './gex-engine';

describe('GexEngine Domain', () => {
  it('should calculate net GEX, zero gamma flip and max magnet strike', () => {
    const mockOptions: RawOptionData[] = [
      { symbol: '.SPX260918C5900', strike: 5900, type: 'CALL', gamma: 0.002, openInterest: 10000, volume: 5000, delta: 0.8, iv: 14.0 },
      { symbol: '.SPX260918C6000', strike: 6000, type: 'CALL', gamma: 0.005, openInterest: 30000, volume: 15000, delta: 0.5, iv: 13.5 },
      { symbol: '.SPX260918C6050', strike: 6050, type: 'CALL', gamma: 0.004, openInterest: 40000, volume: 20000, delta: 0.35, iv: 13.8 },
      { symbol: '.SPX260918P5900', strike: 5900, type: 'PUT', gamma: 0.002, openInterest: 35000, volume: 12000, delta: -0.2, iv: 14.5 },
      { symbol: '.SPX260918P5950', strike: 5950, type: 'PUT', gamma: 0.004, openInterest: 45000, volume: 18000, delta: -0.38, iv: 14.2 },
      { symbol: '.SPX260918P6000', strike: 6000, type: 'PUT', gamma: 0.005, openInterest: 15000, volume: 8000, delta: -0.5, iv: 13.5 },
    ];

    const result = calculateGex('SPX', 6000, mockOptions);

    expect(result.symbol).toBe('SPX');
    expect(result.spotPrice).toBe(6000);
    expect(result.totalCallGex).toBeGreaterThan(0);
    expect(result.totalPutGex).toBeGreaterThan(0);
    expect(result.strikes.length).toBe(4);
    expect(result.maxGexMagnetStrike).toBe(6050);
    expect(result.callWalls.length).toBeGreaterThan(0);
    expect(result.putWalls.length).toBeGreaterThan(0);
    expect(result.gammaRegime).toBeDefined();
  });

  it('should handle empty options list safely', () => {
    const result = calculateGex('SPX', 6000, []);
    expect(result.totalNetGex).toBe(0);
    expect(result.strikes.length).toBe(0);
    expect(result.gammaRegime).toBe('NEUTRAL');
  });
});
`);

console.log('Unit test files written');
