/**
 * Configuração Macroeconômica Centralizada
 * Fonte única de verdade para taxa livre de risco e parâmetros macroeconômicos do Radar B3.
 * 
 * // ATUALIZAR MANUALMENTE A CADA REUNIÃO DO COPOM
 */

export const MACRO_CONFIG = {
  // Selic Meta anualizada (em decimal: 0.1075 = 10.75% a.a.)
  // ATUALIZAR MANUALMENTE A CADA REUNIÃO DO COPOM
  riskFreeRate: 0.1075,
  
  // Taxa formatada em percentual para UI
  riskFreeRatePercent: 10.75,
  
  // Data de referência / Reunião do Copom
  copomReference: 'Copom Dez/2024 (Meta 10.75% a.a.)',
  updatedAt: '2024-12-11',
  
  // Rótulo para badges e displays
  riskFreeRateLabel: 'SELIC 10.75%',
} as const;

export function getRiskFreeRate(): number {
  return MACRO_CONFIG.riskFreeRate;
}
