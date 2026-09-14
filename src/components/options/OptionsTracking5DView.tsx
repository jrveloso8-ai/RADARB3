'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Search,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  BarChart2,
  Shield,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Info,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { OITrackingResult, BarrierTrackingItem, OITrackingCandle } from '@/lib/types/financial';
import { safeFetchJson } from '@/lib/utils/api-client';

interface OptionsTracking5DViewProps {
  initialSymbol?: string;
  onSelectSymbol?: (sym: string) => void;
}

export const OptionsTracking5DView: React.FC<OptionsTracking5DViewProps> = ({
  initialSymbol = 'PETR4',
}) => {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [searchInput, setSearchInput] = useState(initialSymbol);
  const [selectedExpiration, setSelectedExpiration] = useState<string>('');
  const [data, setData] = useState<OITrackingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOnly2Sigma, setFilterOnly2Sigma] = useState(false);
  const [sortOrder, setSortOrder] = useState<'5D_ASC' | '5D_DESC' | '1D_ASC' | '1D_DESC' | 'OI_DESC' | 'STRIKE_ASC'>('5D_ASC');
  const [hoveredCandle, setHoveredCandle] = useState<OITrackingCandle | null>(null);
  const [showAllRows, setShowAllRows] = useState(false);
  const [heatmapFilter, setHeatmapFilter] = useState<'ALL' | 'CALL' | 'PUT'>('ALL');

  const popularAssets = ['PETR4', 'VALE3', 'BOVA11', 'BBAS3', 'ITUB4', 'BBDC4', 'SBSP3'];

  const fetchData = async (ticker: string, expiration?: string) => {
    setLoading(true);
    setError(null);

    const expParam = expiration ? `&expiration=${encodeURIComponent(expiration)}` : '';
    const { ok, data: resData, error: resError } = await safeFetchJson<OITrackingResult>(
      `/api/options/tracking-5d?symbol=${encodeURIComponent(ticker)}${expParam}`
    );

    if (ok && resData) {
      setData(resData);
      setSymbol(ticker);
      setSelectedExpiration(resData.selectedExpiration || '');
    } else {
      setData(null);
      setError(resError || 'Não foi possível carregar o rastreamento de Open Interest.');
    }

    setLoading(false);
  };

  useEffect(() => {
    if (initialSymbol) {
      setSymbol(initialSymbol);
      setSearchInput(initialSymbol);
      fetchData(initialSymbol);
    }
  }, [initialSymbol]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      fetchData(searchInput.trim().toUpperCase(), selectedExpiration);
    }
  };

  const handleExpirationSelect = (expDate: string) => {
    setSelectedExpiration(expDate);
    fetchData(symbol, expDate);
  };

  // Filtragem e ordenação da tabela
  const displayedRows = useMemo(() => {
    if (!data?.strikesTable) return [];
    let rows = [...data.strikesTable];

    if (filterOnly2Sigma) {
      rows = rows.filter((r) => r.isWithin2Sigma);
    }

    rows.sort((a, b) => {
      if (sortOrder === '5D_ASC') {
        const valA = a.change5DPercent ?? -9999;
        const valB = b.change5DPercent ?? -9999;
        return valA - valB;
      }
      if (sortOrder === '5D_DESC') {
        const valA = a.change5DPercent ?? -9999;
        const valB = b.change5DPercent ?? -9999;
        return valB - valA;
      }
      if (sortOrder === '1D_ASC') {
        const valA = a.change1DPercent ?? -9999;
        const valB = b.change1DPercent ?? -9999;
        return valA - valB;
      }
      if (sortOrder === '1D_DESC') {
        const valA = a.change1DPercent ?? -9999;
        const valB = b.change1DPercent ?? -9999;
        return valB - valA;
      }
      if (sortOrder === 'OI_DESC') {
        return b.currentOI - a.currentOI;
      }
      if (sortOrder === 'STRIKE_ASC') {
        return a.strike - b.strike;
      }
      return 0;
    });

    return rows;
  }, [data?.strikesTable, filterOnly2Sigma, sortOrder]);

  // Função para estilo térmico de cor
  const getThermalStyle = (pct: number | null) => {
    if (pct === null) {
      return 'bg-gray-800/40 text-gray-500 border border-gray-700/30';
    }
    if (pct <= -10) {
      return 'bg-red-500/25 text-red-300 font-bold border border-red-500/40 shadow-sm';
    }
    if (pct < -2) {
      return 'bg-red-500/15 text-red-400 border border-red-500/30';
    }
    if (pct >= -2 && pct <= 2) {
      return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
    }
    if (pct > 2 && pct < 10) {
      return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
    }
    return 'bg-emerald-500/25 text-emerald-200 font-bold border border-emerald-500/40 shadow-sm';
  };

  // Preparação de dados para o gráfico de candlestick
  const candles = data?.candles || [];
  const chartHeight = 340;
  const chartWidth = 900;
  const padding = { top: 25, right: 140, bottom: 35, left: 20 };

  const { minPrice, maxPrice, priceToY, candleWidth } = useMemo(() => {
    if (!candles || candles.length === 0) {
      return { minPrice: 0, maxPrice: 1, priceToY: () => 0, candleWidth: 10 };
    }

    const prices = candles.flatMap((c) => [c.low, c.high]);
    if (data?.spotBands) {
      prices.push(data.spotBands.lowerBand2Sigma, data.spotBands.upperBand2Sigma);
    }
    if (data?.topCallOverall) prices.push(data.topCallOverall.strike);
    if (data?.topCallWithin2Sigma) prices.push(data.topCallWithin2Sigma.strike);
    if (data?.topPutOverall) prices.push(data.topPutOverall.strike);
    if (data?.topPutWithin2Sigma) prices.push(data.topPutWithin2Sigma.strike);

    const min = Math.min(...prices) * 0.985;
    const max = Math.max(...prices) * 1.015;
    const range = max - min || 1;

    const usableHeight = chartHeight - padding.top - padding.bottom;
    const pToY = (price: number) => {
      const clamped = Math.max(min, Math.min(max, price));
      return padding.top + (1 - (clamped - min) / range) * usableHeight;
    };

    const usableWidth = chartWidth - padding.left - padding.right;
    const cWidth = Math.max(3, Math.min(16, usableWidth / candles.length - 2));

    return { minPrice: min, maxPrice: max, priceToY: pToY, candleWidth: cWidth };
  }, [candles, data, chartHeight, chartWidth, padding.top, padding.bottom, padding.left, padding.right]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Barra de Busca e Seletor de Vencimentos */}
      <div className="bg-[#0b101b] border border-gray-800/90 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-md w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                placeholder="Ex: PETR4, VALE3, BOVA11..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-900/90 border border-gray-700/80 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Buscar</span>
            </button>
          </form>

          {/* Atalhos Rápidos */}
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <span className="text-gray-500 text-[11px] font-mono mr-1">Ativos:</span>
            {popularAssets.map((sym) => (
              <button
                key={sym}
                onClick={() => {
                  setSearchInput(sym);
                  fetchData(sym, selectedExpiration);
                }}
                className={`px-2 py-1 rounded-lg font-mono text-xs border transition ${
                  symbol === sym
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-gray-900/80 text-gray-400 border-gray-800 hover:text-white'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>

        {/* Grade de Vencimentos da B3 (Exclusivamente Mensais) */}
        {data?.availableExpirations && data.availableExpirations.length > 0 && (
          <div className="pt-3 border-t border-gray-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400 font-mono uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                Vencimentos Oficiais B3 (3ª Sexta-Feira):
              </span>
              <span className="text-[10px] text-emerald-400/90 font-mono bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                100% Mensais • Séries semanais/diárias expurgadas
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {data.availableExpirations.map((exp) => {
                const isSelected = data.selectedExpiration === exp.date;
                return (
                  <button
                    key={exp.date}
                    type="button"
                    onClick={() => handleExpirationSelect(exp.date)}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs transition-all border ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/10 font-bold'
                        : 'bg-gray-900/60 text-gray-400 border-gray-800 hover:text-gray-200 hover:border-gray-700'
                    }`}
                  >
                    <span>{exp.label}</span>
                    <span className="ml-1.5 text-[9px] px-1.5 py-0.2 rounded bg-gray-800 text-gray-300">
                      Mensal
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-400 space-y-3">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-emerald-400" />
          <p className="font-mono text-sm">Carregando dados de contratos em aberto da B3...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-950/20 border border-red-500/30 rounded-2xl text-red-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : !data ? null : (
        <>
          {/* Alerta de Janela de Rolagem (DTE <= 5) */}
          {data.isRolloverPeriod && (
            <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-300 text-xs font-mono flex items-center justify-between gap-3 shadow-md animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-4 h-4 text-amber-400 shrink-0 animate-spin" />
                <div>
                  <strong className="block text-amber-200">
                    Período de Rolagem da B3 Ativo ({data.selectedDte} Dias Úteis restantes):
                  </strong>
                  <span className="text-amber-400/90 text-[11px]">
                    As posições desta série estão em fase de encerramento e migração. Recomendamos monitorar também a próxima série mensal para identificar a montagem das novas barreiras institucionais.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 2. Faixa Estatística Spot (200 Períodos) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#0b101b] border border-gray-800">
              <span className="text-[10px] text-gray-400 font-mono block">Preço Spot</span>
              <span className="text-lg font-bold text-white font-mono">
                R$ {data.spotBands.spotPrice.toFixed(2)}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0b101b] border border-gray-800">
              <span className="text-[10px] text-gray-400 font-mono block">Média 200P (μ)</span>
              <span className="text-lg font-bold text-cyan-400 font-mono">
                R$ {data.spotBands.mean200.toFixed(2)}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0b101b] border border-gray-800">
              <span className="text-[10px] text-gray-400 font-mono block">Desvio Padrão (σ)</span>
              <span className="text-lg font-bold text-purple-400 font-mono">
                R$ {data.spotBands.stdDev200.toFixed(2)}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0b101b] border border-gray-800">
              <span className="text-[10px] text-gray-400 font-mono block">Piso (-2σ)</span>
              <span className="text-lg font-bold text-amber-400 font-mono">
                R$ {data.spotBands.lowerBand2Sigma.toFixed(2)}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0b101b] border border-gray-800">
              <span className="text-[10px] text-gray-400 font-mono block">Teto (+2σ)</span>
              <span className="text-lg font-bold text-emerald-400 font-mono">
                R$ {data.spotBands.upperBand2Sigma.toFixed(2)}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0b101b] border border-gray-800">
              <span className="text-[10px] text-gray-400 font-mono block">Z-Score Spot</span>
              <span className="text-lg font-bold text-gray-200 font-mono">
                {data.spotBands.zScore !== null ? `${data.spotBands.zScore > 0 ? '+' : ''}${data.spotBands.zScore.toFixed(2)}σ` : 'N/D'}
              </span>
            </div>
          </div>

          {/* 3. Cards Comparativos: CALL e PUT (Geral vs Range 2σ) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card CALLs */}
            <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-[#0c121e] p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-gray-800/80 mb-4">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <TrendingUp className="w-5 h-5" />
                  <h3>MAIORES BARREIRAS DE CALL</h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                  Resistências de OI
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Maior Geral */}
                <div className="p-3 rounded-xl bg-gray-900/70 border border-gray-800">
                  <span className="text-[10px] text-gray-400 font-mono block mb-1">Maior Geral (B3)</span>
                  <div className="text-xl font-black text-white font-mono">
                    {data.topCallOverall ? `R$ ${data.topCallOverall.strike.toFixed(2)}` : 'N/D'}
                  </div>
                  <div className="text-[11px] text-gray-400 font-mono mt-1">
                    OI: <strong className="text-gray-200">{data.topCallOverall?.currentOI.toLocaleString('pt-BR') || 0}</strong>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${getThermalStyle(data.topCallOverall?.change5DPercent ?? null)}`}>
                      5D: {data.topCallOverall?.change5DPercent !== null && data.topCallOverall?.change5DPercent !== undefined
                        ? `${data.topCallOverall.change5DPercent > 0 ? '+' : ''}${data.topCallOverall.change5DPercent}%`
                        : 'N/D'}
                    </span>
                  </div>
                </div>

                {/* Maior no Range 2σ */}
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                  <span className="text-[10px] text-emerald-400 font-mono block mb-1">No Range 2σ (Relevante)</span>
                  <div className="text-xl font-black text-emerald-300 font-mono">
                    {data.topCallWithin2Sigma ? `R$ ${data.topCallWithin2Sigma.strike.toFixed(2)}` : 'N/D'}
                  </div>
                  <div className="text-[11px] text-gray-400 font-mono mt-1">
                    OI: <strong className="text-emerald-400">{data.topCallWithin2Sigma?.currentOI.toLocaleString('pt-BR') || 0}</strong>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${getThermalStyle(data.topCallWithin2Sigma?.change5DPercent ?? null)}`}>
                      5D: {data.topCallWithin2Sigma?.change5DPercent !== null && data.topCallWithin2Sigma?.change5DPercent !== undefined
                        ? `${data.topCallWithin2Sigma.change5DPercent > 0 ? '+' : ''}${data.topCallWithin2Sigma.change5DPercent}%`
                        : 'N/D'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Top 3 Variações de CALL (5 Dias) */}
              <div className="pt-3 border-t border-gray-800/80 mt-4 space-y-2">
                <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider font-semibold block">
                  Top Movimentações de CALL (5D):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                  {/* 3 Maiores Montagens */}
                  <div className="space-y-1 bg-gray-900/60 p-2.5 rounded-xl border border-gray-800/80">
                    <span className="text-emerald-400 font-bold block text-[10px] flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3" />
                      3 Maiores Montagens
                    </span>
                    {data.top3CallGains5D && data.top3CallGains5D.length > 0 ? (
                      data.top3CallGains5D.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-0.5 border-b border-gray-800/40 last:border-0">
                          <span className="text-white font-bold">R$ {item.strike.toFixed(2)}</span>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                            +{item.change5DPercent}%
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-gray-500 text-[10px]">Sem histórico suficiente</span>
                    )}
                  </div>

                  {/* 3 Maiores Desmontes */}
                  <div className="space-y-1 bg-gray-900/60 p-2.5 rounded-xl border border-gray-800/80">
                    <span className="text-red-400 font-bold block text-[10px] flex items-center gap-1">
                      <ArrowDownRight className="w-3 h-3" />
                      3 Maiores Desmontes
                    </span>
                    {data.top3CallLosses5D && data.top3CallLosses5D.length > 0 ? (
                      data.top3CallLosses5D.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-0.5 border-b border-gray-800/40 last:border-0">
                          <span className="text-white font-bold">R$ {item.strike.toFixed(2)}</span>
                          <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 font-bold">
                            {item.change5DPercent}%
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-gray-500 text-[10px]">Sem histórico suficiente</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Card PUTs */}
            <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-950/20 to-[#0c121e] p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-gray-800/80 mb-4">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <Shield className="w-5 h-5" />
                  <h3>MAIORES BARREIRAS DE PUT</h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                  Suportes de OI
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Maior Geral */}
                <div className="p-3 rounded-xl bg-gray-900/70 border border-gray-800">
                  <span className="text-[10px] text-gray-400 font-mono block mb-1">Maior Geral (B3)</span>
                  <div className="text-xl font-black text-white font-mono">
                    {data.topPutOverall ? `R$ ${data.topPutOverall.strike.toFixed(2)}` : 'N/D'}
                  </div>
                  <div className="text-[11px] text-gray-400 font-mono mt-1">
                    OI: <strong className="text-gray-200">{data.topPutOverall?.currentOI.toLocaleString('pt-BR') || 0}</strong>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${getThermalStyle(data.topPutOverall?.change5DPercent ?? null)}`}>
                      5D: {data.topPutOverall?.change5DPercent !== null && data.topPutOverall?.change5DPercent !== undefined
                        ? `${data.topPutOverall.change5DPercent > 0 ? '+' : ''}${data.topPutOverall.change5DPercent}%`
                        : 'N/D'}
                    </span>
                  </div>
                </div>

                {/* Maior no Range 2σ */}
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30">
                  <span className="text-[10px] text-amber-400 font-mono block mb-1">No Range 2σ (Relevante)</span>
                  <div className="text-xl font-black text-amber-300 font-mono">
                    {data.topPutWithin2Sigma ? `R$ ${data.topPutWithin2Sigma.strike.toFixed(2)}` : 'N/D'}
                  </div>
                  <div className="text-[11px] text-gray-400 font-mono mt-1">
                    OI: <strong className="text-amber-400">{data.topPutWithin2Sigma?.currentOI.toLocaleString('pt-BR') || 0}</strong>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${getThermalStyle(data.topPutWithin2Sigma?.change5DPercent ?? null)}`}>
                      5D: {data.topPutWithin2Sigma?.change5DPercent !== null && data.topPutWithin2Sigma?.change5DPercent !== undefined
                        ? `${data.topPutWithin2Sigma.change5DPercent > 0 ? '+' : ''}${data.topPutWithin2Sigma.change5DPercent}%`
                        : 'N/D'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Top 3 Variações de PUT (5 Dias) */}
              <div className="pt-3 border-t border-gray-800/80 mt-4 space-y-2">
                <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider font-semibold block">
                  Top Movimentações de PUT (5D):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                  {/* 3 Maiores Montagens */}
                  <div className="space-y-1 bg-gray-900/60 p-2.5 rounded-xl border border-gray-800/80">
                    <span className="text-emerald-400 font-bold block text-[10px] flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3" />
                      3 Maiores Montagens
                    </span>
                    {data.top3PutGains5D && data.top3PutGains5D.length > 0 ? (
                      data.top3PutGains5D.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-0.5 border-b border-gray-800/40 last:border-0">
                          <span className="text-white font-bold">R$ {item.strike.toFixed(2)}</span>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                            +{item.change5DPercent}%
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-gray-500 text-[10px]">Sem histórico suficiente</span>
                    )}
                  </div>

                  {/* 3 Maiores Desmontes */}
                  <div className="space-y-1 bg-gray-900/60 p-2.5 rounded-xl border border-gray-800/80">
                    <span className="text-red-400 font-bold block text-[10px] flex items-center gap-1">
                      <ArrowDownRight className="w-3 h-3" />
                      3 Maiores Desmontes
                    </span>
                    {data.top3PutLosses5D && data.top3PutLosses5D.length > 0 ? (
                      data.top3PutLosses5D.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-0.5 border-b border-gray-800/40 last:border-0">
                          <span className="text-white font-bold">R$ {item.strike.toFixed(2)}</span>
                          <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 font-bold">
                            {item.change5DPercent}%
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-gray-500 text-[10px]">Sem histórico suficiente</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Resumo Executivo: 3 Maiores e 3 Menores Movimentos Globais (5D) */}
          <div className="rounded-2xl border border-gray-800/90 bg-[#0b101b] p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  Destaques Globais de Fluxo na B3 (Últimos 5 Dias)
                </h3>
              </div>
              <span className="text-[11px] text-gray-400 font-mono">
                Extremos de Montagem e Desmonte de Contratos
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 3 Maiores Entradas Globais */}
              <div className="p-3.5 rounded-xl bg-[#090e18] border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <ArrowUpRight className="w-4 h-4" />
                    3 Maiores Entradas / Montagens Globais
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20">Fluxo Comprador</span>
                </div>
                <div className="space-y-1.5 pt-1">
                  {data.top3Gains5D && data.top3Gains5D.length > 0 ? (
                    data.top3Gains5D.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-gray-900/80 border border-gray-800 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              item.type === 'CALL'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {item.type}
                          </span>
                          <span className="text-white font-bold">R$ {item.strike.toFixed(2)}</span>
                          <span className="text-gray-400 text-[10px]">({item.symbol})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400 text-[10px]">
                            OI: <strong className="text-gray-200">{item.currentOI.toLocaleString('pt-BR')}</strong>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/25 text-emerald-300 font-bold border border-emerald-500/40">
                            +{item.change5DPercent}%
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="text-gray-500 text-xs font-mono">Sem dados comparativos suficientes</span>
                  )}
                </div>
              </div>

              {/* 3 Maiores Saídas Globais */}
              <div className="p-3.5 rounded-xl bg-[#090e18] border border-red-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-red-400">
                  <span className="flex items-center gap-1.5">
                    <ArrowDownRight className="w-4 h-4" />
                    3 Maiores Saídas / Desmontes Globais
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20">Desmonte / Rolagem</span>
                </div>
                <div className="space-y-1.5 pt-1">
                  {data.top3Losses5D && data.top3Losses5D.length > 0 ? (
                    data.top3Losses5D.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-gray-900/80 border border-gray-800 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              item.type === 'CALL'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {item.type}
                          </span>
                          <span className="text-white font-bold">R$ {item.strike.toFixed(2)}</span>
                          <span className="text-gray-400 text-[10px]">({item.symbol})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400 text-[10px]">
                            OI: <strong className="text-gray-200">{item.currentOI.toLocaleString('pt-BR')}</strong>
                          </span>
                          <span className="px-2 py-0.5 rounded bg-red-500/25 text-red-300 font-bold border border-red-500/40">
                            {item.change5DPercent}%
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="text-gray-500 text-xs font-mono">Sem dados comparativos suficientes</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 5. Mapa de Calor Visual de Variação de OI (Heatmap de Strikes) */}
          <div className="rounded-2xl border border-gray-800/90 bg-[#0b101b] p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Mapa de Calor Visual das Variações de OI (5 Dias)
                  </h3>
                  <p className="text-xs text-gray-400 font-mono">
                    Distribuição visual imediata de montagens e desmontes por strike • Linha ciano neon indica o Preço SPOT
                  </p>
                </div>
              </div>

              {/* Filtro do Heatmap: Todos / Apenas CALLs / Apenas PUTs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-900 border border-gray-800 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setHeatmapFilter('ALL')}
                  className={`px-3 py-1 rounded-lg transition ${
                    heatmapFilter === 'ALL'
                      ? 'bg-gray-800 text-white font-bold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Todos ({data.strikesTable.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHeatmapFilter('CALL')}
                  className={`px-3 py-1 rounded-lg transition ${
                    heatmapFilter === 'CALL'
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  CALLs ({data.strikesTable.filter((r) => r.type === 'CALL').length})
                </button>
                <button
                  type="button"
                  onClick={() => setHeatmapFilter('PUT')}
                  className={`px-3 py-1 rounded-lg transition ${
                    heatmapFilter === 'PUT'
                      ? 'bg-red-500/20 text-red-300 font-bold border border-red-500/30'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  PUTs ({data.strikesTable.filter((r) => r.type === 'PUT').length})
                </button>
              </div>
            </div>

            {/* Grid Térmico de Blocos com Linha Divisória de Preço SPOT */}
            {(() => {
              const filteredStrikes = data.strikesTable
                .filter((item) => (heatmapFilter === 'ALL' ? true : item.type === heatmapFilter))
                .sort((a, b) => a.strike - b.strike);
              const spotPrice = data.spotBands?.spotPrice ?? 0;
              const firstAboveSpotIndex = filteredStrikes.findIndex((item) => item.strike > spotPrice);

              const renderSpotLine = () => (
                <div
                  key="spot_price_divider_line"
                  className="col-span-full my-2.5 py-1.5 flex items-center gap-3 select-none"
                >
                  <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-cyan-500 to-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                  <div className="px-3.5 py-1 rounded-full bg-cyan-950/90 border border-cyan-400/80 text-cyan-300 font-mono text-[11px] font-bold shadow-[0_0_12px_rgba(34,211,238,0.3)] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span>
                      PREÇO SPOT: <strong className="text-white">R$ {spotPrice.toFixed(2)}</strong> (MERCADO À VISTA)
                    </span>
                    {data.spotBands && data.spotBands.zScore !== null && (
                      <>
                        <span className="text-cyan-400/60">•</span>
                        <span className="text-[10px] text-cyan-200">
                          Z-SCORE: {data.spotBands.zScore > 0 ? '+' : ''}{data.spotBands.zScore.toFixed(2)}σ
                        </span>
                      </>
                    )}
                  </div>
                  <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent via-cyan-500 to-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                </div>
              );

              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
                  {filteredStrikes.map((item, idx) => {
                    const pct = item.change5DPercent;
                    const showSpotLineBefore = firstAboveSpotIndex !== -1 && idx === firstAboveSpotIndex;
                    return (
                      <React.Fragment key={`${item.type}_${item.strike}`}>
                        {showSpotLineBefore && renderSpotLine()}
                        <div
                          title={`Strike R$ ${item.strike.toFixed(2)} (${item.type})\nOI Atual: ${item.currentOI.toLocaleString('pt-BR')}\nVariação 5D: ${pct !== null ? `${pct > 0 ? '+' : ''}${pct}%` : 'N/D'}\nDistância Spot: ${item.distanceFromSpotPercent > 0 ? '+' : ''}${item.distanceFromSpotPercent}%\n${item.isWithin2Sigma ? 'Dentro do Range 2σ' : 'Fora do Range 2σ'}`}
                          className={`p-2.5 rounded-xl border transition-all hover:scale-105 cursor-pointer font-mono flex flex-col justify-between ${
                            item.isWithin2Sigma ? 'ring-1 ring-cyan-500/40' : ''
                          } ${getThermalStyle(pct)}`}
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold">
                              {item.type === 'CALL' ? 'CALL' : 'PUT'}
                            </span>
                            {item.isWithin2Sigma && (
                              <span className="text-[9px] px-1 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                                2σ
                              </span>
                            )}
                          </div>

                          <div className="my-1 text-center">
                            <span className="text-xs font-black block text-white">
                              R$ {item.strike.toFixed(2)}
                            </span>
                            <span className="text-[11px] font-bold block mt-0.5">
                              {pct !== null ? `${pct > 0 ? '+' : ''}${pct}%` : 'N/D'}
                            </span>
                            <span className="text-[9px] text-cyan-200/90 block mt-0.5 font-medium">
                              {item.distanceFromSpotPercent > 0 ? `+${item.distanceFromSpotPercent}%` : `${item.distanceFromSpotPercent}%`}
                            </span>
                          </div>

                          <div className="text-[9px] text-center opacity-80">
                            {item.currentOI >= 1000000
                              ? `${(item.currentOI / 1000000).toFixed(1)}M`
                              : item.currentOI >= 1000
                              ? `${(item.currentOI / 1000).toFixed(0)}K`
                              : item.currentOI}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                  {/* Se todos os strikes forem menores ou iguais ao SPOT */}
                  {firstAboveSpotIndex === -1 && filteredStrikes.length > 0 && renderSpotLine()}
                </div>
              );
            })()}
          </div>

          {/* 6. Tabela Detalhada de Variação de Open Interest (1D e 5D) */}
          <div className="bg-[#0b101b] border border-gray-800/90 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">
                  Tabela Detalhada por Strike (Variação 1D & 5D)
                </h3>
              </div>

              {/* Filtros e Ordenação */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilterOnly2Sigma(!filterOnly2Sigma)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-mono flex items-center gap-1.5 border transition ${
                    filterOnly2Sigma
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                      : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>{filterOnly2Sigma ? 'Filtrado: Apenas Range 2σ' : 'Todos os Strikes'}</span>
                </button>

                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl text-xs font-mono bg-gray-900 border border-gray-700 text-gray-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="5D_ASC">Ordenar: Menor para Maior 5D</option>
                  <option value="5D_DESC">Ordenar: Maior para Menor 5D</option>
                  <option value="1D_ASC">Ordenar: Menor para Maior 1D</option>
                  <option value="1D_DESC">Ordenar: Maior para Menor 1D</option>
                  <option value="OI_DESC">Ordenar: Maior OI Atual</option>
                  <option value="STRIKE_ASC">Ordenar: Strike Crescente</option>
                </select>
              </div>
            </div>

            {/* Legenda Cromática Térmica */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-gray-400 bg-gray-900/60 p-2.5 rounded-xl border border-gray-800">
              <span className="font-semibold text-gray-300">Escala Térmica:</span>
              <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                🔴 Queda Forte / Desmonte
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                🟡 Estável / Neutro
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                🟢 Alta Forte / Montagem
              </span>
            </div>

            {/* Tabela de Dados */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-[11px]">
                    <th className="py-2.5 px-3">Strike</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Distância Spot</th>
                    <th className="py-2.5 px-3">OI Atual</th>
                    <th className="py-2.5 px-3">Variação 1D (% Ontem)</th>
                    <th className="py-2.5 px-3">Variação 5D (% Total 5D)</th>
                    <th className="py-2.5 px-3">Filtro 2σ</th>
                    <th className="py-2.5 px-3">Status de Fluxo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {displayedRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500">
                        Nenhum strike encontrado para os critérios selecionados.
                      </td>
                    </tr>
                  ) : (
                    displayedRows.slice(0, showAllRows ? undefined : 15).map((row) => (
                      <tr key={`${row.type}_${row.strike}`} className="hover:bg-gray-800/40 transition">
                        <td className="py-2.5 px-3 font-bold text-white">
                          R$ {row.strike.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              row.type === 'CALL'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-red-500/20 text-red-400 border border-red-500/40'
                            }`}
                          >
                            {row.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-300">
                          {row.distanceFromSpotPercent > 0 ? `+${row.distanceFromSpotPercent}%` : `${row.distanceFromSpotPercent}%`}
                        </td>
                        <td className="py-2.5 px-3 text-white font-semibold">
                          {row.currentOI.toLocaleString('pt-BR')}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-center font-bold ${getThermalStyle(row.change1DPercent)}`}>
                            {row.change1DPercent !== null ? `${row.change1DPercent > 0 ? '+' : ''}${row.change1DPercent.toFixed(2)}%` : 'N/D'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-center font-bold ${getThermalStyle(row.change5DPercent)}`}>
                            {row.change5DPercent !== null ? `${row.change5DPercent > 0 ? '+' : ''}${row.change5DPercent.toFixed(2)}%` : 'N/D'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {row.isWithin2Sigma ? (
                            <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/40 text-[10px]">
                              No Range
                            </span>
                          ) : (
                            <span className="text-gray-600 text-[10px]">Fora</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {row.flowSignal === 'ACCUMULATION' ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                              Montagem
                            </span>
                          ) : row.flowSignal === 'UNWINDING' ? (
                            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-bold">
                              Desmonte
                            </span>
                          ) : row.flowSignal === 'STABLE' ? (
                            <span className="text-gray-400 text-[10px]">Estável</span>
                          ) : (
                            <span className="text-gray-600 text-[10px]">N/D</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Controle de Expansão / Recolhimento da Tabela */}
            {displayedRows.length > 15 && (
              <div className="pt-3 text-center border-t border-gray-800/60">
                <button
                  type="button"
                  onClick={() => setShowAllRows(!showAllRows)}
                  className="px-4 py-2 rounded-xl bg-gray-900 border border-gray-700 hover:border-gray-500 text-xs font-mono text-cyan-400 hover:text-cyan-300 font-semibold transition shadow-sm"
                >
                  {showAllRows
                    ? '▲ Recolher para os 15 primeiros strikes'
                    : `▼ Exibir todos os ${displayedRows.length} strikes da série (+${displayedRows.length - 15} restantes)`}
                </button>
              </div>
            )}
          </div>

          {/* 5. Gráfico de Candlestick do Ativo Spot com Linhas de Barreiras */}
          <div className="bg-[#0b101b] border border-gray-800/90 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  Gráfico de Candlestick Spot com Linhas de Barreiras & Bandas 200P
                </h3>
              </div>
              <span className="text-xs text-gray-400 font-mono">
                {symbol} • Últimos 50 pregões
              </span>
            </div>

            {/* Legenda das Linhas do Gráfico */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-gray-300 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-green-500 rounded" />
                <span>Maior CALL Geral</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-emerald-400 rounded shadow-sm shadow-emerald-400" />
                <span className="font-bold text-emerald-300">Maior CALL (Range 2σ)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-red-500 rounded" />
                <span>Maior PUT Geral</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-amber-400 rounded" />
                <span className="font-bold text-amber-300">Maior PUT (Range 2σ)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t border-cyan-400 border-dashed" />
                <span className="text-cyan-400">Bandas ±2σ (200P)</span>
              </div>
            </div>

            {/* SVG Candlestick Chart */}
            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-auto min-w-[700px] select-none font-mono"
              >
                {/* Linhas de Grade de Fundo */}
                {[0.2, 0.4, 0.6, 0.8].map((factor) => {
                  const y = padding.top + factor * (chartHeight - padding.top - padding.bottom);
                  return (
                    <line
                      key={factor}
                      x1={padding.left}
                      y1={y}
                      x2={chartWidth - padding.right}
                      y2={y}
                      stroke="#1e293b"
                      strokeDasharray="3 3"
                    />
                  );
                })}

                {/* Linha Banda Superior +2σ */}
                {data.spotBands && (
                  <g>
                    <line
                      x1={padding.left}
                      y1={priceToY(data.spotBands.upperBand2Sigma)}
                      x2={chartWidth - padding.right}
                      y2={priceToY(data.spotBands.upperBand2Sigma)}
                      stroke="#22d3ee"
                      strokeDasharray="4 4"
                      strokeWidth="1.5"
                    />
                    <text
                      x={chartWidth - padding.right + 8}
                      y={priceToY(data.spotBands.upperBand2Sigma) + 4}
                      fill="#22d3ee"
                      fontSize="10"
                    >
                      +2σ: R$ {data.spotBands.upperBand2Sigma.toFixed(2)}
                    </text>
                  </g>
                )}

                {/* Linha Banda Inferior -2σ */}
                {data.spotBands && (
                  <g>
                    <line
                      x1={padding.left}
                      y1={priceToY(data.spotBands.lowerBand2Sigma)}
                      x2={chartWidth - padding.right}
                      y2={priceToY(data.spotBands.lowerBand2Sigma)}
                      stroke="#22d3ee"
                      strokeDasharray="4 4"
                      strokeWidth="1.5"
                    />
                    <text
                      x={chartWidth - padding.right + 8}
                      y={priceToY(data.spotBands.lowerBand2Sigma) + 4}
                      fill="#22d3ee"
                      fontSize="10"
                    >
                      -2σ: R$ {data.spotBands.lowerBand2Sigma.toFixed(2)}
                    </text>
                  </g>
                )}

                {/* Linha Maior CALL Geral */}
                {data.topCallOverall && (
                  <g>
                    <line
                      x1={padding.left}
                      y1={priceToY(data.topCallOverall.strike)}
                      x2={chartWidth - padding.right}
                      y2={priceToY(data.topCallOverall.strike)}
                      stroke="#22c55e"
                      strokeWidth="1.5"
                    />
                    <text
                      x={chartWidth - padding.right + 8}
                      y={priceToY(data.topCallOverall.strike) - 3}
                      fill="#22c55e"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      CALL Geral: R$ {data.topCallOverall.strike.toFixed(2)}
                    </text>
                  </g>
                )}

                {/* Linha Maior CALL no Range 2σ */}
                {data.topCallWithin2Sigma && (
                  <g>
                    <line
                      x1={padding.left}
                      y1={priceToY(data.topCallWithin2Sigma.strike)}
                      x2={chartWidth - padding.right}
                      y2={priceToY(data.topCallWithin2Sigma.strike)}
                      stroke="#34d399"
                      strokeWidth="2.5"
                    />
                    <text
                      x={chartWidth - padding.right + 8}
                      y={priceToY(data.topCallWithin2Sigma.strike) + 11}
                      fill="#34d399"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      CALL 2σ: R$ {data.topCallWithin2Sigma.strike.toFixed(2)}
                    </text>
                  </g>
                )}

                {/* Linha Maior PUT Geral */}
                {data.topPutOverall && (
                  <g>
                    <line
                      x1={padding.left}
                      y1={priceToY(data.topPutOverall.strike)}
                      x2={chartWidth - padding.right}
                      y2={priceToY(data.topPutOverall.strike)}
                      stroke="#ef4444"
                      strokeWidth="1.5"
                    />
                    <text
                      x={chartWidth - padding.right + 8}
                      y={priceToY(data.topPutOverall.strike) + 11}
                      fill="#ef4444"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      PUT Geral: R$ {data.topPutOverall.strike.toFixed(2)}
                    </text>
                  </g>
                )}

                {/* Linha Maior PUT no Range 2σ */}
                {data.topPutWithin2Sigma && (
                  <g>
                    <line
                      x1={padding.left}
                      y1={priceToY(data.topPutWithin2Sigma.strike)}
                      x2={chartWidth - padding.right}
                      y2={priceToY(data.topPutWithin2Sigma.strike)}
                      stroke="#fbbf24"
                      strokeWidth="2.5"
                    />
                    <text
                      x={chartWidth - padding.right + 8}
                      y={priceToY(data.topPutWithin2Sigma.strike) - 3}
                      fill="#fbbf24"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      PUT 2σ: R$ {data.topPutWithin2Sigma.strike.toFixed(2)}
                    </text>
                  </g>
                )}

                {/* Candles Diários */}
                {candles.map((candle, idx) => {
                  const usableWidth = chartWidth - padding.left - padding.right;
                  const step = usableWidth / candles.length;
                  const x = padding.left + idx * step + step / 2;

                  const yOpen = priceToY(candle.open);
                  const yClose = priceToY(candle.close);
                  const yHigh = priceToY(candle.high);
                  const yLow = priceToY(candle.low);

                  const isUp = candle.close >= candle.open;
                  const color = isUp ? '#10b981' : '#ef4444';

                  const topY = Math.min(yOpen, yClose);
                  const candleH = Math.max(2, Math.abs(yClose - yOpen));

                  return (
                    <g
                      key={candle.date}
                      className="cursor-pointer group"
                      onMouseEnter={() => setHoveredCandle(candle)}
                      onMouseLeave={() => setHoveredCandle(null)}
                    >
                      {/* Pavio (Wick) */}
                      <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1.2" />

                      {/* Corpo (Body) */}
                      <rect
                        x={x - candleWidth / 2}
                        y={topY}
                        width={candleWidth}
                        height={candleH}
                        fill={color}
                        rx="1"
                      />

                      {/* Eixo X: Data a cada 8 candles */}
                      {idx % 8 === 0 && (
                        <text
                          x={x}
                          y={chartHeight - 10}
                          textAnchor="middle"
                          fill="#64748b"
                          fontSize="9"
                        >
                          {candle.dateFormatted}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Tooltip de Detalhes do Candle em Hover */}
            {hoveredCandle && (
              <div className="p-2.5 rounded-xl bg-gray-900 border border-gray-700/80 text-xs font-mono flex flex-wrap items-center gap-4 animate-fadeIn">
                <span className="text-gray-400 font-bold">Data: {hoveredCandle.dateFormatted}</span>
                <span>Abertura: <strong className="text-white">R$ {hoveredCandle.open.toFixed(2)}</strong></span>
                <span>Máxima: <strong className="text-emerald-400">R$ {hoveredCandle.high.toFixed(2)}</strong></span>
                <span>Mínima: <strong className="text-red-400">R$ {hoveredCandle.low.toFixed(2)}</strong></span>
                <span>Fechamento: <strong className="text-white">R$ {hoveredCandle.close.toFixed(2)}</strong></span>
                <span>Volume: <strong className="text-gray-300">{hoveredCandle.volume.toLocaleString('pt-BR')}</strong></span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
