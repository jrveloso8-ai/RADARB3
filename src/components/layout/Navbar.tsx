'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Search,
  ListFilter,
  Target,
  BookOpen,
  TrendingUp,
  Activity,
  RefreshCw,
  Zap,
  Users,
  Sparkles,
  Home,
  ChevronDown,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { safeFetchJson } from '@/lib/utils/api-client';
import { BrapiHealthStatus } from '@/lib/services/brapi';
import { SYSTEM_VERSION } from '@/lib/config/version';

export type ActiveTab =
  | 'home'
  | 'overview'
  | 'opportunities'
  | 'quote'
  | 'screener'
  | 'options'
  | 'special-strategies'
  | 'help';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  const [health, setHealth] = useState<BrapiHealthStatus | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showModulesDropdown, setShowModulesDropdown] = useState(false);
  const [uniqueVisitors, setUniqueVisitors] = useState<number | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const checkConnection = async () => {
    setCheckingHealth(true);
    const { ok, data } = await safeFetchJson<BrapiHealthStatus>('/api/health');
    if (ok && data) {
      setHealth(data);
    } else {
      setHealth({
        status: 'OFFLINE',
        hasApiKey: false,
        latencyMs: 0,
        message: 'Não foi possível conectar ao backend ou à BRAPI.',
        testedAt: new Date().toISOString(),
      });
    }

    try {
      const analyticsRes = await safeFetchJson<{ uniqueToday: number; totalViewsToday: number }>(
        '/api/analytics/track'
      );
      if (analyticsRes.ok && analyticsRes.data?.uniqueToday) {
        setUniqueVisitors(analyticsRes.data.uniqueToday);
      }
    } catch {
      // Ignora erro
    }

    setCheckingHealth(false);
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowModulesDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    {
      id: 'overview' as ActiveTab,
      label: 'Panorama Geral',
      shortLabel: 'Panorama',
      badge: 'Macro & TV',
      icon: LayoutDashboard,
      color: 'text-cyan-400',
    },
    {
      id: 'opportunities' as ActiveTab,
      label: 'Radar de Oportunidades',
      shortLabel: 'Radar',
      badge: 'CNPI Score',
      icon: Target,
      color: 'text-emerald-400',
    },
    {
      id: 'quote' as ActiveTab,
      label: 'Consulta & Gráfico 12M',
      shortLabel: 'Gráfico 12M',
      badge: 'Raio-X',
      icon: Search,
      color: 'text-blue-400',
    },
    {
      id: 'screener' as ActiveTab,
      label: 'Rastreador de Tendências',
      shortLabel: 'Screener',
      badge: 'Filtros',
      icon: ListFilter,
      color: 'text-purple-400',
    },
    {
      id: 'options' as ActiveTab,
      label: 'Barreiras de Opções',
      shortLabel: 'Opções',
      badge: 'Max Pain',
      icon: Zap,
      color: 'text-amber-400',
    },
    {
      id: 'special-strategies' as ActiveTab,
      label: 'Estratégias Especiais',
      shortLabel: 'Especiais',
      badge: 'Quant',
      icon: Sparkles,
      color: 'text-rose-400',
    },
    {
      id: 'help' as ActiveTab,
      label: 'Manual & Ajuda IA',
      shortLabel: 'Ajuda',
      badge: 'Guia',
      icon: BookOpen,
      color: 'text-teal-400',
    },
  ];

  const currentModule = navItems.find((item) => item.id === activeTab);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-gray-800 bg-[#0b0f19]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Logo e Nome da Aplicação */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => onTabChange('home')}
                className="flex items-center gap-2.5 shrink-0 text-left hover:opacity-90 transition group focus:outline-none"
                title="Ir para a Central de Módulos"
              >
                <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                  <TrendingUp className="w-5 h-5 text-slate-950 font-bold" />
                </div>
                <div>
                  <span className="text-base font-black tracking-tight text-white flex items-center gap-1">
                    RADAR B3 <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-mono font-bold">PRO IA</span>
                  </span>
                  <p className="text-[10px] text-gray-400 font-mono hidden sm:block">B3 • BRAPI • CNPI Engine</p>
                </div>
              </button>
            </div>

            {/* Navegação Central: Botão Início + Seletor de Módulos */}
            <div className="flex items-center gap-2">
              {/* Botão Central / Início */}
              <button
                onClick={() => onTabChange('home')}
                className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm ${
                  activeTab === 'home'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-emerald-500/10'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800/70 border border-transparent'
                }`}
                title="Página Inicial com visão geral e atalhos de todos os módulos"
              >
                <Home className="w-4 h-4 text-emerald-400" />
                <span>Início</span>
              </button>

              {/* Dropdown Seletor de Módulos */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowModulesDropdown(!showModulesDropdown)}
                  className={`flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border shadow-sm ${
                    activeTab !== 'home'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                      : 'bg-gray-900/80 text-gray-300 border-gray-800 hover:text-white hover:border-gray-700'
                  }`}
                  aria-expanded={showModulesDropdown}
                >
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline">
                    {activeTab === 'home' ? 'Módulos' : currentModule?.shortLabel || 'Módulos'}
                  </span>
                  <span className="inline sm:hidden">
                    {activeTab === 'home' ? 'Menu' : currentModule?.shortLabel || 'Menu'}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 text-gray-400 ${
                      showModulesDropdown ? 'rotate-180 text-emerald-400' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu Flutuante */}
                {showModulesDropdown && (
                  <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-72 sm:w-80 rounded-2xl bg-[#0c121e] border border-gray-800 shadow-2xl p-2 z-50 animate-fadeIn">
                    <div className="px-3 py-2 border-b border-gray-800/80 mb-1 flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-gray-400 font-semibold">
                        Ferramentas Analíticas
                      </span>
                      <button
                        onClick={() => {
                          onTabChange('home');
                          setShowModulesDropdown(false);
                        }}
                        className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <Home className="w-3 h-3" />
                        <span>Central Hub</span>
                      </button>
                    </div>

                    <div className="space-y-1">
                      {navItems.map((item) => {
                        const Icon = item.icon;
                        const isCurrent = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              onTabChange(item.id);
                              setShowModulesDropdown(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition-all ${
                              isCurrent
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'text-gray-300 hover:text-white hover:bg-gray-800/70 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`p-1.5 rounded-lg bg-gray-900 border border-gray-800 ${
                                  isCurrent ? 'border-emerald-500/40 text-emerald-400' : item.color
                                }`}
                              >
                                <Icon className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="block">{item.label}</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-900 text-gray-400 border border-gray-800">
                              {item.badge}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Lado Direito: Telemetria, Versão e Status BRAPI */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Visitantes únicos */}
              {uniqueVisitors !== null && uniqueVisitors > 0 && (
                <div
                  className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-[11px] font-mono text-cyan-300 shadow-sm cursor-pointer hover:bg-cyan-900/50 transition"
                  onClick={() => setShowStatusModal(true)}
                  title={`${uniqueVisitors} investidores únicos acessaram o Radar B3 hoje.`}
                >
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    <strong>{uniqueVisitors}</strong> {uniqueVisitors === 1 ? 'único' : 'únicos'}
                  </span>
                </div>
              )}

              {/* Versão compacta */}
              <div
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-900/80 border border-gray-800 text-[10px] font-mono text-gray-300 shadow-sm cursor-help"
                title={`Publicado em ${SYSTEM_VERSION.fullReleaseString} (${SYSTEM_VERSION.specVersion})`}
              >
                <span className="text-emerald-400 font-bold">{SYSTEM_VERSION.version}</span>
              </div>

              {/* Botão de Status Conexão BRAPI */}
              <button
                onClick={() => setShowStatusModal(true)}
                className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-mono transition shadow-sm ${
                  health?.status === 'ONLINE'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                    : health?.status === 'DEGRADED_NO_TOKEN'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                    : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                }`}
                title="Status da conexão BRAPI e telemetria do sistema"
              >
                <span className="relative flex h-2 w-2">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      health?.status === 'ONLINE'
                        ? 'bg-emerald-400'
                        : health?.status === 'DEGRADED_NO_TOKEN'
                        ? 'bg-amber-400'
                        : 'bg-red-400'
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      health?.status === 'ONLINE'
                        ? 'bg-emerald-500'
                        : health?.status === 'DEGRADED_NO_TOKEN'
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                  />
                </span>

                <span className="font-semibold text-xs hidden sm:inline">
                  {health?.status === 'ONLINE'
                    ? 'BRAPI Conectada'
                    : health?.status === 'DEGRADED_NO_TOKEN'
                    ? 'BRAPI Pública'
                    : 'BRAPI Offline'}
                </span>

                {health?.latencyMs !== undefined && health.latencyMs > 0 && (
                  <span className="text-[10px] text-gray-400 hidden xl:inline">
                    {health.latencyMs}ms
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Modal de Diagnóstico da Conexão e Versão */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Diagnóstico do Sistema & Analytics</h3>
              </div>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-gray-400 hover:text-white text-sm px-2 py-1 rounded-lg hover:bg-gray-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between p-3 bg-[#0b0f19] rounded-xl border border-gray-800">
                <span className="text-gray-400">Investidores Únicos Hoje:</span>
                <span className="font-mono text-cyan-400 font-bold text-xs flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {uniqueVisitors ?? 0} {uniqueVisitors === 1 ? 'visitante único' : 'visitantes únicos'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-[#0b0f19] rounded-xl border border-gray-800">
                <span className="text-gray-400">Rastreamento de Acessos:</span>
                <span className="text-xs font-mono text-gray-300 font-semibold flex items-center gap-1">
                  Telemetria Anônima Local (LGPD)
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-[#0b0f19] rounded-xl border border-gray-800">
                <span className="text-gray-400">Versão do Sistema:</span>
                <div className="text-right font-mono">
                  <span className="font-bold text-emerald-400 block text-xs">
                    {SYSTEM_VERSION.version} ({SYSTEM_VERSION.build})
                  </span>
                  <span className="text-[10px] text-gray-500">{SYSTEM_VERSION.specVersion}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-[#0b0f19] rounded-xl border border-gray-800">
                <span className="text-gray-400">Status dos Dados:</span>
                <span
                  className={`font-bold font-mono px-2.5 py-0.5 rounded-lg text-xs ${
                    health?.status === 'ONLINE'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {health?.status === 'ONLINE' ? 'CONECTADO EM TEMPO REAL' : 'MODO CONSULTA DISPONÍVEL'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-[#0b0f19] rounded-xl border border-gray-800">
                <span className="text-gray-400">Tempo de Resposta:</span>
                <span className="font-mono text-white font-semibold">{health?.latencyMs || 0} ms</span>
              </div>

              <div className="p-3 bg-[#0b0f19] rounded-xl border border-gray-800 text-xs text-gray-300">
                <p className="font-semibold text-gray-200 mb-1">Status Operacional:</p>
                <p className="text-gray-400">
                  Feeds de cotações, dados fundamentalistas e matriz de derivativos B3 ativos e sincronizados.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-800">
              <button
                onClick={checkConnection}
                disabled={checkingHealth}
                className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium px-3 py-1.5 rounded-lg hover:bg-emerald-500/10 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingHealth ? 'animate-spin' : ''}`} />
                <span>Testar Conexão Agora</span>
              </button>
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
