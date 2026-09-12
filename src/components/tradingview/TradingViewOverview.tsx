'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  Globe,
  Thermometer,
} from 'lucide-react';
import { MarketOpeningSubscribeCard } from '../newsletter/MarketOpeningSubscribeCard';
import { SentimentThermometer } from '../sentiment/SentimentThermometer';

export type OverviewViewType = 'sentimento' | 'indices';

export const TradingViewOverview: React.FC = () => {
  const tickerTapeRef = useRef<HTMLDivElement>(null);
  const marketOverviewRef = useRef<HTMLDivElement>(null);

  // Estado para as visões do Panorama Geral
  const [activeView, setActiveView] = useState<OverviewViewType>('sentimento');

  // Inicialização do Ticker Tape
  useEffect(() => {
    if (tickerTapeRef.current && !tickerTapeRef.current.hasChildNodes()) {
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
      script.async = true;
      script.type = 'text/javascript';
      script.innerHTML = JSON.stringify({
        symbols: [
          { proName: 'BMFBOVESPA:IBOV', title: 'IBOVESPA' },
          { proName: 'BMFBOVESPA:WIN1!', title: 'MINI ÍNDICE' },
          { proName: 'BMFBOVESPA:WDO1!', title: 'MINI DÓLAR' },
          { proName: 'BMFBOVESPA:CCM1!', title: 'MILHO FUT' },
          { proName: 'BMFBOVESPA:BGI1!', title: 'BOI GORDO' },
          { proName: 'BMFBOVESPA:PETR4', title: 'PETROBRAS' },
          { proName: 'BMFBOVESPA:VALE3', title: 'VALE' },
          { proName: 'BMFBOVESPA:ITUB4', title: 'ITAÚ' },
          { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500' },
          { proName: 'FOREXCOM:NSXUSD', title: 'NASDAQ' },
          { proName: 'TVC:GOLD', title: 'OURO' },
          { proName: 'TVC:UKOIL', title: 'BRENT' },
        ],
        showSymbolLogo: true,
        isTransparent: false,
        displayMode: 'adaptive',
        colorTheme: 'dark',
        locale: 'br',
      });
      tickerTapeRef.current.appendChild(script);
    }
  }, []);

  // Inicialização do Market Overview Widget Oficial do TradingView
  useEffect(() => {
    const container = marketOverviewRef.current;
    if (!container) return;

    if (container.querySelector('iframe') || container.querySelector('script')) {
      return;
    }

    container.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js';
    script.async = true;
    script.type = 'text/javascript';
    script.innerHTML = JSON.stringify({
      colorTheme: 'dark',
      dateRange: '12M',
      showChart: true,
      locale: 'br',
      width: '100%',
      height: '660',
      largeChartUrl: '',
      isTransparent: false,
      showSymbolLogo: true,
      showFloatingTooltip: true,
      plotLineColorGrowing: 'rgba(34, 197, 94, 1)',
      plotLineColorFalling: 'rgba(239, 68, 68, 1)',
      gridLineColor: 'rgba(31, 41, 55, 0.5)',
      scaleFontColor: 'rgba(156, 163, 175, 1)',
      belowLineFillColorGrowing: 'rgba(34, 197, 94, 0.12)',
      belowLineFillColorFalling: 'rgba(239, 68, 68, 0.12)',
      symbolActiveColor: 'rgba(16, 185, 129, 0.15)',
      tabs: [
        {
          title: 'Mercado Futuro & Commodities B3',
          symbols: [
            { s: 'BMFBOVESPA:WIN1!', d: 'Mini Índice Futuro' },
            { s: 'BMFBOVESPA:WDO1!', d: 'Mini Dólar Futuro' },
            { s: 'BMFBOVESPA:CCM1!', d: 'Milho Futuro (CCM)' },
            { s: 'BMFBOVESPA:BGI1!', d: 'Boi Gordo Futuro (BGI)' },
            { s: 'FX_IDC:USDBRL', d: 'Dólar Comercial' },
            { s: 'BMFBOVESPA:IBOV', d: 'Ibovespa Spot' },
          ],
        },
        {
          title: 'Índices & Ações B3',
          symbols: [
            { s: 'BMFBOVESPA:IBOV', d: 'Ibovespa' },
            { s: 'BMFBOVESPA:PETR4', d: 'Petrobras PN' },
            { s: 'BMFBOVESPA:VALE3', d: 'Vale ON' },
            { s: 'BMFBOVESPA:ITUB4', d: 'Itaú Unibanco PN' },
            { s: 'BMFBOVESPA:BBDC4', d: 'Bradesco PN' },
            { s: 'BMFBOVESPA:BBAS3', d: 'Banco do Brasil ON' },
          ],
        },
        {
          title: 'Mercados Globais & Cripto',
          symbols: [
            { s: 'CBOT:ZC1!', d: 'Milho CBOT' },
            { s: 'CBOT:ZS1!', d: 'Soja CBOT' },
            { s: 'FOREXCOM:SPXUSD', d: 'S&P 500' },
            { s: 'TVC:UKOIL', d: 'Petróleo Brent' },
            { s: 'TVC:GOLD', d: 'Ouro Spot' },
            { s: 'CRYPTOCAP:BTC', d: 'Bitcoin' },
          ],
        },
      ],
    });
    container.appendChild(script);
  }, [activeView]);

  return (
    <div className="space-y-6">
      {/* Ticker Tape Superior (Widget Oficial TradingView) */}
      <div className="rounded-2xl overflow-hidden border border-gray-800 bg-[#111827] shadow-xl">
        <div ref={tickerTapeRef} className="tradingview-widget-container" />
      </div>

      {/* Navegação entre Visões Auditadas */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0b101b] border border-gray-800 p-2.5 rounded-2xl shadow-lg">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
            Visão do Panorama Geral:
          </span>
        </div>

        <div className="flex items-center gap-2" role="tablist" aria-label="Visões do Panorama">
          <button
            data-testid="overview-view-sentimento"
            role="tab"
            aria-selected={activeView === 'sentimento'}
            onClick={() => setActiveView('sentimento')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
              activeView === 'sentimento'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md font-mono'
                : 'bg-[#111827] text-gray-400 border-gray-800 hover:text-white'
            }`}
          >
            <Thermometer className="w-3.5 h-3.5 text-emerald-400" />
            <span>1. Sentimento & Termômetro 24h</span>
          </button>

          <button
            data-testid="overview-view-indices"
            role="tab"
            aria-selected={activeView === 'indices'}
            onClick={() => setActiveView('indices')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
              activeView === 'indices'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md font-mono'
                : 'bg-[#111827] text-gray-400 border-gray-800 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>2. Mercados Globais & B3 (TradingView Real-Time)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISÃO 1: SENTIMENTO & TERMÔMETRO 24H */}
      {/* ========================================================================= */}
      {activeView === 'sentimento' && (
        <div className="space-y-6">
          <SentimentThermometer variant="full" />
          <MarketOpeningSubscribeCard />
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISÃO 2: FEEDS OFICIAIS TRADINGVIEW EM TEMPO REAL */}
      {/* ========================================================================= */}
      {activeView === 'indices' && (
        <div className="space-y-6">
          <div className="bg-[#111827] p-4 rounded-3xl border-2 border-cyan-500/30 shadow-2xl overflow-hidden min-h-[680px]">
            <div className="flex items-center justify-between mb-3 px-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white text-sm">Feeds Oficiais TradingView em Tempo Real</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Feed Primário Oficial
              </span>
            </div>
            <div ref={marketOverviewRef} className="tradingview-widget-container" />
          </div>
        </div>
      )}
    </div>
  );
};
