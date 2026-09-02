import { NextResponse } from 'next/server';
import { calculateMarketSentiment } from '@/lib/domain/sentiment';
import { getLiveMarketOverview } from '@/lib/services/market-quotes';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const liveOverview = await getLiveMarketOverview().catch(() => undefined);
    const report = calculateMarketSentiment(new Date(), liveOverview);

    return NextResponse.json({
      ok: true,
      data: report,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro ao consolidar sentimento 24h de mercado.';
    return NextResponse.json(
      {
        ok: false,
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
