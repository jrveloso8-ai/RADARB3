import { describe, it, expect } from 'vitest';
import { electBestOptionStrategy } from './cme-election';
import { OptionAnalysisResult, StraddleRow } from '../types/financial';

describe('Motor de Eleição de Estratégias de Opções B3', () => {
  const mockRows: StraddleRow[] = [
    {
      strike: 26.0,
      put: { symbol: 'PETRU260', lastPrice: 0.08, openInterest: 40000, uncoveredQuantity: 0, coveredQuantity: 0, inTheMoney: false },
    },
    {
      strike: 28.0,
      put: { symbol: 'PETRU280', lastPrice: 0.25, openInterest: 50000, uncoveredQuantity: 0, coveredQuantity: 0, inTheMoney: false },
    },
    {
      strike: 30.0,
      call: { symbol: 'PETRI300', lastPrice: 0.80, openInterest: 100000, uncoveredQuantity: 0, coveredQuantity: 0, inTheMoney: true },
      put: { symbol: 'PETRU300', lastPrice: 0.50, openInterest: 80000, uncoveredQuantity: 0, coveredQuantity: 0, inTheMoney: false },
    },
    {
      strike: 32.0,
      call: { symbol: 'PETRI320', lastPrice: 0.35, openInterest: 60000, uncoveredQuantity: 0, coveredQuantity: 0, inTheMoney: false },
    },
    {
      strike: 34.0,
      call: { symbol: 'PETRI340', lastPrice: 0.10, openInterest: 30000, uncoveredQuantity: 0, coveredQuantity: 0, inTheMoney: false },
    },
  ];

  const mockAnalysis: OptionAnalysisResult = {
    underlyingSymbol: 'PETR4',
    underlyingPrice: 30.5,
    marketType: 'equity',
    availableExpirations: [],
    selectedExpiration: '2026-09-18',
    selectedExpirationInfo: {
      date: '2026-09-18',
      monthName: 'Setembro',
      callLetter: 'I',
      putLetter: 'U',
      dte: 14,
      label: 'Série Setembro',
      badge: 'Mensal',
    },
    openInterestDate: '2026-08-28',
    maxPain: 30.0,
    ivAtm: { callIv: 32.0, putIv: 32.0, percentile: 70 },
    hv21: 25.0,
    hv63: 26.0,
    putCallRatio: 0.8,
    totalCallOpenInterest: 200000,
    totalPutOpenInterest: 150000,
    top5CallWalls: [],
    top5PutWalls: [],
    strikeDistribution: [],
    straddleRows: mockRows,
  };

  it('deve eleger Bull Put Spread (#11 a Crédito) para COMPRA quando a Volatilidade Implícita está alta', () => {
    const elected = electBestOptionStrategy(
      'PETR4',
      30.5,
      'COMPRA_FORTE',
      'ALTA',
      55,
      25.0,
      { ...mockAnalysis, ivAtm: { callIv: 35.0, putIv: 35.0, percentile: 75 } },
      'APROVADO'
    );

    expect(elected).not.toBeNull();
    expect(elected?.strategySpec.id).toBe(11); // Bull Spread (#11)
    expect(elected?.bias).toBe('ALTA');
    expect(elected?.isCredit).toBe(true); // A crédito
    expect(elected?.legs.length).toBe(2);
    expect(elected?.takeProfitRule).toBeDefined();
    expect(elected?.stopLossRule).toBeDefined();
  });

  it('deve eleger Bull Call Spread (#11 a Débito) para COMPRA quando a Volatilidade Implícita está baixa', () => {
    const elected = electBestOptionStrategy(
      'PETR4',
      30.5,
      'COMPRA_FORTE',
      'ALTA',
      55,
      28.0,
      { ...mockAnalysis, ivAtm: { callIv: 18.0, putIv: 18.0, percentile: 20 } },
      'APROVADO'
    );

    expect(elected).not.toBeNull();
    expect(elected?.strategySpec.id).toBe(11); // Bull Spread (#11)
    expect(elected?.bias).toBe('ALTA');
    expect(elected?.isCredit).toBe(false); // A débito
  });

  it('deve eleger Bear Call Spread (#12 a Crédito) para VENDA', () => {
    const elected = electBestOptionStrategy(
      'PETR4',
      30.5,
      'VENDA_FORTE',
      'BAIXA',
      38,
      25.0,
      mockAnalysis,
      'APROVADO'
    );

    expect(elected).not.toBeNull();
    expect(elected?.strategySpec.id).toBe(12); // Bear Spread (#12)
    expect(elected?.bias).toBe('BAIXA');
  });

  it('deve eleger Short Strangle Coberto / Iron Condor (#20 com 4 pernas) para cenário LATERAL com IV moderada/alta', () => {
    const elected = electBestOptionStrategy(
      'PETR4',
      30.5,
      'LATERAL_AGUARDAR',
      'LATERAL',
      50,
      25.0,
      mockAnalysis,
      'APROVADO'
    );

    expect(elected).not.toBeNull();
    expect(elected?.strategySpec.id).toBe(20); // Short Strangle Coberto / Iron Condor (#20)
    expect(elected?.bias).toBe('LATERAL');
    expect(elected?.isCredit).toBe(true);
    expect(elected?.legs.length).toBe(4);
    expect(elected?.status).toBe('AUTORIZADA');
  });

  it('deve BLOQUEAR a venda de crédito do Iron Condor se a volatilidade estiver comprimida (Squeeze)', () => {
    const lowIvAnalysis = {
      ...mockAnalysis,
      ivAtm: { callIv: 14.0, putIv: 14.0, percentile: 10 },
      hv21: 22.0,
    };

    const elected = electBestOptionStrategy(
      'PETR4',
      30.5,
      'LATERAL_AGUARDAR',
      'LATERAL',
      50,
      22.0,
      lowIvAnalysis,
      'APROVADO'
    );

    expect(elected).not.toBeNull();
    expect(elected?.status).toBe('EM_ANALISE');
    expect(elected?.electionRationale[1]).toContain('Risco elevado de rompimento de volatilidade');
  });

  it('deve BLOQUEAR qualquer estratégia se a empresa for REPROVADA nos fundamentos', () => {
    const elected = electBestOptionStrategy(
      'PETR4',
      30.5,
      'BLOQUEADO_POR_FUNDAMENTOS',
      'LATERAL',
      50,
      25.0,
      mockAnalysis,
      'REPROVADO'
    );

    expect(elected).not.toBeNull();
    expect(elected?.status).toBe('BLOQUEADA');
    expect(elected?.title).toContain('Bloqueada');
  });
});
