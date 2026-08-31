'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Search,
  ListFilter,
  Target,
  BookOpen,
  TrendingUp,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Zap,
  Users,
} from 'lucide-react';
import { safeFetchJson } from '@/lib/utils/api-client';
import { BrapiHealthStatus } from '@/lib/services/brapi';
import { SYSTEM_VERSION } from '@/lib/config/version';

export type ActiveTab = 'overview' | 'quote' | 'screener' | 'options' | 'help';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  const [health, setHealth] = useState<BrapiHealthStatus | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [uniqueVisitors, setUniqueVisitors] = useState<number | null>(null);

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
      const analyticsRes = await safeFetchJson<{ uniqueToday: number; totalViewsToday: number }>('/api/analytics/track');
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

  const navItems = [
    {
      id: 'overview' as ActiveTab,
      label: 'Panorama Geral',
      shortLabel: 'Panorama',
      icon: LayoutDashboard,
    },
    {
      id: 'quote' as ActiveTab,
      label: 'Consulta & Gráfico 12M',
      shortLabel: 'Gráfico 12M',
      icon: Search,
    },
    {
      id: 'screener' as ActiveTab,
      label: 'Rastreador de Tendências',
      shortLabel: 'Rastreador',
      icon: ListFilter,
    },
    {
      id: 'options' as ActiveTab,
      label: 'Barreiras de Opções',
      shortLabel: 'Opções',
      icon: Target,
    },
    {
      id: 'help' as ActiveTab,
      label: 'Manual & Ajuda IA',
      shortLabel: 'Ajuda',
      icon: BookOpen,
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-gray-800 bg-[#0b0f19]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
            {/* Logo e Nome da Aplicação */}
            <button
              onClick={() => onTabChange('overview')}
              className="flex items-center gap-2.5 shrink-0 text-left hover:opacity-90 transition group focus:outline-none"
            >
              <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-5 h-5 text-slate-950 font-bold" />
              </div>
              <div className="hidden sm:block">
                <span className="text-base font-black tracking-tight text-white flex items-center gap-1">
                  RADAR B3 <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-mono font-bold">PRO IA</span>
                </span>
                <p className="text-[10px] text-gray-400 font-mono">B3 • BRAPI • CNPI Engine</p>
              </div>
            </button>

            {/* Navegação Desktop e Mobile */}
            <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1 no-scrollbar" role="tablist" aria-label="Navegação Principal">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    data-testid={`nav-tab-${item.id}`}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`panel-${item.id}`}
                    onClick={() => onTabChange(item.id)}
                    className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                      isActive
                        ? item.id === 'help'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-sm'
                        : 'text-gray-300 hover:text-white hover:bg-gray-800/70 border border-transparent'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive
                          ? item.id === 'help'
                            ? 'text-cyan-400'
                            : 'text-emerald-400'
                          : 'text-gray-400'
                      }`}
                    />
                    <span className="hidden md:inline">{item.label}</span>
                    <span className="inline md:hidden">{item.shortLabel}</span>
                  </button>
                );
              })}
            </nav>

            {/* Contador de Acessos, Versão e Indicador de Status */}
            <div className="flex items-center gap-2 shrink-0">
              {uniqueVisitors !== null && uniqueVisitors > 0 && (
                <div
                  className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-[11px] font-mono text-cyan-300 shadow-sm cursor-pointer hover:bg-cyan-900/50 transition"
                  onClick={() => setShowStatusModal(true)}
                  title={`${uniqueVisitors} investidores únicos acessaram o Radar B3 hoje (rastreamento anônimo diário).`}
                >
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  <span><strong>{uniqueVisitors}</strong> {uniqueVisitors === 1 ? 'único' : 'únicos'}</span>
                </div>
              )}

              <div
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-900/80 border border-gray-800 text-[10px] font-mono text-gray-300 shadow-sm cursor-help"
                title={`Publicado em ${SYSTEM_VERSION.fullReleaseString} (${SYSTEM_VERSION.specVersion})`}
              >
                <span className="text-emerald-400 font-bold">{SYSTEM_VERSION.version}</span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-400">{SYSTEM_VERSION.releaseDate}</span>
              </div>

              <button
                onClick={() => setShowStatusModal(true)}
                className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-mono transition shadow-sm ${
                  health?.status === 'ONLINE'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                    : health?.status === 'DEGRADED_NO_TOKEN'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                    : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                }`}
                title="Clique para ver detalhes do status da conexão BRAPI e versão do sistema"
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
                  {uniqueVisitors || 1} {uniqueVisitors === 1 ? 'visitante único' : 'visitantes únicos'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-[#0b0f19] rounded-xl border border-gray-800">
                <span className="text-gray-400">Vercel Web Analytics:</span>
                <span className="text-xs font-mono text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ativo em Tempo Real
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-[#0b0f19] rounded-xl border border-gray-800">
                <span className="text-gray-400">Versão do Sistema:</span>
                <div className="text-right font-mono">
                  <span className="font-bold text-emerald-400 block text-xs">{SYSTEM_VERSION.version} ({SYSTEM_VERSION.build})</span>
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
                <p className="text-gray-400">Feeds de cotações, dados fundamentalistas e matriz de derivativos B3 ativos e sincronizados.</p>
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
