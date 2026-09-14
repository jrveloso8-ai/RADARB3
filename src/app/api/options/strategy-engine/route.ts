import { NextRequest, NextResponse } from 'next/server';
import { brapiService } from '@/lib/services/brapi';
import {
  getB3ExpirationDetails,
  getMostLiquidB3Expiration,
} from '@/lib/domain/options-barriers';
import { getPreviousB3BusinessDay } from '@/lib/domain/b3-calendar';
import { buildOITracking } from '@/lib/domain/options-tracking-5d';
import { computeTop10OI } from '@/lib/domain/options-top10';
import { detectMarketRegime } from '@/lib/domain/options-regime';
import { generateStrategies } from '@/lib/domain/options-strategy-engine';
import { calculateHistoricalVolatility } from '@/lib/domain/volatility';
import { OperatorProfile, StrategyEngineResult } from '@/lib/types/financial';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'PETR4';
  const profileParam = searchParams.get('profile') as OperatorProfile | null;
  const profile = profileParam && ['TATICO', 'ESPECULATIVO', 'CONSERVADOR'].includes(profileParam)
    ? profileParam
    : undefined;

  const availableExpirations = getB3ExpirationDetails();
  const mostLiquid = getMostLiquidB3Expiration(availableExpirations);

  const requestedExp = searchParams.get('expiration');
  const isValidMonthly = availableExpirations.some((e) => e.date === requestedExp);
  const selectedExpiration = isValidMonthly && requestedExp ? requestedExp : mostLiquid.date;
  const selectedInfo = availableExpirations.find((e) => e.date === selectedExpiration);
  const selectedDte = selectedInfo?.dte ?? 0;
  const isRolloverPeriod = selectedDte <= 5;

  try {
    const cleanSymbol = symbol.trim().toUpperCase();

    // 1. Dados reais do ativo-objeto (spot + histórico real de 12 meses)
    const quote = await brapiService.getQuoteWith12MHistory(cleanSymbol).catch(() => ({
      symbol: cleanSymbol,
      regularMarketPrice: 0,
      historicalDataPrice: [],
    }));

    const spotPrice = quote.regularMarketPrice || 0;
    const historicalCandles = quote.historicalDataPrice || [];
    const historicalCloses = historicalCandles.map((c) => c.close);

    // 2. Volatilidade histórica real (21 pregões reais BRAPI)
    const hv21 = calculateHistoricalVolatility(historicalCloses, 21);

    // 3. Datas de D-1 e D-5 (pregões úteis B3)
    const today = new Date();
    const dateD1 = getPreviousB3BusinessDay(today, 1);
    const dateD5 = getPreviousB3BusinessDay(today, 5);

    // 4. Buscar posições reais: Atual, D-1, D-5
    const [currentPosRes, prev1DPosRes, prev5DPosRes] = await Promise.all([
      brapiService.getOptionPositions(cleanSymbol, selectedExpiration).catch(() => ({ positions: [] })),
      brapiService.getOptionPositions(cleanSymbol, selectedExpiration, dateD1).catch(() => ({ positions: [] })),
      brapiService.getOptionPositions(cleanSymbol, selectedExpiration, dateD5).catch(() => ({ positions: [] })),
    ]);

    const currentPositions = currentPosRes?.positions || [];
    const prev1DPositions = prev1DPosRes?.positions || [];
    const prev5DPositions = prev5DPosRes?.positions || [];

    // 5. Construir dados de rastreamento (bandas, barreiras, strikesTable)
    const trackingResult = buildOITracking({
      symbol: cleanSymbol,
      selectedExpiration,
      availableExpirations,
      currentSpot: spotPrice,
      historicalCloses,
      historicalCandles,
      currentPositions,
      prev1DPositions,
      prev5DPositions,
    });

    // 6. Construir Top 10 OI (fluxo, PCR)
    const top10Result = computeTop10OI({
      symbol: cleanSymbol,
      selectedExpiration,
      availableExpirations,
      currentSpot: spotPrice,
      currentPositions,
      prev1DPositions,
      prev5DPositions,
    });

    // 7. Detectar Regime de Mercado (100% dados reais)
    const regime = detectMarketRegime({
      spotBands: trackingResult.spotBands,
      top10Calls: top10Result.top10Calls,
      top10Puts: top10Result.top10Puts,
      totalCallsOI: top10Result.totalCallsOI,
      totalPutsOI: top10Result.totalPutsOI,
      topCallBarrierStrike: trackingResult.topCallOverall?.strike ?? null,
      topPutBarrierStrike: trackingResult.topPutOverall?.strike ?? null,
      hv21,
    });

    // 8. Gerar estratégias (com payoff real e scoring auditável)
    const strategies = generateStrategies({
      regime: { ...regime, spotPrice },
      expiration: selectedExpiration,
      dte: selectedDte,
      hv21,
      profile,
      dataDate: new Date().toISOString().split('T')[0],
    });

    const result: StrategyEngineResult = {
      symbol: cleanSymbol,
      spotPrice,
      selectedExpiration,
      selectedDte,
      isRolloverPeriod,
      hv21,
      regime: { ...regime, spotPrice },
      strategies,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Erro ao gerar estratégias.';
    return NextResponse.json(
      { error: message, available: false, availableExpirations },
      { status: 500 }
    );
  }
}
