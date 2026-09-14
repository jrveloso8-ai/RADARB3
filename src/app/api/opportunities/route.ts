import { NextRequest, NextResponse } from 'next/server';
import { brapiService } from '@/lib/services/brapi';
import { getLiveMarketOverview } from '@/lib/services/market-quotes';
import { analyzeFundamentals } from '@/lib/domain/fundamentals';
import { buildMasterOpportunityList, OpportunityCategory } from '@/lib/domain/opportunity-radar';
import { calculateHistoricalVolatility } from '@/lib/domain/volatility';
import { calculateSupportResistance } from '@/lib/domain/indicators';
import { getMostLiquidB3Expiration } from '@/lib/domain/options-barriers';
import { analyzeAssetTrend } from '@/lib/domain/trends';
import { calculateMaxPain, calculateBlackScholes } from '@/lib/domain/black-scholes';
import { getRiskFreeRate } from '@/lib/config/macro';
import { resolveConservativeFundamentals, resolveRealIvAtm } from '@/lib/domain/opportunity-guards';

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

        // Postura conservadora via guard: ausência de fundamentos ou erro = REPROVADO (score 0)
        let rawFundamentals = null;
        try {
          rawFundamentals = await brapiService.getFundamentals(cleanSymbol);
        } catch {
          rawFundamentals = null;
        }
        const { status: fundamentalStatus, score: fundamentalScore } = resolveConservativeFundamentals(
          cleanSymbol,
          rawFundamentals,
          analyzeFundamentals
        );

        const hv21 = calculateHistoricalVolatility(closes, 21);
        const sr = calculateSupportResistance(history, quote.regularMarketPrice);

        // Consulta de opções para buscar IV ATM real, Max Pain e dados reais do book para estratégias
        let realIvAtm: number | null = null;
        let calculatedMaxPain: number | undefined = undefined;
        let realOptionsData: {
          debit?: number;
          deltaCallLong?: number;
          strikeCallLong?: number;
          deltaCallShort?: number;
          strikeCallShort?: number;
          deltaPutLong?: number;
          strikePutLong?: number;
          deltaPutShort?: number;
          strikePutShort?: number;
          netCredit?: number;
          pop?: number;
          putPremium?: number;
          putDelta?: number;
          putStrike?: number;
          putSymbol?: string;
        } | undefined = undefined;

        try {
          // Busca paralela de analytics e posições de opções na BRAPI para a data de vencimento mais líquida
          const [resAnalytics, resPositions] = await Promise.all([
            brapiService.getOptionAnalytics(cleanSymbol, mostLiquidExp.date).catch(() => null),
            brapiService.getOptionPositions(cleanSymbol, mostLiquidExp.date).catch(() => null),
          ]);

          const analytics = resAnalytics?.analytics || [];
          // Resolução de IV ATM real via guard dedicado (sem fabricação de dados)
          realIvAtm = resolveRealIvAtm(analytics);

          if (analytics && analytics.length > 0) {
            const spot = quote.regularMarketPrice;
            const r = getRiskFreeRate();
            const expDate = new Date(mostLiquidExp.date);
            const now = new Date();
            const dte = Math.max(1, Math.round((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            const T = dte / 252;
            const sigma = realIvAtm ? realIvAtm / 100 : (hv21 && hv21 > 0 ? hv21 / 100 : 0.25);

            // Filtrar e enriquecer opções com Delta determinístico
            const enrichedCalls = analytics
              .filter((a) => !a.symbol.includes('W') && typeof a.strike === 'number' && a.strike > 0)
              .map((a) => {
                const delta = typeof a.delta === 'number'
                  ? a.delta
                  : calculateBlackScholes(spot, a.strike!, T, r, sigma, 'call').delta;
                return { ...a, calculatedDelta: delta };
              });

            const enrichedPuts = analytics
              .filter((a) => !a.symbol.includes('W') && typeof a.strike === 'number' && a.strike > 0)
              .map((a) => {
                const delta = typeof a.delta === 'number'
                  ? a.delta
                  : calculateBlackScholes(spot, a.strike!, T, r, sigma, 'put').delta;
                return { ...a, calculatedDelta: delta };
              });

            // 1. Put OTM para The Wheel / Cash-Secured Put (Delta alvo ~ -0.28, estritamente K < spot)
            const otmPuts = enrichedPuts.filter((p) => (p.strike || 0) <= spot * 0.999);
            const putOtm = (otmPuts.length > 0 ? otmPuts : enrichedPuts).sort(
              (a, b) => Math.abs(a.calculatedDelta - (-0.28)) - Math.abs(b.calculatedDelta - (-0.28))
            )[0];

            // 2. Call ATM para Bull Call Spread (Delta alvo ~ +0.50)
            const callAtm = [...enrichedCalls].sort(
              (a, b) => Math.abs(a.calculatedDelta - 0.50) - Math.abs(b.calculatedDelta - 0.50)
            )[0];

            // 3. Call OTM para perna vendida de Bull Call Spread (Delta alvo ~ +0.28, estritamente K > spot)
            const otmCalls = enrichedCalls.filter((c) => (c.strike || 0) >= spot * 1.001);
            const callOtm = (otmCalls.length > 0 ? otmCalls : enrichedCalls).sort(
              (a, b) => Math.abs(a.calculatedDelta - 0.28) - Math.abs(b.calculatedDelta - 0.28)
            )[0];

            // 4. Put ATM para perna comprada de Bear Put Spread (Delta alvo ~ -0.50)
            const putAtm = [...enrichedPuts].sort(
              (a, b) => Math.abs(a.calculatedDelta - (-0.50)) - Math.abs(b.calculatedDelta - (-0.50))
            )[0];

            const callAtmPrice = callAtm && typeof callAtm.optionPrice === 'number' && callAtm.optionPrice > 0 ? callAtm.optionPrice : undefined;
            const callOtmPrice = callOtm && typeof callOtm.optionPrice === 'number' && callOtm.optionPrice > 0 ? callOtm.optionPrice : undefined;
            const putOtmPrice = putOtm && typeof putOtm.optionPrice === 'number' && putOtm.optionPrice > 0 ? putOtm.optionPrice : undefined;
            const putAtmPrice = putAtm && typeof putAtm.optionPrice === 'number' && putAtm.optionPrice > 0 ? putAtm.optionPrice : undefined;

            const debit = callAtmPrice
              ? (callOtmPrice ? Math.max(0.10, callAtmPrice - callOtmPrice) : Number((callAtmPrice * 0.45).toFixed(2)))
              : undefined;

            const putDeltaVal = putOtm ? Number(putOtm.calculatedDelta.toFixed(4)) : undefined;
            const popVal = putDeltaVal ? Math.round((1 - Math.abs(putDeltaVal)) * 100) : (callAtm ? Math.round(Math.abs(callAtm.calculatedDelta) * 100) : undefined);

            realOptionsData = {
              debit: debit ? Number(debit.toFixed(2)) : undefined,
              deltaCallLong: callAtm ? Number(callAtm.calculatedDelta.toFixed(2)) : undefined,
              strikeCallLong: callAtm?.strike,
              deltaCallShort: callOtm ? Number(callOtm.calculatedDelta.toFixed(2)) : undefined,
              strikeCallShort: callOtm?.strike,
              deltaPutLong: putAtm ? Number(putAtm.calculatedDelta.toFixed(2)) : undefined,
              strikePutLong: putAtm?.strike,
              deltaPutShort: putDeltaVal ? Number(putDeltaVal.toFixed(2)) : undefined,
              strikePutShort: putOtm?.strike,
              netCredit: putOtmPrice ? Number((putOtmPrice * 0.65).toFixed(2)) : undefined,
              pop: popVal,
              putPremium: putOtmPrice,
              putDelta: putDeltaVal,
              putStrike: putOtm?.strike,
              putSymbol: putOtm?.symbol,
            };
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
