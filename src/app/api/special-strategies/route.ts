import { NextRequest, NextResponse } from 'next/server';
import { brapiService } from '@/lib/services/brapi';
import { getB3ExpirationDetails } from '@/lib/domain/options-barriers';
import {
  screenDITMStockReplacement,
  screenPoorMansCoveredCall,
  screenCashSecuredPuts,
} from '@/lib/domain/special-strategies';
import { OptionAnalyticsItem } from '@/lib/types/financial';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'PETR4';
  const cleanSymbol = symbol.trim().toUpperCase();

  try {
    // 1. Obter cotação em tempo real e histórico de 12 meses (closes reais)
    let quote;
    let closes: number[] = [];
    try {
      quote = await brapiService.getQuoteWith12MHistory(cleanSymbol);
      closes = (quote.historicalDataPrice || []).map((h) => h.close).filter((c) => c > 0);
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

    // 2. Identificar vencimentos oficiais da B3
    const allExpirations = getB3ExpirationDetails();

    // Vencimento Curto (para perna vendida mensal e venda de Put: ~20 a 35 dias úteis)
    // Se o vencimento 0 estiver muito próximo do fim (DTE < 5), usamos o índice 1
    const shortExp = (allExpirations[0]?.dte >= 5 ? allExpirations[0] : allExpirations[1]) || allExpirations[1] || allExpirations[0];
    const shortExpDate = shortExp?.date || '';

    // Vencimentos Longos (para perna comprada DITM: 3 a 6 meses adiante)
    const eligibleLongExpirations = allExpirations.filter((exp, idx) => {
      return idx >= 3 && idx <= 6;
    });
    const eligibleLongDates = eligibleLongExpirations.map((e) => e.date);

    // 3. Consultar analytics reais da BRAPI em paralelo para o vencimento curto e para os longos
    const shortOptionsAnalytics: OptionAnalyticsItem[] = [];
    const allLongOptionsAnalytics: OptionAnalyticsItem[] = [];

    const shortFetchPromise = (async () => {
      if (!shortExpDate) return;
      try {
        const res = await brapiService.getOptionAnalytics(cleanSymbol, shortExpDate);
        if (res?.analytics && Array.isArray(res.analytics)) {
          const mapped = res.analytics.map((item) => ({
            ...item,
            expirationDate: item.expirationDate || shortExpDate,
            underlyingSymbol: item.underlyingSymbol || cleanSymbol,
          }));
          shortOptionsAnalytics.push(...mapped);
        }
      } catch {
        // Ignora silenciosamente
      }
    })();

    const longFetchPromises = eligibleLongDates.map(async (expDate) => {
      try {
        const res = await brapiService.getOptionAnalytics(cleanSymbol, expDate);
        if (res?.analytics && Array.isArray(res.analytics)) {
          const mapped = res.analytics.map((item) => ({
            ...item,
            expirationDate: item.expirationDate || expDate,
            underlyingSymbol: item.underlyingSymbol || cleanSymbol,
          }));
          allLongOptionsAnalytics.push(...mapped);
        }
      } catch {
        // Ignora silenciosamente
      }
    });

    await Promise.all([shortFetchPromise, ...longFetchPromises]);

    // 4. Executar screenings matemáticos determinísticos
    // A. Estratégia 1: Compra de Call DITM (Stock Replacement)
    const ditmResult = screenDITMStockReplacement(
      cleanSymbol,
      spotPrice,
      allLongOptionsAnalytics,
      closes,
      eligibleLongDates
    );

    // B. Estratégia 2: Venda Coberta Sintética (Poor Man's Covered Call)
    const pmccResult = screenPoorMansCoveredCall(
      cleanSymbol,
      spotPrice,
      shortOptionsAnalytics,
      allLongOptionsAnalytics,
      closes,
      shortExpDate,
      eligibleLongDates
    );

    // C. Estratégia 3: Venda de Puts OTM (Cash-Secured Put / Compra com Desconto)
    const cashSecuredPutResult = screenCashSecuredPuts({
      spotPrice,
      options: shortOptionsAnalytics,
      closes,
      targetExpirationDate: shortExpDate,
    });

    return NextResponse.json({
      success: true,
      underlyingSymbol: cleanSymbol,
      spotPrice,
      timing: ditmResult.timing,
      // Estruturas segregadas por estratégia
      ditm: ditmResult,
      pmcc: pmccResult,
      cashSecuredPut: cashSecuredPutResult,
      // Retrocompatibilidade direta
      candidates: ditmResult.candidates,
      eligibleExpirations: eligibleLongDates,
      totalOptionsAnalyzed: ditmResult.totalOptionsAnalyzed,
      screenedAt: ditmResult.screenedAt,
      quote: {
        symbol: cleanSymbol,
        shortName: quote.shortName || cleanSymbol,
        regularMarketPrice: spotPrice,
        regularMarketChangePercent: quote.regularMarketChangePercent || 0,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao processar estratégias especiais';
    return NextResponse.json(
      {
        success: false,
        error: message,
        underlyingSymbol: cleanSymbol,
        spotPrice: 0,
        candidates: [],
        eligibleExpirations: [],
        totalOptionsAnalyzed: 0,
      },
      { status: 500 }
    );
  }
}
