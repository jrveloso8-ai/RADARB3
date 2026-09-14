'use client';

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Search,
  ListFilter,
  Target,
  BookOpen,
  Zap,
  Sparkles,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Cpu,
  BarChart3,
  Compass,
} from 'lucide-react';
import { ActiveTab } from '@/components/layout/Navbar';

interface HomeHubViewProps {
  onSelectModule: (tab: ActiveTab, symbol?: string) => void;
}

export const HomeHubView: React.FC<HomeHubViewProps> = ({ onSelectModule }) => {
  const [searchSymbol, setSearchSymbol] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchSymbol.trim().toUpperCase();
    if (clean) {
      onSelectModule('quote', clean);
    }
  };

  const quickTickers = ['PETR4', 'VALE3', 'ITUB4', 'BBAS3', 'WEGE3', 'PRIO3'];

  const modules = [
    {
      id: 'overview' as ActiveTab,
      title: 'Panorama Geral',
      badge: 'TradingView & Macro',
      badgeColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/30',
      icon: LayoutDashboard,
      iconColor: 'text-cyan-400',
      iconBg: 'bg-cyan-500/10 border-cyan-500/30 group-hover:bg-cyan-500/20 group-hover:border-cyan-400/50',
      description:
        'Visão panorâmica em tempo real dos índices globais, cotações do Ibovespa, moedas internacionais e taxas de juros.',
      highlights: ['Ibovespa & Dólar', 'Widgets TradingView', 'Taxas de Juros & CDI'],
    },
    {
      id: 'opportunities' as ActiveTab,
      title: 'Radar de Oportunidades',
      badge: 'CNPI Multi-Score',
      badgeColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30',
      icon: Target,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10 border-emerald-500/30 group-hover:bg-emerald-500/20 group-hover:border-emerald-400/50',
      description:
        'Algoritmo multicamadas para identificar assimetrias de preço na B3, dividendos projetados e margem de segurança.',
      highlights: ['Score 0 a 100', 'Dividend Yield Projetado', 'Margem Graham & Bazin'],
    },
    {
      id: 'quote' as ActiveTab,
      title: 'Consulta & Gráfico 12M',
      badge: 'Raio-X do Ativo',
      badgeColor: 'text-blue-400 bg-blue-950/60 border-blue-500/30',
      icon: Search,
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-500/10 border-blue-500/30 group-hover:bg-blue-500/20 group-hover:border-blue-400/50',
      description:
        'Análise aprofundada de qualquer ativo: histórico gráfico de 12 meses, múltiplos contábeis, dividendos e valuation.',
      highlights: ['Gráfico Interativo', 'P/L, P/VP e ROE', 'Histórico de Proventos'],
    },
    {
      id: 'screener' as ActiveTab,
      title: 'Rastreador de Tendências',
      badge: 'Screener Multifatorial',
      badgeColor: 'text-purple-400 bg-purple-950/60 border-purple-500/30',
      icon: ListFilter,
      iconColor: 'text-purple-400',
      iconBg: 'bg-purple-500/10 border-purple-500/30 group-hover:bg-purple-500/20 group-hover:border-purple-400/50',
      description:
        'Filtro dinâmico para garimpar ações cruzando indicadores técnicos de momentum (IFR/RSI) com fundamentos e liquidez.',
      highlights: ['Filtros por IFR / RSI', 'Multi-seleção Setorial', 'Triagem de Liquidez'],
    },
    {
      id: 'options' as ActiveTab,
      title: 'Barreiras de Opções',
      badge: 'Derivativos & Max Pain',
      badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-500/30',
      icon: Zap,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10 border-amber-500/30 group-hover:bg-amber-500/20 group-hover:border-amber-400/50',
      description:
        'Mapeamento do volume financeiro de opções, identificando pontos de Max Pain e zonas de suporte/resistência institucional.',
      highlights: ['Cálculo de Max Pain', 'Volume Call vs Put', 'Barreiras de Vencimento'],
    },
    {
      id: 'special-strategies' as ActiveTab,
      title: 'Estratégias Especiais',
      badge: 'Setups Quantitativos',
      badgeColor: 'text-rose-400 bg-rose-950/60 border-rose-500/30',
      icon: Sparkles,
      iconColor: 'text-rose-400',
      iconBg: 'bg-rose-500/10 border-rose-500/30 group-hover:bg-rose-500/20 group-hover:border-rose-400/50',
      description:
        'Modelos táticos para Swing Trade e position: setups de reversão à média, sobrevenda extrema e momentum acelerado.',
      highlights: ['Swing & Position Trade', 'Rastreio de Sobrevenda', 'Assimetria Risco x Retorno'],
    },
    {
      id: 'help' as ActiveTab,
      title: 'Manual & Ajuda IA',
      badge: 'Base de Conhecimento',
      badgeColor: 'text-teal-400 bg-teal-950/60 border-teal-500/30',
      icon: BookOpen,
      iconColor: 'text-teal-400',
      iconBg: 'bg-teal-500/10 border-teal-500/30 group-hover:bg-teal-500/20 group-hover:border-teal-400/50',
      description:
        'Glossário financeiro completo, tutoriais passo a passo sobre cada funcionalidade e assistente interativo de suporte.',
      highlights: ['Guia de Conceitos CNPI', 'Exemplos Práticos', 'Suporte com Dicas IA'],
    },
  ];

  return (
    <div className="space-y-10 pb-8 animate-fadeIn">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-gray-800/80 bg-gradient-to-b from-[#0e1626] via-[#090f1a] to-[#070b14] p-6 sm:p-10 shadow-2xl">
        {/* Elementos de iluminação suave de fundo */}
        <div className="absolute top-0 right-1/4 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            CENTRAL DE INTELIGÊNCIA B3
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Análise Avançada de Ações & Derivativos
          </h1>

          <p className="text-sm sm:text-base text-gray-300 leading-relaxed max-w-2xl mx-auto font-light">
            Selecione uma das ferramentas abaixo para explorar dados em tempo real, rankings quantitativos
            e barreiras de mercado com precisão profissional.
          </p>

          {/* Barra de Busca Rápida de Ativos */}
          <form onSubmit={handleSearch} className="pt-3 max-w-xl mx-auto">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchSymbol}
                onChange={(e) => setSearchSymbol(e.target.value.toUpperCase())}
                placeholder="Digite o código da ação (ex: PETR4, VALE3, WEGE3)..."
                className="w-full pl-12 pr-32 py-3.5 rounded-2xl bg-gray-900/90 border border-gray-700/80 text-white placeholder-gray-500 font-mono text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-inner"
              />
              <button
                type="submit"
                className="absolute right-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-transform active:scale-95 shadow-md shadow-emerald-500/20"
              >
                <span>Consultar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Acesso Rápido a Tickers Populares */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 text-xs text-gray-400">
              <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mr-1">
                Atalhos Rápidos:
              </span>
              {quickTickers.map((ticker) => (
                <button
                  key={ticker}
                  type="button"
                  onClick={() => onSelectModule('quote', ticker)}
                  className="px-2 py-0.5 rounded-md bg-gray-800/80 hover:bg-gray-700 hover:text-emerald-400 text-gray-300 font-mono text-xs border border-gray-700/50 transition cursor-pointer"
                >
                  {ticker}
                </button>
              ))}
            </div>
          </form>
        </div>
      </section>

      {/* Grid de Cards dos Módulos */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <Compass className="w-5 h-5 text-emerald-400" />
            <h2>Módulos do Sistema</h2>
          </div>
          <span className="text-xs text-gray-400 font-mono">7 ferramentas ativas</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                onClick={() => onSelectModule(mod.id)}
                className="group relative flex flex-col justify-between rounded-2xl border border-gray-800/90 bg-[#0c121e]/80 hover:bg-[#0f1726] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-gray-700 hover:shadow-xl hover:shadow-emerald-500/5 cursor-pointer backdrop-blur-sm"
              >
                <div>
                  {/* Topo do Card: Ícone e Badge */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className={`p-3 rounded-2xl border transition-colors ${mod.iconBg}`}>
                      <Icon className={`w-6 h-6 ${mod.iconColor}`} />
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-medium border ${mod.badgeColor}`}>
                      {mod.badge}
                    </span>
                  </div>

                  {/* Título e Descrição */}
                  <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors mb-2">
                    {mod.title}
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed mb-4">
                    {mod.description}
                  </p>

                  {/* Bullet points de destaques */}
                  <div className="space-y-1.5 pt-2 border-t border-gray-800/60 mb-5">
                    {mod.highlights.map((hl, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[11px] text-gray-300 font-mono">
                        <div className="w-1 h-1 rounded-full bg-emerald-400/70" />
                        <span>{hl}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Botão de Ação no Rodapé do Card */}
                <button
                  type="button"
                  className="w-full py-2.5 px-4 rounded-xl bg-gray-800/70 group-hover:bg-emerald-500 group-hover:text-slate-950 text-gray-200 font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 border border-gray-700/60 group-hover:border-emerald-400 shadow-sm"
                >
                  <span>Acessar Módulo</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Faixa Inferior de Governança e Métricas */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="flex items-center gap-3 p-4 rounded-2xl border border-gray-800/70 bg-[#090e18] text-xs">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-white block">Metodologia CNPI</span>
            <span className="text-gray-400 text-[11px]">Scoring por Valuation, Dividendos e Saúde Financeira</span>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-2xl border border-gray-800/70 bg-[#090e18] text-xs">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-white block">Conexão BRAPI V2</span>
            <span className="text-gray-400 text-[11px]">Dados oficiais e cotações em tempo real da B3 S.A.</span>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-2xl border border-gray-800/70 bg-[#090e18] text-xs">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-white block">Matemática de Derivativos</span>
            <span className="text-gray-400 text-[11px]">Max Pain e barreiras de volatilidade institucional</span>
          </div>
        </div>
      </section>
    </div>
  );
};
