/**
 * PROVENIÊNCIA DE DADOS (DATA PROVENANCE)
 * Radar B3 Pro IA - Cerca Estrutural de Integridade Financeira
 *
 * Princípio Fundamental:
 * Este sistema exibe métricas e valores financeiros que podem subsidiar decisões de capital real.
 * Todo número exibido deve ter sua origem categorizada e comunicada honestamente ao usuário.
 * Valores fixos ou heurísticos nunca podem ser disfarçados como medições oficiais ou ao vivo.
 */

/**
 * Classificação rigorosa da proveniência de qualquer dado financeiro no sistema:
 *
 * - 'MEDIDO':
 *   Dado coletado diretamente de fonte primária ou feed oficial de mercado (ex.: último preço
 *   negociado na B3, volume real do pregão via BRAPI/B3, prêmio real do book de opções, cotação
 *   oficial do ativo).
 *
 * - 'DERIVADO':
 *   Dado calculado deterministicamente a partir de dados medidos por fórmula matemática formal
 *   sem parâmetros heurísticos inventados (ex.: variação percentual = (P_atual - P_anterior) / P_anterior,
 *   médias móveis SMA/EMA sobre histórico real, payoff de travas verticais, Black-Scholes sobre variáveis
 *   conhecidas e reais).
 *
 * - 'ESTIMADO':
 *   Dado gerado por heurísticas, aproximações estatísticas, proxies ou modelos com premissas
 *   (ex.: IV aproximada por mediana ponderada, volatilidade histórica como proxy de IV quando a IV ATM
 *   não está disponível, cotação estimada por fechamento anterior + variação internacional).
 *   DEVE ser explicitamente rotulado na interface como estimativa '(est.)'.
 *
 * - 'SIMULADO':
 *   Dado sintético, paramétrico ou estático para fins didáticos, teste de estresse ou ordenação
 *   de regras fixas (ex.: ranking/prioridade estática de categorias de regras, curvas teóricas de payoff).
 *   NUNCA deve ser apresentado como medida ao vivo ou de mercado real; rotulado como '(ref.)'.
 *
 * - 'INDISPONIVEL':
 *   Dado ausente por falta de liquidez, falha de feed, timeout de API ou histórico insuficiente.
 *   NUNCA deve ser substituído por um literal "plausível" ou seguro. DEVE renderizar sempre como 'N/D'
 *   ou com isViable: false / bloqueio de operação.
 */
export type DataProvenance = 'MEDIDO' | 'DERIVADO' | 'ESTIMADO' | 'SIMULADO' | 'INDISPONIVEL';

export interface ProvenanceValue<T = number> {
  value: T | null;
  provenance: DataProvenance;
  source?: string;
  asOf?: string;
  note?: string;
}
