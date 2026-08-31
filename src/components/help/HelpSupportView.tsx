'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  HelpCircle,
  BookOpen,
  Bot,
  Send,
  Sparkles,
  LayoutDashboard,
  Search,
  TrendingUp,
  Layers,
  Shield,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Activity,
  Award,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
  User,
  Compass,
  Zap,
} from 'lucide-react';
import { safeFetchJson } from '@/lib/utils/api-client';

interface SupportMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export const HelpSupportView: React.FC = () => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Chat do Agente de Suporte e Ajuda
  const [messages, setMessages] = useState<SupportMessage[]>([
    {
      id: '1',
      sender: 'ai',
      text: `### 👋 Olá! Sou o Agente de Suporte & Educação do Radar B3
Estou aqui para ajudar você a entender **como usar cada módulo**, **como interpretar os gráficos e indicadores** e **qual é a lógica das 3 camadas analíticas** do sistema.

Você pode me fazer qualquer pergunta como:
- *"Como o sistema decide se um ativo está Bloqueado ou Compra?"*
- *"O que significa Call Wall e Put Wall?"*
- *"Como interpretar as médias móveis e o RSI?"*
- *"Qual a diferença entre a aba Gráfico 12M e o Rastreador?"*

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

    const userMsg: SupportMessage = {
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
        }),
      });

      const aiReply: SupportMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text:
          ok && data?.answer
            ? data.answer
            : 'Desculpe, não consegui obter a resposta no momento. Por favor, tente novamente.',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiReply]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: 'Falha temporária ao comunicar com o Agente de Suporte.',
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }

    setLoading(false);
  };

  const quickQuestions = [
    '🏛️ Como funciona a lógica das 3 camadas?',
    '🚫 Por que alguns ativos ficam com status BLOQUEADO?',
    '🛡️ O que significam Call Wall, Put Wall e Max Pain?',
    '📊 Qual a regra soberana da Venda Técnica?',
    '📈 Como interpretar o alinhamento das médias móveis?',
  ];

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <div className="space-y-8">
      {/* HEADER DA CENTRAL DE AJUDA */}
      <div className="bg-gradient-to-r from-[#0b101b] via-[#111827] to-[#0f172a] p-6 sm:p-8 rounded-3xl border border-gray-800 shadow-2xl space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-3.5 bg-gradient-to-tr from-cyan-600 via-emerald-500 to-teal-400 rounded-2xl text-slate-950 shadow-lg shadow-cyan-500/20 mt-0.5">
            <Compass className="w-8 h-8 font-black" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Central de Ajuda, Guia do Usuário & Suporte
              </h1>
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
                MANUAL INSTITUCIONAL
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-300 mt-2 leading-relaxed max-w-4xl">
              Bem-vindo ao <strong>Radar de Estudos B3</strong>. Esta central foi criada para orientar você no uso da plataforma, explicando a arquitetura em 3 camadas (Fundamentos, Técnico e Opções), os critérios de cálculo de cada veredito e disponibilizando um Agente de IA para esclarecer dúvidas.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO 1: GUIA PASSO A PASSO — AS OPÇÕES QUE O SISTEMA OFERECE */}
      {/* ========================================================================= */}
      <div className="bg-[#0b101b] p-6 sm:p-7 rounded-3xl border border-gray-800 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-2.5">
            <LayoutDashboard className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white">
              1. Módulos e Funcionalidades do Sistema
            </h2>
          </div>
          <span className="text-xs font-mono text-gray-400">Visão Geral de Recursos</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Módulo 1 */}
          <div className="p-5 bg-[#111827] rounded-2xl border border-gray-800 space-y-2.5 hover:border-emerald-500/40 transition">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center text-xs font-mono">1</span>
              <span>Panorama Geral</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Visão macro de pré-abertura de mercado (Morning Call), com Termômetro de Sentimento (0-100), bolsas globais, commodities, câmbio, risco fiscal brasileiro e feeds em tempo real via TradingView.
            </p>
          </div>

          {/* Módulo 2 */}
          <div className="p-5 bg-[#111827] rounded-2xl border border-gray-800 space-y-2.5 hover:border-cyan-500/40 transition">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <span className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center text-xs font-mono">2</span>
              <span>Consulta & Gráfico 12M</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Diagnóstico detalhado de qualquer ativo da B3 (ex: PETR4, VALE3, CSAN3). Reúne gráfico de 12 meses com médias móveis, RSI, MACD, crivo fundamentalista, matriz de opções e o veredito unificado.
            </p>
          </div>

          {/* Módulo 3 */}
          <div className="p-5 bg-[#111827] rounded-2xl border border-gray-800 space-y-2.5 hover:border-purple-500/40 transition">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
              <span className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center text-xs font-mono">3</span>
              <span>Rastreador de Tendências</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Scanner multisetorial com filtros por setor (Petróleo, Bancos, Mineração, Consumo, etc.), faixas de preço e veredito consolidado. Permite escanear dezenas de ações simultaneamente.
            </p>
          </div>

          {/* Módulo 4 */}
          <div className="p-5 bg-[#111827] rounded-2xl border border-gray-800 space-y-2.5 hover:border-amber-500/40 transition">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <span className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-xs font-mono">4</span>
              <span>Barreiras de Opções (B3)</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Mapeamento de posições em aberto dos derivativos. Identifica as maiores muralhas institucionais: <strong>Call Wall</strong> (resistência), <strong>Put Wall</strong> (suporte) e <strong>Max Pain</strong>.
            </p>
          </div>

          {/* Módulo 5 */}
          <div className="p-5 bg-[#111827] rounded-2xl border border-gray-800 space-y-2.5 hover:border-teal-500/40 transition">
            <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
              <span className="w-6 h-6 rounded-lg bg-teal-500/20 flex items-center justify-center text-xs font-mono">5</span>
              <span>Recomendações de Estudo</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Comparativo entre a compra/venda da ação à vista vs simulação de estratégias do <strong>Catálogo Oficial de 25 Estratégias de Opções</strong> (Travas de Alta, Travas de Baixa, Iron Condor, Borboletas).
            </p>
          </div>

          {/* Módulo 6 */}
          <div className="p-5 bg-[#111827] rounded-2xl border border-gray-800 space-y-2.5 hover:border-rose-500/40 transition">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <span className="w-6 h-6 rounded-lg bg-rose-500/20 flex items-center justify-center text-xs font-mono">6</span>
              <span>Consultor IA Especialista</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              Assistente inteligente treinado nas diretrizes CNPI e derivativos. Responde perguntas contextuais sobre a ação selecionada ou tira dúvidas conceituais sobre qualquer estratégia estruturada.
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO 2: A LÓGICA DAS 3 CAMADAS ANALÍTICAS INSTITUCIONAIS */}
      {/* ========================================================================= */}
      <div className="bg-[#0b101b] p-6 sm:p-7 rounded-3xl border border-gray-800 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white">
              2. Metodologia do Motor de Decisão: As 3 Camadas Analíticas
            </h2>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/30">
            Padrão CNPI Unificado
          </span>
        </div>

        <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
          Para garantir que <strong>nenhum módulo apresente informações divergentes</strong>, o sistema processa todo ativo através de uma fonte única da verdade matemática composta por 3 camadas hierárquicas:
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CAMADA 1: FUNDAMENTOS */}
          <div className="p-5 bg-[#111827] rounded-2xl border-2 border-emerald-500/30 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Shield className="w-4 h-4" />
                <span>Camada 1: Crivo Fundamentalista (CNPI-P)</span>
              </div>
              <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">Filtro de Solidez</span>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Analisa a saúde financeira da empresa: ROE, Margem Líquida, Dívida Líquida / EBITDA e Liquidez Corrente.
            </p>

            <div className="p-3 bg-red-950/20 rounded-xl border border-red-500/30 text-[11px] text-red-300 space-y-1">
              <strong>🚫 Regra de Bloqueio (Caso CSAN3):</strong>
              <p>
                Se a empresa apresentar prejuízo persistente ou endividamento crítico, seu status fundamentalista é <strong>REPROVADO</strong>. O sistema automaticamente <strong>BLOQUEIA qualquer estudo de compra</strong> para proteger o investidor contra armadilhas de valor (*Value Traps*).
              </p>
            </div>
          </div>

          {/* CAMADA 2: ANÁLISE TÉCNICA */}
          <div className="p-5 bg-[#111827] rounded-2xl border-2 border-cyan-500/30 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>Camada 2: Análise Técnica (CNPI-T)</span>
              </div>
              <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded">Timing & Tendência</span>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Avalia a direção dos preços com base na Teoria de Dow e no alinhamento das Médias Móveis:
            </p>

            <ul className="text-xs text-gray-400 space-y-1 font-mono">
              <li>• <strong>ALTA:</strong> Preço {'>'} MM20 {'>'} MM50 {'>'} MM200</li>
              <li>• <strong>BAIXA:</strong> Preço {'<'} MM20 {'<'} MM50 {'<'} MM200</li>
              <li>• <strong>LATERAL:</strong> Médias emboladas / Consolidação</li>
            </ul>

            <div className="p-3 bg-amber-950/20 rounded-xl border border-amber-500/30 text-[11px] text-amber-300 space-y-1">
              <strong>⚠️ Soberania da Venda Técnica:</strong>
              <p>
                Se a tendência técnica for de <strong>BAIXA</strong>, o sistema prioriza a proteção patrimonial e emite Veredito de Venda, independentemente dos fundamentos.
              </p>
            </div>
          </div>

          {/* CAMADA 3: DERIVATIVOS & OPÇÕES */}
          <div className="p-5 bg-[#111827] rounded-2xl border-2 border-purple-500/30 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <Layers className="w-4 h-4" />
                <span>Camada 3: Barreiras de Opções (CNPI-D)</span>
              </div>
              <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">Posicionamento B3</span>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Mapeia o posicionamento dos grandes participantes e formadores de mercado da B3:
            </p>

            <ul className="text-xs text-gray-400 space-y-1.5 font-mono text-[11px]">
              <li>• <strong>Call Wall:</strong> Maior concentração de Calls lançadas (forte resistência).</li>
              <li>• <strong>Put Wall:</strong> Maior concentração de Puts (forte suporte institucional).</li>
              <li>• <strong>Max Pain:</strong> Ponto onde os compradores perdem mais no vencimento.</li>
            </ul>

            <div className="p-3 bg-cyan-950/20 rounded-xl border border-cyan-500/30 text-[11px] text-cyan-300 space-y-1">
              <strong>🛡️ Alertas de Proximidade:</strong>
              <p>
                Se o preço estiver a menos de 3% de uma Call Wall em tendência de alta, o veredito alerta para o risco iminente de desaceleração.
              </p>
            </div>
          </div>
        </div>

        {/* TABELA SÍNTESE DO VEREDITO CONSOLIDADO */}
        <div className="p-5 bg-[#111827] rounded-2xl border border-gray-800 space-y-3">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            Matriz de Decisão do Veredito Consolidado (Fonte Única da Verdade)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 font-mono">
                  <th className="py-2.5 px-3">Tendência Técnica</th>
                  <th className="py-2.5 px-3">Fundamentos</th>
                  <th className="py-2.5 px-3">Barreiras de Opções</th>
                  <th className="py-2.5 px-3">Veredito Final Unificado</th>
                  <th className="py-2.5 px-3">Conduta de Estudo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-gray-300 font-mono text-[11px]">
                <tr>
                  <td className="py-2 px-3 text-emerald-400">ALTA</td>
                  <td className="py-2 px-3 text-emerald-400">APROVADO</td>
                  <td className="py-2 px-3 text-gray-400">Sem barreira próxima</td>
                  <td className="py-2 px-3"><span className="text-emerald-400 font-bold">COMPRA FORTE</span></td>
                  <td className="py-2 px-3 font-sans">Estudo de compra à vista ou Trava de Alta com Call</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-emerald-400">ALTA</td>
                  <td className="py-2 px-3 text-emerald-400">APROVADO</td>
                  <td className="py-2 px-3 text-amber-400">Call Wall a &le; 3%</td>
                  <td className="py-2 px-3"><span className="text-amber-400 font-bold">COMPRA COM ALERTA</span></td>
                  <td className="py-2 px-3 font-sans">Alvo limitado na Call Wall institucional</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-red-400">BAIXA</td>
                  <td className="py-2 px-3 text-gray-400">Qualquer</td>
                  <td className="py-2 px-3 text-gray-400">Qualquer</td>
                  <td className="py-2 px-3"><span className="text-red-400 font-bold">VENDA FORTE</span></td>
                  <td className="py-2 px-3 font-sans">Venda técnica / Proteção com Trava de Baixa</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-400">ALTA / LATERAL</td>
                  <td className="py-2 px-3 text-red-400">REPROVADO</td>
                  <td className="py-2 px-3 text-gray-400">Qualquer</td>
                  <td className="py-2 px-3"><span className="text-red-400 font-bold">BLOQUEADO</span></td>
                  <td className="py-2 px-3 font-sans text-red-300">Bloqueio de compras para evitar Value Trap</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-amber-400">LATERAL</td>
                  <td className="py-2 px-3 text-emerald-400">APROVADO</td>
                  <td className="py-2 px-3 text-emerald-400">IV Faturável</td>
                  <td className="py-2 px-3"><span className="text-purple-400 font-bold">IRON CONDOR</span></td>
                  <td className="py-2 px-3 font-sans">Coleta de prêmio em mercado lateralizado</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEÇÃO 3: AGENTE DE IA DE SUPORTE & DÚVIDAS FREQUENTES (FAQ) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CHAT DO AGENTE DE SUPORTE */}
        <div className="lg:col-span-7 bg-[#0b101b] border border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[580px]">
          <div className="p-4 bg-[#111827] border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Bot className="w-5 h-5 text-slate-950 font-bold" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Agente de Suporte & Educação</h3>
                <p className="text-[11px] text-gray-400">Tire dúvidas conceituais sobre o sistema e estratégias</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
              ONLINE
            </span>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div key={msg.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && (
                    <div className="w-7 h-7 rounded-lg bg-cyan-600 flex items-center justify-center text-slate-950 shrink-0 font-bold mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl border leading-relaxed shadow-md ${
                      isUser
                        ? 'bg-emerald-600 text-white rounded-tr-none border-emerald-500 font-medium'
                        : 'bg-[#111827] text-gray-200 rounded-tl-none border-gray-800'
                    }`}
                  >
                    <div className="prose prose-invert prose-xs max-w-none space-y-2">
                      {msg.text.split('\n\n').map((para, i) => (
                        <div key={i} className="whitespace-pre-wrap">
                          {para}
                        </div>
                      ))}
                    </div>
                    <div className={`text-[9px] mt-2 font-mono ${isUser ? 'text-emerald-200 text-right' : 'text-gray-500'}`}>
                      {msg.timestamp}
                    </div>
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center text-gray-300 shrink-0 mt-1 border border-gray-700">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-gray-400 font-mono p-2.5 bg-[#111827] rounded-xl border border-gray-800 w-fit">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>Agente formulando resposta didática...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Sugestões Rápidas */}
          <div className="p-2.5 bg-[#111827]/80 border-t border-gray-800 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
            <span className="text-[10px] text-gray-500 shrink-0 flex items-center gap-1 font-mono">
              <Sparkles className="w-3 h-3 text-amber-400" /> Dúvidas:
            </span>
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                disabled={loading}
                className="px-2.5 py-1 rounded-lg bg-[#0b0f19] hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white transition whitespace-nowrap text-[11px] shrink-0 disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Formulário de Envio */}
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
                placeholder="Pergunte sobre qualquer funcionalidade ou conceito do sistema..."
                disabled={loading}
                className="flex-1 px-3.5 py-2 bg-[#0b0f19] border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 font-sans"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-2 bg-gradient-to-r from-cyan-600 to-emerald-500 hover:from-cyan-500 hover:to-emerald-400 text-slate-950 font-bold rounded-xl transition shadow-md disabled:opacity-50 flex items-center justify-center shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* PERGUNTAS FREQUENTES (FAQ EXPANSÍVEL) */}
        <div className="lg:col-span-5 bg-[#0b101b] border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
            <HelpCircle className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">Perguntas Frequentes (FAQ)</h3>
          </div>

          <div className="space-y-3 text-xs">
            {/* FAQ 1 */}
            <div className="p-3.5 bg-[#111827] rounded-xl border border-gray-800 space-y-2">
              <button
                onClick={() => toggleFaq(1)}
                className="w-full flex items-center justify-between text-left font-bold text-gray-200 hover:text-white"
              >
                <span>Por que o status de CSAN3 aparece como Bloqueado?</span>
                {activeFaq === 1 ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {activeFaq === 1 && (
                <p className="text-gray-400 text-[11px] leading-relaxed pt-1 border-t border-gray-800/60 font-sans">
                  Embora CSAN3 possa apresentar repiques técnicos temporários, a empresa apresenta indicadores fundamentalistas de alto endividamento e margens pressionadas. Por regra de preservação de capital do modelo CNPI-P, compras são bloqueadas para evitar armadilhas de valor.
                </p>
              )}
            </div>

            {/* FAQ 2 */}
            <div className="p-3.5 bg-[#111827] rounded-xl border border-gray-800 space-y-2">
              <button
                onClick={() => toggleFaq(2)}
                className="w-full flex items-center justify-between text-left font-bold text-gray-200 hover:text-white"
              >
                <span>O que é a regra de soberania da Venda Técnica?</span>
                {activeFaq === 2 ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {activeFaq === 2 && (
                <p className="text-gray-400 text-[11px] leading-relaxed pt-1 border-t border-gray-800/60 font-sans">
                  Se um ativo estiver em tendência clara de baixa (preço abaixo das médias móveis MM20, MM50 e MM200), o sistema emite veredito de Venda Técnica mesmo que os fundamentos da empresa sejam excelentes, pois operar contra a tendência eleva o risco de drawdown acentuado.
                </p>
              )}
            </div>

            {/* FAQ 3 */}
            <div className="p-3.5 bg-[#111827] rounded-xl border border-gray-800 space-y-2">
              <button
                onClick={() => toggleFaq(3)}
                className="w-full flex items-center justify-between text-left font-bold text-gray-200 hover:text-white"
              >
                <span>O que significa Call Wall e Put Wall?</span>
                {activeFaq === 3 ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {activeFaq === 3 && (
                <p className="text-gray-400 text-[11px] leading-relaxed pt-1 border-t border-gray-800/60 font-sans">
                  São os níveis de strike na B3 onde há a maior concentração de contratos em aberto de opções. A Call Wall atua como uma barreira de resistência (onde os lançadores defendem a posição), e a Put Wall atua como uma muralha de suporte.
                </p>
              )}
            </div>

            {/* FAQ 4 */}
            <div className="p-3.5 bg-[#111827] rounded-xl border border-gray-800 space-y-2">
              <button
                onClick={() => toggleFaq(4)}
                className="w-full flex items-center justify-between text-left font-bold text-gray-200 hover:text-white"
              >
                <span>Este sistema emite recomendação de investimento?</span>
                {activeFaq === 4 ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {activeFaq === 4 && (
                <p className="text-gray-400 text-[11px] leading-relaxed pt-1 border-t border-gray-800/60 font-sans">
                  Não. Todo o conteúdo, modelos matemáticos, vereditos e simulações de opções têm caráter <strong>estritamente educacional e de estudo</strong>, destinados à pesquisa e capacitação quantitativa de investidores.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
