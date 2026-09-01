export interface USStockItem {
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

export const US_STOCKS_DATASET: USStockItem[] = [
  // Big Tech & Growth
  { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Tecnologia', category: 'ALTA', spot: 142.50, change: 2.84, peRatio: 54.2, evEbitda: 41.8, dividendYield: 0.03, roe: 68.4, netMargin: 52.0, debtToEbitda: 0.2, ivRank: 42.5, ivAtm: 44.2, stop: 135.80, alvo1: 149.50, alvo2: 158.00, rr: '2.45:1', fundStatus: 'APROVADO', fundScore: 92 },
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Tecnologia', category: 'ALTA', spot: 238.10, change: 0.65, peRatio: 34.1, evEbitda: 25.4, dividendYield: 0.42, roe: 145.0, netMargin: 26.5, debtToEbitda: 0.9, ivRank: 21.0, ivAtm: 18.5, stop: 231.50, alvo1: 246.00, alvo2: 255.00, rr: '1.85:1', fundStatus: 'APROVADO', fundScore: 88 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Tecnologia', category: 'ALTA', spot: 432.80, change: 0.95, peRatio: 36.2, evEbitda: 24.1, dividendYield: 0.72, roe: 38.0, netMargin: 36.2, debtToEbitda: 0.4, ivRank: 24.0, ivAtm: 20.5, stop: 422.00, alvo1: 446.00, alvo2: 458.00, rr: '2.05:1', fundStatus: 'APROVADO', fundScore: 94 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumo Cíclico', category: 'ALTA', spot: 198.50, change: 1.10, peRatio: 42.0, evEbitda: 18.5, dividendYield: 0.0, roe: 22.0, netMargin: 8.5, debtToEbitda: 1.1, ivRank: 32.0, ivAtm: 28.0, stop: 192.00, alvo1: 208.00, alvo2: 216.00, rr: '2.15:1', fundStatus: 'APROVADO', fundScore: 84 },
  { symbol: 'GOOGL', name: 'Alphabet Inc. (Class A)', sector: 'Comunicação', category: 'ALTA', spot: 175.20, change: 1.25, peRatio: 24.0, evEbitda: 16.5, dividendYield: 0.45, roe: 31.0, netMargin: 27.5, debtToEbitda: 0.2, ivRank: 26.0, ivAtm: 23.0, stop: 169.00, alvo1: 183.00, alvo2: 190.00, rr: '2.10:1', fundStatus: 'APROVADO', fundScore: 91 },
  { symbol: 'GOOG', name: 'Alphabet Inc. (Class C)', sector: 'Comunicação', category: 'ALTA', spot: 176.40, change: 1.20, peRatio: 24.2, evEbitda: 16.6, dividendYield: 0.45, roe: 31.0, netMargin: 27.5, debtToEbitda: 0.2, ivRank: 26.0, ivAtm: 23.0, stop: 170.00, alvo1: 184.00, alvo2: 191.00, rr: '2.10:1', fundStatus: 'APROVADO', fundScore: 91 },
  { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Comunicação', category: 'ALTA', spot: 612.40, change: 1.45, peRatio: 28.5, evEbitda: 20.2, dividendYield: 0.35, roe: 32.5, netMargin: 35.0, debtToEbitda: 0.3, ivRank: 28.0, ivAtm: 26.5, stop: 598.00, alvo1: 632.00, alvo2: 650.00, rr: '1.95:1', fundStatus: 'APROVADO', fundScore: 90 },
  { symbol: 'AVGO', name: 'Broadcom Inc.', sector: 'Tecnologia', category: 'ALTA', spot: 178.20, change: 2.15, peRatio: 38.4, evEbitda: 23.0, dividendYield: 1.20, roe: 28.5, netMargin: 32.0, debtToEbitda: 1.8, ivRank: 36.0, ivAtm: 34.0, stop: 171.00, alvo1: 188.00, alvo2: 196.00, rr: '2.30:1', fundStatus: 'APROVADO', fundScore: 87 },
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Tecnologia', category: 'ALTA', spot: 156.40, change: 3.10, peRatio: 48.0, evEbitda: 32.0, dividendYield: 0.0, roe: 14.2, netMargin: 12.0, debtToEbitda: 0.1, ivRank: 52.0, ivAtm: 48.0, stop: 148.00, alvo1: 168.00, alvo2: 178.00, rr: '2.20:1', fundStatus: 'APROVADO', fundScore: 81 },
  { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Comunicação', category: 'ALTA', spot: 885.00, change: 1.80, peRatio: 44.0, evEbitda: 29.0, dividendYield: 0.0, roe: 34.0, netMargin: 22.0, debtToEbitda: 1.2, ivRank: 29.0, ivAtm: 27.5, stop: 855.00, alvo1: 925.00, alvo2: 960.00, rr: '2.10:1', fundStatus: 'APROVADO', fundScore: 89 },
  { symbol: 'CRM', name: 'Salesforce Inc.', sector: 'Tecnologia', category: 'ALTA', spot: 320.00, change: 1.35, peRatio: 45.0, evEbitda: 25.0, dividendYield: 0.50, roe: 18.0, netMargin: 16.0, debtToEbitda: 0.6, ivRank: 31.0, ivAtm: 29.0, stop: 308.00, alvo1: 336.00, alvo2: 348.00, rr: '2.15:1', fundStatus: 'APROVADO', fundScore: 86 },
  { symbol: 'ORCL', name: 'Oracle Corporation', sector: 'Tecnologia', category: 'ALTA', spot: 185.40, change: 1.50, peRatio: 36.0, evEbitda: 21.0, dividendYield: 0.90, roe: 45.0, netMargin: 21.0, debtToEbitda: 2.8, ivRank: 34.0, ivAtm: 30.0, stop: 178.00, alvo1: 195.00, alvo2: 202.00, rr: '2.10:1', fundStatus: 'APROVADO', fundScore: 85 },
  { symbol: 'QCOM', name: 'QUALCOMM Inc.', sector: 'Tecnologia', category: 'ALTA', spot: 168.50, change: 1.40, peRatio: 22.0, evEbitda: 16.0, dividendYield: 2.00, roe: 42.0, netMargin: 26.0, debtToEbitda: 0.8, ivRank: 33.0, ivAtm: 31.0, stop: 162.00, alvo1: 177.00, alvo2: 184.00, rr: '2.05:1', fundStatus: 'APROVADO', fundScore: 88 },
  { symbol: 'AMAT', name: 'Applied Materials', sector: 'Tecnologia', category: 'ALTA', spot: 215.00, change: 2.20, peRatio: 26.0, evEbitda: 19.0, dividendYield: 0.75, roe: 46.0, netMargin: 27.0, debtToEbitda: 0.4, ivRank: 38.0, ivAtm: 36.0, stop: 206.00, alvo1: 228.00, alvo2: 236.00, rr: '2.25:1', fundStatus: 'APROVADO', fundScore: 89 },
  { symbol: 'MU', name: 'Micron Technology', sector: 'Tecnologia', category: 'ALTA', spot: 108.00, change: 3.40, peRatio: 28.0, evEbitda: 14.0, dividendYield: 0.42, roe: 12.0, netMargin: 9.0, debtToEbitda: 1.1, ivRank: 55.0, ivAtm: 49.0, stop: 102.00, alvo1: 116.00, alvo2: 122.00, rr: '2.20:1', fundStatus: 'APROVADO', fundScore: 82 },
  { symbol: 'LRCX', name: 'Lam Research Corp', sector: 'Tecnologia', category: 'ALTA', spot: 82.50, change: 2.50, peRatio: 25.0, evEbitda: 18.5, dividendYield: 1.10, roe: 48.0, netMargin: 26.5, debtToEbitda: 0.5, ivRank: 40.0, ivAtm: 37.0, stop: 78.50, alvo1: 88.00, alvo2: 92.00, rr: '2.20:1', fundStatus: 'APROVADO', fundScore: 88 },
  { symbol: 'NOW', name: 'ServiceNow Inc.', sector: 'Tecnologia', category: 'ALTA', spot: 940.00, change: 1.60, peRatio: 72.0, evEbitda: 45.0, dividendYield: 0.0, roe: 24.0, netMargin: 14.0, debtToEbitda: 0.3, ivRank: 35.0, ivAtm: 32.0, stop: 905.00, alvo1: 990.00, alvo2: 1030.00, rr: '2.25:1', fundStatus: 'APROVADO', fundScore: 87 },
  { symbol: 'PANW', name: 'Palo Alto Networks', sector: 'Tecnologia', category: 'ALTA', spot: 385.00, change: 1.75, peRatio: 52.0, evEbitda: 35.0, dividendYield: 0.0, roe: 38.0, netMargin: 22.0, debtToEbitda: 0.2, ivRank: 39.0, ivAtm: 35.0, stop: 370.00, alvo1: 405.00, alvo2: 420.00, rr: '2.20:1', fundStatus: 'APROVADO', fundScore: 88 },
  { symbol: 'PLTR', name: 'Palantir Technologies', sector: 'Tecnologia', category: 'ALTA', spot: 64.20, change: 4.85, peRatio: 78.0, evEbitda: 55.0, dividendYield: 0.0, roe: 19.5, netMargin: 24.0, debtToEbitda: 0.0, ivRank: 64.0, ivAtm: 58.0, stop: 59.50, alvo1: 71.00, alvo2: 78.00, rr: '2.60:1', fundStatus: 'APROVADO', fundScore: 78 },
  { symbol: 'CRWD', name: 'CrowdStrike Holdings', sector: 'Tecnologia', category: 'ALTA', spot: 345.00, change: 2.10, peRatio: 68.0, evEbitda: 48.0, dividendYield: 0.0, roe: 22.0, netMargin: 12.0, debtToEbitda: 0.1, ivRank: 44.0, ivAtm: 41.0, stop: 330.00, alvo1: 365.00, alvo2: 380.00, rr: '2.15:1', fundStatus: 'APROVADO', fundScore: 84 },

  // Financials S&P 500
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financeiro', category: 'ALTA', spot: 245.00, change: 0.90, peRatio: 12.8, evEbitda: 9.5, dividendYield: 2.10, roe: 17.5, netMargin: 34.0, debtToEbitda: 1.0, ivRank: 17.0, ivAtm: 15.0, stop: 238.00, alvo1: 255.00, alvo2: 262.00, rr: '2.00:1', fundStatus: 'APROVADO', fundScore: 93 },
  { symbol: 'BAC', name: 'Bank of America Corp', sector: 'Financeiro', category: 'ALTA', spot: 44.50, change: 0.80, peRatio: 14.5, evEbitda: 10.2, dividendYield: 2.30, roe: 11.0, netMargin: 28.0, debtToEbitda: 1.2, ivRank: 20.0, ivAtm: 18.0, stop: 42.80, alvo1: 47.00, alvo2: 48.50, rr: '2.05:1', fundStatus: 'APROVADO', fundScore: 89 },
  { symbol: 'WFC', name: 'Wells Fargo & Co', sector: 'Financeiro', category: 'ALTA', spot: 68.20, change: 0.95, peRatio: 13.2, evEbitda: 9.8, dividendYield: 2.35, roe: 12.5, netMargin: 26.0, debtToEbitda: 1.1, ivRank: 22.0, ivAtm: 19.5, stop: 65.50, alvo1: 72.00, alvo2: 74.50, rr: '2.10:1', fundStatus: 'APROVADO', fundScore: 88 },
  { symbol: 'GS', name: 'Goldman Sachs Group', sector: 'Financeiro', category: 'ALTA', spot: 580.00, change: 1.20, peRatio: 15.0, evEbitda: 11.0, dividendYield: 2.05, roe: 13.0, netMargin: 25.0, debtToEbitda: 1.4, ivRank: 24.0, ivAtm: 21.0, stop: 560.00, alvo1: 610.00, alvo2: 630.00, rr: '2.20:1', fundStatus: 'APROVADO', fundScore: 90 },
  { symbol: 'MS', name: 'Morgan Stanley', sector: 'Financeiro', category: 'ALTA', spot: 124.00, change: 1.10, peRatio: 16.5, evEbitda: 11.5, dividendYield: 2.75, roe: 14.0, netMargin: 22.0, debtToEbitda: 1.3, ivRank: 23.0, ivAtm: 20.0, stop: 119.00, alvo1: 131.00, alvo2: 136.00, rr: '2.10:1', fundStatus: 'APROVADO', fundScore: 89 },
  { symbol: 'V', name: 'Visa Inc. (Class A)', sector: 'Financeiro', category: 'ALTA', spot: 310.00, change: 0.70, peRatio: 30.0, evEbitda: 23.0, dividendYield: 0.75, roe: 52.0, netMargin: 54.0, debtToEbitda: 0.6, ivRank: 18.0, ivAtm: 15.5, stop: 298.00, alvo1: 326.00, alvo2: 338.00, rr: '2.15:1', fundStatus: 'APROVADO', fundScore: 95 },
  { symbol: 'MA', name: 'Mastercard Inc. (Class A)', sector: 'Financeiro', category: 'ALTA', spot: 520.00, change: 0.85, peRatio: 32.0, evEbitda: 25.0, dividendYield: 0.55, roe: 160.0, netMargin: 45.0, debtToEbitda: 0.8, ivRank: 19.0, ivAtm: 16.0, stop: 502.00, alvo1: 545.00, alvo2: 562.00, rr: '2.10:1', fundStatus: 'APROVADO', fundScore: 94 },
  { symbol: 'AXP', name: 'American Express Co', sector: 'Financeiro', category: 'ALTA', spot: 285.00, change: 1.15, peRatio: 20.0, evEbitda: 14.0, dividendYield: 1.00, roe: 34.0, netMargin: 16.5, debtToEbitda: 1.2, ivRank: 22.0, ivAtm: 19.0, stop: 274.00, alvo1: 300.00, alvo2: 312.00, rr: '2.20:1', fundStatus: 'APROVADO', fundScore: 91 },
  { symbol: 'BLK', name: 'BlackRock Inc.', sector: 'Financeiro', category: 'ALTA', spot: 990.00, change: 1.05, peRatio: 25.0, evEbitda: 18.0, dividendYield: 2.10, roe: 15.5, netMargin: 31.0, debtToEbitda: 0.5, ivRank: 21.0, ivAtm: 18.5, stop: 955.00, alvo1: 1040.00, alvo2: 1075.00, rr: '2.15:1', fundStatus: 'APROVADO', fundScore: 92 },

  // Healthcare S&P 500
  { symbol: 'LLY', name: 'Eli Lilly and Company', sector: 'Saúde', category: 'ALTA', spot: 850.00, change: 1.90, peRatio: 65.0, evEbitda: 42.0, dividendYield: 0.65, roe: 58.0, netMargin: 24.0, debtToEbitda: 1.5, ivRank: 38.0, ivAtm: 33.0, stop: 818.00, alvo1: 895.00, alvo2: 930.00, rr: '2.25:1', fundStatus: 'APROVADO', fundScore: 91 },
  { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Saúde', category: 'ALTA', spot: 585.00, change: 0.80, peRatio: 24.0, evEbitda: 16.0, dividendYield: 1.45, roe: 26.0, netMargin: 6.0, debtToEbitda: 1.4, ivRank: 20.0, ivAtm: 17.5, stop: 565.00, alvo1: 612.00, alvo2: 630.00, rr: '2.10:1', fundStatus: 'APROVADO', fundScore: 90 },
  { symbol: 'ISRG', name: 'Intuitive Surgical', sector: 'Saúde', category: 'ALTA', spot: 520.00, change: 1.45, peRatio: 68.0, evEbitda: 48.0, dividendYield: 0.0, roe: 18.0, netMargin: 28.0, debtToEbitda: 0.0, ivRank: 32.0, ivAtm: 29.0, stop: 500.00, alvo1: 548.00, alvo2: 568.00, rr: '2.20:1', fundStatus: 'APROVADO', fundScore: 89 },
  { symbol: 'SYK', name: 'Stryker Corporation', sector: 'Saúde', category: 'ALTA', spot: 380.00, change: 0.90, peRatio: 36.0, evEbitda: 24.0, dividendYield: 0.85, roe: 18.5, netMargin: 16.0, debtToEbitda: 1.8, ivRank: 22.0, ivAtm: 19.0, stop: 366.00, alvo1: 400.00, alvo2: 412.00, rr: '2.15:1', fundStatus: 'APROVADO', fundScore: 88 },
  { symbol: 'BSX', name: 'Boston Scientific', sector: 'Saúde', category: 'ALTA', spot: 88.50, change: 1.30, peRatio: 48.0, evEbitda: 26.0, dividendYield: 0.0, roe: 15.0, netMargin: 12.0, debtToEbitda: 1.7, ivRank: 25.0, ivAtm: 22.0, stop: 85.00, alvo1: 93.00, alvo2: 96.50, rr: '2.10:1', fundStatus: 'APROVADO', fundScore: 87 },

  // Industrials & Aerospace S&P 500
  { symbol: 'GE', name: 'GE Aerospace', sector: 'Industrial', category: 'ALTA', spot: 188.50, change: 1.65, peRatio: 32.0, evEbitda: 21.0, dividendYield: 0.60, roe: 26.0, netMargin: 15.0, debtToEbitda: 0.8, ivRank: 25.0, ivAtm: 22.0, stop: 181.00, alvo1: 198.00, alvo2: 206.00, rr: '2.00:1', fundStatus: 'APROVADO', fundScore: 86 },
  { symbol: 'CAT', name: 'Caterpillar Inc.', sector: 'Industrial', category: 'ALTA', spot: 410.20, change: 1.20, peRatio: 18.5, evEbitda: 14.0, dividendYield: 1.35, roe: 56.0, netMargin: 16.0, debtToEbitda: 1.5, ivRank: 22.0, ivAtm: 19.0, stop: 395.00, alvo1: 430.00, alvo2: 445.00, rr: '2.15:1', fundStatus: 'APROVADO', fundScore: 88 },
  { symbol: 'RTX', name: 'RTX Corporation', sector: 'Industrial', category: 'ALTA', spot: 122.00, change: 1.05, peRatio: 28.0, evEbitda: 17.0, dividendYield: 2.10, roe: 12.0, netMargin: 6.5, debtToEbitda: 2.4, ivRank: 24.0, ivAtm: 20.0, stop: 117.00, alvo1: 129.00, alvo2: 134.00, rr: '2.10:1', fundStatus: 'APROVADO', fundScore: 85 },
  { symbol: 'LMT', name: 'Lockheed Martin Corp', sector: 'Industrial', category: 'ALTA', spot: 540.00, change: 1.10, peRatio: 19.5, evEbitda: 14.5, dividendYield: 2.40, roe: 85.0, netMargin: 10.0, debtToEbitda: 1.8, ivRank: 23.0, ivAtm: 19.5, stop: 520.00, alvo1: 568.00, alvo2: 585.00, rr: '2.15:1', fundStatus: 'APROVADO', fundScore: 89 },
  { symbol: 'ETN', name: 'Eaton Corporation plc', sector: 'Industrial', category: 'ALTA', spot: 360.00, change: 1.40, peRatio: 36.0, evEbitda: 25.0, dividendYield: 1.10, roe: 22.0, netMargin: 15.0, debtToEbitda: 1.6, ivRank: 27.0, ivAtm: 23.5, stop: 345.00, alvo1: 380.00, alvo2: 395.00, rr: '2.20:1', fundStatus: 'APROVADO', fundScore: 88 },

  // BAIXA - Oportunidades de Venda / Trava Baixa
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumo Cíclico', category: 'BAIXA', spot: 248.30, change: -1.15, peRatio: 72.0, evEbitda: 58.0, dividendYield: 0.0, roe: 14.0, netMargin: 11.0, debtToEbitda: 0.2, ivRank: 68.2, ivAtm: 52.0, stop: 260.00, alvo1: 232.00, alvo2: 220.00, rr: '1.80:1', strategy: 'Trava de Baixa com Opções (Bear Put Spread)', fundStatus: 'EM_OBSERVACAO', fundScore: 62 },
  { symbol: 'INTC', name: 'Intel Corporation', sector: 'Tecnologia', category: 'BAIXA', spot: 23.40, change: -2.30, peRatio: 45.0, evEbitda: 16.0, dividendYield: 2.10, roe: -2.5, netMargin: -4.0, debtToEbitda: 4.8, ivRank: 58.0, ivAtm: 42.0, stop: 25.50, alvo1: 20.50, alvo2: 18.00, rr: '1.90:1', strategy: 'Trava de Baixa com Opções (Bear Put Spread)', fundStatus: 'REPROVADO', fundScore: 41 },
  { symbol: 'BA', name: 'The Boeing Company', sector: 'Industrial', category: 'BAIXA', spot: 162.00, change: -1.80, peRatio: -18.0, evEbitda: 42.0, dividendYield: 0.0, roe: -35.0, netMargin: -8.0, debtToEbitda: 8.5, ivRank: 48.0, ivAtm: 38.0, stop: 172.00, alvo1: 148.00, alvo2: 135.00, rr: '1.85:1', strategy: 'Trava de Baixa com Opções (Bear Put Spread)', fundStatus: 'REPROVADO', fundScore: 35 },
  { symbol: 'NKE', name: 'Nike Inc.', sector: 'Consumo Cíclico', category: 'BAIXA', spot: 78.50, change: -0.90, peRatio: 24.0, evEbitda: 18.0, dividendYield: 1.85, roe: 32.0, netMargin: 9.0, debtToEbitda: 1.1, ivRank: 38.0, ivAtm: 26.0, stop: 83.00, alvo1: 72.00, alvo2: 66.00, rr: '1.75:1', strategy: 'Trava de Baixa com Opções (Bear Put Spread)', fundStatus: 'EM_OBSERVACAO', fundScore: 58 },
  { symbol: 'WBD', name: 'Warner Bros Discovery', sector: 'Comunicação', category: 'BAIXA', spot: 9.80, change: -3.20, peRatio: -8.5, evEbitda: 12.0, dividendYield: 0.0, roe: -12.0, netMargin: -6.0, debtToEbitda: 5.2, ivRank: 62.0, ivAtm: 46.0, stop: 10.80, alvo1: 8.40, alvo2: 7.20, rr: '1.95:1', strategy: 'Trava de Baixa com Opções (Bear Put Spread)', fundStatus: 'REPROVADO', fundScore: 38 },
  { symbol: 'UPS', name: 'United Parcel Service', sector: 'Industrial', category: 'BAIXA', spot: 132.00, change: -1.25, peRatio: 19.0, evEbitda: 12.0, dividendYield: 5.00, roe: 36.0, netMargin: 6.8, debtToEbitda: 2.8, ivRank: 42.0, ivAtm: 28.0, stop: 139.00, alvo1: 122.00, alvo2: 114.00, rr: '1.80:1', strategy: 'Trava de Baixa com Opções (Bear Put Spread)', fundStatus: 'EM_OBSERVACAO', fundScore: 61 },
  { symbol: 'CVS', name: 'CVS Health Corp', sector: 'Saúde', category: 'BAIXA', spot: 58.00, change: -1.40, peRatio: 11.5, evEbitda: 8.2, dividendYield: 4.60, roe: 10.0, netMargin: 2.2, debtToEbitda: 3.8, ivRank: 49.0, ivAtm: 32.0, stop: 62.00, alvo1: 52.50, alvo2: 48.00, rr: '1.85:1', strategy: 'Trava de Baixa com Opções (Bear Put Spread)', fundStatus: 'REPROVADO', fundScore: 48 },
  { symbol: 'BMY', name: 'Bristol-Myers Squibb', sector: 'Saúde', category: 'BAIXA', spot: 56.00, change: -0.95, peRatio: 14.0, evEbitda: 9.5, dividendYield: 4.30, roe: 14.0, netMargin: 12.0, debtToEbitda: 3.5, ivRank: 36.0, ivAtm: 25.0, stop: 59.50, alvo1: 51.00, alvo2: 47.50, rr: '1.80:1', strategy: 'Trava de Baixa com Opções (Bear Put Spread)', fundStatus: 'EM_OBSERVACAO', fundScore: 56 },
  { symbol: 'TGT', name: 'Target Corporation', sector: 'Consumo Básico', category: 'BAIXA', spot: 135.00, change: -1.60, peRatio: 15.0, evEbitda: 9.0, dividendYield: 3.35, roe: 28.0, netMargin: 4.1, debtToEbitda: 2.0, ivRank: 45.0, ivAtm: 29.0, stop: 143.00, alvo1: 124.00, alvo2: 116.00, rr: '1.85:1', strategy: 'Trava de Baixa com Opções (Bear Put Spread)', fundStatus: 'EM_OBSERVACAO', fundScore: 60 },
  { symbol: 'SLB', name: 'Schlumberger Limited', sector: 'Energia', category: 'BAIXA', spot: 44.00, change: -1.85, peRatio: 14.0, evEbitda: 8.5, dividendYield: 2.50, roe: 22.0, netMargin: 12.5, debtToEbitda: 1.4, ivRank: 44.0, ivAtm: 30.0, stop: 47.00, alvo1: 39.50, alvo2: 36.00, rr: '1.85:1', strategy: 'Trava de Baixa com Opções (Bear Put Spread)', fundStatus: 'EM_OBSERVACAO', fundScore: 59 },

  // LATERAL - Renda com Opções (Iron Condor / Credit Spreads)
  { symbol: 'KO', name: 'The Coca-Cola Company', sector: 'Consumo Básico', category: 'LATERAL', spot: 68.40, change: 0.20, peRatio: 26.0, evEbitda: 19.5, dividendYield: 2.90, roe: 42.0, netMargin: 24.0, debtToEbitda: 2.2, ivRank: 38.0, ivAtm: 13.5, stop: 65.50, alvo1: 71.00, alvo2: 73.00, rr: 'Iron Condor #20 a Crédito', fundStatus: 'APROVADO', fundScore: 87 },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Saúde', category: 'LATERAL', spot: 156.20, change: 0.15, peRatio: 16.5, evEbitda: 12.0, dividendYield: 3.10, roe: 28.0, netMargin: 22.0, debtToEbitda: 1.3, ivRank: 42.0, ivAtm: 14.0, stop: 150.00, alvo1: 162.00, alvo2: 166.00, rr: 'Iron Condor #20 a Crédito', fundStatus: 'APROVADO', fundScore: 89 },
  { symbol: 'PG', name: 'Procter & Gamble', sector: 'Consumo Básico', category: 'LATERAL', spot: 172.80, change: 0.32, peRatio: 28.0, evEbitda: 20.0, dividendYield: 2.30, roe: 33.0, netMargin: 18.0, debtToEbitda: 1.4, ivRank: 35.0, ivAtm: 14.2, stop: 166.00, alvo1: 178.00, alvo2: 182.00, rr: 'Iron Condor #20 a Crédito', fundStatus: 'APROVADO', fundScore: 90 },
  { symbol: 'PFE', name: 'Pfizer Inc.', sector: 'Saúde', category: 'LATERAL', spot: 27.50, change: 0.40, peRatio: 15.0, evEbitda: 11.0, dividendYield: 6.10, roe: 12.0, netMargin: 10.0, debtToEbitda: 2.8, ivRank: 48.0, ivAtm: 21.0, stop: 25.50, alvo1: 29.50, alvo2: 31.00, rr: 'Iron Condor #20 a Crédito', fundStatus: 'APROVADO', fundScore: 76 },
  { symbol: 'PEP', name: 'PepsiCo Inc.', sector: 'Consumo Básico', category: 'LATERAL', spot: 164.50, change: 0.10, peRatio: 24.5, evEbitda: 18.0, dividendYield: 3.25, roe: 52.0, netMargin: 11.5, debtToEbitda: 2.5, ivRank: 36.0, ivAtm: 14.8, stop: 158.00, alvo1: 170.00, alvo2: 174.00, rr: 'Iron Condor #20 a Crédito', fundStatus: 'APROVADO', fundScore: 88 },
  { symbol: 'MRK', name: 'Merck & Co. Inc.', sector: 'Saúde', category: 'LATERAL', spot: 104.20, change: 0.25, peRatio: 18.0, evEbitda: 13.0, dividendYield: 2.95, roe: 24.0, netMargin: 19.0, debtToEbitda: 1.6, ivRank: 39.0, ivAtm: 16.2, stop: 99.00, alvo1: 109.00, alvo2: 112.00, rr: 'Iron Condor #20 a Crédito', fundStatus: 'APROVADO', fundScore: 86 },
  { symbol: 'ABBV', name: 'AbbVie Inc.', sector: 'Saúde', category: 'LATERAL', spot: 182.00, change: 0.30, peRatio: 19.0, evEbitda: 14.5, dividendYield: 3.40, roe: 45.0, netMargin: 15.0, debtToEbitda: 3.1, ivRank: 41.0, ivAtm: 17.5, stop: 175.00, alvo1: 189.00, alvo2: 194.00, rr: 'Iron Condor #20 a Crédito', fundStatus: 'APROVADO', fundScore: 84 },
  { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Consumo Básico', category: 'LATERAL', spot: 88.60, change: 0.45, peRatio: 33.0, evEbitda: 17.0, dividendYield: 1.00, roe: 22.0, netMargin: 2.8, debtToEbitda: 1.3, ivRank: 31.0, ivAtm: 15.0, stop: 84.50, alvo1: 92.50, alvo2: 95.00, rr: 'Iron Condor #20 a Crédito', fundStatus: 'APROVADO', fundScore: 91 },
  { symbol: 'MCD', name: "McDonald's Corporation", sector: 'Consumo Cíclico', category: 'LATERAL', spot: 295.00, change: 0.15, peRatio: 26.5, evEbitda: 18.0, dividendYield: 2.35, roe: -45.0, netMargin: 33.0, debtToEbitda: 3.2, ivRank: 28.0, ivAtm: 14.0, stop: 284.00, alvo1: 305.00, alvo2: 312.00, rr: 'Iron Condor #20 a Crédito', fundStatus: 'APROVADO', fundScore: 87 },
  { symbol: 'XOM', name: 'Exxon Mobil Corporation', sector: 'Energia', category: 'LATERAL', spot: 118.40, change: 0.35, peRatio: 14.2, evEbitda: 8.5, dividendYield: 3.20, roe: 19.0, netMargin: 12.0, debtToEbitda: 0.6, ivRank: 37.0, ivAtm: 18.0, stop: 112.00, alvo1: 124.00, alvo2: 128.00, rr: 'Iron Condor #20 a Crédito', fundStatus: 'APROVADO', fundScore: 92 },
  { symbol: 'CVX', name: 'Chevron Corporation', sector: 'Energia', category: 'LATERAL', spot: 158.00, change: 0.25, peRatio: 15.0, evEbitda: 8.8, dividendYield: 4.10, roe: 14.0, netMargin: 11.0, debtToEbitda: 0.8, ivRank: 36.0, ivAtm: 18.5, stop: 151.00, alvo1: 165.00, alvo2: 170.00, rr: 'Iron Condor #20 a Crédito', fundStatus: 'APROVADO', fundScore: 89 },
  { symbol: 'NEE', name: 'NextEra Energy Inc.', sector: 'Utilidades', category: 'LATERAL', spot: 76.00, change: 0.20, peRatio: 22.0, evEbitda: 14.0, dividendYield: 2.70, roe: 12.0, netMargin: 25.0, debtToEbitda: 4.2, ivRank: 29.0, ivAtm: 16.0, stop: 72.50, alvo1: 79.50, alvo2: 82.00, rr: 'Iron Condor #20 a Crédito', fundStatus: 'APROVADO', fundScore: 85 },
  { symbol: 'SO', name: 'The Southern Company', sector: 'Utilidades', category: 'LATERAL', spot: 88.00, change: 0.15, peRatio: 20.0, evEbitda: 13.0, dividendYield: 3.30, roe: 13.5, netMargin: 18.0, debtToEbitda: 4.5, ivRank: 28.0, ivAtm: 15.5, stop: 84.00, alvo1: 92.00, alvo2: 95.00, rr: 'Iron Condor #20 a Crédito', fundStatus: 'APROVADO', fundScore: 86 },
  { symbol: 'CSCO', name: 'Cisco Systems Inc.', sector: 'Tecnologia', category: 'LATERAL', spot: 58.20, change: 0.30, peRatio: 21.0, evEbitda: 13.5, dividendYield: 2.75, roe: 28.0, netMargin: 20.0, debtToEbitda: 0.7, ivRank: 32.0, ivAtm: 17.0, stop: 55.50, alvo1: 61.00, alvo2: 63.00, rr: 'Iron Condor #20 a Crédito', fundStatus: 'APROVADO', fundScore: 88 },
  { symbol: 'TXN', name: 'Texas Instruments', sector: 'Tecnologia', category: 'LATERAL', spot: 205.00, change: 0.40, peRatio: 32.0, evEbitda: 22.0, dividendYield: 2.65, roe: 34.0, netMargin: 33.0, debtToEbitda: 1.2, ivRank: 34.0, ivAtm: 21.0, stop: 196.00, alvo1: 214.00, alvo2: 222.00, rr: 'Iron Condor #20 a Crédito', fundStatus: 'APROVADO', fundScore: 89 },
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
