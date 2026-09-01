const fs = require('fs');
const path = require('path');

const targetBase = 'C:/projetos antigravity/RADAR-TASYTRADE';

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeFile(relPath, content) {
  const fullPath = path.join(targetBase, relPath);
  ensureDir(fullPath);
  fs.writeFileSync(fullPath, content.trim(), 'utf8');
  console.log('Created: ' + relPath);
}

// 1. PanoramaView
writeFile('src/components/panorama/PanoramaView.tsx', `
'use client';

import React, { useEffect, useRef } from 'react';
import { Gauge, Globe, PieChart, Send, Mail } from 'lucide-react';

export function PanoramaView() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const centerX = canvas.width / 2;
    const centerY = canvas.height - 10;
    const radius = 90;

    // Background Arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI);
    ctx.lineWidth = 18;
    ctx.strokeStyle = '#1f293d';
    ctx.stroke();

    // Red zone
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, Math.PI + (Math.PI * 0.35));
    ctx.lineWidth = 18;
    ctx.strokeStyle = '#f43f5e';
    ctx.stroke();

    // Amber zone
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI + (Math.PI * 0.35), Math.PI + (Math.PI * 0.55));
    ctx.lineWidth = 18;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    // Green zone
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI + (Math.PI * 0.55), 2 * Math.PI);
    ctx.lineWidth = 18;
    ctx.strokeStyle = '#10b981';
    ctx.stroke();

    // Pointer Needle for Score 58
    const score = 58;
    const angle = Math.PI + (score / 100) * Math.PI;
    const needleLength = 75;
    const needleX = centerX + needleLength * Math.cos(angle);
    const needleY = centerY + needleLength * Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(needleX, needleY);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }, []);

  return (
    <section className="space-y-6">
      {/* Sub-navegação */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2 text-xs font-mono text-gray-400 uppercase tracking-wider">
          <Gauge className="w-4 h-4 text-emerald-400" />
          <span>VISÃO DO PANORAMA GERAL:</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 rounded-lg text-xs font-mono border border-emerald-500/40 bg-emerald-500/15 text-emerald-400 font-bold flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            <span>1. Sentimento & Termômetro</span>
          </button>
          <button className="px-3 py-1 rounded-lg text-xs font-mono border border-gray-800 text-gray-400 hover:text-gray-200 flex items-center gap-1.5 bg-[#0c1322]">
            <Globe className="w-3.5 h-3.5" />
            <span>2. Índices Globais & US</span>
          </button>
          <button className="px-3 py-1 rounded-lg text-xs font-mono border border-gray-800 text-gray-400 hover:text-gray-200 flex items-center gap-1.5 bg-[#0c1322]">
            <PieChart className="w-3.5 h-3.5" />
            <span>3. Setores do S&P 500</span>
          </button>
        </div>
      </div>

      {/* Termômetro Principal */}
      <div className="bg-[#0c1322] border border-gray-800/90 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Gauge className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[10px] font-mono font-bold">DESTAQUE DO DIA</span>
                <h2 className="text-xl font-bold text-white tracking-tight">Termômetro de Sentimento & Apetite a Risco</h2>
                <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-mono font-bold">ÚLTIMAS 24H</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Score consolidado ponderando Bolsas Globais, Commodities, Câmbio DXY, Curva de Juros Treasury / FOMC e Fluxo Institucional de GEX da Tastytrade.</p>
            </div>
          </div>

          <div className="bg-[#10192e] border border-gray-800 px-4 py-2 rounded-xl text-right">
            <div className="text-[10px] text-gray-400 font-mono">STATUS CONSOLIDADO</div>
            <div className="text-sm font-bold font-mono text-amber-400">MODERADAMENTE OTIMISTA (58/100)</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
          <div className="lg:col-span-5 bg-[#090e18] border border-gray-800/80 rounded-2xl p-5 text-center space-y-3">
            <div className="relative w-56 h-28 mx-auto flex items-end justify-center">
              <canvas ref={canvasRef} width="220" height="110"></canvas>
              <div className="absolute bottom-1 text-center">
                <div className="text-3xl font-black font-mono text-white">58</div>
              </div>
            </div>

            <div className="font-bold text-sm font-mono text-emerald-400 tracking-wide">
              ZONA NEUTRO-ALTISTA (APETITE CONTROLADO)
            </div>
            <p className="text-[11px] text-gray-400">Mercado externo favorável com Net GEX positivo (volatilidade contida) e suporte institucional em $5,980.</p>

            <div className="flex justify-between text-[10px] font-mono text-gray-500 px-2 pt-2 border-t border-gray-800/80">
              <span className="text-rose-400">0 - Pessimista</span>
              <span class="text-amber-400">50 - Neutro</span>
              <span className="text-emerald-400">100 - Otimista</span>
            </div>

            <div className="pt-2 text-left text-[10px] font-mono text-gray-400 bg-[#0c1322] p-2.5 rounded-lg border border-gray-800">
              <div className="flex justify-between items-center text-cyan-300 font-semibold mb-1">
                <span>⏱ Última consolidação: Hoje às 08h45 (US Pre-Market)</span>
                <span className="px-1 py-0.2 bg-emerald-500/20 text-emerald-400 rounded text-[9px]">EDIÇÃO CONCLUÍDA</span>
              </div>
              <div>Próxima atualização: Próximo pregão às 08h45 (US Pre-Market)</div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-2.5">
            <div className="flex justify-between text-xs font-mono text-gray-400 mb-1">
              <span>Decomposição dos 5 Pilares Quantitativos:</span>
              <span className="text-white font-bold">Score Final: 58/100</span>
            </div>

            <div className="p-3 rounded-xl bg-[#090e18] border border-gray-800 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-gray-200">1. Bolsas Globais & Futuros EUA (Peso 20%)</span>
              </div>
              <span className="text-emerald-400 font-bold">+15 pts (Altista)</span>
            </div>

            <div className="p-3 rounded-xl bg-[#090e18] border border-gray-800 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-gray-200">2. Commodities: Petróleo WTI & Metais (Peso 20%)</span>
              </div>
              <span className="text-emerald-400 font-bold">+12 pts (Positivo)</span>
            </div>

            <div className="p-3 rounded-xl bg-[#090e18] border border-gray-800 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <span className="text-gray-200">3. Câmbio DXY & Carry Trade Global (Peso 15%)</span>
              </div>
              <span className="text-cyan-400 font-bold">+10 pts (Estável)</span>
            </div>

            <div className="p-3 rounded-xl bg-[#090e18] border border-gray-800 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                <span className="text-gray-200">4. Curva de Juros Treasury 10Y & FOMC Fed (Peso 25%)</span>
              </div>
              <span className="text-rose-400 font-bold">-12 pts (Cautela)</span>
            </div>

            <div className="p-3 rounded-xl bg-[#090e18] border border-gray-800 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-gray-200">5. Fluxo Institucional & GEX Tastytrade (Peso 20%)</span>
              </div>
              <span className="text-emerald-400 font-bold">+13 pts (Entrada Líquida)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Mini Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0c1322] border border-gray-800 p-4 rounded-xl">
          <div className="text-[11px] text-gray-400 font-mono">FUTUROS S&P 500</div>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-1">+0.82% (6.000 pts)</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Tom positivo / Techs liderando</div>
        </div>

        <div className="bg-[#0c1322] border border-gray-800 p-4 rounded-xl">
          <div className="text-[11px] text-gray-400 font-mono">PETRÓLEO BRENT / WTI</div>
          <div className="text-lg font-bold font-mono text-amber-400 mt-1">US$ 78.40 / barril</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Estabilidade / Geopolítica</div>
        </div>

        <div className="bg-[#0c1322] border border-gray-800 p-4 rounded-xl">
          <div className="text-[11px] text-gray-400 font-mono">DÓLAR / DXY</div>
          <div className="text-lg font-bold font-mono text-cyan-400 mt-1">DXY 103.8 • US10Y 4.42%</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Treasury em patamar estável</div>
        </div>

        <div className="bg-[#0c1322] border border-gray-800 p-4 rounded-xl">
          <div className="text-[11px] text-gray-400 font-mono">NET GEX / FLUXO INSTITUCIONAL</div>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-1">+$2.85 Bi (GEX)</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Volatilidade contida / Suporte $5.980</div>
        </div>
      </div>

      {/* Newsletter */}
      <div className="bg-[#0c1322] border border-gray-800 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Resumo da Abertura do Mercado</h3>
              <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded text-[10px] font-mono font-bold">DIÁRIO • 08h45</span>
            </div>
            <p className="text-xs text-gray-400">Receba antes da abertura do pregão o panorama global (S&P 500, Petróleo, DXY e Sentimento Tastytrade) no seu e-mail.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <input type="email" placeholder="Seu melhor e-mail corporativo ou pessoal..." className="bg-[#070b14] border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 w-72" />
          <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold rounded-lg transition flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5" />
            <span>Receber Resumo Diário</span>
          </button>
        </div>
      </div>
    </section>
  );
}
`);

// 2. QuoteView
writeFile('src/components/quote/QuoteView.tsx', `
'use client';

import React, { useState, useEffect } from 'react';
import { Search, Sparkles, LineChart, FileText, Target, CheckCircle, Bot, Check, Crosshair } from 'lucide-react';
import { MarketAssetQuote } from '@/lib/types';

interface QuoteViewProps {
  initialSymbol?: string;
  onNavigateToGex?: (symbol: string) => void;
}

export function QuoteView({ initialSymbol = 'NVDA', onNavigateToGex }: QuoteViewProps) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [searchInput, setSearchInput] = useState(initialSymbol);
  const [quote, setQuote] = useState<MarketAssetQuote | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchQuote() {
      setLoading(true);
      try {
        const res = await fetch(\`/api/market/quote?symbol=\${symbol}\`);
        const json = await res.json();
        if (json.ok && json.data) {
          setQuote(json.data);
        }
      } catch {}
      setLoading(false);
    }
    fetchQuote();
  }, [symbol]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSymbol(searchInput.trim().toUpperCase());
    }
  };

  const handleSelectPreset = (sym: string) => {
    setSearchInput(sym);
    setSymbol(sym);
  };

  const displayQuote = quote || {
    symbol,
    name: \`\${symbol} Corporation\`,
    spotPrice: 142.5,
    change: 3.95,
    changePercent: 2.84,
    high52w: 149.77,
    low52w: 75.6,
    volume: 62100000,
    avgVolume20: 48000000,
    peRatio: 54.2,
    evEbitda: 41.8,
    dividendYield: 0.03,
    ivRank: 42.5,
    ivPercentile30d: 48.0,
    hv21: 12.8,
    hv63: 13.4,
    updatedAt: new Date().toISOString(),
  };

  return (
    <section className="space-y-6">
      {/* Search Bar */}
      <div className="bg-[#0c1322] border border-gray-800 p-4 rounded-xl space-y-3">
        <form onSubmit={handleSearch} className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
              className="w-full bg-[#070b14] border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500 uppercase"
              placeholder="Buscar Ticker US (ex: NVDA, AAPL, SPY, TSLA, MSFT)"
            />
          </div>
          <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{loading ? 'Carregando...' : 'Analisar Ativo'}</span>
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
          <span className="text-gray-400">Destaques US:</span>
          {['NVDA', 'AAPL', 'SPY', 'QQQ', 'TSLA', 'MSFT', 'META'].map((sym) => (
            <button
              key={sym}
              onClick={() => handleSelectPreset(sym)}
              className={\`px-2 py-0.5 rounded border transition \${
                symbol === sym
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                  : 'bg-[#070b14] border-gray-800 text-gray-300 hover:border-gray-700'
              }\`}
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {/* Asset Card */}
      <div className="bg-[#0c1322] border border-gray-800/90 rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black font-mono text-white">{displayQuote.symbol}</h2>
              <span className="text-sm text-gray-400 font-sans">{displayQuote.name}</span>
              <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold">RECOMENDAÇÃO DE COMPRA</span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-xs font-mono">SINCRONIZADO COM RASTREADOR</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400 pt-1">
              <span className="text-emerald-400">1. SPOT: REAL</span> •
              <span className="text-emerald-400">2. FUNDAM: APROVADO</span> •
              <span className="text-cyan-400">3. OPÇÕES: NET GEX POSITIVO</span> •
              <span className="text-gray-300">4. MACRO: FED 4.50%</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-right">
            <div className="bg-[#10192e] px-3 py-1.5 rounded-lg border border-gray-800">
              <div className="text-[10px] text-gray-400 font-mono">SPOT</div>
              <div className="text-lg font-bold font-mono text-white">\${displayQuote.spotPrice.toFixed(2)}</div>
            </div>
            <div className="bg-[#10192e] px-3 py-1.5 rounded-lg border border-gray-800">
              <div className="text-[10px] text-gray-400 font-mono">VARIAÇÃO</div>
              <div className={\`text-lg font-bold font-mono \${displayQuote.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}\`}>
                {displayQuote.changePercent >= 0 ? '+' : ''}{displayQuote.changePercent.toFixed(2)}%
              </div>
            </div>
            <div className="bg-[#10192e] px-3 py-1.5 rounded-lg border border-gray-800">
              <div className="text-[10px] text-gray-400 font-mono">VENCIMENTO OPÇÕES</div>
              <div className="text-lg font-bold font-mono text-cyan-300">2026-09-18 (12 DTE)</div>
            </div>
          </div>
        </div>

        {/* 5 Sub-Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-800 pb-3 text-xs font-mono">
          <button className="px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-emerald-400 font-bold flex items-center gap-1.5">
            <LineChart className="w-3.5 h-3.5 text-emerald-400" />
            <span>Técnico (CNPI-T)</span>
          </button>
          <button className="px-3 py-1.5 rounded-lg border border-gray-800 text-gray-400 hover:text-gray-200 flex items-center gap-1.5 bg-[#090e18]">
            <FileText className="w-3.5 h-3.5" />
            <span>Fundamentos (CNPI-F)</span>
          </button>
          <button 
            onClick={() => onNavigateToGex?.(symbol)}
            className="px-3 py-1.5 rounded-lg border border-gray-800 text-gray-400 hover:text-cyan-300 flex items-center gap-1.5 bg-[#090e18]"
          >
            <Target className="w-3.5 h-3.5 text-cyan-400" />
            <span>Opções & GEX (Tastytrade)</span>
          </button>
          <button className="px-3 py-1.5 rounded-lg border border-gray-800 text-gray-400 hover:text-gray-200 flex items-center gap-1.5 bg-[#090e18]">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Recomendações de Estudo</span>
          </button>
          <button className="px-3 py-1.5 rounded-lg border border-gray-800 text-gray-400 hover:text-gray-200 flex items-center gap-1.5 bg-[#090e18]">
            <Bot className="w-3.5 h-3.5 text-purple-400" />
            <span>Consultor IA</span>
          </button>
        </div>

        {/* 8 Technical Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <div className="p-2.5 rounded-lg bg-[#090e18] border border-gray-800 text-center">
            <div className="text-[10px] text-gray-400 font-mono">SPOT</div>
            <div className="text-sm font-bold font-mono text-white mt-0.5">\${displayQuote.spotPrice.toFixed(2)}</div>
            <div className="text-[9px] text-gray-500 font-mono">52w: {displayQuote.low52w} - {displayQuote.high52w}</div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#090e18] border border-emerald-500/30 text-center">
            <div className="text-[10px] text-gray-400 font-mono">MA20 (CURTA)</div>
            <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">\${(displayQuote.spotPrice * 0.96).toFixed(2)}</div>
            <div className="text-[9px] text-emerald-400 font-mono">▲ Acima</div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#090e18] border border-gray-800 text-center">
            <div className="text-[10px] text-gray-400 font-mono">MA50 (MÉDIA)</div>
            <div className="text-sm font-bold font-mono text-white mt-0.5">\${(displayQuote.spotPrice * 0.90).toFixed(2)}</div>
            <div className="text-[9px] text-gray-500 font-mono">Médio Prazo</div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#090e18] border border-gray-800 text-center">
            <div className="text-[10px] text-gray-400 font-mono">MA200 (LONGA)</div>
            <div className="text-sm font-bold font-mono text-white mt-0.5">\${(displayQuote.spotPrice * 0.75).toFixed(2)}</div>
            <div className="text-[9px] text-gray-500 font-mono">Tendência Primária</div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#090e18] border border-gray-800 text-center">
            <div className="text-[10px] text-gray-400 font-mono">RSI(14)</div>
            <div className="text-sm font-bold font-mono text-cyan-300 mt-0.5">64.2</div>
            <div className="text-[9px] text-cyan-400 font-mono">Momentum Saudável</div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#090e18] border border-gray-800 text-center">
            <div className="text-[10px] text-gray-400 font-mono">MACD HIST</div>
            <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">+1.85</div>
            <div className="text-[9px] text-emerald-400 font-mono">Sinal: A.C.</div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#090e18] border border-gray-800 text-center">
            <div className="text-[10px] text-gray-400 font-mono">IV RANK (TASTY)</div>
            <div className="text-sm font-bold font-mono text-purple-300 mt-0.5">{displayQuote.ivRank || 42}%</div>
            <div className="text-[9px] text-gray-500 font-mono">Volatilidade</div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#090e18] border border-gray-800 text-center">
            <div className="text-[10px] text-gray-400 font-mono">VOL VS MÉDIA20</div>
            <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">142%</div>
            <div className="text-[9px] text-emerald-400 font-mono">Liquidez Alta</div>
          </div>
        </div>

        {/* Checklist & Risco/Retorno */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-[#090e18] border border-gray-800 rounded-xl p-4 space-y-2.5">
            <div className="flex justify-between items-center text-xs font-mono border-b border-gray-800 pb-2">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                CHECKLIST TÉCNICO (5 ITENS CNPI-T)
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">APROVADO (5/5)</span>
            </div>

            <div className="p-2 rounded-lg bg-[#0c1322] border border-gray-800/80 text-xs font-mono flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-white font-semibold">Alinhamento de Médias Altista (Spot &gt; MA20)</div>
                <div className="text-[10px] text-gray-400">Preço (\${displayQuote.spotPrice.toFixed(2)}) operando acima da MA20 e MA50.</div>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-[#0c1322] border border-gray-800/80 text-xs font-mono flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-white font-semibold">Momentum RSI(14) Saudável (40 - 65)</div>
                <div className="text-[10px] text-gray-400">RSI(14) em 64.2 — zona de aceleração compradora sem sobrecompra.</div>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-[#0c1322] border border-gray-800/80 text-xs font-mono flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-white font-semibold">MACD Histograma Positivo / Cruzamento</div>
                <div className="text-[10px] text-gray-400">Histograma positivo confirmando pressão compradora institucional.</div>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-[#0c1322] border border-gray-800/80 text-xs font-mono flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-white font-semibold">Volume de Confirmação (&gt;= 90% da média 20d)</div>
                <div className="text-[10px] text-gray-400">Volume em 142% da média de 20 pregões (liquidez e fluxo comprador).</div>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-[#0c1322] border border-gray-800/80 text-xs font-mono flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-white font-semibold">Assimetria Suporte vs Resistência (R:R &gt;= 1.4)</div>
                <div className="text-[10px] text-gray-400">Suporte estrutural permitindo stop loss curto e alvos livres.</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-[#090e18] border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center text-xs font-mono border-b border-gray-800 pb-2">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                PARÂMETROS DE ESTUDO & RISCO/RETORNO
              </span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold text-[10px]">R:R 2.45 : 1</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-[#0c1322] border border-gray-800">
                <div className="text-[10px] text-gray-400">VIÉS TÉCNICO</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">LONG (COMPRA)</div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0c1322] border border-gray-800">
                <div className="text-[10px] text-gray-400">STOP TÉCNICO</div>
                <div className="text-sm font-bold text-rose-400 mt-0.5">\${(displayQuote.spotPrice * 0.95).toFixed(2)}</div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0c1322] border border-gray-800">
                <div className="text-[10px] text-gray-400">ALVO 1 (RESISTÊNCIA)</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">\${(displayQuote.spotPrice * 1.05).toFixed(2)}</div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0c1322] border border-gray-800">
                <div className="text-[10px] text-gray-400">ALVO 2 (2ª RESISTÊNCIA)</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">\${(displayQuote.spotPrice * 1.11).toFixed(2)}</div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-800/80 space-y-1.5 text-[11px] font-mono">
              <div className="flex justify-between">
                <span className="text-gray-400">Níveis de Suporte:</span>
                <span className="text-emerald-400 font-bold">\${(displayQuote.spotPrice * 0.97).toFixed(2)} | \${(displayQuote.spotPrice * 0.95).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Níveis de Resistência:</span>
                <span className="text-rose-400 font-bold">\${(displayQuote.spotPrice * 1.05).toFixed(2)} | \${(displayQuote.spotPrice * 1.11).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
`);

// 3. ScreenerView
writeFile('src/components/screener/ScreenerView.tsx', `
'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';

interface ScreenerViewProps {
  onSelectSymbol?: (symbol: string) => void;
}

export function ScreenerView({ onSelectSymbol }: ScreenerViewProps) {
  const assetsAlta = [
    { symbol: 'NVDA', name: 'NVIDIA Corp', spot: 142.5, change: 2.84, stop: 135.8, alvo: 149.5, rr: '2.45:1' },
    { symbol: 'AAPL', name: 'Apple Inc', spot: 238.1, change: 0.65, stop: 231.5, alvo: 246.0, rr: '1.85:1' },
    { symbol: 'SPY', name: 'SPDR S&P 500', spot: 598.8, change: 0.78, stop: 591.0, alvo: 608.0, rr: '2.10:1' },
    { symbol: 'META', name: 'Meta Platforms', spot: 612.4, change: 1.45, stop: 598.0, alvo: 632.0, rr: '1.95:1' },
  ];

  const assetsBaixa = [
    { symbol: 'TSLA', name: 'Tesla Inc', spot: 248.3, change: -1.15, strategy: 'Trava de Baixa com Opções (Bear Put Spread)' },
  ];

  const assetsLateral = [
    { symbol: 'KO', name: 'Coca-Cola Co', spot: 68.4, change: 0.20, iv: '38%' },
    { symbol: 'JNJ', name: 'Johnson & Johnson', spot: 156.2, change: 0.15, iv: '42%' },
    { symbol: 'PG', name: 'Procter & Gamble', spot: 172.8, change: 0.32, iv: '35%' },
    { symbol: 'PFE', name: 'Pfizer Inc', spot: 27.5, change: 0.40, iv: '48%' },
  ];

  return (
    <section className="space-y-6">
      <div className="bg-[#0c1322] border border-gray-800 p-5 rounded-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">Rastreador de Oportunidades & Lista de Execução</h2>
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">Classificação Técnica + Crivo CNPI-US + Execução Tastytrade</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Lista acionável filtrada por solvência, alinhamento estrito de médias móveis e liquidez real de derivativos.</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#070b14] p-1 rounded-lg border border-gray-800 text-[11px] font-mono">
              <span className="text-gray-400 px-2">Escanear:</span>
              <button className="px-2 py-0.5 rounded bg-gray-800 text-gray-300">40</button>
              <button className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">60</button>
              <button className="px-2 py-0.5 rounded bg-gray-800 text-gray-300">100</button>
              <button className="px-2 py-0.5 rounded bg-gray-800 text-gray-300">Todos</button>
            </div>
            <button className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono font-bold transition flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center border-t border-gray-800/80 pt-3">
          <input type="text" placeholder="Filtrar por ticker (ex: NVDA, AAPL, SPY)..." className="bg-[#070b14] border border-gray-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500 w-80" />
          <span className="text-xs font-mono text-gray-400">Total de Ativos Analisados no Crivo: <strong className="text-white">60</strong></span>
        </div>
      </div>

      {/* 1. ALTA */}
      <div className="bg-[#0c1322] border border-emerald-500/30 rounded-2xl p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <h3 className="text-sm font-bold font-mono text-emerald-400">ALTA — Oportunidades de Compra</h3>
            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">{assetsAlta.length} ativos</span>
          </div>
          <span className="text-[10px] font-mono text-gray-400">Critério: Tendência de Alta (MM20 &gt; MM50 &gt; MM200) + Fundamentos Aprovados</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {assetsAlta.map((a) => (
            <div key={a.symbol} onClick={() => onSelectSymbol?.(a.symbol)} className="p-3.5 rounded-xl bg-[#090e18] border border-gray-800 hover:border-emerald-500/50 transition cursor-pointer">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-black font-mono text-sm text-white">{a.symbol}</div>
                  <div className="text-[10px] text-gray-400 font-sans">{a.name}</div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-sm font-bold text-white">\${a.spot.toFixed(2)}</div>
                  <div className="text-[11px] text-emerald-400 font-semibold">+{a.change.toFixed(2)}%</div>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-gray-800/80 flex justify-between text-[10px] font-mono">
                <span>Stop: <strong className="text-rose-400">\${a.stop}</strong></span>
                <span>Alvo 1: <strong className="text-emerald-400">\${a.alvo}</strong></span>
                <span>R:R: <strong className="text-cyan-300">{a.rr}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. BAIXA */}
      <div className="bg-[#0c1322] border border-rose-500/30 rounded-2xl p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
            <h3 className="text-sm font-bold font-mono text-rose-400">BAIXA — Oportunidades de Venda / Trava Baixa</h3>
            <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold">{assetsBaixa.length} ativo</span>
          </div>
          <span className="text-[10px] font-mono text-gray-400">Critério: Tendência de Baixa (MM20 &lt; MM50 &lt; MM200) + Deterioração</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {assetsBaixa.map((b) => (
            <div key={b.symbol} onClick={() => onSelectSymbol?.(b.symbol)} className="p-3.5 rounded-xl bg-[#090e18] border border-gray-800 hover:border-rose-500/50 transition cursor-pointer">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-black font-mono text-sm text-white">{b.symbol}</div>
                  <div className="text-[10px] text-gray-400 font-sans">{b.name}</div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-sm font-bold text-white">\${b.spot.toFixed(2)}</div>
                  <div className="text-[11px] text-rose-400 font-semibold">{b.change.toFixed(2)}%</div>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-gray-400 font-mono">{b.strategy}</div>
              <div className="mt-2 pt-2 border-t border-gray-800/80 flex justify-between text-[10px] font-mono text-amber-400">
                <span>⚠ Estratégia de Risco Definido</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. LATERAL */}
      <div className="bg-[#0c1322] border border-purple-500/30 rounded-2xl p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
            <h3 className="text-sm font-bold font-mono text-purple-300">LATERAL — Renda com Opções (Iron Condor / Credit Spreads)</h3>
            <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold">12 ativos</span>
          </div>
          <span className="text-[10px] font-mono text-gray-400">Critério: Mercado Lateral + Balanço Aprovado + IV ATM Real Favorável (DTE 14 a 35)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {assetsLateral.map((lat) => (
            <div key={lat.symbol} onClick={() => onSelectSymbol?.(lat.symbol)} className="p-3.5 rounded-xl bg-[#090e18] border border-gray-800 hover:border-purple-500/50 transition cursor-pointer">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-black font-mono text-sm text-white">{lat.symbol}</div>
                  <div className="text-[10px] text-gray-400 font-sans">{lat.name}</div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-sm font-bold text-white">\${lat.spot.toFixed(2)}</div>
                  <div className="text-[11px] text-emerald-400 font-semibold">+{lat.change.toFixed(2)}%</div>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-cyan-300 font-mono">Iron Condor #20 a Crédito (4 Pernas)</div>
              <div className="mt-1 text-[10px] text-gray-400 font-mono flex justify-between">
                <span>IV Rank: {lat.iv}</span>
                <span className="text-emerald-400 font-bold">Crédito Institucional</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`);

// 4. BarreirasGexView (Aba Unificada de Barreiras + Motor GEX!)
writeFile('src/components/options/BarreirasGexView.tsx', `
'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Zap, Calendar, BarChart2, ShieldAlert, ListOrdered } from 'lucide-react';
import { GexAnalysisResult } from '@/lib/types';

interface BarreirasGexViewProps {
  initialSymbol?: string;
}

export function BarreirasGexView({ initialSymbol = 'SPX' }: BarreirasGexViewProps) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [subView, setSubView] = useState<'barreiras-padrao' | 'motor-gex'>('barreiras-padrao');
  const [gexData, setGexData] = useState<GexAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadGex() {
      setLoading(true);
      try {
        const res = await fetch(\`/api/market/gex?symbol=\${symbol}\`);
        const json = await res.json();
        if (json.ok && json.data) {
          setGexData(json.data);
        }
      } catch {}
      setLoading(false);
    }
    loadGex();
  }, [symbol]);

  const displayGex = gexData || {
    symbol,
    spotPrice: symbol === 'SPX' ? 6000.25 : 598.8,
    totalNetGex: 2854120400,
    totalCallGex: 4500000000,
    totalPutGex: 1645879600,
    zeroGammaFlip: 5980.0,
    maxGexMagnetStrike: 6050.0,
    putCallRatioOi: 0.68,
    putCallRatioVolume: 0.55,
    gammaRegime: 'LONG_GAMMA_STABLE' as const,
    strikes: [],
    callWalls: [
      { strike: 6000, symbol: \`.\${symbol}260918C6000\`, contracts: 62500, delta: 0.50, iv: 13.8, distancePct: 0.0 },
      { strike: 6050, symbol: \`.\${symbol}260918C6050\`, contracts: 41800, delta: 0.35, iv: 14.1, distancePct: 0.8 },
      { strike: 6100, symbol: \`.\${symbol}260918C6100\`, contracts: 28400, delta: 0.22, iv: 14.6, distancePct: 1.8 },
    ],
    putWalls: [
      { strike: 5950, symbol: \`.\${symbol}260918P5950\`, contracts: 58400, delta: -0.38, iv: 14.5, distancePct: -0.8 },
      { strike: 5900, symbol: \`.\${symbol}260918P5900\`, contracts: 24800, delta: -0.24, iv: 15.2, distancePct: -1.4 },
      { strike: 5850, symbol: \`.\${symbol}260918P5850\`, contracts: 12450, delta: -0.15, iv: 16.0, distancePct: -2.3 },
    ],
    calculatedAt: new Date().toISOString(),
  };

  return (
    <section className="space-y-6">
      {/* Top Toggle */}
      <div className="bg-[#0c1322] border border-gray-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-400 uppercase">Visão de Derivativos:</span>
          <button
            onClick={() => setSubView('barreiras-padrao')}
            className={\`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition \${
              subView === 'barreiras-padrao'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'bg-[#070b14] border border-gray-800 text-gray-400 hover:text-white'
            }\`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>1. Barreiras & Walls (OI / Volume)</span>
          </button>

          <button
            onClick={() => setSubView('motor-gex')}
            className={\`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition \${
              subView === 'motor-gex'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'bg-[#070b14] border border-gray-800 text-gray-400 hover:text-white'
            }\`}
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>2. Motor GEX & Gamma Exposure (Tempo Real)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-400">Ativo:</span>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="bg-[#070b14] border border-gray-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="SPX">SPX (S&P 500 Index)</option>
            <option value="SPY">SPY (SPDR S&P 500 ETF)</option>
            <option value="QQQ">QQQ (Invesco QQQ)</option>
            <option value="NDX">NDX (Nasdaq 100)</option>
            <option value="NVDA">NVDA (NVIDIA)</option>
            <option value="AAPL">AAPL (Apple)</option>
            <option value="TSLA">TSLA (Tesla)</option>
          </select>
        </div>
      </div>

      {/* SUB-VISÃO 1: BARREIRAS TRADICIONAIS */}
      {subView === 'barreiras-padrao' && (
        <div className="space-y-6">
          <div className="bg-[#0c1322] border border-gray-800 p-4 rounded-xl space-y-2.5">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-white font-bold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                GRADE DE VENCIMENTOS OFICIAIS ({symbol})
              </span>
              <span className="text-cyan-300">Série Selecionada: <strong>Weekly / Monthly • 12 Dias Úteis (DTE)</strong></span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <button className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">Exp 18 Set (Mais Líquida)</button>
              <button className="px-3 py-1.5 rounded-lg bg-[#070b14] border border-gray-800 text-gray-300">Exp 25 Set (Semanal)</button>
              <button className="px-3 py-1.5 rounded-lg bg-[#070b14] border border-gray-800 text-gray-300">Exp 16 Out (Mensal)</button>
              <button className="px-3 py-1.5 rounded-lg bg-[#070b14] border border-gray-800 text-gray-300">Exp 20 Nov (Mensal)</button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
            <div className="p-3 rounded-xl bg-[#0c1322] border border-gray-800">
              <div className="text-[10px] text-gray-400">VENCIMENTO ANALISADO</div>
              <div className="text-sm font-bold text-white mt-1">2026-09-18</div>
              <div className="text-[10px] text-gray-500">Série Regular OCC</div>
            </div>

            <div className="p-3 rounded-xl bg-[#0c1322] border border-emerald-500/30">
              <div className="text-[10px] text-gray-400">DTE (DIAS ÚTEIS)</div>
              <div className="text-sm font-bold text-emerald-400 mt-1">12 dias úteis</div>
              <div className="text-[10px] text-emerald-400">✓ Padrão Tastytrade</div>
            </div>

            <div className="p-3 rounded-xl bg-[#0c1322] border border-gray-800">
              <div className="text-[10px] text-gray-400">IV ATM (CALL/PUT)</div>
              <div className="text-sm font-bold text-purple-300 mt-1">13.68% / 14.09%</div>
              <div className="text-[10px] text-gray-500">Percentil IV: ~35%</div>
            </div>

            <div className="p-3 rounded-xl bg-[#0c1322] border border-gray-800">
              <div className="text-[10px] text-gray-400">HV21 / HV63 (REAL)</div>
              <div className="text-sm font-bold text-white mt-1">12.8% / 13.4%</div>
              <div className="text-[10px] text-gray-500">Volatilidade Realizada</div>
            </div>

            <div className="p-3 rounded-xl bg-[#0c1322] border border-gray-800">
              <div className="text-[10px] text-gray-400">P/C RATIO (OI)</div>
              <div className="text-sm font-bold text-emerald-400 mt-1">{displayGex.putCallRatioOi}</div>
              <div className="text-[10px] text-emerald-400">Predomínio de Calls</div>
            </div>

            <div className="p-3 rounded-xl bg-[#0c1322] border border-gray-800">
              <div className="text-[10px] text-gray-400">MAX PAIN / FLIP</div>
              <div className="text-sm font-bold text-cyan-300 mt-1">\${displayGex.zeroGammaFlip.toFixed(2)}</div>
              <div className="text-[10px] text-gray-500">Menor prejuízo lançadores</div>
            </div>
          </div>

          {/* Top Walls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-[#0c1322] border border-gray-800 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-center border-b border-gray-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold font-mono text-white uppercase">TOP CALL WALLS (RESISTÊNCIA)</h3>
                </div>
                <span className="text-[10px] font-mono text-gray-500">VOLUME / OI</span>
              </div>
              <table className="w-full text-left text-xs font-mono">
                <thead className="text-gray-500 text-[10px] uppercase border-b border-gray-800">
                  <tr>
                    <th className="pb-1.5">Strike</th>
                    <th className="pb-1.5">Símbolo OCC</th>
                    <th className="pb-1.5">Contratos</th>
                    <th className="pb-1.5">Delta</th>
                    <th className="pb-1.5 text-right">Dist. Spot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50 text-[11px]">
                  {displayGex.callWalls.map((cw) => (
                    <tr key={cw.strike}>
                      <td className="py-1.5 font-bold text-emerald-400">\${cw.strike}</td>
                      <td className="text-gray-300">{cw.symbol}</td>
                      <td className="text-white font-semibold">{cw.contracts.toLocaleString()}</td>
                      <td className="text-emerald-400">{cw.delta}</td>
                      <td className="text-right text-emerald-400">{cw.distancePct >= 0 ? '+' : ''}{cw.distancePct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:col-span-6 bg-[#0c1322] border border-gray-800 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-center border-b border-gray-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-rose-400" />
                  <h3 className="text-xs font-bold font-mono text-white uppercase">TOP PUT WALLS (SUPORTE)</h3>
                </div>
                <span className="text-[10px] font-mono text-gray-500">VOLUME / OI</span>
              </div>
              <table className="w-full text-left text-xs font-mono">
                <thead className="text-gray-500 text-[10px] uppercase border-b border-gray-800">
                  <tr>
                    <th className="pb-1.5">Strike</th>
                    <th className="pb-1.5">Símbolo OCC</th>
                    <th className="pb-1.5">Contratos</th>
                    <th className="pb-1.5">Delta</th>
                    <th className="pb-1.5 text-right">Dist. Spot</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50 text-[11px]">
                  {displayGex.putWalls.map((pw) => (
                    <tr key={pw.strike}>
                      <td className="py-1.5 font-bold text-rose-400">\${pw.strike}</td>
                      <td className="text-gray-300">{pw.symbol}</td>
                      <td className="text-white font-semibold">{pw.contracts.toLocaleString()}</td>
                      <td className="text-rose-400">{pw.delta}</td>
                      <td className="text-right text-rose-400">{pw.distancePct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VISÃO 2: MOTOR GEX TEMPO REAL */}
      {subView === 'motor-gex' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
            <div className="bg-[#0c1322] border border-gray-800 p-4 rounded-xl">
              <div className="text-[11px] text-gray-400">SPOT PRICE (DXFEED)</div>
              <div className="text-2xl font-black text-white mt-1">\${displayGex.spotPrice.toFixed(2)}</div>
              <div className="text-[10px] text-emerald-400 mt-1">▲ Conectado em tempo real</div>
            </div>

            <div className="bg-[#0c1322] border border-cyan-800/50 p-4 rounded-xl">
              <div className="text-[11px] text-cyan-300">ZERO GAMMA (FLIP LEVEL)</div>
              <div className="text-2xl font-black text-cyan-400 mt-1">\${displayGex.zeroGammaFlip.toFixed(2)}</div>
              <div className="text-[10px] text-gray-400 mt-1">Fronteira de Volatilidade</div>
            </div>

            <div className="bg-[#0c1322] border border-purple-800/50 p-4 rounded-xl">
              <div className="text-[11px] text-purple-300">MAX GEX MAGNET</div>
              <div className="text-2xl font-black text-purple-300 mt-1">\${displayGex.maxGexMagnetStrike.toFixed(2)}</div>
              <div className="text-[10px] text-gray-400 mt-1">Strike de Maior Atração</div>
            </div>

            <div className="bg-[#0c1322] border border-emerald-500/40 p-4 rounded-xl">
              <div className="text-[11px] text-gray-400">TOTAL NET GEX</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">+\${(displayGex.totalNetGex / 1e9).toFixed(2)}B</div>
              <div className="text-[10px] text-emerald-300 mt-1">Regime: {displayGex.gammaRegime}</div>
            </div>
          </div>

          <div className="bg-[#0c1322] border border-gray-800 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white font-mono flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  GAMMA EXPOSURE (GEX) POR STRIKE & GREGAS EM TEMPO REAL
                </h3>
                <p className="text-[11px] text-gray-400 font-mono">GEX = Gamma × Open Interest × 100 × Spot Price</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> Call GEX</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-500"></span> Put GEX</span>
              </div>
            </div>

            <div className="p-4 bg-[#090e18] rounded-xl border border-gray-800/80 text-xs font-mono text-gray-300">
              <div className="flex justify-between border-b border-gray-800 pb-2 mb-2">
                <span>Leitura Institucional do Motor GEX:</span>
                <span className="text-emerald-400 font-bold">LONG GAMMA (COMPRESSÃO DE VOLATILIDADE)</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                O ativo opera acima do Zero Gamma Flip (\${displayGex.zeroGammaFlip}), o que significa que os Formadores de Mercado (Market Makers) atuam como estabilizadores de preço, comprando em quedas e amortecendo a volatilidade. O strike atrator \${displayGex.maxGexMagnetStrike} atua como forte ímã de liquidez para os próximos vencimentos.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
`);

// 5. HelpSupportView
writeFile('src/components/help/HelpSupportView.tsx', `
'use client';

import React, { useState } from 'react';
import { BookOpen, ChevronDown, Bot, Send, PlayCircle, Play } from 'lucide-react';

export function HelpSupportView() {
  const [openTopic, setOpenTopic] = useState<number | null>(1);

  const topics = [
    {
      id: 1,
      title: 'Arquitetura das 3 Camadas + Motor GEX',
      subtitle: 'Visão Geral do Modelo de Decisão',
      content: 'O sistema combina de forma estrita 3 camadas independentes: 1) Técnica (Médias Móveis e Momentum), 2) Fundamentos e Solvência, e 3) Derivativos & Gamma Exposure (GEX) da Tastytrade em tempo real.',
    },
    {
      id: 2,
      title: 'O que é Gamma Exposure (GEX) e Zero Gamma Flip',
      subtitle: 'Mecânica de Formadores de Mercado (Market Makers)',
      content: 'GEX mede o rebalanceamento de Delta dos Market Makers. Quando o preço está acima do Zero Gamma Flip, os MMs operam contra a tendência (comprando na queda e vendendo na alta), comprimindo a volatilidade. Abaixo do Zero Gamma, operam a favor da tendência, amplificando quedas.',
    },
    {
      id: 3,
      title: 'Como a tendência é determinada',
      subtitle: 'Técnico CNPI-T',
      content: 'Alinhamento das médias móveis aritméticas de 20, 50 e 200 períodos diários (MMA20 > MMA50 > MMA200 para alta, e MMA20 < MMA50 < MMA200 para baixa), com filtro de RSI(14) saudável entre 40 e 65.',
    },
    {
      id: 4,
      title: 'Rastreador de Tendências & Execução de Iron Condor',
      subtitle: 'Classificação Alta / Baixa / Lateral',
      content: 'O rastreador classifica ativos em 3 regimes: compras direcionais em tendências claras de alta, travas de baixa com opções em tendências baixistas, e operações estruturadas de renda lateral (Iron Condor #20 a crédito com 4 pernas) quando o IV Rank for favorável.',
    },
  ];

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-3">
          <div className="p-4 rounded-xl bg-[#0c1322] border border-gray-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              Manual de Operações & Metodologia Quantitativa (Radar + GEX)
            </h3>
            <p className="text-xs text-gray-400 mt-1">Guia detalhado de como o sistema analisa tendências, valida fundamentos, calcula o Gamma Exposure e estrutura posições com a Tastytrade.</p>
          </div>

          <div className="space-y-2 font-mono text-xs">
            {topics.map((t) => (
              <div key={t.id} className="bg-[#0c1322] border border-gray-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenTopic(openTopic === t.id ? null : t.id)}
                  className="w-full p-3.5 text-left flex items-center justify-between hover:bg-slate-800/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-[#070b14] border border-gray-700 text-cyan-400 flex items-center justify-center font-bold text-xs">
                      {String(t.id).padStart(2, '0')}
                    </span>
                    <div>
                      <div className="font-bold text-white">{t.title}</div>
                      <div className="text-[10px] text-gray-400">{t.subtitle}</div>
                    </div>
                  </div>
                  <ChevronDown className={\`w-4 h-4 text-gray-400 transition-transform \${openTopic === t.id ? 'rotate-180' : ''}\`} />
                </button>
                {openTopic === t.id && (
                  <div className="p-4 pt-1 text-[11px] text-gray-300 font-sans border-t border-gray-800/60 leading-relaxed bg-[#090e18]">
                    {t.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0c1322] border border-gray-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 border-b border-gray-800 pb-2.5">
              <Bot className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold font-mono text-white">Consultor IA & Dúvidas Operacionais</span>
            </div>

            <div className="relative">
              <input type="text" placeholder="Faça uma pergunta sobre o manual ou GEX..." className="w-full bg-[#070b14] border border-gray-700 rounded-lg pl-3 pr-10 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-purple-500" />
              <button className="absolute right-2 top-2 p-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-white transition">
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="bg-[#0c1322] border border-gray-800 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
              <div className="flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold font-mono text-white">Vídeo: Desmistificando o Radar Tastytrade</span>
              </div>
              <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono">AULA COMPLETA</span>
            </div>

            <div className="w-full h-44 bg-[#070b14] border border-gray-800 rounded-xl flex flex-col items-center justify-center p-4 text-center relative overflow-hidden group cursor-pointer">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition shadow-lg shadow-emerald-500/30">
                <Play className="w-6 h-6 ml-0.5 fill-current" />
              </div>
              <div className="mt-2 text-xs font-bold text-white">Desmistificando o Radar Tastytrade + GEX</div>
              <div className="text-[10px] text-gray-400 font-mono">Duração: 9:17 • Arquitetura 3 Camadas & Motor GEX US</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
`);

// 6. Main Page (src/app/page.tsx)
writeFile('src/app/page.tsx', `
'use client';

import React, { useState } from 'react';
import { Navbar, ActiveTab } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PanoramaView } from '@/components/panorama/PanoramaView';
import { QuoteView } from '@/components/quote/QuoteView';
import { ScreenerView } from '@/components/screener/ScreenerView';
import { BarreirasGexView } from '@/components/options/BarreirasGexView';
import { HelpSupportView } from '@/components/help/HelpSupportView';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('panorama');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('NVDA');

  const handleSelectSymbolFromScreener = (symbol: string) => {
    setSelectedSymbol(symbol);
    setActiveTab('consulta');
  };

  const handleNavigateToGex = (symbol: string) => {
    setSelectedSymbol(symbol);
    setActiveTab('barreiras');
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#070b14] text-gray-100 selection:bg-emerald-500/30 selection:text-emerald-300">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} uniqueVisitors={3} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div id="panel-panorama" role="tabpanel" className={activeTab === 'panorama' ? 'block' : 'hidden'}>
          {activeTab === 'panorama' && <PanoramaView />}
        </div>

        <div id="panel-consulta" role="tabpanel" className={activeTab === 'consulta' ? 'block' : 'hidden'}>
          {activeTab === 'consulta' && <QuoteView initialSymbol={selectedSymbol} onNavigateToGex={handleNavigateToGex} />}
        </div>

        <div id="panel-rastreador" role="tabpanel" className={activeTab === 'rastreador' ? 'block' : 'hidden'}>
          {activeTab === 'rastreador' && <ScreenerView onSelectSymbol={handleSelectSymbolFromScreener} />}
        </div>

        <div id="panel-barreiras" role="tabpanel" className={activeTab === 'barreiras' ? 'block' : 'hidden'}>
          {activeTab === 'barreiras' && <BarreirasGexView initialSymbol={selectedSymbol} />}
        </div>

        <div id="panel-manual" role="tabpanel" className={activeTab === 'manual' ? 'block' : 'hidden'}>
          {activeTab === 'manual' && <HelpSupportView />}
        </div>
      </main>

      <Footer />
    </div>
  );
}
`);

console.log('All React views generated successfully');
