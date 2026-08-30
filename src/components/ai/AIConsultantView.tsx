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
      text: `### 🤖 Olá! Sou o seu Consultor IA Especialista em Ações & Opções (Padrão CNPI)
Estou calibrado com as regras do **Manual do CME Group (25 Estratégias Comprovadas)** e com o motor de análise em 3 camadas (**CNPI-P** Fundamentos, **CNPI-T** Técnico e **CNPI-D** Barreiras de Opções).

${
  currentQuote
    ? `Você está visualizando **${currentQuote.symbol}** (${currentQuote.shortName || 'Ação B3'}) cotada a **R$ ${currentQuote.regularMarketPrice?.toFixed(2)}**. O veredito atual é **${currentQuote.verdict?.verdictLabel || 'EM PROCESSAMENTO'}**.`
    : 'Selecione ou consulte uma ação da B3 para receber diagnósticos personalizados.'
}

Como posso ajudar você hoje?`,
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
        `🎯 Comprar a ação ou montar estratégia de opções?`,
        `📘 Explicar as regras do CME Group para este ativo`,
        `🛡️ O que significam Call Wall e Put Wall?`,
        `🏢 Como funciona o crivo fundamentalista CNPI-P?`,
      ]
    : [
        '🏛️ Como funciona o motor de 3 camadas do sistema?',
        '📚 Quais são as 25 estratégias do CME Group?',
        '🛡️ O que é Call Wall, Put Wall e Max Pain?',
        '🔑 Como adicionar a chave da BRAPI?',
      ];

  return (
    <div className="bg-[#0f172a] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[640px]">
      {/* Header do Consultor IA */}
      <div className="p-4 bg-[#111827] border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Bot className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm sm:text-base">Consultor IA Financeiro</h3>
              <span className="px-2 py-0.2 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                CNPI EXPERT
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              {currentQuote ? `Contexto ativo: ${currentQuote.symbol} (R$ ${currentQuote.regularMarketPrice?.toFixed(2)})` : 'Tira-dúvidas e educação financeira'}
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            setMessages([
              {
                id: Date.now().toString(),
                sender: 'ai',
                text: 'Conversa reiniciada. Em que posso ajudar você agora?',
                timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              },
            ])
          }
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition text-xs flex items-center gap-1"
          title="Limpar histórico"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Limpar</span>
        </button>
      </div>

      {/* Área de Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs sm:text-sm">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'ai' && (
              <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-cyan-400" />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl ${
                msg.sender === 'user'
                  ? 'bg-emerald-600 text-white font-medium rounded-tr-none shadow-md'
                  : 'bg-[#111827] text-gray-200 border border-gray-800 rounded-tl-none shadow-md space-y-2'
              }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">
                {msg.text.split('\n').map((line, i) => {
                  if (line.startsWith('### ')) {
                    return (
                      <h4 key={i} className="font-bold text-white text-sm sm:text-base mt-2 mb-1 border-b border-gray-800 pb-1">
                        {line.replace('### ', '')}
                      </h4>
                    );
                  }
                  if (line.startsWith('#### ')) {
                    return (
                      <h5 key={i} className="font-bold text-cyan-300 text-xs sm:text-sm mt-1.5 mb-0.5">
                        {line.replace('#### ', '')}
                      </h5>
                    );
                  }
                  if (line.startsWith('> ')) {
                    return (
                      <div key={i} className="p-2.5 bg-cyan-950/40 border-l-2 border-cyan-400 text-cyan-200 text-xs my-1 rounded-r">
                        {line.replace('> ', '')}
                      </div>
                    );
                  }
                  return <p key={i} className={line === '' ? 'h-1.5' : ''}>{line}</p>;
                })}
              </div>

              <div className={`text-[9px] mt-1 ${msg.sender === 'user' ? 'text-emerald-200 text-right' : 'text-gray-500'}`}>
                {msg.timestamp}
              </div>
            </div>

            {msg.sender === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4 text-emerald-400" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-cyan-400 animate-spin" />
            </div>
            <div className="p-3 bg-[#111827] text-gray-400 border border-gray-800 rounded-2xl rounded-tl-none flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>Consultor IA analisando dados de mercado...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Sugestões de Perguntas Rápidas */}
      <div className="p-2.5 bg-[#0b101b] border-t border-gray-800/80 overflow-x-auto no-scrollbar flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-1" />
        {quickQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(q)}
            disabled={loading}
            className="px-2.5 py-1 bg-[#111827] hover:bg-gray-800 border border-gray-700 hover:border-cyan-500/50 rounded-xl text-gray-300 hover:text-white text-[11px] font-medium transition whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input de Chat */}
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
            placeholder="Faça uma pergunta sobre o ativo, estratégias do CME Group ou lógica do sistema..."
            className="flex-1 px-4 py-2.5 bg-[#0f172a] border border-gray-700 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 font-sans"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-emerald-500 hover:from-cyan-500 hover:to-emerald-400 text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </form>
      </div>
    </div>
  );
};
