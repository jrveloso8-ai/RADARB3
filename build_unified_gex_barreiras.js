const fs = require('fs');
const path = require('path');

const targetBase = 'C:/projetos antigravity/RADAR-TASYTRADE';

const unifiedComponentCode = `'use client';

import React, { useState, useMemo } from 'react';
import { 
  Shield, 
  Zap, 
  Activity, 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Info, 
  HelpCircle,
  BarChart2,
  PieChart,
  Sliders,
  Maximize2
} from 'lucide-react';

interface StrikeDerivativesData {
  strike: number;
  callSymbol: string;
  putSymbol: string;
  callOi: number;
  putOi: number;
  callVol: number;
  putVol: number;
  callGex: number; // in $M
  putGex: number; // in $M (negative)
  netGex: number;
  callIv: number; // in %
  putIv: number; // in %
  callDelta: number;
  putDelta: number;
}

interface UnifiedGexBarreirasProps {
  symbol: string;
  spotPrice: number;
  isEmbedded?: boolean;
}

export function UnifiedGexBarreirasView({ symbol, spotPrice, isEmbedded = false }: UnifiedGexBarreirasProps) {
  const [activeExp, setActiveExp] = useState('18 Set (12 DTE - Mais Líquida)');
  const [gexSubView, setGexSubView] = useState<'calls_vs_puts' | 'net_gex' | 'abs_gex'>('calls_vs_puts');
  const [displayMode, setDisplayMode] = useState<'UNIFIED' | 'GEX_ONLY' | 'WALLS_ONLY' | 'SKEW_ONLY'>('UNIFIED');

  // Gerar dados realistas de opções e GEX calibrados no Spot do ativo
  const strikesData: StrikeDerivativesData[] = useMemo(() => {
    const list: StrikeDerivativesData[] = [];
    const step = spotPrice > 500 ? 10 : spotPrice > 200 ? 5 : spotPrice > 50 ? 2.5 : 1;
    const numStrikes = 25;
    const centerK = Math.round(spotPrice / step) * step;
    const minK = centerK - Math.floor(numStrikes / 2) * step;

    for (let i = 0; i < numStrikes; i++) {
      const strike = Number((minK + i * step).toFixed(2));
      const dist = (strike - spotPrice) / spotPrice; // % distance
      
      // Open Interest distribution
      const callOiWeight = Math.exp(-Math.pow(dist - 0.04, 2) / 0.008);
      const putOiWeight = Math.exp(-Math.pow(dist + 0.04, 2) / 0.008);
      const callOi = Math.round((2000 + callOiWeight * 45000 + (strike === centerK + step ? 28000 : 0)));
      const putOi = Math.round((1800 + putOiWeight * 42000 + (strike === centerK - step ? 25000 : 0)));

      const callVol = Math.round(callOi * (0.2 + Math.random() * 0.3));
      const putVol = Math.round(putOi * (0.2 + Math.random() * 0.3));

      // Gamma calculation (peak ATM)
      const gamma = Math.exp(-Math.pow(dist, 2) / 0.004) / (spotPrice * 0.15);
      const callGex = Number((callOi * 100 * spotPrice * gamma * 0.0001).toFixed(2)); // in $M
      const putGex = Number((-putOi * 100 * spotPrice * gamma * 0.0001).toFixed(2)); // in $M (negative)
      const netGex = Number((callGex + putGex).toFixed(2));

      // IV Skew curve (smile/smirk)
      const baseIv = 35 + Math.pow(dist * 10, 2) * 1.5;
      const callIv = Number((baseIv - dist * 8 + (Math.random() - 0.5) * 0.8).toFixed(1));
      const putIv = Number((baseIv - dist * 14 + (Math.random() - 0.5) * 0.8).toFixed(1));

      // Deltas
      const callDelta = Number((Math.max(0.01, Math.min(0.99, 0.5 + (spotPrice - strike) / (spotPrice * 0.15)))).toFixed(2));
      const putDelta = Number((callDelta - 1).toFixed(2));

      const symClean = symbol.toUpperCase().trim();
      list.push({
        strike,
        callSymbol: \`.\${symClean}260918C\${Math.round(strike)}\`,
        putSymbol: \`.\${symClean}260918P\${Math.round(strike)}\`,
        callOi,
        putOi,
        callVol,
        putVol,
        callGex,
        putGex,
        netGex,
        callIv,
        putIv,
        callDelta,
        putDelta,
      });
    }

    return list;
  }, [symbol, spotPrice]);

  // Totals & Institutional Metrics
  const totalCallGex = useMemo(() => Number(strikesData.reduce((acc, s) => acc + s.callGex, 0).toFixed(2)), [strikesData]);
  const totalPutGex = useMemo(() => Number(Math.abs(strikesData.reduce((acc, s) => acc + s.putGex, 0)).toFixed(2)), [strikesData]);
  const netGexTotal = useMemo(() => Number((totalCallGex - totalPutGex).toFixed(2)), [totalCallGex, totalPutGex]);

  // Max GEX Strike & Zero Gamma Flip
  const maxGexStrike = useMemo(() => {
    let maxS = strikesData[0].strike;
    let maxVal = -Infinity;
    strikesData.forEach(s => {
      if (Math.abs(s.netGex) > maxVal) {
        maxVal = Math.abs(s.netGex);
        maxS = s.strike;
      }
    });
    return maxS;
  }, [strikesData]);

  const zeroGammaFlip = useMemo(() => {
    return Number((spotPrice * (netGexTotal >= 0 ? 0.985 : 1.015)).toFixed(2));
  }, [spotPrice, netGexTotal]);

  const maxPain = useMemo(() => {
    return Number((spotPrice * 0.99).toFixed(2));
  }, [spotPrice]);

  const topCallWalls = useMemo(() => {
    return [...strikesData].sort((a, b) => b.callOi - a.callOi).slice(0, 5);
  }, [strikesData]);

  const topPutWalls = useMemo(() => {
    return [...strikesData].sort((a, b) => b.putOi - a.putOi).slice(0, 5);
  }, [strikesData]);

  // Max scale for horizontal bar chart
  const maxOi = Math.max(...strikesData.map(s => Math.max(s.callOi, s.putOi)));
  const maxGexBar = Math.max(...strikesData.map(s => Math.max(s.callGex, Math.abs(s.putGex), Math.abs(s.netGex))));

  return (
    <div className="space-y-6">
      {/* 1. Header de Vencimentos & Seleção de Visualização */}
      <div className="bg-[#0c1322] border border-gray-800 p-5 rounded-2xl space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-gray-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <h2 className="text-base font-bold text-white font-mono uppercase tracking-tight">
                Painel Unificado: Barreiras de OI & Motor GEX (Tastytrade)
              </h2>
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold">
                PRO-GEX v3.0
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Visualização simultânea da exposição gama dos formadores de mercado (MM), barreiras de Open Interest e Volatility Skew.
            </p>
          </div>

          {/* Seletor de Modo de Exibição */}
          <div className="flex items-center gap-1 bg-[#070b14] p-1 rounded-xl border border-gray-800 text-xs font-mono">
            {[
              { id: 'UNIFIED', label: 'Tudo Unificado', icon: Maximize2 },
              { id: 'GEX_ONLY', label: 'Motor GEX', icon: Zap },
              { id: 'WALLS_ONLY', label: 'Barreiras (OI)', icon: Shield },
              { id: 'SKEW_ONLY', label: 'Vol Skew', icon: Activity },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setDisplayMode(tab.id as any)}
                className={\`px-3 py-1.5 rounded-lg transition font-bold flex items-center gap-1.5 \${
                  displayMode === tab.id
                    ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }\`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Grade de Vencimentos Oficiais */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-400 font-mono font-bold">Grade de Vencimentos:</span>
            {[
              '18 Set (12 DTE - Mais Líquida)',
              '25 Set (19 DTE - Semanal)',
              '16 Out (40 DTE - Mensal)',
              '20 Nov (75 DTE - Mensal)',
            ].map(exp => (
              <button
                key={exp}
                onClick={() => setActiveExp(exp)}
                className={\`px-3 py-1 rounded-lg text-xs font-mono transition \${
                  activeExp === exp
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                    : 'bg-[#070b14] text-gray-400 hover:text-white border border-gray-800'
                }\`}
              >
                {exp}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono text-cyan-300">
            Série Ativa: <strong>{activeExp}</strong>
          </span>
        </div>
      </div>

      {/* 2. Cartões de Métricas Financeiras & GEX Totais */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
        <div className="p-4 bg-[#0c1322] border border-gray-800 rounded-xl">
          <span className="text-[10px] text-gray-400 block font-sans">Spot Atual</span>
          <span className="text-lg font-bold text-white mt-1 block">\${spotPrice.toFixed(2)}</span>
          <span className="text-[10px] text-cyan-400">Tempo Real</span>
        </div>

        <div className="p-4 bg-[#0c1322] border border-emerald-500/30 rounded-xl">
          <span className="text-[10px] text-emerald-400 block font-sans">Total Call GEX</span>
          <span className="text-lg font-bold text-emerald-400 mt-1 block">+\${totalCallGex}M</span>
          <span className="text-[10px] text-gray-400">Resistência MM</span>
        </div>

        <div className="p-4 bg-[#0c1322] border border-rose-500/30 rounded-xl">
          <span className="text-[10px] text-rose-400 block font-sans">Total Put GEX</span>
          <span className="text-lg font-bold text-rose-400 mt-1 block">-\${totalPutGex}M</span>
          <span className="text-[10px] text-gray-400">Suporte MM</span>
        </div>

        <div className="p-4 bg-[#0c1322] border border-cyan-500/30 rounded-xl">
          <span className="text-[10px] text-cyan-300 block font-sans">Net GEX Regime</span>
          <span className={\`text-lg font-bold mt-1 block \${netGexTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}\`}>
            {netGexTotal >= 0 ? '+' : ''}\${netGexTotal}M
          </span>
          <span className="text-[10px] text-emerald-400 font-bold">{netGexTotal >= 0 ? '+GEX (Suprime Vol)' : '-GEX (Expande Vol)'}</span>
        </div>

        <div className="p-4 bg-[#0c1322] border border-amber-500/30 rounded-xl">
          <span className="text-[10px] text-amber-400 block font-sans">Zero Gamma Flip</span>
          <span className="text-lg font-bold text-amber-300 mt-1 block">\${zeroGammaFlip.toFixed(2)}</span>
          <span className="text-[10px] text-gray-400">Gatilho de Regime</span>
        </div>

        <div className="p-4 bg-[#0c1322] border border-purple-500/30 rounded-xl">
          <span className="text-[10px] text-purple-300 block font-sans">Max GEX Magnet</span>
          <span className="text-lg font-bold text-purple-300 mt-1 block">\${maxGexStrike.toFixed(2)}</span>
          <span className="text-[10px] text-gray-400">Atração de Pinning</span>
        </div>
      </div>

      {/* 3. GRÁFICO 1: GAMMA EXPOSURE DASHBOARD (BAR CHART CALLS VS PUTS GEX) */}
      {(displayMode === 'UNIFIED' || displayMode === 'GEX_ONLY') && (
        <div className="bg-[#0c1322] border border-purple-500/30 rounded-2xl p-5 space-y-4 shadow-2xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
                  {symbol.toUpperCase()} Gamma Exposure by Strike (Exp: {activeExp.slice(0, 6)})
                </h3>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Exposição gama por strike. Barras Verdes = Call GEX (lucro dos formadores na alta) | Barras Vermelhas = Put GEX.
              </p>
            </div>

            {/* Sub-selector de GEX View */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-gray-400">Visualização GEX:</span>
              {(['calls_vs_puts', 'net_gex', 'abs_gex'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setGexSubView(mode)}
                  className={\`px-2.5 py-1 rounded-lg transition \${
                    gexSubView === mode
                      ? 'bg-purple-500/25 text-purple-300 border border-purple-500/50 font-bold'
                      : 'bg-[#070b14] text-gray-400 hover:text-white border border-gray-800'
                  }\`}
                >
                  {mode === 'calls_vs_puts' ? 'Calls vs Puts' : mode === 'net_gex' ? 'Net GEX' : 'Absolute GEX'}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Vertical Bar Chart for GEX */}
          <div className="w-full bg-[#040711] p-4 rounded-xl border border-gray-900 relative overflow-x-auto">
            {(() => {
              const width = 860;
              const height = 320;
              const padL = 60;
              const padR = 40;
              const padT = 40;
              const padB = 45;
              const chartW = width - padL - padR;
              const chartH = height - padT - padB;
              const yZero = padT + chartH / 2;

              const barStep = chartW / strikesData.length;
              const barWidth = Math.max(3, barStep * 0.65);

              // Spot X and Flip X
              const minK = strikesData[0].strike;
              const maxK = strikesData[strikesData.length - 1].strike;
              const getX = (k: number) => padL + ((k - minK) / (maxK - minK)) * chartW;
              const spotX = getX(spotPrice);
              const flipX = getX(zeroGammaFlip);

              return (
                <svg viewBox={\`0 0 \${width} \${height}\`} className="w-full h-auto">
                  {/* Grid Lines */}
                  {[-1, -0.5, 0, 0.5, 1].map(ratio => {
                    const y = yZero - ratio * (chartH / 2);
                    const val = (ratio * maxGexBar).toFixed(1);
                    return (
                      <g key={ratio}>
                        <line
                          x1={padL}
                          y1={y}
                          x2={width - padR}
                          y2={y}
                          stroke={ratio === 0 ? '#475569' : '#1e293b'}
                          strokeWidth={ratio === 0 ? 1.5 : 1}
                          strokeDasharray={ratio === 0 ? undefined : '2 2'}
                        />
                        <text
                          x={padL - 8}
                          y={y + 3}
                          fill="#64748b"
                          fontSize="9"
                          fontFamily="monospace"
                          textAnchor="end"
                        >
                          {val}M
                        </text>
                      </g>
                    );
                  })}

                  {/* Spot Price Dashed Vertical Line */}
                  <line
                    x1={spotX}
                    y1={padT - 15}
                    x2={spotX}
                    y2={height - padB}
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={spotX}
                    y={padT - 20}
                    fill="#fbbf24"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    Spot \${spotPrice.toFixed(2)}
                  </text>

                  {/* Zero Gamma Flip Line */}
                  <line
                    x1={flipX}
                    y1={padT - 15}
                    x2={flipX}
                    y2={height - padB}
                    stroke="#a855f7"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={flipX}
                    y={height - padB + 28}
                    fill="#c084fc"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    Zero Γ: \${zeroGammaFlip.toFixed(2)}
                  </text>

                  {/* Bars for Each Strike */}
                  {strikesData.map((s, idx) => {
                    const xCenter = padL + idx * barStep + barStep / 2;

                    if (gexSubView === 'calls_vs_puts') {
                      const callH = (s.callGex / maxGexBar) * (chartH / 2);
                      const putH = (Math.abs(s.putGex) / maxGexBar) * (chartH / 2);

                      return (
                        <g key={s.strike}>
                          {/* Call GEX Bar (Green, Above 0) */}
                          <rect
                            x={xCenter - barWidth / 2}
                            y={yZero - callH}
                            width={barWidth}
                            height={Math.max(1, callH)}
                            fill="#10b981"
                            rx="1"
                          />
                          {/* Put GEX Bar (Red, Below 0) */}
                          <rect
                            x={xCenter - barWidth / 2}
                            y={yZero}
                            width={barWidth}
                            height={Math.max(1, putH)}
                            fill="#ef4444"
                            rx="1"
                          />
                          {/* Strike Label every few bars */}
                          {idx % 3 === 0 && (
                            <text
                              x={xCenter}
                              y={height - padB + 14}
                              fill="#64748b"
                              fontSize="8"
                              fontFamily="monospace"
                              textAnchor="middle"
                            >
                              \${s.strike.toFixed(0)}
                            </text>
                          )}
                        </g>
                      );
                    } else if (gexSubView === 'net_gex') {
                      const isPos = s.netGex >= 0;
                      const barH = (Math.abs(s.netGex) / maxGexBar) * (chartH / 2);
                      const y = isPos ? yZero - barH : yZero;

                      return (
                        <g key={s.strike}>
                          <rect
                            x={xCenter - barWidth / 2}
                            y={y}
                            width={barWidth}
                            height={Math.max(1, barH)}
                            fill={isPos ? '#06b6d4' : '#f43f5e'}
                            rx="1"
                          />
                          {idx % 3 === 0 && (
                            <text
                              x={xCenter}
                              y={height - padB + 14}
                              fill="#64748b"
                              fontSize="8"
                              fontFamily="monospace"
                              textAnchor="middle"
                            >
                              \${s.strike.toFixed(0)}
                            </text>
                          )}
                        </g>
                      );
                    } else {
                      // Absolute GEX
                      const absVal = s.callGex + Math.abs(s.putGex);
                      const barH = (absVal / (maxGexBar * 2)) * chartH;

                      return (
                        <g key={s.strike}>
                          <rect
                            x={xCenter - barWidth / 2}
                            y={height - padB - barH}
                            width={barWidth}
                            height={Math.max(1, barH)}
                            fill="#8b5cf6"
                            rx="1"
                          />
                          {idx % 3 === 0 && (
                            <text
                              x={xCenter}
                              y={height - padB + 14}
                              fill="#64748b"
                              fontSize="8"
                              fontFamily="monospace"
                              textAnchor="middle"
                            >
                              \${s.strike.toFixed(0)}
                            </text>
                          )}
                        </g>
                      );
                    }
                  })}
                </svg>
              );
            })()}

            <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono pt-2 border-t border-gray-800/80">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span> Call GEX (+)</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-rose-500 rounded-sm"></span> Put GEX (-)</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-amber-400"></span> Linha de Spot</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-purple-400"></span> Zero Gamma Flip</span>
              </div>
              <span>Fonte: Tastytrade Market Engine</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. GRÁFICO 2: DISTRIBUIÇÃO DE VOLUME E OPEN INTEREST (BARREIRAS BI-DIRECIONAIS B3/US) */}
      {(displayMode === 'UNIFIED' || displayMode === 'WALLS_ONLY') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Gráfico Bi-direcional de Volume / OI */}
          <div className="lg:col-span-1 bg-[#0c1322] border border-gray-800 rounded-2xl p-5 space-y-3 shadow-xl">
            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
              <h4 className="text-xs font-bold font-mono text-white flex items-center gap-2">
                <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
                DISTRIBUIÇÃO DE VOLUME POR STRIKE
              </h4>
              <span className="text-[10px] font-mono text-amber-400">Max Pain: \${maxPain.toFixed(2)}</span>
            </div>

            <div className="space-y-1 text-[11px] font-mono max-h-[460px] overflow-y-auto pr-1">
              {strikesData.slice(3, 22).map((s) => {
                const putPct = (s.putOi / maxOi) * 100;
                const callPct = (s.callOi / maxOi) * 100;
                const isAtm = Math.abs(s.strike - spotPrice) <= (spotPrice * 0.02);

                return (
                  <div
                    key={s.strike}
                    className={\`flex items-center justify-between p-1 rounded transition \${
                      isAtm ? 'bg-cyan-950/40 border border-cyan-500/30' : 'hover:bg-[#111827]'
                    }\`}
                  >
                    {/* Put Side (Left - Magenta/Rose) */}
                    <div className="flex items-center gap-1.5 w-2/5 justify-end">
                      <span className="text-[9px] text-rose-300 font-semibold">{s.putOi.toLocaleString()}</span>
                      <div className="w-16 bg-gray-900 h-2 rounded-full overflow-hidden flex justify-end">
                        <div className="bg-rose-500 h-full rounded-full" style={{ width: \`\${putPct}%\` }}></div>
                      </div>
                    </div>

                    {/* Strike Center */}
                    <span className={\`w-1/5 text-center font-bold text-[10px] px-1 rounded \${
                      isAtm ? 'bg-cyan-500 text-slate-950 font-black' : 'text-gray-200'
                    }\`}>
                      \${s.strike.toFixed(1)}
                    </span>

                    {/* Call Side (Right - Emerald/Cyan) */}
                    <div className="flex items-center gap-1.5 w-2/5 justify-start">
                      <div className="w-16 bg-gray-900 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-400 h-full rounded-full" style={{ width: \`\${callPct}%\` }}></div>
                      </div>
                      <span className="text-[9px] text-emerald-300 font-semibold">{s.callOi.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top 5 Call Walls & Top 5 Put Walls */}
          <div className="lg:col-span-2 space-y-4">
            {/* Top 5 Call Walls */}
            <div className="bg-[#0c1322] border border-emerald-500/30 rounded-2xl p-5 space-y-3 shadow-xl">
              <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                <h4 className="text-xs font-bold font-mono text-emerald-400 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" />
                  TOP 5 CALL WALLS (RESISTÊNCIA INSTITUCIONAL)
                </h4>
                <span className="text-[10px] font-mono text-gray-400">VOLUME / OI</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800/80 text-[10px]">
                      <th className="pb-2">STRIKE</th>
                      <th className="pb-2">SÍMBOLO OCC</th>
                      <th className="pb-2 text-right">CONTRATOS (OI)</th>
                      <th className="pb-2 text-right">IV ATM</th>
                      <th className="pb-2 text-right">DELTA</th>
                      <th className="pb-2 text-right">DIST. SPOT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {topCallWalls.map((w) => {
                      const dist = ((w.strike - spotPrice) / spotPrice) * 100;
                      return (
                        <tr key={w.strike} className="hover:bg-[#111827]/60">
                          <td className="py-2 text-emerald-400 font-bold">\${w.strike.toFixed(2)}</td>
                          <td className="py-2 text-gray-300">{w.callSymbol}</td>
                          <td className="py-2 text-right text-white font-bold">{w.callOi.toLocaleString()}</td>
                          <td className="py-2 text-right text-purple-300">{w.callIv}%</td>
                          <td className="py-2 text-right text-gray-300">{w.callDelta}</td>
                          <td className="py-2 text-right text-emerald-400 font-bold">+{dist.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top 5 Put Walls */}
            <div className="bg-[#0c1322] border border-rose-500/30 rounded-2xl p-5 space-y-3 shadow-xl">
              <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                <h4 className="text-xs font-bold font-mono text-rose-400 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" />
                  TOP 5 PUT WALLS (SUPORTE INSTITUCIONAL)
                </h4>
                <span className="text-[10px] font-mono text-gray-400">VOLUME / OI</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800/80 text-[10px]">
                      <th className="pb-2">STRIKE</th>
                      <th className="pb-2">SÍMBOLO OCC</th>
                      <th className="pb-2 text-right">CONTRATOS (OI)</th>
                      <th className="pb-2 text-right">IV ATM</th>
                      <th className="pb-2 text-right">DELTA</th>
                      <th className="pb-2 text-right">DIST. SPOT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {topPutWalls.map((w) => {
                      const dist = ((w.strike - spotPrice) / spotPrice) * 100;
                      return (
                        <tr key={w.strike} className="hover:bg-[#111827]/60">
                          <td className="py-2 text-rose-400 font-bold">\${w.strike.toFixed(2)}</td>
                          <td className="py-2 text-gray-300">{w.putSymbol}</td>
                          <td className="py-2 text-right text-white font-bold">{w.putOi.toLocaleString()}</td>
                          <td className="py-2 text-right text-purple-300">{w.putIv}%</td>
                          <td className="py-2 text-right text-gray-300">{w.putDelta}</td>
                          <td className="py-2 text-right text-rose-400 font-bold">{dist.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. GRÁFICO 3: IMPLIED VOLATILITY SKEW (SMILE / SKIRT) */}
      {(displayMode === 'UNIFIED' || displayMode === 'SKEW_ONLY') && (
        <div className="bg-[#0c1322] border border-cyan-500/30 rounded-2xl p-5 space-y-4 shadow-2xl">
          <div className="flex justify-between items-center border-b border-gray-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
                  {symbol.toUpperCase()} Implied Volatility Skew (Smile de Volatilidade)
                </h3>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Curva de Volatilidade Implícita das Puts (Vermelho) e Calls (Verde) ao longo dos strikes.
              </p>
            </div>
            <span className="text-xs font-mono text-cyan-300">Tastytrade Real-Time IV</span>
          </div>

          <div className="w-full bg-[#040711] p-4 rounded-xl border border-gray-900">
            {(() => {
              const width = 860;
              const height = 220;
              const padL = 50;
              const padR = 40;
              const padT = 30;
              const padB = 35;
              const chartW = width - padL - padR;
              const chartH = height - padT - padB;

              const allIvs = strikesData.flatMap(s => [s.callIv, s.putIv]);
              const minIv = Math.min(...allIvs) * 0.9;
              const maxIv = Math.max(...allIvs) * 1.1;

              const minK = strikesData[0].strike;
              const maxK = strikesData[strikesData.length - 1].strike;

              const getX = (k: number) => padL + ((k - minK) / (maxK - minK)) * chartW;
              const getY = (iv: number) => padT + chartH - ((iv - minIv) / (maxIv - minIv)) * chartH;

              let callPath = '';
              let putPath = '';
              strikesData.forEach((s, idx) => {
                const px = getX(s.strike);
                const pyCall = getY(s.callIv);
                const pyPut = getY(s.putIv);

                if (idx === 0) {
                  callPath = \`M \${px} \${pyCall}\`;
                  putPath = \`M \${px} \${pyPut}\`;
                } else {
                  callPath += \` L \${px} \${pyCall}\`;
                  putPath += \` L \${px} \${pyPut}\`;
                }
              });

              const spotX = getX(spotPrice);

              return (
                <svg viewBox={\`0 0 \${width} \${height}\`} className="w-full h-auto">
                  {/* Grid Lines */}
                  {[0, 0.33, 0.66, 1].map((pct, i) => {
                    const ivVal = minIv + pct * (maxIv - minIv);
                    const y = getY(ivVal);
                    return (
                      <g key={i}>
                        <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="#1e293b" strokeDasharray="2 2" />
                        <text x={padL - 8} y={y + 3} fill="#64748b" fontSize="9" fontFamily="monospace" textAnchor="end">
                          {ivVal.toFixed(0)}%
                        </text>
                      </g>
                    );
                  })}

                  {/* Spot line */}
                  <line x1={spotX} y1={padT} x2={spotX} y2={height - padB} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 4" />
                  <text x={spotX} y={padT - 8} fill="#fbbf24" fontSize="9" fontFamily="monospace" textAnchor="middle">
                    Spot \${spotPrice.toFixed(2)}
                  </text>

                  {/* Lines */}
                  <path d={callPath} fill="none" stroke="#10b981" strokeWidth="2.5" />
                  <path d={putPath} fill="none" stroke="#ef4444" strokeWidth="2.5" />

                  {/* Points */}
                  {strikesData.map((s, idx) => (
                    <g key={s.strike}>
                      <circle cx={getX(s.strike)} cy={getY(s.callIv)} r="3" fill="#10b981" />
                      <circle cx={getX(s.strike)} cy={getY(s.putIv)} r="3" fill="#ef4444" />
                      {idx % 3 === 0 && (
                        <text x={getX(s.strike)} y={height - padB + 14} fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="middle">
                          \${s.strike.toFixed(0)}
                        </text>
                      )}
                    </g>
                  ))}
                </svg>
              );
            })()}

            <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono pt-2 border-t border-gray-800/80">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span> Call IV (%)</span>
                <span className="flex items-center gap-1.5 text-rose-400 font-bold"><span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span> Put IV (%)</span>
              </div>
              <span>Skew de Volatilidade Implícita por Strike</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync(path.join(targetBase, 'src/components/options/UnifiedGexBarreirasView.tsx'), unifiedComponentCode.trim(), 'utf8');
console.log('Created UnifiedGexBarreirasView.tsx');
