import { NextRequest, NextResponse } from 'next/server';
import { CME_25_STRATEGIES } from '@/lib/domain/cme-strategies';

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
    service: 'Consultor IA Financeiro B3 & CME Group',
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
        qLower.includes('operar'))
    ) {
      const sym = context.symbol;
      const spot = context.spotPrice ? `R$ ${context.spotPrice.toFixed(2)}` : 'Preço atual';
      const trend = context.trend || 'LATERAL';
      const fundStatus = context.fundamentalStatus || 'APROVADO';
      const fundScore = context.fundamentalScore ?? 80;
      const verdict = context.verdictLabel || context.verdict || 'ANÁLISE EM CURSO';
      const callWall = context.callWall
        ? `R$ ${context.callWall.strike.toFixed(2)} (+${context.callWall.distSpot}%)`
        : 'Não identificada';
      const putWall = context.putWall
        ? `R$ ${context.putWall.strike.toFixed(2)} (${context.putWall.distSpot}%)`
        : 'Não identificada';

      let explanation = `### 📊 Diagnóstico do Consultor IA para **${sym}** (Spot: ${spot})\n\n`;
      explanation += `O veredito consolidado atual é: **${verdict}**.\n\n`;
      explanation += `Aqui está a decomposição analítica em **3 camadas (Padrão CNPI)**:\n\n`;

      explanation += `1. **🏢 Camada 1: Crivo Fundamentalista (CNPI-P / CG1)**\n`;
      if (fundStatus === 'APROVADO') {
        explanation += `   - **Status:** 🟢 **APROVADO** (Score: ${fundScore}/100).\n`;
        explanation += `   - **Leitura:** A empresa apresenta balanço saudável, liquidez corrente equilibrada e não opera com margens negativas. Está apta a receber teses compradoras.\n\n`;
      } else {
        explanation += `   - **Status:** 🔴 **REPROVADO** (Score: ${fundScore}/100).\n`;
        explanation += `   - **Leitura:** A empresa apresenta alto endividamento ou prejuízo líquido persistente. Por regra de preservação de capital, **qualquer compra é bloqueada** para evitar armadilhas de valor (*Value Traps*).\n\n`;
      }

      explanation += `2. **📈 Camada 2: Análise Técnica (CNPI-T / CT1)**\n`;
      explanation += `   - **Tendência:** **${trend}** com base no alinhamento das Médias Móveis (MM20, MM50 e MM200).\n`;
      if (trend === 'ALTA') {
        explanation += `   - **Leitura:** Médias alinhadas positivamente (MM20 > MM50 > MM200), confirmando força compradora.\n\n`;
      } else if (trend === 'BAIXA') {
        explanation += `   - **Leitura:** Preço operando abaixo das médias móveis. A recomendação de Venda Técnica é soberana para proteção de capital.\n\n`;
      } else {
        explanation += `   - **Leitura:** Médias emboladas em consolidação. Recomendável aguardar rompimento de pivô.\n\n`;
      }

      explanation += `3. **🛡️ Camada 3: Barreiras de Opções & Open Interest B3 (CNPI-D)**\n`;
      explanation += `   - **Call Wall (Resistência Institucional):** ${callWall}\n`;
      explanation += `   - **Put Wall (Suporte Institucional):** ${putWall}\n\n`;

      explanation += `> 💡 **Como se posicionar:** Você pode optar por **comprar/vender a ação diretamente no mercado à vista** com Stop Técnico em R$ e alvos calculados, ou utilizar **Estratégias de Opções do CME Group** (como Trava de Alta / Bull Spread) para otimizar a relação Risco:Retorno.`;

      return NextResponse.json({ answer: explanation });
    }

    // 2. Respostas sobre o Manual das 25 Estratégias do CME Group
    if (
      qLower.includes('cme') ||
      qLower.includes('estratégia') ||
      qLower.includes('opções') ||
      qLower.includes('borboleta') ||
      qLower.includes('trava') ||
      qLower.includes('straddle') ||
      qLower.includes('strangle') ||
      qLower.includes('iron') ||
      qLower.includes('box')
    ) {
      const found = CME_25_STRATEGIES.find(
        (s) =>
          qLower.includes(s.name.toLowerCase()) ||
          qLower.includes(s.originalName.toLowerCase()) ||
          (qLower.includes('borboleta') && s.id === 13) ||
          (qLower.includes('bull spread') && s.id === 11) ||
          (qLower.includes('bear spread') && s.id === 12) ||
          (qLower.includes('iron butterfly') && s.id === 16) ||
          (qLower.includes('straddle') && s.id === 17) ||
          (qLower.includes('strangle') && s.id === 19)
      );

      if (found) {
        let text = `### 📘 Manual CME Group — Estratégia #${found.id}: **${found.name}**\n\n`;
        text += `* **Categoria:** ${found.category} | **Viés:** ${found.bias} | **Dificuldade:** ${found.difficulty}\n`;
        text += `* **Montagem de Pernas:** ${found.legsDescription}\n\n`;
        text += `#### 🎯 Quando Usar:\n${found.whenToUse}\n\n`;
        text += `#### 💰 Perfil de Lucro:\n${found.profitProfile}\n\n`;
        text += `#### ⚠️ Perfil de Risco / Prejuízo:\n${found.lossProfile}\n\n`;
        text += `#### ⏳ Impacto do Tempo (Theta / Depreciação):\n${found.timeDecayProfile}\n`;
        return NextResponse.json({ answer: text });
      }

      let text = `### 📚 As 25 Estratégias Comprovadas de Opções do CME Group\n\n`;
      text += `O manual oficial do CME Group divide as estratégias em 3 grandes categorias:\n\n`;
      text += `1. **Estratégias Direcionais (#1 a #12):**\n`;
      text += `   - *Altistas:* Long Stock (#1), Long Call (#7), Bull Spread / Trava de Alta (#11), Long Synthetic (#3).\n`;
      text += `   - *Baixistas:* Short Stock (#2), Long Put (#9), Bear Spread / Trava de Baixa (#12), Short Synthetic (#4).\n`;
      text += `   - *Renda / Neutro-Altista:* Short Put (#10), Short Call coberta (#8).\n\n`;
      text += `2. **Estratégias de Precisão & Volatilidade (#13 a #24):**\n`;
      text += `   - *Mercado Lateral:* Long Butterfly (#13), Short Iron Butterfly (#16), Short Straddle (#18), Short Strangle (#20).\n`;
      text += `   - *Explosão de Volatilidade:* Long Straddle (#17), Long Strangle (#19), Call/Put Ratio Backspreads (#23, #24).\n\n`;
      text += `3. **Estratégias de Arbitragem / Travas (#25):**\n`;
      text += `   - *Box Spread (#25):* Estrutura de 4 pontas para travamento total sintético.\n\n`;
      text += `Você pode simular qualquer uma dessas estratégias diretamente no sistema navegando até a aba **"Execução (Ações vs Opções CME)"**!`;
      return NextResponse.json({ answer: text });
    }

    // 3. Respostas sobre o Funcionamento do Sistema e Indicadores
    if (
      qLower.includes('como funciona') ||
      qLower.includes('camadas') ||
      qLower.includes('cnpi') ||
      qLower.includes('token') ||
      qLower.includes('call wall') ||
      qLower.includes('max pain')
    ) {
      let text = `### 🏛️ Como Funciona o Motor Institucional de 3 Camadas\n\n`;
      text += `Nosso sistema opera sob rigoroso padrão técnico **CNPI (APIMEC/FGV)**:\n\n`;
      text += `1. **🏢 Camada 1 — Filtro Fundamentalista (CNPI-P / CG1):**\n`;
      text += `   Avalia ROE, Margem Líquida, Dívida Líq./EBITDA, Liquidez Corrente e múltiplos P/L e P/VP. Se a empresa estiver em prejuízo ou superendividada, o sistema **bloqueia compras** para evitar armadilhas de valor.\n\n`;
      text += `2. **📈 Camada 2 — Análise Técnica Quantitativa (CNPI-T / CT1):**\n`;
      text += `   Mapeia o alinhamento de Dow com $MM20, MM50, MM200$, momentum no $RSI(14)$, confirmação no $MACD$ e volume financeiro relativo. Vendas técnicas são soberanas para preservação de capital.\n\n`;
      text += `3. **🛡️ Camada 3 — Barreiras de Opções & Open Interest B3 (CNPI-D):**\n`;
      text += `   Identifica as maiores concentrações de posições em aberto nos derivativos:\n`;
      text += `   - **Call Wall:** Strike com maior volume de Calls lançadas (atua como forte resistência).\n`;
      text += `   - **Put Wall:** Strike com maior volume de Puts (atua como forte suporte).\n`;
      text += `   - **Max Pain:** Strike onde os compradores de opções têm o maior prejuízo acumulado no vencimento.\n\n`;
      text += `> 🔑 **Chave da BRAPI:** Para escanear mais de 400 ativos da B3 em tempo real, configure seu token gratuito no arquivo \`.env.local\` (\`BRAPI_API_KEY=seu_token\`).`;
      return NextResponse.json({ answer: text });
    }

    // Resposta padrão inteligente
    let defaultResponse = `### 🤖 Olá! Sou o Consultor IA Especialista em Ações & Opções\n\n`;
    defaultResponse += `Estou aqui para ajudar você a tomar as melhores decisões no mercado financeiro.\n\n`;
    defaultResponse += `Você pode me perguntar sobre:\n`;
    defaultResponse += `- **"Por que este ativo recebeu recomendação de Compra / Venda / Lateral?"**\n`;
    defaultResponse += `- **"Como montar uma Trava de Alta (Bull Spread) ou Borboleta?"**\n`;
    defaultResponse += `- **"O que significa Call Wall e Put Wall?"**\n`;
    defaultResponse += `- **"Como funciona o crivo fundamentalista CNPI-P?"**\n`;
    defaultResponse += `- **"Quais são as 25 estratégias de opções do manual CME Group?"**\n\n`;
    defaultResponse += `Como posso orientar sua análise hoje?`;

    return NextResponse.json({ answer: defaultResponse });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao processar consulta de IA.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
