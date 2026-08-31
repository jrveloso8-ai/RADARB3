'use client';

import React, { useState } from 'react';
import { Navbar, ActiveTab } from '@/components/layout/Navbar';
import { TradingViewOverview } from '@/components/tradingview/TradingViewOverview';
import { QuoteView } from '@/components/quote/QuoteView';
import { ScreenerView } from '@/components/screener/ScreenerView';
import { OptionsBarriersView } from '@/components/options/OptionsBarriersView';
import { HelpSupportView } from '@/components/help/HelpSupportView';

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
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && <TradingViewOverview />}
        {activeTab === 'quote' && <QuoteView initialSymbol={selectedSymbol} />}
        {activeTab === 'screener' && (
          <ScreenerView onSelectSymbol={handleSelectSymbolFromScreener} />
        )}
        {activeTab === 'options' && <OptionsBarriersView />}
        {activeTab === 'help' && <HelpSupportView />}
      </div>
    </div>
  );
}
