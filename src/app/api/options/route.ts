import { NextRequest, NextResponse } from 'next/server';
import { brapiService } from '@/lib/services/brapi';
import {
  analyzeOptionPositions,
  getB3ExpirationDetails,
} from '@/lib/domain/options-barriers';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || searchParams.get('underlying') || 'PETR4';

  // Obter grade oficial dos vencimentos B3
  const availableExpirations = getB3ExpirationDetails();
  const selectedExpiration =
    searchParams.get('expiration') ||
    searchParams.get('expirationDate') ||
    availableExpirations[0].date;

  try {
    const cleanSymbol = symbol.trim().toUpperCase();

    // 1. Obter cotação atual do ativo-objeto
    let underlyingPrice = 0;
    try {
      const quote = await brapiService.getQuoteWith12MHistory(cleanSymbol);
      underlyingPrice = quote.regularMarketPrice;
    } catch {
      underlyingPrice = 0;
    }

    // 2. Chamar endpoint oficial de posições da BRAPI para Ações B3
    const rawPositionsData = await brapiService.getOptionPositions(cleanSymbol, selectedExpiration);

    // 3. Processar análise e cálculo de barreiras, Max Pain, Top 5 Walls e Grade Straddle
    const analysis = analyzeOptionPositions(
      cleanSymbol,
      underlyingPrice,
      rawPositionsData.positions || [],
      selectedExpiration,
      availableExpirations
    );

    return NextResponse.json(analysis);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao processar mercado de opções.';
    return NextResponse.json(
      { error: message, available: false, availableExpirations },
      { status: 500 }
    );
  }
}
