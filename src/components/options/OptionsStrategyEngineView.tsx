'use client';

import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  AlertTriangle,
  Activity,
  BarChart2,
  Shield,
  Zap,
  TrendingUp,
  Award,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  StrategyEngineResult,
  StrategyRecommendation,
  OptionLeg,
  PayoffPoint,
  OperatorProfile,
} from '@/lib/types/financial';
import { safeFetchJson } from '@/lib/utils/api-client';

interface OptionsStrategyEngineViewProps {
  initialSymbol?: string;
}

const PROFILE_LABELS: Record<OperatorProfile, { label: string; desc: string; color: string }> = {
  TATICO: { label: 'Tático', desc: 'Travas direcionais e estruturas neutras', color: 'cyan' },
  ESPECULATIVO: { label: 'Especulativo', desc: 'Fluxo institucional e momentum', color: 'amber' },
  CONSERVADOR: { label: 'Conservador', desc: 'Renda recorrente e proteção de carteira', color: 'emerald' },
};

const REGIME_COLORS: Record<string, string> = {
  EQUILIBRIO: 'text-blue-300',
  NORMAL_ALTA: 'text-emerald-300',
  NORMAL_BAIXA: 'text-amber-300',
  EXTENSAO_ALTA: 'text-orange-300',
  EXTENSAO_BAIXA: 'text-red-400',
  EXTREMO_ALTA: 'text-purple-300',
  EXTREMO_BAIXA: 'text-red-600',
};

// ─── Payoff Chart Component ────────────────────────────────────────
function PayoffChart({
  payoffPoints,
  spot,
  reliability,
  legs,
}: {
  payoffPoints: PayoffPoint[];
  spot: number;
  reliability: StrategyRecommendation['payoffReliability'];
  legs: OptionLeg[];
}) {
  const [showReliabilityInfo, setShowReliabilityInfo] = useState(false);

  const chartW = 700;
  const chartH = 260;
  const padL = 70;
  const padR = 20;
  const padT = 20;
  const padB = 50;

  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  const allPayoffs = payoffPoints.map((p) => p.netPayoff);
  const allPnLs = payoffPoints
    .map((p) => p.currentPnL)
    .filter((v): v is number => v !== null);

  const allValues = [...allPayoffs, ...allPnLs];
  const minVal = Math.min(...allValues, 0);
  const maxVal = Math.max(...allValues, 0);
  const valRange = maxVal - minVal || 1;

  const minSpot = payoffPoints[0]?.spotAtExpiry ?? spot * 0.6;
  const maxSpot = payoffPoints[payoffPoints.length - 1]?.spotAtExpiry ?? spot * 1.4;
  const spotRange = maxSpot - minSpot || 1;

  const toX = (s: number) => padL + ((s - minSpot) / spotRange) * innerW;
  const toY = (v: number) => padT + ((maxVal - v) / valRange) * innerH;

  const zeroY = toY(0);
  const spotX = toX(spot);

  // Construir caminhos SVG
  const expiryPath = payoffPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.spotAtExpiry).toFixed(1)},${toY(p.netPayoff).toFixed(1)}`)
    .join(' ');

  const currentPnLPoints = payoffPoints.filter((p) => p.currentPnL !== null);
  const currentPath =
    currentPnLPoints.length > 1
      ? currentPnLPoints
          .map(
            (p, i) =>
              `${i === 0 ? 'M' : 'L'}${toX(p.spotAtExpiry).toFixed(1)},${toY(p.currentPnL!).toFixed(1)}`
          )
          .join(' ')
      : null;

  // Eixo Y: marcas de preço
  const yTicks = [-2, -1, 0, 1, 2].map((t) => {
    const val = minVal + ((t + 2) / 4) * valRange;
    return { val: Number(val.toFixed(2)), y: toY(val) };
  });

  return (
    <div className="space-y-3">
      {/* Botão de transparência */}
      <button
        type="button"
        onClick={() => setShowReliabilityInfo(!showReliabilityInfo)}
        className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 transition"
      >
        <Info className="w-3.5 h-3.5" />
        <span>Ver Transparência e Confiabilidade dos Dados do Gráfico</span>
        {showReliabilityInfo ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {/* Painel de Confiabilidade — expandível */}
      {showReliabilityInfo && (
        <div className="bg-gray-950/80 border border-gray-700/60 rounded-xl p-4 space-y-3 text-xs font-mono">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold shrink-0">
                ✅ REAL
              </span>
              <p className="text-gray-300 leading-relaxed">{reliability.expiryPayoffExplanation}</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-bold shrink-0">
                ⚡ MODELO
              </span>
              <p className="text-gray-300 leading-relaxed">{reliability.currentPnLExplanation}</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] text-gray-500 pt-1 border-t border-gray-800">
              <span>HV21 usada: {reliability.hv21Used !== null ? `${reliability.hv21Used.toFixed(1)}%` : 'N/D'}</span>
              <span>Selic: {reliability.riskFreeRateUsed.toFixed(2)}%</span>
              <span>Data dos dados: {reliability.dataDate}</span>
            </div>
          </div>
          {reliability.premiumWarnings.length > 0 && (
            <div className="space-y-1 border-t border-gray-800 pt-2">
              <p className="text-amber-400 font-bold text-[10px]">⚠️ Avisos sobre Prêmios das Pernas:</p>
              {reliability.premiumWarnings.map((w, i) => (
                <p key={i} className="text-gray-400 text-[10px] leading-relaxed">• {w}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legenda do Gráfico */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-0.5 bg-cyan-400 rounded" />
          <span className="text-emerald-300 font-bold">✅ Payoff no Vencimento</span>
          <span className="text-gray-500">(Matemática Pura — 100% Real)</span>
        </div>
        {currentPath && (
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5 border-t-2 border-dashed border-amber-400" />
            <span className="text-amber-300 font-bold">⚡ P&L Hoje Estimado</span>
            <span className="text-gray-500">(Black-Scholes c/ HV Real — Modelo)</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-cyan-500" />
          <span className="text-cyan-300">Spot Atual Real</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-px border-t border-dashed border-gray-500" />
          <span className="text-gray-400">Break-Even</span>
        </div>
      </div>

      {/* SVG do Gráfico */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          className="w-full h-auto min-w-[600px] select-none font-mono"
        >
          {/* Fundo */}
          <rect x={padL} y={padT} width={innerW} height={innerH} fill="#050a14" rx="4" />

          {/* Zona de lucro (verde) e perda (vermelho) */}
          {zeroY > padT && zeroY < padT + innerH && (
            <>
              <rect x={padL} y={padT} width={innerW} height={zeroY - padT}
                fill="rgba(16,185,129,0.05)" />
              <rect x={padL} y={zeroY} width={innerW} height={padT + innerH - zeroY}
                fill="rgba(239,68,68,0.05)" />
            </>
          )}

          {/* Linha Zero (Break-even) */}
          <line
            x1={padL} y1={zeroY} x2={padL + innerW} y2={zeroY}
            stroke="#4b5563" strokeDasharray="4 4" strokeWidth="1"
          />
          <text x={padL - 5} y={zeroY + 4} fill="#6b7280" fontSize="9" textAnchor="end">
            R$0
          </text>

          {/* Eixo Y */}
          {yTicks.map(({ val, y }) => (
            <g key={val}>
              <line x1={padL - 3} y1={y} x2={padL} y2={y} stroke="#374151" />
              <text x={padL - 6} y={y + 3} fill="#6b7280" fontSize="8" textAnchor="end">
                {val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1)}
              </text>
            </g>
          ))}

          {/* Eixo X — Preços */}
          {[0.2, 0.4, 0.6, 0.8, 1.0].map((f) => {
            const s = minSpot + f * spotRange;
            const x = toX(s);
            return (
              <g key={f}>
                <line x1={x} y1={padT + innerH} x2={x} y2={padT + innerH + 4} stroke="#374151" />
                <text x={x} y={chartH - 10} fill="#6b7280" fontSize="8" textAnchor="middle">
                  R${s.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Strikes das pernas */}
          {legs.map((leg) => {
            const x = toX(leg.strike);
            const isCall = leg.type === 'CALL';
            const isBuy = leg.action === 'COMPRAR';
            const color = isCall ? (isBuy ? '#10b981' : '#6ee7b7') : (isBuy ? '#ef4444' : '#fca5a5');
            return (
              <g key={`${leg.type}_${leg.strike}_${leg.action}`}>
                <line x1={x} y1={padT} x2={x} y2={padT + innerH}
                  stroke={color} strokeDasharray="2 3" strokeWidth="1" strokeOpacity="0.5" />
                <text x={x} y={padT - 4} fill={color} fontSize="8" textAnchor="middle" fontWeight="bold">
                  {leg.action === 'COMPRAR' ? '+' : '-'}{leg.type[0]} R${leg.strike.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Linha do Spot Real */}
          <line x1={spotX} y1={padT} x2={spotX} y2={padT + innerH}
            stroke="#22d3ee" strokeWidth="1.5" />
          <circle cx={spotX} cy={padT + innerH / 2} r="4" fill="#22d3ee" />
          <text x={spotX + 6} y={padT + innerH / 2 - 5} fill="#22d3ee" fontSize="9" fontWeight="bold">
            SPOT Real
          </text>
          <text x={spotX + 6} y={padT + innerH / 2 + 8} fill="#22d3ee" fontSize="8">
            R${spot.toFixed(2)}
          </text>

          {/* Linha tracejada P&L Atual (Teórico Black-Scholes) */}
          {currentPath && (
            <path
              d={currentPath}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="1.5"
              strokeDasharray="5 4"
              strokeOpacity="0.85"
            />
          )}

          {/* Linha sólida Payoff no Vencimento (100% Real) */}
          <path
            d={expiryPath}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Rótulo do eixo Y */}
          <text
            x={14}
            y={padT + innerH / 2}
            fill="#6b7280"
            fontSize="8"
            textAnchor="middle"
            transform={`rotate(-90, 14, ${padT + innerH / 2})`}
          >
            P&L (R$ por ação)
          </text>
          <text x={padL + innerW / 2} y={chartH - 1} fill="#6b7280" fontSize="8" textAnchor="middle">
            Preço do Ativo no Vencimento (R$)
          </text>
        </svg>
      </div>
    </div>
  );
}

// ─── Strategy Card Component ────────────────────────────────────────
function StrategyCard({ strategy, spot }: { strategy: StrategyRecommendation; spot: number }) {
  const [expanded, setExpanded] = useState(false);
  const [showPayoff, setShowPayoff] = useState(false);

  const scoreColor =
    strategy.convictionScore >= 75
      ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
      : strategy.convictionScore >= 50
      ? 'text-amber-400 border-amber-500/40 bg-amber-500/10'
      : 'text-red-400 border-red-500/40 bg-red-500/10';

  const categoryIcon =
    strategy.category === 'TATICA' ? <Activity className="w-4 h-4 text-cyan-400" /> :
    strategy.category === 'FLUXO' ? <Zap className="w-4 h-4 text-amber-400" /> :
    <Shield className="w-4 h-4 text-emerald-400" />;

  const categoryLabel =
    strategy.category === 'TATICA' ? 'Tática / Regime' :
    strategy.category === 'FLUXO' ? 'Fluxo Institucional' :
    'Renda & Proteção';

  return (
    <div className={`rounded-2xl border bg-[#0a0f1c] shadow-xl overflow-hidden transition-all ${
      strategy.isDataInsufficient ? 'border-gray-800/60 opacity-60' : 'border-gray-800/90'
    }`}>
      {/* Header */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-900/40 transition"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            {/* Score */}
            <div className={`text-center px-2.5 py-1.5 rounded-xl border font-mono font-bold shrink-0 ${scoreColor}`}>
              <div className="text-xl leading-none">{strategy.convictionScore}</div>
              <div className="text-[9px] opacity-75">Score</div>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {categoryIcon}
                <h4 className="text-sm font-bold text-white">{strategy.name}</h4>
                <span className="text-[10px] text-gray-500 font-mono">{strategy.nameEn}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-900 border border-gray-700 text-gray-400 font-mono">
                  {categoryLabel}
                </span>
                {strategy.targetProfiles.map((p) => (
                  <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">
                    {PROFILE_LABELS[p].label}
                  </span>
                ))}
                {strategy.tailRisk.isCurrentlyActive && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold animate-pulse">
                    ⚡ Cauda Ativa
                  </span>
                )}
                {strategy.noUpsideRisk && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                    🛡️ Risco Zero na Alta
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Métricas resumo */}
          <div className="flex items-center gap-4 text-right shrink-0">
            {strategy.pop !== null && strategy.pop !== undefined && (
              <div>
                <div className="text-[10px] text-gray-500 font-mono">POP (Est.)</div>
                <div className="text-cyan-400 font-bold font-mono text-sm">
                  {(strategy.pop * 100).toFixed(0)}%
                </div>
              </div>
            )}
            {strategy.maxReturnPerLot !== null && (
              <div>
                <div className="text-[10px] text-gray-500 font-mono">Retorno Máx.</div>
                <div className="text-emerald-400 font-bold font-mono text-sm">
                  R${strategy.maxReturnPerLot.toFixed(0)}/lote
                </div>
              </div>
            )}
            {strategy.maxRiskPerLot !== null && (
              <div>
                <div className="text-[10px] text-gray-500 font-mono">Risco Máx.</div>
                <div className="text-red-400 font-bold font-mono text-sm">
                  R${strategy.maxRiskPerLot.toFixed(0)}/lote
                </div>
              </div>
            )}
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-800/60 p-4 space-y-4">
          {/* Alertas */}
          {strategy.alertas.length > 0 && (
            <div className="space-y-1.5">
              {strategy.alertas.map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-xs font-mono bg-amber-500/5 border border-amber-500/20 rounded-lg p-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span className="text-amber-200">{a}</span>
                </div>
              ))}
            </div>
          )}

          {/* Pernas da Estrutura */}
          <div>
            <h5 className="text-xs font-bold text-gray-300 font-mono mb-2 flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
              Pernas da Estrutura
            </h5>
            <div className="space-y-2">
              {strategy.legs.map((leg, i) => (
                <div key={i} className={`rounded-xl p-3 border text-xs font-mono space-y-1 ${
                  leg.action === 'COMPRAR'
                    ? 'bg-emerald-500/5 border-emerald-500/30'
                    : 'bg-red-500/5 border-red-500/30'
                }`}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-bold text-sm ${leg.action === 'COMPRAR' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {leg.action}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        leg.type === 'CALL' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'
                      }`}>
                        {leg.type}
                      </span>
                      {leg.symbol && (
                        <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-mono font-black text-xs tracking-wider">
                          {leg.symbol}
                        </span>
                      )}
                      <span className="font-black text-white text-sm">R$ {leg.strike.toFixed(2)}</span>
                      <span className="text-gray-400 text-xs">• {leg.expiration} ({leg.dte}d)</span>
                      {leg.delta !== null && leg.delta !== undefined && (
                        <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/60 font-semibold">
                          Δ {leg.delta > 0 ? `+${leg.delta.toFixed(2)}` : leg.delta.toFixed(2)}
                        </span>
                      )}
                      {leg.bid !== null && leg.bid !== undefined && leg.bid > 0 && (
                        <span className="text-[10px] text-emerald-400/90 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          Bid: R${leg.bid.toFixed(2)}
                        </span>
                      )}
                      {leg.ask !== null && leg.ask !== undefined && leg.ask > 0 && (
                        <span className="text-[10px] text-amber-400/90 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          Ask: R${leg.ask.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {leg.premiumUsed !== null ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          leg.premiumReliability === 'REAL_BOOK_BID' || leg.premiumReliability === 'REAL_BOOK_ASK' || leg.premiumReliability === 'REAL_MERCADO'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : leg.premiumReliability === 'TEORICO_BS_HV_REAL'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-gray-700 text-gray-400 border border-gray-600'
                        }`}>
                          {leg.premiumReliabilityLabel}
                        </span>
                      ) : null}
                      {leg.premiumUsed !== null && (
                        <span className="text-white font-bold">R$ {leg.premiumUsed.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-400 text-[10px]">📍 Origem: {leg.strikeOriginLabel}</p>
                  <p className="text-gray-500 text-[10px]">{leg.legRationale}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Perna de Cauda */}
          <div className={`rounded-xl p-3 border text-xs font-mono space-y-2 ${
            strategy.tailRisk.isCurrentlyActive
              ? 'bg-amber-500/10 border-amber-500/40'
              : 'bg-gray-900/60 border-gray-700/60'
          }`}>
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="font-bold text-amber-300">{strategy.tailRisk.typeLabel}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                strategy.tailRisk.isCurrentlyActive
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-gray-800 text-gray-500'
              }`}>
                {strategy.tailRisk.isCurrentlyActive ? '⚡ ATIVA' : 'Inativa'}
              </span>
            </div>
            <p className="text-gray-400 text-[10px]">{strategy.tailRisk.triggerCondition}</p>
            <p className="text-gray-300 text-[10px] leading-relaxed">{strategy.tailRisk.rationale}</p>
          </div>

          {/* Score de Convicção — auditável */}
          <div className="bg-gray-900/60 rounded-xl p-3 border border-gray-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-300 font-mono">Score de Convicção — Composição Auditável</span>
              <span className={`text-base font-black font-mono ${scoreColor.split(' ')[0]}`}>
                {strategy.convictionScore}/100
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Z-Score', val: strategy.convictionFactors.zScoreAlignment },
                { label: 'Fluxo 5D OI', val: strategy.convictionFactors.flowAlignment },
                { label: 'Barreiras Reais', val: strategy.convictionFactors.barrierAlignment },
                { label: 'PCR', val: strategy.convictionFactors.pcrAlignment },
              ].map(({ label, val }) => (
                <div key={label} className="text-[10px] font-mono">
                  <div className="flex justify-between text-gray-400 mb-0.5">
                    <span>{label}</span>
                    <span className="font-bold text-white">{val}/25</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full transition-all"
                      style={{ width: `${(val / 25) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-1 space-y-0.5">
              {strategy.convictionFactors.explanation.map((e, i) => (
                <p key={i} className="text-[10px] text-gray-500 font-mono">• {e}</p>
              ))}
            </div>
          </div>

          {/* Rationale */}
          <div className="bg-gray-950/60 rounded-xl p-3 border border-gray-800">
            <h5 className="text-xs font-bold text-cyan-400 font-mono mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Análise Institucional Completa
            </h5>
            <pre className="text-[10px] text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">
              {strategy.rationale}
            </pre>
          </div>

          {/* Gráfico de Payoff */}
          <div className="bg-[#050a14] rounded-xl p-4 border border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
                Gráfico de Payoff
              </h5>
              <button
                type="button"
                onClick={() => setShowPayoff(!showPayoff)}
                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1"
              >
                {showPayoff ? 'Ocultar' : 'Exibir'}
                {showPayoff ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
            {showPayoff && (
              <PayoffChart
                payoffPoints={strategy.payoffPoints}
                spot={spot}
                reliability={strategy.payoffReliability}
                legs={strategy.legs}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main View Component ────────────────────────────────────────
export const OptionsStrategyEngineView: React.FC<OptionsStrategyEngineViewProps> = ({
  initialSymbol = 'PETR4',
}) => {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [searchInput, setSearchInput] = useState(initialSymbol);
  const [selectedExpiration, setSelectedExpiration] = useState<string>('');
  const [profile, setProfile] = useState<OperatorProfile | ''>('');
  const [data, setData] = useState<StrategyEngineResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStrategies = async (ticker: string, expiration?: string, prof?: string) => {
    setLoading(true);
    setError(null);
    const expParam = expiration ? `&expiration=${encodeURIComponent(expiration)}` : '';
    const profParam = prof ? `&profile=${encodeURIComponent(prof)}` : '';
    const { ok, data: resData, error: resError } = await safeFetchJson<StrategyEngineResult>(
      `/api/options/strategy-engine?symbol=${encodeURIComponent(ticker)}${expParam}${profParam}`
    );
    if (ok && resData) {
      setData(resData);
      setSymbol(ticker);
      setSelectedExpiration(resData.selectedExpiration || '');
    } else {
      setData(null);
      setError(resError || 'Não foi possível gerar estratégias.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStrategies(initialSymbol);
  }, [initialSymbol]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      fetchStrategies(searchInput.trim().toUpperCase(), selectedExpiration, profile);
    }
  };

  const regime = data?.regime;
  const regimeColor = regime ? (REGIME_COLORS[regime.regime] ?? 'text-gray-300') : 'text-gray-400';

  return (
    <div className="space-y-5 text-gray-200 font-sans">
      {/* CONTROLES */}
      <div className="bg-[#0b101b] border border-gray-800/90 rounded-2xl p-4 shadow-xl space-y-4">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Mesa de Estratégias AI
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  100% DADOS REAIS BRAPI
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  PAYOFF AUDITÁVEL
                </span>
              </h2>
              <p className="text-xs text-gray-400 font-mono">
                Estratégias calibradas em dados reais de OI, Z-Score 200P e PCR real — com proteção de risco de cauda integrada
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {/* Busca */}
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
              placeholder="Ex: PETR4"
              className="bg-gray-900 border border-gray-700/80 rounded-xl px-3 py-1.5 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 w-28 uppercase"
            />
            <button type="submit" disabled={loading}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold font-mono transition disabled:opacity-50">
              Analisar
            </button>
            <button type="button" onClick={() => fetchStrategies(symbol, selectedExpiration, profile)} disabled={loading}
              className="p-1.5 rounded-xl border border-gray-700 bg-gray-900 text-gray-300 transition disabled:opacity-50"
              title="Atualizar">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </form>

          {/* Seletor de Perfil */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-gray-900 border border-gray-800 text-xs font-mono">
            <button type="button" onClick={() => { setProfile(''); fetchStrategies(symbol, selectedExpiration, ''); }}
              className={`px-3 py-1 rounded-lg transition ${!profile ? 'bg-gray-700 text-white font-bold' : 'text-gray-400 hover:text-white'}`}>
              Todos
            </button>
            {(Object.keys(PROFILE_LABELS) as OperatorProfile[]).map((p) => (
              <button key={p} type="button"
                onClick={() => { setProfile(p); fetchStrategies(symbol, selectedExpiration, p); }}
                className={`px-3 py-1 rounded-lg transition ${profile === p ? `bg-${PROFILE_LABELS[p].color}-500/20 text-${PROFILE_LABELS[p].color}-300 font-bold border border-${PROFILE_LABELS[p].color}-500/40` : 'text-gray-400 hover:text-white'}`}>
                {PROFILE_LABELS[p].label}
              </button>
            ))}
          </div>
        </div>

        {/* Vencimentos */}
        {data?.regime && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-gray-400 font-mono">Vencimento Mensal:</span>
            {data.regime && data.strategies.length > 0 &&
              [...new Set(data.strategies.flatMap((s) => s.legs.map((l) => l.expiration)))].slice(0, 1).map((exp) => (
                <span key={exp} className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
                  {exp} ({data.selectedDte}d)
                </span>
              ))
            }
          </div>
        )}
      </div>

      {/* PAINEL DE DIAGNÓSTICO DE REGIME */}
      {regime && !loading && (
        <div className="bg-[#0b101b] border border-gray-800/90 rounded-2xl p-4 shadow-xl space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Diagnóstico de Regime de Mercado — Dados Reais BRAPI
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-900/80 rounded-xl p-3 border border-gray-800">
              <span className="text-[10px] text-gray-400 font-mono block">Z-Score Real (200P BRAPI)</span>
              <span className={`text-xl font-black font-mono block mt-1 ${regimeColor}`}>
                {regime.zScore > 0 ? '+' : ''}{regime.zScore.toFixed(2)}σ
              </span>
              <span className="text-[10px] text-gray-500 font-mono">{regime.regimeLabel}</span>
            </div>
            <div className="bg-gray-900/80 rounded-xl p-3 border border-gray-800">
              <span className="text-[10px] text-gray-400 font-mono block">Índice de Risco de Cauda</span>
              <span className={`text-xl font-black font-mono block mt-1 ${
                regime.tailRiskIndex >= 70 ? 'text-red-400' :
                regime.tailRiskIndex >= 45 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {regime.tailRiskIndex}/100
              </span>
              <span className="text-[10px] text-gray-500 font-mono">{regime.tailRiskLabel}</span>
            </div>
            <div className="bg-gray-900/80 rounded-xl p-3 border border-gray-800">
              <span className="text-[10px] text-gray-400 font-mono block">Fluxo 5D (OI Real)</span>
              <span className={`text-sm font-black font-mono block mt-1 ${
                regime.flowSignal === 'ACCUMULATION_CALL' ? 'text-emerald-400' :
                regime.flowSignal === 'ACCUMULATION_PUT' ? 'text-red-400' :
                regime.flowSignal === 'UNWINDING' ? 'text-amber-400' : 'text-gray-400'
              }`}>
                {regime.flowSignal.replace('_', ' ')}
              </span>
              <span className="text-[10px] text-gray-500 font-mono leading-relaxed">{regime.flowLabel}</span>
            </div>
            <div className="bg-gray-900/80 rounded-xl p-3 border border-gray-800">
              <span className="text-[10px] text-gray-400 font-mono block">PCR Real (OI Líquido)</span>
              <span className={`text-xl font-black font-mono block mt-1 ${
                regime.pcrSignal === 'BEARISH_EXTREMO' ? 'text-red-400' :
                regime.pcrSignal === 'BULLISH_EXTREMO' ? 'text-purple-400' :
                regime.pcrSignal === 'NEUTRO' ? 'text-gray-300' : 'text-amber-300'
              }`}>
                {regime.pcr.toFixed(2)}
              </span>
              <span className="text-[10px] text-gray-500 font-mono">{regime.pcrLabel}</span>
            </div>
          </div>

          {/* Bandas e Barreiras */}
          <div className="flex flex-wrap gap-3 text-[10px] font-mono bg-gray-950/60 p-2.5 rounded-xl border border-gray-800">
            <span className="text-gray-400">Bandas Reais 200P:</span>
            <span className="text-emerald-300 font-bold">+2σ: R${regime.upperBand2Sigma.toFixed(2)}</span>
            <span className="text-emerald-200">+3σ: R${regime.upperBand3Sigma.toFixed(2)}</span>
            <span className="text-gray-500">|</span>
            <span className="text-red-300 font-bold">-2σ: R${regime.lowerBand2Sigma.toFixed(2)}</span>
            <span className="text-red-200">-3σ: R${regime.lowerBand3Sigma.toFixed(2)}</span>
            {regime.topCallBarrierStrike && (
              <>
                <span className="text-gray-500">|</span>
                <span className="text-emerald-400 font-bold">Barreira CALL: R${regime.topCallBarrierStrike.toFixed(2)}</span>
              </>
            )}
            {regime.topPutBarrierStrike && (
              <>
                <span className="text-gray-500">|</span>
                <span className="text-red-400 font-bold">Barreira PUT: R${regime.topPutBarrierStrike.toFixed(2)}</span>
              </>
            )}
            <span className="text-gray-500">|</span>
            <span className="text-cyan-300">HV21: {regime.hv21 !== null ? `${regime.hv21.toFixed(1)}%` : 'N/D'}</span>
            <span className="text-gray-500">|</span>
            <span className="text-gray-400">Amostra: {regime.sampleSize} fechamentos reais</span>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="p-12 text-center text-gray-400 font-mono flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
          <span>Consultando BRAPI, calculando regime e gerando estratégias com dados reais...</span>
        </div>
      )}

      {/* Erro */}
      {error && !loading && (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-mono flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Dados insuficientes */}
      {data?.regime.isInsufficient && !loading && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm font-mono flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Dados insuficientes para gerar estratégias.</strong>
            <p className="text-xs text-amber-400 mt-1">
              O sistema requer no mínimo 30 fechamentos reais para calcular bandas estatísticas confiáveis.
              Amostra atual: {data.regime.sampleSize} fechamentos.
            </p>
          </div>
        </div>
      )}

      {/* ESTRATÉGIAS */}
      {data && !loading && data.strategies.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <Award className="w-4 h-4 text-cyan-400" />
              {data.strategies.length} Estratégia{data.strategies.length > 1 ? 's' : ''} Recomendada{data.strategies.length > 1 ? 's' : ''} por Score de Convicção
            </h3>
            <span className="text-[11px] text-gray-500 font-mono">
              Gerado em: {new Date(data.generatedAt).toLocaleString('pt-BR')}
            </span>
          </div>
          {data.strategies.map((strategy) => (
            <StrategyCard key={strategy.id} strategy={strategy} spot={data.spotPrice} />
          ))}
        </div>
      )}

      {data && !loading && data.strategies.length === 0 && !data.regime.isInsufficient && (
        <div className="p-6 text-center text-gray-500 font-mono text-sm">
          Nenhuma estratégia disponível para o perfil e regime selecionados.
        </div>
      )}
    </div>
  );
};
