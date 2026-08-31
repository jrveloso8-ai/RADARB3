import { NextRequest, NextResponse } from 'next/server';

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
  };
}

export async function GET() {
  return NextResponse.json({
    status: 'ONLINE',
    service: 'Agente de IA do Manual Radar B3 v2',
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

    const q = question.toLowerCase().trim();

    // 1. Contexto Específico de Ativo
    if (context && context.symbol && (q.includes('este ativo') || q.includes(context.symbol.toLowerCase()))) {
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

      const answer = `### 📊 Diagnóstico do Manual para **${sym}** (Spot: ${spot})

O veredito atual é: **${verdict}**.

Aqui está a avaliação pelas **3 camadas independentes do sistema**:

1. **🏢 Camada 1: Fundamentos (CNPI-P)**
   - **Status:** **${fundStatus === 'APROVADO' ? '🟢 APROVADO' : '🔴 REPROVADO'}** (Score: ${fundScore}/100).
   - **Regra do Manual:** Aprovado se score $\\ge 45$, zero flags eliminatórias (\`LUCRO_NEGATIVO\`, \`MARGEM_NEGATIVA\`, \`SUPERENDIVIDAMENTO\`) e dados reais de rentabilidade e solvência.

2. **📈 Camada 2: Tendência (Gráfico 12M)**
   - **Classificação:** **${trend}** via alinhamento estrito de médias móveis.
   - **Regra:** ALTA se $Preço > MM20 > MM50 > MM200$; BAIXA se $Preço < MM20 < MM50 < MM200$; caso contrário, LATERAL.

3. **🛡️ Camada 3: Opções & Barreiras Institucionais**
   - **Call Wall (Teto Institucional):** ${callWall}
   - **Put Wall (Piso Institucional):** ${putWall}
   - **Regra:** Se o preço estiver a $\\le 3\\%$ de uma muralha, o card exibe alerta de realização parcial.`;

      return NextResponse.json({ answer });
    }

    // 2. Base de Conhecimento Completa do Manual Radar B3 v2 (Agosto 2026)

    // TÓPICO 01: O que o sistema faz / 3 camadas
    if (
      q.includes('o que o sistema faz') ||
      q.includes('3 camadas') ||
      q.includes('três camadas') ||
      q.includes('como funciona') ||
      q.includes('lógica do sistema') ||
      q.includes('princípio')
    ) {
      return NextResponse.json({
        answer: `### 🎯 O que o Radar B3 faz e a Lógica das 3 Camadas

O **Radar B3** responde a uma pergunta por vez: *quais operações estão autorizadas hoje, e em qual direção.* Ele varre as ações mais líquidas da B3, classifica cada uma em três estados de tendência e mostra apenas aquelas em que existe uma operação executável.

A decisão passa por **três camadas independentes**:

1. **Camada 1 — Fundamentos:** Responde se a empresa tem lucro, solvência e múltiplos defensáveis (\`APROVADO\` ou \`REPROVADO\`). *Nunca aparece na tela como categoria — funciona como filtro invisível.*
2. **Camada 2 — Tendência:** Responde para onde o preço está indo (\`ALTA\`, \`BAIXA\` ou \`LATERAL\`), olhando **apenas o gráfico**. Os fundamentos não votam aqui.
3. **Camada 3 — Opções:** Identifica onde estão as barreiras institucionais e o regime de volatilidade para definir a estrutura, os strikes e se a operação com opções é viável.

> 💡 **Princípio de Leitura:** A tendência diz *o que o mercado está fazendo*. Os fundamentos dizem *se você tem permissão para agir naquilo*. A camada de opções diz *com qual instrumento*. Confundir os três é o que torna um sistema ilegível.`,
      });
    }

    // TÓPICO 02: Como a tendência é determinada / Médias / RSI / MACD
    if (
      q.includes('tendência') ||
      q.includes('médias móveis') ||
      q.includes('mm20') ||
      q.includes('mm50') ||
      q.includes('mm200') ||
      q.includes('rsi') ||
      q.includes('macd') ||
      q.includes('alinhamento')
    ) {
      return NextResponse.json({
        answer: `### 📈 Como a Tendência é Determinada

A classificação usa três médias móveis aritméticas do preço de fechamento sobre 12 meses: **MM20** (curto prazo), **MM50** (médio prazo) e **MM200** (longo prazo).

#### Critério de Alinhamento Estrito:
- **ALTA:** $Preço > MM20 > MM50 > MM200$ (preço acima de todas, médias empilhadas para cima).
- **BAIXA:** $Preço < MM20 < MM50 < MM200$ (preço abaixo de todas, médias empilhadas para baixo).
- **LATERAL:** Qualquer outra combinação (médias cruzadas, embaralhadas ou preço entre elas). O sistema prefere classificar como LATERAL a forçar uma direção que ainda não existe.

#### Casos Especiais:
- **Histórico curto (< 200 pregões / IPO recente):** Valem apenas MM20 e MM50 com o mesmo critério de empilhamento.
- **Menos de 50 pregões:** Sem base estatística para classificar — o ativo é tratado como LATERAL e não entra em nenhuma lista.

#### O Papel do RSI(14) e MACD:
- **RSI(14):** Faixa saudável de 40 a 65. Acima de 70 indica sobrecompra (entrada esticada); abaixo de 30 indica sobrevenda.
- **MACD:** Histograma positivo confirma força compradora; negativo confirma aceleração da queda.
- **Por que eles não decidem a tendência?** Se o RSI pudesse mudar a tendência, o ativo mudaria de lista várias vezes por semana. A tendência é a *estrutura*; o RSI é o *refinamento do timing* dentro dela.`,
      });
    }

    // TÓPICO 03: Fundamentos / Score / Flags Eliminatórias / PETR4 / Liquidez < 1.0
    if (
      q.includes('fundamento') ||
      q.includes('score') ||
      q.includes('flag') ||
      q.includes('eliminat') ||
      q.includes('petr4') ||
      q.includes('liquidez') ||
      q.includes('endividamento') ||
      q.includes('roe')
    ) {
      return NextResponse.json({
        answer: `### 🏢 Como os Fundamentos são Avaliados (Crivo CNPI-P)

O crivo produz um **score de 0 a 100**, distribuído em três categorias equilibradas:

| Categoria | Peso | Métrica | Faixa Boa (Cheios) | Faixa Neutra (Metade) |
|---|---|---|---|---|
| **Rentabilidade** | **35 pts** | Lucro Líquido 12M (5 pts) <br> ROE (15 pts) <br> Margem Líquida (15 pts) | $> 0$ <br> $\\ge 10\\%$ <br> $\\ge 8\\%$ | — <br> $5\\% \\text{ a } 10\\%$ (7 pts) <br> $0\\% \\text{ a } 8\\%$ (7 pts) |
| **Solvência** | **35 pts** | Dív. Líq. / EBITDA (20 pts) <br> Liquidez Corrente (15 pts) | $\\le 2,5x$ <br> $\\ge 1,2x$ | $2,5x \\text{ a } 3,0x$ (10 pts) <br> $1,0x \\text{ a } 1,2x$ (7 pts) |
| **Valuation** | **30 pts** | P/L (15 pts) <br> P/VP (15 pts) | $3x \\text{ a } 25x$ <br> $0,5x \\text{ a } 4,0x$ | — ($> 25x = 0$ pts) <br> — ($> 4,0x = 0$ pts) |

#### Regra de Aprovação:
$$\\text{APROVADO} \\iff \\text{score} \\ge 45 \\text{ E nenhuma flag eliminatória E dados reais de rentabilidade e solvência}$$

#### As Três Flags Eliminatórias Fechadas:
1. \`LUCRO_NEGATIVO\`: Lucro Líquido 12M $\\le 0$ (empresa que destrói capital).
2. \`MARGEM_NEGATIVA\`: Margem Líquida $\\le 0\\%$ (operação deficitária).
3. \`SUPERENDIVIDAMENTO\`: DL/EBITDA $> 3,5x$ ou EBITDA $\\le 0$ (o credor decide antes do acionista).

#### Por que Liquidez Corrente $< 1,0$ ou ROE baixo NÃO reprovam sozinhos?
Setores de capital intensivo (petróleo como PETR4, elétricas, saneamento, atacarejo) operam estruturalmente com liquidez corrente $< 1,0$. Tratar isso como eliminatório apagaria empresas excelentes do radar. Essas métricas apenas zeram a pontuação do quesito, e o **score total $\\ge 45$** é quem decide.`,
      });
    }

    // TÓPICO 04: Formação do Veredito / Matriz de 6 estados / Polaridade invertida
    if (
      q.includes('veredito') ||
      q.includes('matriz') ||
      q.includes('polaridade') ||
      q.includes('combinaç') ||
      q.includes('bloqueado') ||
      q.includes('value trap')
    ) {
      return NextResponse.json({
        answer: `### ⚖️ Como o Veredito é Formado (Matriz $3 \\times 2 = 6$ Estados)

O veredito é o cruzamento direto entre a **Tendência** (3 estados) e os **Fundamentos** (2 estados):

| Tendência | Fundamentos Aprovados | Fundamentos Reprovados |
|---|---|---|
| **ALTA** | 🟢 **Compra** (Trava de alta / compra direta. Aparece na lista ALTA). | ⛔ **Sem operação** (Repique em empresa deteriorada / *Value Trap*. **Não aparece no rastreador**). |
| **LATERAL** | 🟣 **Iron Condor** (Venda de vol se IV e DTE permitirem. Aparece na lista LATERAL). | ⛔ **Sem operação** (Venda de vol em empresa frágil tem cauda gorda. **Não aparece no rastreador**). |
| **BAIXA** | 🟡 **Saída / Stop** (Empresa boa em correção. Não há operação nova. **Aparece só na consulta individual**). | 🔴 **Venda** (Fraqueza contábil confirma a queda. Trava de baixa ou venda à vista. Aparece na lista BAIXA). |

#### Atenção à Polaridade Invertida:
- **ALTA e LATERAL** exigem empresa **APROVADA** (para comprar ou vender volatilidade você precisa de uma empresa que sobreviva ao prazo da operação).
- **BAIXA** exige empresa **REPROVADA** (para operar a queda, a fragilidade contábil é o próprio argumento da tese).

> 🚫 **Repare no que NÃO existe:** Não há categoria "bloqueado", nem contador de reprovadas, nem semáforo de score no rastreador. Uma empresa reprovada simplesmente não aparece onde não pode ser operada — e reaparece na lista de venda.`,
      });
    }

    // TÓPICO 05: Usando o Rastreador / Lista Vazia / Motivos de ausência
    if (
      q.includes('rastreador') ||
      q.includes('lista vazia') ||
      q.includes('não aparece') ||
      q.includes('por que sumiu') ||
      q.includes('três listas')
    ) {
      return NextResponse.json({
        answer: `### 🧭 Usando o Rastreador de Tendências

O Rastreador entrega **três listas acionáveis de execução**:
1. **🟢 ALTA · COMPRA:** Empresas aprovadas em tendência de alta. Cada card traz entrada, stop, 2 alvos e a trava de alta sugerida com strikes.
2. **🔴 BAIXA · VENDA:** Empresas reprovadas em tendência de baixa. Traz a trava de baixa como estrutura padrão e venda à vista com alerta de aluguel (BTC).
3. **🟣 LATERAL · IRON CONDOR:** Empresas aprovadas em consolidação lateral com volatilidade e prazo adequados (DTE de 12 a 35 DU).

#### "Lista Vazia é Resposta":
Se uma lista aparecer vazia com a mensagem *"Nenhuma operação autorizada nesta direção hoje"*, isso **não é falha**. É o sistema indicando que nenhum ativo preencheu os critérios rigorosos hoje. Um sistema obrigado a sempre mostrar algo acaba fabricando operações ruins.

#### Por que um ativo pode não estar em lista nenhuma?
1. A empresa foi reprovada nos fundamentos e a tendência não é de baixa (evita *Value Trap*);
2. A empresa foi aprovada e a tendência é de baixa (aparece só na consulta individual como saída/stop);
3. A relação risco/retorno ($R:R$) do plano de trade ficou abaixo de $1,5 : 1$;
4. No caso de Iron Condor: volatilidade comprimida ($IV < 16\\%$) ou vencimento fora de 12 a 35 dias úteis.`,
      });
    }

    // TÓPICO 06: Consulta Individual / 6 blocos
    if (
      q.includes('consulta individual') ||
      q.includes('gráfico 12m') ||
      q.includes('blocos') ||
      q.includes('investigar')
    ) {
      return NextResponse.json({
        answer: `### 🔍 Usando a Consulta Individual

A Consulta Individual permite investigar um ticker por vez. Diferente do rastreador, ela **nunca esconde nada**: mostra o ativo mesmo quando não há operação e diz o motivo.

Ela é composta por **6 blocos integrados**:
1. **Gráfico 12M:** Fechamentos diários com MM20, MM50, MM200 e sub-gráfico de RSI(14) para confirmar visualmente a tendência.
2. **Ficha Fundamentalista:** As 7 métricas com valor, benchmark e status (BOM/NEUTRO/RUIM), mais o score e as flags eliminatórias.
3. **Veredito:** A operação resultante da matriz $3 \\times 2$ com justificativa completa. É o mesmo motor do rastreador.
4. **Plano de Trade:** Entrada, stop, alvo 1, alvo 2, ATR e relação risco/retorno medida para dimensionar a posição.
5. **Barreiras de Opções:** Call Wall, Put Wall, Max Pain e distância do preço até cada muralha.
6. **Estrutura Eleita:** As pernas da melhor operação com opções, strikes, prêmio real, custo e retorno sobre risco.`,
      });
    }

    // TÓPICO 07: Plano de Trade / Stop / Alvo / R:R / Dimensionamento
    if (
      q.includes('plano de trade') ||
      q.includes('stop') ||
      q.includes('alvo') ||
      q.includes('risco retorno') ||
      q.includes('r:r') ||
      q.includes('dimensionar') ||
      q.includes('tamanho da posição')
    ) {
      return NextResponse.json({
        answer: `### 🎯 Plano de Trade: Entrada, Stop e Alvo

Os níveis de preço do Radar B3 **não são percentuais fixos**. Eles são extraídos da estrutura real de suportes e resistências dos últimos 12 meses, com o ATR(14) definindo a folga do stop para evitar violinadas pelo ruído do mercado.

#### Regras de Cálculo:
- **COMPRA (ALTA):**
  - **Entrada:** Preço atual de mercado ($Spot$)
  - **Stop Loss:** $\\text{Suporte Imediato} - 0,5 \\times \\text{ATR}(14)$
  - **Alvo 1:** Resistência imediata
  - **Alvo 2:** Segunda resistência histórica
- **VENDA (BAIXA):**
  - **Entrada:** Preço atual de mercado ($Spot$)
  - **Stop Loss:** $\\text{Resistência Imediata} + 0,5 \\times \\text{ATR}(14)$
  - **Alvo 1:** Suporte imediato
  - **Alvo 2:** Segundo suporte histórico

#### O Corte de Relação Risco/Retorno ($R:R \\ge 1,5 : 1$):
O $R:R$ é **medido dinamicamente** (ganho até o alvo 1 dividido pela distância até o stop). Operações com $R:R < 1,5$ são automaticamente bloqueadas do rastreador.

#### Como Dimensionar a Posição na Prática:
$$\\text{Tamanho da Posição (Nº de Ações)} = \\frac{\\text{Capital que Aceita Perder (R\\$)}}{\\text{Entrada} - \\text{Stop (R\\$ por ação)}}$$
Defina primeiro o risco financeiro total aceitável. A distância até o stop define a quantidade de ações — nunca o inverso!`,
      });
    }

    // TÓPICO 08: Opções / Barreiras / Muralhas / Volatilidade / Iron Condor
    if (
      q.includes('opções') ||
      q.includes('call wall') ||
      q.includes('put wall') ||
      q.includes('max pain') ||
      q.includes('muralha') ||
      q.includes('volatilidade') ||
      q.includes('iv') ||
      q.includes('hv') ||
      q.includes('iron condor')
    ) {
      return NextResponse.json({
        answer: `### 🛡️ Camada de Opções & Barreiras Institucionais

#### Muralhas de Derivativos (Open Interest da Série Mensal Mais Líquida):
- **Call Wall:** Strike com maior concentração de calls em aberto. Funciona como **teto** (lançadores institucionais defendem para o papel não passar dali).
- **Put Wall:** Strike com maior concentração de puts em aberto. Funciona como **piso** (defesa institucional contra a queda).
- **Max Pain:** Strike onde os lançadores têm o menor prejuízo agregado no vencimento. Funciona como **ímã**, não como alvo.
- **Alerta de Barreira:** Dispara quando o preço está a $\\le 3\\%$ de uma muralha, sugerindo realização parcial.

#### Regimes de Volatilidade (IV vs HV21):
- **Comprimida ($IV < 16\\%$):** Opção barata, risco de rompimento. *Venda de crédito bloqueada.*
- **Moderada ($16\\% \\text{ a } 28\\%$):** Equilíbrio entre prêmio e risco. Crédito ou débito viáveis.
- **Alta ($IV \\ge 28\\%$ ou $IV/HV \\ge 1,05$):** Prêmio inflado. *Estruturas a crédito preferidas.*
- **Extrema ($IV \\ge 75\\%$ ou $IV/HV \\ge 2,0$):** Pânico ou evento de cauda. Crédito com asas largas.

#### Quando o Iron Condor é Bloqueado?
Mesmo com tendência lateral e balanço aprovado, o Iron Condor é bloqueado se:
1. $IV < 16\\%$ (vol comprimida não paga o risco de cauda);
2. Vencimento fora de **12 a 35 dias úteis**;
3. Ausência de IV real confiável nas séries ATM (divergência Call/Put $> 5$ pp ou sem liquidez).`,
      });
    }

    // TÓPICO 10: Rotina de Uso Sugerida
    if (
      q.includes('rotina') ||
      q.includes('como usar no dia a dia') ||
      q.includes('passo a passo') ||
      q.includes('quando olhar')
    ) {
      return NextResponse.json({
        answer: `### ⏱️ Rotina de Uso Sugerida do Radar B3

| Momento | O que Fazer | Por quê |
|---|---|---|
| **Antes da Abertura** | Abrir o rastreador e ler as 3 listas. | Saber com quantas operações candidatas o dia começa, antes do ruído do pregão. |
| **Antes de Executar** | Abrir a consulta individual do ativo e conferir plano de trade e barreiras. | O rastreador é resumo; a consulta individual traz os níveis e o motivo completo. |
| **Na Montagem com Opções** | Conferir no home broker se os prêmios das pernas estão próximos do exibido. | Os prêmios de opções são do fechamento do pregão anterior (defasagem B3). |
| **Na Venda à Vista** | Confirmar disponibilidade e taxa de aluguel (BTC) na corretora antes da ordem. | O sistema alerta sobre a necessidade de aluguel, mas não lê o livro de BTC. |
| **Semanalmente** | Reler a lista BAIXA em busca de ativos que você carrega em carteira. | Ativo aprovado que virou para baixa aparece na consulta individual como saída/stop. |`,
      });
    }

    // TÓPICO 11: Limites do Sistema
    if (
      q.includes('limite') ||
      q.includes('o que o sistema não faz') ||
      q.includes('aviso') ||
      q.includes('isenção') ||
      q.includes('responsabilidade')
    ) {
      return NextResponse.json({
        answer: `### ⚠️ Limites do Sistema — O que o Radar B3 NÃO Faz

1. **Não envia ordens:** É uma ferramenta de apoio à decisão. Toda execução é manual no seu home broker.
2. **Não conhece sua carteira:** Não sabe seu preço médio, exposição por setor nem perfil de risco. O dimensionamento é seu.
3. **Não lê notícias ou fatos relevantes:** Trabalha com dados contábeis publicados e preços. Divulgações de balanço no dia seguinte não estão no modelo.
4. **Não tem dados de aluguel de ações em tempo real:** O alerta na lista BAIXA é um lembrete operacional mandatório, não uma medição de taxa.
5. **Opera com dados de fechamento em opções:** Posições em aberto e IV são do pregão anterior; preço da ação e médias são do dia.
6. **Cobre as ações mais líquidas:** Papéis fora do universo varrido não aparecem — ausência não significa reprovação.
7. **Não é recomendação de investimento:** É uma ferramenta de estudo educacional e organização quantitativa de decisão.`,
      });
    }

    // TÓPICO 12: Glossário
    if (
      q.includes('glossário') ||
      q.includes('o que é theta') ||
      q.includes('o que é dte') ||
      q.includes('o que é max pain') ||
      q.includes('o que é atr') ||
      q.includes('significado')
    ) {
      return NextResponse.json({
        answer: `### 📖 Glossário de Termos do Radar B3

- **ATR(14):** *Average True Range* de 14 períodos. Mede a oscilação média diária do papel e define a folga do stop loss.
- **Call / Put Wall:** Strikes com maior número de contratos em aberto de Call (teto institucional) ou Put (piso institucional).
- **DL / EBITDA:** Dívida Líquida dividida pelo EBITDA. Quantos anos de geração de caixa operacional seriam necessários para quitar a dívida líquida.
- **DTE (*Days to Expiration*):** Dias úteis restantes até o vencimento da série de opções.
- **HV (*Historical Volatility*):** Volatilidade histórica realizada pelo preço da ação nos últimos 21 pregões (anualizada).
- **IV (*Implied Volatility*):** Volatilidade implícita cotada pelo mercado no preço das opções.
- **Iron Condor:** Estrutura de 4 pernas com opções vendidas e compradas que lucra com a passagem do tempo se o preço ficar dentro de uma faixa.
- **Liquidez Corrente:** Ativo Circulante dividido pelo Passivo Circulante (capacidade de honrar dívidas de curto prazo).
- **Max Pain:** Strike onde os lançadores de opções têm o menor prejuízo financeiro acumulado no vencimento.
- **P/L & P/VP:** Preço sobre Lucro por ação e Preço sobre Valor Patrimonial por ação.
- **ROE:** Retorno sobre o Patrimônio Líquido (*Return on Equity*).
- **Theta:** Taxa de perda de valor da opção pela passagem do tempo (lucro do vendedor de volatilidade).
- **Trava de Alta / Baixa:** Operações com duas opções com risco e ganho estritamente limitados.`,
      });
    }

    // Resposta Padrão Educacional Abrangente
    return NextResponse.json({
      answer: `### 🤖 Assistente do Manual Radar B3

Entendi sua dúvida sobre: *"**${question}**"*.

O **Radar B3** opera com base no **Manual de Uso e Lógica de Decisão (Versão 2)**, composto por 12 tópicos principais:

1. **O que o sistema faz:** 3 camadas independentes (Fundamentos, Tendência e Opções).
2. **Como a tendência é determinada:** Alinhamento estrito $MM20 > MM50 > MM200$ (ALTA), $MM20 < MM50 < MM200$ (BAIXA) ou LATERAL.
3. **Como os fundamentos são avaliados:** Score de 0 a 100 (corte $\\ge 45$) e 3 flags eliminatórias fechadas (\`LUCRO_NEGATIVO\`, \`MARGEM_NEGATIVA\`, \`SUPERENDIVIDAMENTO\`).
4. **Como o veredito é formado:** Matriz $3 \\times 2 = 6$ estados com polaridade invertida na Baixa.
5. **Usando o Rastreador:** 3 listas acionáveis (\`ALTA · COMPRA\`, \`BAIXA · VENDA\`, \`LATERAL · IRON CONDOR\`).
6. **Usando a Consulta Individual:** 6 blocos detalhados por ticker.
7. **Plano de trade:** Entrada, stop via ATR(14), alvos estruturais e corte de viabilidade $R:R \\ge 1,5 : 1$.
8. **Camada de opções:** Call Wall, Put Wall, Max Pain, 4 regimes de volatilidade e travas com derivativos.
9. **Exemplo completo:** Caso prático da PETR4 atravessando as 3 camadas.
10. **Rotina de uso sugerida:** O que checar antes da abertura, antes de executar e semanalmente.
11. **Limites do sistema:** O que o sistema não faz.
12. **Glossário:** Definições completas de ATR, DTE, IV, HV, Max Pain, etc.

Você pode me perguntar sobre qualquer um desses tópicos diretamente!`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro ao processar consulta do assistente.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
