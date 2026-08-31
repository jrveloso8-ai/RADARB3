'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Info,
  Layers,
  Search,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Clock,
  Target,
  ShieldAlert,
} from 'lucide-react';
import { AssetDecisionResult } from '@/lib/types/financial';
import { safeFetchJson } from '@/lib/utils/api-client';

interface ScreenerResponse {
  type: string;
  totalAnalyzed: number;
  lists: {
    alta: AssetDecisionResult[];
    baixa: AssetDecisionResult[];
    lateral: AssetDecisionResult[];
  };
  results?: AssetDecisionResult[];
  updatedAt: string;
  requiresToken?: boolean;
}

interface ScreenerViewProps {
  onSelectSymbol?: (symbol: string) => void;
}

export const ScreenerView: React.FC<ScreenerViewProps> = ({ onSelectSymbol }) => {
  const [selectedLimit, setSelectedLimit] = useState<number | 'all'>(60);
  const [lists, setLists] = useState<{
    alta: AssetDecisionResult[];
    baixa: AssetDecisionResult[];
    lateral: AssetDecisionResult[];
  }>({ alta: [], baixa: [], lateral: [] });
  const [totalAnalyzed, setTotalAnalyzed] = useState(0);
  const [searchFilter, setSearchFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [requiresToken, setRequiresToken] = useState(false);

  const fetchTrends = async (limitToFetch = selectedLimit) => {
    setLoading(true);
    setRequiresToken(false);
    const { ok, data } = await safeFetchJson<ScreenerResponse>(
      `/api/trends?limit=${limitToFetch}`
    );

    if (ok && data) {
      if (data.lists) {
        setLists(data.lists);
      } else if (data.results) {
        setLists({
          alta: data.results.filter((r) => r.operation?.operation === 'COMPRA'),
          baixa: data.results.filter((r) => r.operation?.operation === 'VENDA'),
          lateral: data.results.filter((r) => r.operation?.operation === 'IRON_CONDOR'),
        });
      }
      setTotalAnalyzed(data.totalAnalyzed || 0);
      setRequiresToken(!!data.requiresToken);
    } else {
      setLists({ alta: [], baixa: [], lateral: [] });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTrends(selectedLimit);
  }, [selectedLimit]);

  // Filtro de busca por ticker ou nome
  const applySearch = (items: AssetDecisionResult[]) => {
    if (!searchFilter.trim()) return items;
    const q = searchFilter.trim().toLowerCase();
    return items.filter(
      (item) =>
        item.symbol.toLowerCase().includes(q) ||
        (item.shortName && item.shortName.toLowerCase().includes(q))
    );
  };

  const altaFiltered = applySearch(lists.alta);
  const baixaFiltered = applySearch(lists.baixa);
  const lateralFiltered = applySearch(lists.lateral);

  return (
    <div className="space-y-6">
      {/* Header do Motor Integrado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white tracking-wide">
              Rastreador de Oportunidades & Lista de Execução
            </h2>
            <div className="flex items-center gap-1 text-[11px] text-cyan-400 bg-cyan-950/60 px-2.5 py-0.5 rounded-full border border-cyan-500/30 font-mono">
              <span>Classificação Técnica</span> • <span>Crivo CNPI-P</span> • <span>Execução B3</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Lista acionável filtrada por solvência, alinhamento estrito de médias móveis e liquidez real de derivativos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          {/* Seletor de Quantidade de Ativos */}
          <div className="flex items-center gap-1 bg-[#111827] p-1 rounded-xl border border-gray-800 text-xs font-mono">
            <span className="text-[10px] text-gray-500 px-2 font-sans">Escanear:</span>
            {[
              { val: 40, label: '40' },
              { val: 60, label: '60' },
              { val: 100, label: '100' },
              { val: 'all' as const, label: 'Todos' },
            ].map((opt) => (
              <button
                key={String(opt.val)}
                onClick={() => setSelectedLimit(opt.val)}
                className={`px-2.5 py-1 rounded-lg transition ${
                  selectedLimit === opt.val
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchTrends(selectedLimit)}
            disabled={loading}
            className="p-2.5 bg-[#111827] hover:bg-gray-800 border border-gray-800 rounded-xl text-gray-400 hover:text-white transition disabled:opacity-50 flex items-center gap-2 text-xs font-semibold"
            title="Atualizar rastreamento"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Barra de Busca Rápida */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrar por ticker (ex: PETR4, WEGE3)..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-[#111827] border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 font-mono transition"
          />
        </div>
        <div className="text-xs text-gray-500 font-mono">
          Total de Ativos Analisados no Crivo: <strong className="text-gray-300">{totalAnalyzed}</strong>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO 1: 🟢 ALTA — COMPRA */}
      {/* ========================================================================= */}
      <div className="bg-[#0f172a] border border-emerald-500/30 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> ALTA — Oportunidades de Compra
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-bold">
              {altaFiltered.length} {altaFiltered.length === 1 ? 'ativo' : 'ativos'}
            </span>
          </div>
          <span className="text-[11px] text-gray-400 font-sans hidden sm:inline">
            Critério: Tendência de Alta ($MM20 &gt; MM50 &gt; MM200$) + Fundamentos Aprovados (CNPI-P)
          </span>
        </div>

        {altaFiltered.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-xs bg-[#111827]/50 rounded-xl border border-dashed border-gray-800">
            Nenhuma operação autorizada nesta direção hoje.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {altaFiltered.map((item) => (
              <div
                key={item.symbol}
                onClick={() => onSelectSymbol && onSelectSymbol(item.symbol)}
                className="bg-[#111827] border border-gray-800 hover:border-emerald-500/50 p-4 rounded-xl transition cursor-pointer hover:shadow-md space-y-3 group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-base font-bold text-white font-mono group-hover:text-emerald-400 transition flex items-center gap-1.5">
                      {item.symbol}
                      <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition" />
                    </span>
                    <span className="text-xs text-gray-400 truncate block max-w-[180px]">
                      {item.shortName}
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-sm font-bold text-white">
                      R$ {item.currentPrice.toFixed(2)}
                    </div>
                    <div
                      className={`text-xs font-semibold ${
                        item.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {item.changePercent >= 0 ? '+' : ''}
                      {item.changePercent.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* Resumo da Operação / Trade Plan */}
                <div className="bg-[#0b1120] p-2.5 rounded-lg border border-gray-800/80 text-xs space-y-1.5 font-mono">
                  {item.tradePlan ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-gray-400">
                        <span>Stop: <strong className="text-red-400">R$ {item.tradePlan.stop.toFixed(2)}</strong></span>
                        <span>Alvo 1: <strong className="text-emerald-400">R$ {item.tradePlan.target1.toFixed(2)}</strong></span>
                        <span>R:R: <strong className="text-cyan-400">{item.tradePlan.riskRewardRatio}:1</strong></span>
                      </div>
                      <div className="text-[10px] text-gray-500 truncate font-sans">
                        {item.optionStructure ? item.optionStructure.title : 'Compra a mercado com plano de trade estrutural.'}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-gray-400">
                      Operação direcional de alta autorizada pelo crivo CNPI-P.
                    </div>
                  )}

                  {item.barrierAlert?.hasAlert && (
                    <div className="text-[10px] text-amber-400 flex items-center gap-1 pt-1 border-t border-gray-800/60 font-sans">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>Preço colado na Call Wall ({item.barrierAlert.topCallWall?.symbol})</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO 2: 🔴 BAIXA — VENDA */}
      {/* ========================================================================= */}
      <div className="bg-[#0f172a] border border-red-500/30 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <h3 className="text-base font-bold text-red-400 flex items-center gap-2">
              <TrendingDown className="w-5 h-5" /> BAIXA — Oportunidades de Venda
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-500/30 font-bold">
              {baixaFiltered.length} {baixaFiltered.length === 1 ? 'ativo' : 'ativos'}
            </span>
          </div>
          <span className="text-[11px] text-gray-400 font-sans hidden sm:inline">
            Critério: Tendência de Baixa ($MM20 &lt; MM50 &lt; MM200$) + Deterioração Contábil
          </span>
        </div>

        {baixaFiltered.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-xs bg-[#111827]/50 rounded-xl border border-dashed border-gray-800">
            Nenhuma operação autorizada nesta direção hoje.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {baixaFiltered.map((item) => (
              <div
                key={item.symbol}
                onClick={() => onSelectSymbol && onSelectSymbol(item.symbol)}
                className="bg-[#111827] border border-gray-800 hover:border-red-500/50 p-4 rounded-xl transition cursor-pointer hover:shadow-md space-y-3 group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-base font-bold text-white font-mono group-hover:text-red-400 transition flex items-center gap-1.5">
                      {item.symbol}
                      <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition" />
                    </span>
                    <span className="text-xs text-gray-400 truncate block max-w-[180px]">
                      {item.shortName}
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-sm font-bold text-white">
                      R$ {item.currentPrice.toFixed(2)}
                    </div>
                    <div
                      className={`text-xs font-semibold ${
                        item.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {item.changePercent >= 0 ? '+' : ''}
                      {item.changePercent.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* Resumo da Operação / Opções de Baixa & Alerta de Aluguel */}
                <div className="bg-[#0b1120] p-2.5 rounded-lg border border-gray-800/80 text-xs space-y-1.5 font-mono">
                  {item.tradePlan ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-gray-400">
                        <span>Stop: <strong className="text-amber-400">R$ {item.tradePlan.stop.toFixed(2)}</strong></span>
                        <span>Alvo 1: <strong className="text-red-400">R$ {item.tradePlan.target1.toFixed(2)}</strong></span>
                        <span>R:R: <strong className="text-cyan-400">{item.tradePlan.riskRewardRatio}:1</strong></span>
                      </div>
                      <div className="text-[10px] text-gray-400 truncate font-sans">
                        {item.optionStructure ? item.optionStructure.title : 'Trava de baixa com opções (Bear Spread).'}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-gray-400">
                      Trava de baixa com opções (sem necessidade de aluguel).
                    </div>
                  )}

                  <div className="text-[10px] text-amber-300/90 flex items-center gap-1 pt-1 border-t border-gray-800/60 font-sans">
                    <ShieldAlert className="w-3 h-3 flex-shrink-0 text-amber-400" />
                    <span className="truncate">Venda à vista exige aluguel (BTC). Prefira travas de opções.</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO 3: 🟣 LATERAL — IRON CONDOR */}
      {/* ========================================================================= */}
      <div className="bg-[#0f172a] border border-purple-500/30 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
            </span>
            <h3 className="text-base font-bold text-purple-400 flex items-center gap-2">
              <Layers className="w-5 h-5" /> LATERAL — Renda com Opções (Iron Condor)
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/30 font-bold">
              {lateralFiltered.length} {lateralFiltered.length === 1 ? 'ativo' : 'ativos'}
            </span>
          </div>
          <span className="text-[11px] text-gray-400 font-sans hidden sm:inline">
            Critério: Mercado Lateral + Balanço Aprovado + IV ATM Real Favorável (DTE 12 a 35 DU)
          </span>
        </div>

        {lateralFiltered.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-xs bg-[#111827]/50 rounded-xl border border-dashed border-gray-800">
            Nenhuma operação autorizada nesta direção hoje.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {lateralFiltered.map((item) => (
              <div
                key={item.symbol}
                onClick={() => onSelectSymbol && onSelectSymbol(item.symbol)}
                className="bg-[#111827] border border-gray-800 hover:border-purple-500/50 p-4 rounded-xl transition cursor-pointer hover:shadow-md space-y-3 group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-base font-bold text-white font-mono group-hover:text-purple-400 transition flex items-center gap-1.5">
                      {item.symbol}
                      <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition" />
                    </span>
                    <span className="text-xs text-gray-400 truncate block max-w-[180px]">
                      {item.shortName}
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-sm font-bold text-white">
                      R$ {item.currentPrice.toFixed(2)}
                    </div>
                    <div
                      className={`text-xs font-semibold ${
                        item.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {item.changePercent >= 0 ? '+' : ''}
                      {item.changePercent.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* Resumo da Estrutura Iron Condor */}
                <div className="bg-[#0b1120] p-2.5 rounded-lg border border-gray-800/80 text-xs space-y-1.5 font-mono">
                  <div className="text-[11px] text-purple-300 font-semibold truncate">
                    {item.optionStructure ? item.optionStructure.title : 'Iron Condor #20 a Crédito (4 Pernas)'}
                  </div>
                  <div className="text-[10px] text-gray-400 flex items-center justify-between">
                    <span>IV Real ATM: ~{item.optionStructure?.dte || 14} DU</span>
                    <span className="text-emerald-400 font-bold">Crédito Institucional</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
