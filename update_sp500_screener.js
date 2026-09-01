const fs = require('fs');
const path = require('path');

const targetBase = 'C:/projetos antigravity/RADAR-TASYTRADE';

const screenerCode = `'use client';

import React, { useState, useMemo } from 'react';
import { RefreshCw, Search, ArrowUpRight, TrendingDown, Layers, Filter, Building2 } from 'lucide-react';
import { US_STOCKS_DATASET, USStockItem } from '@/lib/domain/us-market-data';

interface ScreenerViewProps {
  onSelectSymbol?: (symbol: string) => void;
}

export function ScreenerView({ onSelectSymbol }: ScreenerViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [scanLimit, setScanLimit] = useState<number | 'ALL'>(100);
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sectors = useMemo(() => {
    const sSet = new Set<string>();
    US_STOCKS_DATASET.forEach(s => {
      if (s.sector) sSet.add(s.sector);
    });
    return Array.from(sSet);
  }, []);

  const filteredList = useMemo(() => {
    let list = US_STOCKS_DATASET;
    
    // Sector filter
    if (selectedSector !== 'ALL') {
      list = list.filter(item => item.sector === selectedSector);
    }

    // Text search
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toUpperCase();
      list = list.filter(item => item.symbol.includes(q) || item.name.toUpperCase().includes(q));
    }

    // Limit filter
    if (scanLimit !== 'ALL') {
      list = list.slice(0, scanLimit);
    }

    return list;
  }, [searchTerm, scanLimit, selectedSector]);

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
              <h2 className="text-lg font-bold text-white tracking-tight">Rastreador de Oportunidades & Lista de Execução (S&P 500)</h2>
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">
                Classificação Técnica + Crivo CNPI-US + Execução Tastytrade
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Escaneamento contínuo das ações do S&P 500 filtradas por solvência, alinhamento de médias móveis e liquidez de opções.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#070b14] p-1 rounded-lg border border-gray-800 text-[11px] font-mono">
              <span className="text-gray-400 px-2 flex items-center gap-1">
                <Filter className="w-3 h-3 text-cyan-400" />
                Escanear:
              </span>
              {[50, 100, 250, 'ALL'].map((limit) => (
                <button
                  key={limit}
                  onClick={() => setScanLimit(limit as number | 'ALL')}
                  className={\`px-2.5 py-1 rounded transition font-bold \${
                    scanLimit === limit
                      ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
                      : 'text-gray-400 hover:text-white'
                  }\`}
                >
                  {limit === 'ALL' ? 'Todos S&P 500' : \`Top \${limit}\`}
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
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por ticker (ex: NVDA, AAPL, SPY)..."
                className="w-full bg-[#070b14] border border-gray-700 rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 uppercase"
              />
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <Building2 className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={selectedSector}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="bg-[#070b14] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-gray-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">Todos os Setores ({US_STOCKS_DATASET.length} Ações)</option>
                {sectors.map(sec => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>
            </div>
          </div>

          <span className="text-xs font-mono text-gray-400">
            Total de Ativos Analisados no Crivo: <strong className="text-white font-bold">{filteredList.length}</strong> de {US_STOCKS_DATASET.length} ações
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
                  <div className="text-[9px] text-emerald-500/80 font-mono mt-0.5">{item.sector}</div>
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
                  <div className="text-[9px] text-rose-400/80 font-mono mt-0.5">{item.sector}</div>
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
                  <div className="text-[9px] text-purple-400/80 font-mono mt-0.5">{item.sector}</div>
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
`;

fs.writeFileSync(path.join(targetBase, 'src/components/screener/ScreenerView.tsx'), screenerCode.trim(), 'utf8');
console.log('ScreenerView updated with S&P 500 and Sector filters');
