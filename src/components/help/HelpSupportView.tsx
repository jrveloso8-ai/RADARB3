'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  BookOpen,
  Bot,
  Send,
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  User,
  Zap,
  TrendingUp,
  TrendingDown,
  Layers,
  Shield,
  HelpCircle,
  Clock,
  Target,
  FileText,
  Activity,
  Award,
  AlertCircle,
  ExternalLink,
  PlayCircle,
  Video,
} from 'lucide-react';
import { safeFetchJson } from '@/lib/utils/api-client';
import { SYSTEM_VERSION } from '@/lib/config/version';

interface SupportMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export const HelpSupportView: React.FC = () => {
  const [selectedTopic, setSelectedTopic] = useState<number>(1);
  const [searchManual, setSearchManual] = useState('');
  const [expandedTopic, setExpandedTopic] = useState<number | null>(1);

  // Chat do Agente de IA Especialista no Manual
  const [messages, setMessages] = useState<SupportMessage[]>([
    {
      id: '1',
      sender: 'ai',
      text: `### 👋 Olá! Sou o Agente de IA do Manual Radar B3 (Versão 2)
Tenho conhecimento completo sobre **todas as regras, fórmulas matemáticas, parâmetros de decisão e limites operacionais** descritos no manual.

Você pode me fazer qualquer pergunta como:
- *"Por que a PETR4 é aprovada mesmo com liquidez corrente abaixo de 1,0?"*
- *"O que significa quando uma lista do rastreador aparece vazia?"*
- *"Como o plano de trade calcula o stop e o alvo com R:R medido?"*
- *"Quando a estrutura Iron Condor é bloqueada?"*
- *"Qual é a regra de polaridade invertida na lista de Baixa?"*

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
        body: JSON.stringify({ question: query }),
      });

      const aiReply: SupportMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text:
          ok && data?.answer
            ? data.answer
            : 'Desculpe, não foi possível consultar o agente no momento. Por favor, tente novamente.',
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiReply]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: 'Ocorreu um erro ao conectar ao assistente de IA.',
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
    setLoading(false);
  };

  const manualTopics = [
    {
      id: 1,
      num: '01',
      title: 'O que o sistema faz',
      badge: 'Visão Geral',
      content: (
        <div className="space-y-4 text-xs text-gray-300 leading-relaxed">
          <p>
            O <strong>Radar B3</strong> responde a uma pergunta por vez: <em>quais operações estão autorizadas hoje, e em qual direção</em>. Ele varre as ações mais líquidas da B3, classifica cada uma em três estados de tendência e mostra apenas aquelas em que existe uma operação executável.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="bg-[#111827] p-3 rounded-xl border border-gray-800 space-y-1">
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">Camada 1</span>
              <h5 className="text-sm font-bold text-white">Fundamentos</h5>
              <p className="text-[11px] text-gray-400">
                A empresa tem lucro, solvência e múltiplos defensáveis? Responde <strong>APROVADO</strong> ou <strong>REPROVADO</strong>. <em>Nunca aparece na tela como categoria — funciona como filtro invisível.</em>
              </p>
            </div>
            <div className="bg-[#111827] p-3 rounded-xl border border-gray-800 space-y-1">
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">Camada 2</span>
              <h5 className="text-sm font-bold text-white">Tendência</h5>
              <p className="text-[11px] text-gray-400">
                Para onde o preço está indo? Responde <strong>ALTA</strong>, <strong>BAIXA</strong> ou <strong>LATERAL</strong>, olhando <em>apenas o gráfico</em>. Os fundamentos não votam aqui.
              </p>
            </div>
            <div className="bg-[#111827] p-3 rounded-xl border border-gray-800 space-y-1">
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">Camada 3</span>
              <h5 className="text-sm font-bold text-white">Opções</h5>
              <p className="text-[11px] text-gray-400">
                Onde estão as barreiras institucionais e como está a volatilidade? Define a estrutura, os strikes e se a operação com opções é viável agora.
              </p>
            </div>
          </div>
          <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-cyan-300 text-[11px]">
            <strong>Princípio de Leitura:</strong> A tendência diz <em>o que o mercado está fazendo</em>. Os fundamentos dizem <em>se você tem permissão para agir naquilo</em>. A camada de opções diz <em>com qual instrumento</em>. Confundir os três é o que torna um sistema de decisão ilegível.
          </div>
        </div>
      ),
    },
    {
      id: 2,
      num: '02',
      title: 'Como a tendência é determinada',
      badge: 'Técnico CNPI-T',
      content: (
        <div className="space-y-4 text-xs text-gray-300 leading-relaxed">
          <p>
            A classificação usa três médias móveis aritméticas do preço de fechamento — <strong>MM20</strong> (curto prazo), <strong>MM50</strong> (médio) e <strong>MM200</strong> (longo) — calculadas sobre 12 meses de histórico diário.
          </p>
          <p>
            O critério é de <strong>alinhamento estrito</strong>: não basta o preço estar subindo, as três médias precisam estar empilhadas na ordem certa. É uma regra deliberadamente exigente — ela prefere classificar como LATERAL a forçar uma direção que ainda não existe.
          </p>
          <div className="bg-[#111827] p-3.5 rounded-xl border border-gray-800 space-y-2 font-mono text-xs">
            <div className="flex justify-between items-center text-emerald-400 border-b border-gray-800 pb-1.5">
              <span>Preço &gt; MM20 &gt; MM50 &gt; MM200</span>
              <span className="font-bold px-2 py-0.5 bg-emerald-950 rounded">ALTA</span>
            </div>
            <div className="flex justify-between items-center text-red-400 border-b border-gray-800 pb-1.5">
              <span>Preço &lt; MM20 &lt; MM50 &lt; MM200</span>
              <span className="font-bold px-2 py-0.5 bg-red-950 rounded">BAIXA</span>
            </div>
            <div className="flex justify-between items-center text-purple-400">
              <span>Qualquer outra combinação (cruzadas / no meio)</span>
              <span className="font-bold px-2 py-0.5 bg-purple-950 rounded">LATERAL</span>
            </div>
          </div>
          <div className="space-y-2 pt-1 text-[11px] text-gray-400">
            <p><strong>Casos Especiais:</strong> Ação com menos de 200 pregões (IPO recente) usa apenas MM20 e MM50 empilhadas. Menos de 50 pregões é tratada como LATERAL.</p>
            <p><strong>O papel do RSI(14) e MACD:</strong> Aparecem na consulta individual como refinamento de timing (RSI saudável 40–65). Eles <em>não alteram a classificação de tendência</em> para evitar oscilações erráticas de lista.</p>
          </div>
        </div>
      ),
    },
    {
      id: 3,
      num: '03',
      title: 'Como os fundamentos são avaliados',
      badge: 'Crivo CNPI-P',
      content: (
        <div className="space-y-4 text-xs text-gray-300 leading-relaxed">
          <p>
            O crivo produz um score de <strong>0 a 100 pontos</strong>, distribuído em três categorias de peso quase igual:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 font-mono">
                  <th className="py-2">Categoria</th>
                  <th className="py-2">Peso</th>
                  <th className="py-2">Métrica</th>
                  <th className="py-2">Faixa Boa (Cheio)</th>
                  <th className="py-2">Faixa Neutra (Metade)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-mono">
                <tr>
                  <td className="py-2 text-white font-sans" rowSpan={3}>Rentabilidade</td>
                  <td className="py-2 text-cyan-400" rowSpan={3}>35 pts</td>
                  <td className="py-1.5">Lucro Líq. 12M (5 pts)</td>
                  <td className="py-1.5 text-emerald-400">&gt; 0</td>
                  <td className="py-1.5 text-gray-500">—</td>
                </tr>
                <tr>
                  <td className="py-1.5">ROE (15 pts)</td>
                  <td className="py-1.5 text-emerald-400">≥ 10%</td>
                  <td className="py-1.5 text-amber-400">5% a 10% (7 pts)</td>
                </tr>
                <tr>
                  <td className="py-1.5">Margem Líq. (15 pts)</td>
                  <td className="py-1.5 text-emerald-400">≥ 8%</td>
                  <td className="py-1.5 text-amber-400">0% a 8% (7 pts)</td>
                </tr>
                <tr>
                  <td className="py-2 text-white font-sans" rowSpan={2}>Solvência</td>
                  <td className="py-2 text-cyan-400" rowSpan={2}>35 pts</td>
                  <td className="py-1.5">DL / EBITDA (20 pts)</td>
                  <td className="py-1.5 text-emerald-400">≤ 2,5x</td>
                  <td className="py-1.5 text-amber-400">2,5x a 3,0x (10 pts)</td>
                </tr>
                <tr>
                  <td className="py-1.5">Liquidez Corrente (15 pts)</td>
                  <td className="py-1.5 text-emerald-400">≥ 1,2x</td>
                  <td className="py-1.5 text-amber-400">1,0x a 1,2x (7 pts)</td>
                </tr>
                <tr>
                  <td className="py-2 text-white font-sans" rowSpan={2}>Valuation</td>
                  <td className="py-2 text-cyan-400" rowSpan={2}>30 pts</td>
                  <td className="py-1.5">P/L (15 pts)</td>
                  <td className="py-1.5 text-emerald-400">3x a 25x</td>
                  <td className="py-1.5 text-gray-500">&gt; 25x (0 pts)</td>
                </tr>
                <tr>
                  <td className="py-1.5">P/VP (15 pts)</td>
                  <td className="py-1.5 text-emerald-400">0,5x a 4,0x</td>
                  <td className="py-1.5 text-gray-500">&gt; 4,0x (0 pts)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="bg-[#111827] p-3 rounded-xl border border-gray-800 space-y-2">
            <div className="font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Regra de Aprovação:
            </div>
            <div className="font-mono text-emerald-300 text-xs bg-emerald-950/40 p-2 rounded border border-emerald-500/30">
              APROVADO ⟺ score ≥ 45 E nenhuma flag eliminatória E dados reais de rentabilidade e solvência
            </div>
            <p className="text-[11px] text-gray-400">
              <strong>As 3 Flags Eliminatórias Fechadas:</strong> <code className="text-red-300">LUCRO_NEGATIVO</code> (Lucro 12M ≤ 0), <code className="text-red-300">MARGEM_NEGATIVA</code> (Margem Líq ≤ 0%) e <code className="text-red-300">SUPERENDIVIDAMENTO</code> (DL/EBITDA &gt; 3,5x ou EBITDA ≤ 0).
            </p>
            <p className="text-[11px] text-gray-400">
              <strong>Por que Liquidez Corrente &lt; 1,0 não reprova?</strong> Setores de capital intensivo (PETR4, elétricas, saneamento) operam estruturalmente com liquidez corrente &lt; 1,0. Tratar isso como eliminatório apagaria empresas sólidas do radar. Ela apenas zera os 15 pts do quesito, e o score total é quem decide.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 4,
      num: '04',
      title: 'Como o veredito é formado',
      badge: 'Matriz 6 Estados',
      content: (
        <div className="space-y-4 text-xs text-gray-300 leading-relaxed">
          <p>
            O veredito é o cruzamento de duas respostas: a tendência (três estados) e os fundamentos (dois estados). São <strong>seis combinações possíveis</strong>:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-gray-800">
              <thead>
                <tr className="bg-[#111827] text-gray-400 font-mono border-b border-gray-800">
                  <th className="p-2.5">Tendência</th>
                  <th className="p-2.5">Fundamentos Aprovados</th>
                  <th className="p-2.5">Fundamentos Reprovados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                <tr>
                  <td className="p-2.5 font-bold text-emerald-400 font-mono">ALTA</td>
                  <td className="p-2.5 bg-emerald-950/20 text-emerald-300">
                    <strong>Compra</strong> (Trava de alta / compra direta. Aparece na lista ALTA).
                  </td>
                  <td className="p-2.5 bg-gray-900 text-gray-400">
                    <strong>Sem operação</strong> (Repique em empresa frágil / <em>Value Trap</em>. Não aparece no rastreador).
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-purple-400 font-mono">LATERAL</td>
                  <td className="p-2.5 bg-purple-950/20 text-purple-300">
                    <strong>Iron Condor</strong> (Venda de vol se IV e DTE permitirem. Aparece na lista LATERAL).
                  </td>
                  <td className="p-2.5 bg-gray-900 text-gray-400">
                    <strong>Sem operação</strong> (Venda de vol em empresa frágil tem cauda gorda. Não aparece no rastreador).
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold text-red-400 font-mono">BAIXA</td>
                  <td className="p-2.5 bg-amber-950/20 text-amber-300">
                    <strong>Saída / Stop</strong> (Empresa boa em correção. Gestão de posição. <em>Só na consulta individual</em>).
                  </td>
                  <td className="p-2.5 bg-red-950/20 text-red-300">
                    <strong>Venda</strong> (Fraqueza contábil confirma a queda. Trava de baixa ou venda. Aparece na lista BAIXA).
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-amber-300 text-[11px]">
            <strong>Atenção à Polaridade Invertida:</strong> ALTA e LATERAL exigem empresa <em>aprovada</em>; BAIXA exige empresa <em>reprovada</em>. Para operar a queda, a fragilidade contábil é o próprio argumento.
          </div>
        </div>
      ),
    },
    {
      id: 5,
      num: '05',
      title: 'Usando o Rastreador',
      badge: 'Execução Diária',
      content: (
        <div className="space-y-4 text-xs text-gray-300 leading-relaxed">
          <p>
            É a tela de abertura e a única que você precisa olhar todo dia. Ela entrega <strong>três listas acionáveis</strong>:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-[#111827] rounded-xl border border-emerald-500/30 space-y-1">
              <span className="text-emerald-400 font-bold font-mono">🟢 ALTA · COMPRA</span>
              <p className="text-[11px] text-gray-400">Empresas aprovadas em alta. Traz preço de entrada, stop, 2 alvos e a trava sugerida.</p>
            </div>
            <div className="p-3 bg-[#111827] rounded-xl border border-red-500/30 space-y-1">
              <span className="text-red-400 font-bold font-mono">🔴 BAIXA · VENDA</span>
              <p className="text-[11px] text-gray-400">Empresas reprovadas em baixa. Traz trava de baixa e venda à vista com alerta de aluguel (BTC).</p>
            </div>
            <div className="p-3 bg-[#111827] rounded-xl border border-purple-500/30 space-y-1">
              <span className="text-purple-400 font-bold font-mono">🟣 LATERAL · IRON CONDOR</span>
              <p className="text-[11px] text-gray-400">Empresas aprovadas sem direção definida, com vol e prazo adequados (DTE 12 a 35 DU).</p>
            </div>
          </div>
          <div className="bg-[#111827] p-3 rounded-xl border border-gray-800 space-y-1.5 text-[11px]">
            <strong className="text-white">"Lista Vazia é Resposta":</strong>
            <p className="text-gray-400">
              Se uma lista aparecer vazia com a mensagem <em>"Nenhuma operação autorizada nesta direção hoje"</em>, isso não é falha de carregamento. É o sistema dizendo que nenhum ativo passou nos critérios. Um sistema obrigado a sempre mostrar algo acaba fabricando operação.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 6,
      num: '06',
      title: 'Usando a Consulta individual',
      badge: 'Diagnóstico 1 a 1',
      content: (
        <div className="space-y-4 text-xs text-gray-300 leading-relaxed">
          <p>
            É onde você investiga um ticker por vez. Diferente do rastreador, ela <strong>nunca esconde nada</strong>: mostra o ativo mesmo quando não há operação e diz o motivo.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px]">
            <div className="bg-[#111827] p-2.5 rounded-lg border border-gray-800">
              <strong className="text-white block font-mono">1. Gráfico 12M</strong>
              <span className="text-gray-400">Fechamentos com MM20, MM50, MM200 e sub-gráfico de RSI.</span>
            </div>
            <div className="bg-[#111827] p-2.5 rounded-lg border border-gray-800">
              <strong className="text-white block font-mono">2. Ficha Fundamentalista</strong>
              <span className="text-gray-400">As 7 métricas com valor, benchmark, score e flags eliminatórias.</span>
            </div>
            <div className="bg-[#111827] p-2.5 rounded-lg border border-gray-800">
              <strong className="text-white block font-mono">3. Veredito</strong>
              <span className="text-gray-400">A operação resultante da matriz com justificativa em texto.</span>
            </div>
            <div className="bg-[#111827] p-2.5 rounded-lg border border-gray-800">
              <strong className="text-white block font-mono">4. Plano de Trade</strong>
              <span className="text-gray-400">Entrada, stop, alvos 1 e 2, ATR e relação R:R medida.</span>
            </div>
            <div className="bg-[#111827] p-2.5 rounded-lg border border-gray-800">
              <strong className="text-white block font-mono">5. Barreiras de Opções</strong>
              <span className="text-gray-400">Call Wall, Put Wall, Max Pain e distância até cada muralha.</span>
            </div>
            <div className="bg-[#111827] p-2.5 rounded-lg border border-gray-800">
              <strong className="text-white block font-mono">6. Estrutura Eleita</strong>
              <span className="text-gray-400">Pernas com strike, prêmio real, custo e retorno sobre risco.</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 7,
      num: '07',
      title: 'Plano de trade: entrada, stop e alvo',
      badge: 'R:R Medido',
      content: (
        <div className="space-y-4 text-xs text-gray-300 leading-relaxed">
          <p>
            Os níveis não são percentuais fixos. Eles saem da <strong>estrutura real de preços</strong> dos últimos 12 meses, e o <strong>ATR de 14 períodos</strong> define a folga do stop.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px]">
            <div className="bg-[#111827] p-3 rounded-xl border border-emerald-500/30 space-y-1">
              <span className="text-emerald-400 font-bold block">COMPRA (ALTA)</span>
              <div>Entrada: <span className="text-white">Preço atual</span></div>
              <div>Stop: <span className="text-red-400">Suporte − 0,5 × ATR</span></div>
              <div>Alvo 1: <span className="text-emerald-400">Resistência imediata</span></div>
              <div>Alvo 2: <span className="text-emerald-400">Segunda resistência</span></div>
            </div>
            <div className="bg-[#111827] p-3 rounded-xl border border-red-500/30 space-y-1">
              <span className="text-red-400 font-bold block">VENDA (BAIXA)</span>
              <div>Entrada: <span className="text-white">Preço atual</span></div>
              <div>Stop: <span className="text-amber-400">Resistência + 0,5 × ATR</span></div>
              <div>Alvo 1: <span className="text-red-400">Suporte imediato</span></div>
              <div>Alvo 2: <span className="text-red-400">Segundo suporte</span></div>
            </div>
          </div>
          <div className="p-3 bg-[#111827] border border-gray-800 rounded-xl space-y-1 text-[11px]">
            <strong className="text-white">O Corte de 1,5 : 1:</strong>
            <p className="text-gray-400">
              A relação risco/retorno é medida (ganho até o alvo 1 dividido pela distância até o stop). Operação com relação abaixo de 1,5 : 1 não entra no rastreador.
            </p>
            <p className="text-cyan-400 pt-1">
              <strong>Como dimensionar:</strong> Defina antes quanto do capital aceita perder. A distância em R$ até o stop define a quantidade de ações que cabem nesse risco — nunca o inverso.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 8,
      num: '08',
      title: 'Camada de opções & Volatilidade',
      badge: 'Derivativos B3',
      content: (
        <div className="space-y-4 text-xs text-gray-300 leading-relaxed">
          <p>
            O sistema lê as posições em aberto da série mensal mais líquida da B3 (3ª sexta-feira do mês).
          </p>
          <div className="space-y-2 text-[11px] text-gray-300">
            <div><strong>Call Wall:</strong> Strike com maior concentração de calls em aberto (teto institucional).</div>
            <div><strong>Put Wall:</strong> Strike com maior concentração de puts em aberto (piso institucional).</div>
            <div><strong>Max Pain:</strong> Strike de menor prejuízo agregado para lançadores (ímã de preço).</div>
            <div><strong>Alerta a ≤ 3%:</strong> Preço colado na muralha indica obstáculo conhecido e realização parcial recomendada.</div>
          </div>
          <div className="bg-[#111827] p-3 rounded-xl border border-gray-800 space-y-2">
            <strong className="text-white text-xs block">Regimes de Volatilidade (IV vs HV):</strong>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
              <div className="p-2 bg-gray-900 rounded border border-gray-800">
                <span className="text-cyan-400 font-bold block">Comprimida</span>
                <span>IV &lt; 16%</span>
                <span className="text-red-400 block mt-1">Venda bloq.</span>
              </div>
              <div className="p-2 bg-gray-900 rounded border border-gray-800">
                <span className="text-emerald-400 font-bold block">Moderada</span>
                <span>16% – 28%</span>
                <span className="text-gray-400 block mt-1">Crédito/Débito</span>
              </div>
              <div className="p-2 bg-gray-900 rounded border border-gray-800">
                <span className="text-purple-400 font-bold block">Alta</span>
                <span>IV ≥ 28%</span>
                <span className="text-purple-300 block mt-1">Venda crédito</span>
              </div>
              <div className="p-2 bg-gray-900 rounded border border-gray-800">
                <span className="text-amber-400 font-bold block">Extrema</span>
                <span>IV ≥ 75%</span>
                <span className="text-amber-300 block mt-1">Asas largas</span>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 pt-1">
              <strong>Defasagem dos Dados:</strong> Posições em aberto e IV são do fechamento do pregão anterior; preço da ação e médias são em tempo real.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 9,
      num: '09',
      title: 'Exemplo completo (PETR4)',
      badge: 'Caso Prático',
      content: (
        <div className="space-y-4 text-xs text-gray-300 leading-relaxed">
          <p>
            Como uma ação real atravessa as 3 camadas até virar uma linha de execução no rastreador:
          </p>
          <div className="bg-[#111827] p-3 rounded-xl border border-gray-800 space-y-2 text-[11px]">
            <div className="font-mono text-cyan-400 font-bold">1. FUNDAMENTOS (PETR4)</div>
            <p className="text-gray-300">
              ROE 27,8% • Margem 24,4% • DL/EBITDA 2,28x • Liq. Corrente 0,85x • P/L 4,7x • P/VP 1,17x.
              <br />
              Liquidez corrente &lt; 1,0 pontua zero, mas não é eliminatória. Lucro e margem positivos afastam flags. <strong>Score 65 ≥ 45: APROVADO.</strong>
            </p>
            <div className="font-mono text-cyan-400 font-bold pt-1">2. TENDÊNCIA</div>
            <p className="text-gray-300">
              Preço acima da MM20, e MM20 &gt; MM50 &gt; MM200. <strong>Classificação: ALTA.</strong>
            </p>
            <div className="font-mono text-cyan-400 font-bold pt-1">3. CRUZAMENTO E EXECUÇÃO</div>
            <p className="text-emerald-300">
              Aprovado + Alta = <strong>COMPRA</strong>. Entra na lista ALTA com plano de trade calculado ($R:R \ge 1,5 : 1$), trava de alta sugerida e alerta de Call Wall.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 10,
      num: '10',
      title: 'Rotina de uso sugerida',
      badge: 'Checklist',
      content: (
        <div className="space-y-3 text-xs text-gray-300">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] text-left border-collapse border border-gray-800">
              <thead>
                <tr className="bg-[#111827] text-gray-400 font-mono border-b border-gray-800">
                  <th className="p-2">Quando</th>
                  <th className="p-2">O que Fazer</th>
                  <th className="p-2">Por quê</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                <tr>
                  <td className="p-2 font-bold text-white">Antes da Abertura</td>
                  <td className="p-2">Abrir o rastreador e ler as três listas.</td>
                  <td className="p-2 text-gray-400">Saber com quantas operações candidatas o dia começa.</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-white">Antes de Executar</td>
                  <td className="p-2">Abrir a consulta individual do ativo escolhido.</td>
                  <td className="p-2 text-gray-400">Conferir plano de trade, níveis de stop e barreiras.</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-white">Com Opções</td>
                  <td className="p-2">Conferir prêmios reais no home broker.</td>
                  <td className="p-2 text-gray-400">Prêmios de opções vêm do fechamento anterior.</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-white">Na Venda à Vista</td>
                  <td className="p-2">Confirmar taxa de aluguel (BTC) na corretora.</td>
                  <td className="p-2 text-gray-400">O sistema não tem acesso ao livro de empréstimo.</td>
                </tr>
                <tr>
                  <td className="p-2 font-bold text-white">Semanalmente</td>
                  <td className="p-2">Reler a lista BAIXA em busca de ações em carteira.</td>
                  <td className="p-2 text-gray-400">Empresa aprovada que entrou em baixa vira saída/stop.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
    {
      id: 11,
      num: '11',
      title: 'Limites do sistema',
      badge: 'Avisos Legais',
      content: (
        <div className="space-y-2 text-xs text-gray-300">
          <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-gray-400">
            <li><strong>Não envia ordens:</strong> É apoio à decisão. Toda execução é manual no seu home broker.</li>
            <li><strong>Não conhece sua carteira:</strong> Não sabe seu preço médio ou exposição. O dimensionamento é seu.</li>
            <li><strong>Não lê notícias ou balanços ao vivo:</strong> Trabalha com dados contábeis publicados e preço de fechamento.</li>
            <li><strong>Não tem livro de aluguel:</strong> O alerta na lista BAIXA é um lembrete obrigatório, não uma cotação.</li>
            <li><strong>Cobre as ações mais líquidas:</strong> Papel fora do universo varrido não aparece — ausência não é reprovação.</li>
            <li><strong>Uso Educacional:</strong> Não é recomendação de investimento. A responsabilidade da ordem é de quem a envia.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 12,
      num: '12',
      title: 'Glossário',
      badge: 'Dicionário',
      content: (
        <div className="space-y-2 text-xs text-gray-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="p-2 bg-[#111827] rounded border border-gray-800">
              <strong className="text-cyan-400">ATR(14):</strong> Amplitude média real de 14 pregões (define folga do stop).
            </div>
            <div className="p-2 bg-[#111827] rounded border border-gray-800">
              <strong className="text-cyan-400">Call / Put Wall:</strong> Strike com maior número de contratos em aberto (teto/piso).
            </div>
            <div className="p-2 bg-[#111827] rounded border border-gray-800">
              <strong className="text-cyan-400">DL / EBITDA:</strong> Anos de geração de caixa para quitar a dívida líquida.
            </div>
            <div className="p-2 bg-[#111827] rounded border border-gray-800">
              <strong className="text-cyan-400">DTE:</strong> Dias úteis restantes até o vencimento da opção.
            </div>
            <div className="p-2 bg-[#111827] rounded border border-gray-800">
              <strong className="text-cyan-400">HV & IV:</strong> Volatilidade Histórica realizada vs Volatilidade Implícita cotada.
            </div>
            <div className="p-2 bg-[#111827] rounded border border-gray-800">
              <strong className="text-cyan-400">Iron Condor:</strong> Estrutura de 4 pernas que lucra com tempo se o preço ficar em faixa.
            </div>
            <div className="p-2 bg-[#111827] rounded border border-gray-800">
              <strong className="text-cyan-400">Max Pain:</strong> Strike de menor prejuízo agregado para lançadores no vencimento.
            </div>
            <div className="p-2 bg-[#111827] rounded border border-gray-800">
              <strong className="text-cyan-400">Theta:</strong> Perda de valor da opção com o tempo (ganho do vendedor de opções).
            </div>
          </div>
        </div>
      ),
    },
  ];

  const filteredTopics = manualTopics.filter(
    (t) =>
      t.title.toLowerCase().includes(searchManual.toLowerCase()) ||
      t.badge.toLowerCase().includes(searchManual.toLowerCase()) ||
      t.num.includes(searchManual)
  );

  return (
    <div className="space-y-6">
      {/* Header Principal do Manual */}
      <div className="bg-[#0f172a] border border-cyan-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-bold">
                {SYSTEM_VERSION.version} • {SYSTEM_VERSION.specVersion}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-slate-800 text-gray-300 border border-gray-700">
                Publicado em: {SYSTEM_VERSION.releaseDate}
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-wide flex items-center gap-2.5">
              <BookOpen className="w-6 h-6 text-cyan-400" /> Manual de Uso & Lógica de Decisão
            </h2>
            <p className="text-xs text-gray-400 max-w-2xl">
              Como o sistema classifica a tendência de cada ação, como decide se ela pode ser operada, e o que fazer com cada uma das três listas que ele entrega.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-mono font-bold text-cyan-400">12 Tópicos Oficiais</div>
              <div className="text-[11px] text-gray-500 font-sans">Agente de IA e Vídeo Aulas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Principal: Manual à Esquerda e Chat de IA / Vídeo à Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ========================================================================= */}
        {/* COLUNA DA ESQUERDA: ESTRUTURA DO MANUAL (7 COLUNAS) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-4">
          {/* Barra de Busca de Tópicos */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Pesquisar tópicos do manual (ex: MM20, flags, stop, PETR4)..."
                value={searchManual}
                onChange={(e) => setSearchManual(e.target.value)}
                className="w-full bg-[#111827] border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 font-mono transition"
              />
            </div>
          </div>

          {/* Lista de Tópicos Expansíveis (Accordion) */}
          <div className="space-y-3">
            {filteredTopics.map((topic) => {
              const isExpanded = expandedTopic === topic.id;
              return (
                <div
                  key={topic.id}
                  className={`bg-[#0f172a] rounded-xl border transition overflow-hidden ${
                    isExpanded
                      ? 'border-cyan-500/50 shadow-md ring-1 ring-cyan-500/20'
                      : 'border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <button
                    onClick={() => setExpandedTopic(isExpanded ? null : topic.id)}
                    className="w-full p-4 flex items-center justify-between text-left transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-[#111827] border border-gray-800 text-cyan-400 font-mono text-xs font-bold flex items-center justify-center">
                        {topic.num}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          {topic.title}
                        </h4>
                        <span className="text-[10px] text-gray-400 font-mono">{topic.badge}</span>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-gray-800/80">
                      {topic.content}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLUNA DA DIREITA: AGENTE DE IA + VÍDEO EXPLICATIVO (5 COLUNAS) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-5 flex flex-col">
          {/* 1. AGENTE DE IA ESPECIALISTA NO MANUAL */}
          <div className="bg-[#0f172a] border border-gray-800 rounded-2xl p-4 flex flex-col h-[560px] shadow-lg">
            {/* Header do Chat */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-400">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    Agente IA do Manual <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  </h3>
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Conhecimento v3.1 Ativo
                  </span>
                </div>
              </div>
            </div>

            {/* Sugestões Rápidas de Perguntas */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {[
                'Como a tendência é calculada?',
                'Por que liquidez < 1.0 não reprova?',
                'O que é lista vazia?',
                'Como calcular o stop ATR?',
                'Quando o Iron Condor é bloqueado?',
              ].map((sug) => (
                <button
                  key={sug}
                  onClick={() => handleSendMessage(sug)}
                  disabled={loading}
                  className="text-[10px] px-2 py-1 rounded-lg bg-[#111827] hover:bg-gray-800 text-gray-300 border border-gray-800 hover:border-cyan-500/40 transition disabled:opacity-50"
                >
                  {sug}
                </button>
              ))}
            </div>

            {/* Área de Mensagens com Scroll */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.sender === 'ai' && (
                    <div className="w-6 h-6 rounded-full bg-cyan-950 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 text-cyan-400 mt-1">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div
                    className={`max-w-[88%] p-3 rounded-xl leading-relaxed whitespace-pre-wrap ${
                      m.sender === 'user'
                        ? 'bg-cyan-600 text-white rounded-br-none shadow-md font-sans'
                        : 'bg-[#111827] text-gray-200 border border-gray-800 rounded-bl-none prose prose-invert max-w-none text-xs'
                    }`}
                  >
                    {m.text}
                    <div
                      className={`text-[9px] mt-1 text-right ${
                        m.sender === 'user' ? 'text-cyan-200' : 'text-gray-500'
                      }`}
                    >
                      {m.timestamp}
                    </div>
                  </div>
                  {m.sender === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-cyan-700 flex items-center justify-center flex-shrink-0 text-white mt-1">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-cyan-400 text-xs py-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Consultando regras do Manual v3.1...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Formulário de Envio */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="mt-3 pt-3 border-t border-gray-800 flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Faça uma pergunta sobre o manual..."
                disabled={loading}
                className="flex-1 bg-[#111827] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 font-sans transition"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl transition flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* 2. VÍDEO EXPLICATIVO DO RADAR B3 (Logo abaixo do Agente IA) */}
          <div className="bg-[#0f172a] border border-gray-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
              <div className="flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-cyan-400" />
                <h4 className="font-bold text-white text-sm">Vídeo: Desmistificando o Radar B3</h4>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-bold flex items-center gap-1">
                <Video className="w-3 h-3 text-cyan-400" />
                AULA COMPLETA
              </span>
            </div>

            <div className="rounded-xl overflow-hidden border border-gray-800 bg-black shadow-inner">
              <video
                controls
                preload="metadata"
                className="w-full aspect-video rounded-xl bg-black"
                src="/videos/Desmistificando_o_Radar_B3.mp4"
              >
                Seu navegador não suporta a reprodução de vídeo HTML5.
              </video>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Assista à aula prática detalhando a arquitetura das 3 camadas, regras de alinhamento das médias móveis, filtros fundamentalistas e estratégias com opções na B3.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
