import { describe, it, expect } from 'vitest';
import {
  calculateSMA,
  calculateHistoricalSMA,
  classifyTrend,
  analyzeAssetTrend,
  generateConsolidatedVerdict,
} from './trends';
import { HistoricalPrice, OptionBarrierAlert } from '../types/financial';

describe('Motor de Tendências e Veredito Integrado CNPI', () => {
  describe('calculateSMA', () => {
    it('deve calcular a média aritmética simples corretamente', () => {
      const prices = [10, 20, 30, 40, 50];
      expect(calculateSMA(prices, 3)).toBe(40);
      expect(calculateSMA(prices, 5)).toBe(30);
    });

    it('deve retornar null se o histórico for menor que o período', () => {
      const prices = [10, 20];
      expect(calculateSMA(prices, 3)).toBeNull();
    });
  });

  describe('classifyTrend', () => {
    it('deve classificar como ALTA quando Preço > MM20 > MM50 > MM200', () => {
      expect(classifyTrend(45, 40, 35, 30)).toBe('ALTA');
    });

    it('deve classificar como BAIXA quando Preço < MM20 < MM50 < MM200', () => {
      expect(classifyTrend(25, 30, 35, 40)).toBe('BAIXA');
    });

    it('deve classificar como LATERAL quando não há alinhamento estrito', () => {
      expect(classifyTrend(32, 35, 30, 40)).toBe('LATERAL');
    });
  });

  describe('generateConsolidatedVerdict', () => {
    it('deve emitir COMPRA_FORTE quando fundamentos aprovados e gráfico em ALTA sem barreira de call', () => {
      const verdict = generateConsolidatedVerdict(
        'VALE3',
        60.0,
        'ALTA',
        'APROVADO',
        undefined,
        'Vale ON'
      );
      expect(verdict.verdict).toBe('COMPRA_FORTE');
      expect(verdict.actionRecommendation).toBe('COMPRA');
    });

    it('deve emitir COMPRA_COM_ALERTA_BARREIRA quando preço está colado na Call Wall (<= 3%)', () => {
      const barrierAlert: OptionBarrierAlert = {
        expirationDate: '2026-09-18',
        dte: 13,
        spotPrice: 30.0,
        maxPain: 30.0,
        topCallWall: {
          strike: 30.5,
          symbol: 'PETRI305',
          contracts: 1000000,
          distSpot: 1.6, // <= 3%
          isImminent: true,
        },
        topPutWall: {
          strike: 28.0,
          symbol: 'PETRU280',
          contracts: 500000,
          distSpot: -6.6,
          isImminent: false,
        },
        hasAlert: true,
        alertType: 'CALL_WALL_RESISTANCE',
      };

      const verdict = generateConsolidatedVerdict(
        'PETR4',
        30.0,
        'ALTA',
        'APROVADO',
        barrierAlert
      );
      expect(verdict.verdict).toBe('COMPRA_COM_ALERTA_BARREIRA');
      expect(verdict.actionRecommendation).toBe('COMPRA');
      expect(verdict.rationale.some((r) => r.includes('Call Wall'))).toBe(true);
    });

    it('deve BLOQUEAR COMPRA quando fundamentos forem REPROVADOS (mesmo se gráfico estiver em ALTA)', () => {
      const verdict = generateConsolidatedVerdict(
        'MGLU3',
        10.0,
        'ALTA',
        'REPROVADO',
        undefined
      );
      expect(verdict.verdict).toBe('BLOQUEADO_POR_FUNDAMENTOS');
      expect(verdict.actionRecommendation).toBe('BLOQUEADO');
    });

    it('deve emitir VENDA quando gráfico estiver em BAIXA (mesmo com fundamentos APROVADOS)', () => {
      const verdict = generateConsolidatedVerdict(
        'ITUB4',
        30.0,
        'BAIXA',
        'APROVADO',
        undefined
      );
      expect(verdict.verdict).toBe('VENDA_FORTE');
      expect(verdict.actionRecommendation).toBe('VENDA');
    });

    it('deve emitir LATERAL_IRON_CONDOR quando fundamentos APROVADOS, gráfico LATERAL e vol favorável', () => {
      const verdict = generateConsolidatedVerdict(
        'BBDC4',
        14.5,
        'LATERAL',
        'APROVADO',
        undefined,
        'Bradesco PN',
        { regime: 'MODERADA', isCreditFavorable: true }
      );
      expect(verdict.verdict).toBe('LATERAL_IRON_CONDOR');
      expect(verdict.actionRecommendation).toBe('IRON_CONDOR');
      expect(verdict.rationale.some((r) => r.includes('Iron Condor'))).toBe(true);
    });

    it('deve emitir LATERAL_AGUARDAR quando fundamentos APROVADOS, gráfico LATERAL e vol MUITO BAIXA (Squeeze)', () => {
      const verdict = generateConsolidatedVerdict(
        'BBAS3',
        28.0,
        'LATERAL',
        'APROVADO',
        undefined,
        'Banco do Brasil ON',
        { regime: 'MUITO_BAIXA', isCreditFavorable: false }
      );
      expect(verdict.verdict).toBe('LATERAL_AGUARDAR');
      expect(verdict.actionRecommendation).toBe('AGUARDAR');
      expect(verdict.rationale.some((r) => r.includes('Squeeze') || r.includes('comprimida'))).toBe(true);
    });

    it('deve emitir VENDA_COM_ALERTA_SUPORTE quando gráfico em BAIXA e Put Wall iminente', () => {
      const barrierAlert: OptionBarrierAlert = {
        expirationDate: '2026-09-18',
        dte: 13,
        spotPrice: 20.0,
        maxPain: 21.0,
        topCallWall: undefined,
        topPutWall: {
          strike: 20.5,
          symbol: 'MGLU3U205',
          contracts: 800000,
          distSpot: 2.5, // <= 3% → isImminent: true
          isImminent: true,
        },
        hasAlert: true,
        alertType: 'PUT_WALL_SUPPORT',
      };

      const verdict = generateConsolidatedVerdict(
        'MGLU3',
        20.0,
        'BAIXA',
        'APROVADO',
        barrierAlert,
        'Magalu ON'
      );
      expect(verdict.verdict).toBe('VENDA_COM_ALERTA_SUPORTE');
      expect(verdict.actionRecommendation).toBe('VENDA');
      expect(verdict.rationale.some((r) => r.includes('Put Wall') || r.includes('suporte'))).toBe(true);
    });

    it('deve emitir LATERAL_AGUARDAR quando vol não informada (undefined) — conservador por segurança', () => {
      // Sem volatilityRegime informado, o sistema não deve recomendar Iron Condor às cegas; deve cair em AGUARDAR
      const verdict = generateConsolidatedVerdict(
        'WEGE3',
        38.0,
        'LATERAL',
        'APROVADO',
        undefined,
        'WEG ON',
        undefined
      );
      expect(verdict.verdict).toBe('LATERAL_AGUARDAR');
      expect(verdict.actionRecommendation).toBe('AGUARDAR');
    });

    it('deve emitir VENDA_FORTE quando gráfico BAIXA mesmo com fundamentos REPROVADOS (baixa prevalece)', () => {
      // Regra 1 (BAIXA) tem prioridade máxima sobre Regra 2 (REPROVADO)
      const verdict = generateConsolidatedVerdict(
        'GOLL4',
        8.0,
        'BAIXA',
        'REPROVADO',
        undefined
      );
      expect(verdict.verdict).toBe('VENDA_FORTE');
      expect(verdict.actionRecommendation).toBe('VENDA');
    });
  });
});
