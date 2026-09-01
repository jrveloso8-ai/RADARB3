const fs = require('fs');
const path = require('path');

const targetBase = 'C:/projetos antigravity/RADAR-TASYTRADE';

// 1. Update BarreirasGexView.tsx
const barreirasPath = path.join(targetBase, 'src/components/options/BarreirasGexView.tsx');
const barreirasCode = `'use client';

import React, { useState, useMemo } from 'react';
import { UnifiedGexBarreirasView } from './UnifiedGexBarreirasView';
import { US_STOCKS_DATASET } from '@/lib/domain/us-market-data';
import { Search, ArrowLeft, TrendingUp } from 'lucide-react';

interface BarreirasGexViewProps {
  initialSymbol?: string;
  onSelectSymbol?: (sym: string) => void;
  onBackToQuote?: (sym: string) => void;
  onBackToScreener?: () => void;
}

export function BarreirasGexView({ 
  initialSymbol = 'NVDA', 
  onSelectSymbol,
  onBackToQuote,
  onBackToScreener
}: BarreirasGexViewProps) {
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
      const clean = searchInput.trim().toUpperCase();
      setSelectedSymbol(clean);
      onSelectSymbol?.(clean);
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation & Search Bar */}
      <div className="bg-[#0c1322] border border-gray-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          {onBackToQuote && (
            <button
              onClick={() => onBackToQuote(selectedSymbol)}
              className="px-3.5 py-1.5 bg-[#070b14] hover:bg-gray-800 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para Consulta ({selectedSymbol})</span>
            </button>
          )}

          {onBackToScreener && (
            <button
              onClick={onBackToScreener}
              className="px-3.5 py-1.5 bg-[#070b14] hover:bg-gray-800 text-gray-300 border border-gray-800 rounded-xl text-xs font-mono transition flex items-center gap-1.5"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Rastreador</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar ativo (ex: NVDA, SPY)..."
              className="w-full bg-[#070b14] border border-gray-700 rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 uppercase"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono font-bold transition"
          >
            Buscar
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <span className="text-gray-400 mr-1">Atalhos:</span>
          {['NVDA', 'AAPL', 'MSFT', 'AMZN', 'META', 'TSLA', 'SPY', 'QQQ', 'KO'].map(sym => (
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
      <UnifiedGexBarreirasView 
        symbol={currentStock.symbol} 
        spotPrice={currentStock.spot} 
        onBackToQuote={onBackToQuote}
        onBackToScreener={onBackToScreener}
      />
    </div>
  );
}
`;
fs.writeFileSync(barreirasPath, barreirasCode.trim(), 'utf8');
console.log('BarreirasGexView.tsx updated');

// 2. Update page.tsx with navigation callbacks
const pagePath = path.join(targetBase, 'src/app/page.tsx');
const pageCode = `'use client';

import React, { useState } from 'react';
import { Navbar, ActiveTab } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PanoramaView } from '@/components/panorama/PanoramaView';
import { QuoteView } from '@/components/quote/QuoteView';
import { ScreenerView } from '@/components/screener/ScreenerView';
import { BarreirasGexView } from '@/components/options/BarreirasGexView';
import { HelpSupportView } from '@/components/help/HelpSupportView';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('panorama');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('NVDA');

  const handleSelectSymbolFromScreener = (symbol: string) => {
    setSelectedSymbol(symbol);
    setActiveTab('consulta');
  };

  const handleNavigateToGex = (symbol: string) => {
    setSelectedSymbol(symbol);
    setActiveTab('barreiras');
  };

  const handleBackToQuote = (symbol?: string) => {
    if (symbol) setSelectedSymbol(symbol);
    setActiveTab('consulta');
  };

  const handleBackToScreener = () => {
    setActiveTab('rastreador');
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#070b14] text-gray-100 selection:bg-emerald-500/30 selection:text-emerald-300">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} uniqueVisitors={3} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div id="panel-panorama" role="tabpanel" className={activeTab === 'panorama' ? 'block' : 'hidden'}>
          {activeTab === 'panorama' && <PanoramaView />}
        </div>

        <div id="panel-consulta" role="tabpanel" className={activeTab === 'consulta' ? 'block' : 'hidden'}>
          {activeTab === 'consulta' && (
            <QuoteView 
              initialSymbol={selectedSymbol} 
              onNavigateToGex={handleNavigateToGex}
              onBackToScreener={handleBackToScreener}
            />
          )}
        </div>

        <div id="panel-rastreador" role="tabpanel" className={activeTab === 'rastreador' ? 'block' : 'hidden'}>
          {activeTab === 'rastreador' && <ScreenerView onSelectSymbol={handleSelectSymbolFromScreener} />}
        </div>

        <div id="panel-barreiras" role="tabpanel" className={activeTab === 'barreiras' ? 'block' : 'hidden'}>
          {activeTab === 'barreiras' && (
            <BarreirasGexView 
              initialSymbol={selectedSymbol} 
              onSelectSymbol={(sym) => setSelectedSymbol(sym)}
              onBackToQuote={handleBackToQuote}
              onBackToScreener={handleBackToScreener}
            />
          )}
        </div>

        <div id="panel-manual" role="tabpanel" className={activeTab === 'manual' ? 'block' : 'hidden'}>
          {activeTab === 'manual' && <HelpSupportView />}
        </div>
      </main>

      <Footer />
    </div>
  );
}
`;
fs.writeFileSync(pagePath, pageCode.trim(), 'utf8');
console.log('page.tsx updated with navigation handlers');

// 3. Update QuoteView.tsx strategy rules and DTE
const quoteViewPath = path.join(targetBase, 'src/components/quote/QuoteView.tsx');
let quoteContent = fs.readFileSync(quoteViewPath, 'utf8');

// Update Iron Condor DTE to 17 and US pricing rule (up to 50%)
quoteContent = quoteContent.replace(
  `dte: 12,
        expirationDate: '2026-09-18',`,
  `dte: 17,
        expirationDate: '2026-09-18',`
);

quoteContent = quoteContent.replace(
  `recommendationRule: 'Iron Condor: Capturar entre 30% e 40% da largura mínima da asa.',`,
  `recommendationRule: 'Iron Condor (EUA): Capturar entre 33% (1/3) a 50% da largura da asa (vs 25%-30% no Brasil devido à inflação e juros).',`
);

quoteContent = quoteContent.replace(
  `recommendationRule: 'Bull Call: Custo de montagem ideal abaixo de 45% da largura do spread.',`,
  `recommendationRule: 'Bull Call (EUA): Pagar até 50% da largura da asa no débito (máximo aceitável no mercado americano).',`
);

quoteContent = quoteContent.replace(
  `recommendationRule: 'Bear Put: Custo de montagem ideal abaixo de 45% da largura do spread.',`,
  `recommendationRule: 'Bear Put (EUA): Pagar até 50% da largura da asa no débito (máximo aceitável no mercado americano).',`
);

// Add onBackToScreener button in QuoteView top bar if provided
if (!quoteContent.includes('onBackToScreener?: () => void;')) {
  quoteContent = quoteContent.replace(
    `interface QuoteViewProps {
  initialSymbol?: string;
  onNavigateToGex?: (symbol: string) => void;
}`,
    `interface QuoteViewProps {
  initialSymbol?: string;
  onNavigateToGex?: (symbol: string) => void;
  onBackToScreener?: () => void;
}`
  );

  quoteContent = quoteContent.replace(
    `export function QuoteView({ initialSymbol = 'NVDA', onNavigateToGex }: QuoteViewProps) {`,
    `export function QuoteView({ initialSymbol = 'NVDA', onNavigateToGex, onBackToScreener }: QuoteViewProps) {`
  );

  quoteContent = quoteContent.replace(
    `<h2 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <Search className="w-4 h-4 text-cyan-400" />
              <span>CONSULTA TÉCNICA INSTITUCIONAL CNPI-T (MERCADO US)</span>
            </h2>`,
    `<div className="flex items-center gap-3">
              {onBackToScreener && (
                <button
                  onClick={onBackToScreener}
                  className="px-2.5 py-1 bg-[#070b14] hover:bg-gray-800 text-gray-300 border border-gray-800 rounded-lg text-xs font-mono transition flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Rastreador</span>
                </button>
              )}
              <h2 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <Search className="w-4 h-4 text-cyan-400" />
                <span>CONSULTA TÉCNICA INSTITUCIONAL CNPI-T (MERCADO US)</span>
              </h2>
            </div>`
  );
}

fs.writeFileSync(quoteViewPath, quoteContent, 'utf8');
console.log('QuoteView.tsx updated with 17 DTE, US 50% strategy pricing, and back button');
