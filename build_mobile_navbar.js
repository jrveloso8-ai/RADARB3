const fs = require('fs');
const path = require('path');

const target = 'C:/projetos antigravity/RADAR-TASYTRADE/src/components/layout/Navbar.tsx';

const navbarCode = `'use client';

import React, { useState } from 'react';
import { 
  Activity, 
  LayoutGrid, 
  Search, 
  TrendingUp, 
  Target, 
  BookOpen, 
  Users, 
  Menu, 
  X,
  Zap
} from 'lucide-react';

export type ActiveTab = 'panorama' | 'consulta' | 'rastreador' | 'barreiras' | 'manual';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  uniqueVisitors?: number | null;
  apiStatus?: { status: string; latencyMs: number };
}

export function Navbar({ 
  activeTab, 
  onTabChange, 
  uniqueVisitors = 3, 
  apiStatus = { status: 'ONLINE', latencyMs: 84 } 
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleTabClick = (tab: ActiveTab) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  const navItems: Array<{ id: ActiveTab; label: string; icon: any; isGex?: boolean }> = [
    { id: 'panorama', label: 'Panorama Geral', icon: LayoutGrid },
    { id: 'consulta', label: 'Consulta & Gráfico 12M', icon: Search },
    { id: 'rastreador', label: 'Rastreador de Tendências', icon: TrendingUp },
    { id: 'barreiras', label: 'Barreiras & Motor GEX', icon: Target, isGex: true },
    { id: 'manual', label: 'Manual & Ajuda IA', icon: BookOpen },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#090e18] border-b border-gray-800/90 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Activity className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base tracking-wider text-white font-mono">RADAR</span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold font-mono rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">TASTY</span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold font-mono rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">PRO IA</span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-bold font-mono rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">+ GEX</span>
              </div>
              <p className="text-[9px] text-gray-400 font-mono tracking-tight hidden sm:block">US • TASTYTRADE • GEX & CNPI-US Engine</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1.5 bg-[#070b14] p-1 rounded-xl border border-gray-800/80">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={\`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 border \${
                  activeTab === item.id
                    ? item.isGex
                      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-sm font-bold'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-sm font-bold'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }\`}
              >
                <item.icon className={\`w-3.5 h-3.5 \${item.isGex ? 'text-cyan-400' : ''}\`} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Right Status Badges & Mobile Menu Button */}
          <div className="flex items-center gap-2">
            {uniqueVisitors && (
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0c1322] border border-gray-800 text-[11px] font-mono text-cyan-300">
                <Users className="w-3 h-3 text-cyan-400" />
                <span><strong>{uniqueVisitors}</strong> únicos</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-700/50 text-emerald-400 text-[10px] sm:text-[11px] font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="hidden sm:inline">TASTYTRADE + DXLink </span>
              <strong className="text-emerald-300">{apiStatus.latencyMs}ms</strong>
            </div>

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-[#0c1322] border border-gray-800 text-gray-300 hover:text-white focus:outline-none focus:border-cyan-500 transition"
              aria-label="Abrir Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-cyan-400" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Slide-down Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#070b14] border-b border-gray-800/90 px-4 pt-3 pb-5 space-y-2 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <div className="text-[10px] font-mono uppercase text-gray-400 px-2 pb-1 border-b border-gray-800/60 flex justify-between items-center">
            <span>Navegação do Radar</span>
            <span className="text-cyan-400">5 Módulos</span>
          </div>

          <div className="grid grid-cols-1 gap-1.5 pt-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={\`w-full px-4 py-3 rounded-xl text-xs font-mono font-medium transition-all flex items-center justify-between border text-left \${
                  activeTab === item.id
                    ? item.isGex
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md font-bold'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/50 shadow-md font-bold'
                    : 'bg-[#090e18] border-gray-800/80 text-gray-300 hover:bg-[#0f172a] hover:text-white'
                }\`}
              >
                <div className="flex items-center gap-3">
                  <div className={\`p-1.5 rounded-lg \${activeTab === item.id ? 'bg-cyan-500/20 text-cyan-300' : 'bg-gray-800/50 text-gray-400'}\`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span>{item.label}</span>
                </div>
                {activeTab === item.id && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                )}
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-gray-800/60 flex justify-between items-center text-[10px] font-mono text-gray-400 px-2">
            <span>v3.2.0 • S&P 500 & Tastytrade</span>
            <span className="text-emerald-400 font-bold">API Conectada</span>
          </div>
        </div>
      )}
    </header>
  );
}
`;

fs.writeFileSync(target, navbarCode.trim(), 'utf8');
console.log('Navbar.tsx updated with full mobile navigation drawer');
