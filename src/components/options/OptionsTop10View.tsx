'use client';

import React, { useState, useEffect } from 'react';
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
  Layers,
  Award,
} from 'lucide-react';
import { Top10OIResult, Top10OIItem } from '@/lib/types/financial';
import { TOP_10_LIQUID_ASSETS } from '@/lib/domain/options-top10';
import { safeFetchJson } from '@/lib/utils/api-client';

interface OptionsTop10ViewProps {
  initialSymbol?: string;
  onSelectSymbol?: (sym: string) => void;
}

export const OptionsTop10View: React.FC<OptionsTop10ViewProps> = ({
  initialSymbol = 'PETR4',
}) => {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [searchInput, setSearchInput] = useState(initialSymbol);
  const [selectedExpiration, setSelectedExpiration] = useState<string>('');
  const [data, setData] = useState<Top10OIResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState<'5D' | '1D' | 'CONTRACTS'>('5D');

  const fetchTop10 = async (ticker: string, expiration?: string) => {
    setLoading(true);
    setError(null);

    const expParam = expiration ? `&expiration=${encodeURIComponent(expiration)}` : '';
    const { ok, data: resData, error: resError } = await safeFetchJson<Top10OIResult>(
      `/api/options/top10-oi?symbol=${encodeURIComponent(ticker)}${expParam}`
    );

    if (ok && resData) {
      setData(resData);
      setSymbol(ticker);
      setSelectedExpiration(resData.selectedExpiration || '');
    } else {
      setData(null);
      setError(resError || 'Não foi possível carregar as Top 10 opções deste ativo.');
    }

    setLoading(false);
  };

  useEffect(() => {
    if (initialSymbol) {
      setSymbol(initialSymbol);
      setSearchInput(initialSymbol);
      fetchTop10(initialSymbol);
    }
  }, [initialSymbol]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      fetchTop10(searchInput.trim().toUpperCase(), selectedExpiration);
    }
  };

  const handleExpirationSelect = (expDate: string) => {
    setSelectedExpiration(expDate);
    fetchTop10(symbol, expDate);
  };

  const handleAssetSelect = (asset: string) => {
    setSymbol(asset);
    setSearchInput(asset);
    fetchTop10(asset);
  };

  const getThermalStyle = (pct: number | null) => {
    if (pct === null) return 'bg-gray-800/60 text-gray-400 border-gray-700/50';
    if (pct >= 10) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
    if (pct > 2) return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
    if (pct >= -2 && pct <= 2) return 'bg-amber-500/15 text-amber-300 border-amber-500/40';
    if (pct > -10) return 'bg-red-500/10 text-red-300 border-red-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/50';
  };

  // Helper para renderizar a barra de variação no gráfico
  const renderBarRow = (item: Top10OIItem, isCall: boolean) => {
    let value: number | null = null;
    let label = 'N/D';

    if (chartMetric === '5D') {
      value = item.change5DPercent;
      label = value !== null ? `${value > 0 ? '+' : ''}${value.toFixed(1)}%` : 'N/D';
    } else if (chartMetric === '1D') {
      value = item.change1DPercent;
      label = value !== null ? `${value > 0 ? '+' : ''}${value.toFixed(1)}%` : 'N/D';
    } else {
      value = item.change5DContracts;
      label = value !== null ? `${value > 0 ? '+' : ''}${value.toLocaleString('pt-BR')}` : 'N/D';
    }

    const numericVal = value ?? 0;
    // Normalizar escala visual de 0 a 100%
    const maxReference = chartMetric === 'CONTRACTS' ? 500000 : 50;
    const barWidth = Math.min(100, Math.max(4, (Math.abs(numericVal) / maxReference) * 100));

    const isPositive = numericVal >= 0;
    const barColor = isCall
      ? isPositive
        ? 'bg-emerald-500'
        : 'bg-emerald-900/60 border border-emerald-500/40'
      : isPositive
      ? 'bg-red-500'
      : 'bg-red-900/60 border border-red-500/40';

    return (
      <div key={`${item.type}_${item.strike}`} className="space-y-1 text-xs font-mono">
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white">R$ {item.strike.toFixed(2)}</span>
            <span className="text-gray-400 text-[10px]">({item.symbol})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-[10px]">
              OI: {item.currentOI.toLocaleString('pt-BR')}
            </span>
            <span
              className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                isPositive ? (isCall ? 'text-emerald-400' : 'text-red-300') : 'text-gray-400'
              }`}
            >
              {label}
            </span>
          </div>
        </div>
        <div className="h-2 w-full bg-gray-900/80 rounded-full overflow-hidden flex items-center border border-gray-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 text-gray-200 font-sans">
      {/* 1. SELETOR DE ATIVOS LÍQUIDOS & CONTROLES */}
      <div className="bg-[#0b101b] border border-gray-800/90 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Top 10 Open Interest Líquidas (CALL & PUT)
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  100% DADOS REAIS BRAPI
                </span>
              </h2>
              <p className="text-xs text-gray-400 font-mono">
                Ranking das 10 opções mais posicionadas da B3 por vencimento mensal
              </p>
            </div>
          </div>

          {/* Busca Manual e Refresh */}
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                placeholder="Ex: PETR4"
                className="bg-gray-900 border border-gray-700/80 rounded-xl px-3 py-1.5 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 w-28 uppercase"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold font-mono flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Buscar</span>
            </button>
            <button
              type="button"
              onClick={() => fetchTop10(symbol, selectedExpiration)}
              disabled={loading}
              className="p-1.5 rounded-xl border border-gray-700 hover:border-gray-500 bg-gray-900 text-gray-300 transition disabled:opacity-50"
              title="Atualizar Dados Reais"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </form>
        </div>

        {/* Quick Selector: Top 10 Ativos Mais Líquidos da B3 */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-mono text-gray-400 font-semibold mr-1">
            Top 10 Ativos Líquidos:
          </span>
          {TOP_10_LIQUID_ASSETS.map((asset) => (
            <button
              key={asset}
              type="button"
              onClick={() => handleAssetSelect(asset)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition ${
                symbol === asset
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 shadow-sm shadow-cyan-500/20'
                  : 'bg-gray-900/80 text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-800'
              }`}
            >
              {asset}
            </button>
          ))}
        </div>

        {/* Seletor de Vencimentos Mensais */}
        {data && data.availableExpirations.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-800/60">
            <span className="text-[11px] font-mono text-gray-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              Vencimento Mensal B3:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {data.availableExpirations.map((exp) => (
                <button
                  key={exp.date}
                  type="button"
                  onClick={() => handleExpirationSelect(exp.date)}
                  className={`px-3 py-1 rounded-xl text-xs font-mono transition flex items-center gap-1.5 ${
                    selectedExpiration === exp.date
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/60 font-bold'
                      : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
                  }`}
                >
                  <span>{exp.date}</span>
                  <span className="text-[10px] opacity-75">({exp.dte}d)</span>
                  {exp.dte <= 5 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Alerta de Período de Rolagem */}
      {data?.isRolloverPeriod && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center gap-2 shadow-md">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
          <span>
            <strong>JANELA DE ROLAGEM ATIVA (DTE ≤ 5):</strong> A série selecionada ({data.selectedExpiration})
            está próxima do vencimento. Forte desmonte e migração de contratos esperados para a próxima série mensal.
          </span>
        </div>
      )}

      {/* Carregando / Erro */}
      {loading && (
        <div className="p-12 text-center text-gray-400 font-mono flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
          <span>Consultando base oficial da B3 via BRAPI (Contratos em Aberto)...</span>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-mono flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {data && !loading && (
        <>
          {/* 2. CARDS RESUMO DO VENCIMENTO */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#0b101b] border border-gray-800/90 rounded-2xl p-3.5 shadow-md">
              <span className="text-[11px] font-mono text-gray-400 block">Preço SPOT Real</span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">
                R$ {data.spotPrice.toFixed(2)}
              </span>
              <span className="text-[10px] text-gray-500 font-mono">Mercado à Vista</span>
            </div>

            <div className="bg-[#0b101b] border border-gray-800/90 rounded-2xl p-3.5 shadow-md">
              <span className="text-[11px] font-mono text-gray-400 block">Total OI CALLs</span>
              <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                {data.totalCallsOI.toLocaleString('pt-BR')}
              </span>
              <span className="text-[10px] text-gray-500 font-mono">Contratos em Aberto</span>
            </div>

            <div className="bg-[#0b101b] border border-gray-800/90 rounded-2xl p-3.5 shadow-md">
              <span className="text-[11px] font-mono text-gray-400 block">Total OI PUTs</span>
              <span className="text-xl font-bold font-mono text-red-400 mt-1 block">
                {data.totalPutsOI.toLocaleString('pt-BR')}
              </span>
              <span className="text-[10px] text-gray-500 font-mono">Contratos em Aberto</span>
            </div>

            <div className="bg-[#0b101b] border border-gray-800/90 rounded-2xl p-3.5 shadow-md">
              <span className="text-[11px] font-mono text-gray-400 block">Razão Put / Call (PCR)</span>
              <span className="text-xl font-bold font-mono text-cyan-300 mt-1 block">
                {data.callPutRatio.toFixed(2)}
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                {data.callPutRatio > 1.0
                  ? 'Predomínio de PUTs (Hedge/Cautela)'
                  : data.callPutRatio < 0.7
                  ? 'Predomínio de CALLs (Direcional Alta)'
                  : 'Equilíbrio de Forças'}
              </span>
            </div>
          </div>

          {/* 3. DUAS TABELAS LADO A LADO: TOP 10 CALLS & TOP 10 PUTS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Tabela Esquerda: TOP 10 CALLs */}
            <div className="bg-[#0b101b] border border-gray-800/90 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <h3 className="text-sm font-bold text-emerald-300 font-mono">
                    TOP 10 CALLs MAIOR OPEN INTEREST
                  </h3>
                </div>
                <span className="text-[11px] text-gray-500 font-mono">
                  {symbol} • Série Mensal
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400 text-[10px]">
                      <th className="py-2 px-2">#</th>
                      <th className="py-2 px-2">Ticker</th>
                      <th className="py-2 px-2">Strike</th>
                      <th className="py-2 px-2">Dist. Spot</th>
                      <th className="py-2 px-2 text-right">OI Atual</th>
                      <th className="py-2 px-2 text-center">Var 1D</th>
                      <th className="py-2 px-2 text-center">Var 5D</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {data.top10Calls.map((item, idx) => (
                      <tr key={item.symbol} className="hover:bg-gray-800/30 transition">
                        <td className="py-2 px-2 text-gray-500 font-bold">{idx + 1}</td>
                        <td className="py-2 px-2 font-bold text-white">{item.symbol}</td>
                        <td className="py-2 px-2 text-emerald-400 font-bold">
                          R$ {item.strike.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-gray-300 text-[11px]">
                          {item.distanceFromSpotPercent > 0
                            ? `+${item.distanceFromSpotPercent}%`
                            : `${item.distanceFromSpotPercent}%`}
                        </td>
                        <td className="py-2 px-2 text-right text-white font-semibold">
                          {item.currentOI.toLocaleString('pt-BR')}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${getThermalStyle(
                              item.change1DPercent
                            )}`}
                          >
                            {item.change1DPercent !== null
                              ? `${item.change1DPercent > 0 ? '+' : ''}${item.change1DPercent.toFixed(1)}%`
                              : 'N/D'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${getThermalStyle(
                              item.change5DPercent
                            )}`}
                          >
                            {item.change5DPercent !== null
                              ? `${item.change5DPercent > 0 ? '+' : ''}${item.change5DPercent.toFixed(1)}%`
                              : 'N/D'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {data.top10Calls.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-gray-500">
                          Nenhuma CALL encontrada para este vencimento.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabela Direita: TOP 10 PUTs */}
            <div className="bg-[#0b101b] border border-gray-800/90 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <h3 className="text-sm font-bold text-red-300 font-mono">
                    TOP 10 PUTs MAIOR OPEN INTEREST
                  </h3>
                </div>
                <span className="text-[11px] text-gray-500 font-mono">
                  {symbol} • Série Mensal
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400 text-[10px]">
                      <th className="py-2 px-2">#</th>
                      <th className="py-2 px-2">Ticker</th>
                      <th className="py-2 px-2">Strike</th>
                      <th className="py-2 px-2">Dist. Spot</th>
                      <th className="py-2 px-2 text-right">OI Atual</th>
                      <th className="py-2 px-2 text-center">Var 1D</th>
                      <th className="py-2 px-2 text-center">Var 5D</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {data.top10Puts.map((item, idx) => (
                      <tr key={item.symbol} className="hover:bg-gray-800/30 transition">
                        <td className="py-2 px-2 text-gray-500 font-bold">{idx + 1}</td>
                        <td className="py-2 px-2 font-bold text-white">{item.symbol}</td>
                        <td className="py-2 px-2 text-red-400 font-bold">
                          R$ {item.strike.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-gray-300 text-[11px]">
                          {item.distanceFromSpotPercent > 0
                            ? `+${item.distanceFromSpotPercent}%`
                            : `${item.distanceFromSpotPercent}%`}
                        </td>
                        <td className="py-2 px-2 text-right text-white font-semibold">
                          {item.currentOI.toLocaleString('pt-BR')}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${getThermalStyle(
                              item.change1DPercent
                            )}`}
                          >
                            {item.change1DPercent !== null
                              ? `${item.change1DPercent > 0 ? '+' : ''}${item.change1DPercent.toFixed(1)}%`
                              : 'N/D'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${getThermalStyle(
                              item.change5DPercent
                            )}`}
                          >
                            {item.change5DPercent !== null
                              ? `${item.change5DPercent > 0 ? '+' : ''}${item.change5DPercent.toFixed(1)}%`
                              : 'N/D'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {data.top10Puts.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-gray-500">
                          Nenhuma PUT encontrada para este vencimento.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 4. GRÁFICO COMPARATIVO DE VARIAÇÕES (TOP 10 CALLs vs TOP 10 PUTs) */}
          <div className="bg-[#0b101b] border border-gray-800/90 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Gráfico Comparativo de Variação (Top 10 CALLs vs Top 10 PUTs)
                  </h3>
                  <p className="text-xs text-gray-400 font-mono">
                    Análise visual de expansão ou contração de posições nas maiores barreiras
                  </p>
                </div>
              </div>

              {/* Seletor de Métrica do Gráfico */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-900 border border-gray-800 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setChartMetric('5D')}
                  className={`px-3 py-1 rounded-lg transition ${
                    chartMetric === '5D'
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Variação 5 Dias (%)
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('1D')}
                  className={`px-3 py-1 rounded-lg transition ${
                    chartMetric === '1D'
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Variação 1 Dia (%)
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('CONTRACTS')}
                  className={`px-3 py-1 rounded-lg transition ${
                    chartMetric === 'CONTRACTS'
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Saldo em Contratos (5D)
                </button>
              </div>
            </div>

            {/* Comparação Gráfica em Duas Colunas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              {/* Coluna 1: CALLs */}
              <div className="space-y-3 bg-gray-950/40 p-4 rounded-xl border border-gray-800/80">
                <div className="flex items-center justify-between pb-1 border-b border-gray-800/60">
                  <span className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    CALLs ({chartMetric === '5D' ? 'Var. 5D' : chartMetric === '1D' ? 'Var. 1D' : 'Contratos 5D'})
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">10 Maiores Contratos</span>
                </div>
                <div className="space-y-3 pt-1">
                  {data.top10Calls.map((item) => renderBarRow(item, true))}
                  {data.top10Calls.length === 0 && (
                    <span className="text-xs text-gray-500 font-mono">Sem dados para exibição</span>
                  )}
                </div>
              </div>

              {/* Coluna 2: PUTs */}
              <div className="space-y-3 bg-gray-950/40 p-4 rounded-xl border border-gray-800/80">
                <div className="flex items-center justify-between pb-1 border-b border-gray-800/60">
                  <span className="text-xs font-bold text-red-400 font-mono flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    PUTs ({chartMetric === '5D' ? 'Var. 5D' : chartMetric === '1D' ? 'Var. 1D' : 'Contratos 5D'})
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">10 Maiores Contratos</span>
                </div>
                <div className="space-y-3 pt-1">
                  {data.top10Puts.map((item) => renderBarRow(item, false))}
                  {data.top10Puts.length === 0 && (
                    <span className="text-xs text-gray-500 font-mono">Sem dados para exibição</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
