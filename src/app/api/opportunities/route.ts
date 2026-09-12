import { NextRequest, NextResponse } from 'next/server';
import { brapiService } from '@/lib/services/brapi';
import { getLiveMarketOverview } from '@/lib/services/market-quotes';
import { analyzeFundamentals } from '@/lib/domain/fundamentals';
import { buildMasterOpportunityList, OpportunityCategory } from '@/lib/domain/opportunity-radar';
import { calculateHistoricalVolatility } from '@/lib/domain/volatility';
import { calculateSupportResistance } from '@/lib/domain/indicators';
import { getMostLiquidB3Expiration } from '@/lib/domain/options-barriers';
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

    // PROVENANCE: Cotação de referência da Soja Paranaguá base R$ 134.50 indexada ao contrato CBOT
    const sojaBase = 134.50;
    const sojaChange = liveOverview.agri?.soybeanCbot.changePct ?? 0;
    const sojaPrice = Number((sojaBase * (1 + sojaChange / 100)).toFixed(2));

    const agriQuotes = {
      ccmPrice: liveOverview.agri?.cornB3Est.price,
      ccmChange: liveOverview.agri?.cornB3Est.changePct,
      bgiPrice: liveOverview.agri?.boiB3Est.price,
      bgiChange: liveOverview.agri?.boiB3Est.changePct,
      sojaPrice,
      sojaChange,
    };

    // 2. Obter lista de ações líquidas da B3 + Ações do Agronegócio
    const baseStocks = await brapiService.getAvailableStocks(limit);
    const agriStocks = ['SLCE3', 'AGRO3', 'SMTO3', 'BEEF3', 'JBSS3', 'BRFS3', 'RAIZ4'];
    const uniqueSymbols = Array.from(new Set([...baseStocks.slice(0, 25), ...agriStocks]));
    const mostLiquidExp = getMostLiquidB3Expiration();

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

        // Postura conservadora: ausência de fundamentos ou erro = REPROVADO (score 0)
        let fundamentalStatus: 'APROVADO' | 'REPROVADO' = 'REPROVADO';
        let fundamentalScore = 0;

        try {
          const rawFundamentals = await brapiService.getFundamentals(cleanSymbol);
          if (rawFundamentals) {
            const fResult = analyzeFundamentals(cleanSymbol, rawFundamentals);
            fundamentalStatus = fResult.status;
            fundamentalScore = fResult.score;
          }
        } catch {
          // Conservador: mantém REPROVADO e score 0
          fundamentalStatus = 'REPROVADO';
          fundamentalScore = 0;
        }

        const hv21 = calculateHistoricalVolatility(closes, 21);
        const sr = calculateSupportResistance(history, quote.regularMarketPrice);

        // Consulta de opções para buscar IV ATM real quando disponível
        let realIvAtm: number | null = null;
        try {
          const res = await brapiService.getOptionAnalytics(cleanSymbol, mostLiquidExp.date);
          const analytics = res?.analytics || [];
          if (analytics && analytics.length > 0) {
            const validIvs = analytics
              .filter((a) => typeof a.impliedVolatility === 'number' && a.impliedVolatility > 0)
              .map((a) => a.impliedVolatility as number)
              .sort((a, b) => a - b);
            if (validIvs.length >= 3) {
              const mid = Math.floor(validIvs.length / 2);
              realIvAtm = validIvs.length % 2 !== 0 ? validIvs[mid] : (validIvs[mid - 1] + validIvs[mid]) / 2;
            }
          }
        } catch {
          realIvAtm = null;
        }

        return {
          symbol: cleanSymbol,
          shortName: quote.shortName || cleanSymbol,
          price: quote.regularMarketPrice,
          changePct: quote.regularMarketChangePercent || 0,
          history,
          trend: trendAnalysis.trend,
          fundamentalStatus,
          fundamentalScore,
          ivAtm: realIvAtm, // IV real ou null quando indisponível
          hv21: hv21 ?? undefined,
          dte: mostLiquidExp.dte,
          maxPain: undefined, // Sem open interest completo do book na rota rápida, não fabrica valor
          supports: sr.supports,
        };
      } catch {
        return null;
      }
    });

    const rawQuotes = await Promise.all(quotesPromises);
    const quotesResults = rawQuotes.filter((q): q is NonNullable<typeof q> => q !== null);

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
