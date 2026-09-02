'use client';

import React, { useState, useEffect } from 'react';
import {
  Thermometer,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Shield,
  Activity,
  Layers,
  Sparkles,
  Zap,
  Globe,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import {
  calculateMarketSentiment,
  MarketSentimentReport,
  SentimentZone,
} from '@/lib/domain/sentiment';
import { safeFetchJson } from '@/lib/utils/api-client';

interface SentimentThermometerProps {
  variant?: 'full' | 'compact' | 'footer';
  customReport?: MarketSentimentReport;
  onRefresh?: () => void;
}

export const SentimentThermometer: React.FC<SentimentThermometerProps> = ({
  variant = 'full',
  customReport,
  onRefresh,
}) => {
  const [sentiment, setSentiment] = useState<MarketSentimentReport>(
    customReport || calculateMarketSentiment()
  );
  const [loading, setLoading] = useState(false);

  const fetchLiveSentiment = async () => {
    setLoading(true);
    try {
      const res = await safeFetchJson<{ ok: boolean; data: MarketSentimentReport }>('/api/sentiment');
      if (res?.ok && res.data?.data) {
        setSentiment(res.data.data);
      } else {
        setSentiment(calculateMarketSentiment());
      }
    } catch {
      setSentiment(calculateMarketSentiment());
    } finally {
      setLoading(false);
    }
  };

  // Ciclo dinâmico de atualização horário
  useEffect(() => {
    fetchLiveSentiment();
    const interval = setInterval(fetchLiveSentiment, 30000); // Atualiza a cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  const score = sentiment.score;
  const temp = sentiment.temperatureCelsius;
  const zone = sentiment.zone;
  const schedule = sentiment.schedule;
  const session = sentiment.session;

  // Altura do mercúrio no termômetro vertical (0 a 100%)
  const mercuryHeightPct = Math.min(Math.max(score, 5), 95);

  // Cores dinâmicas
  const getMercuryGradient = (z: SentimentZone) => {
    switch (z) {
      case 'PESSIMISMO_EXTREMO':
        return 'from-blue-600 via-rose-600 to-red-500';
      case 'CAUTELA_MEDO':
        return 'from-blue-500 via-amber-600 to-orange-500';
      case 'NEUTRO':
        return 'from-amber-600 via-yellow-500 to-emerald-400';
      case 'OTIMISMO_MODERADO':
        return 'from-teal-600 via-emerald-500 to-green-400';
      case 'EUFORIA_GANANCIA':
      default:
        return 'from-emerald-500 via-teal-400 to-cyan-300';
    }
  };

  const getBulbColor = (z: SentimentZone) => {
    switch (z) {
      case 'PESSIMISMO_EXTREMO':
        return 'bg-red-500 shadow-red-500/50';
      case 'CAUTELA_MEDO':
        return 'bg-orange-500 shadow-orange-500/50';
      case 'NEUTRO':
        return 'bg-amber-400 shadow-amber-400/50';
      case 'OTIMISMO_MODERADO':
        return 'bg-emerald-400 shadow-emerald-400/50';
      case 'EUFORIA_GANANCIA':
      default:
        return 'bg-cyan-400 shadow-cyan-400/50';
    }
  };

  // =========================================================================
  // VARIANTE 1: COMPACT / FOOTER (Para o rodapé da página de recomendações)
  // =========================================================================
  if (variant === 'footer' || variant === 'compact') {
    return (
      <div className="bg-[#0b101b] border-2 border-emerald-500/30 rounded-2xl p-3.5 sm:p-4 shadow-2xl relative overflow-hidden font-sans">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5">
          {/* Lado Esquerdo: Ícone térmico e temperatura */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 rounded-xl border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <Thermometer className="w-5 h-5 text-emerald-400 animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  Termômetro de Mercado 24h:
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {temp}°C • {score}/100 pts
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  {session.timeSlotLabel}
                </span>
              </div>
              <p className="text-[11px] text-gray-300 mt-0.5">
                <strong className="text-emerald-400">{sentiment.zoneLabel}</strong> — {sentiment.tacticalGuidance.optionsGuidance}
              </p>
            </div>
          </div>

          {/* Mini Tubo Horizontal de Termômetro */}
          <div className="w-full lg:w-72 flex flex-col gap-1.5 shrink-0">
            <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
              <span className="text-red-400 font-bold">10°C (Frio)</span>
              <span className="text-amber-400 font-bold">25°C (Neutro)</span>
              <span className="text-emerald-400 font-bold">40°C (Aquecido)</span>
            </div>

            {/* Barra Termométrica Horizontal com Efeito de Vidro e Mercúrio */}
            <div className="relative w-full h-3.5 bg-slate-900 rounded-full border border-gray-700/80 overflow-hidden shadow-inner p-0.5">
              <div
                style={{ width: `${mercuryHeightPct}%` }}
                className={`h-full rounded-full bg-gradient-to-r ${getMercuryGradient(zone)} transition-all duration-700 shadow-md`}
              />
            </div>

            <div className="flex items-center justify-between text-[9px] font-mono text-gray-500">
              <span className="flex items-center gap-1 text-cyan-400">
                <Clock className="w-3 h-3" />
                {schedule.lastUpdateLabel}
              </span>
              <span>{schedule.nextUpdateLabel}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VARIANTE 2: FULL (Visão Completa do Termômetro na Visão Geral)
  // =========================================================================
  return (
    <div className="space-y-6">
      <div className="p-6 bg-gradient-to-br from-[#0b101b] via-[#111827] to-[#0f172a] rounded-3xl border-2 border-emerald-500/40 shadow-2xl space-y-6">
        {/* Cabeçalho do Card */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-800/80 pb-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 rounded-2xl text-slate-950 shadow-lg shadow-emerald-500/20 mt-0.5 shrink-0">
              <Thermometer className="w-7 h-7 font-black" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 tracking-wider font-mono">
                  MONITORAMENTO 24 HORAS
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Termômetro de Sentimento & Apetite a Risco
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
                  CICLO HORÁRIO (24H)
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-300 mt-1">
                Score térmico e barométrico consolidado em tempo real com base na cesta macro de índices, commodities e moedas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            <button
              onClick={fetchLiveSentiment}
              disabled={loading}
              className="p-2.5 bg-[#070b14] hover:bg-gray-800 rounded-xl border border-gray-800 text-gray-300 hover:text-white transition flex items-center gap-1.5 text-xs font-mono"
              title="Recarregar cotações globais"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            <div className="px-4 py-2 bg-[#070b14] rounded-2xl border border-gray-800 font-mono text-right">
              <span className="text-[10px] text-gray-400 block font-sans">CLIMA DE MERCADO</span>
              <span className="text-sm font-black text-emerald-400 flex items-center gap-1.5 justify-end">
                <span>{sentiment.zoneLabel}</span>
                <span className="text-white bg-slate-800 px-2 py-0.5 rounded-lg border border-gray-700">
                  {temp}°C
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Cesta de Ativos de Referência (Alinhada com o TradingView) */}
        {sentiment.marketQuotes && sentiment.marketQuotes.length > 0 && (
          <div className="p-3 bg-[#070b14] rounded-2xl border border-gray-800 shadow-inner">
            <div className="flex items-center justify-between gap-2 mb-2 px-1">
              <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1.5 font-mono">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                Cesta de Ativos de Referência Global (TradingView Real-Time Feed):
              </span>
              <span className="text-[10px] font-mono text-gray-500">Sincronizado</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {sentiment.marketQuotes.map((q) => {
                const isPositive = q.changePct >= 0;
                return (
                  <div
                    key={q.symbol}
                    className="p-2 bg-[#0c1220] rounded-xl border border-gray-800/80 flex flex-col justify-between font-mono"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold text-gray-200">{q.symbol}</span>
                      <span
                        className={`text-[9px] font-black flex items-center gap-0.5 ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {q.changePct.toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-xs font-black text-white mt-1">
                      {q.price > 1000 ? q.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : q.price.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Corpo: Termômetro Vertical à Esquerda e 5 Pilares à Direita */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* LADO ESQUERDO: TERMÔMETRO DE VIDRO VERTICAL AUTÊNTICO */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-[#070b14]/90 rounded-2xl border border-gray-800 shadow-2xl relative">
            <div className="w-full flex items-center justify-around gap-4 py-2">
              {/* Tubo Termométrico */}
              <div className="relative flex flex-col items-center">
                {/* Escala Graduada à Esquerda */}
                <div className="absolute -left-12 top-0 bottom-12 flex flex-col justify-between text-[10px] font-mono text-gray-400 text-right pr-2">
                  <span className="text-cyan-300 font-bold">40°C • 100</span>
                  <span className="text-emerald-400 font-bold">32°C • 75</span>
                  <span className="text-amber-400 font-bold">25°C • 50</span>
                  <span className="text-orange-400 font-bold">17°C • 25</span>
                  <span className="text-red-400 font-bold">10°C • 0</span>
                </div>

                {/* Tubo de Vidro (Cilindro) */}
                <div className="relative w-10 h-52 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-t-full border-2 border-gray-600/80 shadow-2xl overflow-hidden flex flex-col justify-end p-1">
                  {/* Linhas de Graduação Internas */}
                  <div className="absolute inset-0 flex flex-col justify-between py-3 pointer-events-none opacity-40">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((t) => (
                      <div key={t} className="w-full h-px bg-gray-400/50" />
                    ))}
                  </div>

                  {/* Reflexo de Vidro (Glass Highlight) */}
                  <div className="absolute left-1 top-2 bottom-2 w-1.5 bg-white/20 rounded-full blur-[0.5px] pointer-events-none z-20" />

                  {/* Coluna de Mercúrio Animada */}
                  <div
                    style={{ height: `${mercuryHeightPct}%` }}
                    className={`w-full rounded-t-full bg-gradient-to-t ${getMercuryGradient(zone)} transition-all duration-1000 shadow-lg relative z-10`}
                  >
                    {/* Brilho no topo do menisco */}
                    <div className="absolute -top-1 left-0 right-0 h-2 bg-white/60 rounded-full blur-[1px]" />
                  </div>
                </div>

                {/* Bulbo Inferior de Mercúrio com Glow */}
                <div className="relative -mt-3 z-20">
                  <div
                    className={`w-16 h-16 rounded-full ${getBulbColor(zone)} shadow-2xl flex flex-col items-center justify-center border-4 border-slate-950 transition-colors duration-700 animate-pulse text-center leading-none`}
                  >
                    <span className="text-slate-950 font-black font-mono text-xs tracking-tight">
                      {temp}°C
                    </span>
                    <span className="text-[9px] font-bold text-slate-950/80 font-mono mt-0.5">
                      {score} pts
                    </span>
                  </div>
                  {/* Reflexo do Bulbo */}
                  <div className="absolute top-2 left-3 w-4 h-4 bg-white/40 rounded-full blur-[1px] pointer-events-none" />
                </div>
              </div>

              {/* Informações Térmicas e Diagnóstico */}
              <div className="flex-1 max-w-[200px] space-y-2.5">
                <div className="p-3 bg-[#0c1220] rounded-xl border border-gray-800 space-y-1">
                  <span className="text-[10px] text-gray-400 font-mono block uppercase">
                    TEMPERATURA
                  </span>
                  <div className="text-2xl font-black text-white font-mono flex items-baseline gap-1">
                    <span>{temp}°C</span>
                    <span className="text-xs text-gray-400 font-normal">({score}/100 pts)</span>
                  </div>
                </div>

                <div className="p-3 bg-[#0c1220] rounded-xl border border-gray-800 space-y-1">
                  <span className="text-[10px] text-gray-400 font-mono block uppercase">
                    SESSÃO GLOBAL
                  </span>
                  <span className="text-xs font-bold text-cyan-300 font-mono block">
                    {session.sessionName}
                  </span>
                  <span className="text-[10px] text-gray-400 block leading-tight">
                    {session.sessionDescription}
                  </span>
                </div>
              </div>
            </div>

            {/* Legenda de Horário e Ciclo 24h */}
            <div className="w-full mt-4 pt-3.5 border-t border-gray-800/80 space-y-2 text-left bg-[#0c1220]/90 p-3.5 rounded-xl border border-cyan-500/20 shadow-inner">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-300 font-bold">
                  <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>{schedule.lastUpdateLabel}</span>
                </div>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  ATUALIZAÇÃO 24H (DE HORA EM HORA)
                </span>
              </div>

              <div className="flex items-center gap-2 text-[10.5px] font-mono text-amber-300/95 bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/25">
                <RefreshCw className="w-3 h-3 text-amber-400 shrink-0" />
                <span>
                  Próxima consolidação: <strong>{schedule.nextUpdateLabel}</strong>
                </span>
              </div>

              <p className="text-[10px] text-gray-400 font-sans leading-relaxed pt-0.5">
                <strong className="text-gray-300">Ciclo 24h Contínuo:</strong> O termômetro de sentimento é recalculado a cada hora fechada (24 vezes ao dia), capturando oscilações noturnas da Ásia, madrugada europeia, pré-mercado de NY e pregão B3 em tempo real.
              </p>
            </div>
          </div>

          {/* LADO DIREITO: 5 PILARES QUANTITATIVOS E DIRETRIZES TÁTICAS */}
          <div className="lg:col-span-7 space-y-3 font-mono">
            <div className="text-xs font-sans font-bold text-gray-300 flex items-center justify-between">
              <span>Decomposição dos 5 Pilares Quantitativos:</span>
              <span className="text-gray-400 text-[11px] font-mono">Score Final: {score}/100</span>
            </div>

            {sentiment.pillars.map((pillar) => (
              <div
                key={pillar.id}
                className="p-3 bg-[#070b14] rounded-xl border border-gray-800 hover:border-gray-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        pillar.status === 'ALTISTA' || pillar.status === 'POSITIVO'
                          ? 'bg-emerald-400'
                          : pillar.status === 'ESTAVEL'
                          ? 'bg-amber-400'
                          : 'bg-red-400'
                      }`}
                    />
                    <span className="font-sans text-gray-200 text-xs font-semibold">
                      {pillar.name}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-sans pl-4.5">
                    {pillar.summary}
                  </p>
                </div>

                <span
                  className={`text-xs font-bold font-mono shrink-0 ${
                    pillar.status === 'ALTISTA' || pillar.status === 'POSITIVO'
                      ? 'text-emerald-400'
                      : pillar.status === 'ESTAVEL'
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}
                >
                  {pillar.statusLabel}
                </span>
              </div>
            ))}

            {/* Diretrizes Táticas de Execução */}
            <div className="p-3.5 bg-gradient-to-r from-[#0d1527] to-[#070b14] rounded-xl border border-cyan-500/30 font-sans space-y-1.5 text-xs text-gray-300 mt-3">
              <div className="flex items-center gap-1.5 font-bold text-cyan-300 font-mono text-xs">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Diretrizes Táticas Sugeridas para a Sessão:</span>
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed">
                • <strong>Opções & Derivativos:</strong> {sentiment.tacticalGuidance.optionsGuidance}
              </p>
              <p className="text-[11px] text-gray-300 leading-relaxed">
                • <strong>Ações à Vista:</strong> {sentiment.tacticalGuidance.stockGuidance}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
