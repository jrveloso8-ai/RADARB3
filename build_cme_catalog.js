const fs = require('fs');
const path = require('path');

const targetBase = 'C:/projetos antigravity/RADAR-TASYTRADE';

// 1. Catalog of 25 Options Strategies
const catalog25Code = `export interface StrategySpec {
  id: number;
  name: string;
  originalName: string;
  category: 'Direcional' | 'Precisão' | 'Arbitragem';
  bias: 'ALTA' | 'BAIXA' | 'LATERAL' | 'VOLATILIDADE';
  difficulty: 'Iniciante' | 'Intermediário' | 'Avançado';
  whenToUse: string;
  riskReward: string;
  legsDescription: string;
}

export const CME_25_STRATEGIES: StrategySpec[] = [
  { id: 1, name: 'Trava de Alta com Call', originalName: 'Bull Call Spread', category: 'Direcional', bias: 'ALTA', difficulty: 'Iniciante', whenToUse: 'Alta moderada com controle estrito de risco e custo reduzido.', riskReward: 'Risco Limitado / Retorno Limitado', legsDescription: 'Compra Call Strike A + Venda Call Strike B (A < B)' },
  { id: 2, name: 'Trava de Baixa com Put', originalName: 'Bear Put Spread', category: 'Direcional', bias: 'BAIXA', difficulty: 'Iniciante', whenToUse: 'Baixa moderada com proteção contra volatilidade excessiva.', riskReward: 'Risco Limitado / Retorno Limitado', legsDescription: 'Compra Put Strike B + Venda Put Strike A (A < B)' },
  { id: 3, name: 'Compra a Seco de Call', originalName: 'Long Call', category: 'Direcional', bias: 'ALTA', difficulty: 'Iniciante', whenToUse: 'Forte convicção de alta explosiva com risco limitado ao prêmio pago.', riskReward: 'Risco Limitado / Retorno Ilimitado', legsDescription: 'Compra Call OTM/ATM' },
  { id: 4, name: 'Compra a Seco de Put', originalName: 'Long Put', category: 'Direcional', bias: 'BAIXA', difficulty: 'Iniciante', whenToUse: 'Queda acentuada ou hedge direcional da carteira de ações.', riskReward: 'Risco Limitado / Retorno Substancial', legsDescription: 'Compra Put OTM/ATM' },
  { id: 5, name: 'Venda Coberta de Call', originalName: 'Covered Call', category: 'Precisão', bias: 'LATERAL', difficulty: 'Iniciante', whenToUse: 'Geração recorrente de renda em ações em custódia.', riskReward: 'Risco da Ação / Retorno Limitado ao Prêmio', legsDescription: 'Compra Ação + Venda Call OTM' },
  { id: 6, name: 'Trava de Alta com Put a Crédito', originalName: 'Bull Put Spread', category: 'Direcional', bias: 'ALTA', difficulty: 'Intermediário', whenToUse: 'Mercado neutro a altista buscando coleta de prêmio com proteção.', riskReward: 'Risco Limitado à Asa / Retorno ao Crédito', legsDescription: 'Venda Put Strike B + Compra Put Strike A (A < B)' },
  { id: 7, name: 'Trava de Baixa com Call a Crédito', originalName: 'Bear Call Spread', category: 'Direcional', bias: 'BAIXA', difficulty: 'Intermediário', whenToUse: 'Mercado neutro a baixista com coleta de teta positivo.', riskReward: 'Risco Limitado à Asa / Retorno ao Crédito', legsDescription: 'Venda Call Strike A + Compra Call Strike B (A < B)' },
  { id: 8, name: 'Straddle Comprado', originalName: 'Long Straddle', category: 'Arbitragem', bias: 'VOLATILIDADE', difficulty: 'Intermediário', whenToUse: 'Expectativa de forte rompimento direcional antes de balanços ou FOMC.', riskReward: 'Risco Limitado aos Prêmios / Retorno Ilimitado', legsDescription: 'Compra Call ATM + Compra Put ATM' },
  { id: 9, name: 'Strangle Comprado', originalName: 'Long Strangle', category: 'Arbitragem', bias: 'VOLATILIDADE', difficulty: 'Intermediário', whenToUse: 'Explosão de volatilidade com custo menor que o straddle.', riskReward: 'Risco Limitado / Retorno Ilimitado', legsDescription: 'Compra Call OTM + Compra Put OTM' },
  { id: 10, name: 'Borboleta Longa com Calls', originalName: 'Long Call Butterfly', category: 'Precisão', bias: 'LATERAL', difficulty: 'Intermediário', whenToUse: 'Previsão de estagnação de preço em um strike central exato no vencimento.', riskReward: 'Risco Mínimo / Alto Retorno sobre Risco', legsDescription: 'Compra 1 Call A + Venda 2 Calls B + Compra 1 Call C' },
  { id: 11, name: 'Borboleta Longa com Puts', originalName: 'Long Put Butterfly', category: 'Precisão', bias: 'LATERAL', difficulty: 'Intermediário', whenToUse: 'Alvo de preço central via pernas de Put com baixo custo.', riskReward: 'Risco Mínimo / Retorno Elevado no Ponto Central', legsDescription: 'Compra 1 Put A + Venda 2 Puts B + Compra 1 Put C' },
  { id: 12, name: 'Iron Butterfly a Crédito', originalName: 'Iron Butterfly', category: 'Precisão', bias: 'LATERAL', difficulty: 'Intermediário', whenToUse: 'Coleta de alto prêmio com expectativa de baixa volatilidade.', riskReward: 'Risco Limitado / Crédito Retido no Strike Médio', legsDescription: 'Compra Put A + Venda Put B + Venda Call B + Compra Call C' },
  { id: 13, name: 'Condor Longo com Calls', originalName: 'Long Call Condor', category: 'Precisão', bias: 'LATERAL', difficulty: 'Intermediário', whenToUse: 'Túnel de consolidação com 4 strikes equidistantes.', riskReward: 'Risco Limitado / Retorno Máximo no Platô', legsDescription: 'Compra Call A + Venda Call B + Venda Call C + Compra Call D' },
  { id: 14, name: 'Trava de Linha / Calendário', originalName: 'Calendar Spread', category: 'Arbitragem', bias: 'LATERAL', difficulty: 'Avançado', whenToUse: 'Exploração do decaimento acelerado de teta da ponta curta vs longa.', riskReward: 'Risco Limitado ao Débito / Retorno no Decay', legsDescription: 'Venda Opção Vencimento Curto + Compra Opção Longa' },
  { id: 15, name: 'Trava Diagonal', originalName: 'Diagonal Spread', category: 'Arbitragem', bias: 'Direcional', difficulty: 'Avançado', whenToUse: 'Substituto dinâmico de venda coberta com custo de capital reduzido.', riskReward: 'Risco Limitado / Renda Recorrente', legsDescription: 'Venda Opção Curta OTM + Compra Opção Longa ITM' },
  { id: 16, name: 'Collar Protetor', originalName: 'Collar Protection', category: 'Precisão', bias: 'LATERAL', difficulty: 'Iniciante', whenToUse: 'Blindagem total de uma posição em ações a custo zero ou mínimo.', riskReward: 'Perda Bloqueada / Ganho Limitado à Call', legsDescription: 'Ação em Carteira + Compra Put OTM + Venda Call OTM' },
  { id: 17, name: 'Ratio Call Spread', originalName: 'Call Ratio Spread', category: 'Direcional', bias: 'ALTA', difficulty: 'Avançado', whenToUse: 'Alta moderada até o strike vendido com custo zero ou crédito.', riskReward: 'Risco Superior / Lucro no Strike Vendido', legsDescription: 'Compra 1 Call A + Venda 2 Calls B (A < B)' },
  { id: 18, name: 'Ratio Put Spread', originalName: 'Put Ratio Spread', category: 'Direcional', bias: 'BAIXA', difficulty: 'Avançado', whenToUse: 'Queda moderada com financiamento da perna longa.', riskReward: 'Risco Inferior / Lucro no Strike Vendido', legsDescription: 'Compra 1 Put B + Venda 2 Puts A (A < B)' },
  { id: 19, name: 'Seagull de Alta', originalName: 'Bull Seagull', category: 'Precisão', bias: 'ALTA', difficulty: 'Avançado', whenToUse: 'Financiamento de trava de alta com venda de put fora do dinheiro.', riskReward: 'Risco na Put Vendida / Trava Gratuita', legsDescription: 'Venda Put OTM + Compra Call ATM + Venda Call OTM' },
  { id: 20, name: 'Iron Condor a Crédito', originalName: 'Iron Condor', category: 'Precisão', bias: 'LATERAL', difficulty: 'Intermediário', whenToUse: 'Estratégia rainha da renda com opções: lucrar com a passagem do tempo enquanto a ação oscilar dentro do túnel.', riskReward: 'Risco Limitado às Asas / Retorno 100% do Crédito', legsDescription: 'Compra Put A + Venda Put B + Venda Call C + Compra Call D' },
  { id: 21, name: 'Reverse Iron Condor', originalName: 'Reverse Iron Condor', category: 'Arbitragem', bias: 'VOLATILIDADE', difficulty: 'Intermediário', whenToUse: 'Forte rompimento para qualquer um dos lados fora do túnel.', riskReward: 'Risco Limitado ao Débito / Retorno no Rompimento', legsDescription: 'Venda Put A + Compra Put B + Compra Call C + Venda Call D' },
  { id: 22, name: 'Jade Lizard', originalName: 'Jade Lizard', category: 'Precisão', bias: 'LATERAL', difficulty: 'Avançado', whenToUse: 'Coleta de crédito sem risco de alta (crédito maior que a asa da call).', riskReward: 'Zero Risco na Alta / Risco Definido na Put', legsDescription: 'Venda Put OTM + Venda Call OTM + Compra Call OTM+' },
  { id: 23, name: 'Big Lizard', originalName: 'Big Lizard', category: 'Precisão', bias: 'LATERAL', difficulty: 'Avançado', whenToUse: 'Versão ATM do Jade Lizard com maior crédito coletado.', riskReward: 'Zero Risco na Alta / Ponto de Equilíbrio Amplo', legsDescription: 'Venda Straddle ATM + Compra Call OTM' },
  { id: 24, name: 'Guts Comprado', originalName: 'Long Guts', category: 'Arbitragem', bias: 'VOLATILIDADE', difficulty: 'Avançado', whenToUse: 'Explosão de volatilidade com opções profundamente dentro do dinheiro.', riskReward: 'Risco do Valor Extrínseco / Retorno no Delta', legsDescription: 'Compra Call ITM + Compra Put ITM' },
  { id: 25, name: 'Box Spread de Arbitragem', originalName: 'Box Spread Arbitrage', category: 'Arbitragem', bias: 'LATERAL', difficulty: 'Avançado', whenToUse: 'Empréstimo sintético ou arbitragem de taxas de juros no mercado.', riskReward: 'Risco Zero (Sintético Livre de Risco)', legsDescription: 'Bull Call Spread + Bear Put Spread nos mesmos strikes' },
];
`;

fs.writeFileSync(path.join(targetBase, 'src/lib/domain/cme-catalog.ts'), catalog25Code.trim(), 'utf8');
console.log('Created cme-catalog.ts');
