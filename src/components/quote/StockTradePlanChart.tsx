'use client';

import React, { useState } from 'react';
import { HistoricalPrice } from '@/lib/types/financial';
import { Crosshair, TrendingUp, ShieldAlert, Target, Activity } from 'lucide-react';

interface StockTradePlanChartProps {
  symbol: string;
  historicalPrices: HistoricalPrice[];
  entryPrice: number;
  stopLoss: number;
  target1: number;
  target2: number;
  bias: 'LONG' | 'SHORT' | string;
}

export const StockTradePlanChart: React.FC<StockTradePlanChartProps> = ({
  symbol,
  historicalPrices,
  entryPrice,
  stopLoss,
  target1,
  target2,
  bias,
}) => {
  const [period, setPeriod] = useState<number>(60);

  const visibleHistory = (historicalPrices || []).slice(
    Math.max(0, (historicalPrices || []).length - period)
  );

  if (visibleHistory.length < 2) {
    return (
      <div className="p-6 bg-[#070b14] rounded-xl border border-gray-800 text-center text-xs text-gray-400">
        Histórico insuficiente para gerar gráfico de trade plan.
      </div>
    );
  }

  // Preços notáveis
  const keyPrices = [entryPrice, stopLoss, target1, target2].filter((p) => p > 0);
  const candleLows = visibleHistory.map((h) => h.low);
  const candleHighs = visibleHistory.map((h) => h.high);

  const minPrice = Math.min(...candleLows, ...keyPrices) * 0.98;
  const maxPrice = Math.max(...candleHighs, ...keyPrices) * 1.02;

  // Dimensões do SVG
  const width = 760;
  const height = 300;
  const padL = 40;
  const padR = 120;
  const padT = 25;
  const padB = 30;

  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const candleCount = visibleHistory.length;
  const candleStep = chartW / candleCount;
  const candleWidth = Math.max(2.5, candleStep * 0.65);

  const getY = (p: number) => padT + chartH - ((p - minPrice) / (maxPrice - minPrice)) * chartH;

  const yEntry = getY(entryPrice);
  const yStop = getY(stopLoss);
  const yTarget1 = getY(target1);
  const yTarget2 = getY(target2);

  const isLong = bias === 'LONG' || bias === 'ALTA';
  const riskPerShare = Math.abs(entryPrice - stopLoss);
  const reward1PerShare = Math.abs(target1 - entryPrice);
  const reward2PerShare = Math.abs(target2 - entryPrice);

  return (
    <div className="p-4 sm:p-5 bg-[#070b14] border border-emerald-500/30 rounded-2xl shadow-2xl space-y-3 font-sans">
      {/* Header do Gráfico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold font-mono">
              PLANO DE TRADE CNPI-T
            </span>
            <h4 className="font-bold text-white text-sm sm:text-base">
              Gráfico de Candlestick com Níveis de Entrada, Stop Loss e Alvos
            </h4>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Posicionamento gráfico dos gatilhos técnicos de execução para <strong>{symbol}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#111827] p-1 rounded-xl border border-gray-800 text-xs font-mono">
          {[
            { p: 30, label: '30P' },
            { p: 60, label: '60P' },
            { p: 90, label: '90P' },
          ].map((btn) => (
            <button
              key={btn.p}
              onClick={() => setPeriod(btn.p)}
              className={`px-2.5 py-1 rounded-lg transition ${
                period === btn.p ? 'bg-emerald-600 text-white font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gráfico SVG */}
      <div className="w-full bg-[#040711] p-3 rounded-xl border border-gray-900 overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {/* ZONAS SOMBREADAS DE RISCO E RETORNO */}
          {/* Zona de Alvo (Verde) */}
          <rect
            x={padL}
            y={Math.min(yEntry, yTarget2)}
            width={chartW}
            height={Math.abs(yTarget2 - yEntry)}
            fill="#10b981"
            opacity="0.08"
          />

          {/* Zona de Risco / Stop (Vermelho) */}
          <rect
            x={padL}
            y={Math.min(yEntry, yStop)}
            width={chartW}
            height={Math.abs(yStop - yEntry)}
            fill="#ef4444"
            opacity="0.10"
          />

          {/* Linhas de Grade Horizontal */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const p = minPrice + pct * (maxPrice - minPrice);
            const y = getY(p);
            return (
              <line
                key={i}
                x1={padL}
                y1={y}
                x2={width - padR}
                y2={y}
                stroke="#1e293b"
                strokeDasharray="3 3"
              />
            );
          })}

          {/* Candlesticks */}
          {visibleHistory.map((item, idx) => {
            const xCenter = padL + idx * candleStep + candleStep / 2;
            const isGreen = item.close >= item.open;
            const color = isGreen ? '#10b981' : '#ef4444';
            const yHigh = getY(item.high);
            const yLow = getY(item.low);
            const yOpen = getY(item.open);
            const yClose = getY(item.close);
            const bodyY = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(1.5, Math.abs(yOpen - yClose));

            return (
              <g key={idx}>
                <line x1={xCenter} y1={yHigh} x2={xCenter} y2={yLow} stroke={color} strokeWidth="1" />
                <rect
                  x={xCenter - candleWidth / 2}
                  y={bodyY}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={color}
                  rx="0.5"
                />
              </g>
            );
          })}

          {/* LINHA DE ENTRADA (CYAN) */}
          <g>
            <line
              x1={padL}
              y1={yEntry}
              x2={width - padR}
              y2={yEntry}
              stroke="#06b6d4"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            {/* Tag no Eixo Direito */}
            <rect
              x={width - padR + 6}
              y={yEntry - 10}
              width={108}
              height={20}
              fill="#083344"
              stroke="#06b6d4"
              rx="4"
            />
            <text
              x={width - padR + 12}
              y={yEntry + 4}
              fill="#22d3ee"
              fontSize="9"
              fontWeight="bold"
              fontFamily="monospace"
            >
              ENTRADA R$ {entryPrice.toFixed(2)}
            </text>
          </g>

          {/* LINHA DE STOP LOSS (RED) */}
          {stopLoss > 0 && (
            <g>
              <line
                x1={padL}
                y1={yStop}
                x2={width - padR}
                y2={yStop}
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              <rect
                x={width - padR + 6}
                y={yStop - 10}
                width={108}
                height={20}
                fill="#450a0a"
                stroke="#ef4444"
                rx="4"
              />
              <text
                x={width - padR + 12}
                y={yStop + 4}
                fill="#f87171"
                fontSize="9"
                fontWeight="bold"
                fontFamily="monospace"
              >
                STOP R$ {stopLoss.toFixed(2)}
              </text>
            </g>
          )}

          {/* LINHA DE ALVO 1 (GREEN) */}
          {target1 > 0 && (
            <g>
              <line
                x1={padL}
                y1={yTarget1}
                x2={width - padR}
                y2={yTarget1}
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <rect
                x={width - padR + 6}
                y={yTarget1 - 10}
                width={108}
                height={20}
                fill="#064e3b"
                stroke="#10b981"
                rx="4"
              />
              <text
                x={width - padR + 12}
                y={yTarget1 + 4}
                fill="#34d399"
                fontSize="9"
                fontWeight="bold"
                fontFamily="monospace"
              >
                ALVO 1 R$ {target1.toFixed(2)}
              </text>
            </g>
          )}

          {/* LINHA DE ALVO 2 (GREEN) */}
          {target2 > 0 && (
            <g>
              <line
                x1={padL}
                y1={yTarget2}
                x2={width - padR}
                y2={yTarget2}
                stroke="#10b981"
                strokeWidth="2"
              />
              <rect
                x={width - padR + 6}
                y={yTarget2 - 10}
                width={108}
                height={20}
                fill="#064e3b"
                stroke="#10b981"
                rx="4"
              />
              <text
                x={width - padR + 12}
                y={yTarget2 + 4}
                fill="#34d399"
                fontSize="9"
                fontWeight="bold"
                fontFamily="monospace"
              >
                ALVO 2 R$ {target2.toFixed(2)}
              </text>
            </g>
          )}
        </svg>

        <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono pt-1 border-t border-gray-900">
          <span>{visibleHistory[0]?.date ? new Date(visibleHistory[0].date).toLocaleDateString('pt-BR') : ''}</span>
          <span>Evolução dos Preços e Zonas de Decisão</span>
          <span>{visibleHistory[visibleHistory.length - 1]?.date ? new Date(visibleHistory[visibleHistory.length - 1].date).toLocaleDateString('pt-BR') : ''}</span>
        </div>
      </div>

      {/* 3 CARDS INFORMATIVOS DO TRADE PLAN */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
        <div className="p-3 bg-[#0b101b] rounded-xl border border-cyan-500/20 space-y-1">
          <span className="text-[10px] text-cyan-400 font-bold block font-sans">
            🎯 GATILHO DE ENTRADA
          </span>
          <p className="text-white font-bold text-sm">R$ {entryPrice.toFixed(2)}</p>
          <span className="text-[10px] text-gray-400 block font-sans">
            Ordem a mercado ou limitada no rompimento/pullback.
          </span>
        </div>

        <div className="p-3 bg-[#0b101b] rounded-xl border border-red-500/20 space-y-1">
          <span className="text-[10px] text-red-400 font-bold block font-sans">
            🛑 RISCO MÁXIMO (STOP LOSS)
          </span>
          <p className="text-red-400 font-bold text-sm">
            R$ {stopLoss.toFixed(2)}{' '}
            <span className="text-xs text-gray-400 font-normal">
              (-R$ {riskPerShare.toFixed(2)} / cota)
            </span>
          </p>
          <span className="text-[10px] text-gray-400 block font-sans">
            Desarmar posição na perda do suporte ou MM20.
          </span>
        </div>

        <div className="p-3 bg-[#0b101b] rounded-xl border border-emerald-500/20 space-y-1">
          <span className="text-[10px] text-emerald-400 font-bold block font-sans">
            💰 RETORNO ESPERADO (ALVO 1 / 2)
          </span>
          <p className="text-emerald-400 font-bold text-sm">
            R$ {target1.toFixed(2)} • R$ {target2.toFixed(2)}
          </p>
          <span className="text-[10px] text-gray-400 block font-sans">
            +R$ {reward1PerShare.toFixed(2)} no Alvo 1 | +R$ {reward2PerShare.toFixed(2)} no Alvo 2.
          </span>
        </div>
      </div>
    </div>
  );
};
