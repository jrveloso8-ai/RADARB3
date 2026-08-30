import { describe, it, expect } from 'vitest';
import {
  getB3ExpirationDetails,
  analyzeOptionPositions,
} from './options-barriers';
import { calculateBlackScholes, calculateMaxPain } from './black-scholes';
import { OptionPositionItem } from '../types/financial';

describe('Motor Matemático de Opções - Black Scholes & Max Pain & Walls', () => {
  describe('calculateBlackScholes', () => {
    it('deve calcular gregas teóricas (Delta positivo para CALL, negativo para PUT)', () => {
      const call = calculateBlackScholes(30.0, 30.0, 30 / 252, 0.1075, 0.32, 'call');
      expect(call.delta).toBeGreaterThan(0.4);
      expect(call.delta).toBeLessThan(0.7);
      expect(call.theoreticalPrice).toBeGreaterThan(0);

      const put = calculateBlackScholes(30.0, 30.0, 30 / 252, 0.1075, 0.32, 'put');
      expect(put.delta).toBeLessThan(0);
      expect(put.delta).toBeGreaterThan(-0.7);
    });
  });

  describe('calculateMaxPain', () => {
    it('deve encontrar o strike de menor prejuízo para lançadores', () => {
      const strikes = [28, 30, 32];
      const callsByStrike = new Map<number, number>([
        [28, 1000],
        [30, 5000],
        [32, 20000],
      ]);
      const putsByStrike = new Map<number, number>([
        [28, 15000],
        [30, 4000],
        [32, 500],
      ]);

      const { maxPainStrike } = calculateMaxPain(strikes, callsByStrike, putsByStrike);
      expect(maxPainStrike).toBe(30);
    });
  });

  describe('getB3ExpirationDetails', () => {
    it('deve gerar vencimentos oficiais (Mensais e Semanais) com letras de séries corretas e DTE em dias úteis', () => {
      const expirations = getB3ExpirationDetails('2026-08-29');
      expect(expirations.length).toBeGreaterThanOrEqual(10);
      expect(expirations[0].callLetter).toBeDefined();
      expect(expirations[0].putLetter).toBeDefined();
      expect(expirations[0].dte).toBeGreaterThan(0);

      // Verificar que o vencimento mensal de Outubro tem a série J / V e exatamente 32 DTE
      const octMonthly = expirations.find((e) => e.date === '2026-10-16');
      expect(octMonthly).toBeDefined();
      expect(octMonthly?.callLetter).toBe('J');
      expect(octMonthly?.putLetter).toBe('V');
      expect(octMonthly?.dte).toBe(32); // 32 dias úteis como no Profit!
    });
  });

  describe('analyzeOptionPositions', () => {
    it('deve processar Top 5 Walls, distribuição de strikes e grade straddle completa', () => {
      const sample: OptionPositionItem[] = [
        {
          symbol: 'PETRI300',
          underlyingSymbol: 'PETR4',
          strike: 30.0,
          side: 'call',
          expirationDate: '2026-09-18',
          openInterest: 50000,
          coveredQuantity: 30000,
          uncoveredQuantity: 20000,
        },
        {
          symbol: 'PETRU300',
          underlyingSymbol: 'PETR4',
          strike: 30.0,
          side: 'put',
          expirationDate: '2026-09-18',
          openInterest: 45000,
          coveredQuantity: 25000,
          uncoveredQuantity: 20000,
        },
      ];

      const expirations = getB3ExpirationDetails('2026-08-29');
      const result = analyzeOptionPositions(
        'PETR4',
        30.0,
        sample,
        '2026-09-18',
        expirations,
        'equity'
      );

      expect(result.underlyingSymbol).toBe('PETR4');
      expect(result.top5CallWalls.length).toBe(1);
      expect(result.top5CallWalls[0].symbol).toBe('PETRI300');
      expect(result.top5PutWalls.length).toBe(1);
      expect(result.top5PutWalls[0].symbol).toBe('PETRU300');
      expect(result.straddleRows.length).toBe(1);
      expect(result.straddleRows[0].strike).toBe(30.0);
    });
  });
});
