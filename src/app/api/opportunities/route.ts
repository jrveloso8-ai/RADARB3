import { NextRequest, NextResponse } from 'next/server';
import { brapiService } from '@/lib/services/brapi';
import { getLiveMarketOverview } from '@/lib/services/market-quotes';
import { analyzeFundamentals } from '@/lib/domain/fundamentals';
import { buildMasterOpportunityList, OpportunityCategory } from '@/lib/domain/opportunity-radar';
import { calculateHistoricalVolatility } from '@/lib/domain/volatility';
import { calculateSupportResistance } from '@/lib/domain/indicators';
import { getMostLiquidB3Expiration } from '@/lib/domain/options-barriers';
import { analyzeAssetTrend } from '@/lib/domain/trends';
import { calculateMaxPain } from '@/lib/domain/black-scholes';

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

    // PROVENANCE: ESTIMADO Cotação de referência da Soja Paranaguá base R$ 134.50 indexada ao contrato CBOT
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

        // Consulta de opções para buscar IV ATM real, Max Pain e dados reais do book para estratégias
        let realIvAtm: number | null = null;
        let calculatedMaxPain: number | undefined = undefined;
        let realOptionsData: {
          debit?: number;
          deltaCallLong?: number;
          deltaPutLong?: number;
          netCredit?: number;
          pop?: number;
          putPremium?: number;
          putDelta?: number;
        } | undefined = undefined;

        try {
          // Busca paralela de analytics e posições de opções na BRAPI para a data de vencimento mais líquida
          const [resAnalytics, resPositions] = await Promise.all([
            brapiService.getOptionAnalytics(cleanSymbol, mostLiquidExp.date).catch(() => null),
            brapiService.getOptionPositions(cleanSymbol, mostLiquidExp.date).catch(() => null),
          ]);

          const analytics = resAnalytics?.analytics || [];
          if (analytics && analytics.length > 0) {
            const validIvs = analytics
              .filter((a) => typeof a.impliedVolatility === 'number' && a.impliedVolatility > 0)
              .map((a) => a.impliedVolatility as number)
              .sort((a, b) => a - b);
            if (validIvs.length >= 3) {
              const mid = Math.floor(validIvs.length / 2);
              realIvAtm = validIvs.length % 2 !== 0 ? validIvs[mid] : (validIvs[mid - 1] + validIvs[mid]) / 2;
            }

            // Seleção de contratos reais próximos aos strikes das estratégias
            const spot = quote.regularMarketPrice;
            const calls = analytics.filter(
              (a) => !a.symbol.includes('W') && (a.strike ?? 0) >= spot * 0.95 && typeof a.optionPrice === 'number'
            );
            const puts = analytics.filter(
              (a) => (a.strike ?? 0) <= spot * 1.05 && typeof a.optionPrice === 'number'
            );

            // Call ATM mais líquida/próxima do spot
            const callAtm = calls.sort((a, b) => Math.abs((a.strike || 0) - spot) - Math.abs((b.strike || 0) - spot))[0];
            // Call OTM ~ +6% acima do spot
            const callOtm = calls.sort((a, b) => Math.abs((a.strike || 0) - spot * 1.06) - Math.abs((b.strike || 0) - spot * 1.06))[0];
            // Put OTM ~ -6% abaixo do spot
            const putOtm = puts.sort((a, b) => Math.abs((a.strike || 0) - spot * 0.94) - Math.abs((b.strike || 0) - spot * 0.94))[0];

            if (callAtm && callAtm.optionPrice && callAtm.optionPrice > 0) {
              const debit = callOtm && callOtm.optionPrice
                ? Math.max(0.10, callAtm.optionPrice - callOtm.optionPrice)
                : Number((callAtm.optionPrice * 0.45).toFixed(2));

              const putPrem = putOtm && putOtm.optionPrice && putOtm.optionPrice > 0 ? putOtm.optionPrice : undefined;

              realOptionsData = {
                debit: Number(debit.toFixed(2)),
                deltaCallLong: typeof callAtm.delta === 'number' ? callAtm.delta : undefined,
                deltaPutLong: typeof putOtm?.delta === 'number' ? putOtm.delta : undefined,
                netCredit: putPrem ? Number((putPrem * 0.65).toFixed(2)) : undefined,
                pop: typeof callAtm.delta === 'number' ? Math.round(Math.abs(callAtm.delta) * 100) : undefined,
                putPremium: putPrem,
                putDelta: typeof putOtm?.delta === 'number' ? putOtm.delta : undefined,
              };
            }
          }

          // Cálculo real de Max Pain via calculateMaxPain a partir de open interest das posições
          const positions = resPositions?.positions || [];
          if (positions.length > 0) {
            const callsByStrike = new Map<number, number>();
            const putsByStrike = new Map<number, number>();
            const strikesSet = new Set<number>();

            for (const pos of positions) {
              if (typeof pos.strike === 'number' && pos.strike > 0) {
                strikesSet.add(pos.strike);
                const oi = typeof pos.openInterest === 'number' ? pos.openInterest : 0;
                const isCall = String(pos.side || '').toLowerCase() === 'call';
                const isPut = String(pos.side || '').toLowerCase() === 'put';
                if (isCall) {
                  callsByStrike.set(pos.strike, (callsByStrike.get(pos.strike) || 0) + oi);
                } else if (isPut) {
                  putsByStrike.set(pos.strike, (putsByStrike.get(pos.strike) || 0) + oi);
                }
              }
            }

            const sortedStrikes = Array.from(strikesSet).sort((a, b) => a - b);
            if (sortedStrikes.length > 0) {
              const mpResult = calculateMaxPain(sortedStrikes, callsByStrike, putsByStrike);
              if (mpResult.maxPainStrike > 0) {
                calculatedMaxPain = mpResult.maxPainStrike;
              }
            }
          }
        } catch {
          realIvAtm = null;
          calculatedMaxPain = undefined;
          realOptionsData = undefined;
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
          maxPain: calculatedMaxPain, // Max Pain real derivado do book de opções ou undefined se indisponível
          supports: sr.supports,
          realOptions: realOptionsData,
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
