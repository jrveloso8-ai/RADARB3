/**
 * Serviço de Cotações Globais, Derivativos e Commodities Agrícolas em Tempo Real
 * Suporta cotações de índices mundiais, commodities (Brent, WTI, Minério), agrícolas (Milho, Boi, Soja), moedas e VIX
 */

import { DataProvenance } from '../types/provenance';

export interface CachedQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  timestamp: number;
  isStale?: boolean;
  source: 'live' | 'fallback';
  provenance: DataProvenance;
}

const quotesCache = new Map<string, { data: CachedQuote; expiresAt: number }>();

/**
 * Consulta cotação de ativo global via feed de mercado com cache
 */
export async function fetchLiveMarketQuote(symbol: string, name: string): Promise<CachedQuote> {
  const cached = quotesCache.get(symbol);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=2d`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const json = await res.json();
      const meta = json?.chart?.result?.[0]?.meta;
      if (meta && typeof meta.regularMarketPrice === 'number') {
        const price = meta.regularMarketPrice;
        const changePct = meta.regularMarketChangePercent || 0;
        const prevClose = meta.chartPreviousClose || price;
        const change = Number((price - prevClose).toFixed(3));

        const quote: CachedQuote = {
          symbol,
          name,
          price,
          change,
          changePct: Number(changePct.toFixed(2)),
          timestamp: Date.now(),
          isStale: false,
          source: 'live',
          provenance: 'MEDIDO',
        };

        quotesCache.set(symbol, { data: quote, expiresAt: Date.now() + 60000 }); // Cache 60s
        return quote;
      }
    }
  } catch {
    // Fallback gracioso abaixo
  }

  // PROVENANCE: ESTIMADO Valores de referência estáticos quando o feed Yahoo Finance estiver temporariamente indisponível. Marcados com isStale: true e source: 'fallback'.
  const fallbackDefaults: Record<string, { price: number; changePct: number; change: number }> = {
    // PROVENANCE: ESTIMADO Fallback SPY de referência
    'SPY': { price: 761.78, changePct: -0.69, change: -5.27 },
    'EWZ': { price: 36.57, changePct: 1.50, change: 0.54 },
    '^VIX': { price: 16.43, changePct: 0.61, change: 0.10 },
    'BZ=F': { price: 94.37, changePct: -0.87, change: -0.83 }, // Brent UKOIL
    'CL=F': { price: 89.68, changePct: -1.11, change: -1.01 }, // WTI USOIL
    'GC=F': { price: 4321.59, changePct: -0.16, change: -6.91 }, // Gold
    'DX-Y.NYB': { price: 99.79, changePct: 0.14, change: 0.14 }, // DXY
    'ZC=F': { price: 438.50, changePct: 0.45, change: 2.00 }, // Milho CBOT (cents/bushel)
    'ZS=F': { price: 1042.25, changePct: -0.65, change: -6.80 }, // Soja CBOT (cents/bushel)
    'LE=F': { price: 188.40, changePct: 1.15, change: 2.15 }, // Boi Gordo / Live Cattle CME
    'VALE3.SA': { price: 78.30, changePct: 0.58, change: 0.45 },
    'PETR4.SA': { price: 46.87, changePct: 4.11, change: 1.85 },
  };

  const def = fallbackDefaults[symbol] || { price: 100, changePct: 0, change: 0 };
  const fallbackQuote: CachedQuote = {
    symbol,
    name,
    price: def.price,
    change: def.change,
    changePct: def.changePct,
    timestamp: Date.now(),
    isStale: true,
    source: 'fallback',
    provenance: 'ESTIMADO',
  };

  quotesCache.set(symbol, { data: fallbackQuote, expiresAt: Date.now() + 15000 });
  return fallbackQuote;
}

export interface LiveMarketOverview {
  spy: CachedQuote;
  ewz: CachedQuote;
  vix: CachedQuote;
  brent: CachedQuote;
  wti: CachedQuote;
  gold: CachedQuote;
  dxy: CachedQuote;
  ironOre: {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePct: number;
  };
  agri?: {
    cornCbot: CachedQuote;
    soybeanCbot: CachedQuote;
    liveCattleCme: CachedQuote;
    cornB3Est: { symbol: string; name: string; price: number; changePct: number };
    boiB3Est: { symbol: string; name: string; price: number; changePct: number };
  };
}

/**
 * Consulta a cesta completa de ativos globais e commodities agrícolas de referência
 */
export async function getLiveMarketOverview(): Promise<LiveMarketOverview> {
  const [spy, ewz, vix, brent, wti, gold, dxy, cornCbot, soybeanCbot, liveCattleCme] =
    await Promise.all([
      fetchLiveMarketQuote('SPY', 'S&P 500 ETF (SPY)'),
      fetchLiveMarketQuote('EWZ', 'Brasil ETF NYSE (EWZ)'),
      fetchLiveMarketQuote('^VIX', 'Índice de Volatilidade (VIX)'),
      fetchLiveMarketQuote('BZ=F', 'Petróleo Brent Futuro (UKOIL)'),
      fetchLiveMarketQuote('CL=F', 'Petróleo WTI Futuro (USOIL)'),
      fetchLiveMarketQuote('GC=F', 'Ouro Spot (GOLD)'),
      fetchLiveMarketQuote('DX-Y.NYB', 'Índice Dólar Global (DXY)'),
      fetchLiveMarketQuote('ZC=F', 'Milho Futuro CBOT (ZC)'),
      fetchLiveMarketQuote('ZS=F', 'Soja Futuro CBOT (ZS)'),
      fetchLiveMarketQuote('LE=F', 'Boi Gordo Live Cattle CME (LE)'),
    ]);

  // Minério de Ferro FEF1! (SGX / Dalian 62% Fe)
  // PROVENANCE: ESTIMADO Referência de mercado de minério de ferro SGX quando feed oficial offline
  const ironOre = {
    symbol: 'FEF1!',
    name: 'Minério de Ferro Futuro 62% (SGX)',
    // PROVENANCE: ESTIMADO Fechamento de referência SGX 62% Fe quando feed em tempo real de Dalian/Cingapura está indisponível
    price: 97.90,
    change: -1.60,
    changePct: -1.61,
    isEstimated: true,
    isStale: true,
    source: 'fallback' as const,
    provenance: 'ESTIMADO' as const,
  };

  // Estimativas convertidas para o mercado físico e futuro B3
  // PROVENANCE: ESTIMADO Preço estimado do Milho B3 (CCM) derivado do fechamento de referência (R$ 63.80) + variação do proxy CBOT
  const cornBasePrice = 63.80;
  const cornChangePct = cornCbot.changePct;
  const cornEstimatedPrice = Number((cornBasePrice * (1 + cornChangePct / 100)).toFixed(2));
  const cornB3Est = {
    symbol: 'CCMFUT',
    name: 'Milho Futuro B3 (CCM)',
    price: cornEstimatedPrice,
    changePct: cornChangePct,
    isEstimated: true,
    provenance: 'ESTIMADO' as const,
  };

  // PROVENANCE: ESTIMADO Preço estimado do Boi Gordo B3 (BGI) derivado do fechamento de referência (R$ 244.50) + variação do proxy CME
  const boiBasePrice = 244.50;
  const boiChangePct = liveCattleCme.changePct;
  const boiEstimatedPrice = Number((boiBasePrice * (1 + boiChangePct / 100)).toFixed(2));
  const boiB3Est = {
    symbol: 'BGIFUT',
    name: 'Boi Gordo Futuro B3 (BGI)',
    price: boiEstimatedPrice,
    changePct: boiChangePct,
    isEstimated: true,
    provenance: 'ESTIMADO' as const,
  };

  return {
    spy,
    ewz,
    vix,
    brent,
    wti,
    gold,
    dxy,
    ironOre,
    agri: {
      cornCbot,
      soybeanCbot,
      liveCattleCme,
      cornB3Est,
      boiB3Est,
    },
  };
}
