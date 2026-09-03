import { NextRequest, NextResponse } from 'next/server';
import { brapiService } from '@/lib/services/brapi';
import { getLiveMarketOverview } from '@/lib/services/market-quotes';
import { analyzeFundamentals } from '@/lib/domain/fundamentals';
import { buildMasterOpportunityList, OpportunityCategory } from '@/lib/domain/opportunity-radar';
import { calculateHistoricalVolatility } from '@/lib/domain/volatility';
import { calculateSupportResistance } from '@/lib/domain/indicators';

import { analyzeAssetTrend } from '@/lib/domain/trends';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as OpportunityCategory | 'ALL' | null;
    const minScore = parseInt(searchParams.get('minScore') || '60', 10);
    const limit = parseInt(searchParams.get('limit') || '40', 10);

    // 1. Obter dados de Mercado Macro e Agrícola em Tempo Real
    const liveOverview = await getLiveMarketOverview();

    const macroOverview = {
      brentChange: liveOverview.brent.changePct || 0,
      ironOreChange: liveOverview.ironOre.changePct || 0,
      dxyChange: liveOverview.dxy.changePct || 0,
    };

    const agriQuotes = {
      ccmPrice: liveOverview.agri?.cornB3Est.price || 63.80,
      ccmChange: liveOverview.agri?.cornB3Est.changePct || 0.45,
      bgiPrice: liveOverview.agri?.boiB3Est.price || 244.50,
      bgiChange: liveOverview.agri?.boiB3Est.changePct || 1.15,
      sojaPrice: 134.50,
      sojaChange: liveOverview.agri?.soybeanCbot.changePct || -0.65,
    };

    // 2. Obter lista de ações líquidas da B3 + Ações do Agronegócio
    const baseStocks = await brapiService.getAvailableStocks(limit);
    const agriStocks = ['SLCE3', 'AGRO3', 'SMTO3', 'BEEF3', 'JBSS3', 'BRFS3', 'RAIZ4'];
    const uniqueSymbols = Array.from(new Set([...baseStocks.slice(0, 25), ...agriStocks]));

    const quotesPromises = uniqueSymbols.map(async (symbol) => {
      try {
        const cleanSymbol = symbol.trim().toUpperCase();
        const quote = await brapiService.getQuoteWith12MHistory(cleanSymbol);
        const history = quote.historicalDataPrice || [];
        const closes = history.map((h) => h.close);

        // Análise de Tendência Técnica Real (MM20, MM50, MM200)
        const trendAnalysis = analyzeAssetTrend(
          cleanSymbol,
          quote.regularMarketPrice,
          quote.regularMarketChangePercent || 0,
          history,
          quote.shortName
        );

        let fundamentalStatus: 'APROVADO' | 'REPROVADO' = 'APROVADO';
        let fundamentalScore = 75;

        try {
          const rawFundamentals = await brapiService.getFundamentals(cleanSymbol);
          if (rawFundamentals) {
            const fResult = analyzeFundamentals(cleanSymbol, rawFundamentals);
            fundamentalStatus = fResult.status;
            fundamentalScore = fResult.score;
          }
        } catch {
          // Manter defaults seguros em caso de timeout
        }

        const hv21 = calculateHistoricalVolatility(closes, 21) ?? 24.0;
        const sr = calculateSupportResistance(history, quote.regularMarketPrice);

        return {
          symbol: cleanSymbol,
          shortName: quote.shortName || cleanSymbol,
          price: quote.regularMarketPrice,
          changePct: quote.regularMarketChangePercent || 0,
          history,
          trend: trendAnalysis.trend,
          fundamentalStatus,
          fundamentalScore,
          ivAtm: hv21 * 1.05, // Estimativa de IV ATM
          hv21,
          dte: 14,
          maxPain: quote.regularMarketPrice,
          supports: sr.supports,
        };
      } catch {
        return null;
      }
    });

    const quotesResults = (await Promise.all(quotesPromises)).filter((q) => q !== null) as NonNullable<
      Awaited<ReturnType<typeof quotesPromises[0]>>
    >[];

    // 3. Processar Master Opportunity List
    const masterResult = buildMasterOpportunityList({
      quotes: quotesResults,
      macroOverview,
      agriQuotes,
    });

    let filteredOpps = masterResult.opportunities.filter((o) => o.convictionScore >= minScore);

    if (category && category !== 'ALL') {
      filteredOpps = filteredOpps.filter((o) => o.category === category);
    }

    return NextResponse.json({
      success: true,
      totalOpportunities: filteredOpps.length,
      highConvictionCount: masterResult.highConvictionCount,
      totalScanned: masterResult.totalScanned,
      updatedAt: new Date().toISOString(),
      macroOverview: liveOverview,
      agriOverview: masterResult.agriOverview,
      opportunities: filteredOpps,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro ao processar radar de oportunidades';
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
        opportunities: [],
        agriOverview: [],
      },
      { status: 500 }
    );
  }
}
