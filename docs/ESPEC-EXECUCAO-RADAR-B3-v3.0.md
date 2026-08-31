# RADAR B3 PRO IA — Especificação de Execução v3.0

## Backlog consolidado: 11 itens em ordem de implementação

**Projeto:** TESTE_BRAPI
**Base:** commit `4fda6ce`
**Data:** 31/08/2026
**Consolida:** Espec. v2.3 (defeitos do motor de opções) + Espec. v2.4 (navegação e testabilidade)
**Destinatário:** desenvolvimento

> Este documento é autossuficiente. O desenvolvedor não precisa abrir a v2.3 nem a v2.4 para executar — elas ficam como histórico do diagnóstico.

---

## 0. Situação de partida

O que já está implementado e **validado por medição** (suíte do projeto: 87 testes verdes, mais 18 testes adversariais sobre a cadeia real do ITUB4):

| Entrega | Status | Evidência |
|---------|--------|-----------|
| Crivo fundamentalista v2 (pesos, flags eliminatórias, DL/EBITDA calculado) | ✅ | PETR4 = 85 pontos, APROVADO |
| Matriz de operação 3×2 e as três listas do rastreador | ✅ | 6 combinações cobertas por teste |
| Plano de trade com R:R medido | ✅ | `tradePlan` no nível raiz da API |
| Motor único de estrutura de opções | ✅ | `options-structures.ts` removido |
| Seleção de pernas por delta (travas verticais) | ✅ | perna vendida com δ −0,328, teto 0,38 respeitado |
| Busca em espaço de pares (travas verticais) | ✅ | 43 pares válidos no ITUB4 |
| Elegibilidade sem `confidence` | ✅ | ITUB4: 2 → 13 séries elegíveis |
| Bloqueio com motivo estruturado | ⚠️ parcial | motivos existem; diagnóstico numérico é falso em um caminho (item 4) |
| `assertDirection`, controle de drift, DTE 12–35, zero fallback de prêmio | ✅ | todos ativos e testados |

Estrutura que o sistema elege hoje para ITUB4 (spot 39,55, veredito COMPRA):

```
Bull Put Spread 38,46 / 37,21
  VENDA  ITUBU388  K 38,46  δ −0,328  @ 0,56   OI 2.977.800
  COMPRA ITUBU379  K 37,21  δ −0,171  @ 0,24   OI 2.175.700
  largura 3,16% do spot · crédito 25,6% da largura · R:R 1 : 2,9 · breakeven 38,14
```

**O que falta:** 11 itens. Os seis primeiros afetam o **conteúdo** da recomendação — eles fazem o sistema recomendar errado. Os cinco últimos afetam o **acesso** à recomendação. A ordem abaixo não é sugestão: uma recomendação errada bem exposta é pior que uma recomendação certa mal exposta.

---

## 1. Ordem de execução

```
FASE A — conteúdo da recomendação (v2.3)
  01 G4  mapper lastTradeDate        base para 02 e 05
  02 G5  fixture real do ITUB4       base para 05
  03 G3  gate de IV                  independente
  04 G2  diagnóstico verdadeiro      independente
  05 G1  Iron Condor por espaço de pares   depende de 01 e 02
  06 G6  UI trata EM_ANALISE         depende de 03

FASE B — acesso à recomendação (v2.4)
  07 N105  afordâncias e testabilidade     base para 08–11
  08 N102  /api/options devolve estrutura
  09 N101  painel de estrutura na aba de opções   depende de 08
  10 N103  alternativa a débito            depende de 09
  11 N104  visões do Panorama Geral

DECISÃO PENDENTE — pesos da função de score (seção 14)
```

---

# FASE A — conteúdo da recomendação

## Item 01 · G4 — `lastTradeDate` não é mapeado

**Severidade:** 🔴 crítica · **Arquivo:** `src/lib/services/brapi.ts`

### Evidência

O filtro de negociação recente — que substituiu o `confidence` como medida de liquidez real na v2.2 — **não roda em produção**. O mapper de `/options/analytics` não copia o campo:

```ts
return {
  symbol: item.symbol, side: item.side, strike: Number(item.strike),
  // ...
  openInterest: item.openInterest ? Number(item.openInterest) : undefined,
  openInterestDate: item.openInterestDate,
  // lastTradeDate ausente
};
```

E `isEligibleLeg` só aplica o filtro quando o campo existe:

```ts
if (rules.REQUIRE_TRADED_ON_SNAPSHOT_DATE && snapshotDate && o.lastTradeDate) { ... }
```

Medido nos dois sentidos: série **sem** `lastTradeDate` → elegível; série **com** data antiga → corretamente rejeitada. Como o mapper nunca preenche, a segunda situação nunca ocorre em produção. Os testes passam porque a fixture tem o campo — divergência clássica entre massa de teste e produção.

### Correção

1. Adicionar ao mapper: `lastTradeDate: item.lastTradeDate` e `firstTradeDate: item.firstTradeDate`.
2. Trocar o guard permissivo por falha explícita — quando `REQUIRE_TRADED_ON_SNAPSHOT_DATE` é `true` e a série **não tem** `lastTradeDate`, a série é **inelegível**. Ausência de dado não pode virar aprovação silenciosa.
3. `confidence: item.confidence || 'high'` → o default silencioso passa a ser `undefined`. O campo não filtra mais nada, mas um default inventado polui o desempate.
4. Conversão de IV: trocar a heurística `ivRaw <= 1.0 ? ivRaw * 100 : ivRaw` por conversão incondicional (`ivRaw * 100`), validando a faixa resultante entre 1% e 400% e registrando fora-de-faixa como `null`. A fonte entrega decimal de forma consistente.

### Testes

| ID | Cenário | Esperado |
|----|---------|----------|
| CT-961 | mapper sobre payload cru da BRAPI | `lastTradeDate` presente em 100% dos itens |
| CT-962 | série sem `lastTradeDate` | inelegível |
| CT-963 | `confidence` ausente no payload | mapeado como `undefined`, não `'high'` |
| CT-964 | IV `0.2835` no payload cru | `28.35` no objeto mapeado |
| CT-965 | IV `5.0` no payload cru | `null`, com registro |

**Concluído quando:** o teste de contrato roda sobre o payload **cru** da fonte, não sobre fixture editada.

---

## Item 02 · G5 — fixture com o lado das calls inventado

**Severidade:** 🟠 alta · **Arquivo:** `src/lib/services/__fixtures__/itub4-analytics.json`

### Evidência

As calls da fixture são `40,00 · 41,00 · 42,00 · 42,25`, com símbolos `ITUBI400`, `ITUBI410`, `ITUBI420`. A cadeia real do ITUB4 no mesmo vencimento é:

| Símbolo real | Strike | Preço | Delta | OI | Confidence |
|--------------|--------|-------|-------|-----|-----------|
| ITUBI407 | 40,05 | 0,66 | 0,411 | 2.319.400 | low |
| ITUBI409 | 40,30 | 0,57 | 0,374 | 598.700 | low |
| ITUBI412 | 40,55 | 0,49 | 0,334 | 1.835.900 | high |
| ITUBI414 | 40,80 | 0,42 | 0,298 | 745.800 | low |
| ITUBI417 | 41,05 | 0,37 | 0,266 | 1.527.400 | low |
| ITUBI419 | 41,30 | 0,32 | 0,238 | 690.600 | low |
| ITUBI422 | 41,55 | 0,28 | 0,209 | 2.426.600 | low |
| ITUBI424 | 41,80 | 0,23 | 0,182 | 1.917.300 | low |

Strikes redondos não existem nessa série — a grade do ITUB4 é ajustada por proventos e cai em centavos quebrados, com espaçamento de R$ 0,25. Consequência: **Bear Call e Iron Condor estão sendo testados contra dados que não existem no mercado**, e com espaçamento quase 4× maior que o real.

### Correção

Substituir o lado das calls pela captura real (as 8 séries acima, com `impliedVolatility` em decimal como a fonte entrega, `lastTradeDate: "2026-08-28"`, `nullReason: null`, `underlyingPrice: 39.19`).

**Regra de processo, a partir daqui:** fixture de dado externo é **captura**, nunca redação. Nenhum campo digitado à mão; o arquivo é o payload da fonte, no máximo com truncamento de séries.

### Testes

| ID | Cenário | Esperado |
|----|---------|----------|
| CT-966 | fixture ITUB4 | todos os strikes de call conferem com a cadeia real |
| CT-966b | fixture ITUB4 | espaçamento entre strikes consecutivos = R$ 0,25 |

---

## Item 03 · G3 — a IV nunca entra na decisão

**Severidade:** 🔴 crítica · **Arquivo:** `src/lib/domain/cme-election.ts`

### Evidência

`ivAtm` **não é lido em nenhum ponto** do motor. O motivo `IV_INDISPONIVEL` está declarado em `BLOCK_MESSAGES` e nunca é emitido.

Teste executado com `optionAnalysis.ivAtm = null`, todo o resto igual:

```
resultado: status AUTORIZADA · reason: undefined
```

Uma trava a crédito foi eleita sem nenhuma confirmação de regime de volatilidade. Contraria a RN-522 da base de teste e a Regra 4 da árvore de decisão original: venda de prêmio em volatilidade comprimida é proibida.

### Correção

Antes de eleger qualquer estrutura **a crédito**:

```ts
if (!optionAnalysis?.ivAtm || !(optionAnalysis.ivAtm.callIv > 0)) {
  return createBlockedStrategy(..., 'IV_INDISPONIVEL', diagnostics);
}

const regime = classifyVolatilityRegime(optionAnalysis.ivAtm.callIv, hv21);
if (regime.regime === 'MUITO_BAIXA') {
  return createBlockedStrategy(..., 'VOL_COMPRIMIDA', diagnostics);
}
```

Estruturas **a débito** (Bull Call, Bear Put) seguem sem IV ATM — não vendem volatilidade —, mas o card exibe "regime de volatilidade não confirmado".

### Testes

| ID | Cenário | Esperado |
|----|---------|----------|
| CT-958 | `ivAtm = null`, estrutura a crédito | bloqueio `IV_INDISPONIVEL` |
| CT-959 | IV = 14%, LATERAL | bloqueio `VOL_COMPRIMIDA` |
| CT-960 | `ivAtm = null`, estrutura a débito | eleita, com aviso de regime não confirmado |

---

## Item 04 · G2 — diagnóstico numérico falso

**Severidade:** 🔴 crítica · **Arquivo:** `src/lib/domain/cme-election.ts`

### Evidência

O bloco de fall-through devolve o diagnóstico com valores literais:

```ts
return createBlockedStrategy(symbol, spot, expDate, dte, bias, 'SEM_PAR_VALIDO', {
  seriesInChain: analyticsList.length,
  seriesEligible: 0,      // ← literal, não calculado
  validPairs: 0,
  ...
});
```

O usuário lê **"22 séries na cadeia · 0 elegíveis"** quando havia 15 elegíveis. O bloco de diagnóstico existe justamente para distinguir "o mercado não tem" de "o filtro está errado" — com número fabricado, ele faz o oposto.

### Correção

1. `seriesEligible` e `validPairs` calculados e propagados por **todos** os caminhos de bloqueio.
2. Motivo derivado do número real:
   - `seriesEligible === 0` ⟹ `SEM_SERIES_ELEGIVEIS`
   - `seriesEligible >= 2` e `validPairs === 0` ⟹ `SEM_PAR_VALIDO`
3. A mensagem de `SEM_PAR_VALIDO` informa **qual restrição** eliminou os pares, com o valor do melhor par rejeitado:

> "15 séries negociáveis, 0 pares válidos. Melhor combinação encontrada: largura de 0,23% do spot, abaixo do mínimo de 1,5%."

### Testes

| ID | Cenário | Esperado |
|----|---------|----------|
| CT-955 | qualquer bloqueio | `seriesEligible` igual ao valor calculado para aquela cadeia |
| CT-956 | 15 elegíveis, 0 pares | `SEM_PAR_VALIDO` com a restrição citada |
| CT-957 | 0 elegíveis | `SEM_SERIES_ELEGIVEIS` |

**Invariante:** nenhum caminho de bloqueio pode devolver `seriesEligible` diferente do valor efetivamente calculado.

---

## Item 05 · G1 — Iron Condor ficou com o algoritmo antigo

**Severidade:** 🔴 crítica · **Arquivo:** `src/lib/domain/cme-election.ts`, cenário 3
**Depende de:** itens 01 e 02

### Evidência

Cenário LATERAL + APROVADO + DTE 20, sobre a mesma cadeia que produz 43 pares válidos na trava vertical:

```
status: BLOQUEADA · reason: SEM_PAR_VALIDO
mensagem: "Grade de strikes muito curta neste vencimento."
diagnóstico: 22 séries na cadeia · 0 elegíveis · 0 pares válidos
```

A causa está no código do cenário 3, que manteve a seleção por índice que a v2.2 removeu das travas verticais:

```ts
const sortedPuts  = [...eligiblePuts].sort((a, b) => b.strike - a.strike);
const sortedCalls = [...eligibleCalls].sort((a, b) => a.strike - b.strike);
const shortPut  = sortedPuts[0];   // strike imediatamente abaixo do spot
const longPut   = sortedPuts[1];   // strike adjacente
const shortCall = sortedCalls[0];
const longCall  = sortedCalls[1];
```

No ITUB4 isso escolhe a put de strike **39,05, delta −0,418** — acima do teto de 0,38 e praticamente no dinheiro — e asas de **R$ 0,09 = 0,23% do spot**, contra o mínimo de 1,5%. A estrutura é rejeitada e o usuário lê "grade de strikes muito curta" em um ativo com 18 strikes de put.

Em qualquer papel de grade densa — ITUB4, BBDC4, BBAS3, todos com espaçamento de R$ 0,25 — **o Iron Condor nunca será montado**.

### Correção

Aplicar ao cenário 3 a mesma busca em espaço de pares, com dois pares independentes:

```
1. Conjunto elegível: puts com strike < spot, calls com strike > spot.
2. Enumerar pares de put (curta, longa) e pares de call (curta, longa) que satisfaçam:
   - |delta| da perna vendida <= IRON_CONDOR.SHORT_LEG_DELTA_MAX
   - largura de cada asa dentro de [MIN_WIDTH_PCT, MAX_WIDTH_PCT] do spot
   - crédito de cada asa > 0
3. Produto cartesiano dos pares válidos, filtrando o condor completo por:
   - crédito total / maior largura dentro de [MIN_CREDIT_TO_WIDTH, MAX_CREDIT_TO_WIDTH]
   - assimetria entre as asas: |largura_put - largura_call| <= MAX_WING_ASYMMETRY x maior largura
4. Score do condor:
     0,35 x aderência de delta das duas pernas vendidas ao alvo
   + 0,25 x crédito total / maior largura
   + 0,20 x simetria das asas
   + 0,20 x liquidez efetiva (menor OI entre as quatro pernas)
5. Sem par válido em um dos lados -> bloqueio distinguindo "sem par de put" de "sem par de call".
```

Novos parâmetros em `src/lib/config/rules.ts`:

```ts
IRON_CONDOR: {
  MIN_DTE: 12,
  MAX_DTE: 35,
  SHORT_LEG_DELTA_TARGET: 0.20,   // menor que o 0,28 das verticais
  SHORT_LEG_DELTA_MAX: 0.30,
  MAX_WING_ASYMMETRY: 0.50,
}
```

O alvo de delta é **0,20**, não 0,28: a estrutura tem duas pernas vendidas e o risco combinado exige mais distância do dinheiro que uma trava direcional.

### Testes

| ID | Cenário | Esperado |
|----|---------|----------|
| CT-950 | Iron Condor, cadeia ITUB4 **real**, DTE 20, IV moderada | estrutura eleita, quatro pernas |
| CT-951 | condor eleito | ambas as pernas vendidas com `\|delta\| ≤ 0,30` |
| CT-952 | condor eleito | largura de cada asa ≥ 1,5% do spot |
| CT-953 | condor eleito | assimetria entre asas ≤ 50% da maior |
| CT-954 | condor eleito | `payoff(spot)` maior que nos dois extremos |

---

## Item 06 · G6 — a UI não cobre `EM_ANALISE`

**Severidade:** 🟠 alta · **Arquivo:** `src/components/quote/QuoteView.tsx`
**Depende de:** item 03

### Evidência

```tsx
// linha 896 — painel de bloqueio
{!isBlocked && execMode === 'OPTIONS' && (!elected || elected.status === 'BLOQUEADA' || elected.legs.length === 0) && (...)}

// linha 933 — painel de estrutura
{!isBlocked && execMode === 'OPTIONS' && elected && elected.status !== 'BLOQUEADA' && elected.legs.length > 0 && (...)}
```

O bloqueio por drift devolve `status: 'EM_ANALISE'`. Hoje ele cai no painel correto apenas porque vem sem pernas. Qualquer caminho futuro que devolva `EM_ANALISE` **com** pernas — uma estrutura montada mas com advertência de defasagem, por exemplo — será renderizado como autorizada, sem o aviso.

### Correção

Uma única fonte de verdade:

```ts
const isActionable = elected?.status === 'AUTORIZADA' && elected.legs.length > 0;
```

`EM_ANALISE` ganha painel próprio: exibe a estrutura **com** tarja de advertência e **sem** o bloco de envio de ordem.

### Testes

| ID | Cenário | Esperado |
|----|---------|----------|
| CT-967 | render com `EM_ANALISE` e pernas | painel de advertência, sem bloco de ordem |
| CT-967b | render com `AUTORIZADA` e pernas | painel completo com bloco de ordem |

---

# FASE B — acesso à recomendação

## Item 07 · N105 — afordâncias e testabilidade

**Severidade:** 🟠 alta · **Arquivos:** toda a camada `src/components/**`
**Base para:** itens 08 a 11

### Evidência

O projeto tem **zero** `data-testid`, **zero** `role=` e **zero** atributos `aria-*`. Tudo é `<div>` com `onClick`. Três testes automatizados falharam por não encontrar controles, e os três diagnósticos culparam feature flags — que também não existem no projeto (`grep` por `featureFlag`, `FEATURE_`, `NEXT_PUBLIC_`: zero ocorrências).

### Correção

1. **Todo elemento clicável é `<button>` ou `<a>`.** Nenhum `onClick` em `<div>` ou `<span>`. Navegação por teclado funcional em toda a aplicação.
2. **Navegação por abas com semântica real:** `role="tablist"` / `role="tab"` / `role="tabpanel"`, com `aria-selected` e `aria-controls`. Vale para a Navbar, para as sub-abas da consulta e para as visões do panorama.
3. **`data-testid` estáveis**, nomenclatura `<área>-<elemento>`:

```
nav-tab-overview · nav-tab-quote · nav-tab-screener · nav-tab-options · nav-tab-help
options-symbol-input · options-expiration-<YYYY-MM-DD>
options-eligible-structures-panel · options-structure-status
options-structure-leg-<n> · options-payoff-chart
options-structure-primary · options-structure-alternative
options-block-reason · options-block-diagnostics
quote-tab-technical · quote-tab-fundamentals · quote-tab-options · quote-tab-recommendations
quote-mode-options · quote-mode-stock
trade-plan-entry · trade-plan-stop · trade-plan-target1 · trade-plan-target2 · trade-plan-chart
screener-list-alta · screener-list-baixa · screener-list-lateral · screener-empty-<lista>
overview-view-sentimento · overview-view-indices · overview-view-setores
```

4. **`aria-live="polite"`** nos blocos que mudam após carregamento assíncrono: veredito, estrutura, plano de trade.
5. **Carregamento é esqueleto visível** com `data-testid` próprio, nunca ausência de nó.
6. **Quatro estados distinguíveis** — carregando, erro, vazio e bloqueado — com `data-testid` e texto diferentes. Um agente, e um usuário, precisam distinguir "o motor decidiu não montar" de "a requisição falhou" de "não há dado publicado".

`data-testid` é contrato: renomear exige atualizar os testes no mesmo commit.

### Testes

| ID | Cenário | Esperado |
|----|---------|----------|
| CT-N10 | navegação só por teclado | todas as abas e controles alcançáveis por Tab, acionáveis por Enter |
| CT-N11 | varredura estática | nenhum `onClick` em `<div>` ou `<span>` |
| CT-N12 | varredura estática | todos os `data-testid` da lista presentes |
| CT-N13 | quatro estados | quatro `data-testid` distintos, nenhum compartilhado |

---

## Item 08 · N102 — `/api/options` devolve a estrutura

**Severidade:** 🟠 alta · **Arquivo:** `src/app/api/options/route.ts`

### Correção

A rota passa a incluir, além da análise de posições atual:

```
electedOptionStrategy · operation · fundamentals (status e score) · priceContext
```

Hoje ela devolve apenas a análise de posições, o que impede a página de opções de exibir estrutura. É a mudança de backend que habilita o item 09.

### Testes

| ID | Cenário | Esperado |
|----|---------|----------|
| CT-N04 | `GET /api/options?symbol=PETR4&expiration=...` | resposta contém `electedOptionStrategy`, `operation` e `priceContext` |

---

## Item 09 · N101 — painel de estrutura na aba de opções

**Severidade:** 🟠 alta · **Arquivo:** `src/components/options/OptionsBarriersView.tsx`
**Depende de:** item 08

### Evidência

`OptionsBarriersView.tsx` tem **zero** ocorrências de `OptionPayoffChart`. A aba "Barreiras de Opções" mostra muralhas, Max Pain, IV ATM e a grade straddle — e nada mais. O painel de estrutura e o payoff existem apenas em `QuoteView`, três níveis de navegação abaixo: **Consulta & Gráfico 12M → Recomendações de Estudo → Estratégia de Opções Eleita**.

### Correção

A aba passa a exibir, entre o bloco de muralhas e a grade straddle, a seção **"Estrutura Elegível para o Vencimento"**, alimentada pelo mesmo motor único, com:

- título da estratégia, viés e status;
- pernas com papel explícito (strike maior / strike menor), preço, delta e OI;
- crédito ou débito líquido, largura, lucro e perda máximos, breakeven;
- data de referência dos prêmios e selo de defasagem quando `isStale`;
- gráfico de payoff (`OptionPayoffChart`, o mesmo componente já usado em `QuoteView`);
- quando bloqueado: motivo, mensagem e o bloco de diagnóstico numérico do item 04.

A seção existe **em todos os estados** — autorizada, em análise ou bloqueada. Nunca é omitida do DOM.

**Cabeçalho obrigatório do painel de payoff**, corrigindo a lacuna que induziu a montagem invertida no home broker:

```
TRAVA DE ALTA · BULL PUT SPREAD A CRÉDITO          [viés: ALTA ↑]
Perfil de Lucro e Prejuízo no Vencimento (Lote 1.000 cotas)
Prêmios de 28/08/2026 · ativo a R$ 39,19 naquele fechamento
```

E o bloco de conferência antes da ordem:

> Nesta trava você **vende a put de strike maior e compra a de strike menor**. Se no home broker a estrutura aparecer como "trava de baixa", as pernas foram invertidas — confira antes de enviar.

### Testes

| ID | Cenário | Esperado |
|----|---------|----------|
| CT-N01 | Barreiras de Opções, PETR4, série de setembro | `options-eligible-structures-panel` presente no DOM |
| CT-N02 | motor devolve bloqueio | painel presente, com `options-block-reason` e `options-block-diagnostics` |
| CT-N03 | estrutura autorizada | `options-payoff-chart` renderizado e pernas com papel explícito |

---

## Item 10 · N103 — alternativa a débito

**Severidade:** 🟡 média · **Arquivos:** `cme-election.ts`, `OptionsBarriersView.tsx`, `QuoteView.tsx`
**Depende de:** item 09

### Contexto

Não existe — e não deve existir — seleção livre de estratégias pelo usuário: isso reabriria a porta para montar estruturas que o motor bloquearia, sem validação de delta, largura, crédito/largura, drift ou coerência direcional.

O que faz sentido: quando **ambas** as estruturas passam por **todas** as validações, o motor devolve a eleita e a alternativa.

### Correção

```ts
interface ElectedOptionStrategy {
  // ... campos atuais
  alternative?: {
    strategy: ElectedOptionStrategy;   // mesma validação, mesmo assertDirection
    rationale: string;                 // por que não foi a eleita
  };
}
```

Regra de eleição mantida: IV alta ou moderada favorece crédito; IV baixa favorece débito. A alternativa só é oferecida quando passa em **todas** as validações, incluindo `assertDirection`, faixa de delta, largura e — para a estrutura a crédito — IV ATM confiável.

Na UI, dois controles com papel semântico:

```
[ Eleita: Trava de Alta a Crédito ]  [ Alternativa: Trava de Alta a Débito ]
```

Alternar troca o payoff e o bilhete de ordem. Sem alternativa válida, o segundo controle aparece **desabilitado com o motivo em tooltip** — nunca ausente do DOM. Estado desabilitado é informação; elemento ausente é ambiguidade.

### Testes

| ID | Cenário | Esperado |
|----|---------|----------|
| CT-N05 | estrutura com alternativa válida | `options-structure-alternative` habilitado; alternar troca o payoff |
| CT-N06 | sem alternativa válida | controle presente, desabilitado, com motivo acessível |
| CT-N07 | alternativa a débito eleita | passa em `assertDirection` e nas faixas de delta e largura |

---

## Item 11 · N104 — visões do Panorama Geral

**Severidade:** 🟡 média · **Arquivo:** `src/components/tradingview/TradingViewOverview.tsx`

### Contexto

O panorama é hoje um bloco contínuo — termômetro de sentimento, índices, setores — sem separação navegável. Não há entre o que alternar. **Não criar rota dedicada de sentimento:** fragmenta o panorama sem ganho.

### Correção

Organizar o conteúdo **já existente** em três visões:

| Visão | Conteúdo |
|-------|----------|
| Sentimento | Termômetro de Sentimento & Apetite a Risco, os 5 pilares de ponderação e a análise textual |
| Índices | Índices globais e domésticos |
| Setores | Desempenho setorial |

Semântica de abas (`role="tablist"` / `tab` / `tabpanel`, com `aria-selected` e `aria-controls`) e visão ativa refletida na URL (`?view=sentimento`), de modo que cada uma seja endereçável e recarregável.

### Testes

| ID | Cenário | Esperado |
|----|---------|----------|
| CT-N08 | Panorama Geral | três controles `role="tab"` com `aria-selected` correto |
| CT-N09 | `?view=sentimento` | abre direto na visão de sentimento |

---

# 12. Guardrails — o que não pode ser relaxado

Nenhum item deste backlog autoriza mexer nestes pontos. Se algum teste destes quebrar durante a execução, a mudança está errada:

1. `SHORT_LEG_DELTA_MAX: 0.38` nas travas verticais — impede a trava ATM disfarçada de "colchão de segurança".
2. `MAX_CREDIT_TO_WIDTH: 0.45` — crédito acima disso significa perna vendida colada no dinheiro.
3. **Zero fallback de prêmio** — série sem `optionPrice` continua inelegível, sem exceção.
4. **Controle de drift** — prêmio de D-1 com spot mais de 3% distante continua bloqueando.
5. **`assertDirection`** em 100% das estruturas antes de qualquer serialização para a UI.
6. **Motor único** — nenhuma outra função pode montar pernas de estrutura.
7. **Flags eliminatórias do crivo** — a lista fechada continua sendo lucro negativo, margem negativa e DL/EBITDA > 3,5x. Liquidez corrente < 1,0 derruba score, não reprova.
8. **Rastreador com três listas** — sem categoria "bloqueado", sem contador de excluídos, sem score na tela principal.

---

# 13. Critérios de aceite consolidados

**Fase A**

1. `lastTradeDate` presente em 100% dos itens mapeados; ausência do campo torna a série inelegível.
2. Fixture do ITUB4 idêntica ao payload da fonte nos dois lados da cadeia.
3. Estrutura a crédito nunca eleita sem IV ATM confiável.
4. Todo bloqueio exibe `seriesEligible` e `validPairs` reais — nenhum literal.
5. Iron Condor eleito na cadeia real do ITUB4 com DTE na janela e IV moderada.
6. Nenhuma perna vendida de Iron Condor com `|delta| > 0,30`.
7. `EM_ANALISE` tem tratamento próprio na UI.

**Fase B**

8. A estrutura elegível e o payoff aparecem na aba Barreiras de Opções, sem exigir navegação até a consulta individual.
9. A seção de estrutura existe no DOM em todos os estados, com estado explícito e distinguível.
10. A alternativa a débito é oferecida quando válida; o controle permanece visível e desabilitado quando não.
11. O Panorama Geral tem três visões navegáveis, endereçáveis por URL e acessíveis por teclado.
12. Zero `onClick` em elementos não interativos.
13. Todos os `data-testid` presentes e cobertos por teste.

**Ambas**

14. Suíte completa verde, incluindo CT-950 a CT-968 e CT-N01 a CT-N13.
15. Nenhum guardrail da seção 12 quebrado.
16. Nenhum número mágico novo em `src/lib/domain/**` — todo limiar vem de `src/lib/config/rules.ts`.

---

# 14. Decisão pendente — pesos da função de score

**Requer sua definição antes do item 05**, porque o Iron Condor vai herdar a mesma filosofia de ranqueamento.

A perna vendida eleita hoje no ITUB4 tem delta **−0,328**, enquanto o alvo é 0,28 e o teto é 0,38. Havia na cadeia a série de delta −0,295, mais aderente. A escolha vem da função de score, que dá 20% de peso à liquidez — e a série escolhida tem 2,98 milhões de contratos contra 590 mil da alternativa.

| | Pesos atuais | Proposta |
|---|---|---|
| delta da perna vendida | 0,40 | **0,50** |
| delta da perna comprada | 0,15 | 0,15 |
| retorno sobre risco | 0,25 | 0,20 |
| liquidez efetiva | 0,20 | **0,15** |
| POP estimada resultante (ITUB4) | ~67% | ~71% |

**Minha recomendação: adotar a proposta.** A liquidez já foi tratada na porta de entrada, pelo critério de elegibilidade. Usá-la de novo com peso alto no ranking é contagem dupla do mesmo atributo — e ela puxa sistematicamente para os strikes mais próximos do dinheiro, que são justamente os de maior open interest. É a direção errada para uma trava a crédito.

Se preferir manter os pesos atuais, o comportamento é defensável — mas registre como escolha, não como acidente.

---

# 15. Verificação de 1 minuto antes de abrir o primeiro PR

Descartei as hipóteses de infraestrutura pela leitura do código, mas custa um minuto eliminá-las de vez no ambiente publicado:

```
GET  <url-publicada>/api/health
     -> { status: "ONLINE", hasApiKey: true, latencyMs: <n> }

GET  <url-publicada>/api/quote?symbol=PETR4
     -> JSON com indicators, tradePlan, operation, electedOptionStrategy no nível raiz

GET  <url-publicada>/api/options?symbol=PETR4&expiration=2026-09-18
     -> análise com top5CallWalls, top5PutWalls e ivAtm preenchidos
```

Se as três responderem como esperado, a camada de dados está sã e todo o backlog acima se aplica sem ressalva.

---

# 16. Decisões registradas — não são omissões

Para ninguém "corrigir" daqui a três meses achando que foi esquecimento:

| Decisão | Justificativa |
|---------|---------------|
| Sem seletor livre de estruturas | Desfaria o motor único da v2.1; permitiria montar estruturas que o motor bloquearia |
| Sem rota dedicada de sentimento | Fragmenta o panorama sem ganho para o usuário |
| Liquidez corrente < 1,0 não reprova | Setores de capital intensivo operam assim estruturalmente |
| LATERAL + REPROVADO não opera | Venda de volatilidade em empresa frágil tem cauda gorda |
| BAIXA + APROVADO fora do rastreador | Não há operação nova; é gestão de posição, exibida só na consulta individual |
| Lista vazia é resultado válido | Sistema não deve fabricar operação para preencher tela |
| Seleção por delta reduz recomendações | Intencional — melhor nenhuma que estruturalmente ruim |
| Alerta de aluguel sem número | Fonte não publica BTC; estimar seria pior que omitir |
| Dados de derivativos são D-1 | Por isso existe o controle de drift |

---

# 17. Nota de método

Dois defeitos desta rodada — itens 01 e 05 — têm a mesma origem: **a correção foi aplicada onde o defeito foi observado, não onde o padrão existia.**

O item 05 é o algoritmo de seleção por índice sobrevivendo no cenário 3 porque o relato apontava para as travas verticais. O item 01 é um filtro novo passando no teste porque a fixture tinha um campo que o código de produção não preenche.

Duas práticas baratas evitam a repetição:

1. Ao corrigir um padrão, procurar o padrão no projeto inteiro antes de fechar o PR. Um `grep` por `sorted[0]` teria encontrado o Iron Condor.
2. Teste de contrato roda sobre o **payload cru da fonte**, nunca sobre fixture editada. Teria encontrado o `lastTradeDate` ausente.

E uma terceira, para a Fase B: saída de agente de teste automatizado é **relato de sintoma**, não causa-raiz — como um chamado de usuário. Neste caso, três `grep` resolveram o que três hipóteses de infraestrutura não explicavam: `featureFlag` (zero ocorrências), `OptionPayoffChart` em `OptionsBarriersView` (zero ocorrências), `data-testid` (zero ocorrências no projeto).

---

## Anexo — limpeza pendente

`_qa_src.tgz` e `_qa2.tgz` na raiz do projeto são pacotes temporários usados para rodar a suíte em ambiente Linux (o `node_modules` local tem binário Windows do rollup e não executa na VM). O primeiro foi commitado junto do `966d577`. Ambos podem sair do repositório e entrar no `.gitignore`.
