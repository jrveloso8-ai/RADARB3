const fs = require('fs');
const path = require('path');

const targetBase = 'C:/projetos antigravity/RADAR-TASYTRADE';

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeFile(relPath, content) {
  const fullPath = path.join(targetBase, relPath);
  ensureDir(fullPath);
  fs.writeFileSync(fullPath, content.trim(), 'utf8');
  console.log('Created: ' + relPath);
}

// 1. API Route: Health Check
writeFile('src/app/api/health/route.ts', `
import { NextResponse } from 'next/server';
import { tastyAuthService } from '@/lib/services/tastytrade-auth.service';

export async function GET() {
  const start = Date.now();
  try {
    const token = await tastyAuthService.getAccessToken();
    const latency = Date.now() - start;
    return NextResponse.json({
      status: 'ONLINE',
      hasToken: Boolean(token),
      latencyMs: latency,
      message: 'Tastytrade Open API conectada e autenticada com sucesso',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'OFFLINE_OR_UNCONFIGURED',
      hasToken: false,
      latencyMs: Date.now() - start,
      message: err?.message || 'Erro de autenticação',
      timestamp: new Date().toISOString(),
    }, { status: 200 });
  }
}
`);

// 2. API Route: Quote
writeFile('src/app/api/market/quote/route.ts', `
import { NextRequest, NextResponse } from 'next/server';
import { tastyMarketService } from '@/lib/services/tastytrade-market.service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'SPY';

  try {
    const data = await tastyMarketService.getQuote(symbol);
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
`);

// 3. API Route: GEX Analysis
writeFile('src/app/api/market/gex/route.ts', `
import { NextRequest, NextResponse } from 'next/server';
import { tastyMarketService } from '@/lib/services/tastytrade-market.service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'SPX';

  try {
    const data = await tastyMarketService.getGexAnalysis(symbol);
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
`);

// 4. Global CSS
writeFile('src/app/globals.css', `
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #070b14;
  --foreground: #f3f4f6;
}

body {
  background-color: #070b14;
  color: #f3f4f6;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #090e18;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #1f293d;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #374151;
}
`);

// 5. Root Layout
writeFile('src/app/layout.tsx', `
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RADAR TASTYTRADE PRO IA - Terminal Quantitativo de Opções e Ações US',
  description: 'Sistema profissional de análise quantitativa de opções, Gamma Exposure (GEX) e cotações da bolsa americana integrado à Tastytrade Open API.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen flex flex-col bg-[#070b14] text-gray-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-300">
        {children}
      </body>
    </html>
  );
}
`);

console.log('API routes and Layout created');
