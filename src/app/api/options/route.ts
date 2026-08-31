import { NextRequest, NextResponse } from 'next/server';
import { brapiService } from '@/lib/services/brapi';
import {
  analyzeOptionPositions,
  getB3ExpirationDetails,
  getMostLiquidB3Expiration,
  buildOptionBarrierAlert,
} from '@/lib/domain/options-barriers';
import { analyzeAssetTrend, generateConsolidatedVerdict } from '@/lib/domain/trends';
import { calculateRSI } from '@/lib/domain/indicators';
import { analyzeFundamentals } from '@/lib/domain/fundamentals';
import { resolveOperation } from '@/lib/domain/operation-matrix';
import { calculateHistoricalVolatility, classifyVolatilityRegime } from '@/lib/domain/volatility';
import { electBestOptionStrategy } from '@/lib/domain/cme-election';
import { OptionAnalyticsItem } from '@/lib/types/financial';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || searchParams.get('underlying') || 'PETR4';

  // Obter grade oficial dos vencimentos B3
  const availableExpirations = getB3ExpirationDetails();
  const mostLiquidExpiration = getMostLiquidB3Expiration(availableExpirations);
  const selectedExpiration =
    searchParams.get('expiration') ||
    searchParams.get('expirationDate') ||
    mostLiquidExpiration.date;

  try {
    const cleanSymbol = symbol.trim().toUpperCase();

    // 1. Obter cotação e histórico de 12M do ativo-objeto
    let quote;
    let rawHistory: import('@/lib/types/financial').HistoricalPrice[] = [];
    let closes: number[] = [];
    try {
      quote = await brapiService.getQuoteWith12MHistory(cleanSymbol);
      rawHistory = quote.historicalDataPrice || [];
      closes = rawHistory.map((h) => h.close);
    } catch {
      quote = {
        symbol: cleanSymbol,
        shortName: cleanSymbol,
        regularMarketPrice: 0,
        regularMarketChangePercent: 0,
        historicalDataPrice: [],
      };
    }

    const spotPrice = quote.regularMarketPrice || 0;
    const trendAnalysis = analyzeAssetTrend(
      cleanSymbol,
      spotPrice,
      quote.regularMarketChangePercent || 0,
      rawHistory,
      quote.shortName
    );
    const rsi = calculateRSI(closes, 14);

    // 2. Fundamentos
    let fundamentals;
    try {
      const rawFundamentals = await brapiService.getFundamentals(cleanSymbol);
      fundamentals = analyzeFundamentals(cleanSymbol, rawFundamentals);
    } catch {
      fundamentals = analyzeFundamentals(cleanSymbol, {});
    }

    const operation = resolveOperation(trendAnalysis.trend, fundamentals.status);

    // 3. Posições e Analytics
    let rawPositionsData: { positions?: import('@/lib/types/financial').OptionPositionItem[] } = { positions: [] };
    let analyticsData: { analytics?: OptionAnalyticsItem[] } = { analytics: [] };
    let analyticsItems: OptionAnalyticsItem[] = [];

    try {
      const [pos, an] = await Promise.all([
        brapiService.getOptionPositions(cleanSymbol, selectedExpiration).catch(() => ({ positions: [] as import('@/lib/types/financial').OptionPositionItem[] })),
        brapiService.getOptionAnalytics(cleanSymbol, selectedExpiration).catch(() => ({ analytics: [] as OptionAnalyticsItem[] })),
      ]);
      rawPositionsData = pos;
      analyticsData = an;
      analyticsItems = an?.analytics || [];
    } catch {
      // Falha tratada
    }

    // 4. Barreiras e Análise
    const analysis = analyzeOptionPositions(
      cleanSymbol,
      spotPrice,
      rawPositionsData.positions || [],
      analyticsItems,
      selectedExpiration,
      availableExpirations,
      closes
    );

    const barrierAlert = buildOptionBarrierAlert(analysis);

    // 5. Volatilidade e Veredito
    const realHv21 = calculateHistoricalVolatility(closes, 21) ?? 25.0;
    const ivAtmRaw = analysis?.ivAtm?.callIv;
    const volRegime =
      ivAtmRaw !== undefined && ivAtmRaw > 0
        ? classifyVolatilityRegime(ivAtmRaw, realHv21)
        : null;

    const verdict = generateConsolidatedVerdict(
      cleanSymbol,
      spotPrice,
      trendAnalysis.trend,
      fundamentals.status,
      barrierAlert,
      quote.shortName,
      volRegime
    );

    // 6. Eleição da Estrutura de Opções
    const electedOptionStrategy = electBestOptionStrategy(
      cleanSymbol,
      spotPrice,
      verdict.verdict,
      trendAnalysis.trend,
      rsi,
      realHv21,
      analysis,
      fundamentals.status,
      analyticsItems
    );

    return NextResponse.json({
      ...analysis,
      electedOptionStrategy,
      operation,
      fundamentals,
      priceContext: electedOptionStrategy?.priceContext,
      verdict,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao processar mercado de opções.';
    return NextResponse.json(
      { error: message, available: false, availableExpirations },
      { status: 500 }
    );
  }
}
