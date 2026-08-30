'use client';

import React from 'react';
import { ElectedOptionStrategy } from '@/lib/domain/cme-election';
import { TrendingUp, TrendingDown, Target, Info, ShieldAlert } from 'lucide-react';

interface OptionPayoffChartProps {
  electedStrategy: ElectedOptionStrategy;
}

export const OptionPayoffChart: React.FC<OptionPayoffChartProps> = ({ electedStrategy }) => {
  const {
    underlyingPrice: spot,
    legs,
    maxProfitLot,
    maxLossLot,
    breakEven,
    spreadWidth,
    isCredit,
    title,
    strategySpec,
  } = electedStrategy;

  // Calcular Payoff unitário em R$ para um determinado preço S no vencimento
  const calculateUnitPayoffAt = (sPrice: number): number => {
    let totalUnitPayoff = 0;

    for (const leg of legs) {
      let intrinsic = 0;
      if (leg.type === 'CALL') {
        intrinsic = Math.max(0, sPrice - leg.strike);
      } else {
        intrinsic = Math.max(0, leg.strike - sPrice);
      }

      if (leg.action === 'COMPRA') {
        // Compra: paga prêmio, recebe intrinsic
        totalUnitPayoff += intrinsic - leg.unitPrice;
      } else {
        // Venda: recebe prêmio, paga intrinsic se exercido
        totalUnitPayoff += leg.unitPrice - intrinsic;
      }
    }

    return totalUnitPayoff;
  };

  // Determinar range do eixo X (preço do ativo)
  const allStrikes = legs.map((l) => l.strike);
  const minK = Math.min(...allStrikes, spot);
  const maxK = Math.max(...allStrikes, spot);
  const paddingX = Math.max((maxK - minK) * 0.4, spot * 0.12);

  const minX = Math.max(0.5, Number((minK - paddingX).toFixed(2)));
  const maxX = Number((maxK + paddingX).toFixed(2));

  // Gerar série de pontos
  const steps = 70;
  const stepSize = (maxX - minX) / steps;
  const points: Array<{ s: number; unitP: number; lotP: number }> = [];

  for (let i = 0; i <= steps; i++) {
    const s = minX + i * stepSize;
    const unitP = calculateUnitPayoffAt(s);
    const lotP = unitP * 1000;
    points.push({ s, unitP, lotP });
  }

  // Garantir que os strikes exatos, o spot e o breakeven estejam na lista
  const specialPrices = [...allStrikes, spot, breakEven].filter(
    (p) => p >= minX && p <= maxX
  );

  for (const sp of specialPrices) {
    const unitP = calculateUnitPayoffAt(sp);
    const lotP = unitP * 1000;
    points.push({ s: sp, unitP, lotP });
  }

  // Ordenar pontos pelo preço S
  points.sort((a, b) => a.s - b.s);

  // Determinar limites do eixo Y (Lucro / Prejuízo em R$ no lote de 1.000)
  const allLots = points.map((p) => p.lotP);
  const minLot = Math.min(...allLots);
  const maxLot = Math.max(...allLots);
  const yRangeMax = Math.max(Math.abs(minLot), Math.abs(maxLot), 50) * 1.25;

  // Dimensões do SVG
  const width = 760;
  const height = 280;
  const padL = 75;
  const padR = 40;
  const padT = 30;
  const padB = 45;

  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const getX = (s: number) => padL + ((s - minX) / (maxX - minX)) * chartW;
  const getY = (lotVal: number) => padT + chartH / 2 - (lotVal / yRangeMax) * (chartH / 2);

  // Coordenada Y da linha de Breakeven (0)
  const yZero = getY(0);

  // Construir SVG Path do Payoff
  let linePath = '';
  let areaProfitPath = `M ${getX(points[0].s)} ${yZero}`;
  let areaLossPath = `M ${getX(points[0].s)} ${yZero}`;

  points.forEach((pt, idx) => {
    const px = getX(pt.s);
    const py = getY(pt.lotP);

    if (idx === 0) {
      linePath = `M ${px} ${py}`;
    } else {
      linePath += ` L ${px} ${py}`;
    }
  });

  const spotX = getX(spot);
  const breakEvenX = getX(breakEven);
  const spotPayoff = calculateUnitPayoffAt(spot) * 1000;

  return (
    <div className="p-5 bg-[#070b14] border border-cyan-500/30 rounded-2xl shadow-2xl space-y-4 font-sans">
      {/* Header do Gráfico de Payoff */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/40 text-[10px] font-bold font-mono">
              CURVA MATEMÁTICA DE PAYOFF
            </span>
            <h4 className="font-bold text-white text-sm sm:text-base">
              Perfil de Lucro e Prejuízo no Vencimento (Lote 1.000 cotas)
            </h4>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Cálculo exato da resultante de todas as pernas de opções da B3 para qualquer preço final da ação.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
            Lucro Máx: +R$ {maxProfitLot.toFixed(2)}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 font-bold">
            Perda Máx: -R$ {maxLossLot.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Área do Gráfico SVG */}
      <div className="w-full bg-[#040711] p-3 rounded-xl border border-gray-900 overflow-hidden relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          <defs>
            <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="lossGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid Horizontal de Lucro/Prejuízo */}
          {[-1, -0.5, 0, 0.5, 1].map((ratio) => {
            const val = ratio * yRangeMax;
            const yPos = getY(val);
            const isZero = ratio === 0;
            return (
              <g key={ratio}>
                <line
                  x1={padL}
                  y1={yPos}
                  x2={width - padR}
                  y2={yPos}
                  stroke={isZero ? '#475569' : '#1e293b'}
                  strokeWidth={isZero ? '1.5' : '1'}
                  strokeDasharray={isZero ? 'none' : '3 3'}
                />
                <text
                  x={padL - 8}
                  y={yPos + 3}
                  textAnchor="end"
                  fill={isZero ? '#94a3b8' : ratio > 0 ? '#10b981' : '#ef4444'}
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight={isZero ? 'bold' : 'normal'}
                >
                  {ratio > 0 ? '+' : ''}R$ {val.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Linha Zero Destacada */}
          <line
            x1={padL}
            y1={yZero}
            x2={width - padR}
            y2={yZero}
            stroke="#64748b"
            strokeWidth="1.5"
          />

          {/* Linhas Verticais de Strikes */}
          {legs.map((leg, idx) => {
            const lx = getX(leg.strike);
            return (
              <g key={idx}>
                <line
                  x1={lx}
                  y1={padT}
                  x2={lx}
                  y2={height - padB}
                  stroke="#334155"
                  strokeDasharray="2 2"
                  strokeWidth="1"
                />
                <text
                  x={lx}
                  y={height - padB + 14}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  R$ {leg.strike.toFixed(2)}
                </text>
                <text
                  x={lx}
                  y={height - padB + 25}
                  textAnchor="middle"
                  fill={leg.action === 'COMPRA' ? '#10b981' : '#ef4444'}
                  fontSize="8"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {leg.action === 'COMPRA' ? '+C' : '-V'}
                </text>
              </g>
            );
          })}

          {/* Linha Vertical do Spot Atual */}
          <line
            x1={spotX}
            y1={padT}
            x2={spotX}
            y2={height - padB}
            stroke="#06b6d4"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <circle cx={spotX} cy={getY(spotPayoff)} r="4" fill="#06b6d4" stroke="#ffffff" strokeWidth="1.5" />
          <text
            x={spotX}
            y={padT - 8}
            textAnchor="middle"
            fill="#22d3ee"
            fontSize="9"
            fontWeight="bold"
            fontFamily="monospace"
          >
            Spot Atual (R$ {spot.toFixed(2)})
          </text>

          {/* Linha Vertical do Break-Even */}
          {breakEven >= minX && breakEven <= maxX && (
            <g>
              <line
                x1={breakEvenX}
                y1={padT + 20}
                x2={breakEvenX}
                y2={height - padB}
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle cx={breakEvenX} cy={yZero} r="4" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
              <text
                x={breakEvenX}
                y={yZero - 8}
                textAnchor="middle"
                fill="#fbbf24"
                fontSize="9"
                fontWeight="bold"
                fontFamily="monospace"
              >
                Break-Even (R$ {breakEven.toFixed(2)})
              </text>
            </g>
          )}

          {/* Curva Principal de Payoff */}
          <path
            d={linePath}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Legenda do Eixo X */}
        <div className="text-center text-[10px] text-gray-500 font-mono -mt-2">
          Preço do Ativo Subjacente ({electedStrategy.underlyingSymbol}) na Data de Vencimento (R$)
        </div>
      </div>

      {/* Painel Explicativo das Zonas de Retorno */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
        <div className="p-3 bg-[#0b101b] rounded-xl border border-emerald-500/20 space-y-1">
          <span className="text-[10px] text-emerald-400 font-bold block font-sans">
            🟢 ZONA DE LUCRO
          </span>
          <p className="text-white font-semibold">
            {isCredit
              ? `Acima de R$ ${breakEven.toFixed(2)} (Lucro máx: +R$ ${maxProfitLot.toFixed(2)})`
              : `Acima de R$ ${breakEven.toFixed(2)} (Lucro máx: +R$ ${maxProfitLot.toFixed(2)})`}
          </p>
          <span className="text-[10px] text-gray-400 block font-sans">
            Garante a retenção do prêmio ou valorização do spread.
          </span>
        </div>

        <div className="p-3 bg-[#0b101b] rounded-xl border border-amber-500/20 space-y-1">
          <span className="text-[10px] text-amber-400 font-bold block font-sans">
            ⚖️ PONTO DE EQUILÍBRIO (ZERO A ZERO)
          </span>
          <p className="text-amber-300 font-bold">R$ {breakEven.toFixed(2)}</p>
          <span className="text-[10px] text-gray-400 block font-sans">
            Preço exato onde o ganho do spread anula o custo de montagem.
          </span>
        </div>

        <div className="p-3 bg-[#0b101b] rounded-xl border border-red-500/20 space-y-1">
          <span className="text-[10px] text-red-400 font-bold block font-sans">
            🔴 ZONA DE PREJUÍZO CONTROLADO
          </span>
          <p className="text-red-300 font-semibold">
            Perda máx travada em -R$ {maxLossLot.toFixed(2)}
          </p>
          <span className="text-[10px] text-gray-400 block font-sans">
            Risco 100% blindado pelas travas de proteção B3 (sem risco de perda infinita).
          </span>
        </div>
      </div>
    </div>
  );
};
