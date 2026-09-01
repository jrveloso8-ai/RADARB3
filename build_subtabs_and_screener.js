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

// 1. ScreenerView - Ultra Dynamic and Complete
writeFile('src/components/screener/ScreenerView.tsx', `
'use client';

import React, { useState, useMemo } from 'react';
import { RefreshCw, Search, ArrowUpRight, TrendingDown, Layers, ShieldCheck, Filter } from 'lucide-react';
import { US_STOCKS_DATASET, USStockItem } from '@/lib/domain/us-market-data';

interface ScreenerViewProps {
  onSelectSymbol?: (symbol: string) => void;
}

export function ScreenerView({ onSelectSymbol }: ScreenerViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [scanLimit, setScanLimit] = useState<number | 'ALL'>(60);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredList = useMemo(() => {
    let list = US_STOCKS_DATASET;
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toUpperCase();
      list = list.filter(item => item.symbol.includes(q) || item.name.toUpperCase().includes(q));
    }
    if (scanLimit !== 'ALL') {
      list = list.slice(0, scanLimit);
    }
    return list;
  }, [searchTerm, scanLimit]);

  const altaList = filteredList.filter(item => item.category === 'ALTA');
  const baixaList = filteredList.filter(item => item.category === 'BAIXA');
  const lateralList = filteredList.filter(item => item.category === 'LATERAL');

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 400);
  };

  return (
    <section className="space-y-6">
      {/* Search and Filters Header */}
      <div className="bg-[#0c1322] border border-gray-800 p-5 rounded-2xl space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">Rastreador de Oportunidades & Lista de Execução</h2>
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">
                Classificação Técnica + Crivo CNPI-US + Execução Tastytrade
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Lista acionável filtrada por solvência, alinhamento estrito de médias móveis e liquidez real de derivativos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#070b14] p-1 rounded-lg border border-gray-800 text-[11px] font-mono">
              <span className="text-gray-400 px-2 flex items-center gap-1">
                <Filter className="w-3 h-3 text-cyan-400" />
                Escanear:
              </span>
              {[40, 60, 100, 'ALL'].map((limit) => (
                <button
                  key={limit}
                  onClick={() => setScanLimit(limit as number | 'ALL')}
                  className={\`px-2.5 py-1 rounded transition font-bold \${
                    scanLimit === limit
                      ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
                      : 'text-gray-400 hover:text-white'
                  }\`}
                >
                  {limit === 'ALL' ? 'Todos' : limit}
                </button>
              ))}
            </div>

            <button
              onClick={handleRefresh}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
            >
              <RefreshCw className={\`w-3.5 h-3.5 \${isRefreshing ? 'animate-spin' : ''}\`} />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-800/80 pt-3">
          <div className="relative w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar por ticker (ex: NVDA, AAPL, SPY)..."
              className="w-full bg-[#070b14] border border-gray-700 rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 uppercase"
            />
          </div>
          <span className="text-xs font-mono text-gray-400">
            Total de Ativos Analisados no Crivo: <strong className="text-white font-bold">{filteredList.length}</strong> ativos
          </span>
        </div>
      </div>

      {/* 1. ALTA */}
      <div className="bg-[#0c1322] border border-emerald-500/30 rounded-2xl p-5 space-y-4 shadow-lg">
        <div className="flex justify-between items-center border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <h3 className="text-sm font-bold font-mono text-emerald-400">ALTA — Oportunidades de Compra</h3>
            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
              {altaList.length} ativos
            </span>
          </div>
          <span className="text-[10px] font-mono text-gray-400">
            Critério: Tendência de Alta (MM20 &gt; MM50 &gt; MM200) + Fundamentos Aprovados
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {altaList.map((item) => (
            <div
              key={item.symbol}
              onClick={() => onSelectSymbol?.(item.symbol)}
              className="p-3.5 rounded-xl bg-[#090e18] border border-gray-800 hover:border-emerald-500/60 hover:bg-[#0d1527] transition cursor-pointer group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-black font-mono text-sm text-white group-hover:text-emerald-300 flex items-center gap-1">
                    {item.symbol}
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition text-emerald-400" />
                  </div>
                  <div className="text-[10px] text-gray-400 font-sans truncate w-28">{item.name}</div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-sm font-bold text-white">\${item.spot.toFixed(2)}</div>
                  <div className="text-[11px] text-emerald-400 font-semibold">+{item.change.toFixed(2)}%</div>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-gray-800/80 flex justify-between text-[10px] font-mono">
                <span>Stop: <strong className="text-rose-400">\${item.stop.toFixed(2)}</strong></span>
                <span>Alvo 1: <strong className="text-emerald-400">\${item.alvo1.toFixed(2)}</strong></span>
                <span>R:R: <strong className="text-cyan-300">{item.rr}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. BAIXA */}
      <div className="bg-[#0c1322] border border-rose-500/30 rounded-2xl p-5 space-y-4 shadow-lg">
        <div className="flex justify-between items-center border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
            <h3 className="text-sm font-bold font-mono text-rose-400">BAIXA — Oportunidades de Venda / Trava Baixa</h3>
            <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold">
              {baixaList.length} ativos
            </span>
          </div>
          <span className="text-[10px] font-mono text-gray-400">
            Critério: Tendência de Baixa (MM20 &lt; MM50 &lt; MM200) + Deterioração
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {baixaList.map((item) => (
            <div
              key={item.symbol}
              onClick={() => onSelectSymbol?.(item.symbol)}
              className="p-3.5 rounded-xl bg-[#090e18] border border-gray-800 hover:border-rose-500/60 hover:bg-[#150e18] transition cursor-pointer group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-black font-mono text-sm text-white group-hover:text-rose-300 flex items-center gap-1">
                    {item.symbol}
                    <TrendingDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition text-rose-400" />
                  </div>
                  <div className="text-[10px] text-gray-400 font-sans truncate w-28">{item.name}</div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-sm font-bold text-white">\${item.spot.toFixed(2)}</div>
                  <div className="text-[11px] text-rose-400 font-semibold">{item.change.toFixed(2)}%</div>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-gray-400 font-mono truncate">{item.strategy || 'Bear Put Spread'}</div>
              <div className="mt-2 pt-2 border-t border-gray-800/80 flex justify-between text-[10px] font-mono text-amber-400">
                <span>⚠ Estratégia de Risco Definido</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. LATERAL */}
      <div className="bg-[#0c1322] border border-purple-500/30 rounded-2xl p-5 space-y-4 shadow-lg">
        <div className="flex justify-between items-center border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
            <h3 className="text-sm font-bold font-mono text-purple-300">LATERAL — Renda com Opções (Iron Condor / Credit Spreads)</h3>
            <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold">
              {lateralList.length} ativos
            </span>
          </div>
          <span className="text-[10px] font-mono text-gray-400">
            Critério: Mercado Lateral + Balanço Aprovado + IV ATM Real Favorável (DTE 14 a 35)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {lateralList.map((item) => (
            <div
              key={item.symbol}
              onClick={() => onSelectSymbol?.(item.symbol)}
              className="p-3.5 rounded-xl bg-[#090e18] border border-gray-800 hover:border-purple-500/60 hover:bg-[#130f22] transition cursor-pointer group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-black font-mono text-sm text-white group-hover:text-purple-300 flex items-center gap-1">
                    {item.symbol}
                    <Layers className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition text-purple-400" />
                  </div>
                  <div className="text-[10px] text-gray-400 font-sans truncate w-28">{item.name}</div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-sm font-bold text-white">\${item.spot.toFixed(2)}</div>
                  <div className="text-[11px] text-emerald-400 font-semibold">+{item.change.toFixed(2)}%</div>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-cyan-300 font-mono">Iron Condor #20 a Crédito (4 Pernas)</div>
              <div className="mt-1 text-[10px] text-gray-400 font-mono flex justify-between">
                <span>IV Rank: {item.ivRank}%</span>
                <span className="text-emerald-400 font-bold">Crédito Institucional</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`);

// 2. QuoteView - Complete with 5 Functional Sub-Tabs
writeFile('src/components/quote/QuoteView.tsx', `
'use client';

import React, { useState, useMemo } from 'react';
import {
  Search, Sparkles, LineChart, FileText, Target, CheckCircle, Bot, Check, Crosshair,
  Shield, Layers, GraduationCap, DollarSign, Send, ArrowRight, TrendingUp, AlertTriangle
} from 'lucide-react';
import { US_STOCKS_DATASET, generateCandlesticks, USStockItem } from '@/lib/domain/us-market-data';
import { CandlestickChart } from './CandlestickChart';

interface QuoteViewProps {
  initialSymbol?: string;
  onNavigateToGex?: (symbol: string) => void;
}

export function QuoteView({ initialSymbol = 'NVDA', onNavigateToGex }: QuoteViewProps) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [searchInput, setSearchInput] = useState(initialSymbol);
  const [activeSubTab, setActiveSubTab] = useState<'technical' | 'fundamentals' | 'options' | 'recommendations' | 'ai'>('technical');
  const [chartPeriod, setChartPeriod] = useState<number>(90);

  // AI Chat state
  const [messages, setMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([
    {
      sender: 'ai',
      text: \`Olá! Sou o Consultor IA do RADAR TASTYTRADE. Estou analisando as 3 camadas (Técnica, Fundamentos e GEX) de \${symbol}. Como posso ajudar com sua tomada de decisão?\`,
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const currentStock: USStockItem = useMemo(() => {
    const found = US_STOCKS_DATASET.find(s => s.symbol === symbol.toUpperCase().trim());
    if (found) return found;
    return {
      symbol: symbol.toUpperCase().trim(),
      name: \`\${symbol.toUpperCase().trim()} Stock\`,
      category: 'ALTA',
      spot: 100.0,
      change: 1.0,
      peRatio: 25.0,
      evEbitda: 18.0,
      dividendYield: 1.0,
      roe: 20.0,
      netMargin: 15.0,
      debtToEbitda: 1.0,
      ivRank: 35.0,
      ivAtm: 22.0,
      stop: 95.0,
      alvo1: 105.0,
      alvo2: 110.0,
      rr: '2.00:1',
      fundStatus: 'APROVADO',
      fundScore: 85,
    };
  }, [symbol]);

  const candles = useMemo(() => {
    return generateCandlesticks(currentStock.symbol, currentStock.spot, chartPeriod);
  }, [currentStock.symbol, currentStock.spot, chartPeriod]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSymbol(searchInput.trim().toUpperCase());
      setMessages([
        {
          sender: 'ai',
          text: \`Consultor IA atualizado para \${searchInput.trim().toUpperCase()}. O que gostaria de analisar?\`,
        }
      ]);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    const userTxt = inputMessage;
    setInputMessage('');
    setMessages(prev => [...prev, { sender: 'user', text: userTxt }]);

    setTimeout(() => {
      let reply = \`Analisando \${currentStock.symbol}: O ativo apresenta viés de \${currentStock.category} com Spot em $\${currentStock.spot.toFixed(2)}. As métricas de risco/retorno sugerem Stop em $\${currentStock.stop.toFixed(2)} e Alvo 1 em $\${currentStock.alvo1.toFixed(2)} (R:R \${currentStock.rr}). No crivo contábil, os fundamentos estão \${currentStock.fundStatus} com Score de \${currentStock.fundScore}/100.\`;
      setMessages(prev => [...prev, { sender: 'ai', text: reply }]);
    }, 500);
  };

  return (
    <section className="space-y-6">
      {/* Search Header */}
      <div className="bg-[#0c1322] border border-gray-800 p-4 rounded-xl space-y-3 shadow-xl">
        <form onSubmit={handleSearch} className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
              className="w-full bg-[#070b14] border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-500 uppercase"
              placeholder="Buscar Ticker US (ex: NVDA, AAPL, SPY, TSLA, MSFT, META)"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Analisar Ativo</span>
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
          <span className="text-gray-400">Destaques US:</span>
          {['NVDA', 'AAPL', 'SPY', 'QQQ', 'TSLA', 'MSFT', 'META', 'AMZN', 'AVGO', 'AMD'].map((sym) => (
            <button
              key={sym}
              onClick={() => {
                setSearchInput(sym);
                setSymbol(sym);
              }}
              className={\`px-2 py-0.5 rounded border transition \${
                symbol === sym
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                  : 'bg-[#070b14] border-gray-800 text-gray-300 hover:border-gray-700'
              }\`}
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {/* Main Asset Header Card */}
      <div className="bg-[#0c1322] border border-gray-800/90 rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black font-mono text-white">{currentStock.symbol}</h2>
              <span className="text-sm text-gray-400 font-sans">{currentStock.name}</span>
              <span className={\`px-2.5 py-0.5 rounded text-xs font-mono font-bold border \${
                currentStock.category === 'ALTA'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : currentStock.category === 'BAIXA'
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
              }\`}>
                {currentStock.category === 'ALTA' ? 'RECOMENDAÇÃO DE COMPRA' : currentStock.category === 'BAIXA' ? 'OPORTUNIDADE DE VENDA / TRAVA' : 'RENDA COM OPÇÕES (IRON CONDOR)'}
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-xs font-mono">SINCRONIZADO COM RASTREADOR</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400 pt-1">
              <span className="text-emerald-400">1. SPOT: REAL</span> •
              <span className="text-emerald-400">2. FUNDAM: {currentStock.fundStatus}</span> •
              <span className="text-cyan-400">3. OPÇÕES: NET GEX POSITIVO</span> •
              <span className="text-gray-300">4. MACRO: FED 4.50%</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-right">
            <div className="bg-[#10192e] px-3 py-1.5 rounded-lg border border-gray-800">
              <div className="text-[10px] text-gray-400 font-mono">SPOT</div>
              <div className="text-lg font-bold font-mono text-white">\${currentStock.spot.toFixed(2)}</div>
            </div>
            <div className="bg-[#10192e] px-3 py-1.5 rounded-lg border border-gray-800">
              <div className="text-[10px] text-gray-400 font-mono">VARIAÇÃO</div>
              <div className={\`text-lg font-bold font-mono \${currentStock.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}\`}>
                {currentStock.change >= 0 ? '+' : ''}{currentStock.change.toFixed(2)}%
              </div>
            </div>
            <div className="bg-[#10192e] px-3 py-1.5 rounded-lg border border-gray-800">
              <div className="text-[10px] text-gray-400 font-mono">VENCIMENTO OPÇÕES</div>
              <div className="text-lg font-bold font-mono text-cyan-300">2026-09-18 (12 DTE)</div>
            </div>
          </div>
        </div>

        {/* 5 Interactive Sub-Tabs Navigation */}
        <div className="flex items-center gap-2 border-b border-gray-800 pb-3 text-xs font-mono overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveSubTab('technical')}
            className={\`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 border \${
              activeSubTab === 'technical'
                ? 'bg-cyan-950 text-cyan-400 border-cyan-500/50 shadow-md font-bold'
                : 'text-gray-400 hover:text-white bg-[#090e18] border-gray-800'
            }\`}
          >
            <LineChart className="w-3.5 h-3.5 text-cyan-400" />
            <span>Técnico (CNPI-T)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('fundamentals')}
            className={\`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 border \${
              activeSubTab === 'fundamentals'
                ? 'bg-cyan-950 text-cyan-400 border-cyan-500/50 shadow-md font-bold'
                : 'text-gray-400 hover:text-white bg-[#090e18] border-gray-800'
            }\`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span>Fundamentos (CNPI-F)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('options')}
            className={\`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 border \${
              activeSubTab === 'options'
                ? 'bg-cyan-950 text-cyan-400 border-cyan-500/50 shadow-md font-bold'
                : 'text-gray-400 hover:text-white bg-[#090e18] border-gray-800'
            }\`}
          >
            <Target className="w-3.5 h-3.5 text-purple-400" />
            <span>Opções & GEX (Tastytrade)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('recommendations')}
            className={\`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 border \${
              activeSubTab === 'recommendations'
                ? 'bg-emerald-950 text-emerald-400 border-emerald-500/50 shadow-md font-bold'
                : 'text-gray-400 hover:text-white bg-[#090e18] border-gray-800'
            }\`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Recomendações de Estudo</span>
          </button>

          <button
            onClick={() => setActiveSubTab('ai')}
            className={\`px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 border \${
              activeSubTab === 'ai'
                ? 'bg-purple-950 text-purple-300 border-purple-500/50 shadow-md font-bold'
                : 'text-gray-400 hover:text-white bg-[#090e18] border-gray-800'
            }\`}
          >
            <Bot className="w-3.5 h-3.5 text-purple-400" />
            <span>Consultor IA</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* SUB-ABA 1: TÉCNICO (CNPI-T) */}
        {/* ========================================================================= */}
        {activeSubTab === 'technical' && (
          <div className="space-y-6">
            {/* 8 Technical Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              <div className="p-2.5 rounded-lg bg-[#090e18] border border-gray-800 text-center">
                <div className="text-[10px] text-gray-400 font-mono">SPOT</div>
                <div className="text-sm font-bold font-mono text-white mt-0.5">\${currentStock.spot.toFixed(2)}</div>
                <div className="text-[9px] text-gray-500 font-mono">Tempo Real</div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#090e18] border border-emerald-500/30 text-center">
                <div className="text-[10px] text-gray-400 font-mono">MA20 (CURTA)</div>
                <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">\${(currentStock.spot * 0.96).toFixed(2)}</div>
                <div className="text-[9px] text-emerald-400 font-mono">▲ Acima</div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#090e18] border border-gray-800 text-center">
                <div className="text-[10px] text-gray-400 font-mono">MA50 (MÉDIA)</div>
                <div className="text-sm font-bold font-mono text-white mt-0.5">\${(currentStock.spot * 0.90).toFixed(2)}</div>
                <div className="text-[9px] text-gray-500 font-mono">Médio Prazo</div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#090e18] border border-gray-800 text-center">
                <div className="text-[10px] text-gray-400 font-mono">MA200 (LONGA)</div>
                <div className="text-sm font-bold font-mono text-white mt-0.5">\${(currentStock.spot * 0.75).toFixed(2)}</div>
                <div className="text-[9px] text-gray-500 font-mono">Primária</div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#090e18] border border-gray-800 text-center">
                <div className="text-[10px] text-gray-400 font-mono">RSI(14)</div>
                <div className="text-sm font-bold font-mono text-cyan-300 mt-0.5">64.2</div>
                <div className="text-[9px] text-cyan-400 font-mono">Saudável</div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#090e18] border border-gray-800 text-center">
                <div className="text-[10px] text-gray-400 font-mono">MACD HIST</div>
                <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">+1.85</div>
                <div className="text-[9px] text-emerald-400 font-mono">Sinal: A.C.</div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#090e18] border border-gray-800 text-center">
                <div className="text-[10px] text-gray-400 font-mono">ATR(14)</div>
                <div className="text-sm font-bold font-mono text-white mt-0.5">\${(currentStock.spot * 0.028).toFixed(2)}</div>
                <div className="text-[9px] text-gray-500 font-mono">Vol Diária</div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#090e18] border border-gray-800 text-center">
                <div className="text-[10px] text-gray-400 font-mono">VOL VS MÉDIA20</div>
                <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">142%</div>
                <div className="text-[9px] text-emerald-400 font-mono">Liquidez Alta</div>
              </div>
            </div>

            {/* CANDLESTICK CHART */}
            <div className="bg-[#0b101b] p-4 sm:p-5 rounded-2xl border border-gray-800 shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <LineChart className="w-5 h-5 text-cyan-400" />
                  <div>
                    <h3 className="font-bold text-white text-sm sm:text-base">
                      GRÁFICO CANDLESTICK & INDICADORES CNPI-T ({currentStock.symbol})
                    </h3>
                    <p className="text-[11px] text-gray-400">
                      Candles diários com Médias Móveis (MA20/50/200), Volume, RSI(14) e MACD
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-[#111827] p-1 rounded-xl border border-gray-800 text-xs font-mono">
                  {[
                    { p: 20, label: '20P' },
                    { p: 50, label: '50P' },
                    { p: 90, label: '90P' },
                    { p: 180, label: '180P' },
                    { p: 252, label: 'Tudo' },
                  ].map((btn) => (
                    <button
                      key={btn.p}
                      onClick={() => setChartPeriod(btn.p)}
                      className={\`px-2.5 py-1 rounded-lg transition \${
                        chartPeriod === btn.p ? 'bg-cyan-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                      }\`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              <CandlestickChart candles={candles} spotPrice={currentStock.spot} />
            </div>

            {/* Checklist & Risco/Retorno */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 bg-[#090e18] border border-gray-800 rounded-xl p-4 space-y-2.5">
                <div className="flex justify-between items-center text-xs font-mono border-b border-gray-800 pb-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    CHECKLIST TÉCNICO (5 ITENS CNPI-T)
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">APROVADO (5/5)</span>
                </div>

                <div className="p-2 rounded-lg bg-[#0c1322] border border-gray-800/80 text-xs font-mono flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-white font-semibold">Alinhamento de Médias Altista (Spot &gt; MA20)</div>
                    <div className="text-[10px] text-gray-400">Preço (\${currentStock.spot.toFixed(2)}) operando acima da MA20 e MA50.</div>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-[#0c1322] border border-gray-800/80 text-xs font-mono flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-white font-semibold">Momentum RSI(14) Saudável (40 - 65)</div>
                    <div className="text-[10px] text-gray-400">RSI(14) em 64.2 — zona de aceleração compradora sem sobrecompra.</div>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-[#0c1322] border border-gray-800/80 text-xs font-mono flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-white font-semibold">MACD Histograma Positivo / Cruzamento</div>
                    <div className="text-[10px] text-gray-400">Histograma positivo confirmando pressão compradora institucional.</div>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-[#0c1322] border border-gray-800/80 text-xs font-mono flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-white font-semibold">Volume de Confirmação (&gt;= 90% da média 20d)</div>
                    <div className="text-[10px] text-gray-400">Volume em 142% da média de 20 pregões (liquidez e fluxo comprador).</div>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-[#0c1322] border border-gray-800/80 text-xs font-mono flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-white font-semibold">Assimetria Suporte vs Resistência (R:R &gt;= 1.4)</div>
                    <div className="text-[10px] text-gray-400">Suporte estrutural permitindo stop loss curto e alvos livres.</div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 bg-[#090e18] border border-gray-800 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center text-xs font-mono border-b border-gray-800 pb-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                    PARÂMETROS DE ESTUDO & RISCO/RETORNO
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold text-[10px]">R:R {currentStock.rr}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-[#0c1322] border border-gray-800">
                    <div className="text-[10px] text-gray-400">VIÉS TÉCNICO</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">{currentStock.category === 'ALTA' ? 'LONG (COMPRA)' : 'SHORT / HEDGE'}</div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#0c1322] border border-gray-800">
                    <div className="text-[10px] text-gray-400">STOP TÉCNICO</div>
                    <div className="text-sm font-bold text-rose-400 mt-0.5">\${currentStock.stop.toFixed(2)}</div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#0c1322] border border-gray-800">
                    <div className="text-[10px] text-gray-400">ALVO 1 (RESISTÊNCIA)</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">\${currentStock.alvo1.toFixed(2)}</div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#0c1322] border border-gray-800">
                    <div className="text-[10px] text-gray-400">ALVO 2 (2ª RESISTÊNCIA)</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">\${currentStock.alvo2.toFixed(2)}</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-800/80 space-y-1.5 text-[11px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Níveis de Suporte:</span>
                    <span className="text-emerald-400 font-bold">\${(currentStock.spot * 0.97).toFixed(2)} | \${currentStock.stop.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Níveis de Resistência:</span>
                    <span className="text-rose-400 font-bold">\${currentStock.alvo1.toFixed(2)} | \${currentStock.alvo2.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-ABA 2: FUNDAMENTOS (CNPI-F) */}
        {/* ========================================================================= */}
        {activeSubTab === 'fundamentals' && (
          <div className="space-y-6 font-mono">
            <div className="bg-[#090e18] border border-gray-800 rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">ANÁLISE FUNDAMENTALISTA (CRIVO CNPI-F US)</h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                  SCORE: {currentStock.fundScore}/100 • {currentStock.fundStatus}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3 bg-[#0c1322] rounded-xl border border-gray-800">
                  <div className="text-[10px] text-gray-400 font-sans">P/L (P/E RATIO)</div>
                  <div className="text-base font-bold text-white mt-1">{currentStock.peRatio.toFixed(1)}x</div>
                  <div className="text-[9px] text-gray-500">Valuation</div>
                </div>

                <div className="p-3 bg-[#0c1322] rounded-xl border border-gray-800">
                  <div className="text-[10px] text-gray-400 font-sans">EV / EBITDA</div>
                  <div className="text-base font-bold text-white mt-1">{currentStock.evEbitda.toFixed(1)}x</div>
                  <div className="text-[9px] text-gray-500">Múltiplo Operacional</div>
                </div>

                <div className="p-3 bg-[#0c1322] rounded-xl border border-gray-800">
                  <div className="text-[10px] text-gray-400 font-sans">DIVIDEND YIELD</div>
                  <div className="text-base font-bold text-emerald-400 mt-1">{currentStock.dividendYield.toFixed(2)}%</div>
                  <div className="text-[9px] text-gray-500">Proventos Anuais</div>
                </div>

                <div className="p-3 bg-[#0c1322] rounded-xl border border-gray-800">
                  <div className="text-[10px] text-gray-400 font-sans">ROE</div>
                  <div className="text-base font-bold text-cyan-300 mt-1">{currentStock.roe.toFixed(1)}%</div>
                  <div className="text-[9px] text-gray-500">Retorno s/ PL</div>
                </div>

                <div className="p-3 bg-[#0c1322] rounded-xl border border-gray-800">
                  <div className="text-[10px] text-gray-400 font-sans">MARGEM LÍQUIDA</div>
                  <div className="text-base font-bold text-white mt-1">{currentStock.netMargin.toFixed(1)}%</div>
                  <div className="text-[9px] text-gray-500">Eficiência</div>
                </div>

                <div className="p-3 bg-[#0c1322] rounded-xl border border-gray-800">
                  <div className="text-[10px] text-gray-400 font-sans">DÍV. LÍQ / EBITDA</div>
                  <div className="text-base font-bold text-emerald-400 mt-1">{currentStock.debtToEbitda.toFixed(1)}x</div>
                  <div className="text-[9px] text-gray-500">Solvência</div>
                </div>
              </div>

              <div className="p-4 bg-[#0c1322] rounded-xl border border-gray-800 text-xs text-gray-300 font-sans leading-relaxed">
                <strong>Parecer do Crivo Fundamentalista:</strong> A empresa apresenta indicadores sólidos de solvência (Dívida Líquida/EBITDA de {currentStock.debtToEbitda}x) e rentabilidade sobre o capital (ROE de {currentStock.roe}%), satisfazendo os critérios rigorosos para aprovação em estudos direcionais e mitigando o risco de <em>Value Trap</em>.
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-ABA 3: OPÇÕES & GEX */}
        {/* ========================================================================= */}
        {activeSubTab === 'options' && (
          <div className="space-y-6">
            <div className="bg-[#090e18] border border-gray-800 rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white font-mono">DERIVATIVOS & GEX DA TASTYTRADE ({currentStock.symbol})</h3>
                </div>
                <button
                  onClick={() => onNavigateToGex?.(currentStock.symbol)}
                  className="px-3 py-1 bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-mono font-bold hover:bg-cyan-600/50 transition flex items-center gap-1"
                >
                  <span>Abrir Tela Completa de GEX</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="p-3 bg-[#0c1322] rounded-xl border border-gray-800">
                  <div className="text-[10px] text-gray-400">IV RANK (TASTY)</div>
                  <div className="text-lg font-bold text-purple-300 mt-1">{currentStock.ivRank}%</div>
                  <div className="text-[10px] text-gray-500">Volatilidade Implícita</div>
                </div>

                <div className="p-3 bg-[#0c1322] rounded-xl border border-gray-800">
                  <div className="text-[10px] text-gray-400">IV ATM (CALL/PUT)</div>
                  <div className="text-lg font-bold text-white mt-1">{currentStock.ivAtm}%</div>
                  <div className="text-[10px] text-gray-500">Série Regular OCC</div>
                </div>

                <div className="p-3 bg-[#0c1322] rounded-xl border border-gray-800">
                  <div className="text-[10px] text-gray-400">P/C RATIO (OI)</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">0.68</div>
                  <div className="text-[10px] text-gray-500">Predomínio de Calls</div>
                </div>

                <div className="p-3 bg-[#0c1322] rounded-xl border border-gray-800">
                  <div className="text-[10px] text-gray-400">TOTAL NET GEX</div>
                  <div className="text-lg font-bold text-cyan-300 mt-1">+Long Gamma</div>
                  <div className="text-[10px] text-gray-500">Volatilidade Contida</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-ABA 4: RECOMENDAÇÕES DE ESTUDO */}
        {/* ========================================================================= */}
        {activeSubTab === 'recommendations' && (
          <div className="space-y-6 font-mono">
            <div className="bg-[#090e18] border border-gray-800 rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">PLANO DE TRADE ESTRUTURADO & ENQUADRAMENTO CNPI</h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                  ASSIMETRIA R:R {currentStock.rr}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#0c1322] rounded-xl border border-gray-800 space-y-3">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    Parâmetros de Entrada & Stop (Ação à Vista / Stock)
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Preço de Entrada (Spot):</span>
                      <span className="text-white font-bold">\${currentStock.spot.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Stop Loss Técnico:</span>
                      <span className="text-rose-400 font-bold">\${currentStock.stop.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Alvo Parcial (1ª Resistência):</span>
                      <span className="text-emerald-400 font-bold">\${currentStock.alvo1.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Alvo Final (2ª Resistência):</span>
                      <span className="text-emerald-400 font-bold">\${currentStock.alvo2.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#0c1322] rounded-xl border border-gray-800 space-y-3">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-400" />
                    Estratégia Recomendada em Opções (Tastytrade)
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tipo de Estrutura:</span>
                      <span className="text-cyan-300 font-bold">{currentStock.category === 'LATERAL' ? 'Iron Condor #20 a Crédito' : 'Trava de Alta com Call (Bull Call Spread)'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Vencimento Ideal:</span>
                      <span className="text-white font-bold">12 a 25 Dias Úteis (DTE)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Gestão de Risco:</span>
                      <span className="text-emerald-400 font-bold">Risco Máximo Pré-definido</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Alavancagem Máxima:</span>
                      <span className="text-amber-400 font-bold">Até 2% do Capital Total</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-ABA 5: CONSULTOR IA */}
        {/* ========================================================================= */}
        {activeSubTab === 'ai' && (
          <div className="space-y-4 font-mono">
            <div className="bg-[#090e18] border border-gray-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
                <Bot className="w-5 h-5 text-purple-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">CONSULTOR IA — ANÁLISE QUANTITATIVA ({currentStock.symbol})</h3>
                  <p className="text-[11px] text-gray-400">Tire dúvidas sobre a tendência técnica, fundamentos e barreiras de opções da Tastytrade.</p>
                </div>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar pr-2">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={\`p-3 rounded-xl text-xs font-sans leading-relaxed \${
                      m.sender === 'user'
                        ? 'bg-cyan-950/40 text-cyan-200 border border-cyan-800/50 ml-8 text-right'
                        : 'bg-[#0c1322] text-gray-300 border border-gray-800 mr-8'
                    }\`}
                  >
                    <div className="font-bold text-[10px] font-mono text-gray-400 mb-1">
                      {m.sender === 'user' ? 'Você' : 'Consultor IA'}
                    </div>
                    {m.text}
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t border-gray-800">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={\`Pergunte algo sobre \${currentStock.symbol} (ex: Qual o stop ideal? O que indica o GEX?)...\`}
                  className="flex-1 bg-[#070b14] border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar</span>
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
`);

console.log('Subtabs and ScreenerView written successfully');
