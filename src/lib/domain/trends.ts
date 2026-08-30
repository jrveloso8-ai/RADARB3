import {
  ConsolidatedVerdictResult,
  ConsolidatedVerdictType,
  HistoricalPrice,
  MovingAverages,
  OptionBarrierAlert,
  TrendAnalysisResult,
  TrendType,
} from '../types/financial';

/**
 * Calcula a Média Móvel Aritmética (SMA) para um período fixo.
 */
export function calculateSMA(prices: number[], period: number): number | null {
  if (!prices || prices.length < period || period <= 0) {
    return null;
  }
  const slice = prices.slice(prices.length - period);
  const sum = slice.reduce((acc, curr) => acc + curr, 0);
  return Number((sum / period).toFixed(2));
}

/**
 * Calcula séries históricas completas de SMA para renderização de gráficos.
 */
export function calculateHistoricalSMA(
  historicalData: HistoricalPrice[],
  period: number
): (number | null)[] {
  const closes = historicalData.map((h) => h.close);
  return closes.map((_, index) => {
    if (index + 1 < period) {
      return null;
    }
    const windowSlice = closes.slice(index + 1 - period, index + 1);
    const sum = windowSlice.reduce((acc, val) => acc + val, 0);
    return Number((sum / period).toFixed(2));
  });
}

/**
 * Classifica a tendência com base na Teoria de Dow e hierarquia de Médias Móveis (MM20, MM50 e MM200).
 */
export function classifyTrend(
  currentPrice: number,
  mm20: number | null,
  mm50: number | null,
  mm200: number | null
): TrendType {
  if (mm20 === null || mm50 === null) {
    return 'LATERAL';
  }

  // Com MM200 disponível:
  if (mm200 !== null) {
    // Alinhamento clássico de alta: Preço > MM20 > MM50 > MM200
    if (currentPrice > mm20 && mm20 > mm50 && mm50 > mm200) {
      return 'ALTA';
    }
    // Alinhamento clássico de baixa: Preço < MM20 < MM50 < MM200
    if (currentPrice < mm20 && mm20 < mm50 && mm50 < mm200) {
      return 'BAIXA';
    }
    // Preço e médias de curto alinhadas para cima acima da MM200
    if (currentPrice > mm200 && mm20 > mm50 && currentPrice > mm20) {
      return 'ALTA';
    }
    // Preço e médias de curto alinhadas para baixo abaixo da MM200
    if (currentPrice < mm200 && mm20 < mm50 && currentPrice < mm20) {
      return 'BAIXA';
    }
    return 'LATERAL';
  }

  // Sem histórico de 200 períodos:
  if (currentPrice > mm20 && mm20 > mm50) {
    return 'ALTA';
  }
  if (currentPrice < mm20 && mm20 < mm50) {
    return 'BAIXA';
  }

  return 'LATERAL';
}

/**
 * Analisa a tendência de um ativo a partir de seu histórico diário de 12 meses.
 */
export function analyzeAssetTrend(
  symbol: string,
  currentPrice: number,
  changePercent: number,
  historicalData: HistoricalPrice[],
  shortName?: string
): TrendAnalysisResult {
  const closes = (historicalData || []).map((item) => item.close);

  const mm20 = calculateSMA(closes, 20);
  const mm50 = calculateSMA(closes, 50);
  const mm200 = calculateSMA(closes, 200);

  const trend = classifyTrend(currentPrice, mm20, mm50, mm200);

  let summary = '';
  switch (trend) {
    case 'ALTA':
      summary = `Tendência de Alta confirmada: Preço (R$ ${currentPrice.toFixed(2)}) e Médias alinhadas positivamente (MM20: ${mm20 || '-'} > MM50: ${mm50 || '-'} > MM200: ${mm200 || '-'}).`;
      break;
    case 'BAIXA':
      summary = `Tendência de Baixa: Preço (R$ ${currentPrice.toFixed(2)}) operando abaixo das médias móveis de referência (MM20: ${mm20 || '-'} < MM50: ${mm50 || '-'} < MM200: ${mm200 || '-'}).`;
      break;
    case 'LATERAL':
      summary = `Consolidação / Lateralização: Médias móveis sem alinhamento direcional estrito (MM20: ${mm20 || '-'}, MM50: ${mm50 || '-'}, MM200: ${mm200 || '-'}).`;
      break;
  }

  return {
    symbol,
    shortName,
    currentPrice,
    changePercent,
    trend,
    movingAverages: {
      mm20,
      mm50,
      mm200,
    },
    historicalCount: closes.length,
    summary,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Motor de Decisão Integrado CNPI: Fundamentos + Técnico + Barreiras de Opções
 */
export function generateConsolidatedVerdict(
  symbol: string,
  currentPrice: number,
  technicalTrend: TrendType,
  fundamentalStatus: 'APROVADO' | 'REPROVADO',
  barrierAlert?: OptionBarrierAlert,
  shortName?: string,
  volatilityRegime?: { regime?: string; isCreditFavorable?: boolean } | null
): ConsolidatedVerdictResult {
  let verdict: ConsolidatedVerdictType;
  let verdictLabel: string;
  let actionRecommendation: 'COMPRA' | 'VENDA' | 'AGUARDAR' | 'BLOQUEADO' | 'IRON_CONDOR';
  const rationale: string[] = [];

  // Regra 1: VENDA Técnica é soberana (qualquer ativo com tendência de baixa recebe recomendação de venda)
  if (technicalTrend === 'BAIXA') {
    if (barrierAlert && barrierAlert.topPutWall && barrierAlert.topPutWall.isImminent) {
      verdict = 'VENDA_COM_ALERTA_SUPORTE';
      verdictLabel = 'VENDA C/ ALERTA DE SUPORTE DE PUT';
      actionRecommendation = 'VENDA';
      rationale.push('Tendência técnica de baixa acionada.');
      rationale.push(
        `Alerta de Opções: Preço próximo da Put Wall em R$ ${barrierAlert.topPutWall.strike.toFixed(2)} (${barrierAlert.topPutWall.distSpot}% do Spot). Zona de suporte institucional e possível absorção.`
      );
    } else {
      verdict = 'VENDA_FORTE';
      verdictLabel = 'RECOMENDAÇÃO DE VENDA';
      actionRecommendation = 'VENDA';
      rationale.push('Alinhamento técnico de baixa (MM20 < MM50 < MM200). Saída de posição ou stop sugerido.');
    }
  }
  // Regra 2: Se reprovado nos fundamentos, compras são terminantemente bloqueadas
  else if (fundamentalStatus === 'REPROVADO') {
    verdict = 'BLOQUEADO_POR_FUNDAMENTOS';
    verdictLabel = 'BLOQUEADO (REPROVADO PELOS FUNDAMENTOS)';
    actionRecommendation = 'BLOQUEADO';
    rationale.push('Empresa reprovada no crivo fundamentalista CNPI-P (prejuízo recorrente ou superendividamento).');
    rationale.push('Compras são desaconselhadas mesmo em repiques técnicos para evitar armadilhas de valor (Value Trap).');
  }
  // Regra 3: Se aprovado nos fundamentos, aplicar decisão técnica e barreiras de opções
  else {
    if (technicalTrend === 'ALTA') {
      if (barrierAlert && barrierAlert.topCallWall && barrierAlert.topCallWall.isImminent) {
        verdict = 'COMPRA_COM_ALERTA_BARREIRA';
        verdictLabel = 'COMPRA C/ ALERTA DE BARREIRA DE CALL';
        actionRecommendation = 'COMPRA';
        rationale.push('Empresa com excelentes fundamentos e gráfico em tendência de alta.');
        rationale.push(
          `Alerta de Opções: Preço a apenas ${barrierAlert.topCallWall.distSpot}% da Call Wall institucional (R$ ${barrierAlert.topCallWall.strike.toFixed(2)}). Risco de resistência e desaceleração temporária pelos lançadores.`
        );
      } else {
        verdict = 'COMPRA_FORTE';
        verdictLabel = 'RECOMENDAÇÃO DE COMPRA';
        actionRecommendation = 'COMPRA';
        rationale.push('Fundamentos sólidos (CNPI-P) e gráfico alinhado em tendência de alta (MM20 > MM50 > MM200).');
        rationale.push('Caminho livre sem barreiras imediatas de opções no vencimento corrente.');
      }
    } else {
      // Cenário Lateral com Fundamentos Aprovados:
      // Se a volatilidade estiver comprimida (Squeeze), bloqueia o Iron Condor e sugere aguardar
      if (volatilityRegime && volatilityRegime.regime === 'MUITO_BAIXA') {
        verdict = 'LATERAL_AGUARDAR';
        verdictLabel = 'LATERAL (AGUARDAR / VOL COMPRIMIDA)';
        actionRecommendation = 'AGUARDAR';
        rationale.push('Fundamentos de alta qualidade, porém preço em consolidação com volatilidade implícita comprimida (Squeeze).');
        rationale.push('Risco de rompimento direcional violento (Volatility Breakout). Venda de crédito de Iron Condor bloqueada no momento.');
      } else {
        // Volatilidade moderada/alta ou com barreiras ativas: Eleger Iron Condor a Crédito
        verdict = 'LATERAL_IRON_CONDOR';
        verdictLabel = 'LATERAL (IRON CONDOR / RENDA C/ OPÇÕES)';
        actionRecommendation = 'IRON_CONDOR';
        rationale.push('Empresa sólida e preço consolidando em faixa lateral delimitada.');
        rationale.push('Cenário técnico e quantitativo ideal para a Estratégia CME #20: Iron Condor a Crédito (lucro com decaimento temporal Theta e estabilidade de preço).');
      }
    }
  }

  return {
    symbol,
    shortName,
    currentPrice,
    verdict,
    verdictLabel,
    actionRecommendation,
    fundamentalStatus,
    technicalTrend,
    barrierAlert,
    rationale,
    updatedAt: new Date().toISOString(),
  };
}
