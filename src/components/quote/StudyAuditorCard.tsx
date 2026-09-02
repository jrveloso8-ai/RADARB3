'use client';

import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Activity,
  Layers,
  Target,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Award,
  Sparkles,
  Lock,
  Clock,
  BookOpen,
} from 'lucide-react';
import { QuoteDetails } from '@/lib/types/financial';
import { generateStudyAudit, StudyAuditReport } from '@/lib/domain/study-auditor';

interface StudyAuditorCardProps {
  quote: QuoteDetails;
}

export const StudyAuditorCard: React.FC<StudyAuditorCardProps> = ({ quote }) => {
  const [audit, setAudit] = useState<StudyAuditReport>(() => generateStudyAudit(quote));
  const [activeSection, setActiveSection] = useState<'ALL' | 'TECNICA' | 'FUNDAMENTALISTA' | 'BARREIRAS' | 'OPCOES' | 'TRADE_VISTA'>('ALL');
  const [isCopied, setIsCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Atualiza se o quote mudar
  React.useEffect(() => {
    setAudit(generateStudyAudit(quote));
  }, [quote]);

  const handleCopyReport = () => {
    const text = `=== PARECER DO AUDITOR RADAR B3 PRO ===
Ativo: ${audit.symbol} (${audit.price.toFixed(2)})
Veredito: ${audit.verdict}
Selo: ${audit.auditSeal.label} (${audit.auditSeal.certificateNumber})

1. AUDITORIA TÉCNICA (Score: ${audit.technicalAudit.score}/5):
${audit.technicalAudit.items.map(i => `• [${i.status}] ${i.title}: ${i.metricValue} - ${i.justification}`).join('\n')}

2. AUDITORIA FUNDAMENTALISTA (Status: ${audit.fundamentalAudit.status} / Score: ${audit.fundamentalAudit.score}/100):
${audit.fundamentalAudit.items.map(i => `• [${i.status}] ${i.title}: ${i.metricValue} - ${i.justification}`).join('\n')}

3. AUDITORIA DE DERIVATIVOS E BARREIRAS:
• ${audit.barrierAudit.summary}
${audit.barrierAudit.items.map(i => `• [${i.status}] ${i.title}: ${i.metricValue}`).join('\n')}

4. JUSTIFICATIVA DA ESTRATÉGIA DE OPÇÕES:
• Estrutura: ${audit.optionsStrategyJustification.strategyName}
• Motivação: ${audit.optionsStrategyJustification.whySelected}
• Strikes & Delta: ${audit.optionsStrategyJustification.strikeChoiceRationale}
• Risco/Retorno: ${audit.optionsStrategyJustification.riskRewardRationale}

5. JUSTIFICATIVA DA COMPRA À VISTA:
• Entrada: ${audit.spotTradePlanJustification.entryRationale}
• Stop Loss: ${audit.spotTradePlanJustification.stopLossRationale}
• Alvo 1: ${audit.spotTradePlanJustification.target1Rationale}
• Alvo 2: ${audit.spotTradePlanJustification.target2Rationale}
• Condução: ${audit.spotTradePlanJustification.trailingStopRule}
======================================`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const sealColor = audit.isBlocked
    ? 'border-red-500/50 bg-red-950/30 text-red-400'
    : audit.barrierAudit.hasImmediateBarrier
    ? 'border-amber-500/50 bg-amber-950/30 text-amber-400'
    : 'border-emerald-500/50 bg-emerald-950/30 text-emerald-400';

  return (
    <div className="bg-[#0b101b] border-2 border-cyan-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 font-sans">
      {/* 1. CABEÇALHO DO AUDITOR COM SELO DE CERTIFICAÇÃO */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-400 rounded-2xl text-slate-950 shadow-lg shadow-cyan-500/20 mt-0.5 shrink-0">
            <ShieldCheck className="w-7 h-7 font-black" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 tracking-wider font-mono">
                AUDITORIA DE ESTUDOS
              </span>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Parecer do Auditor: {audit.symbol}
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border ${sealColor}`}>
                {audit.auditSeal.label}
              </span>
            </div>
            <p className="text-xs text-gray-300 mt-1">
              Justificativa rigorosa e transparente do veredito pelas 3 camadas regulatórias (CNPI-T, CNPI-P e CME-25).
            </p>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
          <button
            onClick={handleCopyReport}
            className="px-3 py-1.5 rounded-xl bg-[#111827] hover:bg-gray-800 border border-gray-700 text-xs text-gray-300 font-mono transition flex items-center gap-1.5"
            title="Copiar parecer completo para a área de transferência"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{isCopied ? 'Copiado!' : 'Copiar Parecer'}</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 rounded-xl bg-[#111827] hover:bg-gray-800 border border-gray-700 text-xs text-gray-300 font-mono transition flex items-center gap-1.5"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{isExpanded ? 'Recolher' : 'Expandir Auditor'}</span>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-5">
          {/* 2. CARD RESUMO DO VEREDITO DO AUDITOR */}
          <div className={`p-4 rounded-2xl border ${audit.isBlocked ? 'bg-red-950/20 border-red-500/40' : 'bg-[#0e1628] border-cyan-500/30'} space-y-2`}>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-gray-400 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-cyan-400" />
                <span>Certificado: <strong>{audit.auditSeal.certificateNumber}</strong></span>
              </span>
              <span className="text-gray-400">Modelo: {audit.auditSeal.model}</span>
            </div>

            <h4 className="text-sm sm:text-base font-bold text-white">
              {audit.overallVerdictRationale.title}
            </h4>

            <p className="text-xs text-gray-300 leading-relaxed">
              {audit.overallVerdictRationale.summary}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-gray-800/80 text-[11px] text-gray-300">
              {audit.overallVerdictRationale.keyFactors.map((factor, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span>{factor}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. NAVEGAÇÃO ENTRE AS 5 SEÇÕES DE AUDITORIA */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-gray-800 pb-2.5 text-xs font-mono">
            {[
              { id: 'ALL', label: 'Visão Geral (Todas)' },
              { id: 'TECNICA', label: `1. Técnica (${audit.technicalAudit.score}/5)` },
              { id: 'FUNDAMENTALISTA', label: `2. Fundamentos (${audit.fundamentalAudit.status})` },
              { id: 'BARREIRAS', label: '3. Barreiras & GEX' },
              { id: 'OPCOES', label: '4. Opções Eleita' },
              { id: 'TRADE_VISTA', label: '5. Compra à Vista' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap font-bold border ${
                  activeSection === tab.id
                    ? 'bg-cyan-600 text-slate-950 border-cyan-400 shadow-md'
                    : 'bg-[#111827] text-gray-400 border-gray-800 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ================================================================= */}
          {/* SEÇÃO 1: AUDITORIA TÉCNICA DETALHADA */}
          {/* ================================================================= */}
          {(activeSection === 'ALL' || activeSection === 'TECNICA') && (
            <div className="p-4 bg-[#0e1422] rounded-2xl border border-gray-800 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    1. Auditoria da Análise Técnica (CNPI-T / 5 Critérios)
                  </h4>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${audit.technicalAudit.passed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                  {audit.technicalAudit.statusLabel}
                </span>
              </div>

              <div className="space-y-2.5">
                {audit.technicalAudit.items.map((item) => (
                  <div key={item.id} className="p-3 bg-[#070b14] rounded-xl border border-gray-800/80 space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        {item.status === 'APROVADO' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : item.status === 'ALERTA' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                        )}
                        <span className="font-bold text-white">{item.title}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold self-start sm:self-auto ${
                        item.status === 'APROVADO' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                        item.status === 'ALERTA' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                        'bg-red-500/10 text-red-400 border border-red-500/30'
                      }`}>
                        {item.badgeLabel}
                      </span>
                    </div>

                    <div className="text-[11px] text-gray-300 font-sans pl-6 space-y-0.5">
                      <p>{item.justification}</p>
                      <div className="text-[10px] text-gray-500 font-mono flex items-center gap-3 pt-0.5">
                        <span>Métrica: <strong className="text-gray-400">{item.metricValue}</strong></span>
                        <span>•</span>
                        <span>Critério: {item.benchmark}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SEÇÃO 2: AUDITORIA FUNDAMENTALISTA DETALHADA */}
          {/* ================================================================= */}
          {(activeSection === 'ALL' || activeSection === 'FUNDAMENTALISTA') && (
            <div className="p-4 bg-[#0e1422] rounded-2xl border border-gray-800 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    2. Auditoria da Análise Fundamentalista (CNPI-P / Solvência & Valuation)
                  </h4>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${audit.fundamentalAudit.passed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                  {audit.fundamentalAudit.status} (Score {audit.fundamentalAudit.score}/100)
                </span>
              </div>

              <div className="space-y-2.5">
                {audit.fundamentalAudit.items.map((item) => (
                  <div key={item.id} className="p-3 bg-[#070b14] rounded-xl border border-gray-800/80 space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        {item.status === 'APROVADO' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : item.status === 'NEUTRO' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                        )}
                        <span className="font-bold text-white">{item.title}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold self-start sm:self-auto ${
                        item.status === 'APROVADO' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                        item.status === 'NEUTRO' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                        'bg-red-500/10 text-red-400 border border-red-500/30'
                      }`}>
                        {item.badgeLabel}
                      </span>
                    </div>

                    <div className="text-[11px] text-gray-300 font-sans pl-6 space-y-0.5">
                      <p>{item.justification}</p>
                      <div className="text-[10px] text-gray-500 font-mono flex items-center gap-3 pt-0.5">
                        <span>Dado: <strong className="text-gray-400">{item.metricValue}</strong></span>
                        <span>•</span>
                        <span>Benchmark: {item.benchmark}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SEÇÃO 3: AUDITORIA DE BARREIRAS DE DERIVATIVOS & GEX */}
          {/* ================================================================= */}
          {(activeSection === 'ALL' || activeSection === 'BARREIRAS') && (
            <div className="p-4 bg-[#0e1422] rounded-2xl border border-gray-800 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    3. Auditoria de Barreiras de Derivativos & Call/Put Walls
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-gray-400">
                  {audit.barrierAudit.summary}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {audit.barrierAudit.items.map((item) => (
                  <div key={item.id} className="p-3 bg-[#070b14] rounded-xl border border-gray-800 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{item.title}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${item.status === 'APROVADO' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        {item.badgeLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-300 font-sans leading-relaxed">{item.justification}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SEÇÃO 4: JUSTIFICATIVA DA ESTRATÉGIA DE OPÇÕES ELEITA */}
          {/* ================================================================= */}
          {(activeSection === 'ALL' || activeSection === 'OPCOES') && (
            <div className="p-4 bg-[#0e1422] rounded-2xl border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    4. Justificativa da Estratégia de Opções: {audit.optionsStrategyJustification.strategyName}
                  </h4>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  Estratégia #{audit.optionsStrategyJustification.strategyId}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#070b14] rounded-xl border border-gray-800 space-y-1">
                  <span className="font-bold text-cyan-300 font-mono block">💡 Motivação da Escolha:</span>
                  <p className="text-gray-300 leading-relaxed">{audit.optionsStrategyJustification.whySelected}</p>
                </div>

                <div className="p-3 bg-[#070b14] rounded-xl border border-gray-800 space-y-1">
                  <span className="font-bold text-emerald-400 font-mono block">🎯 Critério de Strikes & Delta:</span>
                  <p className="text-gray-300 leading-relaxed">{audit.optionsStrategyJustification.strikeChoiceRationale}</p>
                </div>

                <div className="p-3 bg-[#070b14] rounded-xl border border-gray-800 space-y-1">
                  <span className="font-bold text-amber-300 font-mono block">⏳ Decaimento Temporal (Theta) & Volatilidade:</span>
                  <p className="text-gray-300 leading-relaxed">{audit.optionsStrategyJustification.thetaDecayRationale}</p>
                </div>

                <div className="p-3 bg-[#070b14] rounded-xl border border-gray-800 space-y-1">
                  <span className="font-bold text-purple-300 font-mono block">💰 Risco/Retorno & Proteção:</span>
                  <p className="text-gray-300 leading-relaxed">{audit.optionsStrategyJustification.riskRewardRationale}</p>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SEÇÃO 5: JUSTIFICATIVA DO PLANO DE TRADE DA AÇÃO À VISTA */}
          {/* ================================================================= */}
          {(activeSection === 'ALL' || activeSection === 'TRADE_VISTA') && (
            <div className="p-4 bg-[#0e1422] rounded-2xl border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    5. Justificativa do Plano de Trade da Ação à Vista ({audit.spotTradePlanJustification.bias})
                  </h4>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                  R:R = {audit.spotTradePlanJustification.riskRewardRatio.toFixed(2)} : 1
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                <div className="p-3 bg-[#070b14] rounded-xl border border-gray-800 space-y-1">
                  <span className="text-[10px] text-gray-400 font-mono uppercase block">Entrada Técnica</span>
                  <p className="text-gray-300 text-[11px] leading-relaxed">{audit.spotTradePlanJustification.entryRationale}</p>
                </div>

                <div className="p-3 bg-[#070b14] rounded-xl border border-red-500/30 space-y-1">
                  <span className="text-[10px] text-red-400 font-mono uppercase block">Stop Loss Técnico</span>
                  <p className="text-gray-300 text-[11px] leading-relaxed">{audit.spotTradePlanJustification.stopLossRationale}</p>
                </div>

                <div className="p-3 bg-[#070b14] rounded-xl border border-emerald-500/30 space-y-1">
                  <span className="text-[10px] text-emerald-400 font-mono uppercase block">Alvo 1 (Breakeven)</span>
                  <p className="text-gray-300 text-[11px] leading-relaxed">{audit.spotTradePlanJustification.target1Rationale}</p>
                </div>

                <div className="p-3 bg-[#070b14] rounded-xl border border-emerald-500/30 space-y-1">
                  <span className="text-[10px] text-emerald-400 font-mono uppercase block">Alvo 2 (Assimetria)</span>
                  <p className="text-gray-300 text-[11px] leading-relaxed">{audit.spotTradePlanJustification.target2Rationale}</p>
                </div>
              </div>

              <div className="p-3 bg-[#070b14] rounded-xl border border-gray-800 text-xs text-gray-300 flex items-center justify-between flex-wrap gap-2 font-mono">
                <span className="text-gray-400">🛡️ Regra de Condução:</span>
                <span className="text-white">{audit.spotTradePlanJustification.trailingStopRule}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
