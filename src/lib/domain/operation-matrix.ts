/**
 * MOTOR DE MATRIZ DE OPERAÇÃO E DECISÃO OPERACIONAL (EIXO 1 x EIXO 2)
 * Radar B3 Pro IA — Especificação Técnica v2 (31/08/2026)
 *
 * Tabela Verdade Literal:
 * 1. ALTA + APROVADO    => COMPRA (listedInTracker: true)
 * 2. ALTA + REPROVADO   => SEM_OPERACAO (listedInTracker: false - Value Trap)
 * 3. LATERAL + APROVADO => IRON_CONDOR (listedInTracker: true)
 * 4. LATERAL + REPROVADO => SEM_OPERACAO (listedInTracker: false)
 * 5. BAIXA + REPROVADO  => VENDA (listedInTracker: true)
 * 6. BAIXA + APROVADO   => SAIDA_STOP (listedInTracker: false - Gestão de posição existente)
 */

import { TrendType } from '../types/financial';

export type OperationType =
  | 'COMPRA'        // ALTA + APROVADO
  | 'VENDA'         // BAIXA + REPROVADO
  | 'IRON_CONDOR'   // LATERAL + APROVADO
  | 'SAIDA_STOP'    // BAIXA + APROVADO -> só na consulta individual
  | 'SEM_OPERACAO'; // ALTA/LATERAL + REPROVADO -> só na consulta individual

export interface OperationDecision {
  operation: OperationType;
  listedInTracker: boolean; // true apenas para COMPRA, VENDA, IRON_CONDOR
  trend: TrendType;
  fundamentalStatus: 'APROVADO' | 'REPROVADO';
  reason: string;
}

export function resolveOperation(
  trend: TrendType,
  fundamentalStatus: 'APROVADO' | 'REPROVADO'
): OperationDecision {
  // 1. ALTA + APROVADO => COMPRA
  if (trend === 'ALTA' && fundamentalStatus === 'APROVADO') {
    return {
      operation: 'COMPRA',
      listedInTracker: true,
      trend,
      fundamentalStatus,
      reason: 'Tendência técnica de alta corroborada por fundamentos sólidos (CNPI-P). Elegível para trava de alta ou compra com plano de trade.',
    };
  }

  // 2. ALTA + REPROVADO => SEM_OPERACAO (Value Trap)
  if (trend === 'ALTA' && fundamentalStatus === 'REPROVADO') {
    return {
      operation: 'SEM_OPERACAO',
      listedInTracker: false,
      trend,
      fundamentalStatus,
      reason: 'Ativo em repique técnico mas reprovado nos fundamentos. Operação bloqueada para evitar armadilha de valor (Value Trap).',
    };
  }

  // 3. LATERAL + APROVADO => IRON_CONDOR
  if (trend === 'LATERAL' && fundamentalStatus === 'APROVADO') {
    return {
      operation: 'IRON_CONDOR',
      listedInTracker: true,
      trend,
      fundamentalStatus,
      reason: 'Consolidação lateral em empresa sólida. Elegível para estrutura Iron Condor #20 se volatilidade e DTE permitirem.',
    };
  }

  // 4. LATERAL + REPROVADO => SEM_OPERACAO
  if (trend === 'LATERAL' && fundamentalStatus === 'REPROVADO') {
    return {
      operation: 'SEM_OPERACAO',
      listedInTracker: false,
      trend,
      fundamentalStatus,
      reason: 'Consolidação lateral em empresa deteriorada. Venda de volatilidade não autorizada pelo risco de cauda.',
    };
  }

  // 5. BAIXA + REPROVADO => VENDA
  if (trend === 'BAIXA' && fundamentalStatus === 'REPROVADO') {
    return {
      operation: 'VENDA',
      listedInTracker: true,
      trend,
      fundamentalStatus,
      reason: 'Tendência de baixa confirmada por deterioração contábil. Elegível para trava de baixa com opções ou venda à vista com alerta de aluguel.',
    };
  }

  // 6. BAIXA + APROVADO => SAIDA_STOP
  if (trend === 'BAIXA' && fundamentalStatus === 'APROVADO') {
    return {
      operation: 'SAIDA_STOP',
      listedInTracker: false,
      trend,
      fundamentalStatus,
      reason: 'Tendência de baixa — saída ou stop de posição existente. Nenhuma estrutura nova autorizada.',
    };
  }

  return {
    operation: 'SEM_OPERACAO',
    listedInTracker: false,
    trend,
    fundamentalStatus,
    reason: 'Sem operação autorizada para os parâmetros atuais.',
  };
}
