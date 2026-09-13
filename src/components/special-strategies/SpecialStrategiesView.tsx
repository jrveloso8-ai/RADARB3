'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Info,
  Layers,
  ShieldCheck,
  Search,
  DollarSign,
  Percent,
  Clock,
  Coins,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  SlidersHorizontal,
  ArrowRight,
  Repeat,
  Flame,
  Wallet,
} from 'lucide-react';
import {
  SpecialStrategiesScreeningResult,
  DITMCandidate,
  PoorMansCoveredCallCandidate,
  PMCCScreeningResult,
  CashSecuredPutCandidate,
  CashSecuredPutScreeningResult,
} from '@/lib/domain/special-strategies';

interface SpecialStrategiesViewProps {
  onSelectSymbol?: (symbol: string) => void;
}

const QUICK_TICKERS_DITM = ['PETR4', 'VALE3', 'BOVA11', 'ITUB4', 'BBAS3', 'BBDC4'];
const QUICK_TICKERS_PUT = ['PETR4', 'VALE3', 'BBAS3', 'ITUB4', 'BBDC4', 'BOVA11', 'WEGE3', 'RENT3', 'CSNA3', 'PRIO3'];

export const SpecialStrategiesView: React.FC<SpecialStrategiesViewProps> = ({ onSelectSymbol }) => {
  const [activeStrategy, setActiveStrategy] = useState<'ditm' | 'pmcc' | 'put'>('ditm');
  const [symbol, setSymbol] = useState<string>('PETR4');
  const [inputSymbol, setInputSymbol] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Dados das estratégias
  const [ditmData, setDitmData] = useState<SpecialStrategiesScreeningResult | null>(null);
  const [pmccData, setPmccData] = useState<PMCCScreeningResult | null>(null);
  const [cashSecuredPutData, setCashSecuredPutData] = useState<CashSecuredPutScreeningResult | null>(null);

  // Filtros e seleções
  const [selectedExpiration, setSelectedExpiration] = useState<string>('ALL');
  const [selectedDitmCandidate, setSelectedDitmCandidate] = useState<DITMCandidate | null>(null);
  const [selectedPmccCandidate, setSelectedPmccCandidate] = useState<PoorMansCoveredCallCandidate | null>(null);
  const [selectedPutCandidate, setSelectedPutCandidate] = useState<CashSecuredPutCandidate | null>(null);
  const [simulationLots, setSimulationLots] = useState<number>(1000);
  const [putSimulationCapital, setPutSimulationCapital] = useState<number>(20000);

  // Estados do Ranking e Legenda PMCC
  const [showScoreExplanation, setShowScoreExplanation] = useState<boolean>(false);
  const [pmccSortBy, setPmccSortBy] = useState<'score' | 'yield' | 'profit' | 'amortization'>('score');

  const fetchScreening = useCallback(async (targetSymbol: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/special-strategies?symbol=${encodeURIComponent(targetSymbol)}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Falha ao carregar screening de estratégias especiais');
      }

      const dResult: SpecialStrategiesScreeningResult = json.ditm || json;
      const pResult: PMCCScreeningResult = json.pmcc || null;
      const csResult: CashSecuredPutScreeningResult = json.cashSecuredPut || null;

      setDitmData(dResult);
      setPmccData(pResult);
      setCashSecuredPutData(csResult);

      if (dResult.candidates && dResult.candidates.length > 0) {
        setSelectedDitmCandidate(dResult.candidates[0]);
      } else {
        setSelectedDitmCandidate(null);
      }

      if (pResult?.candidates && pResult.candidates.length > 0) {
        setSelectedPmccCandidate(pResult.candidates[0]);
      } else {
        setSelectedPmccCandidate(null);
      }

      if (csResult?.candidates && csResult.candidates.length > 0) {
        setSelectedPutCandidate(csResult.candidates[0]);
      } else {
        setSelectedPutCandidate(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(msg);
      setDitmData(null);
      setPmccData(null);
      setCashSecuredPutData(null);
      setSelectedDitmCandidate(null);
      setSelectedPmccCandidate(null);
      setSelectedPutCandidate(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScreening(symbol);
  }, [symbol, fetchScreening]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputSymbol.trim()) return;
    const clean = inputSymbol.trim().toUpperCase();
    setSymbol(clean);
    setInputSymbol('');
  };

  const filteredDitmCandidates = React.useMemo(() => {
    if (!ditmData?.candidates) return [];
    if (selectedExpiration === 'ALL') return ditmData.candidates;
    return ditmData.candidates.filter((c) => c.expirationDate === selectedExpiration);
  }, [ditmData, selectedExpiration]);

  const sortedPmccCandidates = React.useMemo(() => {
    if (!pmccData?.candidates) return [];
    const list = [...pmccData.candidates];
    switch (pmccSortBy) {
      case 'yield':
        return list.sort((a, b) => b.monthlyYieldPercent - a.monthlyYieldPercent);
      case 'profit':
        return list.sort((a, b) => b.maxProfitIfExercised - a.maxProfitIfExercised);
      case 'amortization':
        return list.sort((a, b) => a.monthsToFullAmortization - b.monthsToFullAmortization);
      case 'score':
      default:
        return list.sort((a, b) => b.compositeScore - a.compositeScore);
    }
  }, [pmccData, pmccSortBy]);

  const timing = ditmData?.timing || pmccData?.timing;
  const spotPrice = ditmData?.spotPrice || pmccData?.spotPrice || 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-4">
      {/* 1. CABEÇALHO DA ABA E SELETOR DE ESTRATÉGIA */}
      <div className="bg-[#0e1422] border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden space-y-4">
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </span>
              <span className="text-xs font-mono font-bold tracking-wider text-emerald-400 uppercase">
                Playbook Lee Lowell · Opções B3
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Estratégias Especiais Institucionais
            </h1>
            <p className="text-sm text-gray-400 mt-1 max-w-3xl">
              Modelos de alta assimetria e renda passiva baseados no clássico <em>&quot;Fique Rico Operando Opções&quot;</em>.
              Dados 100% reais de mercado da B3 com cálculo analítico de Valor Justo e Timing Técnico.
            </p>
          </div>

          {/* Busca de Ticker */}
          <form onSubmit={handleSearch} className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <input
                type="text"
                value={inputSymbol}
                onChange={(e) => setInputSymbol(e.target.value)}
                placeholder="Ex: PETR4, VALE3..."
                className="bg-gray-900/90 border border-gray-700 rounded-xl px-3 py-2 pl-9 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 w-36 sm:w-44 font-mono uppercase"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold transition flex items-center gap-1 shadow-lg shadow-emerald-500/20"
            >
              Consultar
            </button>
            <button
              type="button"
              onClick={() => fetchScreening(symbol)}
              title="Atualizar dados"
              disabled={loading}
              className="p-2 rounded-xl border border-gray-700 bg-gray-900 text-gray-300 hover:text-white transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </form>
        </div>

        {/* SELETOR DE ESTRATÉGIA NO TOPO */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-3 border-t border-gray-800/80">
          <span className="text-xs text-gray-400 font-mono mr-1">Estratégia:</span>
          <button
            onClick={() => setActiveStrategy('ditm')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
              activeStrategy === 'ditm'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700 border border-gray-700/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            1. Compra de Call DITM (Stock Replacement)
          </button>

          <button
            onClick={() => setActiveStrategy('pmcc')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
              activeStrategy === 'pmcc'
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700 border border-gray-700/50'
            }`}
          >
            <Coins className="w-4 h-4" />
            2. Venda Coberta Sintética (Poor Man&apos;s Covered Call)
          </button>

          <button
            onClick={() => setActiveStrategy('put')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
              activeStrategy === 'put'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700 border border-gray-700/50'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            3. Venda de Put OTM (Compra c/ Desconto)
          </button>
        </div>

        {/* Chips Rápidos de Tickers */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-gray-800/40 flex-wrap">
          <span className="text-xs text-gray-400 mr-1 font-mono">
            {activeStrategy === 'put' ? 'Ativos com Alta Liquidez em Puts:' : 'Mais Líquidos B3 (Opções Longas DITM):'}
          </span>
          {(activeStrategy === 'put' ? QUICK_TICKERS_PUT : QUICK_TICKERS_DITM).map((t) => (
            <button
              key={t}
              onClick={() => setSymbol(t)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition ${
                symbol === t
                  ? (activeStrategy === 'put' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' : 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20')
                  : 'bg-gray-800/70 text-gray-300 hover:bg-gray-700 border border-gray-700/50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* 2. FEEDBACK DE ERRO OU CARREGAMENTO */}
      {loading && (
        <div className="bg-[#0e1422] border border-gray-800 rounded-2xl p-12 text-center shadow-xl">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-3" />
          <p className="text-white font-medium">Consultando cotações e opções reais da B3 para {symbol}...</p>
          <p className="text-xs text-gray-400 mt-1 font-mono">Processando séries curtas e longas na BRAPI</p>
        </div>
      )}

      {error && !loading && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 text-rose-300 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-white">Falha na Consulta de Mercado</h3>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* 3. SEMÁFORO DE TIMING TÉCNICO DO ATIVO (100% REAL) */}
          {timing && (
            <div
              className={`border rounded-2xl p-5 shadow-lg relative overflow-hidden ${
                timing.badgeVariant === 'emerald'
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                  : timing.badgeVariant === 'blue'
                  ? 'bg-blue-950/20 border-blue-500/30 text-blue-300'
                  : timing.badgeVariant === 'amber'
                  ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                  : timing.badgeVariant === 'rose'
                  ? 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                  : 'bg-gray-900/40 border-gray-800 text-gray-300'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-black/40 border border-current">
                      {timing.badgeText}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                      Spot Atual: <strong className="text-white">R$ {spotPrice.toFixed(2)}</strong>
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-white">{timing.title}</h2>
                  <p className="text-sm text-gray-300 max-w-3xl leading-relaxed">{timing.explanation}</p>
                  <p className="text-xs text-gray-400 font-mono pt-1">
                    👉 <strong>Orientação Operacional:</strong> {timing.actionGuidance}
                  </p>
                </div>

                {/* Métricas Técnicas Reais */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0 bg-black/40 p-3 rounded-xl border border-gray-800 text-center font-mono">
                  <div>
                    <span className="text-[10px] text-gray-400 block">MM20</span>
                    <span className="text-xs font-bold text-white">
                      {timing.sma20 ? `R$ ${timing.sma20.toFixed(2)}` : 'N/D'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">MM50</span>
                    <span className="text-xs font-bold text-white">
                      {timing.sma50 ? `R$ ${timing.sma50.toFixed(2)}` : 'N/D'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">MM200</span>
                    <span className="text-xs font-bold text-white">
                      {timing.sma200 ? `R$ ${timing.sma200.toFixed(2)}` : 'N/D'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">IFR (14)</span>
                    <span
                      className={`text-xs font-bold ${
                        (timing.rsi14 || 50) <= 35
                          ? 'text-blue-400'
                          : (timing.rsi14 || 50) >= 68
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {timing.rsi14 !== null ? timing.rsi14.toFixed(1) : 'N/D'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ESTRATÉGIA 1: COMPRA DE CALL DITM (STOCK REPLACEMENT)                     */}
          {/* ========================================================================= */}
          {activeStrategy === 'ditm' && ditmData && (
            <>
              {/* OS 4 MANDAMENTOS DE LEE LOWELL */}
              <div className="bg-[#0e1422] border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-xl">
                <h3 className="text-sm font-mono font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Mecânica Lee Lowell: Os 4 Pilares da Substituição de Ações
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-gray-900/70 border border-gray-800/80 space-y-1">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px]">1</span>
                      Delta Alto (~0.90)
                    </span>
                    <p className="text-gray-400 leading-relaxed">
                      A opção se move centavo a centavo junto com a ação. A variação percentual sobre o capital investido é multiplicada.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-900/70 border border-gray-800/80 space-y-1">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px]">2</span>
                      Pouco &quot;Pó&quot; (VE &lt; 2%)
                    </span>
                    <p className="text-gray-400 leading-relaxed">
                      Quase 100% do que você paga é Valor Intrínseco ($Spot - Strike$). O decaimento temporal (theta) é desprezível.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-900/70 border border-gray-800/80 space-y-1">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px]">3</span>
                      Vencimento 3 a 6 Meses
                    </span>
                    <p className="text-gray-400 leading-relaxed">
                      Horizonte de tempo amplo para a tese de investimento se concretizar, sem a angústia da expiração mensal curta.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-900/70 border border-gray-800/80 space-y-1">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px]">4</span>
                      Capital Livre no CDI
                    </span>
                    <p className="text-gray-400 leading-relaxed">
                      Você imobiliza apenas 35% do dinheiro. Os 65% restantes rendem juros compostos em liquidez diária (~14% a.a.).
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-200/90">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p>
                    <strong>Atenção aos Proventos na B3:</strong> O comprador de Call não recebe proventos em dinheiro creditados em conta corrente. 
                    Entretanto, a B3 desconta integralmente dividendos e JCP do strike da opção na data ex-provento, preservando o valor intrínseco.
                  </p>
                </div>
              </div>

              {/* SIMULADOR DE ALOCAÇÃO DE CAPITAL DITM */}
              {selectedDitmCandidate && (
                <div className="bg-gradient-to-br from-[#0e1422] to-[#121b2f] border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                        Simulador Comparativo de Capital
                      </span>
                      <h3 className="text-lg font-bold text-white">
                        Comprar {simulationLots} Ações no À Vista vs Comprar {simulationLots} Calls DITM ({selectedDitmCandidate.symbol})
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-gray-400">Quantidade:</span>
                      {[100, 500, 1000, 5000].map((qty) => (
                        <button
                          key={qty}
                          onClick={() => setSimulationLots(qty)}
                          className={`px-2.5 py-1 rounded-lg font-bold transition ${
                            simulationLots === qty
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {qty.toLocaleString('pt-BR')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(() => {
                    const optPrice = selectedDitmCandidate.marketPrice ?? selectedDitmCandidate.fairValue;
                    const stockCost = spotPrice * simulationLots;
                    const optionCost = optPrice * simulationLots;
                    const capitalSaved = stockCost - optionCost;
                    const cdiAnnualReturn = capitalSaved * 0.14;
                    const cdiPeriodReturn = cdiAnnualReturn * (selectedDitmCandidate.dte / 252);

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
                        <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-800 space-y-1">
                          <span className="text-[11px] text-gray-400 block">Comprar Ação no À Vista</span>
                          <span className="text-xl font-bold text-white block">
                            R$ {stockCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[11px] text-rose-400 block">100% de capital imobilizado</span>
                        </div>

                        <div className="bg-gray-900/80 p-4 rounded-xl border border-emerald-500/30 space-y-1">
                          <span className="text-[11px] text-emerald-400 block">Comprar Call DITM ({selectedDitmCandidate.symbol})</span>
                          <span className="text-xl font-bold text-emerald-400 block">
                            R$ {optionCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[11px] text-gray-400 block">
                            Apenas {((optionCost / stockCost) * 100).toFixed(1)}% do capital total
                          </span>
                        </div>

                        <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-800 space-y-1">
                          <span className="text-[11px] text-teal-400 block">Capital Liberado (P/ Renda Fixa)</span>
                          <span className="text-xl font-bold text-teal-300 block">
                            R$ {capitalSaved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[11px] text-emerald-400/90 block">
                            Rende ~R$ {cdiPeriodReturn.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} no CDI até o vencimento
                          </span>
                        </div>

                        <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-800 space-y-1">
                          <span className="text-[11px] text-gray-400 block">Alavancagem / Break-Even</span>
                          <span className="text-xl font-bold text-white block">
                            {selectedDitmCandidate.leverage.toFixed(1)}x
                          </span>
                          <span className="text-[11px] text-gray-400 block">
                            Break-even: R$ {selectedDitmCandidate.breakEven.toFixed(2)} (+{(((selectedDitmCandidate.breakEven - spotPrice) / spotPrice) * 100).toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* GRADE DE OPORTUNIDADES DITM */}
              <div className="bg-[#0e1422] border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      Séries de Calls DITM Encontradas na B3 (3 a 6 Meses)
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Total de {ditmData.candidates.length} séries profundas no dinheiro filtradas com vencimento entre{' '}
                      {ditmData.eligibleExpirations.join(', ')}.
                    </p>
                  </div>

                  {ditmData.eligibleExpirations.length > 1 && (
                    <div className="flex items-center gap-1.5 font-mono text-xs flex-wrap">
                      <span className="text-gray-400 flex items-center gap-1">
                        <SlidersHorizontal className="w-3 h-3" /> Vencimento:
                      </span>
                      <button
                        onClick={() => setSelectedExpiration('ALL')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition ${
                          selectedExpiration === 'ALL'
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        Todos ({ditmData.candidates.length})
                      </button>
                      {ditmData.eligibleExpirations.map((exp) => {
                        const count = ditmData.candidates.filter((c) => c.expirationDate === exp).length;
                        return (
                          <button
                            key={exp}
                            onClick={() => setSelectedExpiration(exp)}
                            className={`px-2.5 py-1 rounded-lg font-bold transition ${
                              selectedExpiration === exp
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            }`}
                          >
                            {exp} ({count})
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {filteredDitmCandidates.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-gray-800 rounded-xl text-gray-400">
                    <p>Nenhuma opção DITM encontrada para o filtro de vencimento selecionado.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-400 text-[11px] uppercase">
                          <th className="py-3 px-3">Série (CALL)</th>
                          <th className="py-3 px-2">Vencimento</th>
                          <th className="py-3 px-2 text-right">Strike</th>
                          <th className="py-3 px-2 text-right">Profundidade</th>
                          <th className="py-3 px-2 text-right">Preço Mercado</th>
                          <th className="py-3 px-2 text-right text-emerald-400">Valor Justo</th>
                          <th className="py-3 px-2 text-right">Preço Teto</th>
                          <th className="py-3 px-2 text-right">VI / VE</th>
                          <th className="py-3 px-2 text-right">% VE Spot</th>
                          <th className="py-3 px-3 text-right">Contratos Abertos</th>
                          <th className="py-3 px-3 text-center">Status</th>
                          <th className="py-3 px-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/60">
                        {filteredDitmCandidates.map((cand) => {
                          const isSelected = selectedDitmCandidate?.symbol === cand.symbol;
                          const vePerc = cand.realExtrinsicPercent ?? ((cand.theoreticalExtrinsicValue / cand.spotPrice) * 100);

                          return (
                            <tr
                              key={cand.symbol}
                              onClick={() => setSelectedDitmCandidate(cand)}
                              className={`hover:bg-gray-800/40 cursor-pointer transition ${
                                isSelected ? 'bg-emerald-500/10 border-l-4 border-l-emerald-500' : ''
                              }`}
                            >
                              <td className="py-3 px-3 font-bold text-white flex items-center gap-1.5">
                                {cand.symbol}
                                {cand.quality === 'EXCELENTE' && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-400" title="Excelente liquidez e baixo VE" />
                                )}
                              </td>
                              <td className="py-3 px-2 text-gray-300">
                                {cand.expirationDate}{' '}
                                <span className="text-[10px] text-gray-500">({cand.dte}d)</span>
                              </td>
                              <td className="py-3 px-2 text-right font-bold text-white">
                                R$ {cand.strike.toFixed(2)}
                              </td>
                              <td className="py-3 px-2 text-right text-emerald-400">
                                {cand.depthPercent.toFixed(1)}% ITM
                              </td>
                              <td className="py-3 px-2 text-right">
                                {cand.marketPrice !== null ? (
                                  <span className="font-bold text-white">R$ {cand.marketPrice.toFixed(2)}</span>
                                ) : (
                                  <span className="text-gray-500 italic">Sem negócio</span>
                                )}
                              </td>
                              <td className="py-3 px-2 text-right font-bold text-emerald-400">
                                R$ {cand.fairValue.toFixed(2)}
                              </td>
                              <td className="py-3 px-2 text-right text-gray-300">
                                R$ {cand.ceilingPrice.toFixed(2)}
                              </td>
                              <td className="py-3 px-2 text-right text-gray-400 text-[11px]">
                                <span className="text-white">VI {cand.intrinsicValue.toFixed(2)}</span> +{' '}
                                <span className={vePerc <= 1.5 ? 'text-emerald-400' : 'text-amber-400'}>
                                  VE {cand.realExtrinsicValue !== null ? cand.realExtrinsicValue.toFixed(2) : cand.theoreticalExtrinsicValue.toFixed(2)}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-right">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    vePerc <= 1.5
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : vePerc <= 3.0
                                      ? 'bg-amber-500/20 text-amber-300'
                                      : 'bg-rose-500/20 text-rose-300'
                                  }`}
                                >
                                  {vePerc.toFixed(1)}%
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                {cand.openInterest !== null && cand.openInterest > 0 ? (
                                  <span className="text-white font-bold">
                                    {cand.openInterest.toLocaleString('pt-BR')}
                                  </span>
                                ) : (
                                  <span className="text-gray-500">0</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                    cand.quality === 'EXCELENTE'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : cand.quality === 'BOA'
                                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                      : 'bg-gray-800 text-gray-400 border border-gray-700'
                                  }`}
                                >
                                  {cand.quality === 'EXCELENTE' ? 'Excelente' : cand.quality === 'BOA' ? 'Boa' : 'Ilíquida'}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-right">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDitmCandidate(cand);
                                  }}
                                  className="text-gray-400 hover:text-emerald-400 transition"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* ESTRATÉGIA 2: VENDA COBERTA SINTÉTICA (POOR MAN'S COVERED CALL)           */}
          {/* ========================================================================= */}
          {activeStrategy === 'pmcc' && pmccData && (
            <>
              {/* O CICLO DE RENDA DA POOR MAN'S COVERED CALL */}
              <div className="bg-[#0e1422] border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-mono font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                    <Coins className="w-4 h-4" /> Mecânica Lee Lowell: Venda Coberta Sintética (Renda Mensal com DITM)
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono font-bold">
                    Perna Curta: {pmccData.shortExpiration}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-gray-900/70 border border-gray-800/80 space-y-1">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[11px]">1</span>
                      Colateral Sintético (DITM)
                    </span>
                    <p className="text-gray-400 leading-relaxed">
                      Em vez de gastar R$ {((spotPrice * 1000) / 1000).toFixed(0)}k comprando 1.000 ações, você compra a Call DITM longa pagando ~35% do valor.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-900/70 border border-gray-800/80 space-y-1">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[11px]">2</span>
                      Venda OTM Todo Mês
                    </span>
                    <p className="text-gray-400 leading-relaxed">
                      Vende a Call curta OTM (~30 dias, Delta ~0.25). O dinheiro do prêmio entra líquido na sua conta imediatamente.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-900/70 border border-gray-800/80 space-y-1">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[11px]">3</span>
                      Amortização Progressiva
                    </span>
                    <p className="text-gray-400 leading-relaxed">
                      Cada prêmio mensal recebido reduz o custo da sua call longa. Em 3 a 5 rolagens, a estrutura se paga 100%.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-900/70 border border-gray-800/80 space-y-1">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px]">4</span>
                      Regra de Lucro no Exercício
                    </span>
                    <p className="text-gray-400 leading-relaxed">
                      O spread (Strike Curto menos Strike Longo) é maior que o débito. Se o papel explodir, você encerra com lucro máximo!
                    </p>
                  </div>
                </div>
              </div>

              {/* SIMULADOR DE RENDA PMCC */}
              {selectedPmccCandidate && (
                <div className="bg-gradient-to-br from-[#0e1422] to-[#0f1d33] border border-blue-500/30 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">
                        Simulador de Renda Mensal PMCC
                      </span>
                      <h3 className="text-lg font-bold text-white">
                        Par Selecionado: {selectedPmccCandidate.longLeg.symbol} (Longa DITM) + {selectedPmccCandidate.shortLeg.symbol} (Curta OTM)
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-gray-400">Quantidade:</span>
                      {[100, 500, 1000, 5000].map((qty) => (
                        <button
                          key={qty}
                          onClick={() => setSimulationLots(qty)}
                          className={`px-2.5 py-1 rounded-lg font-bold transition ${
                            simulationLots === qty
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {qty.toLocaleString('pt-BR')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(() => {
                    const longCost = selectedPmccCandidate.longLeg.effectivePrice * simulationLots;
                    const shortIncome = selectedPmccCandidate.shortLeg.effectivePrice * simulationLots;
                    const netCapitalInvested = selectedPmccCandidate.netDebit * simulationLots;
                    const stockTraditionalCost = spotPrice * simulationLots;
                    const capitalSavedToCDI = stockTraditionalCost - netCapitalInvested;
                    const maxProfit = selectedPmccCandidate.maxProfitIfExercised * (simulationLots / 100);

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
                        <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-800 space-y-1">
                          <span className="text-[11px] text-gray-400 block">Capital Líquido Imobilizado</span>
                          <span className="text-xl font-bold text-white block">
                            R$ {netCapitalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[11px] text-gray-400 block">
                            Vs R$ {stockTraditionalCost.toLocaleString('pt-BR', { minimumFractionDigits: 0 })} na coberta tradicional
                          </span>
                        </div>

                        <div className="bg-gray-900/80 p-4 rounded-xl border border-blue-500/30 space-y-1">
                          <span className="text-[11px] text-blue-400 block">Renda Imediata no Bolso</span>
                          <span className="text-xl font-bold text-blue-400 block">
                            +R$ {shortIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[11px] text-emerald-400 font-bold block">
                            Taxa de {selectedPmccCandidate.monthlyYieldPercent.toFixed(1)}% a.m. sobre o capital
                          </span>
                        </div>

                        <div className="bg-gray-900/80 p-4 rounded-xl border border-emerald-500/30 space-y-1">
                          <span className="text-[11px] text-emerald-400 block">Lucro Máximo (Se Exercido)</span>
                          <span className="text-xl font-bold text-emerald-400 block">
                            +R$ {maxProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[11px] text-gray-400 block">
                            Retorno de +{selectedPmccCandidate.maxReturnPercent.toFixed(1)}% na alta
                          </span>
                        </div>

                        <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-800 space-y-1">
                          <span className="text-[11px] text-teal-400 block">Ciclo de Amortização</span>
                          <span className="text-xl font-bold text-teal-300 block">
                            ~{selectedPmccCandidate.monthsToFullAmortization} rolagens
                          </span>
                          <span className="text-[11px] text-gray-400 block">
                            {selectedPmccCandidate.isLowellSafe ? '🟢 100% Segura no Exercício' : '🔴 Cuidado c/ Spread'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TABELA DE ESTRUTURAS PMCC CASADAS */}
              <div className="bg-[#0e1422] border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Repeat className="w-4 h-4 text-blue-400" />
                      Pares Casados de Venda Coberta Sintética (B3)
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {pmccData.candidates.length} estruturas casadas combinando Calls DITM longas com a venda curta da série {pmccData.shortExpiration}.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Seletor de Ordenação */}
                    <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded-xl px-2.5 py-1.5 text-xs font-mono">
                      <span className="text-gray-500 text-[11px]">Ordenar:</span>
                      <select
                        value={pmccSortBy}
                        onChange={(e) => setPmccSortBy(e.target.value as any)}
                        className="bg-transparent text-white focus:outline-none cursor-pointer"
                      >
                        <option value="score" className="bg-gray-900 text-white">Score Lowell (Recomendado)</option>
                        <option value="yield" className="bg-gray-900 text-white">Maior Yield Mensal</option>
                        <option value="profit" className="bg-gray-900 text-white">Maior Lucro no Exercício</option>
                        <option value="amortization" className="bg-gray-900 text-white">Menor Tempo Amortização</option>
                      </select>
                    </div>

                    {/* Botão de Legenda / Critérios do Score */}
                    <button
                      type="button"
                      onClick={() => setShowScoreExplanation((prev) => !prev)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                        showScoreExplanation
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-sm'
                          : 'bg-gray-900 text-gray-300 hover:text-white border-gray-800'
                      }`}
                    >
                      <Info className="w-3.5 h-3.5 text-blue-400" />
                      {showScoreExplanation ? 'Ocultar Critérios' : 'Critérios do Score'}
                    </button>
                  </div>
                </div>

                {/* PAINEL EXPLICATIVO DO SCORE COMPOSTO (RETRÁTIL E DISCRETO) */}
                {showScoreExplanation && (
                  <div className="p-4 rounded-xl bg-gradient-to-br from-gray-900 to-[#0e172a] border border-blue-500/30 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded-lg bg-blue-500/20 text-blue-400">
                          <SlidersHorizontal className="w-4 h-4" />
                        </span>
                        <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                          Como funciona o Score Composto de Lee Lowell (0 a 100 pontos)
                        </h4>
                      </div>
                      <span className="text-[11px] text-gray-400 font-mono">
                        Ponderação determinística sobre dados reais
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-gray-950/60 border border-gray-800/80 space-y-1">
                        <div className="flex items-center justify-between text-emerald-400 font-bold font-mono">
                          <span>1. Yield Mensal</span>
                          <span>Até 30 pts</span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-snug">
                          Sweet spot entre <strong>3,0% e 6,0% a.m.</strong> (30 pts). Penaliza taxas muito baixas (&lt; 1,5%) e taxas excessivas (&gt; 8,5%) coladas no dinheiro.
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-gray-950/60 border border-gray-800/80 space-y-1">
                        <div className="flex items-center justify-between text-blue-400 font-bold font-mono">
                          <span>2. Margem de Segurança</span>
                          <span>Até 30 pts</span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-snug">
                          Razão Margem / Débito. Pontuação máxima se a margem for &ge; 20% do débito. Se violar a Regra de Lowell (prejuízo na alta), nota 0.
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-gray-950/60 border border-gray-800/80 space-y-1">
                        <div className="flex items-center justify-between text-purple-400 font-bold font-mono">
                          <span>3. Probabilidade (POP)</span>
                          <span>Até 25 pts</span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-snug">
                          Delta da perna vendida entre 0.18 e 0.35 (POP de 65% a 82%). Garante probabilidade estatística favorável de virar pó.
                        </p>
                      </div>

                      <div className="p-3 rounded-lg bg-gray-950/60 border border-gray-800/80 space-y-1">
                        <div className="flex items-center justify-between text-amber-400 font-bold font-mono">
                          <span>4. Liquidez Real B3</span>
                          <span>Até 15 pts</span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-snug">
                          Negócios reais no dia em ambas as pontas (8 pts) e contratos em aberto combinados (&ge; 25k contratos ganha 7 pts).
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {pmccData.candidates.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-gray-800 rounded-xl text-gray-400">
                    <p>Nenhuma estrutura atendeu aos critérios de liquidez e segurança da Venda Coberta Sintética para este ativo.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-400 text-[11px] uppercase">
                          <th className="py-3 px-3">Perna Longa (DITM)</th>
                          <th className="py-3 px-2">Perna Curta (OTM)</th>
                          <th className="py-3 px-2 text-center text-emerald-400">Score Lowell</th>
                          <th className="py-3 px-2 text-right">Débito Líquido</th>
                          <th className="py-3 px-2 text-right text-blue-400">Renda Imediata</th>
                          <th className="py-3 px-2 text-right text-emerald-400">Yield Mensal</th>
                          <th className="py-3 px-2 text-right">Margem Segurança</th>
                          <th className="py-3 px-2 text-right">Lucro Máx (Alta)</th>
                          <th className="py-3 px-2 text-right">Amortização</th>
                          <th className="py-3 px-3 text-center">Regra Lowell</th>
                          <th className="py-3 px-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/60">
                        {sortedPmccCandidates.slice(0, 25).map((cand) => {
                          const isSelected = selectedPmccCandidate?.id === cand.id;

                          return (
                            <tr
                              key={cand.id}
                              onClick={() => setSelectedPmccCandidate(cand)}
                              className={`hover:bg-gray-800/40 cursor-pointer transition ${
                                isSelected ? 'bg-blue-500/10 border-l-4 border-l-blue-500' : ''
                              }`}
                            >
                              <td className="py-3 px-3">
                                <span className="font-bold text-white block">{cand.longLeg.symbol}</span>
                                <span className="text-[10px] text-gray-400 block">
                                  K R$ {cand.longLeg.strike.toFixed(2)} · {cand.longLeg.expirationDate}
                                </span>
                              </td>

                              <td className="py-3 px-2">
                                <span className="font-bold text-white block">{cand.shortLeg.symbol}</span>
                                <span className="text-[10px] text-blue-400 block">
                                  K R$ {cand.shortLeg.strike.toFixed(2)} (+{cand.shortLeg.otmDistancePercent}%)
                                </span>
                              </td>

                              <td className="py-3 px-2 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-bold border inline-block ${
                                    cand.compositeScore >= 80
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                      : cand.compositeScore >= 65
                                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                      : cand.compositeScore >= 50
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                  }`}
                                  title={`Yield: ${cand.scoreBreakdown.yieldScore} | Margem: ${cand.scoreBreakdown.safetyScore} | POP: ${cand.scoreBreakdown.popScore} | Liquidez: ${cand.scoreBreakdown.liquidityScore}`}
                                >
                                  {cand.compositeScore}/100
                                </span>
                              </td>

                              <td className="py-3 px-2 text-right font-bold text-white">
                                R$ {cand.netDebit.toFixed(2)}
                              </td>

                              <td className="py-3 px-2 text-right font-bold text-blue-400">
                                R$ {cand.shortLeg.effectivePrice.toFixed(2)}
                              </td>

                              <td className="py-3 px-2 text-right font-bold text-emerald-400">
                                {cand.monthlyYieldPercent.toFixed(1)}% a.m.
                              </td>

                              <td className="py-3 px-2 text-right text-gray-300">
                                +R$ {cand.safetyMargin.toFixed(2)}
                              </td>

                              <td className="py-3 px-2 text-right text-emerald-300">
                                +R$ {cand.maxProfitIfExercised.toFixed(0)} <span className="text-[10px] text-gray-500">({cand.maxReturnPercent.toFixed(0)}%)</span>
                              </td>

                              <td className="py-3 px-2 text-right text-teal-300">
                                ~{cand.monthsToFullAmortization} meses
                              </td>

                              <td className="py-3 px-3 text-center">
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                    cand.isLowellSafe
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  }`}
                                >
                                  {cand.isLowellSafe ? 'Segura' : 'Arriscada'}
                                </span>
                              </td>

                              <td className="py-3 px-2 text-right">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPmccCandidate(cand);
                                  }}
                                  className="text-gray-400 hover:text-blue-400 transition"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ========================================================================= */}
          {/* ESTRATÉGIA 3: VENDA DE PUT OTM (CASH-SECURED PUT / COMPRA COM DESCONTO)   */}
          {/* ========================================================================= */}
          {activeStrategy === 'put' && cashSecuredPutData && (
            <>
              {/* O CICLO GANHA-GANHA DA CASH-SECURED PUT */}
              <div className="bg-[#0e1422] border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" /> Mecânica Lee Lowell: Venda de Put Garantida por Caixa
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
                    Vencimento Mensal: {cashSecuredPutData.expirationDate}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-gray-900/70 border border-gray-800/80 space-y-1">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[11px]">1</span>
                      Empresa de Valor
                    </span>
                    <p className="text-gray-400 leading-relaxed">
                      Venda Puts exclusivamente de empresas de alta qualidade que você gostaria de ser sócio no longo prazo.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-900/70 border border-gray-800/80 space-y-1">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[11px]">2</span>
                      Escolha do Strike OTM
                    </span>
                    <p className="text-gray-400 leading-relaxed">
                      Selecione um strike 3% a 10% abaixo do mercado atual. Você define a que preço aceita comprar a ação.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-900/70 border border-gray-800/80 space-y-1">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[11px]">3</span>
                      Garantia no CDI
                    </span>
                    <p className="text-gray-400 leading-relaxed">
                      Mantenha o dinheiro em Tesouro Selic ou CDB de liquidez diária rendendo ~14% a.a. enquanto serve de margem garantida.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-900/70 border border-gray-800/80 space-y-1">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px]">4</span>
                      Duplo Desfecho Positivo
                    </span>
                    <p className="text-gray-400 leading-relaxed">
                      Se o papel subir ou andar de lado, a Put vira pó (lucro de 100%). Se cair, você compra as ações com desconto real!
                    </p>
                  </div>
                </div>
              </div>

              {/* SIMULADOR DE CAPITAL E RENDA IMEDIATA */}
              {selectedPutCandidate && (
                <div className="bg-gradient-to-br from-[#0e1422] to-[#1f190e] border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                        Simulador de Renda e Compra com Desconto
                      </span>
                      <h3 className="text-lg font-bold text-white">
                        Opção Selecionada: {selectedPutCandidate.symbol} (Strike R$ {selectedPutCandidate.strike.toFixed(2)})
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-gray-400">Capital em Garantia:</span>
                      {[10000, 20000, 50000, 100000].map((cap) => (
                        <button
                          key={cap}
                          onClick={() => setPutSimulationCapital(cap)}
                          className={`px-3 py-1.5 rounded-lg font-bold transition ${
                            putSimulationCapital === cap
                              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          R$ {(cap / 1000).toFixed(0)}k
                        </button>
                      ))}
                    </div>
                  </div>

                  {(() => {
                    const price = selectedPutCandidate.effectivePrice;
                    const strike = selectedPutCandidate.strike;
                    const contractCost = strike * 100;
                    const numLots = Math.max(100, Math.floor(putSimulationCapital / contractCost) * 100);
                    const totalGuaranteedCapital = numLots * strike;
                    const totalIncome = numLots * price;
                    const monthlyYield = (price / strike) * 100;
                    const effectivePrice = selectedPutCandidate.effectivePurchasePrice;
                    const totalSavingsVsSpot = (spotPrice - effectivePrice) * numLots;

                    return (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="p-3.5 rounded-xl bg-gray-900/80 border border-gray-800 space-y-1">
                            <span className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
                              <Wallet className="w-3.5 h-3.5 text-amber-400" /> Contratos Garantidos
                            </span>
                            <div className="text-lg font-bold text-white font-mono">
                              {numLots.toLocaleString('pt-BR')} <span className="text-xs text-gray-500">cotas</span>
                            </div>
                            <span className="text-[10px] text-gray-400">
                              Garantia: R$ {totalGuaranteedCapital.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="p-3.5 rounded-xl bg-gray-900/80 border border-gray-800 space-y-1">
                            <span className="text-[11px] text-amber-400 font-mono font-bold flex items-center gap-1">
                              <DollarSign className="w-3.5 h-3.5" /> Renda Imediata Recebida
                            </span>
                            <div className="text-lg font-bold text-amber-400 font-mono">
                              +R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <span className="text-[10px] text-gray-400">
                              Creditado hoje na conta
                            </span>
                          </div>

                          <div className="p-3.5 rounded-xl bg-gray-900/80 border border-gray-800 space-y-1">
                            <span className="text-[11px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                              <Percent className="w-3.5 h-3.5" /> Rendimento no Mês
                            </span>
                            <div className="text-lg font-bold text-emerald-400 font-mono">
                              {monthlyYield.toFixed(2)}% <span className="text-xs text-gray-400 font-normal">a.m.</span>
                            </div>
                            <span className="text-[10px] text-gray-400">
                              Equiv. ~{selectedPutCandidate.annualizedYield.toFixed(1)}% a.a.
                            </span>
                          </div>

                          <div className="p-3.5 rounded-xl bg-gray-900/80 border border-gray-800 space-y-1">
                            <span className="text-[11px] text-blue-400 font-mono font-bold flex items-center gap-1">
                              <TrendingDown className="w-3.5 h-3.5" /> Preço Efetivo de Compra
                            </span>
                            <div className="text-lg font-bold text-blue-400 font-mono">
                              R$ {effectivePrice.toFixed(2)}
                            </div>
                            <span className="text-[10px] text-blue-300">
                              {selectedPutCandidate.realDiscountPercent.toFixed(1)}% de desconto vs Spot
                            </span>
                          </div>
                        </div>

                        {/* Comparativo dos 2 Desfechos */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4" /> Cenário 1: Ação &gt;= R$ {strike.toFixed(2)} no Vencimento
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                                Prob: ~{selectedPutCandidate.pop.toFixed(0)}%
                              </span>
                            </div>
                            <p className="text-xs text-gray-300 leading-relaxed">
                              A opção {selectedPutCandidate.symbol} vira pó (R$ 0,00). Você embolsa integralmente os{' '}
                              <strong className="text-emerald-400">
                                R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </strong>{' '}
                              sem comprar nenhuma ação. Seu caixa em garantia rendeu 100% do CDI no período.
                            </p>
                          </div>

                          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono font-bold text-blue-400 uppercase flex items-center gap-1.5">
                                <Coins className="w-4 h-4" /> Cenário 2: Ação &lt; R$ {strike.toFixed(2)} (Exercício)
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono font-bold">
                                Desconto de {selectedPutCandidate.realDiscountPercent.toFixed(1)}%
                              </span>
                            </div>
                            <p className="text-xs text-gray-300 leading-relaxed">
                              Você utiliza o capital reservado para comprar {numLots.toLocaleString('pt-BR')} ações por{' '}
                              <strong className="text-blue-400">R$ {effectivePrice.toFixed(2)}</strong> cada (Strike R$ {strike.toFixed(2)} menos o prêmio de R$ {price.toFixed(2)}).
                              Economia real de <strong className="text-emerald-400">R$ {totalSavingsVsSpot.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> comparado a comprar as ações a mercado hoje.
                            </p>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* TABELA DE OPORTUNIDADES EM PUTS OTM */}
              <div className="bg-[#0e1422] border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <TrendingDown className="w-5 h-5 text-amber-400" /> Oportunidades de Venda de Put OTM (Vencimento {cashSecuredPutData.expirationDate})
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Puts fora do dinheiro (OTM) com dados reais da B3, desconto sobre o spot e rendimento mensal sobre a garantia.
                    </p>
                  </div>
                  <div className="text-xs font-mono text-gray-400">
                    Total analisadas: <span className="text-white font-bold">{cashSecuredPutData.totalPutsAnalyzed}</span> Puts
                  </div>
                </div>

                {cashSecuredPutData.candidates.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-gray-800 rounded-xl text-gray-400">
                    <p>Nenhuma Put OTM elegível encontrada para {symbol} neste vencimento.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-400 text-[11px] uppercase">
                          <th className="py-3 px-3">Série (PUT)</th>
                          <th className="py-3 px-2">Vencimento</th>
                          <th className="py-3 px-2 text-right">Strike</th>
                          <th className="py-3 px-2 text-right">Distância OTM</th>
                          <th className="py-3 px-2 text-right">Prêmio Put</th>
                          <th className="py-3 px-2 text-right text-blue-400">Preço Efetivo</th>
                          <th className="py-3 px-2 text-right text-emerald-400">Desconto Real</th>
                          <th className="py-3 px-2 text-right text-amber-400">Taxa Mensal</th>
                          <th className="py-3 px-2 text-right">Yield Anual</th>
                          <th className="py-3 px-3 text-right">Contratos Abertos</th>
                          <th className="py-3 px-2 text-center">Prob. Pó (POP)</th>
                          <th className="py-3 px-3 text-center">Qualidade</th>
                          <th className="py-3 px-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/60">
                        {cashSecuredPutData.candidates.map((cand) => {
                          const isSelected = selectedPutCandidate?.symbol === cand.symbol;

                          return (
                            <tr
                              key={cand.symbol}
                              onClick={() => setSelectedPutCandidate(cand)}
                              className={`hover:bg-gray-800/40 cursor-pointer transition ${
                                isSelected ? 'bg-amber-500/10 border-l-4 border-l-amber-500' : ''
                              }`}
                            >
                              <td className="py-3 px-3 font-bold text-white flex items-center gap-1.5">
                                {cand.symbol}
                                {cand.quality === 'EXCELENTE' && (
                                  <span className="w-2 h-2 rounded-full bg-emerald-400" title="Alta liquidez e excelente taxa de retorno" />
                                )}
                              </td>

                              <td className="py-3 px-2 text-gray-300">
                                {cand.expirationDate}{' '}
                                <span className="text-[10px] text-gray-500">({cand.dte}d)</span>
                              </td>

                              <td className="py-3 px-2 text-right font-bold text-white">
                                R$ {cand.strike.toFixed(2)}
                              </td>

                              <td className="py-3 px-2 text-right text-gray-400">
                                -{cand.otmDistancePercent.toFixed(1)}% OTM
                              </td>

                              <td className="py-3 px-2 text-right">
                                {cand.marketPrice !== null ? (
                                  <span className="font-bold text-white">R$ {cand.marketPrice.toFixed(2)}</span>
                                ) : (
                                  <span className="text-gray-500 italic" title="Sem fechamento hoje. Valor teórico Black-Scholes.">
                                    ~R$ {cand.theoreticalPrice.toFixed(2)}*
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-2 text-right font-bold text-blue-400">
                                R$ {cand.effectivePurchasePrice.toFixed(2)}
                              </td>

                              <td className="py-3 px-2 text-right font-bold text-emerald-400">
                                -{cand.realDiscountPercent.toFixed(1)}%
                              </td>

                              <td className="py-3 px-2 text-right font-bold text-amber-400">
                                {cand.cashSecuredMonthlyYield.toFixed(2)}%
                              </td>

                              <td className="py-3 px-2 text-right text-gray-300">
                                ~{cand.annualizedYield.toFixed(1)}%
                              </td>

                              <td className="py-3 px-3 text-right">
                                {cand.openInterest !== null && cand.openInterest > 0 ? (
                                  <span className="text-white font-bold">
                                    {cand.openInterest.toLocaleString('pt-BR')}
                                  </span>
                                ) : (
                                  <span className="text-gray-500">0</span>
                                )}
                              </td>

                              <td className="py-3 px-2 text-center font-mono">
                                <span className="text-emerald-400 font-bold">{cand.pop.toFixed(0)}%</span>
                              </td>

                              <td className="py-3 px-3 text-center">
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                    cand.quality === 'EXCELENTE'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : cand.quality === 'BOA'
                                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  }`}
                                >
                                  {cand.quality === 'EXCELENTE' ? 'Excelente' : cand.quality === 'BOA' ? 'Boa' : 'Atenção'}
                                </span>
                              </td>

                              <td className="py-3 px-2 text-right">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPutCandidate(cand);
                                  }}
                                  className="text-gray-400 hover:text-amber-400 transition"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
