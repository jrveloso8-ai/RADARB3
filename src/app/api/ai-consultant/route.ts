import { NextRequest, NextResponse } from 'next/server';
import { OPTION_25_STRATEGIES } from '@/lib/domain/cme-strategies';

export const dynamic = 'force-dynamic';

interface ConsultantRequestBody {
  question: string;
  context?: {
    symbol?: string;
    spotPrice?: number;
    trend?: string;
    verdict?: string;
    verdictLabel?: string;
    fundamentalStatus?: string;
    fundamentalScore?: number;
    callWall?: { strike: number; distSpot: number };
    putWall?: { strike: number; distSpot: number };
    rsi?: number;
    macdHist?: number;
    strategyName?: string;
  };
}

export async function GET() {
  return NextResponse.json({
    status: 'ONLINE',
    service: 'Consultor IA de Estudos — Ações & Opções B3',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body: ConsultantRequestBody = await request.json();
    const { question, context } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'A pergunta deve ser informada.' },
        { status: 400 }
      );
    }

    const qLower = question.toLowerCase();

    // 1. Respostas Contextuais Específicas sobre o Ativo Selecionado
    if (
      context &&
      context.symbol &&
      (qLower.includes('este ativo') ||
        qLower.includes(context.symbol.toLowerCase()) ||
        qLower.includes('por que') ||
        qLower.includes('veredito') ||
        qLower.includes('decisão') ||
        qLower.includes('comprar') ||
        qLower.includes('vender') ||
        qLower.includes('operar') ||
        qLower.includes('estudo'))
    ) {
      const sym = context.symbol;
      const spot = context.spotPrice ? `R$ ${context.spotPrice.toFixed(2)}` : 'Preço atual';
      const trend = context.trend || 'LATERAL';
      const fundStatus = context.fundamentalStatus || 'NÃO ANALISADO';
      const fundScore = context.fundamentalScore ?? 0;
      const verdict = context.verdictLabel || context.verdict || 'ANÁLISE EM CURSO';
      const callWall = context.callWall
        ? `R$ ${context.callWall.strike.toFixed(2)} (+${context.callWall.distSpot}%)`
        : 'Não identificada';
      const putWall = context.putWall
        ? `R$ ${context.putWall.strike.toFixed(2)} (${context.putWall.distSpot}%)`
        : 'Não identificada';

      let explanation = `### 📊 Diagnóstico Educacional do Consultor IA para **${sym}** (Spot: ${spot})\n\n`;
      explanation += `O veredito consolidado unificado atual é: **${verdict}**.\n\n`;
      explanation += `Aqui está a decomposição analítica em **3 camadas de estudo (Padrão CNPI)**:\n\n`;

      explanation += `1. **🏢 Camada 1: Crivo Fundamentalista (CNPI-P / CG1)**\n`;
      if (fundStatus === 'APROVADO') {
        explanation += `   - **Status:** 🟢 **APROVADO** (Score: ${fundScore}/100).\n`;
        explanation += `   - **Leitura:** A empresa apresenta balanço financeiro saudável, liquidez corrente equilibrada e histórico operacional positivo. Está elegível para estudos direcionais altistas.\n\n`;
      } else {
        explanation += `   - **Status:** 🔴 **REPROVADO** (Score: ${fundScore}/100).\n`;
        explanation += `   - **Leitura:** A empresa apresenta alto endividamento ou prejuízo líquido persistente. Por regra de preservação patrimonial, **qualquer estudo de compra é bloqueado** para mitigar o risco de *Value Trap* (armadilha de valor).\n\n`;
      }

      explanation += `2. **📈 Camada 2: Análise Técnica Quantitativa (CNPI-T / CT1)**\n`;
      explanation += `   - **Tendência:** **${trend}** com base no alinhamento das Médias Móveis (MM20, MM50 e MM200).\n`;
      if (trend === 'ALTA') {
        explanation += `   - **Leitura:** Médias alinhadas positivamente (MM20 > MM50 > MM200), confirmando força compradora.\n\n`;
      } else if (trend === 'BAIXA') {
        explanation += `   - **Leitura:** Preço operando abaixo das médias móveis de referência. A leitura técnica baixista prevalece para gerenciamento de risco.\n\n`;
      } else {
        explanation += `   - **Leitura:** Médias móveis em consolidação lateral. Recomendado estudo de estruturas neutras com opções ou aguardar rompimento.\n\n`;
      }

      explanation += `3. **🛡️ Camada 3: Barreiras de Opções & Open Interest B3 (CNPI-D)**\n`;
      explanation += `   - **Call Wall (Resistência Institucional):** ${callWall}\n`;
      explanation += `   - **Put Wall (Suporte Institucional):** ${putWall}\n\n`;

      explanation += `> 💡 **Diretriz de Estudo:** Na aba **"Recomendações de Estudo"**, você pode comparar a análise técnica direta do ativo à vista ou simular a montagem com derivativos da B3 para controle de risco.\n\n`;
      explanation += `*Nota: Conteúdo de caráter estritamente educacional para fins de simulação e pesquisa.*`;

      return NextResponse.json({ answer: explanation });
    }

    // 2. Respostas sobre o Catálogo das 25 Estratégias de Opções
    if (
      qLower.includes('estratégia') ||
      qLower.includes('opções') ||
      qLower.includes('borboleta') ||
      qLower.includes('trava') ||
      qLower.includes('straddle') ||
      qLower.includes('strangle') ||
      qLower.includes('iron') ||
      qLower.includes('box') ||
      qLower.includes('cme')
    ) {
      const found = OPTION_25_STRATEGIES.find(
        (s) =>
          qLower.includes(s.name.toLowerCase()) ||
          qLower.includes(s.originalName.toLowerCase()) ||
          (qLower.includes('borboleta') && s.id === 13) ||
          (qLower.includes('bull spread') && s.id === 11) ||
          (qLower.includes('bear spread') && s.id === 12) ||
          (qLower.includes('iron butterfly') && s.id === 16) ||
          (qLower.includes('straddle') && s.id === 17) ||
          (qLower.includes('strangle') && s.id === 19) ||
          (qLower.includes('iron condor') && s.id === 20)
      );

      if (found) {
        let text = `### 📘 Catálogo Oficial de Opções — Estratégia #${found.id}: **${found.name}**\n\n`;
        text += `* **Categoria:** ${found.category} | **Viés:** ${found.bias} | **Dificuldade:** ${found.difficulty}\n`;
        text += `* **Montagem de Pernas:** ${found.legsDescription}\n\n`;
        text += `#### 🎯 Quando Estudar:\n${found.whenToUse}\n\n`;
        text += `#### 💰 Perfil de Retorno:\n${found.profitProfile}\n\n`;
        text += `#### ⚠️ Perfil de Risco:\n${found.lossProfile}\n\n`;
        text += `#### ⏳ Impacto do Tempo (Theta):\n${found.timeDecayProfile}\n`;
        return NextResponse.json({ answer: text });
      }

      let text = `### 📚 Catálogo Oficial: 25 Estratégias Comprovadas de Opções (B3)\n\n`;
      text += `O catálogo classifica as operações estruturadas em 3 grandes grupos:\n\n`;
      text += `1. **Estratégias Direcionais (#1 a #12):**\n`;
      text += `   - *Altistas:* Posição em Ações (#1), Compra de Call (#7), Trava de Alta / Bull Spread (#11), Compra Sintética (#3).\n`;
      text += `   - *Baixistas:* Venda de Ações (#2), Compra de Put (#8), Trava de Baixa / Bear Spread (#12), Venda Sintética (#4).\n`;
      text += `   - *Renda / Neutro-Altista:* Venda de Put Coberta (#6), Venda Coberta de Call (#5).\n\n`;
      text += `2. **Estratégias de Precisão & Volatilidade (#13 a #24):**\n`;
      text += `   - *Mercado Lateral:* Borboleta Comprada (#13), Iron Butterfly (#16), Straddle Vendido (#18), Iron Condor a Crédito (#20).\n`;
      text += `   - *Explosão de Volatilidade:* Straddle Comprado (#17), Strangle Comprado (#19), Backspreads de Volatilidade (#23, #24).\n\n`;
      text += `3. **Estratégias de Arbitragem / Travas (#25):**\n`;
      text += `   - *Box Spread (#25):* Estrutura de 4 pontas 100% travada para replicação de taxa de juros sintética.\n\n`;
      text += `Você pode estudar qualquer uma dessas estratégias navegando até a aba **"Recomendações de Estudo"**!`;
      return NextResponse.json({ answer: text });
    }

    // 3. Respostas sobre o Funcionamento do Sistema e Indicadores
    if (
      qLower.includes('como funciona') ||
      qLower.includes('camadas') ||
      qLower.includes('cnpi') ||
      qLower.includes('médias') ||
      qLower.includes('call wall') ||
      qLower.includes('max pain')
    ) {
      let text = `### 🏛️ Como Funciona o Motor de Estudos em 3 Camadas\n\n`;
      text += `Nossa metodologia integra os 3 pilares da análise institucional de investimentos:\n\n`;
      text += `1. **🏢 Camada 1 — Crivo Fundamentalista (CNPI-P / CG1):**\n`;
      text += `   Analisa ROE, Margem Líquida, Dívida Líq./EBITDA e liquidez. Empresas com prejuízo ou superendividamento são **bloqueadas** para evitar armadilhas de valor (*Value Traps*).\n\n`;
      text += `2. **📈 Camada 2 — Análise Técnica Quantitativa (CNPI-T / CT1):**\n`;
      text += `   Avalia o alinhamento das médias móveis $MM20, MM50, MM200$, oscilador $RSI(14)$ e momentum no $MACD$. Se o gráfico indicar tendência de Baixa, a recomendação de Venda Técnica é soberana.\n\n`;
      text += `3. **🛡️ Camada 3 — Barreiras de Opções & Open Interest B3 (CNPI-D):**\n`;
      text += `   Mapeia o posicionamento dos grandes participantes institucionais:\n`;
      text += `   - **Call Wall:** Strike com maior concentração de Calls (resistência institucional).\n`;
      text += `   - **Put Wall:** Strike com maior concentração de Puts (suporte institucional).\n`;
      text += `   - **Max Pain:** Nível de strike de menor pagamento no vencimento.\n\n`;
      text += `> 💡 **Dica de Estudo:** Utilize o Rastreador de Tendências para filtrar ativos por setor e identificar as melhores oportunidades alinhadas às 3 camadas.`;
      return NextResponse.json({ answer: text });
    }

    // Resposta padrão
    let defaultResponse = `### 🤖 Olá! Sou o Consultor IA para Estudos de Ações & Opções B3\n\n`;
    defaultResponse += `Estou aqui para esclarecer dúvidas conceituais, metodologias e estruturas quantitativas.\n\n`;
    defaultResponse += `Você pode me perguntar sobre:\n`;
    defaultResponse += `- **"Por que este ativo está com status Bloqueado / Compra / Venda?"**\n`;
    defaultResponse += `- **"Como funciona uma Trava de Alta (Bull Spread) ou Iron Condor?"**\n`;
    defaultResponse += `- **"O que significa Call Wall, Put Wall e Max Pain na B3?"**\n`;
    defaultResponse += `- **"Como funciona o crivo fundamentalista CNPI-P?"**\n`;
    defaultResponse += `- **"Quais são as 25 estratégias do catálogo de opções?"**\n\n`;
    defaultResponse += `Como posso apoiar seus estudos hoje?`;

    return NextResponse.json({ answer: defaultResponse });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao processar consulta de IA.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
