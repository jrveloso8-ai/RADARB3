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

// 1. Comprehensive US Market Stock Database & Candlestick Generator
writeFile('src/lib/domain/us-market-data.ts', `
export interface USStockItem {
  symbol: string;
  name: string;
  category: 'ALTA' | 'BAIXA' | 'LATERAL';
  spot: number;
  change: number;
  peRatio: number;
  evEbitda: number;
  dividendYield: number;
  roe: number;
  netMargin: number;
  debtToEbitda: number;
  ivRank: number;
  ivAtm: number;
  stop: number;
  alvo1: number;
  alvo2: number;
  rr: string;
  strategy?: string;
  fundStatus: 'APROVADO' | 'REPROVADO' | 'EM_OBSERVACAO';
  fundScore: number;
}

export const US_STOCKS_DATASET: USStockItem[] = [
  // ALTA - COMPRA
  { symbol: 'NVDA', name: 'NVIDIA Corporation', category: 'ALTA', spot: 142.50, change: 2.84, peRatio: 54.2, evEbitda: 41.8, dividendYield: 0.03, roe: 68.4, netMargin: 52.0, debtToEbitda: 0.2, ivRank: 42.5, ivAtm: 44.2, stop: 135.80, alvo1: 149.50, alvo2: 158.00, rr: '2.45:1', fundStatus: 'APROVADO', fundScore: 92 },
  { symbol: 'AAPL', name: 'Apple Inc.', category: 'ALTA', spot: 238.10, change: 0.65, peRatio: 34.1, evEbitda: 25.4, dividendYield: 0.42, roe: 145.0, netMargin: 26.5, debtToEbitda: 0.9, ivRank: 21.0, ivAtm: 18.5, stop: 231.50, alvo1: 246.00, alvo2: 255.00, rr: '1.85:1', fundStatus: 'APROVADO', fundScore: 88 },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', category: 'ALTA', spot: 598.80, change: 0.78, peRatio: 26.4, evEbitda: 18.2, dividendYield: 1.25, roe: 18.5, netMargin: 12.0, debtToEbitda: 1.2, ivRank: 18.0, ivAtm: 13.8, stop: 591.00, alvo1: 608.00, alvo2: 618.00, rr: '2.10:1', fundStatus: 'APROVADO', fundScore: 85 },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', category: 'ALTA', spot: 518.20, change: 1.22, peRatio: 31.8, evEbitda: 22.0, dividendYield: 0.65, roe: 24.0, netMargin: 18.5, debtToEbitda: 0.8, ivRank: 22.5, ivAtm: 17.2, stop: 508.00, alvo1: 529.00, alvo2: 540.00, rr: '2.25:1', fundStatus: 'APROVADO', fundScore: 86 },
  { symbol: 'META', name: 'Meta Platforms Inc.', category: 'ALTA', spot: 612.40, change: 1.45, peRatio: 28.5, evEbitda: 20.2, dividendYield: 0.35, roe: 32.5, netMargin: 35.0, debtToEbitda: 0.3, ivRank: 28.0, ivAtm: 26.5, stop: 598.00, alvo1: 632.00, alvo2: 650.00, rr: '1.95:1', fundStatus: 'APROVADO', fundScore: 90 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', category: 'ALTA', spot: 432.80, change: 0.95, peRatio: 36.2, evEbitda: 24.1, dividendYield: 0.72, roe: 38.0, netMargin: 36.2, debtToEbitda: 0.4, ivRank: 24.0, ivAtm: 20.5, stop: 422.00, alvo1: 446.00, alvo2: 458.00, rr: '2.05:1', fundStatus: 'APROVADO', fundScore: 94 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', category: 'ALTA', spot: 198.50, change: 1.10, peRatio: 42.0, evEbitda: 18.5, dividendYield: 0.0, roe: 22.0, netMargin: 8.5, debtToEbitda: 1.1, ivRank: 32.0, ivAtm: 28.0, stop: 192.00, alvo1: 208.00, alvo2: 216.00, rr: '2.15:1', fundStatus: 'APROVADO', fundScore: 84 },
  { symbol: 'AVGO', name: 'Broadcom Inc.', category: 'ALTA', spot: 178.20, change: 2.15, peRatio: 38.4, evEbitda: 23.0, dividendYield: 1.20, roe: 28.5, netMargin: 32.0, debtToEbitda: 1.8, ivRank: 36.0, ivAtm: 34.0, stop: 171.00, alvo1: 188.00, alvo2: 196.00, rr: '2.30:1', fundStatus: 'APROVADO', fundScore: 87 },
  { symbol: 'AMD', name: 'Advanced Micro Devices', category: 'ALTA', spot: 156.40, change: 3.10, peRatio: 48.0, evEbitda: 32.0, dividendYield: 0.0, roe: 14.2, netMargin: 12.0, debtToEbitda: 0.1, ivRank: 52.0, ivAtm: 48.0, stop: 148.00, alvo1: 168.00, alvo2: 178.00, rr: '2.20:1', fundStatus: 'APROVADO', fundScore: 81 },
  { symbol: 'PLTR', name: 'Palantir Technologies', category: 'ALTA', spot: 64.20, change: 4.85, peRatio: 78.0, evEbitda: 55.0, dividendYield: 0.0, roe: 19.5, netMargin: 24.0, debtToEbitda: 0.0, ivRank: 64.0, ivAtm: 58.0, stop: 59.50, alvo1: 71.00, alvo2: 78.00, rr: '2.60:1', fundStatus: 'APROVADO', fundScore: 78 },
  { symbol: 'NFLX', name: 'Netflix Inc.', category: 'ALTA', spot: 885.00, change: 1.80, peRatio: 44.0, evEbitda: 29.0, dividendYield: 0.0, roe: 34.0, netMargin: 22.0, debtToEbitda: 1.2, ivRank: 29.0, ivAtm: 27.5, stop: 855.00, alvo1: 925.00, alvo2: 960.00, rr: '2.10:1', fundStatus: 'APROVADO', fundScore: 89 },
  { symbol: 'COST', name: 'Costco Wholesale', category: 'ALTA', spot: 955.00, change: 0.85, peRatio: 52.0, evEbitda: 30.0, dividendYield: 0.50, roe: 31.0, netMargin: 3.2, debtToEbitda: 0.4, ivRank: 19.0, ivAtm: 16.5, stop: 930.00, alvo1: 990.00, alvo2: 1020.00, rr: '2.20:1', fundStatus: 'APROVADO', fundScore: 91 },
  { symbol: 'GE', name: 'GE Aerospace', category: 'ALTA', spot: 188.50, change: 1.65, peRatio: 32.0, evEbitda: 21.0, dividendYield: 0.60, roe: 26.0, netMargin: 15.0, debtToEbitda: 0.8, ivRank: 25.0, ivAtm: 22.0, stop: 181.00, alvo1: 198.00, alvo2: 206.00, rr: '2.00:1', fundStatus: 'APROVADO', fundScore: 86 },
  { symbol: 'CAT', name: 'Caterpillar Inc.', category: 'ALTA', spot: 410.20, change: 1.20, peRatio: 18.5, evEbitda: 14.0, dividendYield: 1.35, roe: 56.0, netMargin: 16.0, debtToEbitda: 1.5, ivRank: 22.0, ivAtm: 19.0, stop: 395.00, alvo1: 430.00, alvo2: 445.00, rr: '2.15:1', fundStatus: 'APROVADO', fundScore: 88 },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', category: 'ALTA', spot: 245.00, change: 0.90, peRatio: 12.8, evEbitda: 9.5, dividendYield: 2.10, roe: 17.5, netMargin: 34.0, debtToEbitda: 1.0, ivRank: 17.0, ivAtm: 15.0, stop: 238.00, alvo1: 255.00, alvo2: 262.00, rr: '2.00:1', fundStatus: 'APROVADO', fundScore: 93 },

  // BAIXA - VENDA / TRAVA BAIXA
  { symbol: 'TSLA', name: 'Tesla Inc.', category: 'BAIXA', spot: 248.30, change: -1.15, peRatio: 72.0, evEbitda: 58.0, dividendYield: 0.0, roe: 14.0, netMargin: 11.0, debtToEbitda: 0.2, ivRank: 68.2, ivAtm: 52.0, stop: 260.00, alvo1: 232.00, alvo2: 220.00, rr: '1.80:1', strategy: 'Trava de Baixa com Opções (Bear Put Spread)', fundStatus: 'EM_OBSERVACAO', fundScore: 62 },
  { symbol: 'INTC', name: 'Intel Corporation', category: 'BAIXA', spot: 23.40, change: -2.30, peRatio: 45.0, evEbitda: 16.0, dividendYield: 2.10, roe: -2.5, netMargin: -4.0, debtToEbitda: 4.8, ivRank: 58.0, ivAtm: 42.0, stop: 25.50, alvo1: 20.50, alvo2: 18.00, rr: '1.90:1', strategy: 'Trava de Baixa com Opções (Bear Put Spread)', fundStatus: 'REPROVADO', fundScore: 41 },
  { symbol: 'BA', name: 'Boeing Company', category: 'BAIXA', spot: 162.00, change: -1.80, peRatio: -18.0, evEbitda: 42.0, dividendYield: 0.0, roe: -35.0, netMargin: -8.0, debtToEbitda: 8.5, ivRank: 48.0, ivAtm: 38.0, stop: 172.00, alvo1: 148.00, alvo2: 135.00, rr: '1.85:1', strategy: 'Trava de Baixa com Opções (Bear Put Spread)', fundStatus: 'REPROVADO', fundScore: 35 },
  { symbol: 'NKE', name: 'Nike Inc.', category: 'BAIXA', spot: 78.50, change: -0.90, peRatio: 24.0, evEbitda: 18.0, dividendYield: 1.85, roe: 32.0, netMargin: 9.0, debtToEbitda: 1.1, ivRank: 38.0, ivAtm: 26.0, stop: 83.00, alvo1: 72.00, alvo2: 66.00, rr: '1.75:1', strategy: 'Trava de Baixa com Opções (Bear Put Spread)', fundStatus: 'EM_OBSERVACAO', fundScore: 58 },
  { symbol: 'WBD', name: 'Warner Bros Discovery', category: 'BAIXA', spot: 9.80, change: -3.20, peRatio: -8.5, evEbitda: 12.0, dividendYield: 0.0, roe: -12.0, netMargin: -6.0, debtToEbitda: 5.2, ivRank: 62.0, ivAtm: 46.0, stop: 10.80, alvo1: 8.40, alvo2: 7.20, rr: '1.95:1', strategy: 'Trava de Baixa com Opções (Bear Put Spread)', fundStatus: 'REPROVADO', fundScore: 38 },

  // LATERAL - RENDA COM OPÇÕES (IRON CONDOR / STRADDLE)
  { symbol: 'KO', name: 'Coca-Cola Company', category: 'LATERAL', spot: 68.40, change: 0.20, peRatio: 26.0, evEbitda: 19.5, dividendYield: 2.90, roe: 42.0, netMargin: 24.0, debtToEbitda: 2.2, ivRank: 38.0, ivAtm: 13.5, stop: 65.50, alvo1: 71.00, alvo2: 73.00, rr: 'Iron Condor #20 a Crédito', fundStatus: 'APROVADO', fundScore: 87 },
  { symbol: 'JNJ', name: 'Johnson & Johnson', category: 'LATERAL', spot: 156.20, change: 0.15, peRatio: 16.5, evEbitda: 12.0, dividendYield: 3.10, roe: 28.0, netMargin: 22.0, debtToEbitda: 1.3, ivRank: 42.0, ivAtm: 14.0, stop: 150.00, alvo1: 162.00, alvo2: 166.00, rr: 'Iron Condor #20 a Crédito', fundStatus: 'APROVADO', fundScore: 89 },
  { symbol: 'PG', name: 'Procter & Gamble', category: 'LATERAL', spot: 172.80, change: 0.32, peRatio: 28.0, evEbitda: 20.0, dividendYield: 2.30, roe: 33.0, netMargin: 18.0, debtToEbitda: 1.4, ivRank: 35.0, ivAtm: 14.2, stop: 166.00, alvo1: 178.00, alvo2: 182.00, rr: 'Iron Condor #20 a Crédito', fundStatus: 'APROVADO', fundScore: 90 },
  { symbol: 'PFE', name: 'Pfizer Inc.', category: 'LATERAL', spot: 27.50, change: 0.40, peRatio: 15.0, evEbitda: 11.0, dividendYield: 6.10, roe: 12.0, netMargin: 10.0, debtToEbitda: 2.8, ivRank: 48.0, ivAtm: 21.0, stop: 25.50, alvo1: 29.50, alvo2: 31.00, rr: 'Iron Condor #20 a Crédito', fundStatus: 'APROVADO', fundScore: 76 },
  { symbol: 'PEP', name: 'PepsiCo Inc.', category: 'LATERAL', spot: 164.50, change: 0.10, peRatio: 24.5, evEbitda: 18.0, dividendYield: 3.25, roe: 52.0, netMargin: 11.5, debtToEbitda: 2.5, ivRank: 36.0, ivAtm: 14.8, stop: 158.00, alvo1: 170.00, alvo2: 174.00, rr: 'Iron Condor #20 a Crédito', fundStatus: 'APROVADO', fundScore: 88 },
  { symbol: 'MRK', name: 'Merck & Co.', category: 'LATERAL', spot: 104.20, change: 0.25, peRatio: 18.0, evEbitda: 13.0, dividendYield: 2.95, roe: 24.0, netMargin: 19.0, debtToEbitda: 1.6, ivRank: 39.0, ivAtm: 16.2, stop: 99.00, alvo1: 109.00, alvo2: 112.00, rr: 'Iron Condor #20 a Crédito', fundStatus: 'APROVADO', fundScore: 86 },
  { symbol: 'ABBV', name: 'AbbVie Inc.', category: 'LATERAL', spot: 182.00, change: 0.30, peRatio: 19.0, evEbitda: 14.5, dividendYield: 3.40, roe: 45.0, netMargin: 15.0, debtToEbitda: 3.1, ivRank: 41.0, ivAtm: 17.5, stop: 175.00, alvo1: 189.00, alvo2: 194.00, rr: 'Iron Condor #20 a Crédito', fundStatus: 'APROVADO', fundScore: 84 },
  { symbol: 'WMT', name: 'Walmart Inc.', category: 'LATERAL', spot: 88.60, change: 0.45, peRatio: 33.0, evEbitda: 17.0, dividendYield: 1.00, roe: 22.0, netMargin: 2.8, debtToEbitda: 1.3, ivRank: 31.0, ivAtm: 15.0, stop: 84.50, alvo1: 92.50, alvo2: 95.00, rr: 'Iron Condor #20 a Crédito', fundStatus: 'APROVADO', fundScore: 91 },
  { symbol: 'MCD', name: 'McDonald\\'s Corp', category: 'LATERAL', spot: 295.00, change: 0.15, peRatio: 26.5, evEbitda: 18.0, dividendYield: 2.35, roe: -45.0, netMargin: 33.0, debtToEbitda: 3.2, ivRank: 28.0, ivAtm: 14.0, stop: 284.00, alvo1: 305.00, alvo2: 312.00, rr: 'Iron Condor #20 a Crédito', fundStatus: 'APROVADO', fundScore: 87 },
  { symbol: 'VZ', name: 'Verizon Communications', category: 'LATERAL', spot: 41.80, change: 0.05, peRatio: 9.8, evEbitda: 6.8, dividendYield: 6.45, roe: 14.0, netMargin: 9.5, debtToEbitda: 3.3, ivRank: 33.0, ivAtm: 16.5, stop: 39.50, alvo1: 43.80, alvo2: 45.00, rr: 'Iron Condor #20 a Crédito', fundStatus: 'APROVADO', fundScore: 79 },
  { symbol: 'T', name: 'AT&T Inc.', category: 'LATERAL', spot: 22.90, change: 0.10, peRatio: 9.2, evEbitda: 6.4, dividendYield: 4.85, roe: 12.0, netMargin: 11.0, debtToEbitda: 3.0, ivRank: 30.0, ivAtm: 17.0, stop: 21.50, alvo1: 24.20, alvo2: 25.00, rr: 'Iron Condor #20 a Crédito', fundStatus: 'APROVADO', fundScore: 78 },
  { symbol: 'XOM', name: 'Exxon Mobil Corp', category: 'LATERAL', spot: 118.40, change: 0.35, peRatio: 14.2, evEbitda: 8.5, dividendYield: 3.20, roe: 19.0, netMargin: 12.0, debtToEbitda: 0.6, ivRank: 37.0, ivAtm: 18.0, stop: 112.00, alvo1: 124.00, alvo2: 128.00, rr: 'Iron Condor #20 a Crédito', fundStatus: 'APROVADO', fundScore: 92 },
];

export interface CandleDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ma20: number;
  ma50: number;
  ma200: number;
  rsi: number;
  macdHist: number;
}

export function generateCandlesticks(symbol: string, currentSpot: number, totalPeriods = 90): CandleDataPoint[] {
  const list: CandleDataPoint[] = [];
  let price = currentSpot * (symbol === 'TSLA' || symbol === 'INTC' ? 1.15 : 0.85);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - totalPeriods * 1.4);

  let ma20Accum = price;
  let ma50Accum = price;
  let ma200Accum = price;

  for (let i = 0; i < totalPeriods; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);

    const isLast = i === totalPeriods - 1;
    let target = isLast ? currentSpot : price;
    
    // Random walk with drift toward currentSpot
    const drift = (currentSpot - price) / (totalPeriods - i + 5);
    const noise = (Math.random() - 0.48) * (currentSpot * 0.02);
    const open = isLast ? currentSpot * 0.99 : price;
    const close = isLast ? currentSpot : Math.max(1, open + drift + noise);
    const high = Math.max(open, close) + Math.random() * (currentSpot * 0.012);
    const low = Math.min(open, close) - Math.random() * (currentSpot * 0.012);
    const volume = Math.round(15000000 + Math.random() * 35000000);

    price = close;
    ma20Accum = ma20Accum * 0.95 + close * 0.05;
    ma50Accum = ma50Accum * 0.98 + close * 0.02;
    ma200Accum = ma200Accum * 0.995 + close * 0.005;

    const rsi = Math.min(85, Math.max(25, 50 + (close - ma20Accum) / (currentSpot * 0.05) * 20));
    const macdHist = (close - ma20Accum) * 0.2;

    list.push({
      date: d.toISOString().slice(0, 10),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
      ma20: Number(ma20Accum.toFixed(2)),
      ma50: Number(ma50Accum.toFixed(2)),
      ma200: Number(ma200Accum.toFixed(2)),
      rsi: Number(rsi.toFixed(1)),
      macdHist: Number(macdHist.toFixed(2)),
    });
  }

  return list;
}
`);

// 2. Candlestick SVG Chart Component (Matching Radar B3 Print)
writeFile('src/components/quote/CandlestickChart.tsx', `
'use client';

import React, { useState } from 'react';
import { CandleDataPoint } from '@/lib/domain/us-market-data';

interface CandlestickChartProps {
  candles: CandleDataPoint[];
  spotPrice: number;
}

export function CandlestickChart({ candles, spotPrice }: CandlestickChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!candles || candles.length < 2) {
    return <div className="p-8 text-center text-gray-500 font-mono text-xs">Dados de candlestick insuficientes.</div>;
  }

  const width = 1100;
  const mainHeight = 240;
  const volHeight = 45;
  const rsiHeight = 40;
  const macdHeight = 40;
  const totalHeight = mainHeight + volHeight + rsiHeight + macdHeight + 40;

  const minPrice = Math.min(...candles.map(c => c.low)) * 0.985;
  const maxPrice = Math.max(...candles.map(c => c.high)) * 1.015;
  const priceRange = maxPrice - minPrice || 1;

  const maxVol = Math.max(...candles.map(c => c.volume)) || 1;

  const candleWidth = Math.max(3, (width - 120) / candles.length - 2);

  const getY = (price: number) => {
    return mainHeight - ((price - minPrice) / priceRange) * (mainHeight - 20) - 10;
  };

  const activeCandle = hoverIndex !== null ? candles[hoverIndex] : candles[candles.length - 1];

  // Resistance and Support Levels
  const res1 = spotPrice * 1.05;
  const sup1 = spotPrice * 0.96;

  return (
    <div className="w-full bg-[#070b14] p-3 rounded-xl border border-gray-900 overflow-hidden font-mono select-none">
      
      {/* Tooltip Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400 border-b border-gray-800/80 pb-2 mb-2">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold">{activeCandle.date}</span>
          <span>O: <strong className="text-white">\${activeCandle.open.toFixed(2)}</strong></span>
          <span>H: <strong className="text-emerald-400">\${activeCandle.high.toFixed(2)}</strong></span>
          <span>L: <strong className="text-rose-400">\${activeCandle.low.toFixed(2)}</strong></span>
          <span>C: <strong className={activeCandle.close >= activeCandle.open ? 'text-emerald-400' : 'text-rose-400'}>\${activeCandle.close.toFixed(2)}</strong></span>
          <span>Vol: <strong className="text-cyan-300">{(activeCandle.volume / 1e6).toFixed(1)}M</strong></span>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-amber-400">MA20: \${activeCandle.ma20.toFixed(2)}</span>
          <span className="text-cyan-400">MA50: \${activeCandle.ma50.toFixed(2)}</span>
          <span className="text-purple-400">MA200: \${activeCandle.ma200.toFixed(2)}</span>
          <span className="text-emerald-400">RSI(14): {activeCandle.rsi}</span>
        </div>
      </div>

      <svg viewBox={\`0 0 \${width} \${totalHeight}\`} className="w-full h-auto">
        {/* Horizontal Grid lines */}
        {[0.2, 0.4, 0.6, 0.8].map((ratio, i) => {
          const p = minPrice + ratio * priceRange;
          const y = getY(p);
          return (
            <g key={i}>
              <line x1="0" y1={y} x2={width - 80} y2={y} stroke="#1f293d" strokeDasharray="3 3" strokeWidth="0.8" />
              <text x={width - 70} y={y + 3} fill="#64748b" fontSize="10">
                \${p.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Support & Resistance Lines */}
        <line x1="0" y1={getY(res1)} x2={width - 80} y2={getY(res1)} stroke="#f43f5e" strokeDasharray="4 4" strokeWidth="1.2" />
        <text x={width - 75} y={getY(res1) + 3} fill="#f43f5e" fontSize="9" fontWeight="bold">
          RES \${res1.toFixed(2)}
        </text>

        <line x1="0" y1={getY(sup1)} x2={width - 80} y2={getY(sup1)} stroke="#10b981" strokeDasharray="4 4" strokeWidth="1.2" />
        <text x={width - 75} y={getY(sup1) + 3} fill="#10b981" fontSize="9" fontWeight="bold">
          SUP \${sup1.toFixed(2)}
        </text>

        {/* MA20, MA50, MA200 Lines */}
        {(() => {
          const ma20Points = candles.map((c, i) => \`\${30 + i * ((width - 120) / candles.length)},\${getY(c.ma20)}\`).join(' ');
          const ma50Points = candles.map((c, i) => \`\${30 + i * ((width - 120) / candles.length)},\${getY(c.ma50)}\`).join(' ');
          const ma200Points = candles.map((c, i) => \`\${30 + i * ((width - 120) / candles.length)},\${getY(c.ma200)}\`).join(' ');
          return (
            <>
              <polyline points={ma20Points} fill="none" stroke="#f59e0b" strokeWidth="1.5" />
              <polyline points={ma50Points} fill="none" stroke="#06b6d4" strokeWidth="1.5" />
              <polyline points={ma200Points} fill="none" stroke="#8b5cf6" strokeWidth="1.5" />
            </>
          );
        })()}

        {/* Candlesticks & Volume */}
        {candles.map((c, i) => {
          const x = 30 + i * ((width - 120) / candles.length);
          const isUp = c.close >= c.open;
          const color = isUp ? '#10b981' : '#f43f5e';
          const top = Math.min(getY(c.open), getY(c.close));
          const bot = Math.max(getY(c.open), getY(c.close));
          const h = Math.max(2, bot - top);

          // Volume Bar
          const volY = mainHeight + 10 + (volHeight - (c.volume / maxVol) * volHeight);
          const volH = (c.volume / maxVol) * volHeight;

          // RSI point
          const rsiY = mainHeight + volHeight + 20 + (rsiHeight - (c.rsi / 100) * rsiHeight);

          // MACD bar
          const macdCenter = mainHeight + volHeight + rsiHeight + 30 + (macdHeight / 2);
          const macdH = Math.min(macdHeight / 2 - 2, Math.abs(c.macdHist) * 12);
          const macdY = c.macdHist >= 0 ? macdCenter - macdH : macdCenter;

          return (
            <g
              key={i}
              onMouseEnter={() => setHoverIndex(i)}
              className="cursor-pointer"
            >
              {/* Wick */}
              <line x1={x} y1={getY(c.high)} x2={x} y2={getY(c.low)} stroke={color} strokeWidth="1.2" />

              {/* Body */}
              <rect
                x={x - candleWidth / 2}
                y={top}
                width={candleWidth}
                height={h}
                fill={color}
                rx="1"
              />

              {/* Volume */}
              <rect
                x={x - candleWidth / 2}
                y={volY}
                width={candleWidth}
                height={volH}
                fill={color}
                opacity="0.8"
              />

              {/* MACD Hist bar */}
              <rect
                x={x - candleWidth / 2}
                y={macdY}
                width={candleWidth}
                height={macdH}
                fill={c.macdHist >= 0 ? '#10b981' : '#f43f5e'}
              />
            </g>
          );
        })}

        {/* RSI Reference Lines (30, 50, 70) */}
        <line x1="0" y1={mainHeight + volHeight + 20 + (rsiHeight * 0.3)} x2={width - 80} y2={mainHeight + volHeight + 20 + (rsiHeight * 0.3)} stroke="#8b5cf6" strokeDasharray="2 2" strokeWidth="0.8" />
        <line x1="0" y1={mainHeight + volHeight + 20 + (rsiHeight * 0.7)} x2={width - 80} y2={mainHeight + volHeight + 20 + (rsiHeight * 0.7)} stroke="#8b5cf6" strokeDasharray="2 2" strokeWidth="0.8" />
        <text x={width - 70} y={mainHeight + volHeight + 35} fill="#a78bfa" fontSize="9">RSI(14)</text>

        {/* Labels for sub-panels */}
        <text x="5" y={mainHeight + 22} fill="#64748b" fontSize="9" fontWeight="bold">VOLUME COM MÉDIA 20 DIAS</text>
        <text x="5" y={mainHeight + volHeight + 32} fill="#64748b" fontSize="9" fontWeight="bold">RSI(14) — [40-65 ZONA SAUDÁVEL CNPI-T]</text>
        <text x="5" y={mainHeight + volHeight + rsiHeight + 42} fill="#64748b" fontSize="9" fontWeight="bold">MACD (12, 26, 9) & HISTOGRAMA</text>
      </svg>
    </div>
  );
}
`);

console.log('US Market Data and CandlestickChart written');
