import { describe, it, expect } from 'vitest';
import {
  analyzeOptionPositions,
  getB3ExpirationDetails,
  getMostLiquidB3Expiration,
} from './options-barriers';
import { OptionAnalyticsItem, OptionPositionItem } from '../types/financial';

describe('Motor de Opções e Barreiras B3 — Testes Obrigatórios O1 a O8 (Spec v2)', () => {
  const mockExp = getB3ExpirationDetails(new Date('2026-08-31'));

  // O1: Série com OI e sem analytics entra como wall, optionPrice = null, iv = null, sem preço teórico
  it('O1: série com OI e sem analytics deve entrar na Wall sem inventar preço teórico (optionPrice = null, iv = null)', () => {
    const positions: OptionPositionItem[] = [
      {
        symbol: 'PETRI300',
        underlyingSymbol: 'PETR4',
        side: 'call',
        strike: 30.0,
        expirationDate: '2026-09-18',
        openInterest: 500000,
      },
    ];
    const analytics: OptionAnalyticsItem[] = []; // Sem analytics

    const res = analyzeOptionPositions('PETR4', 30.0, positions, analytics, '2026-09-18', mockExp);

    expect(res.top5CallWalls).toHaveLength(1);
    expect(res.top5CallWalls[0].strike).toBe(30.0);
    expect(res.top5CallWalls[0].contracts).toBe(500000);
    expect(res.top5CallWalls[0].lastPrice).toBe(0); // Sem preço teórico fictício
    expect(res.top5CallWalls[0].iv).toBe(0);
  });

  // O2: confidence: 'low' não elegível para IV ATM
  it('O2: séries com confidence "low" não devem compor a IV ATM', () => {
    const positions: OptionPositionItem[] = [
      { symbol: 'PETRI300', underlyingSymbol: 'PETR4', side: 'call', strike: 30.0, expirationDate: '2026-09-18', openInterest: 5000 },
    ];
    const analytics: OptionAnalyticsItem[] = [
      {
        symbol: 'PETRI300',
        side: 'call',
        strike: 30.0,
        optionPrice: 1.20,
        impliedVolatility: 28.5,
        openInterest: 5000,
        confidence: 'low', // Inválido
      },
    ];

    const res = analyzeOptionPositions('PETR4', 30.0, positions, analytics, '2026-09-18', mockExp);
    expect(res.ivAtm).toBeNull();
  });

  // O3: optionPrice < 0.10 não elegível
  it('O3: opções com prêmio de centavos (< R$ 0,10) não devem compor a IV ATM', () => {
    const positions: OptionPositionItem[] = [
      { symbol: 'PETRI300', underlyingSymbol: 'PETR4', side: 'call', strike: 30.0, expirationDate: '2026-09-18', openInterest: 5000 },
    ];
    const analytics: OptionAnalyticsItem[] = [
      {
        symbol: 'PETRI300',
        side: 'call',
        strike: 30.0,
        optionPrice: 0.04, // < 0.10
        impliedVolatility: 45.0,
        openInterest: 5000,
        confidence: 'high',
      },
    ];

    const res = analyzeOptionPositions('PETR4', 30.0, positions, analytics, '2026-09-18', mockExp);
    expect(res.ivAtm).toBeNull();
  });

  // O4: Strike a 8% do spot não elegível (fora de +-5%)
  it('O4: strikes fora da faixa de +-5% do spot não devem compor a IV ATM', () => {
    const positions: OptionPositionItem[] = [
      { symbol: 'PETRI325', underlyingSymbol: 'PETR4', side: 'call', strike: 32.5, expirationDate: '2026-09-18', openInterest: 5000 },
    ];
    const analytics: OptionAnalyticsItem[] = [
      {
        symbol: 'PETRI325',
        side: 'call',
        strike: 32.5, // 8.3% acima de 30.0
        optionPrice: 0.80,
        impliedVolatility: 26.0,
        openInterest: 5000,
        confidence: 'high',
      },
    ];

    const res = analyzeOptionPositions('PETR4', 30.0, positions, analytics, '2026-09-18', mockExp);
    expect(res.ivAtm).toBeNull();
  });

  // O5: Nenhuma série elegível -> ivAtm = null
  it('O5: quando nenhuma série for elegível, ivAtm deve ser null', () => {
    const res = analyzeOptionPositions('PETR4', 30.0, [], [], '2026-09-18', mockExp);
    expect(res.ivAtm).toBeNull();
    expect(res.ivQuality).toBe('INSUFICIENTE');
  });

  // O6: Divergência Call 32% vs Put 40% no ATM -> ivQuality: 'DIVERGENTE' e ivAtm = null
  it('O6: divergência Call/Put > 5 pp deve marcar ivQuality: DIVERGENTE e anular ivAtm', () => {
    const positions: OptionPositionItem[] = [
      { symbol: 'PETRI300', underlyingSymbol: 'PETR4', side: 'call', strike: 30.0, expirationDate: '2026-09-18', openInterest: 5000 },
      { symbol: 'PETRU300', underlyingSymbol: 'PETR4', side: 'put', strike: 30.0, expirationDate: '2026-09-18', openInterest: 5000 },
    ];
    const analytics: OptionAnalyticsItem[] = [
      {
        symbol: 'PETRI300',
        side: 'call',
        strike: 30.0,
        optionPrice: 1.20,
        impliedVolatility: 32.0,
        openInterest: 5000,
        confidence: 'high',
      },
      {
        symbol: 'PETRU300',
        side: 'put',
        strike: 30.0,
        optionPrice: 1.40,
        impliedVolatility: 40.0, // Diferença de 8 pp (> 5 pp)
        openInterest: 5000,
        confidence: 'high',
      },
    ];

    const res = analyzeOptionPositions('PETR4', 30.0, positions, analytics, '2026-09-18', mockExp);
    expect(res.ivQuality).toBe('DIVERGENTE');
    expect(res.ivAtm).toBeNull();
  });

  // O7: Merge por symbol: gregas vêm de analytics, OI vem de positions
  it('O7: merge por symbol deve preservar OI de positions e preencher delta/gamma/preço de analytics', () => {
    const positions: OptionPositionItem[] = [
      {
        symbol: 'PETRI300',
        underlyingSymbol: 'PETR4',
        side: 'call',
        strike: 30.0,
        expirationDate: '2026-09-18',
        openInterest: 850000,
      },
    ];
    const analytics: OptionAnalyticsItem[] = [
      {
        symbol: 'PETRI300',
        side: 'call',
        strike: 30.0,
        optionPrice: 1.15,
        impliedVolatility: 28.5,
        delta: 0.52,
        gamma: 0.18,
        theta: -12.5,
        vega: 3.8,
        openInterest: 850000,
        confidence: 'high',
      },
    ];

    const res = analyzeOptionPositions('PETR4', 30.0, positions, analytics, '2026-09-18', mockExp);
    expect(res.top5CallWalls[0].contracts).toBe(850000);
    expect(res.top5CallWalls[0].lastPrice).toBe(1.15);
    expect(res.top5CallWalls[0].iv).toBe(28.5);
    expect(res.top5CallWalls[0].delta).toBe(0.52);
  });

  // O8: Seleção de vencimento mais líquido e rolagem por DTE
  it('O8: getMostLiquidB3Expiration deve rolar para a próxima série quando DTE < 5 dias úteis', () => {
    const expirations = [
      {
        date: '2026-09-04',
        monthName: 'Setembro',
        callLetter: 'I',
        putLetter: 'U',
        dte: 4, // < 5 DU
        label: 'Série Setembro (W1)',
        badge: 'Mais Líquida (Mensal)',
      },
      {
        date: '2026-09-18',
        monthName: 'Setembro',
        callLetter: 'I',
        putLetter: 'U',
        dte: 14,
        label: 'Série Setembro',
        badge: 'Próxima Série (Mensal)',
      },
    ];

    const mostLiquid = getMostLiquidB3Expiration(expirations);
    expect(mostLiquid.date).toBe('2026-09-18');
    expect(mostLiquid.dte).toBe(14);
  });
});
