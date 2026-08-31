'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  HelpCircle,
  TrendingUp,
  Shield,
  Layers,
  BookOpen,
  RefreshCw,
  User,
  ExternalLink,
  Zap,
  Clock,
  Target,
  ShieldCheck,
  Cpu,
  BarChart3,
  CheckCircle2,
  Scale,
  Award,
} from 'lucide-react';
import { QuoteDetails } from '@/lib/types/financial';
import { safeFetchJson } from '@/lib/utils/api-client';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

interface AIConsultantViewProps {
  currentQuote?: QuoteDetails | null;
  onSelectSymbol?: (symbol: string) => void;
}

export const AIConsultantView: React.FC<AIConsultantViewProps> = ({ currentQuote }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: `### 🤖 Olá! Sou o Consultor IA Especialista em Estudos de Ações & Opções B3
Estou calibrado com as regras do **Catálogo Oficial de 25 Estratégias de Opções** e com o motor de análise em 3 camadas (**CNPI-P** Fundamentos, **CNPI-T** Técnico e **CNPI-D** Barreiras de Opções).

${
  currentQuote
    ? `Você está visualizando **${currentQuote.symbol}** (${currentQuote.shortName || 'Ação B3'}) cotada a **R$ ${currentQuote.regularMarketPrice?.toFixed(2)}**. O status unificado atual é **${currentQuote.verdict?.verdictLabel || 'EM PROCESSAMENTO'}**.`
    : 'Selecione ou pesquise uma ação da B3 para receber diagnósticos e explicações personalizadas.'
}

Como posso apoiar seus estudos hoje?`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { ok, data } = await safeFetchJson<{ answer: string }>('/api/ai-consultant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          context: currentQuote
            ? {
                symbol: currentQuote.symbol,
                spotPrice: currentQuote.regularMarketPrice,
                trend: currentQuote.trendAnalysis?.trend,
                verdict: currentQuote.verdict?.verdict,
                verdictLabel: currentQuote.verdict?.verdictLabel,
                fundamentalStatus: currentQuote.fundamentals?.status,
                fundamentalScore: currentQuote.fundamentals?.score,
                callWall: currentQuote.barrierAlert?.topCallWall,
                putWall: currentQuote.barrierAlert?.topPutWall,
                rsi: currentQuote.indicators?.rsi,
                macdHist: currentQuote.indicators?.macd.histogram,
                strategyName: currentQuote.suggestedStructure?.title,
              }
            : undefined,
        }),
      });

      const aiReply: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: ok && data?.answer ? data.answer : 'Desculpe, ocorreu um erro ao processar sua dúvida. Tente novamente.',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiReply]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: 'Falha na comunicação com o Consultor IA.',
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }

    setLoading(false);
  };

  const quickQuestions = currentQuote
    ? [
        `📊 Explicar o veredito atual de ${currentQuote.symbol}`,
        `🎯 Como funciona a estratégia eleita para este ativo?`,
        `📘 Explicar o catálogo de opções para este cenário`,
        `🛡️ O que significam Call Wall e Put Wall?`,
        `🏢 Como funciona o crivo fundamentalista CNPI-P?`,
      ]
    : [
        '🏛️ Como funciona o motor de 3 camadas do sistema?',
        '📚 Quais são as 25 estratégias do catálogo de opções?',
        '🛡️ O que é Call Wall, Put Wall e Max Pain?',
        '📈 Como interpretar o alinhamento das médias móveis?',
      ];

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* SEÇÃO SUPERIOR: APRESENTAÇÃO PERSUASIVA, FUNCIONALIDADES E VANTAGENS */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-[#0b101b] via-[#111827] to-[#0f172a] p-6 sm:p-8 rounded-3xl border-2 border-cyan-500/30 shadow-2xl space-y-6">
        {/* Cabeçalho de Impacto */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-800/80 pb-5">
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-gradient-to-tr from-cyan-600 via-emerald-500 to-teal-400 rounded-2xl text-slate-950 shadow-lg shadow-cyan-500/20 mt-0.5">
              <Cpu className="w-8 h-8 font-black" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 tracking-wider font-mono">
                  INTELIGÊNCIA QUANTITATIVA CNPI
                </span>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                  Consultor IA: Decisões Rápidas, Precisas e Sem Emoção
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-gray-300 mt-2 leading-relaxed max-w-4xl">
                Transforme centenas de dados complexos da B3 em diagnósticos objetivos e acionáveis em segundos. O Consultor IA integra a solidez dos <strong>Fundamentos (CNPI-P)</strong>, o timing da <strong>Análise Técnica (CNPI-T)</strong> e o posicionamento institucional das <strong>Barreiras de Opções (B3)</strong> em uma única fonte da verdade matemática.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto shrink-0 font-mono text-xs">
            <div className="px-3.5 py-2 bg-[#070b14] rounded-xl border border-emerald-500/30 text-emerald-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Motor 3 Camadas Ativo</span>
            </div>
          </div>
        </div>

        {/* 3 Grandes Vantagens Competitivas (Ganho de Tempo, Qualidade e Acurácia) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Vantagem 1: Ganho de Tempo */}
          <div className="p-4 bg-[#070b14]/80 rounded-2xl border border-gray-800 space-y-2 hover:border-cyan-500/40 transition">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <Clock className="w-4 h-4" />
              <span>Ganho Massivo de Tempo</span>
            </div>
            <p className="text-gray-300 text-[11px] leading-relaxed">
              O que um analista levaria <strong>45 a 60 minutos</strong> para tabular entre demonstrativos contábeis, múltiplos de mercado, osciladores técnicos e livros de derivativos, o sistema sintetiza em <strong>menos de 2 segundos</strong>.
            </p>
          </div>

          {/* Vantagem 2: Acurácia & Preservação */}
          <div className="p-4 bg-[#070b14]/80 rounded-2xl border border-gray-800 space-y-2 hover:border-emerald-500/40 transition">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>Acurácia & Proteção Anti-Armadilhas</span>
            </div>
            <p className="text-gray-300 text-[11px] leading-relaxed">
              Elimina o viés emocional de operações impulsivas. O filtro fundamentalista <strong>bloqueia compras em empresas em deterioração</strong> (*Value Traps*), enquanto a soberania da Venda Técnica preserva seu patrimônio.
            </p>
          </div>

          {/* Vantagem 3: Engenharia de Opções */}
          <div className="p-4 bg-[#070b14]/80 rounded-2xl border border-gray-800 space-y-2 hover:border-purple-500/40 transition">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
              <Target className="w-4 h-4" />
              <span>Engenharia das 25 Estratégias B3</span>
            </div>
            <p className="text-gray-300 text-[11px] leading-relaxed">
              Eleição algorítmica da melhor estrutura de opções (Travas, Iron Condor, Borboletas) mapeando os níveis de <strong>Call Wall, Put Wall e Max Pain</strong> para maximizar a relação Risco vs Retorno.
            </p>
          </div>
        </div>

        {/* Resumo da Lógica das 3 Camadas Integradas */}
        <div className="p-4 bg-[#070b14] rounded-2xl border border-gray-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-gray-300">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-white block">Como Funciona a Lógica Integrada:</span>
              <span className="text-gray-400 text-[11px]">
                <strong>Camada 1:</strong> Balanço & Solvência (CNPI-P) ➔ <strong>Camada 2:</strong> Tendência Técnica & Médias (CNPI-T) ➔ <strong>Camada 3:</strong> Muralhas Institucionais B3 (CNPI-D).
              </span>
            </div>
          </div>
          <span className="px-3 py-1 bg-cyan-950 text-cyan-300 border border-cyan-500/30 rounded-xl font-mono text-[10px] shrink-0 font-bold">
            100% UNIFICADO & SEM DIVERGÊNCIAS
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO PRINCIPAL: INTERFACE INTERATIVA DO CONSULTOR IA */}
      {/* ========================================================================= */}
      <div className="bg-[#0f172a] border border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[640px]">
        {/* Header do Consultor IA */}
        <div className="p-4 bg-[#111827] border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Bot className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm sm:text-base">Consultor IA de Estudos</h3>
                <span className="px-2 py-0.2 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                  CNPI EXPERT
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                {currentQuote ? `Contexto ativo: ${currentQuote.symbol} (R$ ${currentQuote.regularMarketPrice?.toFixed(2)})` : 'Tira-dúvidas conceituais e diagnósticos em tempo real'}
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Modelo Ativo</span>
          </div>
        </div>

        {/* Área de Mensagens */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs sm:text-sm">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center text-slate-950 shrink-0 font-bold mt-1 shadow-md">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl border leading-relaxed shadow-lg ${
                    isUser
                      ? 'bg-emerald-600 text-white rounded-tr-none border-emerald-500 font-medium'
                      : 'bg-[#111827] text-gray-200 rounded-tl-none border-gray-800'
                  }`}
                >
                  <div className="prose prose-invert prose-xs sm:prose-sm max-w-none space-y-2">
                    {msg.text.split('\n\n').map((para, i) => (
                      <div key={i} className="whitespace-pre-wrap">
                        {para}
                      </div>
                    ))}
                  </div>
                  <div
                    className={`text-[10px] mt-2 font-mono ${
                      isUser ? 'text-emerald-200 text-right' : 'text-gray-500'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center text-gray-300 shrink-0 mt-1 border border-gray-700">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-3 text-xs text-gray-400 font-mono p-3 bg-[#111827] rounded-2xl border border-gray-800 w-fit">
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Consultor IA analisando o cenário quantitativo...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Sugestões Rápidas de Perguntas */}
        <div className="p-3 bg-[#111827]/80 border-t border-gray-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
          <span className="text-[11px] text-gray-500 shrink-0 flex items-center gap-1 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Sugestões:
          </span>
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              disabled={loading}
              className="px-3 py-1 rounded-xl bg-[#0b0f19] hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white transition whitespace-nowrap text-xs shrink-0 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input de Envio */}
        <div className="p-3 bg-[#111827] border-t border-gray-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Faça uma pergunta sobre o ativo, estratégias de opções ou conceitos do sistema..."
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-[#0b0f19] border border-gray-700 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 font-sans"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2.5 bg-gradient-to-r from-cyan-600 to-emerald-500 hover:from-cyan-500 hover:to-emerald-400 text-slate-950 font-bold rounded-xl transition shadow-md shadow-cyan-500/20 disabled:opacity-50 flex items-center justify-center shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
