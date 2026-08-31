import { describe, it, expect } from 'vitest';
import { resolveOperation } from './operation-matrix';

describe('Matriz de Decisão Operacional — Teste Exaustivo das 6 Combinações (Seção 4.2)', () => {
  it('1. ALTA + APROVADO deve resultar em COMPRA com listedInTracker = true', () => {
    const dec = resolveOperation('ALTA', 'APROVADO');
    expect(dec.operation).toBe('COMPRA');
    expect(dec.listedInTracker).toBe(true);
  });

  it('2. ALTA + REPROVADO deve resultar em SEM_OPERACAO com listedInTracker = false (Value Trap)', () => {
    const dec = resolveOperation('ALTA', 'REPROVADO');
    expect(dec.operation).toBe('SEM_OPERACAO');
    expect(dec.listedInTracker).toBe(false);
    expect(dec.reason).toContain('Value Trap');
  });

  it('3. LATERAL + APROVADO deve resultar em IRON_CONDOR com listedInTracker = true', () => {
    const dec = resolveOperation('LATERAL', 'APROVADO');
    expect(dec.operation).toBe('IRON_CONDOR');
    expect(dec.listedInTracker).toBe(true);
  });

  it('4. LATERAL + REPROVADO deve resultar em SEM_OPERACAO com listedInTracker = false', () => {
    const dec = resolveOperation('LATERAL', 'REPROVADO');
    expect(dec.operation).toBe('SEM_OPERACAO');
    expect(dec.listedInTracker).toBe(false);
  });

  it('5. BAIXA + REPROVADO deve resultar em VENDA com listedInTracker = true', () => {
    const dec = resolveOperation('BAIXA', 'REPROVADO');
    expect(dec.operation).toBe('VENDA');
    expect(dec.listedInTracker).toBe(true);
  });

  it('6. BAIXA + APROVADO deve resultar em SAIDA_STOP com listedInTracker = false (Gestão de posição existente)', () => {
    const dec = resolveOperation('BAIXA', 'APROVADO');
    expect(dec.operation).toBe('SAIDA_STOP');
    expect(dec.listedInTracker).toBe(false);
    expect(dec.reason).toContain('saída ou stop de posição existente');
  });
});
