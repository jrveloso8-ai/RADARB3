'use client';

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Calendar,
  Search,
  RefreshCw,
  AlertTriangle,
  Info,
  Key,
  TrendingUp,
  BarChart2,
  Lock,
  Unlock,
  Shield,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { OptionAnalysisResult } from '@/lib/types/financial';
import { safeFetchJson } from '@/lib/utils/api-client';

interface OptionsBarriersViewProps {
  initialSymbol?: string;
  hideTopNav?: boolean;
}

export const OptionsBarriersView: React.FC<OptionsBarriersViewProps> = ({
  initialSymbol = 'PETR4',
  hideTopNav = false,
}) => {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [searchInput, setSearchInput] = useState(initialSymbol);
  const [selectedExpiration, setSelectedExpiration] = useState<string>('');
  const [data, setData] = useState<OptionAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const popularAssets = ['PETR4', 'VALE3', 'BOVA11', 'BBAS3', 'ITUB4', 'BBDC4', 'ABEV3', 'SBSP3'];

  const fetchOptions = async (ticker: string, expiration?: string) => {
    setLoading(true);
    setError(null);

    const expParam = expiration ? `&expiration=${encodeURIComponent(expiration)}` : '';
    const { ok, data: resData, error: resError } = await safeFetchJson<OptionAnalysisResult>(
      `/api/options?symbol=${encodeURIComponent(ticker)}${expParam}`
    );

    if (ok && resData) {
      setData(resData);
      setSymbol(ticker);
      setSelectedExpiration(resData.selectedExpiration || '');
    } else {
      setData(null);
      setError(resError || 'Nenhuma opção disponível para este ativo.');
    }

    setLoading(false);
  };

  useEffect(() => {
    if (initialSymbol) {
      setSymbol(initialSymbol);
      setSearchInput(initialSymbol);
      fetchOptions(initialSymbol);
    }
  }, [initialSymbol]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      fetchOptions(searchInput.trim().toUpperCase(), selectedExpiration);
    }
  };

  const handleExpirationSelect = (expDate: string) => {
    setSelectedExpiration(expDate);
    fetchOptions(symbol, expDate);
  };

  return (
    <div className="space-y-5 text-gray-200 font-sans">
      {/* 1. TOP BAR / PROVENIÊNCIA DOS PILARES (quando exibido globalmente) */}
      {!hideTopNav && (
        <>
          <div className="bg-[#0b101b] border border-gray-800/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-cyan-400 font-mono tracking-wider">
                (≈) PROVENIÊNCIA DOS 4 PILARES:
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                100% BASE REAL BRAPI
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-emerald-500/30 text-gray-300 flex items-center gap-1">
                <span className="text-gray-400">1. SPOT:</span>
                <strong className="text-emerald-400">REAL</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-emerald-500/30 text-gray-300 flex items-center gap-1">
                <span className="text-gray-400">2. FUNDAM:</span>
                <strong className="text-emerald-400">CNPI-P</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-emerald-500/30 text-cyan-300 flex items-center gap-1">
                <span className="text-gray-400">3. OPÇÕES:</span>
                <strong className="text-emerald-400">B3 OI</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-emerald-500/30 text-gray-300 flex items-center gap-1">
                <span className="text-gray-400">4. MACRO:</span>
                <strong className="text-emerald-400">SELIC 10.75%</strong>
              </span>
            </div>
          </div>

          {/* SUB-HEADER / BUSCA GLOBAL */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">Ativos Líquidos:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {popularAssets.map((sym) => (
                  <button
                    key={sym}
                    onClick={() => {
                      setSearchInput(sym);
                      fetchOptions(sym);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition border ${
                      symbol === sym
                        ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50 font-bold'
                        : 'bg-[#121929] text-gray-400 border-gray-800 hover:text-white'
                    }`}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>

            {/* Input de Busca de Ativo */}
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                  placeholder="Ticker (ex: PETR4)..."
                  className="pl-8 pr-2 py-1.5 bg-[#0b0f19] border border-gray-700 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 font-mono w-36"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg text-xs transition disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Buscar'}
              </button>
            </form>
          </div>
        </>
      )}

      {/* 2. GRADE DE VENCIMENTOS OFICIAIS B3 (MENSAIS & SEMANAIS) */}
      <div className="bg-[#0e1422] border border-gray-800 rounded-xl p-4 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-gray-200 tracking-wider uppercase font-mono">
              Grade de Vencimentos Oficiais B3 ({symbol})
            </h3>
          </div>
          {data && data.selectedExpirationInfo && (
            <span className="text-xs text-gray-400 font-mono">
              Série Selecionada:{' '}
              <strong className="text-cyan-400">Call {data.selectedExpirationInfo.callLetter}</strong> /{' '}
              <strong className="text-pink-400">Put {data.selectedExpirationInfo.putLetter}</strong> •{' '}
              <strong className="text-white">{data.selectedExpirationInfo.dte} Dias Úteis (DU)</strong>
            </span>
          )}
        </div>

        {/* Pílulas de Vencimento com DTE e Letras de Série */}
        <div className="flex flex-wrap gap-2 pt-1">
          {data?.availableExpirations.map((exp) => {
            const isSelected = selectedExpiration === exp.date;
            return (
              <button
                key={exp.date}
                onClick={() => handleExpirationSelect(exp.date)}
                className={`px-3 py-2 rounded-xl text-xs font-mono transition-all flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/20 font-bold ring-1 ring-cyan-400'
                    : 'bg-[#121929] border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700'
                }`}
              >
                <span>{exp.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-gray-300 border border-gray-700">
                  {exp.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. BARRA DE MÉTRICAS ANALÍTICAS (6 CARDS) */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono">
          {/* Card 1: Vencimento Analisado */}
          <div className="bg-[#0e1422] border border-gray-800 p-3 rounded-xl shadow-sm">
            <span className="text-[10px] font-bold text-gray-400 font-sans uppercase block">
              Vencimento Analisado
            </span>
            <span className="text-sm font-bold text-cyan-400 mt-1 block">
              {data.selectedExpiration}
            </span>
            <span className="text-[10px] text-gray-500 mt-0.5 block font-sans">
              Série Call {data.selectedExpirationInfo.callLetter} / Put {data.selectedExpirationInfo.putLetter}
            </span>
          </div>

          {/* Card 2: DTE */}
          <div className="bg-[#0e1422] border border-gray-800 p-3 rounded-xl shadow-sm">
            <span className="text-[10px] font-bold text-gray-400 font-sans uppercase block">DTE (DU B3)</span>
            <span className="text-sm font-bold text-white mt-1 block">
              {data.selectedExpirationInfo.dte} dias úteis
            </span>
            <span className="text-[10px] text-emerald-400 font-medium mt-0.5 block flex items-center gap-1 font-sans">
              ✓ Padrão B3 / Profit
            </span>
          </div>

          {/* Card 3: IV ATM */}
          <div className="bg-[#0e1422] border border-gray-800 p-3 rounded-xl shadow-sm">
            <span className="text-[10px] font-bold text-gray-400 font-sans uppercase block">
              IV ATM (Call/Put)
            </span>
            <span className="text-sm font-bold text-white mt-1 block">
              {data.ivAtm.callIv}% / {data.ivAtm.putIv}%
            </span>
            <span className="text-[10px] text-gray-500 mt-0.5 block font-sans">
              Percentil IV: ~{data.ivAtm.percentile}%
            </span>
          </div>

          {/* Card 4: HV21 / HV63 */}
          <div className="bg-[#0e1422] border border-gray-800 p-3 rounded-xl shadow-sm">
            <span className="text-[10px] font-bold text-gray-400 font-sans uppercase block">
              HV21 / HV63 (Real)
            </span>
            <span className="text-sm font-bold text-white mt-1 block">
              {data.hv21}% / {data.hv63}%
            </span>
            <span className="text-[10px] text-gray-500 mt-0.5 block font-sans">Volatilidade Real B3</span>
          </div>

          {/* Card 5: P/C Ratio */}
          <div className="bg-[#0e1422] border border-gray-800 p-3 rounded-xl shadow-sm">
            <span className="text-[10px] font-bold text-gray-400 font-sans uppercase block">
              P/C Ratio (OI)
            </span>
            <span className="text-sm font-bold text-white mt-1 block">
              {data.putCallRatio}
            </span>
            <span className="text-[10px] text-emerald-400 font-medium mt-0.5 block font-sans">
              {data.putCallRatio < 1 ? 'Predomínio de Calls' : 'Predomínio de Puts'}
            </span>
          </div>

          {/* Card 6: Max Pain */}
          <div className="bg-[#0e1422] border border-gray-800 p-3 rounded-xl shadow-sm">
            <span className="text-[10px] font-bold text-gray-400 font-sans uppercase block">
              Max Pain
            </span>
            <span className="text-sm font-bold text-amber-400 mt-1 block">
              R$ {data.maxPain.toFixed(2)}
            </span>
            <span className="text-[10px] text-gray-500 mt-0.5 block font-sans">Menor prejuízo lançadores</span>
          </div>
        </div>
      )}

      {/* 4. SUB-HEADER DE PRECIFICAÇÃO */}
      <div className="bg-[#0a0e17] border border-gray-800 rounded-lg px-3 py-1.5 flex flex-wrap items-center justify-between text-[11px] font-mono text-gray-400">
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30 font-bold">
            PRECIFICAÇÃO
          </span>
          <span>Modelo Matemático: Black-Scholes (Merton 1973 c/ q=DivYield) | Volatilidade: HV21 ({data?.hv21 || 24.5}%)</span>
        </div>
        <span className="text-gray-500">Proveniência: THEORETICAL_BS_HV21_B3_EOD</span>
      </div>

      {/* 5. SEÇÃO CENTRAL EM 2 COLUNAS (DISTRIBUIÇÃO DE VOLUME + TOP 5 WALLS) */}
      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* COLUNA ESQUERDA: DISTRIBUIÇÃO DE VOLUME / OI POR STRIKE */}
          <div className="bg-[#0e1422] border border-gray-800 rounded-xl p-4 shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider font-mono">
                    Distribuição de Volume por Strike
                  </h4>
                </div>
                <div className="text-[11px] font-mono text-gray-400 flex items-center gap-3">
                  <span>Spot: <strong className="text-white">R$ {data.underlyingPrice.toFixed(2)}</strong></span>
                  <span>Max Pain: <strong className="text-amber-400">R$ {data.maxPain.toFixed(2)}</strong></span>
                </div>
              </div>

              {/* Histograma Bidirecional de Strikes (Puts à esquerda, Calls à direita) */}
              <div className="space-y-1 text-[11px] font-mono">
                {(() => {
                  const maxVolume = Math.max(
                    ...data.strikeDistribution.map((d) =>
                      Math.max(d.callOpenInterest, d.putOpenInterest)
                    ),
                    1
                  );

                  return data.strikeDistribution.map((item) => {
                    const putPct = (item.putOpenInterest / maxVolume) * 100;
                    const callPct = (item.callOpenInterest / maxVolume) * 100;

                    return (
                      <div
                        key={item.strike}
                        className={`flex items-center py-1 px-1.5 rounded transition ${
                          item.isSpot
                            ? 'bg-cyan-950/40 border border-cyan-500/30'
                            : item.isMaxPain
                            ? 'bg-amber-950/30 border border-amber-500/20'
                            : 'hover:bg-[#151c2e]'
                        }`}
                      >
                        {/* Lado Esquerdo: PUTS (Rosa) */}
                        <div className="flex-1 flex items-center justify-end gap-2 pr-2">
                          {item.putOpenInterest > 0 && (
                            <span className="text-[9px] text-gray-400">
                              {item.putOpenInterest.toLocaleString('pt-BR')}
                            </span>
                          )}
                          <div className="w-24 sm:w-32 bg-slate-900/80 h-2 rounded-full overflow-hidden flex justify-end">
                            <div
                              style={{ width: `${putPct}%` }}
                              className="bg-gradient-to-l from-pink-500 to-rose-600 h-full rounded-full"
                            />
                          </div>
                        </div>

                        {/* Centro: STRIKE */}
                        <div className="w-20 text-center font-bold px-1 py-0.5 rounded bg-slate-900 border border-gray-800 text-[10px]">
                          <span
                            className={
                              item.isSpot
                                ? 'text-cyan-300 font-bold'
                                : item.isMaxPain
                                ? 'text-amber-300 font-bold'
                                : 'text-gray-300'
                            }
                          >
                            R$ {item.strike.toFixed(2)}
                          </span>
                        </div>

                        {/* Lado Direito: CALLS (Verde) */}
                        <div className="flex-1 flex items-center justify-start gap-2 pl-2">
                          <div className="w-24 sm:w-32 bg-slate-900/80 h-2 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${callPct}%` }}
                              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full"
                            />
                          </div>
                          {item.callOpenInterest > 0 && (
                            <span className="text-[9px] text-gray-400">
                              {item.callOpenInterest.toLocaleString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Legenda Inferior */}
            <div className="flex items-center justify-between text-[10px] text-gray-400 pt-3 border-t border-gray-800 mt-2 font-mono">
              <span className="text-pink-400 font-semibold">◀ Puts (Suporte)</span>
              <span className="text-gray-500">Strikes B3</span>
              <span className="text-emerald-400 font-semibold">Calls (Resistência) ▶</span>
            </div>
          </div>

          {/* COLUNA DIREITA: TOP 5 WALLS DE CALLS E PUTS */}
          <div className="space-y-4">
            {/* TABELA TOP 5 CALL WALLS */}
            <div className="bg-[#0e1422] border border-gray-800 rounded-xl p-4 shadow-lg space-y-3">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Top 5 Call Walls (Resistência Institucional)</span>
                </h4>
                <span className="text-[10px] text-gray-400 font-mono">VOLUME / OI</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[11px] font-mono">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800 text-[10px]">
                      <th className="text-left pb-1 font-semibold">Strike</th>
                      <th className="text-left pb-1 font-semibold">Símbolo</th>
                      <th className="text-right pb-1 font-semibold">Contratos</th>
                      <th className="text-right pb-1 font-semibold">Descobertos</th>
                      <th className="text-right pb-1 font-semibold">IV</th>
                      <th className="text-right pb-1 font-semibold">Delta</th>
                      <th className="text-right pb-1 font-semibold">Dist. Spot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {data.top5CallWalls.map((wall, idx) => (
                      <tr key={idx} className="hover:bg-[#151c2e] transition">
                        <td className="py-1.5 text-white font-bold">R$ {wall.strike.toFixed(2)}</td>
                        <td className="py-1.5 text-cyan-300">{wall.symbol}</td>
                        <td className="py-1.5 text-right font-bold text-emerald-400">
                          {wall.contracts.toLocaleString('pt-BR')}
                        </td>
                        <td className="py-1.5 text-right text-gray-400">
                          {wall.uncovered.toLocaleString('pt-BR')}
                        </td>
                        <td className="py-1.5 text-right text-gray-300">{wall.iv}%</td>
                        <td className="py-1.5 text-right text-gray-300">{wall.delta}</td>
                        <td
                          className={`py-1.5 text-right font-bold ${
                            wall.distSpot >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {wall.distSpot >= 0 ? '+' : ''}
                          {wall.distSpot}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TABELA TOP 5 PUT WALLS */}
            <div className="bg-[#0e1422] border border-gray-800 rounded-xl p-4 shadow-lg space-y-3">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <h4 className="text-xs font-bold text-pink-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Top 5 Put Walls (Suporte Institucional)</span>
                </h4>
                <span className="text-[10px] text-gray-400 font-mono">VOLUME / OI</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[11px] font-mono">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800 text-[10px]">
                      <th className="text-left pb-1 font-semibold">Strike</th>
                      <th className="text-left pb-1 font-semibold">Símbolo</th>
                      <th className="text-right pb-1 font-semibold">Contratos</th>
                      <th className="text-right pb-1 font-semibold">Garantidos</th>
                      <th className="text-right pb-1 font-semibold">IV</th>
                      <th className="text-right pb-1 font-semibold">Delta</th>
                      <th className="text-right pb-1 font-semibold">Dist. Spot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {data.top5PutWalls.map((wall, idx) => (
                      <tr key={idx} className="hover:bg-[#151c2e] transition">
                        <td className="py-1.5 text-white font-bold">R$ {wall.strike.toFixed(2)}</td>
                        <td className="py-1.5 text-pink-300">{wall.symbol}</td>
                        <td className="py-1.5 text-right font-bold text-pink-400">
                          {wall.contracts.toLocaleString('pt-BR')}
                        </td>
                        <td className="py-1.5 text-right text-gray-400">
                          {wall.covered > 0 ? wall.covered.toLocaleString('pt-BR') : '-'}
                        </td>
                        <td className="py-1.5 text-right text-gray-300">{wall.iv}%</td>
                        <td className="py-1.5 text-right text-gray-300">{wall.delta}</td>
                        <td
                          className={`py-1.5 text-right font-bold ${
                            wall.distSpot >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {wall.distSpot}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. GRADE COMPLETA STRADDLE B3 (CALLS - STRIKE - PUTS) */}
      {data && (
        <div className="bg-[#0e1422] border border-gray-800 rounded-xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-bold text-gray-200 uppercase tracking-wider font-mono">
                Grade de Opções B3 (Straddle - Série {data.selectedExpiration})
              </h4>
            </div>
            <span className="text-[11px] text-gray-400 font-mono">
              Total OI: Calls ({data.totalCallOpenInterest.toLocaleString('pt-BR')}) | Puts (
              {data.totalPutOpenInterest.toLocaleString('pt-BR')})
            </span>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto no-scrollbar">
            <table className="w-full text-[11px] font-mono">
              <thead className="sticky top-0 bg-[#0e1422] z-10">
                <tr className="text-gray-400 border-b border-gray-700 text-[10px]">
                  <th className="text-left py-2 px-2 text-emerald-400">CALL</th>
                  <th className="text-right py-2 px-2 text-emerald-400">Último (R$)</th>
                  <th className="text-right py-2 px-2 text-emerald-400">OI Total</th>
                  <th className="text-right py-2 px-2 text-emerald-400">Descoberto</th>
                  <th className="text-center py-2 px-4 bg-slate-900/90 text-white font-bold border-x border-gray-800">
                    STRIKE
                  </th>
                  <th className="text-left py-2 px-2 text-pink-400">Descoberto</th>
                  <th className="text-left py-2 px-2 text-pink-400">OI Total</th>
                  <th className="text-left py-2 px-2 text-pink-400">Último (R$)</th>
                  <th className="text-right py-2 px-2 text-pink-400">PUT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/40">
                {data.straddleRows.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`transition ${
                      row.isSpotNear
                        ? 'bg-cyan-950/30'
                        : row.isMaxPain
                        ? 'bg-amber-950/20'
                        : 'hover:bg-[#151c2e]'
                    }`}
                  >
                    {/* Call Data */}
                    <td className="py-2 px-2 text-emerald-400 font-semibold">
                      {row.call?.symbol || '-'}
                    </td>
                    <td className="py-2 px-2 text-right text-white">
                      {row.call?.lastPrice ? `R$ ${row.call.lastPrice.toFixed(2)}` : '-'}
                    </td>
                    <td className="py-2 px-2 text-right text-emerald-300 font-bold">
                      {row.call?.openInterest ? row.call.openInterest.toLocaleString('pt-BR') : '-'}
                    </td>
                    <td className="py-2 px-2 text-right text-gray-400">
                      {row.call?.uncoveredQuantity
                        ? row.call.uncoveredQuantity.toLocaleString('pt-BR')
                        : '-'}
                    </td>

                    {/* Strike Center */}
                    <td className="py-2 px-4 text-center font-bold bg-slate-900/60 border-x border-gray-800">
                      <span
                        className={
                          row.isSpotNear
                            ? 'text-cyan-400 font-black'
                            : row.isMaxPain
                            ? 'text-amber-400 font-black'
                            : 'text-white'
                        }
                      >
                        R$ {row.strike.toFixed(2)}
                      </span>
                    </td>

                    {/* Put Data */}
                    <td className="py-2 px-2 text-left text-gray-400">
                      {row.put?.uncoveredQuantity
                        ? row.put.uncoveredQuantity.toLocaleString('pt-BR')
                        : '-'}
                    </td>
                    <td className="py-2 px-2 text-left text-pink-300 font-bold">
                      {row.put?.openInterest ? row.put.openInterest.toLocaleString('pt-BR') : '-'}
                    </td>
                    <td className="py-2 px-2 text-left text-white">
                      {row.put?.lastPrice ? `R$ ${row.put.lastPrice.toFixed(2)}` : '-'}
                    </td>
                    <td className="py-2 px-2 text-right text-pink-400 font-semibold">
                      {row.put?.symbol || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tratamento de Erro */}
      {error && !loading && (
        <div className="bg-[#0e1422] border border-red-500/30 p-6 rounded-xl text-center space-y-2">
          <AlertTriangle className="w-6 h-6 text-red-400 mx-auto" />
          <h4 className="font-bold text-white text-sm">Opções não encontradas para {symbol}</h4>
          <p className="text-xs text-gray-400">{error}</p>
        </div>
      )}
    </div>
  );
};
