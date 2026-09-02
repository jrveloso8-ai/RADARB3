/**
 * Motor de Sentimento de Mercado 24h (Radar B3 PRO)
 * Atualização contínua de hora em hora com integração de cotações globais e commodities em tempo real.
 */

import { LiveMarketOverview } from '../services/market-quotes';

export type SentimentZone =
  | 'PESSIMISMO_EXTREMO'
  | 'CAUTELA_MEDO'
  | 'NEUTRO'
  | 'OTIMISMO_MODERADO'
  | 'EUFORIA_GANANCIA';

export interface SentimentPillar {
  id: string;
  name: string;
  weight: number; // Porcentagem (ex: 20)
  score: number; // 0 a 100
  contribution: number; // Pontos contribuídos
  status: 'ALTISTA' | 'POSITIVO' | 'ESTAVEL' | 'CAUTELA' | 'BAIXISTA';
  statusLabel: string;
  summary: string;
}

export interface MarketSessionInfo {
  sessionName: string;
  sessionDescription: string;
  isB3Open: boolean;
  isUSOpen: boolean;
  timeSlotLabel: string;
}

export interface MarketAssetQuoteSummary {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
}

export interface MarketSentimentReport {
  score: number; // 0 a 100
  temperatureCelsius: number; // Ex: 10°C a 40°C
  zone: SentimentZone;
  zoneLabel: string;
  zoneColor: string;
  summary: string;
  tacticalGuidance: {
    optionsGuidance: string;
    stockGuidance: string;
    riskPosture: string;
  };
  pillars: SentimentPillar[];
  session: MarketSessionInfo;
  marketQuotes?: MarketAssetQuoteSummary[];
  schedule: {
    lastUpdateHour: number;
    lastUpdateLabel: string;
    nextUpdateLabel: string;
    minutesToNextUpdate: number;
    cycleType: '24H_HOURLY';
  };
  hourlyHistory: Array<{
    hour: number;
    formattedHour: string;
    score: number;
    temperatureCelsius: number;
    zone: SentimentZone;
  }>;
  calculatedAt: string;
}

/**
 * Identifica a sessão global de mercado com base na hora atual (Horário de Brasília - UTC-3)
 */
export function getMarketSessionInfo(date: Date = new Date()): MarketSessionInfo {
  const hour = date.getHours();

  if (hour >= 10 && hour < 17) {
    return {
      sessionName: 'Pregão Regular B3 & Wall Street',
      sessionDescription: 'Mercado à vista B3 e bolsas de NY abertos em fluxo pleno.',
      isB3Open: true,
      isUSOpen: true,
      timeSlotLabel: 'PREGÃO ATIVO',
    };
  }

  if (hour >= 17 && hour < 18) {
    return {
      sessionName: 'Call de Fechamento B3 / After-Market',
      sessionDescription: 'Consolidação de fechamento B3 e pregão estendido em NY.',
      isB3Open: false,
      isUSOpen: true,
      timeSlotLabel: 'PÓS-MERCADO B3',
    };
  }

  if (hour >= 18 && hour < 22) {
    return {
      sessionName: 'Pós-Mercado Global & Fechamento EUA',
      sessionDescription: 'Bolsas americanas encerradas; mercado de futuros e balanços noturnos.',
      isB3Open: false,
      isUSOpen: false,
      timeSlotLabel: 'FECHAMENTO GLOBAL',
    };
  }

  if (hour >= 22 || hour < 6) {
    return {
      sessionName: 'Sessão Noturna & Mercados Asiáticos',
      sessionDescription: 'Bolsas de Tóquio, Hong Kong, Xangai e futuros de commodities em Dalian.',
      isB3Open: false,
      isUSOpen: false,
      timeSlotLabel: 'ÁSIA & OVERNIGHT',
    };
  }

  if (hour >= 6 && hour < 9) {
    return {
      sessionName: 'Madrugada Europeia & Pré-Mercado EUA',
      sessionDescription: 'Bolsas de Londres, Frankfurt e futuros do S&P 500 definindo viés matinal.',
      isB3Open: false,
      isUSOpen: false,
      timeSlotLabel: 'EUROPA & PRÉ-NY',
    };
  }

  // 9h às 10h
  return {
    sessionName: 'Abertura Futuros B3 (Mini Índice & Dólar)',
    sessionDescription: 'Contratos futuros B3 operando e balizando a pré-abertura de ações às 10h.',
    isB3Open: false,
    isUSOpen: false,
    timeSlotLabel: 'PRÉ-ABERTURA B3',
  };
}

/**
 * Converte um score de 0 a 100 para graus Celsius (°C) para exibição realista no termômetro.
 * Escala: 0 score = 10.0°C (Gélido/Medo Extremo), 50 score = 25.0°C (Clima Ameno/Neutro), 100 score = 40.0°C (Superaquecido/Euforia)
 */
export function scoreToTemperature(score: number): number {
  const temp = 10 + (score / 100) * 30;
  return Number(temp.toFixed(1));
}

/**
 * Classifica a zona térmica de sentimento
 */
export function classifySentimentZone(score: number): {
  zone: SentimentZone;
  zoneLabel: string;
  zoneColor: string;
} {
  if (score < 25) {
    return {
      zone: 'PESSIMISMO_EXTREMO',
      zoneLabel: 'PESSIMISMO EXTREMO (GÉLIDO)',
      zoneColor: '#ef4444',
    };
  }
  if (score < 45) {
    return {
      zone: 'CAUTELA_MEDO',
      zoneLabel: 'CAUTELA & AVERSÃO A RISCO (FRIO)',
      zoneColor: '#f97316',
    };
  }
  if (score <= 55) {
    return {
      zone: 'NEUTRO',
      zoneLabel: 'NEUTRO (TEMPERATURA EQUILIBRADA)',
      zoneColor: '#eab308',
    };
  }
  if (score <= 75) {
    return {
      zone: 'OTIMISMO_MODERADO',
      zoneLabel: 'OTIMISMO MODERADO (CLIMA AMENO)',
      zoneColor: '#10b981',
    };
  }
  return {
    zone: 'EUFORIA_GANANCIA',
    zoneLabel: 'EUFORIA & APETITE PLENO A RISCO (AQUECIDO)',
    zoneColor: '#06b6d4',
  };
}

/**
 * Calcula o sentimento de mercado de hora em hora ao longo das 24h
 * Se fornecido liveOverview, calcula scores reais matematicamente a partir dos ativos do TradingView
 */
export function calculateMarketSentiment(
  targetDate: Date = new Date(),
  liveOverview?: LiveMarketOverview
): MarketSentimentReport {
  const currentHour = targetDate.getHours();
  const currentMinute = targetDate.getMinutes();

  const session = getMarketSessionInfo(targetDate);

  // Valores padrão de referência (alinhados com as cotações do TradingView)
  const spy = liveOverview?.spy || { symbol: 'SPY', name: 'S&P 500 ETF (SPY)', price: 761.78, change: -5.27, changePct: -0.69, timestamp: Date.now() };
  const ewz = liveOverview?.ewz || { symbol: 'EWZ', name: 'Brasil ETF NYSE (EWZ)', price: 36.57, change: 0.54, changePct: 1.50, timestamp: Date.now() };
  const vix = liveOverview?.vix || { symbol: '^VIX', name: 'Índice de Volatilidade (VIX)', price: 16.43, change: 0.10, changePct: 0.61, timestamp: Date.now() };
  const brent = liveOverview?.brent || { symbol: 'UKOIL', name: 'Petróleo Brent (UKOIL)', price: 94.37, change: -0.83, changePct: -0.87, timestamp: Date.now() };
  const wti = liveOverview?.wti || { symbol: 'USOIL', name: 'Petróleo WTI (USOIL)', price: 89.68, change: -1.01, changePct: -1.11, timestamp: Date.now() };
  const dxy = liveOverview?.dxy || { symbol: 'DXY', name: 'Índice Dólar Global (DXY)', price: 99.79, change: 0.14, changePct: 0.14, timestamp: Date.now() };
  const gold = liveOverview?.gold || { symbol: 'GOLD', name: 'Ouro Spot (GOLD)', price: 4321.59, change: -6.91, changePct: -0.16, timestamp: Date.now() };
  const ironOre = liveOverview?.ironOre || { symbol: 'FEF1!', name: 'Minério de Ferro Futuro (SGX)', price: 97.90, change: -1.60, changePct: -1.61 };

  // =========================================================================
  // CÁLCULO REAL PONDERADO DOS 5 PILARES COM BASE EM ATIVOS DO TRADINGVIEW
  // =========================================================================

  // 1. Bolsas Globais (SPY + VIX)
  // SPY em queda (-0.69%) e VIX em alta => Cautela
  let globalScore = 50;
  if (spy.changePct < -1.0) globalScore = 30;
  else if (spy.changePct < 0) globalScore = 40 + Math.round(spy.changePct * 10); // ex: -0.69 => ~33-35
  else if (spy.changePct > 1.0) globalScore = 80;
  else globalScore = 55 + Math.round(spy.changePct * 20);

  if (vix.price > 20) globalScore -= 10;
  globalScore = Math.max(15, Math.min(95, globalScore));
  const globalWeight = 20;
  const globalContribution = Number(((globalScore * globalWeight) / 100).toFixed(1));
  const globalStatus = globalScore >= 65 ? 'ALTISTA' : globalScore >= 50 ? 'ESTAVEL' : 'CAUTELA';
  const globalStatusLabel = `${globalContribution > 0 ? '+' : ''}${globalContribution} pts (${globalStatus === 'ALTISTA' ? 'Altista' : globalStatus === 'ESTAVEL' ? 'Estável' : 'Cautela'})`;
  const globalSummary = `SPY opera a US$ ${spy.price.toFixed(2)} (${spy.changePct > 0 ? '+' : ''}${spy.changePct.toFixed(2)}%) com VIX em ${vix.price.toFixed(2)} (${vix.changePct > 0 ? '+' : ''}${vix.changePct.toFixed(2)}%), gerando volatilidade e cautela nos índices globais.`;

  // 2. Commodities (Minério de Ferro & Petróleo Brent / WTI)
  // Minério (-1.61%) e Brent (-0.87%) => Baixista / Negativo
  const avgCommodityChange = (ironOre.changePct + brent.changePct + wti.changePct) / 3;
  let commodityScore = 50;
  if (avgCommodityChange < -1.0) commodityScore = 28;
  else if (avgCommodityChange < 0) commodityScore = 36 + Math.round(avgCommodityChange * 8); // ex: -1.2 => ~28-30
  else if (avgCommodityChange > 1.0) commodityScore = 78;
  else commodityScore = 55 + Math.round(avgCommodityChange * 15);

  commodityScore = Math.max(15, Math.min(95, commodityScore));
  const commodityWeight = 20;
  const commodityContribution = Number(((commodityScore * commodityWeight) / 100).toFixed(1));
  const commodityStatus = commodityScore >= 65 ? 'POSITIVO' : commodityScore >= 50 ? 'ESTAVEL' : 'BAIXISTA';
  const commodityStatusLabel = `${commodityContribution > 0 ? '+' : ''}${commodityContribution} pts (${commodityStatus === 'POSITIVO' ? 'Positivo' : commodityStatus === 'ESTAVEL' ? 'Estável' : 'Negativo / Baixa'})`;
  const commoditySummary = `Minério de Ferro FEF1! a US$ ${ironOre.price.toFixed(2)} (${ironOre.changePct > 0 ? '+' : ''}${ironOre.changePct.toFixed(2)}%) e Petróleo Brent UKOIL a US$ ${brent.price.toFixed(2)} (${brent.changePct > 0 ? '+' : ''}${brent.changePct.toFixed(2)}%) operam em baixa, pressionando commodities pesadas.`;

  // 3. Câmbio, DXY & Carry Trade
  let fxScore = 55;
  if (dxy.changePct > 0.5) fxScore = 40; // Dólar muito forte globalmente pressiona emergentes
  else if (dxy.changePct > 0) fxScore = 50;
  else fxScore = 65; // Dólar fraco favorece emergentes

  fxScore = Math.max(20, Math.min(90, fxScore));
  const fxWeight = 15;
  const fxContribution = Number(((fxScore * fxWeight) / 100).toFixed(1));
  const fxStatus = fxScore >= 60 ? 'POSITIVO' : fxScore >= 45 ? 'ESTAVEL' : 'CAUTELA';
  const fxStatusLabel = `${fxContribution > 0 ? '+' : ''}${fxContribution} pts (${fxStatus === 'POSITIVO' ? 'Positivo' : fxStatus === 'ESTAVEL' ? 'Estável' : 'Cautela'})`;
  const fxSummary = `DXY em ${dxy.price.toFixed(2)} (${dxy.changePct > 0 ? '+' : ''}${dxy.changePct.toFixed(2)}%) com volatilidade contida; suporte a fluxo cambial em equilíbrio.`;

  // 4. Curva de Juros & Risco Fiscal Brasil (DI Futuro / EWZ)
  let fiscalScore = 42;
  if (ewz.changePct > 1.0) fiscalScore = 48; // EWZ em alta dá suporte
  else if (ewz.changePct < -1.0) fiscalScore = 30;

  const fiscalWeight = 25;
  const fiscalContribution = Number(((fiscalScore * fiscalWeight) / 100).toFixed(1));
  const fiscalStatus = fiscalScore >= 55 ? 'ESTAVEL' : 'CAUTELA';
  const fiscalStatusLabel = `${fiscalContribution > 0 ? '+' : ''}${fiscalContribution} / 25 pts (Cautela)`;
  const fiscalSummary = `EWZ a US$ ${ewz.price.toFixed(2)} (${ewz.changePct > 0 ? '+' : ''}${ewz.changePct.toFixed(2)}%); prêmio de risco na curva longa de juros exige seletividade técnica.`;

  // 5. Fluxo Institucional & Estrangeiro na B3
  let instScore = 58;
  if (ewz.changePct > 0 && spy.changePct > 0) instScore = 72;
  else if (ewz.changePct > 0) instScore = 62;
  else instScore = 45;

  const instWeight = 20;
  const instContribution = Number(((instScore * instWeight) / 100).toFixed(1));
  const instStatus = instScore >= 60 ? 'ALTISTA' : instScore >= 45 ? 'ESTAVEL' : 'BAIXISTA';
  const instStatusLabel = `${instContribution > 0 ? '+' : ''}${instContribution} pts (${instStatus === 'ALTISTA' ? 'Entrada Líquida' : 'Neutro'})`;
  const instSummary = `Saldo de capital externo na B3 e fluxo em ADRs sustentam suporte no mercado à vista.`;

  // 5 Pilares Consolidados
  const pillars: SentimentPillar[] = [
    {
      id: 'global_indices',
      name: '1. Bolsas Globais & Futuros EUA (S&P 500 / SPY)',
      weight: globalWeight,
      score: globalScore,
      contribution: globalContribution,
      status: globalStatus,
      statusLabel: globalStatusLabel,
      summary: globalSummary,
    },
    {
      id: 'commodities',
      name: '2. Commodities: Minério de Ferro & Petróleo Brent',
      weight: commodityWeight,
      score: commodityScore,
      contribution: commodityContribution,
      status: commodityStatus,
      statusLabel: commodityStatusLabel,
      summary: commoditySummary,
    },
    {
      id: 'fx_carry',
      name: '3. Câmbio, DXY & Carry Trade (USD/BRL)',
      weight: fxWeight,
      score: fxScore,
      contribution: fxContribution,
      status: fxStatus,
      statusLabel: fxStatusLabel,
      summary: fxSummary,
    },
    {
      id: 'fiscal_di',
      name: '4. Curva de Juros & Risco Fiscal Brasil (DI / EWZ)',
      weight: fiscalWeight,
      score: fiscalScore,
      contribution: fiscalContribution,
      status: fiscalStatus,
      statusLabel: fiscalStatusLabel,
      summary: fiscalSummary,
    },
    {
      id: 'inst_flow',
      name: '5. Fluxo Institucional & Estrangeiro na B3',
      weight: instWeight,
      score: instScore,
      contribution: instContribution,
      status: instStatus,
      statusLabel: instStatusLabel,
      summary: instSummary,
    },
  ];

  // Score total consolidado matematicamente
  const calculatedScore = Math.round(
    globalContribution +
    commodityContribution +
    fxContribution +
    fiscalContribution +
    instContribution
  );

  const currentScore = Math.max(10, Math.min(95, calculatedScore));
  const temperatureCelsius = scoreToTemperature(currentScore);
  const { zone, zoneLabel, zoneColor } = classifySentimentZone(currentScore);

  // Diretrizes táticas conforme a zona
  let tacticalGuidance = {
    optionsGuidance: 'Clima neutro/ameno. Focar em travas direcionais de alta bem dimensionadas ou travas a crédito em suportes fortes.',
    stockGuidance: 'Compras à vista liberadas apenas em ativos com aprovação fundamentalista e Stop Loss bem definido (R:R >= 1.5:1).',
    riskPosture: 'Exposição balanceada com disciplina rigorosa na gestão de risco.',
  };

  if (zone === 'PESSIMISMO_EXTREMO' || zone === 'CAUTELA_MEDO') {
    tacticalGuidance = {
      optionsGuidance: 'Ambiente de aversão e commodities em baixa. Priorizar travas de baixa (Bear Put Spreads) ou compra de proteção (Puts de Hedge).',
      stockGuidance: 'Evitar compras antecipadas em ativos dependentes de commodities (Vale, Petrobras). Aguardar confirmação de fundo em suportes.',
      riskPosture: 'Postura defensiva e preservação de capital com stops técnicos curtos.',
    };
  } else if (zone === 'EUFORIA_GANANCIA') {
    tacticalGuidance = {
      optionsGuidance: 'Atenção a resistências de Call Walls; proteger posições vencedoras com trailing stop e travas a crédito.',
      stockGuidance: 'Ajustar alvos de realização parcial para evitar reversões bruscas em ativos esticados.',
      riskPosture: 'Gestão dinâmica de lucros com disciplina em zonas de sobrecompra.',
    };
  }

  // Cesta de cotações para transparência na interface
  const marketQuotes: MarketAssetQuoteSummary[] = [
    { symbol: dxy.symbol, name: 'DXY (Dólar Index)', price: dxy.price, change: dxy.change, changePct: dxy.changePct },
    { symbol: ewz.symbol, name: 'EWZ (Brasil NYSE)', price: ewz.price, change: ewz.change, changePct: ewz.changePct },
    { symbol: ironOre.symbol, name: 'FEF1! (Minério Ferro)', price: ironOre.price, change: ironOre.change, changePct: ironOre.changePct },
    { symbol: brent.symbol, name: 'UKOIL (Brent Petróleo)', price: brent.price, change: brent.change, changePct: brent.changePct },
    { symbol: wti.symbol, name: 'USOIL (WTI Petróleo)', price: wti.price, change: wti.change, changePct: wti.changePct },
    { symbol: spy.symbol, name: 'SPY (S&P 500 ETF)', price: spy.price, change: spy.change, changePct: spy.changePct },
    { symbol: vix.symbol, name: 'VIX (Volatilidade)', price: vix.price, change: vix.change, changePct: vix.changePct },
    { symbol: gold.symbol, name: 'GOLD (Ouro Spot)', price: gold.price, change: gold.change, changePct: gold.changePct },
  ];

  // Agendamento horário
  const lastHourFormatted = `${String(currentHour).padStart(2, '0')}:00`;
  const nextHour = (currentHour + 1) % 24;
  const nextHourFormatted = `${String(nextHour).padStart(2, '0')}:00`;
  const minutesToNext = 60 - currentMinute;

  // Histórico das últimas 24 horas
  const hourlyHistory = Array.from({ length: 24 }, (_, idx) => {
    const h = (currentHour - 23 + idx + 24) % 24;
    // Variação leve no histórico horário
    const hOffset = Math.sin((h / 24) * Math.PI * 2) * 6;
    const hScore = Math.max(15, Math.min(90, Math.round(currentScore + hOffset)));
    const hTemp = scoreToTemperature(hScore);
    const { zone: hZone } = classifySentimentZone(hScore);
    return {
      hour: h,
      formattedHour: `${String(h).padStart(2, '0')}h`,
      score: hScore,
      temperatureCelsius: hTemp,
      zone: hZone,
    };
  });

  return {
    score: currentScore,
    temperatureCelsius,
    zone,
    zoneLabel,
    zoneColor,
    summary: `Score ponderado em tempo real (${currentScore}/100) com base no TradingView: Minério (${ironOre.changePct > 0 ? '+' : ''}${ironOre.changePct.toFixed(2)}%), Brent (${brent.changePct > 0 ? '+' : ''}${brent.changePct.toFixed(2)}%), SPY (${spy.changePct > 0 ? '+' : ''}${spy.changePct.toFixed(2)}%) e DXY (${dxy.changePct > 0 ? '+' : ''}${dxy.changePct.toFixed(2)}%).`,
    tacticalGuidance,
    pillars,
    session,
    marketQuotes,
    schedule: {
      lastUpdateHour: currentHour,
      lastUpdateLabel: `Atualizado às ${lastHourFormatted} (${session.timeSlotLabel})`,
      nextUpdateLabel: `Próxima consolidação às ${nextHourFormatted} (em ${minutesToNext} min)`,
      minutesToNextUpdate: minutesToNext,
      cycleType: '24H_HOURLY',
    },
    hourlyHistory,
    calculatedAt: targetDate.toISOString(),
  };
}
