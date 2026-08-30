'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Info,
  CheckCircle2,
  AlertTriangle,
  Key,
  Shield,
  Layers,
  Search,
  ExternalLink,
  Ban,
  Activity,
  SlidersHorizontal,
} from 'lucide-react';
import { ConsolidatedVerdictType, TrendAnalysisResult } from '@/lib/types/financial';
import { safeFetchJson } from '@/lib/utils/api-client';

interface ScreenerResponse {
  type: string;
  totalAnalyzed: number;
  results: TrendAnalysisResult[];
  requiresToken?: boolean;
}

interface ScreenerViewProps {
  onSelectSymbol?: (symbol: string) => void;
}

export const ScreenerView: React.FC<ScreenerViewProps> = ({ onSelectSymbol }) => {
  const [filterVerdict, setFilterVerdict] = useState<string>('ALL');
  const [selectedLimit, setSelectedLimit] = useState<number | 'all'>(60);
  const [results, setResults] = useState<TrendAnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [requiresToken, setRequiresToken] = useState(false);

  const fetchTrends = async (limitToFetch = selectedLimit) => {
    setLoading(true);
    setRequiresToken(false);
    const { ok, data } = await safeFetchJson<ScreenerResponse>(
      `/api/trends?limit=${limitToFetch}`
    );

    if (ok && data) {
      setResults(data.results);
      setRequiresToken(!!data.requiresToken);
    } else {
      setResults([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTrends(selectedLimit);
  }, [selectedLimit]);

  const filteredResults = results.filter((item) => {
    if (filterVerdict === 'ALL') return true;
    if (filterVerdict === 'COMPRA') {
      return (
        item.verdict?.verdict === 'COMPRA_FORTE' ||
        item.verdict?.verdict === 'COMPRA_COM_ALERTA_BARREIRA'
      );
    }
    if (filterVerdict === 'IRON_CONDOR') {
      return item.verdict?.verdict === 'LATERAL_IRON_CONDOR';
    }
    if (filterVerdict === 'AGUARDAR') {
      return item.verdict?.verdict === 'LATERAL_AGUARDAR';
    }
    if (filterVerdict === 'VENDA') {
      return (
        item.verdict?.verdict === 'VENDA_FORTE' ||
        item.verdict?.verdict === 'VENDA_COM_ALERTA_SUPORTE'
      );
    }
    if (filterVerdict === 'BLOQUEADO') {
      return item.verdict?.verdict === 'BLOQUEADO_POR_FUNDAMENTOS';
    }
    return true;
  });

  const countAll = results.length;
  const countCompra = results.filter(
    (i) =>
      i.verdict?.verdict === 'COMPRA_FORTE' ||
      i.verdict?.verdict === 'COMPRA_COM_ALERTA_BARREIRA'
  ).length;
  const countIronCondor = results.filter(
    (i) => i.verdict?.verdict === 'LATERAL_IRON_CONDOR'
  ).length;
  const countAguardar = results.filter(
    (i) => i.verdict?.verdict === 'LATERAL_AGUARDAR'
  ).length;
  const countVenda = results.filter(
    (i) =>
      i.verdict?.verdict === 'VENDA_FORTE' ||
      i.verdict?.verdict === 'VENDA_COM_ALERTA_SUPORTE'
  ).length;
  const countBloqueado = results.filter(
    (i) => i.verdict?.verdict === 'BLOQUEADO_POR_FUNDAMENTOS'
  ).length;

  const renderVerdictBadge = (verdict?: ConsolidatedVerdictType) => {
    switch (verdict) {
      case 'COMPRA_FORTE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/50 font-mono shadow-sm">
            <TrendingUp className="w-3.5 h-3.5" /> COMPRA FORTE
          </span>
        );
      case 'COMPRA_COM_ALERTA_BARREIRA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-500/50 font-mono">
            <AlertTriangle className="w-3.5 h-3.5" /> COMPRA C/ ALERTA CALL
          </span>
        );
      case 'LATERAL_IRON_CONDOR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-950/80 text-purple-300 border border-purple-500/50 font-mono shadow-sm">
            <Layers className="w-3.5 h-3.5 text-purple-400" /> LATERAL (IRON CONDOR)
          </span>
        );
      case 'LATERAL_AGUARDAR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-amber-400 border border-amber-500/30 font-mono">
            <Minus className="w-3.5 h-3.5" /> LATERAL / AGUARDAR
          </span>
        );
      case 'VENDA_FORTE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-950/80 text-red-400 border border-red-500/50 font-mono shadow-sm">
            <TrendingDown className="w-3.5 h-3.5" /> VENDA TÉCNICA
          </span>
        );
      case 'VENDA_COM_ALERTA_SUPORTE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-950/80 text-red-300 border border-red-500/50 font-mono">
            <Shield className="w-3.5 h-3.5" /> VENDA C/ ALERTA PUT
          </span>
        );
      case 'BLOQUEADO_POR_FUNDAMENTOS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-800 text-gray-400 border border-gray-700 font-mono">
            <Ban className="w-3.5 h-3.5 text-gray-500" /> COMPRA BLOQUEADA
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-amber-400 border border-amber-500/30 font-mono">
            <Minus className="w-3.5 h-3.5" /> LATERAL / AGUARDAR
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header do Motor Integrado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white tracking-wide">
              Rastreador de Tendências & Veredito CNPI
            </h2>
            <div className="flex items-center gap-1 text-[11px] text-cyan-400 bg-cyan-950/60 px-2.5 py-0.5 rounded-full border border-cyan-500/30 font-mono">
              <span>Fundamentos (CNPI-P)</span> • <span>Técnico (CNPI-T)</span> • <span>Barreiras OI</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Motor de decisão em 3 camadas: Filtro de Solvência, Alinhamento de Médias e Alertas de Barreiras Institucionais de Opções.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          {/* Seletor de Quantidade de Ativos a Escanear */}
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

      {/* Cards de Filtro por Veredito Consolidado (6 Categorias Independentes) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          onClick={() => setFilterVerdict('ALL')}
          className={`p-3.5 rounded-xl border text-left transition ${
            filterVerdict === 'ALL'
              ? 'bg-[#111827] border-cyan-500 ring-1 ring-cyan-500/50'
              : 'bg-[#0f172a] border-gray-800 hover:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Todos os Ativos</span>
          </div>
          <div className="text-2xl font-bold font-mono text-white">{countAll}</div>
        </button>

        <button
          onClick={() => setFilterVerdict('COMPRA')}
          className={`p-3.5 rounded-xl border text-left transition ${
            filterVerdict === 'COMPRA'
              ? 'bg-[#111827] border-emerald-500 ring-1 ring-emerald-500/50'
              : 'bg-[#0f172a] border-gray-800 hover:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-400 mb-1">
            <span>Compra Aprovada</span>
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{countCompra}</div>
        </button>

        <button
          onClick={() => setFilterVerdict('IRON_CONDOR')}
          className={`p-3.5 rounded-xl border text-left transition ${
            filterVerdict === 'IRON_CONDOR'
              ? 'bg-[#111827] border-purple-500 ring-1 ring-purple-500/50'
              : 'bg-[#0f172a] border-gray-800 hover:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-purple-400 mb-1">
            <span>Iron Condor</span>
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-400">{countIronCondor}</div>
        </button>

        <button
          onClick={() => setFilterVerdict('AGUARDAR')}
          className={`p-3.5 rounded-xl border text-left transition ${
            filterVerdict === 'AGUARDAR'
              ? 'bg-[#111827] border-amber-500 ring-1 ring-amber-500/50'
              : 'bg-[#0f172a] border-gray-800 hover:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-400 mb-1">
            <span>Lateral (Aguardar)</span>
            <Minus className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">{countAguardar}</div>
        </button>

        <button
          onClick={() => setFilterVerdict('VENDA')}
          className={`p-3.5 rounded-xl border text-left transition ${
            filterVerdict === 'VENDA'
              ? 'bg-[#111827] border-red-500 ring-1 ring-red-500/50'
              : 'bg-[#0f172a] border-gray-800 hover:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-red-400 mb-1">
            <span>Venda Técnica</span>
            <TrendingDown className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-bold font-mono text-red-400">{countVenda}</div>
        </button>

        <button
          onClick={() => setFilterVerdict('BLOQUEADO')}
          className={`p-3.5 rounded-xl border text-left transition ${
            filterVerdict === 'BLOQUEADO'
              ? 'bg-[#111827] border-gray-600 ring-1 ring-gray-600/50'
              : 'bg-[#0f172a] border-gray-800 hover:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Bloqueado (Fundam.)</span>
            <Ban className="w-3.5 h-3.5 text-gray-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-gray-400">{countBloqueado}</div>
        </button>
      </div>

      {/* Tabela de Rastreamento com os 3 Pilares e Veredito */}
      <div className="bg-[#0f172a] rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-gray-400 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
            <p className="text-sm">Rastreando universo de ações da B3 e computando vereditos CNPI...</p>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            Nenhum ativo encontrado para o filtro selecionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111827] text-gray-400 border-b border-gray-800 font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4">ATIVO B3</th>
                  <th className="py-3 px-3">PREÇO ATUAL</th>
                  <th className="py-3 px-3">1. FUNDAMENTOS (CNPI-P)</th>
                  <th className="py-3 px-3">2. TÉCNICO (MM20/50/200)</th>
                  <th className="py-3 px-3">3. BARREIRAS DE OPÇÕES</th>
                  <th className="py-3 px-4 text-center">VEREDITO CONSOLIDADO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-mono">
                {filteredResults.map((item) => {
                  const fund = item.fundamentals;
                  const barrier = item.verdict?.barrierAlert;

                  return (
                    <tr
                      key={item.symbol}
                      onClick={() => onSelectSymbol?.(item.symbol)}
                      className="hover:bg-[#1e293b]/50 transition cursor-pointer group"
                    >
                      {/* Ativo */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white group-hover:text-cyan-400 transition">
                            {item.symbol}
                          </span>
                          <ExternalLink className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition" />
                        </div>
                        <span className="text-[10px] text-gray-400 font-sans block truncate max-w-[140px]">
                          {item.shortName || item.symbol}
                        </span>
                      </td>

                      {/* Preço & Variação */}
                      <td className="py-3.5 px-3">
                        <div className="text-white font-bold text-xs">
                          R$ {item.currentPrice.toFixed(2)}
                        </div>
                        <span
                          className={`text-[10px] font-semibold ${
                            item.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {item.changePercent >= 0 ? '+' : ''}
                          {item.changePercent.toFixed(2)}%
                        </span>
                      </td>

                      {/* 1. Fundamentos */}
                      <td className="py-3.5 px-3">
                        {fund ? (
                          <div className="space-y-0.5">
                            <span
                              className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                fund.status === 'APROVADO'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              {fund.status} {fund.score}/100
                            </span>
                            <div className="text-[10px] text-gray-400 font-sans truncate">
                              ROE: {fund.metrics.roe.formatted} • Dív/EBITDA: {fund.metrics.debtToEbitda.formatted}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-[10px]">Sem dados DRE</span>
                        )}
                      </td>

                      {/* 2. Técnico */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-0.5">
                          <span
                            className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              item.trend === 'ALTA'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : item.trend === 'BAIXA'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {item.trend}
                          </span>
                          <div className="text-[10px] text-gray-400 font-sans">
                            MM20: {item.movingAverages.mm20 ? item.movingAverages.mm20.toFixed(2) : '-'} | MM200: {item.movingAverages.mm200 ? item.movingAverages.mm200.toFixed(2) : '-'}
                          </div>
                        </div>
                      </td>

                      {/* 3. Barreiras de Opções */}
                      <td className="py-3.5 px-3">
                        {barrier ? (
                          <div className="text-[11px] space-y-0.5">
                            <div className="text-emerald-400">
                              Call Wall: <strong>R$ {barrier.topCallWall.strike.toFixed(2)}</strong>{' '}
                              <span className="text-[10px] text-gray-400">({barrier.topCallWall.distSpot >= 0 ? '+' : ''}{barrier.topCallWall.distSpot}%)</span>
                            </div>
                            <div className="text-pink-400">
                              Put Wall: <strong>R$ {barrier.topPutWall.strike.toFixed(2)}</strong>{' '}
                              <span className="text-[10px] text-gray-400">({barrier.topPutWall.distSpot}%)</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-[10px]">Sem posições EOD</span>
                        )}
                      </td>

                      {/* Veredito Consolidado */}
                      <td className="py-3.5 px-4 text-center">
                        {renderVerdictBadge(item.verdict?.verdict)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
