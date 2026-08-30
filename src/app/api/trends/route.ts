import { NextRequest, NextResponse } from 'next/server';
import { brapiService } from '@/lib/services/brapi';
import {
  analyzeAssetTrend,
  generateConsolidatedVerdict,
} from '@/lib/domain/trends';
import { analyzeFundamentals } from '@/lib/domain/fundamentals';
import {
  analyzeOptionPositions,
  buildOptionBarrierAlert,
  getB3ExpirationDetails,
} from '@/lib/domain/options-barriers';
import { calculateHistoricalVolatility, classifyVolatilityRegime } from '@/lib/domain/volatility';
import { TrendAnalysisResult } from '@/lib/types/financial';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam === 'all' ? 200 : limitParam ? parseInt(limitParam, 10) || 60 : 60;

    const expirations = getB3ExpirationDetails();
    const nearestExp = expirations[0]?.date || '2026-09-18';

    // Obter lista dinâmica completa de ações da B3
    const availableStocks = await brapiService.getAvailableStocks(limit);

    const analysisPromises = availableStocks.map(
      async (symbol): Promise<TrendAnalysisResult | null> => {
        try {
          const cleanSymbol = symbol.trim().toUpperCase();

          // 1. Cotação e Histórico 12M
          const quote = await brapiService.getQuoteWith12MHistory(cleanSymbol);

          // 2. Análise Técnica
          const trendAnalysis = analyzeAssetTrend(
            quote.symbol,
            quote.regularMarketPrice,
            quote.regularMarketChangePercent,
            quote.historicalDataPrice,
            quote.shortName
          );

          // 3. Crivo Fundamentalista (CNPI-P)
          let fundamentals;
          try {
            const rawFundamentals = await brapiService.getFundamentals(cleanSymbol);
            fundamentals = analyzeFundamentals(cleanSymbol, rawFundamentals);
          } catch {
            fundamentals = analyzeFundamentals(cleanSymbol, {});
          }

          // 4. Barreiras de Opções no Vencimento Mais Líquido
          let barrierAlert;
          let optionAnalysis;
          try {
            const positionsData = await brapiService.getOptionPositions(cleanSymbol, nearestExp);
            if (positionsData?.positions && positionsData.positions.length > 0) {
              optionAnalysis = analyzeOptionPositions(
                cleanSymbol,
                quote.regularMarketPrice,
                positionsData.positions,
                nearestExp,
                expirations
              );
              barrierAlert = buildOptionBarrierAlert(optionAnalysis);
            }
          } catch {
            barrierAlert = undefined;
          }

          // 5. Regime de Volatilidade & Veredito Consolidado CNPI
          const closes = (quote.historicalDataPrice || []).map((h) => h.close);
          const realHv21 = calculateHistoricalVolatility(closes, 21) ?? 25.0;
          const ivAtmValue = optionAnalysis?.ivAtm?.callIv ?? realHv21;
          const volRegime = classifyVolatilityRegime(ivAtmValue, realHv21);

          const verdict = generateConsolidatedVerdict(
            cleanSymbol,
            quote.regularMarketPrice,
            trendAnalysis.trend,
            fundamentals.status,
            barrierAlert,
            quote.shortName,
            volRegime
          );

          return {
            ...trendAnalysis,
            fundamentals,
            verdict,
          };
        } catch {
          return null;
        }
      }
    );

    const settled = await Promise.all(analysisPromises);
    const validResults = settled.filter((r): r is TrendAnalysisResult => r !== null);

    return NextResponse.json({
      type: 'stocks',
      totalAnalyzed: validResults.length,
      results: validResults,
      updatedAt: new Date().toISOString(),
      requiresToken: validResults.length === 0 && !process.env.BRAPI_API_KEY,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao processar rastreador de tendências.';
    return NextResponse.json(
      { error: message, results: [], totalAnalyzed: 0 },
      { status: 500 }
    );
  }
}
