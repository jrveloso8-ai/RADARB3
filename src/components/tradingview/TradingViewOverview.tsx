'use client';

import React, { useEffect, useRef } from 'react';
import { LayoutDashboard, Globe, AlertCircle } from 'lucide-react';

export const TradingViewOverview: React.FC = () => {
  const tickerTapeRef = useRef<HTMLDivElement>(null);
  const marketOverviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Injetar widget Ticker Tape
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
          { proName: 'BMFBOVESPA:PETR4', title: 'PETROBRAS PN' },
          { proName: 'BMFBOVESPA:VALE3', title: 'VALE ON' },
          { proName: 'BMFBOVESPA:ITUB4', title: 'ITAÚ PN' },
          { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500' },
          { proName: 'TVC:GOLD', title: 'OURO' },
          { proName: 'TVC:UKOIL', title: 'PETRÓLEO BRENT' },
        ],
        showSymbolLogo: true,
        isTransparent: false,
        displayMode: 'adaptive',
        colorTheme: 'dark',
        locale: 'br',
      });
      tickerTapeRef.current.appendChild(script);
    }

    // 2. Injetar widget Market Overview
    if (marketOverviewRef.current && !marketOverviewRef.current.hasChildNodes()) {
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
        height: '620',
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
              { s: 'BMFBOVESPA:ITUB4', d: 'Itaú Unibanco' },
              { s: 'BMFBOVESPA:BBDC4', d: 'Bradesco PN' },
              { s: 'BMFBOVESPA:BBAS3', d: 'Banco do Brasil' },
              { s: 'BMFBOVESPA:WEGE3', d: 'WEG ON' },
            ],
          },
          {
            title: 'Internacional & Commodities Globais',
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
      marketOverviewRef.current.appendChild(script);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Ticker Tape */}
      <div className="rounded-xl overflow-hidden border border-gray-800 bg-[#111827] shadow-lg">
        <div ref={tickerTapeRef} className="tradingview-widget-container" />
      </div>

      {/* Header com Descrição */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#111827] to-[#1e293b] p-6 rounded-2xl border border-gray-800 shadow-md">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Panorama do Mercado Financeiro</h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Visão macroeconômica em tempo real via widgets oficiais do TradingView cobrindo Ações B3, Futuros, Câmbio e Commodities.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 w-fit font-mono">
          <Globe className="w-4 h-4" />
          <span>Feeds em Tempo Real</span>
        </div>
      </div>

      {/* Market Overview Widget */}
      <div className="bg-[#111827] p-4 rounded-2xl border border-gray-800 shadow-xl overflow-hidden min-h-[640px]">
        <div ref={marketOverviewRef} className="tradingview-widget-container" />
      </div>
    </div>
  );
};
