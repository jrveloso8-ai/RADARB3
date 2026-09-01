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
} from 'lucide-react';
import { MarketOpeningSubscribeCard } from '../newsletter/MarketOpeningSubscribeCard';

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

  // Dados Estruturados de Pré-Abertura Institucional
  const sentimentScore = 58;
  const needleRotation = -90 + (sentimentScore / 100) * 180;

  // Lógica dinâmica de Horário e Ciclo de Atualização (Pré-Abertura diária às 08h45)
  const [updateSchedule, setUpdateSchedule] = useState<{
    lastUpdateLabel: string;
    nextUpdateLabel: string;
    badgeLabel: string;
    isPreOpening: boolean;
  }>({
    lastUpdateLabel: 'Última consolidação: Ontem às 08h45',
    nextUpdateLabel: 'Hoje às 08h45 (Pré-Abertura B3)',
    badgeLabel: 'AGUARDANDO PRÉ-ABERTURA',
    isPreOpening: true,
  });

  useEffect(() => {
    const updateTimeState = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const targetMinutes = 8 * 60 + 45; // 08h45

      const isBefore845 = currentMinutes < targetMinutes;

      if (isBefore845) {
        setUpdateSchedule({
          lastUpdateLabel: 'Última consolidação: Ontem às 08h45',
          nextUpdateLabel: 'Hoje às 08h45 (Pré-Abertura B3)',
          badgeLabel: 'AGUARDANDO PRÉ-ABERTURA',
          isPreOpening: true,
        });
      } else {
        setUpdateSchedule({
          lastUpdateLabel: 'Última consolidação: Hoje às 08h45',
          nextUpdateLabel: 'Próximo pregão às 08h45',
          badgeLabel: 'EDIÇÃO DE HOJE CONCLUÍDA',
          isPreOpening: false,
        });
      }
    };

    updateTimeState();
    const timer = setInterval(updateTimeState, 30000);
    return () => clearInterval(timer);
  }, []);

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
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
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
      {/* VISÃO 1: SENTIMENTO & TERMÔMETRO */}
      {/* ========================================================================= */}
      {activeView === 'sentimento' && (
        <div className="space-y-6">
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-5 flex flex-col items-center justify-center p-5 bg-[#070b14]/80 rounded-2xl border border-gray-800 shadow-inner">
                <div className="relative w-64 h-36 flex items-center justify-center">
                  <svg viewBox="0 0 200 115" className="w-full h-full overflow-visible">
                    <path
                      d="M 20 100 A 80 80 0 0 1 180 100"
                      fill="none"
                      stroke="#1e293b"
                      strokeWidth="20"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 20 100 A 80 80 0 0 1 65 38"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="20"
                      strokeLinecap="round"
                      opacity="0.9"
                    />
                    <path
                      d="M 65 38 A 80 80 0 0 1 135 38"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="20"
                      opacity="0.9"
                    />
                    <path
                      d="M 135 38 A 80 80 0 0 1 180 100"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="20"
                      strokeLinecap="round"
                      opacity="0.9"
                    />
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

                {/* Legenda de Atualização do Termômetro */}
                <div className="w-full mt-3.5 pt-3 border-t border-gray-800/80 space-y-2 text-left bg-[#0c1220]/90 p-3.5 rounded-xl border border-cyan-500/20 shadow-inner">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-300 font-bold">
                      <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>{updateSchedule.lastUpdateLabel}</span>
                    </div>
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold border ${
                        updateSchedule.isPreOpening
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {updateSchedule.badgeLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10.5px] font-mono text-amber-300/95 bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/25">
                    <RefreshCw className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>
                      Próxima atualização: <strong>{updateSchedule.nextUpdateLabel}</strong>
                    </span>
                  </div>

                  <p className="text-[10px] text-gray-400 font-sans leading-relaxed pt-0.5">
                    <strong className="text-gray-300">Ciclo diário:</strong> O termômetro de sentimento é consolidado diariamente às <strong className="text-cyan-300">08h45</strong> (pré-mercado B3), ponderando o fechamento das últimas 24h dos 5 pilares macro e fluxo estrangeiro. Antes das 08h45, o painel exibe a leitura da sessão anterior. Cotações e gráficos de suporte permanecem ao vivo em tempo real.
                  </p>
                </div>
              </div>

              <div className="lg:col-span-7 space-y-2.5 text-xs font-mono">
                <div className="text-xs font-sans font-bold text-gray-300 mb-1 flex items-center justify-between">
                  <span>Decomposição dos 5 Pilares Quantitativos:</span>
                  <span className="text-gray-500 text-[11px]">Score Final: {sentimentScore}/100</span>
                </div>

                <div className="p-2.5 bg-[#070b14] rounded-xl border border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="font-sans text-gray-300 font-semibold">1. Bolsas Globais & Futuros EUA (Peso 20%)</span>
                  </div>
                  <span className="text-emerald-400 font-bold">+15 pts (Altista)</span>
                </div>

                <div className="p-2.5 bg-[#070b14] rounded-xl border border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="font-sans text-gray-300 font-semibold">2. Commodities: Minério & Petróleo (Peso 20%)</span>
                  </div>
                  <span className="text-emerald-400 font-bold">+12 pts (Positivo)</span>
                </div>

                <div className="p-2.5 bg-[#070b14] rounded-xl border border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="font-sans text-gray-300 font-semibold">3. Câmbio & Carry Trade (Peso 15%)</span>
                  </div>
                  <span className="text-emerald-400 font-bold">+10 pts (Estável)</span>
                </div>

                <div className="p-2.5 bg-[#070b14] rounded-xl border border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                    <span className="font-sans text-gray-300 font-semibold">4. Curva de Juros & Risco Fiscal Brasil (Peso 25%)</span>
                  </div>
                  <span className="text-red-400 font-bold">-12 pts (Cautela)</span>
                </div>

                <div className="p-2.5 bg-[#070b14] rounded-xl border border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="font-sans text-gray-300 font-semibold">5. Fluxo Estrangeiro na B3 (Peso 20%)</span>
                  </div>
                  <span className="text-emerald-400 font-bold">+13 pts (Entrada Líquida)</span>
                </div>
              </div>
            </div>
          </div>

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
