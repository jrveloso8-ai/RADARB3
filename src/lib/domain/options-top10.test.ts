import { describe, it, expect } from 'vitest';
import {
  computeTop10OI,
  TOP_10_LIQUID_ASSETS,
} from './options-top10';
import { B3ExpirationInfo, OptionPositionItem } from '../types/financial';

describe('Motor Quantitativo Top 10 OI (CALL & PUT)', () => {
  const mockExpirations: B3ExpirationInfo[] = [
    {
      date: '2026-10-16',
      monthName: 'Outubro',
      callLetter: 'J',
      putLetter: 'V',
      dte: 25,
      label: 'Out/2026',
      badge: 'SÉRIE MENSAL',
    },
    {
      date: '2026-11-20',
      monthName: 'Novembro',
      callLetter: 'K',
      putLetter: 'W',
      dte: 60,
      label: 'Nov/2026',
      badge: 'SÉRIE MENSAL',
    },
  ];

  it('deve conter exatamente os 10 ativos mais líquidos de opções na B3', () => {
    expect(TOP_10_LIQUID_ASSETS).toHaveLength(10);
    expect(TOP_10_LIQUID_ASSETS).toContain('PETR4');
    expect(TOP_10_LIQUID_ASSETS).toContain('VALE3');
    expect(TOP_10_LIQUID_ASSETS).toContain('BOVA11');
    expect(TOP_10_LIQUID_ASSETS).toContain('ITUB4');
    expect(TOP_10_LIQUID_ASSETS).toContain('BBDC4');
  });

  it('deve isolar as top 10 CALLs e top 10 PUTs ordenadas rigorosamente por maior OI', () => {
    // Gerar 15 CALLs e 15 PUTs com diferentes volumes de OI
    const currentPositions: OptionPositionItem[] = [];
    for (let i = 1; i <= 15; i++) {
      currentPositions.push({
        symbol: `PETRJ${30 + i}`,
        underlyingSymbol: 'PETR4',
        strike: 30 + i,
        side: 'CALL',
        openInterest: i * 1000,
        expirationDate: '2026-10-16',
      });
      currentPositions.push({
        symbol: `PETRV${30 + i}`,
        underlyingSymbol: 'PETR4',
        strike: 30 + i,
        side: 'PUT',
        openInterest: (16 - i) * 1000,
        expirationDate: '2026-10-16',
      });
    }

    const result = computeTop10OI({
      symbol: 'PETR4',
      selectedExpiration: '2026-10-16',
      availableExpirations: mockExpirations,
      currentSpot: 37.5,
      currentPositions,
    });

    expect(result.top10Calls).toHaveLength(10);
    expect(result.top10Puts).toHaveLength(10);

    // CALLs devem estar ordenadas do maior OI (15000) até o 10º (6000)
    expect(result.top10Calls[0].currentOI).toBe(15000);
    expect(result.top10Calls[0].strike).toBe(45);
    expect(result.top10Calls[9].currentOI).toBe(6000);
    expect(result.top10Calls[9].strike).toBe(36);

    // PUTs devem estar ordenadas do maior OI (15000) até o 10º (6000)
    expect(result.top10Puts[0].currentOI).toBe(15000);
    expect(result.top10Puts[0].strike).toBe(31);
    expect(result.top10Puts[9].currentOI).toBe(6000);
    expect(result.top10Puts[9].strike).toBe(40);
  });

  it('deve calcular corretamente a variação 1D e 5D em percentual e saldo de contratos reais', () => {
    const currentPositions: OptionPositionItem[] = [
      {
        symbol: 'PETRJ380',
        underlyingSymbol: 'PETR4',
        strike: 38.0,
        side: 'CALL',
        openInterest: 12000,
        expirationDate: '2026-10-16',
      },
    ];

    const prev1DPositions: OptionPositionItem[] = [
      {
        symbol: 'PETRJ380',
        underlyingSymbol: 'PETR4',
        strike: 38.0,
        side: 'CALL',
        openInterest: 10000, // +2000 contratos (+20%)
        expirationDate: '2026-10-16',
      },
    ];

    const prev5DPositions: OptionPositionItem[] = [
      {
        symbol: 'PETRJ380',
        underlyingSymbol: 'PETR4',
        strike: 38.0,
        side: 'CALL',
        openInterest: 8000, // +4000 contratos (+50%)
        expirationDate: '2026-10-16',
      },
    ];

    const result = computeTop10OI({
      symbol: 'PETR4',
      selectedExpiration: '2026-10-16',
      availableExpirations: mockExpirations,
      currentSpot: 37.0,
      currentPositions,
      prev1DPositions,
      prev5DPositions,
    });

    const call = result.top10Calls[0];
    expect(call).toBeDefined();
    expect(call.currentOI).toBe(12000);
    expect(call.prev1DOI).toBe(10000);
    expect(call.prev5DOI).toBe(8000);
    expect(call.change1DContracts).toBe(2000);
    expect(call.change1DPercent).toBe(20);
    expect(call.change5DContracts).toBe(4000);
    expect(call.change5DPercent).toBe(50);
    expect(call.flowSignal).toBe('ACCUMULATION');
  });

  it('deve descartar estritamente opções semanais (W1-W5)', () => {
    const currentPositions: OptionPositionItem[] = [
      {
        symbol: 'PETRJ380',
        underlyingSymbol: 'PETR4',
        strike: 38.0,
        side: 'CALL',
        openInterest: 5000,
        expirationDate: '2026-10-16',
      },
      {
        symbol: 'PETRW1_380', // Opção semanal - deve ser eliminada
        underlyingSymbol: 'PETR4',
        strike: 38.0,
        side: 'CALL',
        openInterest: 999999,
        expirationDate: '2026-10-16',
      },
    ];

    const result = computeTop10OI({
      symbol: 'PETR4',
      selectedExpiration: '2026-10-16',
      availableExpirations: mockExpirations,
      currentSpot: 37.0,
      currentPositions,
    });

    expect(result.top10Calls).toHaveLength(1);
    expect(result.top10Calls[0].symbol).toBe('PETRJ380');
    expect(result.top10Calls[0].currentOI).toBe(5000);
  });

  it('deve calcular corretamente a Razão Put/Call (PCR)', () => {
    const currentPositions: OptionPositionItem[] = [
      { symbol: 'C1', underlyingSymbol: 'PETR4', strike: 30, side: 'CALL', openInterest: 100000, expirationDate: '2026-10-16' },
      { symbol: 'P1', underlyingSymbol: 'PETR4', strike: 30, side: 'PUT', openInterest: 80000, expirationDate: '2026-10-16' },
    ];

    const result = computeTop10OI({
      symbol: 'PETR4',
      selectedExpiration: '2026-10-16',
      availableExpirations: mockExpirations,
      currentSpot: 30,
      currentPositions,
    });

    expect(result.totalCallsOI).toBe(100000);
    expect(result.totalPutsOI).toBe(80000);
    expect(result.callPutRatio).toBe(0.8);
  });
});
