# RADAR B3 PRO IA — Especificação Técnica v2.1

## Correção do Plano de Trade e do Motor de Recomendação de Opções

**Projeto:** TESTE_BRAPI
**Base:** commit `f95cf95` (pós implementação da Espec. v2)
**Data:** 31/08/2026
**Destinatário:** desenvolvimento
**Caso de referência:** VBBR3 · série 2026-09-18 · spot R$ 34,27

---

## 0. Sumário

Dois defeitos reportados em produção. O primeiro é uma quebra de contrato entre API e UI introduzida na v2. O segundo é um conjunto de seis falhas no motor de opções — que **não foi tocado** pela implementação da v2 e ficou dessincronizado do resto do sistema.

| ID | Defeito | Severidade | Arquivo |
|----|---------|-----------|---------|
| **A1** | Plano de trade zerado e gráfico ausente na aba "Estudo da Ação à Vista" | 🔴 Crítica | `QuoteView.tsx` + `quote/route.ts` |
| **B1** | Dois motores paralelos de estrutura de opções, com regras diferentes | 🔴 Crítica | `cme-election.ts` + `options-structures.ts` |
| **B2** | Seleção de pernas por índice de array — trava montada ATM, não OTM | 🔴 Crítica | ambos |
| **B3** | Prêmio de D-1 combinado com spot de D+0 — números irreproduzíveis | 🔴 Crítica | ambos |
| **B4** | Painel de payoff não exibe nome nem direção da estratégia | 🟠 Alta | `OptionPayoffChart.tsx` |
| **B5** | Fallback inventa prêmio quando a série não tem preço | 🟠 Alta | ambos |
| **B6** | Sem filtro de liquidez/`confidence` na escolha das pernas | 🟠 Alta | ambos |
| **B7** | Sem validação de coerência direcional entre veredito e estrutura | 🟠 Alta | novo |

---

## 1. Esclarecimento prévio: a estrutura sugerida **é** uma trava de alta

Antes das correções, o registro do que foi verificado, porque muda o alvo do conserto.

A sugestão exibida na tela era:

```
VENDA  VBBRU344  strike 33,83  PUT  @ 1,00
COMPRA VBBRU339  strike 33,33  PUT  @ 0,75
```

Vender a put de strike **maior** e comprar a de strike **menor** é um **Bull Put Spread — trava de alta a crédito**. A matemática exibida confere: crédito 0,25 · largura 0,50 · lucro máx. R$ 250 · perda máx. R$ 250 · breakeven 33,58. O payoff desenhado (lucro acima de 33,58) está correto para essa estrutura.

Confirmei o mapeamento símbolo↔strike direto na fonte (`/options/analytics`, VBBR3, 2026-09-18):

| Símbolo | Strike | Preço EOD | Delta | IV | OI | Confidence |
|---------|--------|-----------|-------|-----|-----|-----------|
| VBBRU339 | 33,33 | 0,75 | −0,431 | 28,3% | 53.700 | high |
| VBBRU344 | 33,83 | 1,00 | −0,518 | 28,4% | 97.500 | high |
| VBBRU349 | 34,33 | 1,27 | −0,606 | 27,7% | 128.300 | medium |

Os símbolos e strikes do sistema estão **corretos**. A montagem no home broker usou VBBRU344 + **VBBRU349** (strike 34,33) — comprar a put de strike **maior** — o que inverte a estrutura e produz uma trava de baixa a débito, exatamente como a corretora rotulou.

**Conclusão:** o sistema não sugeriu strikes errados, mas o desenho da tela torna esse erro de montagem provável e os números exibidos são irreproduzíveis no book. As correções abaixo atacam as duas coisas.

---

## 2. Defeito A1 — Plano de trade zerado e gráfico ausente

### Sintoma

Na aba **Recomendações de Estudo → Estudo da Ação à Vista** (VBBR3, veredito COMPRA):

- `STOP LOSS TÉCNICO: R$ 0.00`
- `ALVO 1: R$ 0.00`
- `ALVO 2: R$ 0.00`
- gráfico de candles com as marcações **não renderiza**
- nenhum erro no console (a página não quebra)

### Causa-raiz — duas quebras de contrato empilhadas

**Quebra 1 — `indicators` saiu do nível raiz da resposta.**

`src/app/api/quote/route.ts`, bloco `return NextResponse.json({...})`: o objeto `indicators` passou a existir **apenas dentro de `trendAnalysis`**. As chaves de nível raiz hoje são:

```
...quote, historicalDataPrice, trendAnalysis, fundamentals, barrierAlert,
verdict, operation, tradePlan, rentalAlert, optionAnalysis,
electedOptionStrategy, selectedExpiration, availableExpirations, updatedAt
```

`src/components/quote/QuoteView.tsx:101` continua lendo:

```ts
const ind = data?.indicators;   // → undefined
```

**Quebra 2 — `riskReward` deixou de existir.**

A v2 substituiu `indicators.riskReward` pelo objeto de nível raiz `tradePlan` (`src/lib/domain/trade-plan.ts`). O `indicators` montado hoje na rota é:

```ts
{ sma20, sma50, sma200, rsi, macd, atr, volumeRatio, checklist, supports, resistances }
```

Não há mais `riskReward`. A UI referencia `ind?.riskReward.*` em **12 pontos** (linhas 518, 520-531, 677, 696, 703, 710, 717, 727, 733, 1211, 1226, 1233, 1240, 1251-1254).

**Por que aparece 0.00 em vez de quebrar:** o optional chaining `ind?.riskReward.stopLoss.toFixed(2)` curto-circuita a expressão inteira quando `ind` é `undefined`, devolvendo `undefined`, e o `|| '0.00'` assume. O gráfico está dentro de `{ind && (<StockTradePlanChart .../>)}` — com `ind` falsy, o bloco é pulado silenciosamente. Nenhuma exceção, nenhuma pista no console.

> **Atenção:** corrigir só a Quebra 1 (voltar a expor `indicators` na raiz) faz a página **quebrar de verdade**, porque aí `ind` fica truthy e `ind.riskReward.stopLoss` lança `TypeError`. As duas quebras precisam ser corrigidas no mesmo commit.

### Correção

**2.1 — `src/app/api/quote/route.ts`**

Expor `indicators` também no nível raiz, mantendo a cópia dentro de `trendAnalysis` para compatibilidade:

```ts
return NextResponse.json({
  ...quote,
  historicalDataPrice: enrichedHistorical,
  trendAnalysis: { ...trendAnalysis, fundamentals, verdict, indicators, operation, tradePlan, rentalAlert },
  fundamentals,
  indicators,          // ← ADICIONAR no nível raiz
  barrierAlert,
  verdict,
  operation,
  tradePlan,
  rentalAlert,
  optionAnalysis,
  electedOptionStrategy,
  selectedExpiration: targetExp,
  availableExpirations: expirations,
  updatedAt: new Date().toISOString(),
});
```

**2.2 — `src/components/quote/QuoteView.tsx`**

Adicionar a leitura do novo objeto, junto de `ind`:

```ts
const ind  = data?.indicators;
const plan = data?.tradePlan;   // TradePlan | null
```

Substituir **todas** as 12 referências conforme o mapa:

| Antes | Depois |
|-------|--------|
| `ind?.riskReward.stopLoss` | `plan?.stop` |
| `ind?.riskReward.target1` | `plan?.target1` |
| `ind?.riskReward.target2` | `plan?.target2` |
| `ind?.riskReward.riskRewardRatio` | `plan?.riskRewardRatio` |
| `ind?.riskReward.bias` | derivar de `data.trendAnalysis.trend` (`ALTA`→LONG, `BAIXA`→SHORT, `LATERAL`→NEUTRO) |
| `ind?.riskReward.conviction` | **remover** — o campo não existe mais; substituir pelo `plan.method` |
| `ind?.riskReward.supports` | `ind?.supports` |
| `ind?.riskReward.resistances` | `ind?.resistances` |

Formatação segura em todos os pontos (o campo pode ser `null` legitimamente):

```tsx
R$ {plan ? plan.stop.toFixed(2) : '—'}
```

Usar `'—'`, nunca `'0.00'`: um stop de R$ 0,00 é um número plausível na tela e mascara ausência de dado como se fosse cálculo.

**2.3 — Gráfico (`StockTradePlanChart`)**

```tsx
{plan?.isViable ? (
  <StockTradePlanChart
    symbol={data.symbol}
    historicalPrices={data.historicalDataPrice}
    entryPrice={plan.entry}
    stopLoss={plan.stop}
    target1={plan.target1}
    target2={plan.target2}
    bias={biasFromTrend(data.trendAnalysis.trend)}
  />
) : (
  <div className="...">
    Plano de trade indisponível: {plan ? `relação risco/retorno de ${plan.riskRewardRatio.toFixed(2)} : 1 abaixo do mínimo de 1,5 : 1` : 'níveis estruturais insuficientes no histórico'}.
  </div>
)}
```

**2.4 — Texto das diretrizes (`QuoteView.tsx`, bloco "Diretrizes Teóricas de Condução")**

A linha atual é circular e não informa nada:

```tsx
• Gatilho de Estudo: Região de suporte/resistência em R$ {data.regularMarketPrice}
```

Substituir pelo método real que gerou os níveis:

```tsx
• Gatilho de Estudo: {plan?.method}
• Stop técnico: {plan ? `R$ ${plan.stop.toFixed(2)} — suporte estrutural menos 0,5 × ATR (R$ ${plan.atr.toFixed(2)})` : '—'}
• Relação risco/retorno medida: {plan ? `${plan.riskRewardRatio.toFixed(2)} : 1` : '—'}
```

Também corrigir os rótulos dos cards: `ALVO 1 (1.5x RISCO)` / `ALVO 2 (2.5x RISCO)` estão errados na v2 — os alvos agora vêm da estrutura de preço, não de múltiplos do risco. Trocar para `ALVO 1 (RESISTÊNCIA)` e `ALVO 2 (2ª RESISTÊNCIA)`, invertendo para "SUPORTE" quando o viés for SHORT.

---

## 3. Defeito B — Motor de recomendação de opções

### 3.1 — B1: dois motores paralelos, com regras diferentes

Existem hoje **duas implementações independentes** que montam estrutura de opções para o mesmo ativo:

| Motor | Arquivo | Regra de seleção | Consumido por |
|-------|---------|------------------|---------------|
| `buildSuggestedOptionStructure` | `options-structures.ts:60-75` | `otmPuts[0]` e `otmPuts[1]` (strikes adjacentes) | painel de payoff / "Pernas do Estudo" |
| `electBestOptionStrategy` | `cme-election.ts:170-172` | `putsBelowSpot[length-1]` e `[length-3]` | card "Estratégia Eleita" |

Para VBBR3 elas divergem: o primeiro monta 33,83/33,33 (largura 0,50) e o segundo montaria 33,83/33,08 (largura 0,75). O usuário vê estruturas diferentes conforme o painel que abrir.

**Correção:** eliminar `buildSuggestedOptionStructure`. `electBestOptionStrategy` passa a ser a **única** fonte de estrutura, e o painel de payoff recebe as pernas dela. Remover o import e a chamada em `quote/route.ts`, remover o campo `suggestedStructure` do payload e o arquivo `options-structures.ts`.

### 3.2 — B2: seleção de pernas por índice de array

`cme-election.ts:170-172` e `options-structures.ts:63-67` escolhem a perna vendida como *"o strike imediatamente abaixo do spot"*. Isso não é um critério de estratégia, é uma posição de array.

Consequência medida no caso VBBR3: a perna vendida (33,83) tem **delta −0,518**. Uma trava de alta a crédito com perna vendida em delta −0,52 é uma aposta praticamente 50/50 — o crédito equivale a 50% da largura e a probabilidade de lucro fica em torno de 48%. O texto que o sistema imprime junto (*"perna vendida posicionada com colchão de segurança e defesa institucional"*) é factualmente falso nesse strike.

**Correção — selecionar por delta, não por índice:**

```ts
// config/rules.ts
DERIVATIVES: {
  SPREAD: {
    SHORT_LEG_DELTA_TARGET: 0.28,   // |delta| alvo da perna vendida (crédito)
    SHORT_LEG_DELTA_MAX: 0.38,      // acima disso, não é OTM o suficiente
    LONG_LEG_DELTA_TARGET: 0.12,    // |delta| alvo da perna de proteção
    MIN_WIDTH_PCT_OF_SPOT: 0.015,   // largura mínima 1,5% do spot
    MAX_WIDTH_PCT_OF_SPOT: 0.06,    // largura máxima 6% do spot
    MIN_CREDIT_TO_WIDTH: 0.20,      // crédito < 20% da largura → não compensa
    MAX_CREDIT_TO_WIDTH: 0.45,      // crédito > 45% → perna vendida ATM demais
  },
}
```

Algoritmo para trava a crédito (Bull Put / Bear Call):

1. Filtrar séries elegíveis (ver B6).
2. Perna vendida: série cujo `|delta|` é o mais próximo de `SHORT_LEG_DELTA_TARGET`, **descartando** qualquer `|delta| > SHORT_LEG_DELTA_MAX`.
3. Perna de proteção: série cujo `|delta|` é o mais próximo de `LONG_LEG_DELTA_TARGET`, respeitando `MIN_WIDTH_PCT_OF_SPOT` e `MAX_WIDTH_PCT_OF_SPOT`.
4. Validar `MIN_CREDIT_TO_WIDTH ≤ crédito/largura ≤ MAX_CREDIT_TO_WIDTH`.
5. Se qualquer passo falhar → **não eleger estrutura**; devolver `status: 'BLOQUEADA'` com o motivo específico.

Para travas a débito (Bull Call / Bear Put), a perna comprada é a mais próxima de `|delta| 0,55` (ligeiramente ITM/ATM) e a vendida a mais próxima de `0,25`.

Sem `delta` disponível na série, a estrutura **não é montada** — não estimar delta localmente.

### 3.3 — B3: prêmio de D-1 combinado com spot de D+0

Este é o defeito que torna os números irreproduzíveis no home broker.

Os preços exibidos (1,00 e 0,75) são os `optionPrice` de **28/08/2026**, quando o `underlyingPrice` da própria fonte era **R$ 33,38**. A tela combina esses prêmios com o spot ao vivo de **R$ 34,27** e imprime crédito, breakeven, lucro e perda máximos como se fossem do mesmo instante.

A prova de que isso produz conclusão errada está no próprio card: o breakeven calculado é **33,58**, que é **acima** do spot de 33,38 vigente quando aqueles prêmios existiram. Ou seja, na data dos preços a estrutura já nascia perdedora — ela só parece confortável quando medida contra a cotação de hoje.

No book ao vivo (spot 34,29) a mesma VBBRU344 valia **0,65**, não 1,00.

**Correção:**

1. `OptionAnalysisResult` passa a carregar `priceDate` (o campo `date` devolvido pelo endpoint de analytics) e `priceUnderlying` (o `underlyingPrice` da fonte).
2. Toda estrutura montada carrega esses dois campos e a diferença percentual entre `priceUnderlying` e o spot atual:

```ts
priceContext: {
  priceDate: string;              // '2026-08-28'
  priceUnderlying: number;        // 33.38
  currentSpot: number;            // 34.27
  spotDriftPct: number;           // +2.67
  isStale: boolean;               // |spotDriftPct| > 1.5
}
```

3. **Regra de bloqueio:** se `|spotDriftPct| > 3%`, a estrutura não é eleita — os prêmios de referência estão longe demais do mercado atual. Devolver `status: 'EM_ANALISE'` com o motivo.
4. Entre 1,5% e 3%, a estrutura é exibida com selo de advertência obrigatório no topo do card **e** do painel de payoff:

> ⚠️ Prêmios de fechamento de {priceDate}, com o ativo em R$ {priceUnderlying}. O ativo está {spotDriftPct}% distante desse nível — confirme os preços das duas pontas no book antes de enviar a ordem.

5. Todo valor monetário derivado de prêmio (crédito, lucro máx., perda máx., breakeven, retorno sobre risco) exibe a data de referência ao lado, uma vez por painel.

### 3.4 — B4: painel de payoff sem identidade da estratégia

`OptionPayoffChart.tsx` recebe a prop `title` (linha 20) mas o cabeçalho é fixo (linha 136): *"Perfil de Lucro e Prejuízo no Vencimento (Lote 1.000 cotas)"*. Nada na tela diz que aquilo é uma trava de alta.

Foi o que permitiu a montagem invertida no home broker: o usuário viu duas pernas e dois strikes, sem o nome da estrutura nem o papel de cada perna.

**Correção — cabeçalho do painel:**

```
TRAVA DE ALTA · BULL PUT SPREAD A CRÉDITO          [viés: ALTA ↑]
Perfil de Lucro e Prejuízo no Vencimento (Lote 1.000 cotas)
Prêmios de 28/08/2026 · ativo a R$ 33,38 naquele fechamento
```

**Correção — bloco "Pernas do Estudo", com o papel explícito:**

```
① VENDA   VBBRU344  PUT  strike 33,83  (strike MAIOR)  recebe +R$ 1,00/cota   Δ −0,52
② COMPRA  VBBRU339  PUT  strike 33,33  (strike MENOR)  paga   −R$ 0,75/cota   Δ −0,43
                                        ↳ proteção: limita a perda a R$ 250
Crédito líquido: R$ 0,25/cota · R$ 250 no lote de 1.000
```

**Correção — bloco de conferência antes da ordem**, com uma frase que descreve a estrutura em linguagem de mesa e serve de checagem contra montagem invertida:

> Nesta trava você **vende a put de strike maior e compra a de strike menor**. Se no home broker a estrutura aparecer como "trava de baixa", as pernas foram invertidas — confira antes de enviar.

### 3.5 — B5: fallback que inventa prêmio

Em 8 pontos dos dois motores existe o padrão:

```ts
const shortPrice = shortPutRow.put?.lastPrice || Number((width * 0.40).toFixed(2));
```

Sem preço da fonte, o sistema **fabrica** um prêmio como percentual arbitrário da largura, e segue calculando crédito, breakeven e lucro máximo em cima de um número inventado — sem nenhuma marcação na tela.

**Correção:** remover todos os fallbacks. Série sem `optionPrice` da fonte é série inelegível. Se após o filtro não houver pernas suficientes, a estrutura não é eleita:

```ts
if (!shortRow.optionPrice || !longRow.optionPrice) return blockedStructure(
  'Séries sem preço de fechamento na fonte. Estrutura não montada.'
);
```

### 3.6 — B6: sem filtro de liquidez

Nenhum dos motores olha `confidence`, `openInterest` ou preço mínimo ao escolher as pernas.

**Correção — elegibilidade da série (aplicada antes de qualquer seleção):**

```ts
const isEligibleLeg = (o: OptionAnalyticsItem) =>
  o.confidence === 'high' &&
  o.optionPrice !== null && o.optionPrice >= 0.10 &&
  o.openInterest >= 5000 &&
  o.delta !== null && Math.abs(o.delta) > 0.05 && Math.abs(o.delta) < 0.95 &&
  o.impliedVolatility !== null;
```

Séries com `confidence: 'medium'` ou `'low'` podem compor as muralhas de Open Interest, mas **não** podem ser pernas de uma estrutura recomendada. No caso VBBR3, isso mantém VBBRU339 e VBBRU344 (ambas `high`) e descarta VBBRU349 (`medium`).

### 3.7 — B7: sem validação de coerência direcional

Nada no código verifica, ao final, se a estrutura montada tem o viés que o veredito pediu. Um erro de sinal numa seleção de pernas passa direto para a tela.

**Correção — asserção obrigatória antes de devolver qualquer estrutura.** Calcular o payoff em dois extremos e conferir o sinal:

```ts
function payoffAt(legs: OptionLeg[], S: number): number { /* soma das pernas no vencimento */ }

function assertDirection(structure: ElectedOptionStrategy, spot: number): void {
  const low  = payoffAt(structure.legs, spot * 0.5);
  const high = payoffAt(structure.legs, spot * 1.5);

  if (structure.bias === 'ALTA'    && !(high > low)) throw new StructureDirectionError(structure);
  if (structure.bias === 'BAIXA'   && !(low > high)) throw new StructureDirectionError(structure);
  if (structure.bias === 'LATERAL' && !(payoffAt(structure.legs, spot) > low && payoffAt(structure.legs, spot) > high))
    throw new StructureDirectionError(structure);
}
```

Em produção, capturar a exceção, **não exibir a estrutura**, e registrar log de erro. Uma estrutura com direção incoerente é bug, não é conteúdo para o usuário.

Aplicar a mesma função para calcular `maxProfit`, `maxLoss` e `breakEven` por varredura do payoff, em vez das fórmulas escritas à mão em cada cenário — hoje há 5 cópias dessas fórmulas em `cme-election.ts`, cada uma com chance própria de erro de sinal.

---

## 4. Testes obrigatórios

### 4.1 — Contrato API ↔ UI (defeito A1)

| # | Teste | Esperado |
|---|-------|----------|
| A1 | `GET /api/quote?symbol=X` | resposta contém `indicators` **e** `tradePlan` no nível raiz |
| A2 | Snapshot do shape da resposta | teste falha se qualquer chave de nível raiz for removida ou renomeada |
| A3 | Render de `QuoteView` com `tradePlan: null` | exibe `'—'` nos três cards e a mensagem de indisponibilidade; **não** exibe `0.00` |
| A4 | Render com `tradePlan.isViable: false` | gráfico não renderiza, motivo exibido com o R:R medido |
| A5 | Render com `tradePlan` válido | gráfico renderiza com entry/stop/target1/target2 do plano |
| A6 | Busca por qualquer string em `QuoteView.tsx` | zero ocorrências de `riskReward` |

### 4.2 — Motor de opções

Fixture obrigatória: o payload real de `/options/analytics` para VBBR3 · 2026-09-18 (7 séries de put, com os deltas e preços da tabela da seção 1), salvo em `src/lib/services/__fixtures__/vbbr3-analytics.json`.

| # | Teste | Esperado |
|---|-------|----------|
| B1 | Existe apenas um motor de estrutura | `options-structures.ts` removido; nenhum import remanescente |
| B2 | Seleção por delta, fixture VBBR3, veredito COMPRA | perna vendida com `\|delta\| ≤ 0,38`; **VBBRU344 (−0,518) não pode ser eleita** |
| B3 | Crédito/largura fora de 20%–45% | estrutura não eleita, motivo específico |
| B4 | `spotDriftPct` de +2,67% (caso real) | estrutura eleita **com** selo de advertência e `isStale: true` |
| B5 | `spotDriftPct` de +4% | estrutura **não** eleita |
| B6 | Série sem `optionPrice` | inelegível; nenhum prêmio fabricado em nenhum campo |
| B7 | Série com `confidence: 'medium'` (VBBRU349) | inelegível como perna; ainda válida para muralha de OI |
| B8 | `assertDirection` em Bull Put | payoff(0,5·spot) < payoff(1,5·spot) |
| B9 | `assertDirection` em Bear Call | payoff(0,5·spot) > payoff(1,5·spot) |
| B10 | `assertDirection` em Iron Condor | payoff(spot) > payoff nos dois extremos |
| B11 | Pernas invertidas injetadas de propósito | lança `StructureDirectionError`; estrutura não chega à UI |
| B12 | `maxProfit`/`maxLoss`/`breakEven` por varredura | coincidem com as fórmulas fechadas nos 4 tipos de trava, tolerância de R$ 0,01 |

### 4.3 — Regressão

Rodar a suíte existente (60 testes na v2). Os testes de `cme-election.test.ts` vão quebrar com a mudança de seleção por delta — **é esperado**: reescrevê-los com a fixture real, não relaxar os novos critérios para fazer os antigos passarem.

---

## 5. Critérios de aceite

1. A aba "Estudo da Ação à Vista" exibe stop, alvo 1 e alvo 2 com valores reais, e o gráfico com as marcações renderiza.
2. Quando não há plano viável, a tela diz o motivo e mostra `'—'`; em nenhuma hipótese aparece `R$ 0.00` como stop ou alvo.
3. Existe uma única fonte de estrutura de opções em todo o sistema.
4. Nenhuma estrutura recomendada tem perna vendida com `|delta| > 0,38`.
5. Todo painel que exibe prêmio mostra a data de referência dos preços e o spot daquele fechamento.
6. O painel de payoff exibe o nome da estratégia, o viés e o papel de cada perna (strike maior / strike menor).
7. Nenhum valor monetário de opção na UI é estimado — todos vêm de `optionPrice` da fonte.
8. `assertDirection` roda em 100% das estruturas antes de qualquer serialização para a UI.
9. Suíte verde, incluindo os testes das seções 4.1 e 4.2.

---

## 6. Ordem de execução

```
A1 (contrato UI)  ──┐
                    ├──→  B4 (painel de payoff)  ──→  B3 (contexto de data)
B1 (motor único) ───┘
        │
        └──→ B6 (elegibilidade) ──→ B2 (seleção por delta) ──→ B5 (fim dos fallbacks) ──→ B7 (assertDirection)
```

**A1 é independente e pode subir sozinho hoje** — é o defeito que está deixando a tela principal sem plano de trade.

**B7 deve ser o último a entrar, mas escrito primeiro:** a asserção de direção é a rede de segurança que valida todas as demais mudanças do motor de opções. Escrever `assertDirection` e seus testes antes de mexer na seleção de pernas dá um detector automático de erro de sinal durante toda a refatoração.

---

## 7. Registro da decisão sobre B2

A mudança de "strike imediatamente abaixo do spot" para "strike por delta alvo" **reduz a frequência de recomendações** — em papel com grade de strikes curta, pode não haver série com delta na faixa, e nenhuma estrutura será eleita.

Isso é intencional. A alternativa é continuar recomendando travas com perna vendida ATM, que entregam relação de risco 1:1 com probabilidade de acerto de ~50% e são apresentadas ao usuário com o texto "colchão de segurança". Preferir a lista vazia à recomendação estruturalmente ruim é a mesma regra já adotada no rastreador da v2.
