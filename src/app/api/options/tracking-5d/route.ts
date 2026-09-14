import { NextRequest, NextResponse } from 'next/server';
import { brapiService } from '@/lib/services/brapi';
import {
  getB3ExpirationDetails,
  getMostLiquidB3Expiration,
} from '@/lib/domain/options-barriers';
import { getPreviousB3BusinessDay } from '@/lib/domain/b3-calendar';
import { buildOITracking } from '@/lib/domain/options-tracking-5d';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || searchParams.get('underlying') || 'PETR4';

  const availableExpirations = getB3ExpirationDetails();
  const mostLiquidExpiration = getMostLiquidB3Expiration(availableExpirations);

  const requestedExp = searchParams.get('expiration') || searchParams.get('expirationDate');
  const isValidMonthly = availableExpirations.some((e) => e.date === requestedExp);
  const selectedExpiration = isValidMonthly && requestedExp ? requestedExp : mostLiquidExpiration.date;

  try {
    const cleanSymbol = symbol.trim().toUpperCase();

    // 1. Obter cotação real e histórico diário de 12 meses do ativo-objeto
    const quote = await brapiService.getQuoteWith12MHistory(cleanSymbol).catch(() => ({
      symbol: cleanSymbol,
      regularMarketPrice: 0,
      historicalDataPrice: [],
    }));

    const spotPrice = quote.regularMarketPrice || 0;
    const historicalCandles = quote.historicalDataPrice || [];
    const historicalCloses = historicalCandles.map((c) => c.close);

    // 2. Calcular as datas de D-1 e D-5 pregões úteis na B3
    const today = new Date();
    const dateD1 = getPreviousB3BusinessDay(today, 1);
    const dateD5 = getPreviousB3BusinessDay(today, 5);

    // 3. Buscar posições reais em aberto na BRAPI (Atual, D-1 e D-5)
    const [currentPosRes, prev1DPosRes, prev5DPosRes] = await Promise.all([
      brapiService
        .getOptionPositions(cleanSymbol, selectedExpiration)
        .catch(() => ({ positions: [] })),
      brapiService
        .getOptionPositions(cleanSymbol, selectedExpiration, dateD1)
        .catch(() => ({ positions: [] })),
      brapiService
        .getOptionPositions(cleanSymbol, selectedExpiration, dateD5)
        .catch(() => ({ positions: [] })),
    ]);

    const currentPositions = currentPosRes?.positions || [];
    const prev1DPositions = prev1DPosRes?.positions || [];
    const prev5DPositions = prev5DPosRes?.positions || [];

    // 4. Processar métricas quantitativas com dados 100% reais
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

    return NextResponse.json({
      ...trackingResult,
      dates: {
        current: new Date().toISOString().split('T')[0],
        d1: dateD1,
        d5: dateD5,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Erro ao processar rastreamento de Open Interest.';
    return NextResponse.json(
      { error: message, available: false, availableExpirations },
      { status: 500 }
    );
  }
}
