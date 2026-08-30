import { NextResponse } from 'next/server';
import { brapiService } from '@/lib/services/brapi';

export async function GET() {
  try {
    const health = await brapiService.checkHealth();
    return NextResponse.json(health);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao testar conexão com BRAPI.';
    return NextResponse.json(
      {
        status: 'OFFLINE',
        hasApiKey: false,
        latencyMs: 0,
        message,
        testedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
