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
} from 'lucide-react';

export const TradingViewOverview: React.FC = () => {
  const tickerTapeRef = useRef<HTMLDivElement>(null);
  const marketOverviewRef = useRef<HTMLDivElement>(null);

  // Estado para aba de visualização do Panorama
  const [activeSubTab, setActiveSubTab] = useState<'morning_call' | 'tradingview'>('morning_call');

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

  // Inicialização do Market Overview Widget (garante carregamento mesmo ao alternar abas)
  useEffect(() => {
    const container = marketOverviewRef.current;
    if (!container) return;

    // Se já tiver sido injetado, não reinjetar
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
    container.appendChild(script);
  }, [activeSubTab]);

  // Dados Estruturados de Pré-Abertura Institucional (Últimas 24 Horas)
  const sentimentScore = 58; // 0 a 100 (Neutro com viés levemente construtivo)

  // Cálculo da rotação da agulha do termômetro (de -90° a +90°)
  const needleRotation = -90 + (sentimentScore / 100) * 180;

  return (
    <div className="space-y-6">
      {/* Ticker Tape Superior */}
      <div className="rounded-2xl overflow-hidden border border-gray-800 bg-[#111827] shadow-xl">
        <div ref={tickerTapeRef} className="tradingview-widget-container" />
      </div>

      {/* ========================================================================= */}
      {/* DESTAQUE PRINCIPAL NO TOPO: TERMÔMETRO DE SENTIMENTO DO MERCADO */}
      {/* ========================================================================= */}
      <div className="p-6 bg-gradient-to-br from-[#0b101b] via-[#111827] to-[#0f172a] rounded-3xl border-2 border-emerald-500/40 shadow-2xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-800/80 pb-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-gradient-to-tr from-amber-500 via-emerald-500 to-teal-400 rounded-2xl text-slate-950 shadow-lg shadow-emerald-500/20 mt-0.5">
              <Gauge className="w-7 h-7 font-black" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 tracking-wider font-mono">
                  DESTAQUE DO DIA
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Termômetro de Sentimento & Apetite a Risco
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                  ÚLTIMAS 24H
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-300 mt-1">
                Score consolidado ponderando Bolsas Globais, Commodities, Câmbio, Risco Fiscal Brasileiro e Fluxo Estrangeiro.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            <div className="px-4 py-2 bg-[#070b14] rounded-2xl border border-gray-800 font-mono text-right">
              <span className="text-[10px] text-gray-400 block font-sans">STATUS CONSOLIDADO</span>
              <span className="text-sm font-black text-amber-400">
                MODERADAMENTE OTIMISTA ({sentimentScore}/100)
              </span>
            </div>
          </div>
        </div>

        {/* Grade do Termômetro: Mostrador Gráfico e 5 Pilares de Ponderação */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Mostrador Visual SVG do Termômetro */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-5 bg-[#070b14]/80 rounded-2xl border border-gray-800 shadow-inner">
            <div className="relative w-64 h-36 flex items-center justify-center">
              <svg viewBox="0 0 200 115" className="w-full h-full overflow-visible">
                {/* Arco de fundo */}
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="20"
                  strokeLinecap="round"
                />

                {/* Faixa 1: Pessimista / Medo (Vermelho) 0 - 35 */}
                <path
                  d="M 20 100 A 80 80 0 0 1 65 38"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="20"
                  strokeLinecap="round"
                  opacity="0.9"
                />

                {/* Faixa 2: Neutro / Cautela (Amarelo) 35 - 65 */}
                <path
                  d="M 65 38 A 80 80 0 0 1 135 38"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="20"
                  opacity="0.9"
                />

                {/* Faixa 3: Otimista / Apetite a Risco (Verde) 65 - 100 */}
                <path
                  d="M 135 38 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="20"
                  strokeLinecap="round"
                  opacity="0.9"
                />

                {/* Ponteiro Dinâmico */}
                <g transform={`translate(100, 100) rotate(${needleRotation})`}>
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="-74"
                    stroke="#ffffff"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <circle cx="0" cy="0" r="8" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" />
                </g>

                {/* Marcação central de score */}
                <text x="100" y="85" textAnchor="middle" fill="#f8fafc" fontSize="16" fontWeight="bold" fontFamily="monospace">
                  {sentimentScore}
                </text>
              </svg>
            </div>

            <div className="text-center mt-2 space-y-1 font-sans">
              <span className="text-xs font-black text-amber-400 tracking-wider uppercase">
                ZONA NEUTRO-ALTISTA (APETITE CONTROLADO)
              </span>
              <p className="text-[11px] text-gray-400">
                Mercado externo favorável com freio de mão fiscal doméstico.
              </p>
            </div>

            <div className="flex items-center justify-between w-full text-[10px] font-mono text-gray-400 px-3 pt-3 border-t border-gray-800/80 mt-3">
              <span className="text-red-400 font-bold">0 - Pessimista</span>
              <span className="text-amber-400 font-bold">50 - Neutro</span>
              <span className="text-emerald-400 font-bold">100 - Otimista</span>
            </div>
          </div>

          {/* 5 Pilares de Ponderação e Contribuição para o Score */}
          <div className="lg:col-span-7 space-y-2.5 text-xs font-mono">
            <div className="text-xs font-sans font-bold text-gray-300 mb-1 flex items-center justify-between">
              <span>Decomposição dos 5 Pilares Quantitativos:</span>
              <span className="text-gray-500 text-[11px]">Score Final: {sentimentScore}/100</span>
            </div>

            {/* Pilar 1: Bolsas Globais */}
            <div className="p-2.5 bg-[#070b14] rounded-xl border border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="font-sans text-gray-300 font-semibold">1. Bolsas Globais & Futuros EUA (Peso 20%)</span>
              </div>
              <span className="text-emerald-400 font-bold">+15 pts (Altista)</span>
            </div>

            {/* Pilar 2: Commodities */}
            <div className="p-2.5 bg-[#070b14] rounded-xl border border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="font-sans text-gray-300 font-semibold">2. Commodities: Minério & Petróleo (Peso 20%)</span>
              </div>
              <span className="text-emerald-400 font-bold">+12 pts (Positivo)</span>
            </div>

            {/* Pilar 3: Câmbio & Carry Trade */}
            <div className="p-2.5 bg-[#070b14] rounded-xl border border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <span className="font-sans text-gray-300 font-semibold">3. Câmbio USD/BRL & DXY (Peso 15%)</span>
              </div>
              <span className="text-cyan-400 font-bold">+10 pts (Estável)</span>
            </div>

            {/* Pilar 4: Curva de Juros & Risco Fiscal */}
            <div className="p-2.5 bg-[#070b14] rounded-xl border border-red-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                <span className="font-sans text-red-200 font-semibold">4. Risco Fiscal & Juros DI Longo (Peso 25%)</span>
              </div>
              <span className="text-red-400 font-bold">-12 pts (Alerta)</span>
            </div>

            {/* Pilar 5: Fluxo Estrangeiro */}
            <div className="p-2.5 bg-[#070b14] rounded-xl border border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="font-sans text-gray-300 font-semibold">5. Fluxo Estrangeiro na B3 (Peso 20%)</span>
              </div>
              <span className="text-emerald-400 font-bold">+13 pts (Entrada)</span>
            </div>
          </div>
        </div>
      </div>

      {/* HEADER DE NAVEGAÇÃO ENTRE PRÉ-ABERTURA E TRADINGVIEW */}
      <div className="bg-[#0b101b] p-5 sm:p-6 rounded-2xl border border-gray-800 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-800/80 pb-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl text-slate-950 shadow-lg shadow-emerald-500/20 mt-0.5">
              <LayoutDashboard className="w-6 h-6 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Relatório Analítico de Pré-Abertura & Morning Call
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-500/30 font-mono">
                  ESTUDO QUANTITATIVO
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-400 mt-1 leading-relaxed">
                Raio-X detalhado de bolsas mundiais, commodities, macroeconomia, agenda e derivativos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-[#111827] p-1.5 rounded-xl border border-gray-800 shrink-0">
            <button
              onClick={() => setActiveSubTab('morning_call')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                activeSubTab === 'morning_call'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-slate-950 shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Relatório de Pré-Abertura</span>
            </button>
            <button
              onClick={() => setActiveSubTab('tradingview')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                activeSubTab === 'tradingview'
                  ? 'bg-gradient-to-r from-cyan-600 to-emerald-500 text-slate-950 font-black shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Feeds TradingView</span>
            </button>
          </div>
        </div>

        {/* Status Rápido das 4 Frentes Globais */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 bg-[#111827] rounded-xl border border-gray-800">
            <span className="text-[10px] text-gray-400 block font-sans">FUTUROS S&P 500</span>
            <span className="text-sm font-bold text-emerald-400 mt-0.5 block">+0.28% (5.920 pts)</span>
            <span className="text-[10px] text-gray-500 font-sans">Tom positivo / Techs</span>
          </div>

          <div className="p-3 bg-[#111827] rounded-xl border border-gray-800">
            <span className="text-[10px] text-gray-400 block font-sans">PETRÓLEO BRENT</span>
            <span className="text-sm font-bold text-amber-400 mt-0.5 block">US$ 78.40 / barril</span>
            <span className="text-[10px] text-gray-500 font-sans">Estabilidade / Geopolítica</span>
          </div>

          <div className="p-3 bg-[#111827] rounded-xl border border-gray-800">
            <span className="text-[10px] text-gray-400 block font-sans">DÓLAR / DXY</span>
            <span className="text-sm font-bold text-white mt-0.5 block">R$ 5.48 • DXY 103.8</span>
            <span className="text-[10px] text-gray-500 font-sans">Carry trade ativo</span>
          </div>

          <div className="p-3 bg-[#111827] rounded-xl border border-gray-800">
            <span className="text-[10px] text-gray-400 block font-sans">FLUXO ESTRANGEIRO B3</span>
            <span className="text-sm font-bold text-emerald-400 mt-0.5 block">+R$ 480 mi (D-1)</span>
            <span className="text-[10px] text-gray-500 font-sans">Entrada em blue chips</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CONTEÚDO 1: RELATÓRIO ANALÍTICO DE MORNING CALL (Sempre montado no DOM) */}
      {/* ========================================================================= */}
      <div className={activeSubTab === 'morning_call' ? 'space-y-6 block' : 'hidden'}>
        {/* BLOCO 1: ÍNDICES GLOBAIS, COMMODITIES E CÂMBIO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* CARD 1: BOLSAS GLOBAIS */}
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

            <p className="text-[11px] text-gray-400 leading-relaxed pt-1">
              <strong>Análise:</strong> Apetite a risco predominante nos índices ocidentais, impulsionado pelo alívio nas taxas das Treasuries e resultados corporativos favoráveis nos EUA.
            </p>
          </div>

          {/* CARD 2: COMMODITIES E FLUXO */}
          <div className="p-5 bg-[#0b101b] border border-gray-800 rounded-2xl shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">2. Commodities & Matérias-Primas</h3>
              </div>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                Misto / Estável
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 bg-[#111827] rounded-xl border border-gray-800 font-mono">
                <span className="font-sans text-gray-300 font-medium">Petróleo Brent (Londres)</span>
                <span className="text-white font-bold">US$ 78.40 <span className="text-emerald-400 text-[10px]">(+0.6%)</span></span>
              </div>
              <div className="flex items-center justify-between p-2 bg-[#111827] rounded-xl border border-gray-800 font-mono">
                <span className="font-sans text-gray-300 font-medium">Minério de Ferro (Dalian)</span>
                <span className="text-white font-bold">US$ 102.50 <span className="text-emerald-400 text-[10px]">(+1.1%)</span></span>
              </div>
              <div className="flex items-center justify-between p-2 bg-[#111827] rounded-xl border border-gray-800 font-mono">
                <span className="font-sans text-gray-300 font-medium">Ouro Spot (Hedge Global)</span>
                <span className="text-white font-bold">US$ 2.510 <span className="text-gray-400 text-[10px]">(+0.1%)</span></span>
              </div>
              <div className="flex items-center justify-between p-2 bg-[#111827] rounded-xl border border-gray-800 font-mono">
                <span className="font-sans text-gray-300 font-medium">Milho Futuro B3 (CCM)</span>
                <span className="text-white font-bold">R$ 64.20 <span className="text-red-400 text-[10px]">(-0.3%)</span></span>
              </div>
              <div className="flex items-center justify-between p-2 bg-[#111827] rounded-xl border border-gray-800 font-mono">
                <span className="font-sans text-gray-300 font-medium">Boi Gordo Futuro (BGI)</span>
                <span className="text-white font-bold">R$ 242.00 <span className="text-emerald-400 text-[10px]">(+0.4%)</span></span>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed pt-1">
              <strong>Análise:</strong> O minério em alta na Ásia apoia a abertura de exportadoras como Vale (VALE3) e Siderúrgicas. Petróleo sustenta Petrobras (PETR4) e Prio (PRIO3).
            </p>
          </div>

          {/* CARD 3: CÂMBIO & FLUXO ESTRANGEIRO */}
          <div className="p-5 bg-[#0b101b] border border-gray-800 rounded-2xl shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-white text-sm">3. Câmbio & Fluxo Estrangeiro</h3>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                Diferencial 5.5%
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 bg-[#111827] rounded-xl border border-gray-800 font-mono">
                <span className="font-sans text-gray-300 font-medium">Dólar Comercial (USD/BRL)</span>
                <span className="text-white font-bold">R$ 5.482 <span className="text-emerald-400 text-[10px]">(-0.35%)</span></span>
              </div>
              <div className="flex items-center justify-between p-2 bg-[#111827] rounded-xl border border-gray-800 font-mono">
                <span className="font-sans text-gray-300 font-medium">Índice DXY (Dólar vs Cesta)</span>
                <span className="text-white font-bold">103.85 <span className="text-red-400 text-[10px]">(-0.15%)</span></span>
              </div>
              <div className="flex items-center justify-between p-2 bg-[#111827] rounded-xl border border-gray-800 font-mono">
                <span className="font-sans text-gray-300 font-medium">Fluxo Gringo (Último Pregão)</span>
                <span className="text-emerald-400 font-bold">+R$ 482 Milhões</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-[#111827] rounded-xl border border-gray-800 font-mono">
                <span className="font-sans text-gray-300 font-medium">Acumulado Mês Estrangeiro</span>
                <span className="text-emerald-400 font-bold">+R$ 3.84 Bilhões</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-[#111827] rounded-xl border border-gray-800 font-mono">
                <span className="font-sans text-gray-300 font-medium">Taxa Selic vs Fed Funds</span>
                <span className="text-cyan-400 font-bold">10.75% vs 5.38%</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed pt-1">
              <strong>Análise:</strong> O diferencial de juros real atrativo (Carry Trade) continua sustentando a entrada de capital externo na B3, aliviando a pressão sobre o câmbio.
            </p>
          </div>
        </div>

        {/* BLOCO 2: CALENDÁRIO ECONÔMICO, BALANÇOS & NOTÍCIAS POLÍTICAS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* CALENDÁRIO ECONÔMICO & BALANÇOS */}
          <div className="p-5 bg-[#0b101b] border border-gray-800 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-white text-sm">4. Calendário Econômico & Balanços do Dia</h3>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/30">
                Drivers de Volatilidade
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-[#111827] rounded-xl border border-gray-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400 font-mono">09:00 — BRASIL</span>
                  <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">Alto Impacto</span>
                </div>
                <p className="text-white font-semibold">Boletim Focus (Banco Central do Brasil)</p>
                <p className="text-gray-400 text-[11px]">Projeções de IPCA, PIB, Câmbio e taxa terminal da Selic para 2026/2027.</p>
              </div>

              <div className="p-3 bg-[#111827] rounded-xl border border-gray-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-400 font-mono">11:00 — EUA</span>
                  <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-400">Médio Impacto</span>
                </div>
                <p className="text-white font-semibold">PMI Industrial & de Serviços (ISM)</p>
                <p className="text-gray-400 text-[11px]">Mede a atividade econômica e pressão inflacionária no setor produtivo norte-americano.</p>
              </div>

              <div className="p-3 bg-[#111827] rounded-xl border border-gray-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-400 font-mono">PÓS-MERCADO — BALANÇOS</span>
                  <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400">Temporada de Balanços</span>
                </div>
                <p className="text-white font-semibold">Divulgações Corporativas (B3 & EUA)</p>
                <p className="text-gray-400 text-[11px]">Resultados trimestrais com foco em geração de caixa, dividendos e guidance setorial.</p>
              </div>
            </div>
          </div>

          {/* PONTO DE ATENÇÃO: POLÍTICA FISCAL DO BRASIL & GEOPOLÍTICA */}
          <div className="p-5 bg-[#0b101b] border border-gray-800 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">5. Política Fiscal (Brasil) & Geopolítica Global</h3>
              </div>
              <span className="text-[10px] font-mono text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded border border-red-500/30">
                Ponto de Atenção
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-red-950/20 rounded-xl border border-red-500/30 space-y-1">
                <div className="flex items-center gap-1.5 text-red-300 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span>RISCO FISCAL & GASTOS PÚBLICOS (BRASIL)</span>
                </div>
                <p className="text-gray-300 text-[11px] leading-relaxed">
                  O mercado monitora as discussões do Orçamento da União e o cumprimento da meta fiscal. A pressão de gastos obrigatórios mantém a inclinação da curva de juros longos (DI futuro acima de 12.0% nos vértices de 2029 e 2031).
                </p>
              </div>

              <div className="p-3 bg-[#111827] rounded-xl border border-gray-800 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <Globe className="w-3.5 h-3.5 text-amber-400" />
                  <span>CENÁRIO GEOPOLÍTICO & GUERRAS</span>
                </div>
                <p className="text-gray-400 text-[11px] leading-relaxed">
                  Tensões no Oriente Médio e Mar Vermelho continuam adicionando prêmio de risco no frete marítimo e petróleo. Na Ásia, a desaceleração do consumo chinês é contrabalançada por estímulos monetários do PBoC.
                </p>
              </div>

              <div className="p-3 bg-[#111827] rounded-xl border border-gray-800 space-y-1">
                <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                  <Landmark className="w-3.5 h-3.5 text-cyan-400" />
                  <span>POSIÇÕES DE MARKET MAKERS & DERIVATIVOS B3</span>
                </div>
                <p className="text-gray-400 text-[11px] leading-relaxed">
                  Formadores de mercado mantêm gama neutro nas faixas centrais do Ibovespa, com concentração de Call Walls em resistências chave e suporte institucional de Puts absorvendo quedas bruscas.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* BLOCO 3: RESUMO DA VISÃO DIRECIONAL BRASIL E EUA */}
        <div className="p-5 bg-[#0b101b] border border-gray-800 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-white text-sm">6. Visão Direcional de Mercado (Brasil vs EUA)</h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              Matriz Direcional
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* BRASIL */}
            <div className="p-4 bg-[#111827] rounded-xl border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400 font-sans text-sm">🇧🇷 BRASIL (IBOVESPA)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 font-mono">
                  VIÉS: NEUTRO-ALTISTA
                </span>
              </div>
              <p className="text-gray-300 text-[11px] leading-relaxed">
                O índice encontra suporte nas commodities e na entrada do investidor estrangeiro em ações de valor (Bancos, Vale e Petrobras). O principal limitador da alta é o estresse na curva de juros doméstica decorrente da incerteza fiscal.
              </p>
              <div className="pt-2 border-t border-gray-800 font-mono text-[10px] text-gray-400 space-y-0.5">
                <div>• Suporte IBOV: <strong>132.500 pts</strong></div>
                <div>• Resistência IBOV: <strong>137.200 pts</strong></div>
              </div>
            </div>

            {/* EUA */}
            <div className="p-4 bg-[#111827] rounded-xl border border-cyan-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-400 font-sans text-sm">🇺🇸 EUA (S&P 500 / NASDAQ)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 font-mono">
                  VIÉS: CONSTRUTIVO / ALTA
                </span>
              </div>
              <p className="text-gray-300 text-[11px] leading-relaxed">
                Sustentado pela expectativa de cortes de juros pelo Federal Reserve (Soft Landing) e fluxo comprador em tecnologia/IA. O índice VIX opera em patamares baixos, sinalizando baixa percepção de volatilidade imediata.
              </p>
              <div className="pt-2 border-t border-gray-800 font-mono text-[10px] text-gray-400 space-y-0.5">
                <div>• Suporte S&P 500: <strong>5.850 pts</strong></div>
                <div>• Resistência S&P 500: <strong>5.980 pts</strong></div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-[#111827]/70 rounded-xl border border-gray-800 text-[11px] text-gray-300 flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              <strong>Estratégia Recomendada para Estudos:</strong> Foco em operações com assimetria positiva, proteção de stops técnicos e estruturas de travas com derivativos da B3 para controle de risco.
            </span>
          </div>
        </div>

        {/* BLOCO 4: JUSTIFICATIVA METODOLÓGICA E FONTES PESQUISADAS */}
        <div className="p-5 bg-[#0b101b] border border-gray-800 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-white text-sm">7. Justificativa Técnica, Critérios e Fontes Pesquisadas</h3>
            </div>
            <span className="text-[10px] font-mono text-gray-400">
              Padrão de Governança Quantitativa
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-300">
            <div className="space-y-2">
              <h4 className="font-bold text-white flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Critérios de Ponderação do Termômetro:
              </h4>
              <ul className="space-y-1.5 text-[11px] text-gray-400 list-disc list-inside">
                <li><strong>Bolsas Globais e Futuros EUA (Peso 20%):</strong> Posição compradora no S&P 500 e Europa (+15 pts).</li>
                <li><strong>Commodities Estratégicas (Peso 20%):</strong> Minério de ferro sustentando Vale e Brent estável (+12 pts).</li>
                <li><strong>Câmbio & Diferencial de Juros (Peso 15%):</strong> Dólar estável abaixo de R$ 5,50 com Carry Trade atrativo (+10 pts).</li>
                <li><strong>Curva de Juros & Risco Fiscal Brasil (Peso 25%):</strong> Incerteza fiscal comprime o prêmio de risco (-12 pts).</li>
                <li><strong>Fluxo Estrangeiro na B3 (Peso 20%):</strong> Saldo positivo de não-residentes no mês (+13 pts).</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-white flex items-center gap-1.5 text-xs">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                Fontes Oficiais Consultadas (Últimas 24h):
              </h4>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-400 font-mono">
                <div className="p-2 bg-[#111827] rounded-lg border border-gray-800">
                  • <strong>B3 S.A.</strong> (Dados de Pregão e Fluxo)
                </div>
                <div className="p-2 bg-[#111827] rounded-lg border border-gray-800">
                  • <strong>Banco Central (BCB)</strong> (Focus e Selic)
                </div>
                <div className="p-2 bg-[#111827] rounded-lg border border-gray-800">
                  • <strong>Federal Reserve (Fed)</strong> (Fed Funds)
                </div>
                <div className="p-2 bg-[#111827] rounded-lg border border-gray-800">
                  • <strong>TradingView / B3</strong> (Cotações Spot)
                </div>
                <div className="p-2 bg-[#111827] rounded-lg border border-gray-800">
                  • <strong>Tesouro Nacional</strong> (Curva de Juros DI)
                </div>
                <div className="p-2 bg-[#111827] rounded-lg border border-gray-800">
                  • <strong>ANBIMA</strong> (Taxas e Risco País)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CONTEÚDO 2: FEEDS TRADINGVIEW (Sempre montado no DOM com visibilidade toggle) */}
      {/* ========================================================================= */}
      <div className={activeSubTab === 'tradingview' ? 'block' : 'hidden'}>
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
    </div>
  );
};
