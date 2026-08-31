# RADAR B3 PRO IA — Especificação Técnica v2.3

## Validação da v2.2 e correção dos defeitos remanescentes no motor de opções

**Projeto:** TESTE_BRAPI
**Base validada:** commit `4fda6ce` — "Implementacao da Espec Tecnica v2.2"
**Data:** 31/08/2026
**Método:** suíte do projeto + 18 testes adversariais executados sobre a fixture real do ITUB4

---

## 0. Resultado da validação

**A v2.2 funcionou.** O defeito principal foi resolvido e os guardrails da v2.1 continuam de pé. A suíte do projeto passa: **87 testes, 87 verdes, 12 arquivos**.

| Item da v2.2 | Situação | Evidência medida |
|--------------|----------|------------------|
| E1 — `confidence` deixou de filtrar | ✅ corrigido | ITUB4: **2 → 13** séries elegíveis como perna vendida |
| E2 — busca em espaço de pares (travas verticais) | ✅ corrigido | **43 pares válidos** enumerados e ranqueados |
| E3 — pisos de preço por papel da perna | ✅ corrigido | 15 elegíveis como LONG contra 13 como SHORT |
| E4 — bloqueio com motivo estruturado | ⚠️ parcial | motivos existem, mas o diagnóstico numérico é falso em um dos caminhos (G2) |
| Guardrail delta ≤ 0,38 | ✅ mantido | perna vendida eleita com δ −0,328 |
| `assertDirection` | ✅ ativo | payoff(0,5×) = −0,93 · payoff(1,5×) = +0,32 |
| Bloqueio por drift > 3% | ✅ ativo | drift 4,93% → `PRECO_DEFASADO` |
| Bloqueio por DTE fora de 12–35 | ✅ ativo | DTE 40 → `DTE_FORA_DA_JANELA` |
| Zero fallback de prêmio | ✅ mantido | nenhum preço fabricado nos caminhos testados |
| Determinismo | ✅ verificado | duas execuções, mesmo par eleito |

Estrutura eleita hoje para ITUB4 (spot 39,55, veredito COMPRA):

```
Trava de Alta com Put a Crédito — Bull Put Spread 38,46 / 37,21
  VENDA  ITUBU388  K 38,46  δ −0,328  @ 0,56   (OI 2.977.800)
  COMPRA ITUBU379  K 37,21  δ −0,171  @ 0,24   (OI 2.175.700)
  largura R$ 1,25 (3,16% do spot) · crédito R$ 0,32 (25,6% da largura)
  máx. lucro R$ 0,32 · máx. perda R$ 0,93 · breakeven 38,14 · R:R 1 : 2,9
  diagnóstico: 18 séries na cadeia · 15 elegíveis · 43 pares válidos
```

Comparado ao estado anterior — bloqueio com mensagem falsa de liquidez — isso é o comportamento correto.

**Porém**, os testes adversariais encontraram **seis defeitos remanescentes**, sendo dois deles capazes de reintroduzir exatamente o tipo de erro que a v2.1 e a v2.2 corrigiram.

---

## 1. Defeitos encontrados

| ID | Defeito | Severidade | Onde |
|----|---------|-----------|------|
| **G1** | Iron Condor não recebeu a correção E2 — mantém seleção por índice de array, sem delta, com strikes adjacentes | 🔴 Crítica | `cme-election.ts`, cenário 3 |
| **G2** | Diagnóstico numérico falso no caminho de fall-through (`seriesEligible: 0` fixo) | 🔴 Crítica | `cme-election.ts`, bloco final |
| **G3** | `IV_INDISPONIVEL` nunca é emitido — `ivAtm` não é lido pelo motor | 🔴 Crítica | `cme-election.ts` |
| **G4** | `lastTradeDate` não é mapeado no serviço — o filtro de negociação recente está morto em produção | 🔴 Crítica | `brapi.ts` |
| **G5** | Fixture do ITUB4 tem o lado das calls sintético, não capturado da fonte | 🟠 Alta | `__fixtures__/itub4-analytics.json` |
| **G6** | UI trata apenas `status === 'BLOQUEADA'`; `EM_ANALISE` com pernas cairia no painel de estrutura autorizada | 🟠 Alta | `QuoteView.tsx:896` e `:933` |

---

## 2. G1 — Iron Condor ficou com o algoritmo antigo

### Evidência

Executando o cenário LATERAL + APROVADO + DTE 20 sobre a mesma cadeia que produz 43 pares válidos na trava vertical:

```
status: BLOQUEADA
reason: SEM_PAR_VALIDO
mensagem: "Grade de strikes muito curta neste vencimento."
diagnóstico: 22 séries na cadeia · 0 elegíveis · 0 pares válidos
```

A mensagem e o diagnóstico estão errados. A causa real está no código do cenário 3:

```ts
const sortedPuts  = [...eligiblePuts].sort((a, b) => b.strike - a.strike);
const sortedCalls = [...eligibleCalls].sort((a, b) => a.strike - b.strike);

const shortPut  = sortedPuts[0];    // strike imediatamente abaixo do spot
const longPut   = sortedPuts[1];    // strike adjacente
const shortCall = sortedCalls[0];
const longCall  = sortedCalls[1];
```

É exatamente o padrão de seleção por índice que a v2.2 removeu das travas verticais. Consequências na cadeia do ITUB4:

- perna vendida de put escolhida: strike **39,05**, delta **−0,418** — acima do teto de 0,38 e praticamente no dinheiro;
- largura das asas: 39,05 − 38,96 = **R$ 0,09** = **0,23% do spot**, muito abaixo do mínimo de 1,5%;
- a estrutura é rejeitada na validação seguinte, e o usuário recebe "grade de strikes muito curta" em um ativo cuja grade tem 18 strikes de put.

Em papéis de grade densa — ITUB4, BBDC4, BBAS3, todos com espaçamento de R$ 0,25 — **o Iron Condor nunca será montado**. É a mesma falha da v2.1, sobrevivendo em um caminho que a v2.2 não visitou.

### Correção

Aplicar ao cenário 3 a mesma busca em espaço de pares, com dois pares independentes:

```
1. Conjunto elegível de puts com strike < spot e calls com strike > spot.
2. Enumerar pares de put (curta, longa) e pares de call (curta, longa) que satisfaçam:
   - |delta| da curta <= SHORT_LEG_DELTA_MAX (0,38)
   - largura de cada asa dentro de [MIN_WIDTH_PCT, MAX_WIDTH_PCT] do spot
   - crédito de cada asa > 0
3. Produto cartesiano dos pares válidos, filtrando o condor completo por:
   - crédito total / maior largura dentro de [MIN_CREDIT_TO_WIDTH, MAX_CREDIT_TO_WIDTH]
   - assimetria máxima entre as duas asas: |largura_put − largura_call| <= 50% da maior
4. Score do condor:
   0,35 × aderência de delta das duas pernas vendidas ao alvo 0,20
 + 0,25 × crédito total / maior largura
 + 0,20 × simetria das asas
 + 0,20 × liquidez efetiva (menor OI entre as quatro pernas)
5. Sem par válido em qualquer um dos lados -> bloqueio com motivo específico,
   distinguindo "sem par de put" de "sem par de call".
```

Alvo de delta da perna vendida no Iron Condor: **0,20**, não 0,28 — a estrutura tem duas pernas vendidas e o risco combinado exige mais distância do dinheiro que uma trava direcional.

Novo parâmetro em `rules.ts`:

```ts
IRON_CONDOR: {
  MIN_DTE: 12,
  MAX_DTE: 35,
  SHORT_LEG_DELTA_TARGET: 0.20,
  SHORT_LEG_DELTA_MAX: 0.30,
  MAX_WING_ASYMMETRY: 0.50,
}
```

---

## 3. G2 — diagnóstico numérico falso

O bloco de fall-through final devolve o diagnóstico com valores fixos:

```ts
return createBlockedStrategy(symbol, spot, expDate, dte, bias, 'SEM_PAR_VALIDO', {
  seriesInChain: analyticsList.length,
  seriesEligible: 0,      // ← literal, não calculado
  validPairs: 0,
  ...
});
```

O usuário lê "22 séries na cadeia · 0 elegíveis" quando havia 15 séries elegíveis. O bloco de diagnóstico existe justamente para permitir distinguir "o mercado não tem" de "o filtro está errado" — com número fabricado, ele faz o oposto.

### Correção

`seriesEligible` e `validPairs` passam a ser calculados e propagados por todos os caminhos de bloqueio. Além disso:

- quando `seriesEligible === 0` ⟹ motivo `SEM_SERIES_ELEGIVEIS`;
- quando `seriesEligible >= 2` e `validPairs === 0` ⟹ motivo `SEM_PAR_VALIDO`;
- a mensagem de `SEM_PAR_VALIDO` deve informar **qual restrição** eliminou os pares (largura, crédito/largura ou delta), com o valor do melhor par rejeitado:

> "15 séries negociáveis, 0 pares válidos. Melhor combinação encontrada: largura de 0,23% do spot, abaixo do mínimo de 1,5%."

**Invariante de teste:** nenhum caminho de bloqueio pode devolver `seriesEligible` diferente do valor efetivamente calculado para aquela cadeia.

---

## 4. G3 — a IV nunca entra na decisão

`ivAtm` não é lido em nenhum ponto de `cme-election.ts`. O motivo `IV_INDISPONIVEL` está declarado em `BLOCK_MESSAGES` mas nunca é emitido.

Teste executado: `optionAnalysis.ivAtm = null`, todo o resto igual.

```
resultado: status AUTORIZADA · reason: undefined
```

Uma trava a crédito foi eleita sem nenhuma confirmação de regime de volatilidade. Isso contraria a RN-522 da base de teste e a regra 4 da árvore de decisão original: venda de prêmio em volatilidade comprimida é proibida.

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

Estruturas **a débito** (Bull Call, Bear Put) podem seguir sem IV ATM, porque não vendem volatilidade — mas o card deve exibir "regime de volatilidade não confirmado".

---

## 5. G4 — filtro de negociação recente morto em produção

O mapeamento de `/options/analytics` em `brapi.ts` não copia `lastTradeDate`:

```ts
return {
  symbol: item.symbol, side: item.side, strike: Number(item.strike),
  ...
  openInterest: item.openInterest ? Number(item.openInterest) : undefined,
  openInterestDate: item.openInterestDate,
  // lastTradeDate ausente
};
```

E `isEligibleLeg` só aplica o filtro quando o campo existe:

```ts
if (rules.REQUIRE_TRADED_ON_SNAPSHOT_DATE && snapshotDate && o.lastTradeDate) { ... }
```

Resultado medido: uma série sem `lastTradeDate` é considerada elegível; a mesma série com `lastTradeDate` antigo é corretamente rejeitada. Como o mapper nunca preenche o campo, **em produção a segunda situação nunca ocorre** — o filtro que substituiu o `confidence` como medida de liquidez real não está rodando.

Os testes passam porque a fixture tem o campo. É o cenário clássico de divergência entre massa de teste e produção.

### Correção

1. Adicionar `lastTradeDate: item.lastTradeDate` e `firstTradeDate: item.firstTradeDate` ao mapper.
2. Trocar o guard permissivo por falha explícita: quando `REQUIRE_TRADED_ON_SNAPSHOT_DATE` é `true` e a série **não tem** `lastTradeDate`, a série é **inelegível** — ausência de dado não pode virar aprovação silenciosa.
3. Teste de contrato: parsear a fixture bruta da BRAPI (payload cru, não a fixture editada) e afirmar que `lastTradeDate` está presente em 100% dos itens mapeados.

Aproveitar o mesmo mapper para corrigir dois outros pontos:

- `confidence: item.confidence || 'high'` — o default silencioso deve ser `undefined`, não `'high'`. O campo não filtra mais nada, mas um default inventado polui o desempate.
- Conversão de IV `ivRaw <= 1.0 ? ivRaw * 100 : ivRaw` — a fonte entrega decimal de forma consistente. Trocar a heurística por conversão incondicional (`ivRaw * 100`) e validar a faixa resultante (1% a 400%), registrando fora-de-faixa como `null`.

---

## 6. G5 — fixture com dados inventados no lado das calls

As calls da fixture `itub4-analytics.json` são:

```
strike 40,00 · 41,00 · 42,00 · 42,25
```

A cadeia real do ITUB4 no mesmo vencimento é:

```
strike 40,05 · 40,30 · 40,55 · 40,80 · 41,05 · 41,30 · 41,55 · 41,80
```

Strikes redondos não existem nessa série — a grade do ITUB4 é ajustada por proventos e cai em centavos quebrados. Os símbolos também são inventados (`ITUBI400`, `ITUBI410`, `ITUBI420` contra os reais `ITUBI407`, `ITUBI409`, `ITUBI412`…).

Consequência prática: os cenários **BAIXA** (Bear Call) e **LATERAL** (Iron Condor) — os dois que dependem do lado das calls — estão sendo testados contra dados que não representam o mercado. O Bear Call que a suíte aprova hoje usa strikes 41,00/42,25 com largura R$ 1,25; na grade real o espaçamento é R$ 0,25 e o comportamento do algoritmo é diferente.

### Correção

Substituir o lado das calls pela captura real (8 séries, 40,05 a 41,80, com delta, preço, OI, IV e confidence da fonte) e adicionar a regra de processo:

> Fixture de dado externo é **captura**, nunca redação. Nenhum campo pode ser digitado à mão; o arquivo é o payload da fonte, no máximo com truncamento de séries.

---

## 7. G6 — a UI não cobre `EM_ANALISE`

`QuoteView.tsx`:

```tsx
// linha 896 — painel de bloqueio
{!isBlocked && execMode === 'OPTIONS' && (!elected || elected.status === 'BLOQUEADA' || elected.legs.length === 0) && (...)}

// linha 933 — painel de estrutura
{!isBlocked && execMode === 'OPTIONS' && elected && elected.status !== 'BLOQUEADA' && elected.legs.length > 0 && (...)}
```

O bloqueio por drift devolve `status: 'EM_ANALISE'`. Hoje ele cai no painel correto apenas porque vem sem pernas. Se qualquer caminho futuro devolver `EM_ANALISE` **com** pernas — por exemplo uma estrutura montada mas com advertência de defasagem —, ela será renderizada como autorizada, sem o aviso.

### Correção

Tornar a regra explícita, com uma única fonte de verdade:

```ts
const isActionable = elected?.status === 'AUTORIZADA' && elected.legs.length > 0;
```

`EM_ANALISE` passa a ter painel próprio: exibe a estrutura **com** tarja de advertência e sem o bloco de envio de ordem.

---

## 8. Observação de calibragem (não é defeito)

A perna vendida eleita no ITUB4 tem delta **−0,328**, enquanto o alvo é 0,28 e o teto é 0,38. Havia na cadeia a série de delta −0,295, mais aderente ao alvo. A escolha do algoritmo é consequência da função de score, que dá 20% de peso à liquidez e 25% ao retorno sobre risco — e a série escolhida tem 2,98 milhões de contratos contra 590 mil da alternativa.

Não é bug: é a especificação funcionando. Mas o efeito prático é uma trava mais próxima do dinheiro, com probabilidade de acerto estimada em ~67% em vez de ~71%.

Minha recomendação é reequilibrar os pesos para **0,50 delta da curta · 0,15 delta da longa · 0,20 retorno · 0,15 liquidez**. Justificativa: a liquidez já foi tratada na porta de entrada, pelo critério de elegibilidade — usá-la de novo com peso alto no ranking faz o motor preferir sistematicamente os strikes mais próximos do dinheiro, que são os de maior OI. É contagem dupla do mesmo atributo, e ela puxa na direção errada.

Decisão sua. Se preferir manter os pesos atuais, o comportamento é defensável — mas registre isso como escolha, não como acidente.

---

## 9. Testes obrigatórios desta rodada

| ID | Cenário | Esperado |
|----|---------|----------|
| CT-950 | Iron Condor, cadeia ITUB4 real, DTE 20, IV moderada | estrutura **eleita**, quatro pernas |
| CT-951 | Iron Condor eleito | ambas as pernas vendidas com `|delta| ≤ 0,30` |
| CT-952 | Iron Condor eleito | largura de cada asa ≥ 1,5% do spot |
| CT-953 | Iron Condor eleito | assimetria entre asas ≤ 50% da maior |
| CT-954 | Iron Condor eleito | `payoff(spot) > payoff(0,5×spot)` e `> payoff(1,5×spot)` |
| CT-955 | qualquer bloqueio | `seriesEligible` do diagnóstico igual ao valor calculado |
| CT-956 | cadeia com 15 elegíveis e 0 pares | motivo `SEM_PAR_VALIDO` e mensagem citando a restrição que eliminou os pares |
| CT-957 | cadeia com 0 elegíveis | motivo `SEM_SERIES_ELEGIVEIS` |
| CT-958 | `ivAtm = null`, estrutura a crédito | bloqueio `IV_INDISPONIVEL` |
| CT-959 | IV = 14%, LATERAL | bloqueio `VOL_COMPRIMIDA` |
| CT-960 | `ivAtm = null`, estrutura a débito | eleita, com aviso de regime não confirmado |
| CT-961 | mapper de `/options/analytics` sobre payload cru | `lastTradeDate` presente em 100% dos itens |
| CT-962 | série sem `lastTradeDate` | **inelegível** |
| CT-963 | `confidence` ausente no payload | mapeado como `undefined`, não `'high'` |
| CT-964 | IV de 0,2835 no payload cru | 28,35 no objeto mapeado |
| CT-965 | IV de 5,0 no payload cru (fora de faixa) | `null`, com registro |
| CT-966 | fixture ITUB4 | todos os strikes de call conferem com a cadeia real |
| CT-967 | render com `status: 'EM_ANALISE'` e pernas | painel de advertência, sem bloco de ordem |
| CT-968 | sanidade de CI | aproveitamento da cadeia ≥ 40% em ITUB4, PETR4 e BBAS3 |

---

## 10. Critérios de aceite

1. Iron Condor é eleito na cadeia real do ITUB4 com DTE dentro da janela e IV moderada.
2. Nenhuma perna vendida de Iron Condor com `|delta| > 0,30`.
3. Todo bloqueio exibe `seriesEligible` e `validPairs` reais; nenhum literal no diagnóstico.
4. Estrutura a crédito nunca é eleita sem IV ATM confiável.
5. `lastTradeDate` presente em 100% dos itens mapeados, e ausência do campo torna a série inelegível.
6. Fixture do ITUB4 idêntica ao payload da fonte nos dois lados da cadeia.
7. `EM_ANALISE` tem tratamento próprio na UI.
8. Suíte completa verde, incluindo CT-950 a CT-968.

---

## 11. Ordem de execução

```
G4 (mapper)  ──→  G5 (fixture real)  ──→  G1 (Iron Condor)  ──→  CT-950..954
     │                                          │
     └──→ G3 (gate de IV) ──→ CT-958..960       └──→ G2 (diagnóstico) ──→ CT-955..957
                                                              │
                                                              └──→ G6 (UI)
```

**G4 e G5 primeiro, e nesta ordem.** Corrigir o Iron Condor testando contra uma fixture com calls inventadas é reproduzir o mesmo erro em outro lugar: a suíte vai ficar verde sobre dados que não existem no mercado. Capturar a cadeia real antes de mexer no algoritmo é o que dá sentido aos testes CT-950 a CT-954.

---

## 12. Nota de método

Dois dos seis defeitos desta rodada — G1 e G4 — têm a mesma origem: **a correção foi aplicada onde o defeito foi observado, não onde o padrão existia.**

G1 é o algoritmo de seleção por índice sobrevivendo no cenário 3 porque o relato apontava para as travas verticais. G4 é o filtro novo passando no teste porque a fixture tinha um campo que o código de produção não preenche.

Sugestão para as próximas correções, e ela é barata: ao corrigir um padrão, buscar o padrão no projeto inteiro antes de fechar o PR. Um `grep` por `sorted[0]` e `[1]` teria encontrado o Iron Condor; um teste de contrato sobre o payload cru — e não sobre a fixture editada — teria encontrado o `lastTradeDate`.

---

## Anexo — limpeza pendente no repositório

Os arquivos `_qa_src.tgz` e `_qa2.tgz` na raiz do projeto são pacotes temporários que usei para rodar a suíte em ambiente Linux (o `node_modules` local tem binário Windows do rollup e não executa na VM). O primeiro foi commitado junto do commit `966d577`. Ambos podem ser removidos do repositório e adicionados ao `.gitignore`.
