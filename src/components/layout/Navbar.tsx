'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Search,
  Layers,
  LayoutDashboard,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Key,
  RefreshCw,
  Bot,
} from 'lucide-react';
import { safeFetchJson } from '@/lib/utils/api-client';
import { BrapiHealthStatus } from '@/lib/services/brapi';

export type ActiveTab = 'overview' | 'quote' | 'screener' | 'options' | 'ai';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  const [health, setHealth] = useState<BrapiHealthStatus | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

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
      shortLabel: 'Tendências',
      icon: TrendingUp,
    },
    {
      id: 'options' as ActiveTab,
      label: 'Barreiras de Opções',
      shortLabel: 'Opções',
      icon: Layers,
    },
    {
      id: 'ai' as ActiveTab,
      label: 'Consultor IA',
      shortLabel: 'Consultor IA',
      icon: Bot,
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-[#0f172a]/95 backdrop-blur shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2">
            {/* Logo & Marca */}
            <div
              className="flex items-center gap-2.5 cursor-pointer shrink-0"
              onClick={() => onTabChange('overview')}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <TrendingUp className="w-5 h-5 text-slate-950 font-bold" />
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-wide text-white">
                    RADAR B3
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/30 font-bold tracking-wider">
                    PRO IA
                  </span>
                </div>
                <p className="text-[9px] text-gray-400 font-medium leading-none mt-0.5">
                  Ações da B3 • Opções CME & IA
                </p>
              </div>
            </div>

            {/* Navegação Central */}
            <nav className="flex items-center justify-center gap-1 sm:gap-2 flex-1 max-w-3xl overflow-x-auto no-scrollbar py-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                      isActive
                        ? item.id === 'ai'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-sm'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 shadow-sm'
                        : 'text-gray-300 hover:text-white hover:bg-gray-800/70 border border-transparent'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive
                          ? item.id === 'ai'
                            ? 'text-purple-400'
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

            {/* Indicador de Status da API BRAPI */}
            <div className="flex items-center shrink-0">
              <button
                onClick={() => setShowStatusModal(true)}
                className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-mono transition shadow-sm ${
                  health?.status === 'ONLINE'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                    : health?.status === 'DEGRADED_NO_TOKEN'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                    : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                }`}
                title="Clique para ver detalhes do status da conexão BRAPI"
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
                  <span className="text-[10px] text-gray-400 hidden lg:inline">
                    {health.latencyMs}ms
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Modal de Diagnóstico da Conexão */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Diagnóstico de Conexão BRAPI</h3>
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
                <span className="text-gray-400">Status Geral:</span>
                <span
                  className={`font-bold font-mono px-2 py-0.5 rounded text-xs ${
                    health?.status === 'ONLINE'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : health?.status === 'DEGRADED_NO_TOKEN'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {health?.status || 'VERIFICANDO...'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-[#0b0f19] rounded-xl border border-gray-800">
                <span className="text-gray-400">Latência:</span>
                <span className="font-mono text-white">{health?.latencyMs || 0} ms</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-[#0b0f19] rounded-xl border border-gray-800">
                <span className="text-gray-400">Chave de Autenticação (Token):</span>
                <span className="font-mono text-xs flex items-center gap-1">
                  {health?.hasApiKey ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Configurada (.env.local)
                    </span>
                  ) : (
                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Não configurada (Modo Gratuito)
                    </span>
                  )}
                </span>
              </div>

              <div className="p-3 bg-[#0b0f19] rounded-xl border border-gray-800 text-xs text-gray-300">
                <p className="font-semibold text-gray-200 mb-1">Mensagem do Servidor:</p>
                <p className="text-gray-400">{health?.message || 'Aguardando diagnóstico...'}</p>
              </div>

              {!health?.hasApiKey && (
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-xs text-cyan-300">
                  <div className="flex items-center gap-1.5 font-semibold text-cyan-200 mb-1">
                    <Key className="w-4 h-4" />
                    Como adicionar seu Token da BRAPI:
                  </div>
                  <p className="text-cyan-300/80">
                    Crie ou edite o arquivo <code className="bg-cyan-950 px-1 py-0.5 rounded font-mono">.env.local</code> na raiz do projeto e insira:
                  </p>
                  <pre className="mt-1.5 p-2 bg-slate-950 rounded border border-cyan-500/30 font-mono text-[11px] text-cyan-400">
                    BRAPI_API_KEY=seu_token_aqui
                  </pre>
                </div>
              )}
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
