'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  LayoutDashboard,
  Globe,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Flame,
  Shield,
  Activity,
  Calendar,
  DollarSign,
  Building2,
  Landmark,
  Radio,
  FileText,
  BarChart3,
  Scale,
  Crosshair,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  RefreshCw,
  Zap,
  Gauge,
  PieChart,
  Clock,
  Thermometer,
} from 'lucide-react';
import { MarketOpeningSubscribeCard } from '../newsletter/MarketOpeningSubscribeCard';
import { SentimentThermometer } from '../sentiment/SentimentThermometer';

export type OverviewViewType = 'sentimento' | 'indices' | 'setores';

export const TradingViewOverview: React.FC = () => {
  const tickerTapeRef = useRef<HTMLDivElement>(null);
  const marketOverviewRef = useRef<HTMLDivElement>(null);

  // Estado para as 3 visões do Panorama Geral (Spec v3.0 Item 11 N104)
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

  // Inicialização do Market Overview Widget
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

  // Setores da B3
  const sectorData = [
    {
      name: 'Financeiro & Bancos',
      ticker: 'IFNC',
      change: '+0.65%',
      isPositive: true,
      weight: '27.4%',
      leaders: ['ITUB4 (+0.8%)', 'BBAS3 (+0.5%)', 'BBDC4 (+0.4%)'],
      comment: 'Sustentado pela rentabilidade sólida (ROE > 20%) e fluxo de dividendos.',
    },
    {
      name: 'Petróleo, Gás & Biocombustíveis',
      ticker: 'IPET',
      change: '+0.42%',
      isPositive: true,
      weight: '16.8%',
      leaders: ['PETR4 (+0.5%)', 'PRIO3 (+1.1%)', 'UGPA3 (-0.2%)'],
      comment: 'Acompanhando a estabilidade do barril Brent acima de US$ 78.',
    },
    {
      name: 'Materiais Básicos & Mineração',
      ticker: 'IMAT',
      change: '+0.25%',
      isPositive: true,
      weight: '14.2%',
      leaders: ['VALE3 (+0.3%)', 'GGBR4 (+0.9%)', 'CSNA3 (-0.4%)'],
      comment: 'Minério de ferro em Dalian sustentando patamares de curto prazo.',
    },
    {
      name: 'Utilidade Pública & Elétricas',
      ticker: 'IEE',
      change: '+0.18%',
      isPositive: true,
      weight: '11.5%',
      leaders: ['ELET3 (+0.4%)', 'EGIE3 (+0.2%)', 'CPLE6 (+0.3%)'],
      comment: 'Fluxo defensivo buscando previsibilidade de caixa e proventos.',
    },
    {
      name: 'Consumo & Varejo',
      ticker: 'ICON',
      change: '-0.45%',
      isPositive: false,
      weight: '8.7%',
      leaders: ['ABEV3 (+0.1%)', 'MGLU3 (-1.8%)', 'ARZZ3 (-0.7%)'],
      comment: 'Pressionado pela persistência de juros altos e crédito seletivo.',
    },
    {
      name: 'Imobiliário & FIIs',
      ticker: 'IFIX / IMOB',
      change: '+0.12%',
      isPositive: true,
      weight: '5.2%',
      leaders: ['CYRE3 (+0.6%)', 'EZTC3 (-0.3%)', 'HGLG11 (+0.1%)'],
      comment: 'FIIs de papel resilientes; construção civil moderada.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Ticker Tape Superior */}
      <div className="rounded-2xl overflow-hidden border border-gray-800 bg-[#111827] shadow-xl">
        <div ref={tickerTapeRef} className="tradingview-widget-container" />
      </div>

      {/* Navegação entre as 3 Visões (Spec v3.0 Item 11 N104) */}
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
            <span>1. Sentimento & Termômetro</span>
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
            <span>2. Índices Globais & B3</span>
          </button>

          <button
            data-testid="overview-view-setores"
            role="tab"
            aria-selected={activeView === 'setores'}
            onClick={() => setActiveView('setores')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
              activeView === 'setores'
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-md font-mono'
                : 'bg-[#111827] text-gray-400 border-gray-800 hover:text-white'
            }`}
          >
            <PieChart className="w-3.5 h-3.5 text-purple-400" />
            <span>3. Setores da B3</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VISÃO 1: SENTIMENTO & TERMÔMETRO 24H */}
      {/* ========================================================================= */}
      {activeView === 'sentimento' && (
        <div className="space-y-6">
          <SentimentThermometer variant="full" />
          {/* Card de Inscrição no Resumo da Abertura do Mercado */}
          <MarketOpeningSubscribeCard />
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISÃO 2: ÍNDICES GLOBAIS & B3 */}
      {/* ========================================================================= */}
      {activeView === 'indices' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="p-5 bg-[#0b101b] border border-gray-800 rounded-2xl shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-white text-sm">1. Principais Bolsas Globais</h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  Viés Altista
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 bg-[#111827] rounded-xl border border-gray-800 font-mono">
                  <span className="font-sans text-gray-300 font-medium">S&P 500 (Futuro EUA)</span>
                  <span className="text-emerald-400 font-bold">+0.32%</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-[#111827] rounded-xl border border-gray-800 font-mono">
                  <span className="font-sans text-gray-300 font-medium">Nasdaq 100 (Tecnologia)</span>
                  <span className="text-emerald-400 font-bold">+0.45%</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-[#111827] rounded-xl border border-gray-800 font-mono">
                  <span className="font-sans text-gray-300 font-medium">Euro Stoxx 50 (Europa)</span>
                  <span className="text-emerald-400 font-bold">+0.20%</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-[#111827] rounded-xl border border-gray-800 font-mono">
                  <span className="font-sans text-gray-300 font-medium">Nikkei 225 (Japão)</span>
                  <span className="text-emerald-400 font-bold">+0.88%</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-[#111827] rounded-xl border border-gray-800 font-mono">
                  <span className="font-sans text-gray-300 font-medium">Hang Seng (Hong Kong)</span>
                  <span className="text-red-400 font-bold">-0.35%</span>
                </div>
              </div>
            </div>

            <div className="p-5 bg-[#0b101b] border border-gray-800 rounded-2xl shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <h3 className="font-bold text-white text-sm">2. Commodities Estratégicas</h3>
                </div>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  Estável / Suporte
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 bg-[#111827] rounded-xl border border-gray-800 font-mono">
                  <span className="font-sans text-gray-300 font-medium">Petróleo Brent (Londres)</span>
                  <span className="text-emerald-400 font-bold">US$ 78.40 (+0.4%)</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-[#111827] rounded-xl border border-gray-800 font-mono">
                  <span className="font-sans text-gray-300 font-medium">Petróleo WTI (Texas)</span>
                  <span className="text-emerald-400 font-bold">US$ 74.15 (+0.3%)</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-[#111827] rounded-xl border border-gray-800 font-mono">
                  <span className="font-sans text-gray-300 font-medium">Minério de Ferro (Dalian)</span>
                  <span className="text-emerald-400 font-bold">US$ 102.50 (+0.8%)</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-[#111827] rounded-xl border border-gray-800 font-mono">
                  <span className="font-sans text-gray-300 font-medium">Ouro Spot (Hedge Global)</span>
                  <span className="text-white font-bold">US$ 2.650 / oz</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-[#111827] rounded-xl border border-gray-800 font-mono">
                  <span className="font-sans text-gray-300 font-medium">Milho & Soja CBOT</span>
                  <span className="text-gray-300 font-bold">Misto (Safra EUA)</span>
                </div>
              </div>
            </div>

            <div className="p-5 bg-[#0b101b] border border-gray-800 rounded-2xl shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-bold text-white text-sm">3. Câmbio, DXY & Juros</h3>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                  Carry Trade Ativo
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 bg-[#111827] rounded-xl border border-gray-800 font-mono">
                  <span className="font-sans text-gray-300 font-medium">Dólar Comercial (USD/BRL)</span>
                  <span className="text-white font-bold">R$ 5.48 (-0.15%)</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-[#111827] rounded-xl border border-gray-800 font-mono">
                  <span className="font-sans text-gray-300 font-medium">Índice Dólar Global (DXY)</span>
                  <span className="text-gray-300 font-bold">103.85 (-0.08%)</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-[#111827] rounded-xl border border-gray-800 font-mono">
                  <span className="font-sans text-gray-300 font-medium">Treasury 10 Anos (EUA)</span>
                  <span className="text-cyan-400 font-bold">4.22% a.a.</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-[#111827] rounded-xl border border-gray-800 font-mono">
                  <span className="font-sans text-gray-300 font-medium">DI Futuro Jan/2027 (Brasil)</span>
                  <span className="text-red-400 font-bold">12.45% a.a.</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-[#111827] rounded-xl border border-gray-800 font-mono">
                  <span className="font-sans text-gray-300 font-medium">Taxa Selic Meta (Copom)</span>
                  <span className="text-white font-bold">10.75% a.a.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#111827] p-4 rounded-3xl border-2 border-cyan-500/30 shadow-2xl overflow-hidden min-h-[680px]">
            <div className="flex items-center justify-between mb-3 px-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white text-sm">Feeds Oficiais TradingView em Tempo Real</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Sincronização Ao Vivo
              </span>
            </div>
            <div ref={marketOverviewRef} className="tradingview-widget-container" />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISÃO 3: SETORES DA B3 */}
      {/* ========================================================================= */}
      {activeView === 'setores' && (
        <div className="space-y-5">
          <div className="p-4 bg-[#0b101b] border border-gray-800 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-purple-400" />
              <h3 className="font-bold text-white text-sm">Mapa de Desempenho dos Setores da B3</h3>
            </div>
            <span className="text-xs text-gray-400 font-mono">Ponderação por Capitalização e Liquidez</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sectorData.map((sec) => (
              <div
                key={sec.ticker}
                className="bg-[#111827] border border-gray-800 hover:border-purple-500/50 p-4 rounded-2xl shadow-lg space-y-3 transition"
              >
                <div className="flex items-center justify-between border-b border-gray-800/80 pb-2">
                  <div>
                    <h4 className="font-bold text-white text-sm">{sec.name}</h4>
                    <span className="text-[10px] text-gray-400 font-mono">Índice: {sec.ticker} • Peso IBOV: {sec.weight}</span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold ${
                      sec.isPositive
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-red-500/20 text-red-400 border border-red-500/40'
                    }`}
                  >
                    {sec.change}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <span className="text-[10px] text-gray-400 block font-sans font-semibold">Ações de Destaque:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {sec.leaders.map((leader, i) => (
                      <span key={i} className="px-2 py-0.5 bg-[#0b101b] border border-gray-800 rounded-lg text-gray-300 text-[11px]">
                        {leader}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-[11px] text-gray-400 font-sans leading-relaxed pt-1 border-t border-gray-800/60">
                  {sec.comment}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
