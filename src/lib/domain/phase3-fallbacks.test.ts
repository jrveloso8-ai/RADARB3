import { describe, it, expect } from 'vitest';
import { DataProvenance } from '../types/provenance';

describe('Item 3C (c) — Eliminação de Fallbacks Numéricos Soltos na UI de Cotação', () => {
  it('quando o percentual de variação ou preço regular forem indefinidos, o componente deve receber null com proveniência INDISPONIVEL', () => {
    const resolveSpotPriceDisplay = (price?: number | null): { value: string | null; provenance: DataProvenance } => {
      if (!price || price <= 0) {
        return { value: null, provenance: 'INDISPONIVEL' };
      }
      return { value: `R$ ${price.toFixed(2)}`, provenance: 'MEDIDO' };
    };

    const emptyResult = resolveSpotPriceDisplay(undefined);
    expect(emptyResult.value).toBeNull();
    expect(emptyResult.provenance).toBe('INDISPONIVEL');
    expect(emptyResult.value).not.toBe('0.00');

    const validResult = resolveSpotPriceDisplay(38.50);
    expect(validResult.value).toBe('R$ 38.50');
    expect(validResult.provenance).toBe('MEDIDO');
  });

  it('vencimento de opções ausente não assume data ou DTE hardcoded fictício', () => {
    const resolveOptionExpirationDisplay = (
      barrier?: { expirationDate?: string; dte?: number } | null
    ): { value: string | null; provenance: DataProvenance } => {
      if (!barrier?.expirationDate) {
        return { value: null, provenance: 'INDISPONIVEL' };
      }
      return {
        value: `${barrier.expirationDate} (${barrier.dte ?? 'N/D'} DTE)`,
        provenance: 'MEDIDO',
      };
    };

    const emptyBarrierResult = resolveOptionExpirationDisplay(null);
    expect(emptyBarrierResult.value).toBeNull();
    expect(emptyBarrierResult.provenance).toBe('INDISPONIVEL');
    expect(emptyBarrierResult.value).not.toBe('2026-09-18 (13 DTE)');

    const validBarrierResult = resolveOptionExpirationDisplay({ expirationDate: '2026-10-16', dte: 25 });
    expect(validBarrierResult.value).toBe('2026-10-16 (25 DTE)');
    expect(validBarrierResult.provenance).toBe('MEDIDO');
  });
});
