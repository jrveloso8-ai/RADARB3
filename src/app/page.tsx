'use client';

import React, { useState } from 'react';
import { Navbar, ActiveTab } from '@/components/layout/Navbar';
import { TradingViewOverview } from '@/components/tradingview/TradingViewOverview';
import { QuoteView } from '@/components/quote/QuoteView';
import { ScreenerView } from '@/components/screener/ScreenerView';
import { OptionsBarriersView } from '@/components/options/OptionsBarriersView';
import { AIConsultantView } from '@/components/ai/AIConsultantView';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('PETR4');

  const handleSelectSymbolFromScreener = (symbol: string) => {
    setSelectedSymbol(symbol);
    setActiveTab('quote');
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Barra de Navegação */}
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && <TradingViewOverview />}
        {activeTab === 'quote' && <QuoteView initialSymbol={selectedSymbol} />}
        {activeTab === 'screener' && (
          <ScreenerView onSelectSymbol={handleSelectSymbolFromScreener} />
        )}
        {activeTab === 'options' && <OptionsBarriersView />}
        {activeTab === 'ai' && <AIConsultantView />}
      </main>

      {/* Footer com Metadados e Informações Técnicas */}
      <footer className="border-t border-gray-800/80 bg-[#0b0f19] py-6 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 RADAR B3 PRO IA — Plataforma Analítica & Quantitativa B3</p>
          <div className="flex items-center gap-4 text-gray-400">
            <span>Médias: MM20 • MM50 • MM200</span>
            <span>•</span>
            <span>25 Estratégias CME Group</span>
            <span>•</span>
            <span>Dados de Mercado B3</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
