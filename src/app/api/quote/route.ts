import { NextRequest, NextResponse } from 'next/server';
import { brapiService } from '@/lib/services/brapi';
import {
  analyzeAssetTrend,
  calculateHistoricalSMA,
  generateConsolidatedVerdict,
} from '@/lib/domain/trends';
import { analyzeFundamentals } from '@/lib/domain/fundamentals';
import {
  analyzeOptionPositions,
  buildOptionBarrierAlert,
  getB3ExpirationDetails,
} from '@/lib/domain/options-barriers';
import {
  calculateATR,
  calculateHistoricalRSI,
  calculateMACD,
  calculateRiskReward,
  calculateRSI,
  calculateSupportResistance,
  calculateVolumeRatio,
  evaluateTechnicalChecklist,
} from '@/lib/domain/indicators';
import { buildSuggestedOptionStructure } from '@/lib/domain/options-structures';
import { electBestCMEStrategy } from '@/lib/domain/cme-election';
import { calculateHistoricalVolatility, classifyVolatilityRegime } from '@/lib/domain/volatility';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json(
      { error: 'Parâmetro symbol é obrigatório (ex: ?symbol=PETR4).' },
      { status: 400 }
    );
  }

  try {
    const cleanSymbol = symbol.trim().toUpperCase();

    // 1. Obter cotação e histórico de 12 meses
    const quote = await brapiService.getQuoteWith12MHistory(cleanSymbol);
    const closes = quote.historicalDataPrice.map((h) => h.close);

    // 2. Análise Técnica (MM20, MM50 e MM200)
    const trendAnalysis = analyzeAssetTrend(
      quote.symbol,
      quote.regularMarketPrice,
      quote.regularMarketChangePercent,
      quote.historicalDataPrice,
      quote.shortName
    );

    // Calcular séries de médias móveis para o gráfico
    const mm20Series = calculateHistoricalSMA(quote.historicalDataPrice, 20);
    const mm50Series = calculateHistoricalSMA(quote.historicalDataPrice, 50);
    const mm200Series = calculateHistoricalSMA(quote.historicalDataPrice, 200);
    const rsiSeries = calculateHistoricalRSI(closes, 14);

    const enrichedHistorical = quote.historicalDataPrice.map((item, index) => ({
      ...item,
      mm20: mm20Series[index],
      mm50: mm50Series[index],
      mm200: mm200Series[index],
      rsi: rsiSeries[index],
    }));

    // 3. Indicadores CNPI-T Avançados
    const rsi = calculateRSI(closes, 14);
    const macd = calculateMACD(closes);
    const atr = calculateATR(quote.historicalDataPrice, 14);
    const volumeRatio = calculateVolumeRatio(quote.historicalDataPrice, 20);
    const { supports, resistances } = calculateSupportResistance(
      quote.historicalDataPrice,
      quote.regularMarketPrice
    );

    const checklist = evaluateTechnicalChecklist(
      quote.regularMarketPrice,
      trendAnalysis.movingAverages.mm20,
      trendAnalysis.movingAverages.mm50,
      trendAnalysis.movingAverages.mm200,
      rsi,
      macd.histogram,
      volumeRatio
    );

    const riskReward = calculateRiskReward(
      quote.regularMarketPrice,
      trendAnalysis.trend,
      atr,
      supports,
      resistances
    );

    const indicators = {
      rsi,
      macd,
      atr,
      volumeRatio,
      checklist,
      riskReward,
    };

    // 4. Crivo Fundamentalista (CNPI-P)
    let fundamentals;
    try {
      const rawFundamentals = await brapiService.getFundamentals(cleanSymbol);
      fundamentals = analyzeFundamentals(cleanSymbol, rawFundamentals);
    } catch {
      fundamentals = analyzeFundamentals(cleanSymbol, {});
    }

    // 5. Barreiras de Opções no Vencimento Mais Líquido
    let barrierAlert;
    let optionAnalysis;
    try {
      const expirations = getB3ExpirationDetails();
      const nearestExp = expirations[0]?.date || '2026-09-18';
      const positionsData = await brapiService.getOptionPositions(cleanSymbol, nearestExp);

      if (positionsData?.positions && positionsData.positions.length > 0) {
        optionAnalysis = analyzeOptionPositions(
          cleanSymbol,
          quote.regularMarketPrice,
          positionsData.positions,
          nearestExp,
          expirations,
          closes
        );
        barrierAlert = buildOptionBarrierAlert(optionAnalysis);
      }
    } catch {
      barrierAlert = undefined;
    }

    // 6. Regime de Volatilidade & Veredito Consolidado CNPI
    // realHv21: Volatilidade Histórica de 21 pregões (fallback 25% se histórico insuficiente)
    const realHv21 = calculateHistoricalVolatility(closes, 21) ?? 25.0;
    // ivAtm: Volatilidade Implícita ATM real das opções; fallback para HV se opções indisponíveis
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

    // 7. Estrutura Genérica & Eleição da ÚNICA Melhor Estratégia CME Group
    const suggestedStructure = buildSuggestedOptionStructure(
      cleanSymbol,
      quote.regularMarketPrice,
      verdict.verdict,
      optionAnalysis
    );

    const electedOptionStrategy = electBestCMEStrategy(
      cleanSymbol,
      quote.regularMarketPrice,
      verdict.verdict,
      trendAnalysis.trend,
      rsi,
      realHv21,
      optionAnalysis,
      fundamentals.status
    );

    return NextResponse.json({
      ...quote,
      historicalDataPrice: enrichedHistorical,
      trendAnalysis: {
        ...trendAnalysis,
        fundamentals,
        verdict,
        indicators,
      },
      fundamentals,
      barrierAlert,
      verdict,
      indicators,
      suggestedStructure,
      electedOptionStrategy,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao processar consulta de cotação.';
    return NextResponse.json(
      { error: message, available: false },
      { status: 404 }
    );
  }
}
