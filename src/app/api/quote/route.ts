import { NextRequest, NextResponse } from 'next/server';
import { brapiService } from '@/lib/services/brapi';
import {
  analyzeAssetTrend,
  calculateSMA,
  calculateHistoricalSMA,
  generateConsolidatedVerdict,
} from '@/lib/domain/trends';
import {
  calculateATR,
  calculateMACD,
  calculateRSI,
  calculateSupportResistance,
  calculateVolumeRatio,
  evaluateTechnicalChecklist,
} from '@/lib/domain/indicators';
import { analyzeFundamentals } from '@/lib/domain/fundamentals';
import {
  analyzeOptionPositions,
  buildOptionBarrierAlert,
  getB3ExpirationDetails,
  getMostLiquidB3Expiration,
} from '@/lib/domain/options-barriers';
import { calculateHistoricalVolatility, classifyVolatilityRegime } from '@/lib/domain/volatility';
import { electBestOptionStrategy } from '@/lib/domain/cme-election';
import { resolveOperation } from '@/lib/domain/operation-matrix';
import { buildTradePlan } from '@/lib/domain/trade-plan';
import { RentalAlert } from '@/lib/types/financial';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json(
        { error: 'Parâmetro "symbol" é obrigatório.' },
        { status: 400 }
      );
    }

    const cleanSymbol = symbol.trim().toUpperCase();

    // 1. Cotação e Histórico 12M
    const quote = await brapiService.getQuoteWith12MHistory(cleanSymbol);
    const rawHistory = quote.historicalDataPrice || [];

    // Enriquecer histórico com séries de médias móveis
    const sma20Series = calculateHistoricalSMA(rawHistory, 20);
    const sma50Series = calculateHistoricalSMA(rawHistory, 50);
    const sma200Series = calculateHistoricalSMA(rawHistory, 200);

    const enrichedHistorical = rawHistory.map((item, index) => ({
      ...item,
      sma20: sma20Series[index] ?? undefined,
      sma50: sma50Series[index] ?? undefined,
      sma200: sma200Series[index] ?? undefined,
    }));

    // 2. Análise de Tendência Básica
    const trendAnalysis = analyzeAssetTrend(
      cleanSymbol,
      quote.regularMarketPrice,
      quote.regularMarketChangePercent,
      rawHistory,
      quote.shortName
    );

    // 3. Indicadores Técnicos
    const closes = rawHistory.map((h) => h.close);
    const highs = rawHistory.map((h) => h.high);
    const lows = rawHistory.map((h) => h.low);

    const rsi = calculateRSI(closes, 14);
    const macd = calculateMACD(closes);
    const atr = calculateATR(rawHistory, 14);
    const sma20 = calculateSMA(closes, 20);
    const sma50 = calculateSMA(closes, 50);
    const sma200 = calculateSMA(closes, 200);
    const volumeRatio = calculateVolumeRatio(rawHistory, 20);

    const sr = calculateSupportResistance(rawHistory, quote.regularMarketPrice);
    const checklist = evaluateTechnicalChecklist(
      quote.regularMarketPrice,
      sma20,
      sma50,
      sma200,
      rsi,
      macd?.histogram ?? null,
      volumeRatio
    );

    const indicators = {
      sma20,
      sma50,
      sma200,
      rsi,
      macd,
      atr,
      volumeRatio,
      checklist,
      supports: sr.supports,
      resistances: sr.resistances,
    };

    // 4. Crivo Fundamentalista (CNPI-P v2)
    let fundamentals;
    try {
      const rawFundamentals = await brapiService.getFundamentals(cleanSymbol);
      fundamentals = analyzeFundamentals(cleanSymbol, rawFundamentals);
    } catch {
      fundamentals = analyzeFundamentals(cleanSymbol, {});
    }

    // 5. Decisão Operacional da Matriz (Eixo 1 x Eixo 2)
    const operation = resolveOperation(trendAnalysis.trend, fundamentals.status);

    // 6. Plano de Trade (PR4)
    const tradePlan = buildTradePlan(
      quote.regularMarketPrice,
      trendAnalysis.trend,
      highs,
      lows,
      closes
    );

    // 7. Barreiras de Opções & Analytics (Eixo 3)
    let barrierAlert;
    let optionAnalysis;
    let analyticsItems: import('@/lib/types/financial').OptionAnalyticsItem[] = [];
    const expirations = getB3ExpirationDetails();
    const liquidExp = getMostLiquidB3Expiration(expirations);
    const targetExp = liquidExp.date;

    try {
      const [positionsData, analyticsData] = await Promise.all([
        brapiService.getOptionPositions(cleanSymbol, targetExp).catch(() => ({ positions: [] })),
        brapiService.getOptionAnalytics(cleanSymbol, targetExp).catch(() => ({ analytics: [] })),
      ]);

      analyticsItems = analyticsData?.analytics || [];

      if (positionsData?.positions && positionsData.positions.length > 0) {
        optionAnalysis = analyzeOptionPositions(
          cleanSymbol,
          quote.regularMarketPrice,
          positionsData.positions,
          analyticsItems,
          targetExp,
          expirations,
          closes
        );
        barrierAlert = buildOptionBarrierAlert(optionAnalysis);
      }
    } catch {
      barrierAlert = undefined;
    }

    // 8. Regime de Volatilidade & Veredito Consolidado CNPI
    const realHv21 = calculateHistoricalVolatility(closes, 21) ?? 25.0;
    const ivAtmRaw = optionAnalysis?.ivAtm?.callIv;
    const volRegime =
      ivAtmRaw !== undefined && ivAtmRaw > 0
        ? classifyVolatilityRegime(ivAtmRaw, realHv21)
        : null;

    const verdict = generateConsolidatedVerdict(
      cleanSymbol,
      quote.regularMarketPrice,
      trendAnalysis.trend,
      fundamentals.status,
      barrierAlert,
      quote.shortName,
      volRegime
    );

    // Tratamento especial para SAIDA_STOP na consulta individual (Caso 6 da spec):
    if (operation.operation === 'SAIDA_STOP') {
      verdict.verdictLabel = 'SAÍDA / STOP (GESTÃO DE POSIÇÃO)';
      verdict.actionRecommendation = 'AGUARDAR';
      verdict.rationale = [
        'Tendência de baixa — saída ou stop de posição existente. Nenhuma estrutura nova autorizada.',
      ];
    } else if (operation.operation === 'SEM_OPERACAO') {
      verdict.verdictLabel = 'SEM OPERAÇÃO AUTORIZADA';
      verdict.actionRecommendation = 'BLOQUEADO';
      verdict.rationale = [operation.reason];
    }

    // 9. Eleição da ÚNICA Melhor Estratégia de Opções B3 (Motor Único - Spec v2.1)
    const electedOptionStrategy = electBestOptionStrategy(
      cleanSymbol,
      quote.regularMarketPrice,
      verdict.verdict,
      trendAnalysis.trend,
      rsi,
      realHv21,
      optionAnalysis,
      fundamentals.status,
      analyticsItems
    );

    const rentalAlert: RentalAlert | undefined =
      operation.operation === 'VENDA'
        ? {
            required: true,
            message:
              'Venda à vista exige aluguel (BTC). Confirmar disponibilidade de doador e taxa na corretora antes de executar. Alternativa sem aluguel: trava de baixa com opções.',
          }
        : undefined;

    return NextResponse.json({
      ...quote,
      historicalDataPrice: enrichedHistorical,
      trendAnalysis: {
        ...trendAnalysis,
        fundamentals,
        verdict,
        indicators,
        operation,
        tradePlan,
        rentalAlert,
      },
      fundamentals,
      indicators,          // ← Exposto no nível raiz conforme Spec v2.1 (A1)
      barrierAlert,
      verdict,
      operation,
      tradePlan,
      rentalAlert,
      optionAnalysis,
      electedOptionStrategy,
      selectedExpiration: targetExp,
      availableExpirations: expirations,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao processar consulta de ativo.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
