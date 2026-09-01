const fs = require('fs');
const path = require('path');

const targetBase = 'C:/projetos antigravity/RADAR-TASYTRADE';

// 1. Create OptionPayoffChart.tsx
const payoffChartCode = `'use client';

import React from 'react';
import { AlertTriangle, Info, Shield } from 'lucide-react';

export interface OptionLegData {
  action: 'COMPRA' | 'VENDA';
  symbol: string;
  type: 'CALL' | 'PUT';
  strike: number;
  unitPrice: number;
  totalFinancial: number;
  openInterest: number;
  roleDescription?: string;
}

export interface ElectedStrategyData {
  id: number;
  title: string;
  bias: 'ALTA' | 'BAIXA' | 'LATERAL';
  category: string;
  underlyingSymbol: string;
  underlyingPrice: number;
  dte: number;
  expirationDate: string;
  status: string;
  isCredit: boolean;
  netCostOrCredit: number;
  totalCostOrCreditForLot: number;
  spreadWidth: number;
  returnOnRiskPct: number;
  breakEven: number;
  maxProfitLot: number;
  maxLossLot: number;
  legs: OptionLegData[];
  tradeCheckGuide?: string;
  pricingViability?: {
    isAdequate: boolean;
    statusLabel: string;
    ratioToWidthPct: number;
    recommendationRule: string;
  };
  takeProfitRule: {
    profitGoal: string;
    description: string;
  };
  stopLossRule: {
    lossLimit: string;
    description: string;
  };
  timeStopRule: {
    dteLimit: number;
    description: string;
  };
}

interface OptionPayoffChartProps {
  electedStrategy: ElectedStrategyData;
}

export const OptionPayoffChart: React.FC<OptionPayoffChartProps> = ({ electedStrategy }) => {
  const {
    underlyingPrice: spot,
    legs,
    maxProfitLot,
    maxLossLot,
    breakEven,
    isCredit,
    title,
    bias,
    tradeCheckGuide,
    netCostOrCredit,
    pricingViability,
  } = electedStrategy;

  // Calcular Payoff unitário em $ para um determinado preço S no vencimento
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
        totalUnitPayoff += intrinsic - leg.unitPrice;
      } else {
        totalUnitPayoff += leg.unitPrice - intrinsic;
      }
    }

    return totalUnitPayoff;
  };

  const allStrikes = legs.map((l) => l.strike);
  const minK = Math.min(...(allStrikes.length ? allStrikes : [spot]), spot);
  const maxK = Math.max(...(allStrikes.length ? allStrikes : [spot]), spot);
  const paddingX = Math.max((maxK - minK) * 0.45, spot * 0.10);

  const minX = Math.max(0.5, Number((minK - paddingX).toFixed(2)));
  const maxX = Number((maxK + paddingX).toFixed(2));

  const steps = 70;
  const stepSize = (maxX - minX) / steps;
  const points: Array<{ s: number; unitP: number; lotP: number }> = [];

  for (let i = 0; i <= steps; i++) {
    const s = minX + i * stepSize;
    const unitP = calculateUnitPayoffAt(s);
    const lotP = unitP * 100; // US standard contract = 100 shares
    points.push({ s, unitP, lotP });
  }

  const specialPrices = [...allStrikes, spot, breakEven].filter(
    (p) => p >= minX && p <= maxX
  );

  for (const sp of specialPrices) {
    const unitP = calculateUnitPayoffAt(sp);
    const lotP = unitP * 100;
    points.push({ s: sp, unitP, lotP });
  }

  points.sort((a, b) => a.s - b.s);

  const allLots = points.map((p) => p.lotP);
  const minLot = Math.min(...allLots, 0);
  const maxLot = Math.max(...allLots, 0);
  const yRangeMax = Math.max(Math.abs(minLot), Math.abs(maxLot), 25) * 1.3;

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

  const yZero = getY(0);

  let linePath = '';
  points.forEach((pt, idx) => {
    const px = getX(pt.s);
    const py = getY(pt.lotP);

    if (idx === 0) {
      linePath = \`M \${px} \${py}\`;
    } else {
      linePath += \` L \${px} \${py}\`;
    }
  });

  const spotX = getX(spot);
  const breakEvenX = getX(breakEven);
  const spotPayoff = calculateUnitPayoffAt(spot) * 100;

  const biasBadge =
    bias === 'ALTA'
      ? { label: 'viés: ALTA ↑', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' }
      : bias === 'BAIXA'
      ? { label: 'viés: BAIXA ↓', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' }
      : { label: 'viés: LATERAL ↔', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };

  return (
    <div data-testid="options-payoff-chart" className="p-5 bg-[#070b14] border border-cyan-500/30 rounded-2xl shadow-2xl space-y-4 font-sans">
      {/* Header do Gráfico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-white text-base uppercase tracking-wide">
              {title}
            </h4>
            <span className={\`px-2 py-0.5 rounded text-[11px] font-bold font-mono border \${biasBadge.color}\`}>
              [{biasBadge.label}]
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1 font-mono">
            Prêmios Tastytrade · ativo a \${spot.toFixed(2)} naquele fechamento · Perfil de Lucro e Prejuízo no Vencimento (Contrato 100 cotas)
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs shrink-0">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
            Lucro Máx: +\${maxProfitLot.toFixed(2)}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 font-bold">
            Perda Máx: -\${maxLossLot.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Composição das Pernas */}
      {legs.length > 0 && (
        <div className="p-4 bg-[#0b101b] border border-gray-800 rounded-xl space-y-2.5 font-mono text-xs">
          <div className="text-[11px] font-sans font-bold text-gray-400 uppercase tracking-wider">
            COMPOSIÇÃO DAS PERNAS DO ESTUDO (TASTYTRADE):
          </div>
          <div className="space-y-1.5">
            {legs.map((leg, i) => (
              <div
                key={i}
                className={\`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 \${
                  leg.action === 'VENDA'
                    ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                    : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                }\`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold">
                    {i === 0 ? '①' : i === 1 ? '②' : i === 2 ? '③' : '④'} {leg.action}
                  </span>
                  <span className="font-bold text-white">{leg.symbol}</span>
                  <span className="text-gray-400">
                    {leg.type} strike \${leg.strike.toFixed(2)}
                  </span>
                  {leg.roleDescription && (
                    <span className="text-[11px] text-gray-300 font-sans">
                      ({leg.roleDescription})
                    </span>
                  )}
                </div>
                <div className="text-right text-gray-300 font-bold">
                  {leg.action === 'VENDA' ? '+' : '−'}\${leg.unitPrice.toFixed(2)} / cota
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2.5 border-t border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className={\`font-bold \${isCredit ? 'text-emerald-400' : 'text-cyan-400'}\`}>
                {isCredit ? 'Crédito Líquido:' : 'Custo Líquido (Débito):'} {isCredit ? '+' : '−'}\${Math.abs(netCostOrCredit).toFixed(2)} / cota
              </span>
              <span className="text-gray-400 font-sans">
                (Total: \${(Math.abs(netCostOrCredit) * 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} por contrato de 100)
              </span>
            </div>
            {pricingViability && (
              <div className="flex items-center gap-1.5 text-[11px] text-gray-300 font-sans">
                <Shield className={\`w-3.5 h-3.5 \${pricingViability.isAdequate ? 'text-emerald-400' : 'text-amber-400'}\`} />
                <span>{pricingViability.statusLabel} ({pricingViability.ratioToWidthPct}% da asa)</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trade Check Guide */}
      {tradeCheckGuide && (
        <div className="p-3 bg-cyan-950/20 border border-cyan-500/40 rounded-xl text-xs text-cyan-200 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{tradeCheckGuide}</p>
        </div>
      )}

      {/* SVG Payoff Chart */}
      <div className="w-full bg-[#040711] p-3 rounded-xl border border-gray-900 overflow-hidden relative">
        <svg viewBox={\`0 0 \${width} \${height}\`} className="w-full h-auto">
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
                  strokeDasharray={isZero ? undefined : '2 2'}
                />
                <text
                  x={padL - 8}
                  y={yPos + 3}
                  textAnchor="end"
                  fill={isZero ? '#94a3b8' : ratio > 0 ? '#34d399' : '#f87171'}
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {isZero ? '$0' : \`\${ratio > 0 ? '+' : ''}\$\${val.toFixed(0)}\`}
                </text>
              </g>
            );
          })}

          {/* Linha Vertical do Spot */}
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
            Spot Atual (\${spot.toFixed(2)})
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
                Break-Even (\${breakEven.toFixed(2)})
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

        <div className="text-center text-[10px] text-gray-500 font-mono -mt-2">
          Preço do Ativo Subjacente ({electedStrategy.underlyingSymbol}) no Vencimento (\$)
        </div>
      </div>

      {/* Painel Explicativo das 3 Zonas de Retorno */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
        <div className="p-3 bg-[#0b101b] rounded-xl border border-emerald-500/20 space-y-1">
          <span className="text-[10px] text-emerald-400 font-bold block font-sans">
            🟢 ZONA DE LUCRO
          </span>
          <p className="text-white font-semibold">
            {bias === 'ALTA'
              ? \`Acima de \$\${breakEven.toFixed(2)} (Lucro máx: +\$\${maxProfitLot.toFixed(2)})\`
              : bias === 'BAIXA'
              ? \`Abaixo de \$\${breakEven.toFixed(2)} (Lucro máx: +\$\${maxProfitLot.toFixed(2)})\`
              : \`Entre os strikes de equilíbrio\`}
          </p>
          <span className="text-[10px] text-gray-400 block font-sans">
            Garante a retenção do prêmio recebido na montagem da opção.
          </span>
        </div>

        <div className="p-3 bg-[#0b101b] rounded-xl border border-amber-500/20 space-y-1">
          <span className="text-[10px] text-amber-400 font-bold block font-sans">
            ⚖️ PONTO DE EQUILÍBRIO (ZERO A ZERO)
          </span>
          <p className="text-amber-300 font-bold">\${breakEven.toFixed(2)}</p>
          <span className="text-[10px] text-gray-400 block font-sans">
            Preço exato onde o ganho da opção anula o custo de montagem.
          </span>
        </div>

        <div className="p-3 bg-[#0b101b] rounded-xl border border-red-500/20 space-y-1">
          <span className="text-[10px] text-red-400 font-bold block font-sans">
            🔴 ZONA DE PREJUÍZO CONTROLADO
          </span>
          <p className="text-red-300 font-semibold">
            Perda máx travada em -\${maxLossLot.toFixed(2)}
          </p>
          <span className="text-[10px] text-gray-400 block font-sans">
            Risco 100% blindado pelas travas de proteção Tastytrade.
          </span>
        </div>
      </div>
    </div>
  );
};
`;

fs.writeFileSync(path.join(targetBase, 'src/components/options/OptionPayoffChart.tsx'), payoffChartCode.trim(), 'utf8');
console.log('Created OptionPayoffChart.tsx successfully');
