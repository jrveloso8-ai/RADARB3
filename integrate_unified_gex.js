const fs = require('fs');
const path = require('path');

const targetBase = 'C:/projetos antigravity/RADAR-TASYTRADE';

// 1. Update QuoteView.tsx
const quoteViewPath = path.join(targetBase, 'src/components/quote/QuoteView.tsx');
let quoteContent = fs.readFileSync(quoteViewPath, 'utf8');

quoteContent = quoteContent.replace(
  `import { OptionPayoffChart, ElectedStrategyData } from '../options/OptionPayoffChart';`,
  `import { OptionPayoffChart, ElectedStrategyData } from '../options/OptionPayoffChart';
import { UnifiedGexBarreirasView } from '../options/UnifiedGexBarreirasView';`
);

// Replace tab 'opcoes' content
const oldOpcoesBlock = `      {/* Sub-Tab 3: Opções & GEX */}
      {activeTab === 'opcoes' && (
        <div className="bg-[#0c1322] border border-gray-800 p-6 rounded-2xl space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-3 border-b border-gray-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white font-mono">OPÇÕES & GAMMA EXPOSURE (TASTYTRADE API)</h3>
              <p className="text-xs text-gray-400 mt-0.5">Métricas de volatilidade implícita e exposição gama em tempo real.</p>
            </div>
            {handleNavGex && (
              <button
                onClick={() => handleNavGex(currentStock.symbol)}
                className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 shadow-md shadow-cyan-600/20"
              >
                <span>Ver Mapa GEX & Barreiras</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-4 bg-[#070b14] rounded-xl border border-gray-800">
              <span className="text-gray-400 text-[10px] block font-sans">IV Rank</span>
              <span className="text-lg font-bold text-purple-400 mt-1 block">{currentStock.ivRank}%</span>
              <span className="text-[10px] text-gray-400">Volatilidade Histórica</span>
            </div>
            <div className="p-4 bg-[#070b14] rounded-xl border border-gray-800">
              <span className="text-gray-400 text-[10px] block font-sans">IV ATM (30 DTE)</span>
              <span className="text-lg font-bold text-cyan-400 mt-1 block">{currentStock.ivAtm}%</span>
              <span className="text-[10px] text-gray-400">Volatilidade Atual</span>
            </div>
            <div className="p-4 bg-[#070b14] rounded-xl border border-gray-800">
              <span className="text-gray-400 text-[10px] block font-sans">Put/Call Ratio</span>
              <span className="text-lg font-bold text-emerald-400 mt-1 block">0.68</span>
              <span className="text-[10px] text-emerald-400">Sentimento Altista</span>
            </div>
            <div className="p-4 bg-[#070b14] rounded-xl border border-gray-800">
              <span className="text-gray-400 text-[10px] block font-sans">Regime GEX</span>
              <span className="text-lg font-bold text-emerald-400 mt-1 block">+GEX POSITIVO</span>
              <span className="text-[10px] text-emerald-400">Volatilidade Suprimida</span>
            </div>
          </div>
        </div>
      )}`;

const newOpcoesBlock = `      {/* Sub-Tab 3: Opções & GEX UNIFICADO */}
      {activeTab === 'opcoes' && (
        <div className="space-y-4">
          <UnifiedGexBarreirasView symbol={currentStock.symbol} spotPrice={currentStock.spot} isEmbedded={true} />
        </div>
      )}`;

quoteContent = quoteContent.replace(oldOpcoesBlock, newOpcoesBlock);
fs.writeFileSync(quoteViewPath, quoteContent, 'utf8');
console.log('QuoteView.tsx updated with embedded UnifiedGexBarreirasView');

// 2. Update BarreirasGexView.tsx
const barreirasViewPath = path.join(targetBase, 'src/components/options/BarreirasGexView.tsx');
const newBarreirasViewCode = `'use client';

import React, { useState, useMemo } from 'react';
import { UnifiedGexBarreirasView } from './UnifiedGexBarreirasView';
import { US_STOCKS_DATASET } from '@/lib/domain/us-market-data';
import { Search } from 'lucide-react';

interface BarreirasGexViewProps {
  initialSymbol?: string;
  onSelectSymbol?: (sym: string) => void;
}

export function BarreirasGexView({ initialSymbol = 'NVDA', onSelectSymbol }: BarreirasGexViewProps) {
  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol || 'NVDA');
  const [searchInput, setSearchInput] = useState('');

  const currentStock = useMemo(() => {
    const found = US_STOCKS_DATASET.find(s => s.symbol === selectedSymbol.toUpperCase().trim());
    if (found) return found;
    return {
      symbol: selectedSymbol.toUpperCase().trim(),
      name: \`\${selectedSymbol.toUpperCase().trim()} Stock\`,
      spot: 150.00,
    };
  }, [selectedSymbol]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSelectedSymbol(searchInput.trim().toUpperCase());
      onSelectSymbol?.(searchInput.trim().toUpperCase());
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Search & Symbol Selector Bar */}
      <div className="bg-[#0c1322] border border-gray-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar ativo (ex: NVDA, SPY, TSLA)..."
              className="w-full bg-[#070b14] border border-gray-700 rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 uppercase"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono font-bold transition"
          >
            Consultar
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <span className="text-gray-400 mr-1">Atalhos:</span>
          {['NVDA', 'AAPL', 'MSFT', 'AMZN', 'META', 'TSLA', 'SPY', 'QQQ'].map(sym => (
            <button
              key={sym}
              onClick={() => {
                setSelectedSymbol(sym);
                onSelectSymbol?.(sym);
              }}
              className={\`px-2.5 py-1 rounded-lg transition \${
                selectedSymbol === sym
                  ? 'bg-cyan-500 text-slate-950 font-black'
                  : 'bg-[#070b14] text-gray-400 hover:text-white border border-gray-800'
              }\`}
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {/* Main Unified View Component */}
      <UnifiedGexBarreirasView symbol={currentStock.symbol} spotPrice={currentStock.spot} />
    </div>
  );
}
`;

fs.writeFileSync(barreirasViewPath, newBarreirasViewCode.trim(), 'utf8');
console.log('BarreirasGexView.tsx updated to use UnifiedGexBarreirasView');
