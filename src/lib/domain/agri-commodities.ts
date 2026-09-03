/**
 * MOTOR QUANTITATIVO DE COMMODITIES AGRÍCOLAS (B3 / CBOT)
 * Radar B3 Pro IA — Módulo de Análise Agro & Derivativos
 *
 * Cobre:
 * 1. Milho Futuro (CCM na B3 / ZC na CBOT)
 * 2. Boi Gordo Futuro (BGI na B3 / LE na CME)
 * 3. Soja Futuro (SOJA na B3 / ZS na CBOT)
 * 4. Relação de Troca Boi Gordo vs Milho (@ / sacas)
 * 5. Sazonalidade de Safra / Entressafra
 * 6. Mapeamento de Impacto em Ações do Agronegócio (SLCE3, AGRO3, BEEF3, JBSS3, etc.)
 */

export type AgriCommodityId = 'CCM' | 'BGI' | 'SOJA';

export interface AgriSeasonality {
  currentMonth: number; // 1 a 12
  monthName: string;
  seasonPhase: 'SAFRA_COLHEITA' | 'ENTRESSAFRA' | 'WEATHER_MARKET' | 'PLANTIO' | 'NEUTRO';
  bias: 'ALTA' | 'BAIXA' | 'LATERAL';
  description: string;
}

export interface AgriExchangeRatio {
  boiPriceArroba: number; // Ex: R$ 235.00 por arroba (@)
  milhoPriceSaca: number; // Ex: R$ 58.00 por saca (60kg)
  ratio: number; // sacas de milho por arroba de boi (ex: 235 / 58 = 4.05)
  historicalAverage: number; // Média de 5.2 sacas/@
  status: 'FAVORAVEL_CONFINADOR' | 'NEUTRO' | 'DESFAVORAVEL_CONFINADOR';
  interpretation: string;
}

export interface AgriCommodityAnalysis {
  id: AgriCommodityId;
  name: string;
  tickerB3: string;
  tickerGlobal: string;
  unit: string;
  price: number;
  changePct: number;
  trend: 'ALTA' | 'BAIXA' | 'LATERAL';
  seasonality: AgriSeasonality;
  exchangeRatio?: AgriExchangeRatio;
  correlatedStocks: {
    symbol: string;
    name: string;
    correlationType: 'DIRETA' | 'INVERSA';
    rationale: string;
  }[];
  tradeOpportunity?: {
    setupName: string;
    bias: 'COMPRA' | 'VENDA' | 'AGUARDAR';
    conviction: 'ALTA' | 'MÉDIA' | 'BAIXA';
    rationale: string;
    targetPrice?: number;
    stopLoss?: number;
  };
}

/**
 * Retorna a análise de sazonalidade típica do agronegócio para o mês de referência
 */
export function getAgriSeasonality(commodity: AgriCommodityId, date: Date = new Date()): AgriSeasonality {
  const month = date.getMonth() + 1; // 1 a 12
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];
  const monthName = monthNames[month - 1];

  if (commodity === 'CCM') {
    // Milho: Colheita da 2ª safra (junho a agosto) gera pressão vendedora. Entressafra (nov a mar) gera pressão compradora.
    if (month >= 6 && month <= 8) {
      return {
        currentMonth: month,
        monthName,
        seasonPhase: 'SAFRA_COLHEITA',
        bias: 'BAIXA',
        description: 'Pico da colheita da 2ª safra brasileira (safrinha). Pressão sazonal negativa sobre as cotações físicas e futuros.',
      };
    } else if (month >= 11 || month <= 3) {
      return {
        currentMonth: month,
        monthName,
        seasonPhase: 'ENTRESSAFRA',
        bias: 'ALTA',
        description: 'Entressafra brasileira de milho. Escassez relativa de oferta e suporte nos preços de curto/médio prazo.',
      };
    }
    return {
      currentMonth: month,
      monthName,
      seasonPhase: 'PLANTIO',
      bias: 'LATERAL',
      description: 'Fase de desenvolvimento e plantio da safra. Sensibilidade a previsões de chuvas e clima.',
    };
  }

  if (commodity === 'BGI') {
    // Boi Gordo: Safra de pasto (jan a maio - mais animais, preços em queda). Entressafra de pasto (julho a nov - escassez, preços em alta).
    if (month >= 7 && month <= 11) {
      return {
        currentMonth: month,
        monthName,
        seasonPhase: 'ENTRESSAFRA',
        bias: 'ALTA',
        description: 'Entressafra de pastagem no Centro-Sul. Menor oferta de animais terminados, sustentando preços históricos de arroba.',
      };
    } else if (month >= 2 && month <= 5) {
      return {
        currentMonth: month,
        monthName,
        seasonPhase: 'SAFRA_COLHEITA',
        bias: 'BAIXA',
        description: 'Safra das águas / descarte de pasto. Oferta abundante de gado terminado, favorecendo margem de frigoríficos e pressão no BGI.',
      };
    }
    return {
      currentMonth: month,
      monthName,
      seasonPhase: 'NEUTRO',
      bias: 'LATERAL',
      description: 'Período de transição climática entre pastagem e confinamento.',
    };
  }

  // SOJA
  if (month >= 1 && month <= 4) {
    return {
      currentMonth: month,
      monthName,
      seasonPhase: 'SAFRA_COLHEITA',
      bias: 'BAIXA',
      description: 'Colheita e escoamento massivo da safra brasileira de soja nos portos de Santos e Paranaguá.',
    };
  } else if (month >= 6 && month <= 8) {
    return {
      currentMonth: month,
      monthName,
      seasonPhase: 'WEATHER_MARKET',
      bias: 'LATERAL',
      description: 'Mercado de clima (Weather Market) no Meio-Oeste americano (US Midwest). Alta volatilidade em Chicago (CBOT).',
    };
  }

  return {
    currentMonth: month,
    monthName,
    seasonPhase: 'PLANTIO',
    bias: 'LATERAL',
    description: 'Fase de plantio e comercialização antecipada via contratos a termo e Barter.',
  };
}

/**
 * Calcula a Relação de Troca Boi Gordo vs Milho (@ / sacas de 60kg)
 * Indicador-chave para a pecuária de corte e indústria de proteína animal.
 */
export function calculateBoiMilhoRatio(
  boiPriceArroba: number,
  milhoPriceSaca: number
): AgriExchangeRatio {
  const safeBoi = boiPriceArroba > 0 ? boiPriceArroba : 230;
  const safeMilho = milhoPriceSaca > 0 ? milhoPriceSaca : 55;
  const ratio = Number((safeBoi / safeMilho).toFixed(2));
  const historicalAverage = 5.2;

  if (ratio >= 5.8) {
    return {
      boiPriceArroba: safeBoi,
      milhoPriceSaca: safeMilho,
      ratio,
      historicalAverage,
      status: 'FAVORAVEL_CONFINADOR',
      interpretation: `Relação de troca excelente (${ratio} sacas/@ vs média 5.2). 1 arroba de boi compra muitas sacas de milho, incentivando o confinamento e consumo de ração.`,
    };
  }

  if (ratio <= 4.2) {
    return {
      boiPriceArroba: safeBoi,
      milhoPriceSaca: safeMilho,
      ratio,
      historicalAverage,
      status: 'DESFAVORAVEL_CONFINADOR',
      interpretation: `Relação de troca desfavorável (${ratio} sacas/@ vs média 5.2). Milho caro comprime as margens do pecuarista, desestimulando a engorda intensiva.`,
    };
  }

  return {
    boiPriceArroba: safeBoi,
    milhoPriceSaca: safeMilho,
    ratio,
    historicalAverage,
    status: 'NEUTRO',
    interpretation: `Relação de troca equilibrada em ${ratio} sacas/@, próxima da média histórica do agronegócio.`,
  };
}

/**
 * Gera a análise completa das 3 principais commodities agrícolas da B3
 */
export function analyzeAgriCommodities(quotes: {
  ccmPrice?: number;
  ccmChange?: number;
  bgiPrice?: number;
  bgiChange?: number;
  sojaPrice?: number;
  sojaChange?: number;
  referenceDate?: Date;
}): AgriCommodityAnalysis[] {
  const date = quotes.referenceDate || new Date();

  // 1. Milho Futuro (CCM)
  const ccmPrice = quotes.ccmPrice || 62.50;
  const ccmChange = quotes.ccmChange || 0.45;
  const ccmSeasonality = getAgriSeasonality('CCM', date);
  const ccmTrend = ccmChange > 0.3 ? 'ALTA' : ccmChange < -0.3 ? 'BAIXA' : 'LATERAL';

  const milhoAnalysis: AgriCommodityAnalysis = {
    id: 'CCM',
    name: 'Milho Futuro B3 (CCM)',
    tickerB3: 'CCMFUT',
    tickerGlobal: 'ZC=F',
    unit: 'R$ / saca 60kg',
    price: ccmPrice,
    changePct: Number(ccmChange.toFixed(2)),
    trend: ccmTrend,
    seasonality: ccmSeasonality,
    correlatedStocks: [
      {
        symbol: 'SLCE3',
        name: 'SLC Agrícola',
        correlationType: 'DIRETA',
        rationale: 'Uma das maiores produtoras de grãos do país. Preço do milho em alta eleva receita bruta da safrinha.',
      },
      {
        symbol: 'BRFS3',
        name: 'BRF S.A.',
        correlationType: 'INVERSA',
        rationale: 'Milho é o principal insumo de custo para ração de aves e suínos. Preço alto do milho comprime margem operacional.',
      },
      {
        symbol: 'SMTO3',
        name: 'São Martinho',
        correlationType: 'DIRETA',
        rationale: 'Produção de etanol de milho em expansão no Centro-Oeste.',
      },
    ],
    tradeOpportunity: {
      setupName: ccmTrend === 'ALTA' ? 'Rompimento de Pivô & Entressafra' : 'Arbitragem Paridade Exportação',
      bias: ccmSeasonality.bias === 'ALTA' ? 'COMPRA' : 'AGUARDAR',
      conviction: 'MÉDIA',
      rationale: `${ccmSeasonality.description} Cotação atual a R$ ${ccmPrice.toFixed(2)}/saca.`,
      targetPrice: Number((ccmPrice * 1.08).toFixed(2)),
      stopLoss: Number((ccmPrice * 0.95).toFixed(2)),
    },
  };

  // 2. Boi Gordo Futuro (BGI)
  const bgiPrice = quotes.bgiPrice || 242.00;
  const bgiChange = quotes.bgiChange || 1.15;
  const bgiSeasonality = getAgriSeasonality('BGI', date);
  const bgiTrend = bgiChange > 0.3 ? 'ALTA' : bgiChange < -0.3 ? 'BAIXA' : 'LATERAL';
  const exchangeRatio = calculateBoiMilhoRatio(bgiPrice, ccmPrice);

  const boiAnalysis: AgriCommodityAnalysis = {
    id: 'BGI',
    name: 'Boi Gordo Futuro B3 (BGI)',
    tickerB3: 'BGIFUT',
    tickerGlobal: 'LE=F',
    unit: 'R$ / @ (arroba 15kg)',
    price: bgiPrice,
    changePct: Number(bgiChange.toFixed(2)),
    trend: bgiTrend,
    seasonality: bgiSeasonality,
    exchangeRatio,
    correlatedStocks: [
      {
        symbol: 'BEEF3',
        name: 'Minerva Foods',
        correlationType: 'INVERSA',
        rationale: 'Frigorífico exportador de carne bovina. Arroba mais barata expande o spread de abate (Gross Margin).',
      },
      {
        symbol: 'JBSS3',
        name: 'JBS S.A.',
        correlationType: 'DIRETA',
        rationale: 'Diversificação global em proteína animal e forte poder de precificação de carne no mercado internacional.',
      },
      {
        symbol: 'MRFG3',
        name: 'Marfrig Global Foods',
        correlationType: 'INVERSA',
        rationale: 'Sensibilidade a custos de gado na operação de carne bovina na América do Sul.',
      },
    ],
    tradeOpportunity: {
      setupName: bgiSeasonality.seasonPhase === 'ENTRESSAFRA' ? 'Alta de Entressafra & Retenção de Fêmeas' : 'Pressão de Safra de Pasto',
      bias: bgiSeasonality.bias === 'ALTA' ? 'COMPRA' : 'AGUARDAR',
      conviction: exchangeRatio.status === 'FAVORAVEL_CONFINADOR' ? 'ALTA' : 'MÉDIA',
      rationale: `${bgiSeasonality.description} Relação de troca em ${exchangeRatio.ratio} sacas/@.`,
      targetPrice: Number((bgiPrice * 1.07).toFixed(2)),
      stopLoss: Number((bgiPrice * 0.96).toFixed(2)),
    },
  };

  // 3. Soja Futuro (SOJA / CBOT)
  const sojaPrice = quotes.sojaPrice || 132.80;
  const sojaChange = quotes.sojaChange || -0.65;
  const sojaSeasonality = getAgriSeasonality('SOJA', date);
  const sojaTrend = sojaChange > 0.3 ? 'ALTA' : sojaChange < -0.3 ? 'BAIXA' : 'LATERAL';

  const sojaAnalysis: AgriCommodityAnalysis = {
    id: 'SOJA',
    name: 'Soja Futuro (SOJA / CBOT)',
    tickerB3: 'SJC / CBOT',
    tickerGlobal: 'ZS=F',
    unit: 'R$ / saca 60kg Porto',
    price: sojaPrice,
    changePct: Number(sojaChange.toFixed(2)),
    trend: sojaTrend,
    seasonality: sojaSeasonality,
    correlatedStocks: [
      {
        symbol: 'SLCE3',
        name: 'SLC Agrícola',
        correlationType: 'DIRETA',
        rationale: 'Soja é a principal cultura e geradora de EBITDA da companhia.',
      },
      {
        symbol: 'AGRO3',
        name: 'BrasilAgro',
        correlationType: 'DIRETA',
        rationale: 'Produção de grãos e valorização imobiliária das terras agrícolas correlacionada à rentabilidade da soja.',
      },
      {
        symbol: 'RAIZ4',
        name: 'Raízen',
        correlationType: 'DIRETA',
        rationale: 'Distribuição e logística agroindustrial em terminais portuários.',
      },
    ],
    tradeOpportunity: {
      setupName: 'Hedge Cambial & Prêmio de Exportação',
      bias: sojaSeasonality.bias === 'ALTA' ? 'COMPRA' : 'AGUARDAR',
      conviction: 'MÉDIA',
      rationale: `${sojaSeasonality.description} Cotação base R$ ${sojaPrice.toFixed(2)}/saca.`,
      targetPrice: Number((sojaPrice * 1.06).toFixed(2)),
      stopLoss: Number((sojaPrice * 0.96).toFixed(2)),
    },
  };

  return [milhoAnalysis, boiAnalysis, sojaAnalysis];
}
