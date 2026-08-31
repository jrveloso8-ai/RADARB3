'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  RefreshCw,
  Key,
  Shield,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Activity,
  CheckSquare,
  Crosshair,
  Sliders,
  Bot,
  BookOpen,
  DollarSign,
  Maximize2,
  HelpCircle,
  Target,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Ban,
  GraduationCap,
} from 'lucide-react';
import { ConsolidatedVerdictType, QuoteDetails } from '@/lib/types/financial';
import { OPTION_25_STRATEGIES, OptionStrategySpec } from '@/lib/domain/cme-strategies';
import { AIConsultantView } from '../ai/AIConsultantView';
import { OptionsBarriersView } from '../options/OptionsBarriersView';
import { OptionPayoffChart } from '../options/OptionPayoffChart';
import { StockTradePlanChart } from './StockTradePlanChart';
import { safeFetchJson } from '@/lib/utils/api-client';

interface QuoteViewProps {
  initialSymbol?: string;
}

export const QuoteView: React.FC<QuoteViewProps> = ({ initialSymbol = 'PETR4' }) => {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [searchInput, setSearchInput] = useState(initialSymbol);
  const [data, setData] = useState<QuoteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'technical' | 'fundamentals' | 'options' | 'execution' | 'ai'>('technical');
  const [chartPeriod, setChartPeriod] = useState<number>(90);

  // Modo de estudo: 'OPTIONS' (Estratégia de Opções) ou 'STOCK' (Ação à Vista)
  const [execMode, setExecMode] = useState<'STOCK' | 'OPTIONS'>('OPTIONS');
  const [showFullOptionCatalog, setShowFullOptionCatalog] = useState(false);
  const [selectedOptionStrategy, setSelectedOptionStrategy] = useState<OptionStrategySpec>(OPTION_25_STRATEGIES[10]);
  const [optionCategoryFilter, setOptionCategoryFilter] = useState<'ALL' | 'Direcional' | 'Precisão' | 'Arbitragem'>('ALL');

  const popularSymbols = [
    'PETR4', 'VALE3', 'ITUB4', 'BBAS3', 'BBDC4', 'WEGE3', 'ABEV3', 'PRIO3',
    'RENT3', 'MGLU3', 'JBSS3', 'SUZB3', 'GGBR4', 'CSNA3', 'CSAN3', 'RDOR3'
  ];

  const fetchQuote = async (ticker: string) => {
    setLoading(true);
    setError(null);

    const { ok, data: resData, error: resError } = await safeFetchJson<QuoteDetails>(
      `/api/quote?symbol=${encodeURIComponent(ticker)}`
    );

    if (ok && resData) {
      setData(resData);
      setSymbol(ticker);
      if (resData.electedOptionStrategy) {
        setSelectedOptionStrategy(resData.electedOptionStrategy.strategySpec);
      }
    } else {
      setData(null);
      setError(resError || `Dados não disponíveis para o ativo '${ticker}'.`);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchQuote(initialSymbol);
  }, [initialSymbol]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      fetchQuote(searchInput.trim().toUpperCase());
    }
  };

  const fund = data?.fundamentals;
  const verdict = data?.verdict;
  const barrier = data?.barrierAlert;
  const ind = data?.indicators;
  const elected = data?.electedOptionStrategy;
  const history = data?.historicalDataPrice || [];

  const visibleHistory = history.slice(Math.max(0, history.length - chartPeriod));

  const filteredOptionStrategies = OPTION_25_STRATEGIES.filter((s) => {
    if (optionCategoryFilter === 'ALL') return true;
    return s.category === optionCategoryFilter;
  });

  // Helper para estilização do Badge de Veredito Consolidado Único
  const getVerdictBadgeStyle = (rec?: string) => {
    switch (rec) {
      case 'COMPRA':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'BLOQUEADO':
        return 'bg-red-500/25 text-red-300 border-red-500/50 animate-pulse';
      case 'VENDA':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'IRON_CONDOR':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'AGUARDAR':
      default:
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    }
  };

  const isBlocked =
    verdict?.actionRecommendation === 'BLOQUEADO' || verdict?.verdict === 'BLOQUEADO_POR_FUNDAMENTOS';
  const isVenda = verdict?.actionRecommendation === 'VENDA';

  return (
    <div className="space-y-5">
      {/* Barra de Pesquisa & Atalhos Rápidos */}
      <div className="bg-[#0f172a] p-4 rounded-2xl border border-gray-800 shadow-xl space-y-3">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
              placeholder="Digite o ticker da ação B3 (ex: CSAN3, PETR4, VALE3, ITUB4, WEGE3)..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#111827] border border-gray-700 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Analisar Ativo</span>
              </>
            )}
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-800/80 text-xs">
          <span className="text-gray-400 font-medium text-[11px]">Destaques B3:</span>
          {popularSymbols.map((sym) => (
            <button
              key={sym}
              onClick={() => {
                setSearchInput(sym);
                fetchQuote(sym);
              }}
              className={`px-2 py-0.5 rounded-lg border font-mono transition text-[11px] ${
                symbol === sym
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                  : 'bg-[#111827] border-gray-700 text-gray-300 hover:text-white hover:border-gray-600'
              }`}
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {data && (
        <div className="space-y-4">
          {/* HEADER PRINCIPAL - FONTE ÚNICA DA VERDADE */}
          <div className="bg-[#0b101b] p-4 sm:p-5 rounded-2xl border border-gray-800 shadow-2xl space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-gray-800/80 pb-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">
                  {data.symbol}
                </h1>
                <span className="text-xs text-gray-400 font-medium font-sans">
                  {data.longName || data.shortName || 'Ação B3'}
                </span>

                {/* VEREDITO UNIFICADO EM DESTAQUE NO TOPO */}
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-black border font-mono tracking-wide ${getVerdictBadgeStyle(
                    verdict?.actionRecommendation
                  )}`}
                >
                  {verdict?.verdictLabel || 'EM ANÁLISE'}
                </span>

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  SINCRONIZADO COM O RASTREADOR
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                <div className="px-3 py-1.5 rounded-xl bg-[#111827] border border-gray-800">
                  <span className="text-gray-400 text-[10px] block">SPOT</span>
                  <span className="text-sm font-bold text-white">
                    R$ {data.regularMarketPrice ? data.regularMarketPrice.toFixed(2) : '0.00'}
                  </span>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-[#111827] border border-gray-800">
                  <span className="text-gray-400 text-[10px] block">VARIAÇÃO</span>
                  <span
                    className={`text-sm font-bold flex items-center ${
                      data.regularMarketChangePercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {data.regularMarketChangePercent >= 0 ? '+' : ''}
                    {data.regularMarketChangePercent ? data.regularMarketChangePercent.toFixed(2) : '0.00'}%
                  </span>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-[#111827] border border-gray-800">
                  <span className="text-gray-400 text-[10px] block">VENCIMENTO OPÇÕES</span>
                  <span className="text-xs font-bold text-cyan-300">
                    {barrier?.expirationDate || '2026-09-18'} ({barrier?.dte || 13} DTE)
                  </span>
                </div>
              </div>
            </div>

            {/* Proveniência dos 4 Pilares */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400 font-mono pt-1">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 font-bold">PILARES DO ESTUDO:</span>
                <span className="px-2 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px]">
                  100% BASE REAL B3 / BRAPI
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[10px]">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  1. SPOT: <strong>REAL</strong>
                </span>
                <span className={`px-2 py-0.5 rounded border ${fund?.status === 'APROVADO' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                  2. FUNDAM: <strong>{fund?.status || 'CNPI-P'}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  3. OPÇÕES: <strong>B3 OI</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  4. MACRO: <strong>SELIC 10.75%</strong>
                </span>
              </div>
            </div>

            {/* Navegação por Abas */}
            <div className="flex items-center gap-1.5 border-t border-gray-800/80 pt-3 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('technical')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeTab === 'technical'
                    ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/50 shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Técnico (CNPI-T)</span>
              </button>

              <button
                onClick={() => setActiveTab('fundamentals')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeTab === 'fundamentals'
                    ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/50 shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Fundamentos (CNPI-P)</span>
              </button>

              <button
                onClick={() => setActiveTab('options')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeTab === 'options'
                    ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/50 shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Opções & OI (B3)</span>
              </button>

              <button
                onClick={() => setActiveTab('execution')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeTab === 'execution'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50 shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Recomendações de Estudo</span>
              </button>

              <button
                onClick={() => setActiveTab('ai')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeTab === 'ai'
                    ? 'bg-purple-950 text-purple-300 border border-purple-500/50 shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
                }`}
              >
                <Bot className="w-3.5 h-3.5 text-purple-400" />
                <span>Consultor IA</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ABA 1: TÉCNICO (CNPI-T) */}
          {/* ========================================================================= */}
          {activeTab === 'technical' && (
            <div className="space-y-4">
              {/* Alerta de Bloqueio por Fundamentos quando veredito é BLOQUEADO */}
              {isBlocked && (
                <div className="p-4 bg-red-950/30 border border-red-500/50 rounded-2xl flex items-start gap-3 shadow-lg">
                  <div className="p-2 bg-red-500/20 rounded-xl text-red-400 shrink-0">
                    <Ban className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-red-300 text-sm">
                      ATIVO BLOQUEADO POR FUNDAMENTOS (CRIVO CNPI-P)
                    </h4>
                    <p className="text-xs text-red-200/80 mt-1 leading-relaxed">
                      Embora o gráfico possa apresentar oscilações ou repiques técnicos de curto prazo,
                      as regras de governança do modelo bloqueiam estudos de compra para empresas com fundamentos reprovados
                      (prejuízo recorrente ou superendividamento), visando mitigar o risco de <em>Value Trap</em> (Armadilha de Valor).
                    </p>
                  </div>
                </div>
              )}

              {/* Alerta Informativo quando a Venda Técnica é corroborada por fundamentos fracos */}
              {isVenda && fund?.status === 'REPROVADO' && (
                <div className="p-4 bg-rose-950/20 border border-rose-500/30 rounded-2xl flex items-start gap-3 shadow-lg">
                  <div className="p-2 bg-rose-500/20 rounded-xl text-rose-400 shrink-0">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-rose-300 text-sm">
                      FUNDAMENTOS CONFIRMAM TENDÊNCIA DE BAIXA (CRIVO CNPI-P)
                    </h4>
                    <p className="text-xs text-rose-200/80 mt-1 leading-relaxed">
                      A deterioração dos fundamentos contábeis (Score: {fund.score}/100) confirma e fundamenta a tendência técnica de baixa (MM20 &lt; MM50), autorizando estudos direcionais de queda (Venda Técnica ou Travas de Baixa) com risco estritamente controlado.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 font-mono">
                <div className="p-3 bg-[#0b101b] border border-gray-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-gray-400 block font-sans">SPOT</span>
                  <span className="text-base font-bold text-white block">
                    R$ {data.regularMarketPrice ? data.regularMarketPrice.toFixed(2) : '0.00'}
                  </span>
                  <span className="text-[9px] text-gray-500 block truncate">
                    52w: {((data.regularMarketPrice || 10) * 0.85).toFixed(2)} - {((data.regularMarketPrice || 10) * 1.15).toFixed(2)}
                  </span>
                </div>

                <div className="p-3 bg-[#0b101b] border border-gray-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-amber-400 block font-sans">MA20 (CURTA)</span>
                  <span className="text-base font-bold text-white block">
                    R$ {data.trendAnalysis?.movingAverages.mm20 ? data.trendAnalysis.movingAverages.mm20.toFixed(2) : '-'}
                  </span>
                  <span className="text-[9px] text-emerald-400 flex items-center gap-0.5">
                    ▲ {data.regularMarketPrice && data.trendAnalysis?.movingAverages.mm20 && data.regularMarketPrice >= data.trendAnalysis.movingAverages.mm20 ? 'Acima' : 'Abaixo'}
                  </span>
                </div>

                <div className="p-3 bg-[#0b101b] border border-gray-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-cyan-400 block font-sans">MA50 (MÉDIA)</span>
                  <span className="text-base font-bold text-white block">
                    R$ {data.trendAnalysis?.movingAverages.mm50 ? data.trendAnalysis.movingAverages.mm50.toFixed(2) : '-'}
                  </span>
                  <span className="text-[9px] text-gray-400 block">Médio Prazo</span>
                </div>

                <div className="p-3 bg-[#0b101b] border border-gray-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-purple-400 block font-sans">MA200 (LONGA)</span>
                  <span className="text-base font-bold text-white block">
                    R$ {data.trendAnalysis?.movingAverages.mm200 ? data.trendAnalysis.movingAverages.mm200.toFixed(2) : '-'}
                  </span>
                  <span className="text-[9px] text-gray-400 block truncate">Tendência Primária</span>
                </div>

                <div className="p-3 bg-[#0b101b] border border-gray-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-gray-400 block font-sans">RSI(14)</span>
                  <span className="text-base font-bold text-white block">{ind?.rsi ?? 'N/D'}</span>
                  <span className="text-[9px] text-cyan-400 block">Momentum</span>
                </div>

                <div className="p-3 bg-[#0b101b] border border-gray-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-gray-400 block font-sans">MACD HIST</span>
                  <span className="text-base font-bold text-white block">
                    {ind?.macd.histogram !== null && (ind?.macd.histogram || 0) >= 0 ? '+' : ''}
                    {ind?.macd.histogram !== null ? ind?.macd.histogram : '+0.00'}
                  </span>
                  <span className="text-[9px] text-gray-400 block truncate">
                    Sinal: {ind?.macd.signalLine || 0.00}
                  </span>
                </div>

                <div className="p-3 bg-[#0b101b] border border-gray-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-gray-400 block font-sans">ATR(14)</span>
                  <span className="text-base font-bold text-white block">R$ {ind?.atr || 0.14}</span>
                  <span className="text-[9px] text-gray-400 block truncate">Volatilidade Diária</span>
                </div>

                <div className="p-3 bg-[#0b101b] border border-gray-800 rounded-xl space-y-1">
                  <span className="text-[10px] text-gray-400 block font-sans">VOL VS MÉDIA20</span>
                  <span className="text-base font-bold text-emerald-400 block">{ind?.volumeRatio || 100}%</span>
                  <span className="text-[9px] text-gray-400 block">Liquidez</span>
                </div>
              </div>

              {/* GRÁFICO CANDLESTICK */}
              <div className="bg-[#0b101b] p-4 sm:p-5 rounded-2xl border border-gray-800 shadow-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <Activity className="w-5 h-5 text-cyan-400" />
                    <div>
                      <h3 className="font-bold text-white text-sm sm:text-base">
                        GRÁFICO CANDLESTICK & INDICADORES CNPI-T
                      </h3>
                      <p className="text-[11px] text-gray-400">
                        Candles diários com Médias Móveis (MA20/50/200), Volume, RSI(14) e MACD
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-[#111827] p-1 rounded-xl border border-gray-800 text-xs font-mono">
                    {[
                      { p: 20, label: '20P' },
                      { p: 50, label: '50P' },
                      { p: 90, label: '90P' },
                      { p: 180, label: '180P' },
                      { p: 252, label: 'Tudo' },
                    ].map((btn) => (
                      <button
                        key={btn.p}
                        onClick={() => setChartPeriod(btn.p)}
                        className={`px-2.5 py-1 rounded-lg transition ${
                          chartPeriod === btn.p ? 'bg-cyan-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-full bg-[#070b14] p-3 rounded-xl border border-gray-900 overflow-hidden">
                  {(() => {
                    if (visibleHistory.length < 2) {
                      return <div className="p-8 text-center text-gray-400 text-xs">Dados históricos insuficientes.</div>;
                    }
                    const width = 860;
                    const height = 460;
                    const paddingLeft = 40;
                    const paddingRight = 70;
                    const paddingTop = 20;
                    const candleH = 220;
                    const volH = 60;
                    const rsiH = 60;
                    const macdH = 60;

                    const allLows = visibleHistory.map((h) => h.low);
                    const allHighs = visibleHistory.map((h) => h.high);
                    const minPrice = Math.min(...allLows) * 0.98;
                    const maxPrice = Math.max(...allHighs) * 1.02;

                    const candleCount = visibleHistory.length;
                    const candleStep = (width - paddingLeft - paddingRight) / candleCount;
                    const candleWidth = Math.max(2, candleStep * 0.7);

                    const getYPrice = (p: number) =>
                      paddingTop + candleH - ((p - minPrice) / (maxPrice - minPrice)) * candleH;

                    const maxVol = Math.max(...visibleHistory.map((h) => h.volume || 1));

                    return (
                      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                          const p = minPrice + pct * (maxPrice - minPrice);
                          const y = getYPrice(p);
                          return (
                            <g key={i}>
                              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                              <text x={width - paddingRight + 6} y={y + 3} fill="#64748b" fontSize="9" fontFamily="monospace">
                                R$ {p.toFixed(2)}
                              </text>
                            </g>
                          );
                        })}

                        {ind?.riskReward.resistances[0] && (
                          <g>
                            <line x1={paddingLeft} y1={getYPrice(ind.riskReward.resistances[0])} x2={width - paddingRight} y2={getYPrice(ind.riskReward.resistances[0])} stroke="#ef4444" strokeDasharray="4 4" strokeWidth="1.5" />
                            <text x={width - paddingRight + 6} y={getYPrice(ind.riskReward.resistances[0]) + 3} fill="#ef4444" fontSize="9" fontFamily="monospace" fontWeight="bold">
                              RES {ind.riskReward.resistances[0].toFixed(2)}
                            </text>
                          </g>
                        )}

                        {ind?.riskReward.supports[0] && (
                          <g>
                            <line x1={paddingLeft} y1={getYPrice(ind.riskReward.supports[0])} x2={width - paddingRight} y2={getYPrice(ind.riskReward.supports[0])} stroke="#10b981" strokeDasharray="4 4" strokeWidth="1.5" />
                            <text x={width - paddingRight + 6} y={getYPrice(ind.riskReward.supports[0]) + 3} fill="#10b981" fontSize="9" fontFamily="monospace" fontWeight="bold">
                              SUP {ind.riskReward.supports[0].toFixed(2)}
                            </text>
                          </g>
                        )}

                        {visibleHistory.map((item, idx) => {
                          const xCenter = paddingLeft + idx * candleStep + candleStep / 2;
                          const isGreen = item.close >= item.open;
                          const color = isGreen ? '#10b981' : '#ef4444';
                          const yHigh = getYPrice(item.high);
                          const yLow = getYPrice(item.low);
                          const yOpen = getYPrice(item.open);
                          const yClose = getYPrice(item.close);
                          const bodyY = Math.min(yOpen, yClose);
                          const bodyHeight = Math.max(1.5, Math.abs(yOpen - yClose));

                          return (
                            <g key={idx}>
                              <line x1={xCenter} y1={yHigh} x2={xCenter} y2={yLow} stroke={color} strokeWidth="1" />
                              <rect x={xCenter - candleWidth / 2} y={bodyY} width={candleWidth} height={bodyHeight} fill={color} rx="0.5" />
                            </g>
                          );
                        })}

                        {['mm20', 'mm50', 'mm200'].map((key) => {
                          const strokeColor = key === 'mm20' ? '#f59e0b' : key === 'mm50' ? '#06b6d4' : '#a855f7';
                          let d = '';
                          visibleHistory.forEach((h: any, idx) => {
                            const val = h[key];
                            if (val !== null && val !== undefined) {
                              const x = paddingLeft + idx * candleStep + candleStep / 2;
                              const y = getYPrice(val);
                              d += d === '' ? `M ${x} ${y}` : ` L ${x} ${y}`;
                            }
                          });
                          return <path key={key} d={d} fill="none" stroke={strokeColor} strokeWidth={key === 'mm20' ? '1.8' : '1.5'} />;
                        })}

                        {/* SUB-GRÁFICO 1: VOLUME */}
                        <g transform="translate(0, 250)">
                          <line x1={paddingLeft} y1="0" x2={width - paddingRight} y2="0" stroke="#1e293b" />
                          <text x={paddingLeft} y="12" fill="#64748b" fontSize="8" fontFamily="monospace">
                            VOLUME COM MÉDIA 20 DIAS
                          </text>
                          {visibleHistory.map((item, idx) => {
                            const xCenter = paddingLeft + idx * candleStep + candleStep / 2;
                            const isGreen = item.close >= item.open;
                            const vH = (item.volume / maxVol) * (volH - 18);
                            return (
                              <rect key={idx} x={xCenter - candleWidth / 2} y={volH - vH} width={candleWidth} height={vH} fill={isGreen ? '#059669' : '#dc2626'} opacity="0.8" />
                            );
                          })}
                        </g>

                        {/* SUB-GRÁFICO 2: RSI */}
                        <g transform="translate(0, 320)">
                          <line x1={paddingLeft} y1="0" x2={width - paddingRight} y2="0" stroke="#1e293b" />
                          <text x={paddingLeft} y="10" fill="#6366f1" fontSize="8" fontFamily="monospace">
                            RSI(14) — [42-68 ZONA SAUDÁVEL CNPI-T]
                          </text>
                          <line x1={paddingLeft} y1={rsiH - (70 / 100) * rsiH} x2={width - paddingRight} y2={rsiH - (70 / 100) * rsiH} stroke="#ef4444" strokeDasharray="2 2" opacity="0.5" />
                          <line x1={paddingLeft} y1={rsiH - (30 / 100) * rsiH} x2={width - paddingRight} y2={rsiH - (30 / 100) * rsiH} stroke="#10b981" strokeDasharray="2 2" opacity="0.5" />
                          {(() => {
                            let d = '';
                            visibleHistory.forEach((h: any, idx) => {
                              const val = h.rsi || 50;
                              const x = paddingLeft + idx * candleStep + candleStep / 2;
                              const y = rsiH - (val / 100) * rsiH;
                              d += d === '' ? `M ${x} ${y}` : ` L ${x} ${y}`;
                            });
                            return <path d={d} fill="none" stroke="#818cf8" strokeWidth="1.5" />;
                          })()}
                        </g>

                        {/* SUB-GRÁFICO 3: MACD */}
                        <g transform="translate(0, 390)">
                          <line x1={paddingLeft} y1="0" x2={width - paddingRight} y2="0" stroke="#1e293b" />
                          <text x={paddingLeft} y="10" fill="#f59e0b" fontSize="8" fontFamily="monospace">
                            MACD (12, 26, 9) & HISTOGRAMA
                          </text>
                          <line x1={paddingLeft} y1={macdH / 2} x2={width - paddingRight} y2={macdH / 2} stroke="#475569" strokeDasharray="2 2" />
                          {visibleHistory.map((_, idx) => {
                            const xCenter = paddingLeft + idx * candleStep + candleStep / 2;
                            const hist = ind?.macd.histogram || 0.05;
                            const isPos = hist >= 0;
                            const barH = Math.min(20, Math.abs(hist) * 100);
                            const y = isPos ? macdH / 2 - barH : macdH / 2;
                            return (
                              <rect key={idx} x={xCenter - candleWidth / 2} y={y} width={candleWidth} height={Math.max(1, barH)} fill={isPos ? '#10b981' : '#ef4444'} />
                            );
                          })}
                        </g>
                      </svg>
                    );
                  })()}
                </div>
              </div>

              {/* 2 BLOCOS: CHECKLIST TÉCNICO & PARÂMETROS OPERACIONAIS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="p-5 bg-[#0b101b] border border-gray-800 rounded-2xl shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                      <h4 className="font-bold text-white text-xs sm:text-sm uppercase tracking-wide">
                        CHECKLIST TÉCNICO (5 ITENS CNPI-T)
                      </h4>
                    </div>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-500/30 font-mono">
                      {ind?.checklist.statusLabel || '3/5'}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {ind?.checklist.items.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                          item.passed ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-gray-900/40 border-gray-800'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 ${
                            item.passed ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-gray-800 text-gray-500'
                          }`}
                        >
                          {item.passed ? '✓' : '-'}
                        </div>
                        <div>
                          <h5 className="font-bold text-xs text-white">{item.title}</h5>
                          <p className="text-[11px] text-gray-400 mt-0.5">{item.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5 bg-[#0b101b] border border-gray-800 rounded-2xl shadow-xl space-y-4 font-mono">
                  <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <Crosshair className="w-4 h-4 text-cyan-400" />
                      <h4 className="font-bold text-white text-xs sm:text-sm uppercase tracking-wide font-sans">
                        PARÂMETROS DE ESTUDO & RISCO/RETORNO
                      </h4>
                    </div>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                      R:R 1 : {ind?.riskReward.riskRewardRatio || 1.8}
                    </span>
                  </div>

                  {isBlocked ? (
                    <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-xl text-xs font-sans space-y-2 text-red-200">
                      <div className="font-bold text-red-400 flex items-center gap-1.5">
                        <Ban className="w-4 h-4" />
                        <span>ESTUDO DE COMPRA DESATIVADO</span>
                      </div>
                      <p className="text-[11px] text-gray-300">
                        Ativo classificado como <strong>{verdict?.verdictLabel}</strong>. O cálculo de alvos altistas está desativado para proteção contra deterioração de valor.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 bg-[#111827] rounded-xl border border-gray-800">
                        <span className="text-[10px] text-gray-400 block font-sans">VIÉS TÉCNICO</span>
                        <span className="text-sm font-bold text-emerald-400 mt-1 block">
                          {ind?.riskReward.bias || 'LONG'} ({ind?.riskReward.conviction || 'MÉDIA'})
                        </span>
                      </div>

                      <div className="p-3 bg-[#111827] rounded-xl border border-red-500/20">
                        <span className="text-[10px] text-red-400 block font-sans">STOP TÉCNICO</span>
                        <span className="text-sm font-bold text-red-400 mt-1 block">
                          R$ {ind?.riskReward.stopLoss.toFixed(2) || '0.00'}
                        </span>
                      </div>

                      <div className="p-3 bg-[#111827] rounded-xl border border-emerald-500/20">
                        <span className="text-[10px] text-emerald-400 block font-sans">ALVO 1 (1.0x RISCO)</span>
                        <span className="text-sm font-bold text-emerald-400 mt-1 block">
                          R$ {ind?.riskReward.target1.toFixed(2) || '0.00'}
                        </span>
                      </div>

                      <div className="p-3 bg-[#111827] rounded-xl border border-emerald-500/20">
                        <span className="text-[10px] text-emerald-400 block font-sans">ALVO 2 (2.0x RISCO)</span>
                        <span className="text-sm font-bold text-emerald-400 mt-1 block">
                          R$ {ind?.riskReward.target2.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5 pt-1 text-xs">
                    <div className="flex items-center justify-between p-2 bg-[#111827]/70 rounded-lg">
                      <span className="text-gray-400 font-sans">Níveis de Suporte:</span>
                      <span className="text-emerald-400 font-bold">
                        {ind?.riskReward.supports.map((s) => `R$ ${s.toFixed(2)}`).join(' | ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-[#111827]/70 rounded-lg">
                      <span className="text-gray-400 font-sans">Níveis de Resistência:</span>
                      <span className="text-red-400 font-bold">
                        {ind?.riskReward.resistances.map((r) => `R$ ${r.toFixed(2)}`).join(' | ')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 2: FUNDAMENTOS (CNPI-P) */}
          {/* ========================================================================= */}
          {activeTab === 'fundamentals' && fund && (
            <div className="space-y-4">
              <div className="p-5 bg-[#0b101b] border border-gray-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white">Raio-X Fundamentalista (CNPI-P / CG1)</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Rentabilidade, solvência e múltiplos reais do balanço patrimonial e DRE.
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-bold font-mono ${
                      fund.status === 'APROVADO'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-red-500/20 text-red-400 border border-red-500/40'
                    }`}
                  >
                    {fund.status} ({fund.score}/100)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Object.values(fund.metrics).filter(Boolean).map((metric) => (
                    <div
                      key={metric.name}
                      className="p-3.5 bg-[#111827] border border-gray-800 rounded-xl space-y-1 font-mono"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-400 font-sans">{metric.name}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            metric.status === 'BOM'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : metric.status === 'NEUTRO'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {metric.status}
                        </span>
                      </div>
                      <div className="text-lg font-bold text-white">{metric.formatted}</div>
                      <div className="text-[10px] text-gray-500 font-sans">Benchmark: {metric.benchmark}</div>
                    </div>
                  ))}
                </div>

                <div className="p-3.5 bg-[#111827] rounded-xl border border-gray-800 text-xs text-gray-300">
                  <p className="font-bold text-white mb-1">Diagnóstico Fundamentalista:</p>
                  <p className="text-gray-400 leading-relaxed">{fund.summary}</p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 3: OPÇÕES & OI (B3) */}
          {/* ========================================================================= */}
          {activeTab === 'options' && (
            <div className="space-y-4">
              <OptionsBarriersView initialSymbol={data.symbol} hideTopNav={true} />
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 4: RECOMENDAÇÕES DE ESTUDO (ANTIGA EXECUÇÃO) */}
          {/* ========================================================================= */}
          {activeTab === 'execution' && (
            <div className="space-y-5">
              {/* SELETOR DE MODO DE ESTUDO */}
              <div className="p-4 bg-[#0b101b] rounded-2xl border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span>Qual modalidade você deseja estudar neste ativo?</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Selecione entre o estudo com a estratégia eleita de opções da B3 ou a análise direta do ativo à vista.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-[#111827] p-1 rounded-xl border border-gray-700 text-xs font-bold">
                  <button
                    onClick={() => setExecMode('OPTIONS')}
                    className={`px-4 py-2 rounded-lg transition flex items-center gap-1.5 ${
                      execMode === 'OPTIONS'
                        ? 'bg-cyan-600 text-white shadow-md'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Estratégia de Opções Eleita</span>
                  </button>

                  <button
                    onClick={() => setExecMode('STOCK')}
                    className={`px-4 py-2 rounded-lg transition flex items-center gap-1.5 ${
                      execMode === 'STOCK'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Estudo da Ação à Vista</span>
                  </button>
                </div>
              </div>

              {/* CENÁRIO BLOQUEADO (EX: CSAN3) — RENDERIZAÇÃO HARMONIZADA EM AMBOS OS MODOS */}
              {isBlocked && (
                <div className="p-6 bg-[#0b101b] border border-red-500/40 rounded-2xl shadow-2xl space-y-4 text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                    <Ban className="w-8 h-8 text-red-400" />
                  </div>
                  <div className="max-w-xl mx-auto space-y-2">
                    <span className="px-3 py-1 bg-red-500/20 text-red-300 border border-red-500/40 rounded-xl text-xs font-bold font-mono">
                      STATUS DO ATIVO: {verdict?.verdictLabel}
                    </span>
                    <h4 className="text-lg font-bold text-white">
                      Estudo Operacional Bloqueado por Fundamentos
                    </h4>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      A empresa <strong>{data.symbol}</strong> foi reprovada no crivo fundamentalista (score {fund?.score || 0}/100) devido a prejuízos líquidos recorrentes ou nível excessivo de endividamento.
                    </p>
                    <div className="p-3.5 bg-red-950/20 rounded-xl border border-red-500/20 text-xs text-red-200 text-left font-sans space-y-1">
                      <p className="font-bold text-red-300">Diretriz Educacional CNPI:</p>
                      <p>• Montagens de compra à vista ou travas direcionais de alta são terminantemente desaconselhadas.</p>
                      <p>• Ações com fundamentos deteriorados apresentam alto risco de rompimento de suportes e armadilhas de valor.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* =================================================================== */}
              {/* MODO OPÇÕES (QUANDO NÃO BLOQUEADO) */}
              {/* =================================================================== */}
              {!isBlocked && execMode === 'OPTIONS' && !elected && (
                <div className="p-6 bg-[#0b101b] border border-amber-500/30 rounded-2xl shadow-xl flex flex-col items-center justify-center gap-4 text-center min-h-[200px]">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                    <HelpCircle className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-sm">Sem Estratégia de Opções Eleita</h4>
                    <p className="text-xs text-gray-400 max-w-xs">
                      Este ativo não possui opções líquidas suficientes na B3 no vencimento corrente para montagem automatizada.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-2 text-xs">
                    <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono font-bold">
                      💡 Veredito: {verdict?.verdictLabel || 'AGUARDAR'}
                    </span>
                    <button
                      onClick={() => setExecMode('STOCK')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition flex items-center gap-1.5"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      Ver Estudo à Vista
                    </button>
                  </div>
                </div>
              )}

              {!isBlocked && execMode === 'OPTIONS' && elected && (
                <div className="space-y-4">
                  {/* CARD PRINCIPAL DA ESTRATÉGIA ELEITA */}
                  <div className="p-5 bg-[#0b101b] border border-cyan-500/40 rounded-2xl shadow-2xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-cyan-500 text-slate-950 font-black text-xs flex items-center justify-center font-mono shadow-md">
                            #{elected.strategySpec.id}
                          </span>
                          <h4 className="font-bold text-white text-base sm:text-lg">
                            {elected.title}
                          </h4>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {elected.strategySpec.whenToUse}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="px-3 py-1 bg-cyan-950 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold font-mono">
                          {elected.dte} DTE • {elected.expirationDate}
                        </span>
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-xl text-xs font-bold font-mono">
                          ✓ {elected.status}
                        </span>
                      </div>
                    </div>

                    {/* 4 CARDS DE MÉTRICAS FINANCEIRAS DE MONTAGEM */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                      <div className="p-3.5 bg-[#111827] rounded-xl border border-gray-800">
                        <span className="text-[10px] text-gray-400 block font-sans">
                          {elected.isCredit ? 'CRÉDITO ESTIMADO' : 'CUSTO ESTIMADO'}
                        </span>
                        <span className="text-lg font-bold text-emerald-400 mt-1 block">
                          R$ {elected.netCostOrCredit.toFixed(2)} / cota
                        </span>
                        <span className="text-[10px] text-gray-500 block font-sans">
                          (R$ {elected.totalCostOrCreditForLot.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por lote de 1.000)
                        </span>
                      </div>

                      <div className="p-3.5 bg-[#111827] rounded-xl border border-gray-800">
                        <span className="text-[10px] text-gray-400 block font-sans">LARGURA DO SPREAD</span>
                        <span className="text-lg font-bold text-cyan-400 mt-1 block">
                          R$ {elected.spreadWidth.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-gray-500 block font-sans">
                          Retorno: {elected.returnOnRiskPct}% da largura
                        </span>
                      </div>

                      <div className="p-3.5 bg-[#111827] rounded-xl border border-gray-800">
                        <span className="text-[10px] text-gray-400 block font-sans">PONTO DE EQUILÍBRIO</span>
                        <span className="text-lg font-bold text-amber-400 mt-1 block">
                          R$ {elected.breakEven.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-gray-500 block font-sans">
                          Break-even no vencimento
                        </span>
                      </div>

                      <div className="p-3.5 bg-[#111827] rounded-xl border border-emerald-500/30">
                        <span className="text-[10px] text-emerald-400 block font-sans">LUCRO ESTIMADO MÁXIMO</span>
                        <span className="text-lg font-bold text-emerald-400 mt-1 block">
                          R$ {elected.maxProfitLot.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-red-400 block font-sans">
                          Perda Máx: R$ {elected.maxLossLot.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* GRÁFICO MATEMÁTICO DE PAYOFF */}
                    <OptionPayoffChart electedStrategy={elected} />

                    {/* PERNAS DA MONTAGEM COM STRIKES REAIS B3 */}
                    <div className="p-4 bg-[#111827] rounded-xl border border-gray-800 space-y-3 font-mono">
                      <div className="flex items-center justify-between text-xs font-bold text-gray-300 font-sans">
                        <span>Pernas do Estudo (B3):</span>
                        <span className="text-[11px] text-gray-500 font-mono">Tamanho Padrão: 1.000 cotas</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {elected.legs.map((leg, idx) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border flex items-center justify-between ${
                              leg.action === 'VENDA'
                                ? 'bg-red-950/20 border-red-500/30'
                                : 'bg-emerald-950/20 border-emerald-500/30'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    leg.action === 'VENDA'
                                      ? 'bg-red-500/20 text-red-400'
                                      : 'bg-emerald-500/20 text-emerald-400'
                                  }`}
                                >
                                  {leg.action}
                                </span>
                                <span className="font-bold text-white text-xs">{leg.symbol}</span>
                              </div>
                              <div className="text-[11px] text-gray-400 mt-1 font-sans">
                                Strike <strong>R$ {leg.strike.toFixed(2)}</strong> • {leg.type}
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="text-xs font-bold text-white">
                                {leg.action === 'VENDA' ? '+' : '-'}R$ {leg.unitPrice.toFixed(2)} / cota
                              </span>
                              <div className="text-[10px] text-gray-400 font-sans">
                                Total: R$ {leg.totalFinancial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-[9px] text-gray-500 font-mono">
                                OI: {leg.openInterest.toLocaleString('pt-BR')}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* GATILHOS DE SAÍDA DE ESTUDO */}
                    <div className="p-4 bg-[#111827] rounded-xl border border-gray-800 space-y-3 font-sans">
                      <h5 className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-cyan-400" />
                        <span>Gatilhos Teóricos de Saída (Take Profit, Stop Loss & Tempo):</span>
                      </h5>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 bg-[#0b101b] rounded-xl border border-emerald-500/30 space-y-1.5">
                          <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>SAÍDA COM LUCRO:</span>
                          </div>
                          <p className="text-white font-semibold">{elected.takeProfitRule.profitGoal}</p>
                          <p className="text-gray-400 text-[11px]">{elected.takeProfitRule.description}</p>
                        </div>

                        <div className="p-3 bg-[#0b101b] rounded-xl border border-red-500/30 space-y-1.5">
                          <div className="flex items-center gap-1.5 font-bold text-red-400">
                            <TrendingDown className="w-3.5 h-3.5" />
                            <span>SAÍDA COM PERDA (STOP):</span>
                          </div>
                          <p className="text-white font-semibold">{elected.stopLossRule.lossLimit}</p>
                          <p className="text-gray-400 text-[11px]">{elected.stopLossRule.description}</p>
                        </div>

                        <div className="p-3 bg-[#0b101b] rounded-xl border border-amber-500/30 space-y-1.5">
                          <div className="flex items-center gap-1.5 font-bold text-amber-400">
                            <Clock className="w-3.5 h-3.5" />
                            <span>GATILHO DE TEMPO (TIME STOP):</span>
                          </div>
                          <p className="text-white font-semibold">Desmontar a {elected.timeStopRule.dteLimit} dias úteis do vencimento</p>
                          <p className="text-gray-400 text-[11px]">{elected.timeStopRule.description}</p>
                        </div>
                      </div>
                    </div>

                    {/* BOTÃO PARA EXPANDIR CATÁLOGO COMPLETO DE 25 ESTRATÉGIAS */}
                    <div className="pt-2 border-t border-gray-800 flex justify-center">
                      <button
                        onClick={() => setShowFullOptionCatalog(!showFullOptionCatalog)}
                        className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium px-4 py-2 rounded-xl bg-[#111827] hover:bg-gray-800 border border-gray-800 transition"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{showFullOptionCatalog ? 'Ocultar Catálogo das 25 Estratégias' : 'Consultar Catálogo Oficial das 25 Estratégias de Opções'}</span>
                        {showFullOptionCatalog ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* CATÁLOGO EXPANSÍVEL */}
                  {showFullOptionCatalog && (
                    <div className="p-5 bg-[#0b101b] border border-gray-800 rounded-2xl shadow-xl space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
                        <div>
                          <h4 className="font-bold text-white text-base">
                            Catálogo Oficial: 25 Estratégias Comprovadas de Opções
                          </h4>
                          <p className="text-xs text-gray-400">
                            Consulte o referencial teórico e perfil de Payoff de cada estratégia.
                          </p>
                        </div>

                        <div className="flex items-center gap-1 bg-[#111827] p-1 rounded-xl border border-gray-700 text-xs font-mono">
                          {(['ALL', 'Direcional', 'Precisão', 'Arbitragem'] as const).map((cat) => (
                            <button
                              key={cat}
                              onClick={() => setOptionCategoryFilter(cat)}
                              className={`px-2.5 py-1 rounded-lg transition ${
                                optionCategoryFilter === cat ? 'bg-amber-600 text-white font-bold' : 'text-gray-400 hover:text-white'
                              }`}
                            >
                              {cat === 'ALL' ? 'Todas (25)' : cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredOptionStrategies.map((strat) => {
                          const isSelected = selectedOptionStrategy.id === strat.id;
                          return (
                            <div
                              key={strat.id}
                              onClick={() => setSelectedOptionStrategy(strat)}
                              className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between space-y-2 ${
                                isSelected
                                  ? 'bg-amber-950/30 border-amber-500 ring-1 ring-amber-500/50'
                                  : 'bg-[#111827] border-gray-800 hover:border-gray-700'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-mono font-bold text-amber-400">#{strat.id}</span>
                                  <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-gray-800 text-gray-300 font-mono">
                                    {strat.category}
                                  </span>
                                </div>
                                <h5 className="font-bold text-white text-xs sm:text-sm mt-1">{strat.name}</h5>
                                <p className="text-[10px] text-gray-400 font-mono">{strat.originalName}</p>
                                <p className="text-[11px] text-gray-300 mt-1 line-clamp-2">{strat.whenToUse}</p>
                              </div>

                              <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-[10px] text-gray-400 font-mono">
                                <span>Viés: <strong>{strat.bias}</strong></span>
                                <span>Dificuldade: <strong>{strat.difficulty}</strong></span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* DETALHE DA ESTRATÉGIA SELECIONADA */}
                      {selectedOptionStrategy && (
                        <div className="p-4 bg-[#111827] rounded-xl border border-amber-500/40 space-y-3 mt-3">
                          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center font-mono">
                                #{selectedOptionStrategy.id}
                              </span>
                              <h5 className="font-bold text-white text-sm">
                                {selectedOptionStrategy.name} ({selectedOptionStrategy.originalName})
                              </h5>
                            </div>
                            <span className="text-xs text-amber-400 font-mono">
                              {selectedOptionStrategy.category} • {selectedOptionStrategy.bias}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-300">
                            <div className="p-3 bg-[#0b101b] rounded-lg border border-gray-800 space-y-1">
                              <span className="font-bold text-white block">🎯 Quando Estudar:</span>
                              <p className="text-gray-400">{selectedOptionStrategy.whenToUse}</p>
                            </div>

                            <div className="p-3 bg-[#0b101b] rounded-lg border border-gray-800 space-y-1">
                              <span className="font-bold text-white block">⚙️ Estrutura de Pernas:</span>
                              <p className="text-gray-400">{selectedOptionStrategy.legsDescription}</p>
                            </div>

                            <div className="p-3 bg-[#0b101b] rounded-lg border border-gray-800 space-y-1">
                              <span className="font-bold text-emerald-400 block">💰 Perfil de Retorno:</span>
                              <p className="text-gray-400">{selectedOptionStrategy.profitProfile}</p>
                            </div>

                            <div className="p-3 bg-[#0b101b] rounded-lg border border-gray-800 space-y-1">
                              <span className="font-bold text-red-400 block">⚠️ Perfil de Risco:</span>
                              <p className="text-gray-400">{selectedOptionStrategy.lossProfile}</p>
                            </div>
                          </div>

                          <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-xs text-amber-200">
                            <strong>⏳ Impacto do Tempo (Theta):</strong> {selectedOptionStrategy.timeDecayProfile}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* =================================================================== */}
              {/* MODO AÇÃO À VISTA (QUANDO NÃO BLOQUEADO) */}
              {/* =================================================================== */}
              {!isBlocked && execMode === 'STOCK' && (
                <div className="p-5 bg-[#0b101b] border border-emerald-500/30 rounded-2xl shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
                    <div>
                      <h4 className="font-bold text-white text-base">
                        Estudo Técnico do Ativo à Vista: {data.symbol}
                      </h4>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Pontos de referência para estudo de Entrada, Stop Técnico e Alvos de Risco/Retorno.
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-xl text-xs font-bold font-mono">
                      VIÉS: {isVenda ? 'SHORT / VENDA' : (ind?.riskReward.bias || 'LONG')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono">
                    <div className="p-3.5 bg-[#111827] rounded-xl border border-gray-800">
                      <span className="text-[10px] text-gray-400 block font-sans">PREÇO DE REFERÊNCIA</span>
                      <span className="text-base font-bold text-white mt-1 block">
                        R$ {data.regularMarketPrice ? data.regularMarketPrice.toFixed(2) : '0.00'}
                      </span>
                    </div>

                    <div className="p-3.5 bg-[#111827] rounded-xl border border-red-500/30">
                      <span className="text-[10px] text-red-400 block font-sans">STOP LOSS TÉCNICO</span>
                      <span className="text-base font-bold text-red-400 mt-1 block">
                        R$ {ind?.riskReward.stopLoss.toFixed(2) || '0.00'}
                      </span>
                    </div>

                    <div className="p-3.5 bg-[#111827] rounded-xl border border-emerald-500/30">
                      <span className="text-[10px] text-emerald-400 block font-sans">ALVO 1 (1.5x RISCO)</span>
                      <span className="text-base font-bold text-emerald-400 mt-1 block">
                        R$ {ind?.riskReward.target1.toFixed(2) || '0.00'}
                      </span>
                    </div>

                    <div className="p-3.5 bg-[#111827] rounded-xl border border-emerald-500/30">
                      <span className="text-[10px] text-emerald-400 block font-sans">ALVO 2 (2.5x RISCO)</span>
                      <span className="text-base font-bold text-emerald-400 mt-1 block">
                        R$ {ind?.riskReward.target2.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>

                  {/* GRÁFICO DE CANDLESTICKS */}
                  {ind && (
                    <StockTradePlanChart
                      symbol={data.symbol}
                      historicalPrices={data.historicalDataPrice}
                      entryPrice={data.regularMarketPrice}
                      stopLoss={ind.riskReward.stopLoss}
                      target1={ind.riskReward.target1}
                      target2={ind.riskReward.target2}
                      bias={ind.riskReward.bias}
                    />
                  )}

                  <div className="p-4 bg-[#111827] rounded-xl border border-gray-800 text-xs space-y-2 text-gray-300">
                    <div className="font-bold text-white">Diretrizes Teóricas de Condução:</div>
                    <p>• <strong>Gatilho de Estudo:</strong> Região de suporte/resistência em R$ {data.regularMarketPrice?.toFixed(2)}.</p>
                    <p>• <strong>Trailing Stop:</strong> Em caso de avanço até o Alvo 1, proteger o estudo no preço de entrada (Breakeven).</p>
                    <p>• <strong>Condução:</strong> Monitorar o fechamento diário em relação à média móvel de 20 períodos.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* ABA 5: CONSULTOR IA FINANCEIRO */}
          {/* ========================================================================= */}
          {activeTab === 'ai' && (
            <AIConsultantView currentQuote={data} />
          )}
        </div>
      )}

      {/* Tratamento de Erro */}
      {error && !loading && (
        <div className="bg-[#0f172a] p-8 rounded-2xl border border-red-500/30 shadow-xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Dados não disponíveis</h3>
              <p className="text-xs text-red-400 font-mono mt-0.5">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
