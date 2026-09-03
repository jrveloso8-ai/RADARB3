'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Compass,
  Zap,
  Wheat,
  Activity,
  Target,
  RefreshCw,
  Search,
  Sparkles,
  Layers,
  ArrowUpRight,
  Info,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { safeFetchJson } from '@/lib/utils/api-client';
import { TradeOpportunityItem } from '@/lib/domain/opportunity-radar';
import { AgriCommodityAnalysis } from '@/lib/domain/agri-commodities';

interface OpportunityApiResponse {
  success: boolean;
  totalOpportunities: number;
  highConvictionCount: number;
  totalScanned: number;
  updatedAt: string;
  macroOverview?: {
    brent: { price: number; changePct: number };
    ironOre: { price: number; changePct: number };
    dxy: { price: number; changePct: number };
    vix: { price: number; changePct: number };
    agri?: {
      cornB3Est: { price: number; changePct: number };
      boiB3Est: { price: number; changePct: number };
    };
  };
  agriOverview?: AgriCommodityAnalysis[];
  opportunities: TradeOpportunityItem[];
}

interface StrategyGroup {
  key: string;
  strategyId?: number;
  strategyName: string;
  category: string;
  bias: 'COMPRA' | 'VENDA' | 'LATERAL' | 'VOLATILIDADE';
  description: string;
  whenToUse: string;
  profitProfile?: string;
  items: TradeOpportunityItem[];
}

interface OpportunityRadarViewProps {
  onSelectSymbol?: (symbol: string) => void;
}

export const OpportunityRadarView: React.FC<OpportunityRadarViewProps> = ({ onSelectSymbol }) => {
  const [minScore, setMinScore] = useState<number>(70);
  const [opportunities, setOpportunities] = useState<TradeOpportunityItem[]>([]);
  const [agriList, setAgriList] = useState<AgriCommodityAnalysis[]>([]);
  const [macro, setMacro] = useState<OpportunityApiResponse['macroOverview'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedStrategyFilter, setSelectedStrategyFilter] = useState<string>('ALL');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [showMethodologyGuide, setShowMethodologyGuide] = useState(false);

  const fetchOpportunities = async () => {
    setLoading(true);
    const { ok, data } = await safeFetchJson<OpportunityApiResponse>(
      `/api/opportunities?minScore=${minScore}&limit=60`
    );

    if (ok && data && data.success) {
      setOpportunities(data.opportunities || []);
      setAgriList(data.agriOverview || []);
      setMacro(data.macroOverview || null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOpportunities();
  }, [minScore]);

  // Agrupamento por Estratégia
  const strategyGroups: StrategyGroup[] = useMemo(() => {
    const groupsMap = new Map<string, StrategyGroup>();

    for (const opp of opportunities) {
      let groupKey = 'OUTROS';
      let stratName = opp.title;
      let category = 'Geral';
      let whenToUse = opp.rationale;
      let profitProfile = opp.execution.maxProfitEst;
      let strategyId = opp.matchedStrategyId;

      if (opp.execution.electedStrategy) {
        const strat = opp.execution.electedStrategy;
        groupKey = `STRAT_${strat.id}`;
        stratName = `Estratégia #${strat.id} — ${strat.name}`;
        category = strat.category;
        whenToUse = strat.whenToUse;
        profitProfile = strat.profitProfile;
        strategyId = strat.id;
      } else if (opp.category === 'DIVERGENCIA_TECNICA') {
        groupKey = opp.bias === 'COMPRA' ? 'DIV_BULL' : 'DIV_BEAR';
        stratName = opp.bias === 'COMPRA' ? 'Divergência Altista de Momentum (RSI/MACD)' : 'Divergência Baixista (RSI/MACD)';
        category = 'Direcional';
        whenToUse = 'Reversão de curto prazo identificada por divergência entre oscilador e preço.';
      } else if (opp.category === 'COMMODITIES_MACRO') {
        groupKey = 'MACRO_INTERMARKET';
        stratName = 'Arbitragem Intermarket (Brent / Minério)';
        category = 'Intermarket';
        whenToUse = 'Descolamento entre commodities no exterior e ações correlacionadas na B3.';
      } else if (opp.category === 'COMMODITIES_AGRO') {
        groupKey = 'AGRO_COMMODITIES';
        stratName = 'Commodities Agrícolas (Milho CCM, Boi BGI, Soja)';
        category = 'Agronegócio';
        whenToUse = 'Oportunidades sazonais em contratos futuros agrícolas da B3.';
      }

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          key: groupKey,
          strategyId,
          strategyName: stratName,
          category,
          bias: opp.bias,
          description: opp.rationale,
          whenToUse,
          profitProfile,
          items: [],
        });
      }

      groupsMap.get(groupKey)!.items.push(opp);
    }

    return Array.from(groupsMap.values()).sort((a, b) => {
      if (a.strategyId && b.strategyId) return a.strategyId - b.strategyId;
      if (a.strategyId) return -1;
      if (b.strategyId) return 1;
      return b.items.length - a.items.length;
    });
  }, [opportunities]);

  // Filtragem
  const filteredGroups = useMemo(() => {
    return strategyGroups
      .map((group) => {
        if (selectedStrategyFilter !== 'ALL' && group.key !== selectedStrategyFilter) {
          return null;
        }

        const filteredItems = group.items.filter((item) => {
          if (!searchFilter.trim()) return true;
          const q = searchFilter.toLowerCase();
          return (
            item.symbol.toLowerCase().includes(q) ||
            item.shortName.toLowerCase().includes(q) ||
            item.title.toLowerCase().includes(q) ||
            group.strategyName.toLowerCase().includes(q)
          );
        });

        if (filteredItems.length === 0) return null;

        return {
          ...group,
          items: filteredItems,
        };
      })
      .filter((g): g is StrategyGroup => g !== null);
  }, [strategyGroups, selectedStrategyFilter, searchFilter]);

  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto text-slate-200">
      {/* 1. Header Minimalista & Controles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Compass className="w-5 h-5 text-cyan-400" />
              Radar de Oportunidades
            </h1>
            <span className="text-[11px] text-slate-400 font-mono">
              • 25 Estratégias B3/CME
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Oportunidades quantitativas organizadas por estratégia e setup operacional.
          </p>
        </div>

        {/* Controles: Score Mínimo + Guia + Refresh */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            onClick={() => setShowMethodologyGuide(!showMethodologyGuide)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${
              showMethodologyGuide
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-900/60 text-slate-400 hover:text-white border-slate-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>{showMethodologyGuide ? 'Fechar Guia' : 'Metodologia & Score'}</span>
          </button>

          <div className="flex items-center bg-slate-900/80 px-1 py-0.5 rounded-lg border border-slate-800 text-xs font-mono">
            <span className="text-[10px] text-slate-500 px-1.5">Score:</span>
            {[
              { val: 60, label: '60+' },
              { val: 75, label: '75+' },
              { val: 85, label: '85+ (Top)' },
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => setMinScore(opt.val)}
                className={`px-2 py-0.5 rounded text-xs transition ${
                  minScore === opt.val
                    ? 'bg-cyan-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchOpportunities}
            disabled={loading}
            className="p-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-lg transition disabled:opacity-50"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Guia Metodológico (Colapsável / Clean) */}
      {showMethodologyGuide && (
        <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-4 space-y-3 text-xs shadow-xl animate-in fade-in duration-150">
          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <Info className="w-4 h-4" />
              <span>Diferença entre o Radar Tático e o Estudo Gráfico 12M</span>
            </div>
            <button
              onClick={() => setShowMethodologyGuide(false)}
              className="text-slate-500 hover:text-white text-xs px-1.5 py-0.5 rounded"
            >
              ✕
            </button>
          </div>

          <p className="text-slate-300 leading-relaxed text-[11px]">
            O <strong>Radar Tático</strong> busca <strong>assimetrias e derivativos</strong> (volatilidade, suportes e remuneração de caixa), enquanto o <strong>Gráfico 12M</strong> avalia a tendência primária do ativo à vista ($MM20 / MM50 / MM200$). Por isso, um ativo em consolidação pode gerar renda com opções (ex: <em>The Wheel</em> ou <em>Iron Condor</em>) aqui no Radar.
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-1 font-mono text-[10px]">
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
              <strong className="text-cyan-400 block">1. Técnico (30%)</strong>
              <span className="text-slate-400">Médias móveis e RSI/MACD.</span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
              <strong className="text-emerald-400 block">2. Fundamentos (30%)</strong>
              <span className="text-slate-400">Solvência e Score CNPI-P.</span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
              <strong className="text-yellow-400 block">3. Risco:Retorno (20%)</strong>
              <span className="text-slate-400">Assimetria ($R:R \ge 2:1$).</span>
            </div>
            <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
              <strong className="text-purple-400 block">4. Volatilidade (20%)</strong>
              <span className="text-slate-400">Regime $IV\ Rank$ e prêmios.</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Ticker Bar Compacta de Mercado */}
      {macro && (
        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none text-xs font-mono">
          <div className="flex items-center gap-4 bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 rounded-lg whitespace-nowrap">
            <span className="text-slate-400 text-[11px]">Macro:</span>
            <span>Brent: <strong className="text-white">${macro.brent.price.toFixed(2)}</strong> <span className={macro.brent.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}>({macro.brent.changePct >= 0 ? '+' : ''}{macro.brent.changePct}%)</span></span>
            <span>Minério: <strong className="text-white">${macro.ironOre.price.toFixed(2)}</strong> <span className={macro.ironOre.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}>({macro.ironOre.changePct >= 0 ? '+' : ''}{macro.ironOre.changePct}%)</span></span>
            <span>DXY: <strong className="text-white">{macro.dxy.price.toFixed(2)}</strong></span>
            <span>VIX: <strong className="text-cyan-400">{macro.vix.price.toFixed(2)}</strong></span>
          </div>

          {macro.agri && (
            <div className="flex items-center gap-4 bg-slate-900/60 border border-yellow-500/20 px-3 py-1.5 rounded-lg whitespace-nowrap">
              <span className="text-yellow-400 text-[11px] flex items-center gap-1"><Wheat className="w-3 h-3" /> Agro:</span>
              <span>Milho B3: <strong className="text-white">R$ {macro.agri.cornB3Est.price.toFixed(2)}</strong></span>
              <span>Boi B3: <strong className="text-white">R$ {macro.agri.boiB3Est.price.toFixed(2)}</strong></span>
            </div>
          )}
        </div>
      )}

      {/* 4. Abas de Estratégias & Campo de Busca */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-1">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedStrategyFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition border ${
              selectedStrategyFilter === 'ALL'
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-semibold'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Todas ({opportunities.length})
          </button>

          {strategyGroups.map((group) => (
            <button
              key={group.key}
              onClick={() => setSelectedStrategyFilter(group.key)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition border ${
                selectedStrategyFilter === group.key
                  ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 font-semibold'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {group.strategyId ? `#${group.strategyId} ${group.strategyName.split('—')[1] || group.strategyName}` : group.strategyName} ({group.items.length})
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-48 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrar ticker..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono transition"
          />
        </div>
      </div>

      {/* 5. Painel Compacto de Commodities Agrícolas (se selecionado Agro ou Todas) */}
      {(selectedStrategyFilter === 'ALL' || selectedStrategyFilter === 'AGRO_COMMODITIES') && agriList.length > 0 && (
        <div className="bg-slate-900/40 border border-yellow-500/20 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-yellow-400 flex items-center gap-1.5">
              <Wheat className="w-3.5 h-3.5" /> Radar Agro B3: Sazonalidade & Relação de Troca
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
            {agriList.map((agri) => (
              <div key={agri.id} className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg space-y-1.5">
                <div className="flex justify-between font-mono">
                  <span className="font-semibold text-white">{agri.name}</span>
                  <span className="text-white font-bold">R$ {agri.price.toFixed(2)}</span>
                </div>
                <div className="text-[11px] text-slate-400 flex justify-between">
                  <span>Fase: <strong className="text-yellow-400 font-mono">{agri.seasonality.seasonPhase}</strong></span>
                  {agri.exchangeRatio && (
                    <span>Troca: <strong className="text-cyan-400 font-mono">{agri.exchangeRatio.ratio} sc/@</strong></span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/60 flex items-center gap-1">
                  <span>Ações:</span>
                  {agri.correlatedStocks.map((s) => (
                    <button
                      key={s.symbol}
                      onClick={() => onSelectSymbol && onSelectSymbol(s.symbol)}
                      className="text-cyan-400 hover:text-cyan-300 font-mono font-semibold"
                    >
                      {s.symbol}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Listas Limpas e Nítidas Agrupadas por Estratégia */}
      <div className="space-y-4">
        {filteredGroups.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
            Nenhuma oportunidade preenche os filtros selecionados.
          </div>
        ) : (
          filteredGroups.map((group) => {
            const isCollapsed = !!collapsedGroups[group.key];

            return (
              <div
                key={group.key}
                className="bg-slate-900/60 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm"
              >
                {/* Header da Estratégia */}
                <div
                  onClick={() => toggleGroupCollapse(group.key)}
                  className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 cursor-pointer flex items-center justify-between gap-2 hover:bg-slate-850 transition select-none"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    {group.strategyId && (
                      <span className="px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-semibold">
                        #{group.strategyId}
                      </span>
                    )}
                    <h2 className="text-xs sm:text-sm font-bold text-white">
                      {group.strategyName}
                    </h2>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold uppercase ${
                        group.bias === 'COMPRA'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/20'
                          : group.bias === 'VENDA'
                          ? 'bg-red-950/80 text-red-300 border border-red-500/20'
                          : 'bg-purple-950/80 text-purple-300 border border-purple-500/20'
                      }`}
                    >
                      {group.bias}
                    </span>
                    <span className="text-[11px] text-slate-400 hidden lg:inline">
                      • {group.whenToUse}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 text-[11px] font-mono font-medium border border-cyan-500/20">
                      {group.items.length} {group.items.length === 1 ? 'ativo' : 'ativos'}
                    </span>
                    <button className="text-slate-400 hover:text-white p-0.5">
                      {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Tabela / Lista de Ativos Nítida & Sem Poluição Visual */}
                {!isCollapsed && (
                  <div className="divide-y divide-slate-800/50">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="px-4 py-3 hover:bg-slate-850/40 transition flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs"
                      >
                        {/* 1. Ativo & Cotação */}
                        <div className="min-w-[160px] shrink-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white font-mono text-sm">
                              {item.symbol}
                            </span>
                            <span className="text-[11px] text-slate-400 truncate max-w-[100px]">
                              {item.shortName}
                            </span>
                          </div>
                          <div className="font-mono text-xs mt-0.5 flex items-center gap-2">
                            <span className="text-slate-200 font-semibold">R$ {item.spotPrice.toFixed(2)}</span>
                            <span className={`text-[11px] ${item.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {item.changePct >= 0 ? '+' : ''}{item.changePct.toFixed(2)}%
                            </span>
                          </div>
                        </div>

                        {/* 2. Justificativa Analítica */}
                        <div className="flex-1 text-[11px] text-slate-300 leading-relaxed pr-2">
                          <span className="text-cyan-400 font-semibold font-mono text-[10px] mr-1.5">
                            [TESE]:
                          </span>
                          {item.rationale}
                        </div>

                        {/* 3. Parâmetros de Montagem & Trade Plan */}
                        <div className="min-w-[220px] font-mono text-[11px] space-y-1 bg-slate-950/40 p-2 rounded-lg border border-slate-800/80 shrink-0">
                          <div className="flex justify-between text-slate-400 text-[10px]">
                            <span>Stop: <strong className="text-red-400">R$ {item.execution.stopLoss.toFixed(2)}</strong></span>
                            <span>Alvo: <strong className="text-emerald-400">R$ {item.execution.target1.toFixed(2)}</strong></span>
                            <span>R:R: <strong className="text-cyan-400">{item.execution.riskRewardRatio}:1</strong></span>
                          </div>

                          {item.execution.strategyLegsFormatted && (
                            <div className="text-[10px] text-purple-300 font-sans truncate border-t border-slate-800/60 pt-0.5">
                              {item.execution.strategyLegsFormatted}
                            </div>
                          )}
                        </div>

                        {/* 4. Score & Ação */}
                        <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0">
                          <div className="px-2 py-1 rounded bg-slate-950 border border-cyan-500/20 text-cyan-300 font-mono text-xs font-semibold">
                            Score {item.convictionScore}
                          </div>

                          <button
                            onClick={() => onSelectSymbol && onSelectSymbol(item.symbol)}
                            className="flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition font-mono bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 px-2.5 py-1 rounded-lg"
                          >
                            <span>Gráfico</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
