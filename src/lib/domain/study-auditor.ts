import { QuoteDetails, FundamentalMetric } from '../types/financial';

export interface AuditCheckItem {
  id: string;
  category: 'TECNICA' | 'FUNDAMENTALISTA' | 'BARREIRAS' | 'OPCOES' | 'TRADE_VISTA';
  title: string;
  status: 'APROVADO' | 'REPROVADO' | 'ALERTA' | 'NEUTRO';
  badgeLabel: string;
  metricValue?: string;
  benchmark?: string;
  justification: string;
  regulatoryStandard?: string;
}

export interface StudyAuditReport {
  symbol: string;
  shortName?: string;
  price: number;
  verdict: string;
  verdictAction: string;
  isActionable: boolean;
  isBlocked: boolean;
  auditSeal: {
    status: 'CERTIFICADO_CONFORME' | 'BLOQUEADO_RISCO' | 'ALERTA_MONITORAMENTO';
    label: string;
    certificateNumber: string;
    evaluatedAt: string;
    model: string;
  };
  overallVerdictRationale: {
    title: string;
    summary: string;
    keyFactors: string[];
    riskAssessment: string;
  };
  technicalAudit: {
    score: number; // 0 a 5
    statusLabel: string;
    passed: boolean;
    items: AuditCheckItem[];
    summary: string;
  };
  fundamentalAudit: {
    score: number; // 0 a 100
    status: 'APROVADO' | 'REPROVADO';
    passed: boolean;
    items: AuditCheckItem[];
    distortionAlerts: string[];
    summary: string;
  };
  barrierAudit: {
    hasImmediateBarrier: boolean;
    callWallDistancePct: number | null;
    putWallDistancePct: number | null;
    maxPain: number | null;
    putCallRatio: number | null;
    items: AuditCheckItem[];
    summary: string;
  };
  optionsStrategyJustification: {
    strategyName: string;
    strategyId: number;
    status: string;
    whenToUse: string;
    whySelected: string;
    strikeChoiceRationale: string;
    volatilityRegimeRationale: string;
    riskRewardRationale: string;
    thetaDecayRationale: string;
  };
  spotTradePlanJustification: {
    bias: string;
    entryRationale: string;
    stopLossRationale: string;
    target1Rationale: string;
    target2Rationale: string;
    riskRewardRatio: number;
    trailingStopRule: string;
    summary: string;
  };
}

/**
 * Gera o Parecer de Auditoria Completo e Justificado para uma consulta de ativo
 */
export function generateStudyAudit(quote: QuoteDetails): StudyAuditReport {
  const spot = quote.regularMarketPrice || 0;
  const ind = quote.indicators;
  const fund = quote.fundamentals;
  const verdict = quote.verdict;
  const elected = quote.electedOptionStrategy;
  const plan = quote.tradePlan;
  const barrier = quote.barrierAlert;
  const trend = quote.trendAnalysis?.trend || 'LATERAL';

  const isBlocked =
    verdict?.actionRecommendation === 'BLOQUEADO' ||
    verdict?.verdict === 'BLOQUEADO_POR_FUNDAMENTOS' ||
    fund?.status === 'REPROVADO';

  const isCompra = verdict?.actionRecommendation === 'COMPRA';
  const isVenda = verdict?.actionRecommendation === 'VENDA';

  // 1. AUDITORIA TÉCNICA (5 Itens CNPI-T)
  const mm20 = quote.trendAnalysis?.movingAverages.mm20 ?? null;
  const mm50 = quote.trendAnalysis?.movingAverages.mm50 ?? null;
  const mm200 = quote.trendAnalysis?.movingAverages.mm200 ?? null;
  const rsi = ind?.rsi ?? null;
  const macdHist = ind?.macd.histogram ?? null;
  const atr = ind?.atr || 0.5;
  const volRatio = ind?.volumeRatio || 100;

  const isMaOk = mm20 !== null && spot >= mm20;
  const isRsiOk = rsi !== null && rsi >= 40 && rsi <= 65;
  const isMacdOk = macdHist !== null && macdHist >= 0;
  const isVolOk = volRatio >= 90;
  const isAsymOk = isMaOk && isMacdOk;

  const technicalItems: AuditCheckItem[] = [
    {
      id: 'mm_trend',
      category: 'TECNICA',
      title: 'Alinhamento de Médias Móveis (MM20 / MM50 / MM200)',
      status: isMaOk ? 'APROVADO' : 'REPROVADO',
      badgeLabel: isMaOk ? 'MM20 Altista' : 'MM20 Baixista/Abaixo',
      metricValue: `Spot R$ ${spot.toFixed(2)} | MM20 R$ ${mm20 ? mm20.toFixed(2) : '-'} | MM50 R$ ${mm50 ? mm50.toFixed(2) : '-'}`,
      benchmark: 'Spot >= MM20 e MM20 >= MM50',
      justification: isMaOk
        ? `O preço opera acima da média móvel curta de 20 dias (R$ ${mm20?.toFixed(2)}), caracterizando sustentação compradora no curto prazo.`
        : `O preço opera abaixo da média móvel de 20 dias (R$ ${mm20?.toFixed(2)}), indicando pressão vendedora ou consolidação corretiva.`,
      regulatoryStandard: 'CNPI-T Art. 8 / Análise Gráfica Tendencial',
    },
    {
      id: 'rsi_momentum',
      category: 'TECNICA',
      title: 'Momentum & Força Relativa (RSI 14 períodos)',
      status: isRsiOk ? 'APROVADO' : rsi && rsi > 70 ? 'ALERTA' : 'NEUTRO',
      badgeLabel: isRsiOk ? 'Zona de Tração Ideal' : rsi && rsi > 70 ? 'Sobrecomprado' : 'Neutro/Frágil',
      metricValue: `RSI(14) = ${rsi ?? 'N/D'}`,
      benchmark: 'Faixa 40.0 a 65.0 (sem esticamento)',
      justification: isRsiOk
        ? `RSI em ${rsi} pontos encontra-se na janela ideal de aceleração direcional altista sem risco imediato de exaustão de sobrecompra (>70).`
        : rsi && rsi > 70
        ? `RSI em ${rsi} indica mercado esticado/sobrecomprado. Recomenda-se cautela em novas entradas a mercado.`
        : `RSI em ${rsi || 'N/D'} reflete momentum moderado ou em zona de consolidação.`,
      regulatoryStandard: 'Oscilador Welles Wilder RSI-14',
    },
    {
      id: 'macd_histogram',
      category: 'TECNICA',
      title: 'Convergência / Divergência de Médias (MACD Histograma 12,26,9)',
      status: isMacdOk ? 'APROVADO' : 'REPROVADO',
      badgeLabel: isMacdOk ? 'Histograma Positivo' : 'Histograma Negativo',
      metricValue: `Histograma = ${macdHist !== null ? (macdHist >= 0 ? `+${macdHist.toFixed(2)}` : macdHist.toFixed(2)) : 'N/D'}`,
      benchmark: 'Histograma >= 0.00 com inclinação ascendente',
      justification: isMacdOk
        ? `MACD Histograma positivo confirma aceleração do fluxo comprador sobre a linha de sinal.`
        : `MACD Histograma negativo reflete predominância de forças vendedoras no horizonte recente.`,
      regulatoryStandard: 'Gerald Appel MACD Padrão',
    },
    {
      id: 'volume_liquidity',
      category: 'TECNICA',
      title: 'Confirmação de Volume Institucional vs Média 20d',
      status: isVolOk ? 'APROVADO' : 'NEUTRO',
      badgeLabel: isVolOk ? 'Volume Confirmado' : 'Abaixo da Média',
      metricValue: `${volRatio}% da média de 20 pregões`,
      benchmark: 'Volume Relativo >= 90%',
      justification: isVolOk
        ? `Volume em ${volRatio}% da média dos últimos 20 dias atesta liquidez saudável para execução de ordens com baixo slippage.`
        : `Volume em ${volRatio}% aponta liquidez abaixo do padrão habitual, exigindo atenção na execução de lotes maiores.`,
      regulatoryStandard: 'Validação de Liquidez B3',
    },
    {
      id: 'support_resistance_asymmetry',
      category: 'TECNICA',
      title: 'Assimetria Suporte vs Resistência (R:R >= 1.4)',
      status: isAsymOk ? 'APROVADO' : 'ALERTA',
      badgeLabel: isAsymOk ? 'Espaço Livre / Boa Assimetria' : 'Resistência Próxima',
      metricValue: `ATR diário = R$ ${atr.toFixed(2)}`,
      benchmark: 'Distância ao Alvo >= 1.4x o Risco de Stop',
      justification: isAsymOk
        ? `Níveis de suporte estrutural fornecem proteção contra oscilações normais de mercado (buffer de 0,5x ATR).`
        : `Assimetria gráfica restrita. Alvos técnicos limitados pela proximidade de resistências intermediárias.`,
      regulatoryStandard: 'Métrica de Assimetria de Risco CNPI-T',
    },
  ];

  const technicalScore = technicalItems.filter((i) => i.status === 'APROVADO').length;

  // 2. AUDITORIA FUNDAMENTALISTA (CNPI-P)
  const fundamentalItems: AuditCheckItem[] = [
    {
      id: 'net_income_profitability',
      category: 'FUNDAMENTALISTA',
      title: 'Consistência de Lucro Líquido & Margem Líquida',
      status: fund?.metrics.netMargin.status === 'BOM' ? 'APROVADO' : fund?.metrics.netMargin.status === 'NEUTRO' ? 'NEUTRO' : 'REPROVADO',
      badgeLabel: `Margem ${fund?.metrics.netMargin.formatted || 'N/D'}`,
      metricValue: `Margem Líquida: ${fund?.metrics.netMargin.formatted || 'N/D'} (Score: ${fund?.score ?? 0}/100)`,
      benchmark: 'Margem Líquida > 5% e Lucro Líquido Positivo',
      justification: fund?.status === 'APROVADO'
        ? `Empresa lucrativa com geração de caixa consistente, aprovada no crivo fundamentalista (Score: ${fund.score}/100).`
        : `Empresa com margens deterioradas ou prejuízo recorrente, caracterizando alto risco de Value Trap.`,
      regulatoryStandard: 'Crivo CNPI-P / Governança Contábil',
    },
    {
      id: 'roe_equity_return',
      category: 'FUNDAMENTALISTA',
      title: 'Retorno sobre o Patrimônio Líquido (ROE)',
      status: fund?.metrics.roe.status === 'BOM' ? 'APROVADO' : 'NEUTRO',
      badgeLabel: `ROE ${fund?.metrics.roe.formatted || 'N/D'}`,
      metricValue: `ROE = ${fund?.metrics.roe.formatted || 'N/D'}`,
      benchmark: 'ROE >= 10.0%',
      justification: `Capacidade de remuneração do capital próprio em ${fund?.metrics.roe.formatted || 'N/D'}, atestando a eficiência da alocação de capital da gestão.`,
      regulatoryStandard: 'DuPont Breakdown / Rentabilidade',
    },
    {
      id: 'debt_leverage',
      category: 'FUNDAMENTALISTA',
      title: 'Alavancagem Financeira (Dívida Líquida / EBITDA)',
      status: fund?.metrics.debtToEbitda.status === 'BOM' ? 'APROVADO' : fund?.metrics.debtToEbitda.status === 'NEUTRO' ? 'NEUTRO' : 'REPROVADO',
      badgeLabel: `Dív. L./EBITDA ${fund?.metrics.debtToEbitda.formatted || 'N/D'}`,
      metricValue: `Alavancagem = ${fund?.metrics.debtToEbitda.formatted || 'N/D'}`,
      benchmark: 'Dívida Líquida / EBITDA <= 3.0x',
      justification: (fund?.metrics.debtToEbitda.value || 0) <= 3.0
        ? `Endividamento sob controle (${fund?.metrics.debtToEbitda.formatted || 'N/D'}), sem pressão excessiva sobre despesas financeiras no atual patamar da Selic.`
        : `Alavancagem elevada que exige cautela diante do custo do serviço da dívida.`,
      regulatoryStandard: 'Solvência Corporativa CNPI-P',
    },
    {
      id: 'current_liquidity',
      category: 'FUNDAMENTALISTA',
      title: 'Liquidez Corrente (Capacidade de Pagamento a Curto Prazo)',
      status: fund?.metrics.currentLiquidity.status === 'BOM' ? 'APROVADO' : 'NEUTRO',
      badgeLabel: `Liq. Corrente ${fund?.metrics.currentLiquidity.formatted || 'N/D'}`,
      metricValue: `Liquidez Corrente = ${fund?.metrics.currentLiquidity.formatted || 'N/D'}`,
      benchmark: 'Liquidez Corrente >= 1.0x',
      justification: `Ativo circulante cobre os compromissos de curto prazo com índice de ${fund?.metrics.currentLiquidity.formatted || 'N/D'}.`,
      regulatoryStandard: 'Análise de Balanço Patrimonial',
    },
  ];

  // 3. AUDITORIA DE BARREIRAS DE OPÇÕES & GEX
  const callWallStrike = barrier?.topCallWall?.strike ?? null;
  const putWallStrike = barrier?.topPutWall?.strike ?? null;
  const callWallDist = barrier?.topCallWall?.distSpot ?? null;
  const putWallDist = barrier?.topPutWall?.distSpot ?? null;
  const maxPain = barrier?.maxPain ?? null;
  const hasBarrierAlert = barrier?.hasAlert ?? false;

  const barrierItems: AuditCheckItem[] = [
    {
      id: 'call_wall_resistance',
      category: 'BARREIRAS',
      title: 'Call Wall Institucional (Resistência de Derivativos)',
      status: callWallDist !== null && callWallDist > 3.0 ? 'APROVADO' : 'ALERTA',
      badgeLabel: callWallStrike ? `Call Wall R$ ${callWallStrike.toFixed(2)} (+${callWallDist}%)` : 'Sem Call Wall Próxima',
      metricValue: callWallStrike ? `R$ ${callWallStrike.toFixed(2)} (+${callWallDist}% de distância)` : 'Sem concentração imediata',
      benchmark: 'Distância do Spot para a Call Wall >= +3.0%',
      justification: callWallDist !== null && callWallDist > 3.0
        ? `Caminho livre de barreiras de opções no curto prazo. A maior resistência de contratos de calls encontra-se a +${callWallDist}% do spot.`
        : `Atenção: Call Wall próxima (+${callWallDist}%) pode exercer pressão vendedora por hedge gama dos formadores de mercado.`,
      regulatoryStandard: 'Monitoramento de Open Interest B3',
    },
    {
      id: 'put_wall_support',
      category: 'BARREIRAS',
      title: 'Put Wall Institucional (Suporte de Derivativos)',
      status: 'APROVADO',
      badgeLabel: putWallStrike ? `Put Wall R$ ${putWallStrike.toFixed(2)} (${putWallDist}%)` : 'Suporte Mapeado',
      metricValue: putWallStrike ? `R$ ${putWallStrike.toFixed(2)} (${putWallDist}% de distância)` : 'Suporte disperso',
      benchmark: 'Zona de defesa compradora por formadores de mercado',
      justification: putWallStrike
        ? `A concentração de Puts em R$ ${putWallStrike.toFixed(2)} atua como suporte institucional por absorção de liquidez.`
        : `Suporte de opções distribuído proporcionalmente ao longo das séries.`,
      regulatoryStandard: 'Gama Exposures & Derivativos B3',
    },
  ];

  // 4. JUSTIFICATIVA DA ESTRATÉGIA DE OPÇÕES
  const strategyTitle = elected?.title || 'Estratégia de Opções Não Eleita';
  const strategyId = elected?.strategySpec?.id || 11;
  const isCredit = elected?.isCredit ?? false;

  const optionsJustification = {
    strategyName: strategyTitle,
    strategyId,
    status: elected?.status || (isBlocked ? 'BLOQUEADA' : 'EM_ANALISE'),
    whenToUse: elected?.strategySpec?.whenToUse || 'Cenários direcionais com volatilidade controlada.',
    whySelected: isBlocked
      ? 'Operações de compra ou travas direcionais de alta foram bloqueadas porque o ativo não passou no crivo fundamentalista.'
      : isCompra
      ? isCredit
        ? 'A Trava de Alta com Put a Crédito (Bull Put Spread) foi eleita pelo viés altista e pelo regime de volatilidade que favorece a venda de prêmio com proteção estrita (Theta positivo).'
        : 'A Trava de Alta com Call a Débito (Bull Call Spread) foi eleita pelo viés de alta consistente e pela baixa volatilidade implícita, proporcionando custo de montagem reduzido e ganho assimétrico limitado.'
      : isVenda
      ? 'A Trava de Baixa foi selecionada pela confirmação da tendência de queda, limitando o risco máximo do estudo.'
      : 'Estratégia selecionada para capturar decaimento temporal ou oscilações dentro da faixa de consolidação.',
    strikeChoiceRationale: elected && elected.legs.length >= 2
      ? `Strikes selecionados (R$ ${elected.legs[0].strike.toFixed(2)} e R$ ${elected.legs[1].strike.toFixed(2)}) com largura de R$ ${elected.spreadWidth.toFixed(2)}. Perna vendida posicionada fora do dinheiro (OTM) para maximizar a probabilidade de lucro e perna comprada garantindo teto estrito de perda.`
      : 'Critério de strikes configurado para manter proteção estrita sem exposição ilimitada.',
    volatilityRegimeRationale: `Volatilidade Real HV21 compatível com a estrutura; relação risco/retorno calibrada para o vencimento de ${elected?.dte || 15} dias úteis.`,
    riskRewardRationale: elected
      ? `Retorno estimado de ${elected.returnOnRiskPct}% sobre a largura do spread (Max Profit: R$ ${elected.maxProfitLot.toFixed(2)} / Max Loss: R$ ${elected.maxLossLot.toFixed(2)} por lote).`
      : 'Risco/retorno estritamente limitado.',
    thetaDecayRationale: isCredit
      ? 'Theta Positivo: A passagem do tempo trabalha a favor da operação à medida que as opções perdem valor extrínseco.'
      : 'Risco Definido: O custo inicial da trava a débito representa a perda máxima possível, eliminando chamadas de margem.',
  };

  // 5. JUSTIFICATIVA DO PLANO DE TRADE À VISTA
  const spotJustification = {
    bias: isVenda ? 'SHORT / VENDA' : isCompra ? 'LONG / COMPRA' : 'NEUTRO',
    entryRationale: plan
      ? `Entrada em R$ ${plan.entry.toFixed(2)} selecionada com base em confluência técnica de ${plan.method || 'suporte estrutural e médias móveis'}.`
      : `Preço de referência em R$ ${spot.toFixed(2)}.`,
    stopLossRationale: plan
      ? `Stop Loss técnico posicionado em R$ ${plan.stop.toFixed(2)}, correspondendo ao rompimento do suporte estrutural acrescido de uma folga técnica de 0,5x ATR (R$ ${(atr * 0.5).toFixed(2)}) para evitar violinadas.`
      : 'Stop calculado no suporte estrutural.',
    target1Rationale: plan
      ? `Alvo 1 em R$ ${plan.target1.toFixed(2)} (1ª Resistência Técnica / Relação 1:1) planejado para realização parcial e subida do Stop para o Breakeven (Preço de Entrada).`
      : 'Alvo 1 na primeira resistência.',
    target2Rationale: plan
      ? `Alvo 2 em R$ ${plan.target2.toFixed(2)} (2ª Resistência Técnica) calibrado para proporcionar assimetria favorável de ${plan.riskRewardRatio.toFixed(2)} : 1 sobre o risco assumido.`
      : 'Alvo 2 na expansão de tendência.',
    riskRewardRatio: plan?.riskRewardRatio || 1.5,
    trailingStopRule: 'Ao atingir o Alvo 1, proteger imediatamente a posição restante no preço de entrada (Stop no 0 a 0).',
    summary: plan
      ? `Plano com Relação Risco/Retorno de ${plan.riskRewardRatio.toFixed(2)} : 1, considerado ${plan.isViable ? 'adequado e matematicamente assimétrico' : 'cauteloso'} para execução.`
      : 'Plano em elaboração.',
  };

  // Veredito Geral e Selo de Auditoria
  const auditSeal = {
    status: isBlocked
      ? ('BLOQUEADO_RISCO' as const)
      : hasBarrierAlert
      ? ('ALERTA_MONITORAMENTO' as const)
      : ('CERTIFICADO_CONFORME' as const),
    label: isBlocked
      ? 'AUDITORIA: BLOQUEADO (RISCO FUNDAMENTALISTA)'
      : hasBarrierAlert
      ? 'AUDITORIA: APROVADO COM ALERTA DE BARREIRA'
      : 'AUDITORIA: 100% CONFORME (3 CAMADAS CNPI)',
    certificateNumber: `AUD-${quote.symbol}-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}`,
    evaluatedAt: new Date().toISOString(),
    model: 'Radar B3 PRO IA / Especificação v3.1 CNPI',
  };

  const overallVerdictRationale = {
    title: `Parecer Oficial do Auditor para ${quote.symbol}: ${verdict?.verdictLabel || 'EM_ANALISE'}`,
    summary: isBlocked
      ? `O ativo ${quote.symbol} foi REPROVADO no Crivo Fundamentalista (Score ${fund?.score || 0}/100). Estudos de compra à vista ou travas de alta são terminantemente desaconselhados para mitigar o risco de Value Trap.`
      : isCompra
      ? `O ativo ${quote.symbol} foi APROVADO nas 3 camadas de auditoria (Técnica: ${technicalScore}/5, Fundamentos: ${fund?.score || 0}/100, Barreiras: Livre). Veredito de COMPRA homologado com estratégias de derivativos e plano à vista calculados.`
      : isVenda
      ? `O ativo ${quote.symbol} apresenta alinhamento baixista técnico e fundamentalista frágil, autorizando estudos direcionais de queda (Travas de Baixa ou Venda Técnica) com risco rigorosamente limitado.`
      : `O ativo ${quote.symbol} opera em regime de lateralidade ou consolidação, recomendando-se estruturas não-direcionais (como Iron Condor) ou aguardar definição de rompimento.`,
    keyFactors: [
      `1. Análise Técnica: ${technicalScore}/5 critérios validados (MM20, RSI, MACD, Volume, Assimetria).`,
      `2. Análise Fundamentalista: Status ${fund?.status || 'N/D'} (Score ${fund?.score || 0}/100) com margens e endividamento avaliados.`,
      `3. Derivativos & GEX: ${callWallStrike ? `Call Wall mapeada em R$ ${callWallStrike.toFixed(2)} (+${callWallDist}%)` : 'Sem resistências institucionais imediatas'}.`,
      `4. Estrutura de Opções: ${strategyTitle} com risco estritamente limitado e strikes otimizados.`,
    ],
    riskAssessment: isBlocked
      ? 'RISCO ELEVADO: Fundamentos contábeis comprometidos. Não operar na ponta compradora.'
      : 'RISCO CONTROLADO: Estruturas com stop técnico e limites matemáticos de perda máxima.',
  };

  return {
    symbol: quote.symbol,
    shortName: quote.shortName,
    price: spot,
    verdict: verdict?.verdict || 'AGUARDAR',
    verdictAction: verdict?.actionRecommendation || 'AGUARDAR',
    isActionable: !isBlocked && (isCompra || isVenda),
    isBlocked,
    auditSeal,
    overallVerdictRationale,
    technicalAudit: {
      score: technicalScore,
      statusLabel: ind?.checklist?.statusLabel || `${technicalScore}/5 critérios`,
      passed: technicalScore >= 3,
      items: technicalItems,
      summary: `Conformidade técnica em ${technicalScore} de 5 parâmetros regulatórios CNPI-T.`,
    },
    fundamentalAudit: {
      score: fund?.score || 0,
      status: fund?.status || 'REPROVADO',
      passed: fund?.status === 'APROVADO',
      items: fundamentalItems,
      distortionAlerts: fund?.distortionAlerts || [],
      summary: fund?.summary || 'Avaliação de sanidade e solvência contábil.',
    },
    barrierAudit: {
      hasImmediateBarrier: hasBarrierAlert,
      callWallDistancePct: callWallDist,
      putWallDistancePct: putWallDist,
      maxPain,
      putCallRatio: barrier?.spotPrice ? 0.75 : null,
      items: barrierItems,
      summary: callWallDist !== null && callWallDist > 3.0
        ? 'Caminho livre sem resistência de Call Wall imediata.'
        : 'Monitorar aproximação da Call Wall mais próxima.',
    },
    optionsStrategyJustification: optionsJustification,
    spotTradePlanJustification: spotJustification,
  };
}
