import { NextRequest, NextResponse } from 'next/server';
import { brapiService } from '@/lib/services/brapi';
import { analyzeAssetTrend } from '@/lib/domain/trends';
import { analyzeFundamentals } from '@/lib/domain/fundamentals';
import {
  analyzeOptionPositions,
  buildOptionBarrierAlert,
  getB3ExpirationDetails,
  getMostLiquidB3Expiration,
} from '@/lib/domain/options-barriers';
import { calculateHistoricalVolatility, classifyVolatilityRegime } from '@/lib/domain/volatility';
import { resolveOperation } from '@/lib/domain/operation-matrix';
import { buildTradePlan } from '@/lib/domain/trade-plan';
import { electBestOptionStrategy } from '@/lib/domain/cme-election';
import { AssetDecisionResult, RentalAlert } from '@/lib/types/financial';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam === 'all' ? 200 : limitParam ? parseInt(limitParam, 10) || 60 : 60;

    const expirations = getB3ExpirationDetails();
    const liquidExp = getMostLiquidB3Expiration(expirations);
    const nearestExp = liquidExp.date;

    // Obter lista dinâmica de ações da B3
    const availableStocks = await brapiService.getAvailableStocks(limit);

    const staticRentalAlert: RentalAlert = {
      required: true,
      message:
        'Venda à vista exige aluguel (BTC). Confirmar disponibilidade de doador e taxa na corretora antes de executar. Alternativa sem aluguel: trava de baixa com opções.',
    };

    const analysisPromises = availableStocks.map(
      async (symbol): Promise<AssetDecisionResult | null> => {
        try {
          const cleanSymbol = symbol.trim().toUpperCase();

          // 1. Cotação e Histórico 12M
          const quote = await brapiService.getQuoteWith12MHistory(cleanSymbol);
          const history = quote.historicalDataPrice || [];
          const closes = history.map((h) => h.close);
          const highs = history.map((h) => h.high);
          const lows = history.map((h) => h.low);

          // 2. Análise Técnica (Eixo 1)
          const trendAnalysis = analyzeAssetTrend(
            quote.symbol,
            quote.regularMarketPrice,
            quote.regularMarketChangePercent,
            history,
            quote.shortName
          );

          // 3. Crivo Fundamentalista (Eixo 2 - CNPI-P v2)
          let fundamentals;
          try {
            const rawFundamentals = await brapiService.getFundamentals(cleanSymbol);
            fundamentals = analyzeFundamentals(cleanSymbol, rawFundamentals);
          } catch {
            fundamentals = analyzeFundamentals(cleanSymbol, {});
          }

          // 4. Decisão Operacional da Matriz (Eixo 1 x Eixo 2)
          const operation = resolveOperation(trendAnalysis.trend, fundamentals.status);

          // 5. Plano de Trade (PR4)
          const tradePlan = buildTradePlan(
            quote.regularMarketPrice,
            trendAnalysis.trend,
            highs,
            lows,
            closes
          );

          // 6. Opções & Barreiras Institucionais (Eixo 3 - Analytics + Positions)
          const realHv21 = calculateHistoricalVolatility(closes, 21) ?? 25.0;
          let barrierAlert;
          let optionAnalysis;
          let optionStructure = null;

          try {
            const [positionsData, analyticsData] = await Promise.all([
              brapiService.getOptionPositions(cleanSymbol, nearestExp).catch(() => ({ positions: [] })),
              brapiService.getOptionAnalytics(cleanSymbol, nearestExp).catch(() => ({ analytics: [] })),
            ]);

            if (positionsData?.positions && positionsData.positions.length > 0) {
              optionAnalysis = analyzeOptionPositions(
                cleanSymbol,
                quote.regularMarketPrice,
                positionsData.positions,
                analyticsData?.analytics || [],
                nearestExp,
                expirations,
                closes
              );
              barrierAlert = buildOptionBarrierAlert(optionAnalysis);

              // Eleição de Estratégia de Opções
              optionStructure = electBestOptionStrategy(
                cleanSymbol,
                quote.regularMarketPrice,
                operation.operation === 'COMPRA'
                  ? 'COMPRA_FORTE'
                  : operation.operation === 'VENDA'
                  ? 'VENDA_FORTE'
                  : 'LATERAL_IRON_CONDOR',
                trendAnalysis.trend,
                50,
                realHv21,
                optionAnalysis,
                fundamentals.status
              );
            }
          } catch {
            barrierAlert = undefined;
          }

          const result: AssetDecisionResult = {
            symbol: cleanSymbol,
            shortName: quote.shortName || cleanSymbol,
            currentPrice: quote.regularMarketPrice,
            changePercent: quote.regularMarketChangePercent,
            trend: trendAnalysis.trend,
            movingAverages: trendAnalysis.movingAverages,
            fundamentals,
            operation,
            tradePlan,
            optionStructure,
            barrierAlert,
            rentalAlert: operation.operation === 'VENDA' ? staticRentalAlert : undefined,
            updatedAt: new Date().toISOString(),
          };

          return result;
        } catch {
          return null;
        }
      }
    );

    const settled = await Promise.all(analysisPromises);
    const validResults = settled.filter((r): r is AssetDecisionResult => r !== null);

    // Separar estritamente nas 3 Listas Acionáveis (Spec v2):
    // Apenas ativos com listedInTracker === true entram no rastreador
    const altaList = validResults.filter((r) => r.operation.operation === 'COMPRA' && r.operation.listedInTracker);
    const baixaList = validResults.filter((r) => r.operation.operation === 'VENDA' && r.operation.listedInTracker);
    const lateralList = validResults.filter((r) => r.operation.operation === 'IRON_CONDOR' && r.operation.listedInTracker);

    return NextResponse.json({
      type: 'stocks',
      totalAnalyzed: validResults.length,
      lists: {
        alta: altaList,
        baixa: baixaList,
        lateral: lateralList,
      },
      results: [...altaList, ...baixaList, ...lateralList],
      updatedAt: new Date().toISOString(),
      requiresToken: validResults.length === 0 && !process.env.BRAPI_API_KEY,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao processar rastreador de tendências.';
    return NextResponse.json(
      {
        error: message,
        totalAnalyzed: 0,
        lists: { alta: [], baixa: [], lateral: [] },
        results: [],
      },
      { status: 500 }
    );
  }
}
