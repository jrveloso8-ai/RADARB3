const fs = require('fs');
const path = require('path');

const targetBase = 'C:/projetos antigravity/RADAR-TASYTRADE';

const sp500Raw = [
  // Tech & Communication
  { s: 'NVDA', n: 'NVIDIA Corporation', sec: 'Tecnologia', p: 142.50, c: 'ALTA' },
  { s: 'AAPL', n: 'Apple Inc.', sec: 'Tecnologia', p: 238.10, c: 'ALTA' },
  { s: 'MSFT', n: 'Microsoft Corporation', sec: 'Tecnologia', p: 432.80, c: 'ALTA' },
  { s: 'AMZN', n: 'Amazon.com Inc.', sec: 'Consumo Cíclico', p: 198.50, c: 'ALTA' },
  { s: 'GOOGL', n: 'Alphabet Inc. (Class A)', sec: 'Comunicação', p: 175.20, c: 'ALTA' },
  { s: 'GOOG', n: 'Alphabet Inc. (Class C)', sec: 'Comunicação', p: 176.40, c: 'ALTA' },
  { s: 'META', n: 'Meta Platforms Inc.', sec: 'Comunicação', p: 612.40, c: 'ALTA' },
  { s: 'AVGO', n: 'Broadcom Inc.', sec: 'Tecnologia', p: 178.20, c: 'ALTA' },
  { s: 'TSLA', n: 'Tesla Inc.', sec: 'Consumo Cíclico', p: 248.30, c: 'BAIXA' },
  { s: 'AMD', n: 'Advanced Micro Devices', sec: 'Tecnologia', p: 156.40, c: 'ALTA' },
  { s: 'NFLX', n: 'Netflix Inc.', sec: 'Comunicação', p: 885.00, c: 'ALTA' },
  { s: 'CRM', n: 'Salesforce Inc.', sec: 'Tecnologia', p: 320.00, c: 'ALTA' },
  { s: 'ORCL', n: 'Oracle Corporation', sec: 'Tecnologia', p: 185.40, c: 'ALTA' },
  { s: 'CSCO', n: 'Cisco Systems Inc.', sec: 'Tecnologia', p: 58.20, c: 'LATERAL' },
  { s: 'ADBE', n: 'Adobe Inc.', sec: 'Tecnologia', p: 512.00, c: 'ALTA' },
  { s: 'QCOM', n: 'QUALCOMM Inc.', sec: 'Tecnologia', p: 168.50, c: 'ALTA' },
  { s: 'TXN', n: 'Texas Instruments', sec: 'Tecnologia', p: 205.00, c: 'LATERAL' },
  { s: 'INTC', n: 'Intel Corporation', sec: 'Tecnologia', p: 23.40, c: 'BAIXA' },
  { s: 'INTU', n: 'Intuit Inc.', sec: 'Tecnologia', p: 650.00, c: 'ALTA' },
  { s: 'AMAT', n: 'Applied Materials', sec: 'Tecnologia', p: 215.00, c: 'ALTA' },
  { s: 'MU', n: 'Micron Technology', sec: 'Tecnologia', p: 108.00, c: 'ALTA' },
  { s: 'LRCX', n: 'Lam Research Corp', sec: 'Tecnologia', p: 82.50, c: 'ALTA' },
  { s: 'NOW', n: 'ServiceNow Inc.', sec: 'Tecnologia', p: 940.00, c: 'ALTA' },
  { s: 'PANW', n: 'Palo Alto Networks', sec: 'Tecnologia', p: 385.00, c: 'ALTA' },
  { s: 'KLAC', n: 'KLA Corporation', sec: 'Tecnologia', p: 740.00, c: 'ALTA' },
  { s: 'SNPS', n: 'Synopsys Inc.', sec: 'Tecnologia', p: 540.00, c: 'ALTA' },
  { s: 'CDNS', n: 'Cadence Design Systems', sec: 'Tecnologia', p: 295.00, c: 'ALTA' },
  { s: 'ADI', n: 'Analog Devices Inc.', sec: 'Tecnologia', p: 228.00, c: 'LATERAL' },
  { s: 'MRVL', n: 'Marvell Technology', sec: 'Tecnologia', p: 89.50, c: 'ALTA' },
  { s: 'FTNT', n: 'Fortinet Inc.', sec: 'Tecnologia', p: 88.00, c: 'ALTA' },
  { s: 'ANET', n: 'Arista Networks', sec: 'Tecnologia', p: 390.00, c: 'ALTA' },
  { s: 'PLTR', n: 'Palantir Technologies', sec: 'Tecnologia', p: 64.20, c: 'ALTA' },
  { s: 'CRWD', n: 'CrowdStrike Holdings', sec: 'Tecnologia', p: 345.00, c: 'ALTA' },
  { s: 'IBM', n: 'International Business Machines', sec: 'Tecnologia', p: 220.00, c: 'ALTA' },
  { s: 'ACN', n: 'Accenture plc', sec: 'Tecnologia', p: 360.00, c: 'LATERAL' },

  // Financials
  { s: 'JPM', n: 'JPMorgan Chase & Co.', sec: 'Financeiro', p: 245.00, c: 'ALTA' },
  { s: 'BAC', n: 'Bank of America Corp', sec: 'Financeiro', p: 44.50, c: 'ALTA' },
  { s: 'WFC', n: 'Wells Fargo & Co', sec: 'Financeiro', p: 68.20, c: 'ALTA' },
  { s: 'C', n: 'Citigroup Inc.', sec: 'Financeiro', p: 69.50, c: 'ALTA' },
  { s: 'GS', n: 'Goldman Sachs Group', sec: 'Financeiro', p: 580.00, c: 'ALTA' },
  { s: 'MS', n: 'Morgan Stanley', sec: 'Financeiro', p: 124.00, c: 'ALTA' },
  { s: 'V', n: 'Visa Inc. (Class A)', sec: 'Financeiro', p: 310.00, c: 'ALTA' },
  { s: 'MA', n: 'Mastercard Inc. (Class A)', sec: 'Financeiro', p: 520.00, c: 'ALTA' },
  { s: 'AXP', n: 'American Express Co', sec: 'Financeiro', p: 285.00, c: 'ALTA' },
  { s: 'BLK', n: 'BlackRock Inc.', sec: 'Financeiro', p: 990.00, c: 'ALTA' },
  { s: 'SCHW', n: 'Charles Schwab Corp', sec: 'Financeiro', p: 78.00, c: 'ALTA' },
  { s: 'SPGI', n: 'S&P Global Inc.', sec: 'Financeiro', p: 510.00, c: 'ALTA' },
  { s: 'MCO', n: "Moody's Corp", sec: 'Financeiro', p: 470.00, c: 'ALTA' },
  { s: 'PGR', n: 'Progressive Corp', sec: 'Financeiro', p: 255.00, c: 'ALTA' },
  { s: 'CB', n: 'Chubb Limited', sec: 'Financeiro', p: 280.00, c: 'ALTA' },
  { s: 'MMC', n: 'Marsh & McLennan', sec: 'Financeiro', p: 225.00, c: 'LATERAL' },
  { s: 'AON', n: 'Aon plc', sec: 'Financeiro', p: 360.00, c: 'LATERAL' },
  { s: 'TRV', n: 'The Travelers Companies', sec: 'Financeiro', p: 240.00, c: 'ALTA' },
  { s: 'USB', n: 'U.S. Bancorp', sec: 'Financeiro', p: 48.50, c: 'LATERAL' },
  { s: 'PNC', n: 'PNC Financial Services', sec: 'Financeiro', p: 195.00, c: 'ALTA' },

  // Healthcare
  { s: 'LLY', n: 'Eli Lilly and Company', sec: 'Saúde', p: 850.00, c: 'ALTA' },
  { s: 'UNH', n: 'UnitedHealth Group', sec: 'Saúde', p: 585.00, c: 'ALTA' },
  { s: 'JNJ', n: 'Johnson & Johnson', sec: 'Saúde', p: 156.20, c: 'LATERAL' },
  { s: 'ABBV', n: 'AbbVie Inc.', sec: 'Saúde', p: 182.00, c: 'LATERAL' },
  { s: 'MRK', n: 'Merck & Co. Inc.', sec: 'Saúde', p: 104.20, c: 'LATERAL' },
  { s: 'TMO', n: 'Thermo Fisher Scientific', sec: 'Saúde', p: 540.00, c: 'LATERAL' },
  { s: 'ABT', n: 'Abbott Laboratories', sec: 'Saúde', p: 118.00, c: 'LATERAL' },
  { s: 'DHR', n: 'Danaher Corporation', sec: 'Saúde', p: 240.00, c: 'LATERAL' },
  { s: 'PFE', n: 'Pfizer Inc.', sec: 'Saúde', p: 27.50, c: 'LATERAL' },
  { s: 'AMGN', n: 'Amgen Inc.', sec: 'Saúde', p: 295.00, c: 'LATERAL' },
  { s: 'ISRG', n: 'Intuitive Surgical', sec: 'Saúde', p: 520.00, c: 'ALTA' },
  { s: 'SYK', n: 'Stryker Corporation', sec: 'Saúde', p: 380.00, c: 'ALTA' },
  { s: 'MDT', n: 'Medtronic plc', sec: 'Saúde', p: 88.00, c: 'LATERAL' },
  { s: 'GILD', n: 'Gilead Sciences', sec: 'Saúde', p: 92.00, c: 'ALTA' },
  { s: 'BSX', n: 'Boston Scientific', sec: 'Saúde', p: 88.50, c: 'ALTA' },
  { s: 'VRTX', n: 'Vertex Pharmaceuticals', sec: 'Saúde', p: 460.00, c: 'ALTA' },
  { s: 'BMY', n: 'Bristol-Myers Squibb', sec: 'Saúde', p: 56.00, c: 'BAIXA' },
  { s: 'ELV', n: 'Elevance Health', sec: 'Saúde', p: 420.00, c: 'LATERAL' },
  { s: 'CI', n: 'The Cigna Group', sec: 'Saúde', p: 330.00, c: 'LATERAL' },
  { s: 'CVS', n: 'CVS Health Corp', sec: 'Saúde', p: 58.00, c: 'BAIXA' },

  // Consumer & Retail
  { s: 'WMT', n: 'Walmart Inc.', sec: 'Consumo Básico', p: 88.60, c: 'LATERAL' },
  { s: 'COST', n: 'Costco Wholesale', sec: 'Consumo Básico', p: 955.00, c: 'ALTA' },
  { s: 'PG', n: 'Procter & Gamble', sec: 'Consumo Básico', p: 172.80, c: 'LATERAL' },
  { s: 'HD', n: 'Home Depot Inc.', sec: 'Consumo Cíclico', p: 405.00, c: 'ALTA' },
  { s: 'KO', n: 'The Coca-Cola Company', sec: 'Consumo Básico', p: 68.40, c: 'LATERAL' },
  { s: 'PEP', n: 'PepsiCo Inc.', sec: 'Consumo Básico', p: 164.50, c: 'LATERAL' },
  { s: 'MCD', n: "McDonald's Corporation", sec: 'Consumo Cíclico', p: 295.00, c: 'LATERAL' },
  { s: 'NKE', n: 'Nike Inc.', sec: 'Consumo Cíclico', p: 78.50, c: 'BAIXA' },
  { s: 'SBUX', n: 'Starbucks Corporation', sec: 'Consumo Cíclico', p: 98.00, c: 'LATERAL' },
  { s: 'LOW', n: "Lowe's Companies", sec: 'Consumo Cíclico', p: 270.00, c: 'ALTA' },
  { s: 'TJX', n: 'The TJX Companies', sec: 'Consumo Cíclico', p: 120.00, c: 'ALTA' },
  { s: 'TGT', n: 'Target Corporation', sec: 'Consumo Básico', p: 135.00, c: 'BAIXA' },
  { s: 'PM', n: 'Philip Morris International', sec: 'Consumo Básico', p: 130.00, c: 'ALTA' },
  { s: 'MO', n: 'Altria Group Inc.', sec: 'Consumo Básico', p: 54.00, c: 'LATERAL' },
  { s: 'MDLZ', n: 'Mondelez International', sec: 'Consumo Básico', p: 68.00, c: 'LATERAL' },
  { s: 'CL', n: 'Colgate-Palmolive', sec: 'Consumo Básico', p: 98.00, c: 'LATERAL' },
  { s: 'BKNG', n: 'Booking Holdings', sec: 'Consumo Cíclico', p: 4800.00, c: 'ALTA' },
  { s: 'ABNB', n: 'Airbnb Inc.', sec: 'Consumo Cíclico', p: 138.00, c: 'LATERAL' },
  { s: 'MAR', n: 'Marriott International', sec: 'Consumo Cíclico', p: 280.00, c: 'ALTA' },
  { s: 'CMG', n: 'Chipotle Mexican Grill', sec: 'Consumo Cíclico', p: 62.00, c: 'LATERAL' },

  // Industrials & Aerospace
  { s: 'GE', n: 'GE Aerospace', sec: 'Industrial', p: 188.50, c: 'ALTA' },
  { s: 'CAT', n: 'Caterpillar Inc.', sec: 'Industrial', p: 410.20, c: 'ALTA' },
  { s: 'UNP', n: 'Union Pacific Corp', sec: 'Industrial', p: 240.00, c: 'LATERAL' },
  { s: 'RTX', n: 'RTX Corporation', sec: 'Industrial', p: 122.00, c: 'ALTA' },
  { s: 'HON', n: 'Honeywell International', sec: 'Industrial', p: 225.00, c: 'LATERAL' },
  { s: 'BA', n: 'The Boeing Company', sec: 'Industrial', p: 162.00, c: 'BAIXA' },
  { s: 'LMT', n: 'Lockheed Martin Corp', sec: 'Industrial', p: 540.00, c: 'ALTA' },
  { s: 'DE', n: 'Deere & Company', sec: 'Industrial', p: 415.00, c: 'LATERAL' },
  { s: 'UPS', n: 'United Parcel Service', sec: 'Industrial', p: 132.00, c: 'BAIXA' },
  { s: 'FDX', n: 'FedEx Corporation', sec: 'Industrial', p: 275.00, c: 'LATERAL' },
  { s: 'GD', n: 'General Dynamics', sec: 'Industrial', p: 295.00, c: 'ALTA' },
  { s: 'NOC', n: 'Northrop Grumman', sec: 'Industrial', p: 510.00, c: 'ALTA' },
  { s: 'WM', n: 'Waste Management', sec: 'Industrial', p: 215.00, c: 'LATERAL' },
  { s: 'ETN', n: 'Eaton Corporation plc', sec: 'Industrial', p: 360.00, c: 'ALTA' },
  { s: 'PH', n: 'Parker-Hannifin Corp', sec: 'Industrial', p: 660.00, c: 'ALTA' },
  { s: 'EMR', n: 'Emerson Electric Co', sec: 'Industrial', p: 125.00, c: 'ALTA' },
  { s: 'ITW', n: 'Illinois Tool Works', sec: 'Industrial', p: 265.00, c: 'LATERAL' },
  { s: 'CSX', n: 'CSX Corporation', sec: 'Industrial', p: 35.50, c: 'LATERAL' },
  { s: 'NSC', n: 'Norfolk Southern Corp', sec: 'Industrial', p: 260.00, c: 'LATERAL' },
  { s: 'PCAR', n: 'PACCAR Inc.', sec: 'Industrial', p: 110.00, c: 'LATERAL' },

  // Energy & Utilities
  { s: 'XOM', n: 'Exxon Mobil Corporation', sec: 'Energia', p: 118.40, c: 'LATERAL' },
  { s: 'CVX', n: 'Chevron Corporation', sec: 'Energia', p: 158.00, c: 'LATERAL' },
  { s: 'COP', n: 'ConocoPhillips', sec: 'Energia', p: 108.00, c: 'LATERAL' },
  { s: 'EOG', n: 'EOG Resources Inc.', sec: 'Energia', p: 130.00, c: 'LATERAL' },
  { s: 'SLB', n: 'Schlumberger Limited', sec: 'Energia', p: 44.00, c: 'BAIXA' },
  { s: 'MPC', n: 'Marathon Petroleum', sec: 'Energia', p: 155.00, c: 'LATERAL' },
  { s: 'PSX', n: 'Phillips 66', sec: 'Energia', p: 132.00, c: 'LATERAL' },
  { s: 'VLO', n: 'Valero Energy Corp', sec: 'Energia', p: 140.00, c: 'LATERAL' },
  { s: 'OXY', n: 'Occidental Petroleum', sec: 'Energia', p: 52.00, c: 'BAIXA' },
  { s: 'WMB', n: 'Williams Companies', sec: 'Energia', p: 55.00, c: 'ALTA' },
  { s: 'NEE', n: 'NextEra Energy Inc.', sec: 'Utilidades', p: 76.00, c: 'LATERAL' },
  { s: 'SO', n: 'The Southern Company', sec: 'Utilidades', p: 88.00, c: 'LATERAL' },
  { s: 'DUK', n: 'Duke Energy Corp', sec: 'Utilidades', p: 112.00, c: 'LATERAL' },
  { s: 'CEG', n: 'Constellation Energy', sec: 'Utilidades', p: 265.00, c: 'ALTA' },
  { s: 'SRE', n: 'Sempra', sec: 'Utilidades', p: 84.00, c: 'LATERAL' },
  { s: 'AEP', n: 'American Electric Power', sec: 'Utilidades', p: 98.00, c: 'LATERAL' },
  { s: 'VST', n: 'Vistra Corp', sec: 'Utilidades', p: 145.00, c: 'ALTA' },

  // Materials & Real Estate
  { s: 'LIN', n: 'Linde plc', sec: 'Materiais', p: 460.00, c: 'ALTA' },
  { s: 'SHW', n: 'Sherwin-Williams Co', sec: 'Materiais', p: 380.00, c: 'ALTA' },
  { s: 'FCX', n: 'Freeport-McMoRan', sec: 'Materiais', p: 46.00, c: 'LATERAL' },
  { s: 'ECL', n: 'Ecolab Inc.', sec: 'Materiais', p: 245.00, c: 'ALTA' },
  { s: 'NEM', n: 'Newmont Corporation', sec: 'Materiais', p: 42.00, c: 'LATERAL' },
  { s: 'PLD', n: 'Prologis Inc.', sec: 'Imobiliário', p: 118.00, c: 'LATERAL' },
  { s: 'AMT', n: 'American Tower Corp', sec: 'Imobiliário', p: 195.00, c: 'LATERAL' },
  { s: 'EQIX', n: 'Equinix Inc.', sec: 'Imobiliário', p: 920.00, c: 'ALTA' },
  { s: 'CCI', n: 'Crown Castle Inc.', sec: 'Imobiliário', p: 105.00, c: 'LATERAL' },
  { s: 'O', n: 'Realty Income Corp', sec: 'Imobiliário', p: 54.00, c: 'LATERAL' },
];

const processed = sp500Raw.map(item => {
  const isAlta = item.c === 'ALTA';
  const isBaixa = item.c === 'BAIXA';
  const stop = isAlta ? item.p * 0.95 : isBaixa ? item.p * 1.05 : item.p * 0.96;
  const alvo1 = isAlta ? item.p * 1.05 : isBaixa ? item.p * 0.93 : item.p * 1.04;
  const alvo2 = isAlta ? item.p * 1.11 : isBaixa ? item.p * 0.88 : item.p * 1.07;
  const change = isAlta ? Number((0.5 + Math.random() * 2.5).toFixed(2)) : isBaixa ? Number((-0.5 - Math.random() * 2.5).toFixed(2)) : Number(((Math.random() - 0.5) * 0.8).toFixed(2));

  return {
    symbol: item.s,
    name: item.n,
    sector: item.sec,
    category: item.c,
    spot: item.p,
    change,
    peRatio: Number((15 + Math.random() * 35).toFixed(1)),
    evEbitda: Number((10 + Math.random() * 20).toFixed(1)),
    dividendYield: Number((Math.random() * 3.5).toFixed(2)),
    roe: Number((12 + Math.random() * 40).toFixed(1)),
    netMargin: Number((8 + Math.random() * 25).toFixed(1)),
    debtToEbitda: Number((0.2 + Math.random() * 2.2).toFixed(1)),
    ivRank: Number((18 + Math.random() * 45).toFixed(1)),
    ivAtm: Number((12 + Math.random() * 25).toFixed(1)),
    stop: Number(stop.toFixed(2)),
    alvo1: Number(alvo1.toFixed(2)),
    alvo2: Number(alvo2.toFixed(2)),
    rr: isAlta ? '2.10:1' : isBaixa ? '1.85:1' : 'Iron Condor #20 a Crédito',
    strategy: isBaixa ? 'Trava de Baixa com Opções (Bear Put Spread)' : undefined,
    fundStatus: isBaixa ? (Math.random() > 0.5 ? 'REPROVADO' : 'EM_OBSERVACAO') : 'APROVADO',
    fundScore: isAlta ? Math.round(80 + Math.random() * 18) : isBaixa ? Math.round(35 + Math.random() * 30) : Math.round(75 + Math.random() * 15),
  };
});

const fullDatasetCode = \`export interface USStockItem {
  symbol: string;
  name: string;
  sector: string;
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

export const US_STOCKS_DATASET: USStockItem[] = \${JSON.stringify(processed, null, 2)};

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
  let price = currentSpot * (symbol === 'TSLA' || symbol === 'INTC' || symbol === 'BA' ? 1.15 : 0.85);

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
\`;

fs.writeFileSync(path.join(targetBase, 'src/lib/domain/us-market-data.ts'), fullDatasetCode.trim(), 'utf8');
console.log('Full S&P 500 Market Dataset created cleanly with ' + sp500Raw.length + ' stocks');
