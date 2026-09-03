'use client';

import React, { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from '@/components/layout/Navbar';
import { TradingViewOverview } from '@/components/tradingview/TradingViewOverview';
import { OpportunityRadarView } from '@/components/opportunities/OpportunityRadarView';
import { QuoteView } from '@/components/quote/QuoteView';
import { ScreenerView } from '@/components/screener/ScreenerView';
import { OptionsBarriersView } from '@/components/options/OptionsBarriersView';
import { HelpSupportView } from '@/components/help/HelpSupportView';
import { SYSTEM_VERSION } from '@/lib/config/version';
import { Shield, Sparkles, TrendingUp, Users } from 'lucide-react';
import { safeFetchJson } from '@/lib/utils/api-client';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('opportunities');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('PETR4');
  const [uniqueVisitors, setUniqueVisitors] = useState<number | null>(null);

  // Rastreamento de Acessos Únicos diários
  useEffect(() => {
    async function trackVisit() {
      try {
        const { ok, data } = await safeFetchJson<{ uniqueToday: number; totalViewsToday: number }>('/api/analytics/track');
        if (ok && data?.uniqueToday) {
          setUniqueVisitors(data.uniqueToday);
        }
      } catch {
        // Silencioso em caso de falha de rede
      }
    }
    trackVisit();
  }, []);

  const handleSelectSymbolFromScreener = (symbol: string) => {
    setSelectedSymbol(symbol);
    setActiveTab('quote');
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#070b14] text-gray-100 selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Barra de Navegação */}
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Conteúdo Principal com declaração semântica de tabpanel */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div
          id="panel-overview"
          role="tabpanel"
          aria-labelledby="nav-tab-overview"
          className={activeTab === 'overview' ? 'block' : 'hidden'}
        >
          {activeTab === 'overview' && <TradingViewOverview />}
        </div>

        <div
          id="panel-opportunities"
          role="tabpanel"
          aria-labelledby="nav-tab-opportunities"
          className={activeTab === 'opportunities' ? 'block' : 'hidden'}
        >
          {activeTab === 'opportunities' && (
            <OpportunityRadarView onSelectSymbol={handleSelectSymbolFromScreener} />
          )}
        </div>

        <div
          id="panel-quote"
          role="tabpanel"
          aria-labelledby="nav-tab-quote"
          className={activeTab === 'quote' ? 'block' : 'hidden'}
        >
          {activeTab === 'quote' && <QuoteView initialSymbol={selectedSymbol} />}
        </div>

        <div
          id="panel-screener"
          role="tabpanel"
          aria-labelledby="nav-tab-screener"
          className={activeTab === 'screener' ? 'block' : 'hidden'}
        >
          {activeTab === 'screener' && (
            <ScreenerView onSelectSymbol={handleSelectSymbolFromScreener} />
          )}
        </div>

        <div
          id="panel-options"
          role="tabpanel"
          aria-labelledby="nav-tab-options"
          className={activeTab === 'options' ? 'block' : 'hidden'}
        >
          {activeTab === 'options' && <OptionsBarriersView />}
        </div>

        <div
          id="panel-help"
          role="tabpanel"
          aria-labelledby="nav-tab-help"
          className={activeTab === 'help' ? 'block' : 'hidden'}
        >
          {activeTab === 'help' && <HelpSupportView />}
        </div>
      </main>

      {/* Rodapé Global com Informações de Versão, Contador de Acessos e Governança */}
      <footer className="w-full border-t border-gray-800/80 bg-[#090e18] py-4 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-gray-400">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="font-bold text-white font-mono">RADAR B3 PRO IA</span>
            <span className="text-gray-600">|</span>
            <span className="font-mono text-emerald-400 font-semibold">{SYSTEM_VERSION.version}</span>
            <span className="text-gray-600">•</span>
            <span className="text-gray-400">Publicado em: <strong className="text-gray-300">{SYSTEM_VERSION.fullReleaseString}</strong></span>

            {uniqueVisitors !== null && uniqueVisitors > 0 && (
              <>
                <span className="text-gray-600 hidden sm:inline">•</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#111827] border border-gray-700/80 text-[11px] font-mono text-cyan-300 flex items-center gap-1 shadow-sm">
                  <Users className="w-3 h-3 text-cyan-400" />
                  <span><strong>{uniqueVisitors}</strong> {uniqueVisitors === 1 ? 'investidor único hoje' : 'investidores únicos hoje'}</span>
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4 text-gray-500 text-[11px] font-mono">
            <span>{SYSTEM_VERSION.specVersion}</span>
            <span className="text-gray-700">•</span>
            <span>B3 S.A. & BRAPI Realtime</span>
            <span className="text-gray-700">•</span>
            <span className="text-emerald-400/80 flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-400" />
              CNPI 3 Camadas
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
