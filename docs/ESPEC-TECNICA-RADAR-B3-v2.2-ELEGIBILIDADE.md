# RADAR B3 PRO IA — Especificação Técnica v2.2

## Correção do filtro de elegibilidade de séries de opções

**Projeto:** TESTE_BRAPI
**Base:** commit `f95cf95` + Espec. v2.1 implementada
**Data:** 31/08/2026
**Destinatário:** desenvolvimento
**Sintoma reportado:** mensagem *"Este ativo não possui opções líquidas suficientes na B3"* em ativos de altíssima liquidez (ITUB4)

---

## 0. Sumário do diagnóstico

O sistema **não** está medindo liquidez. Ele está usando o campo `confidence` do endpoint `/options/analytics` como se fosse um indicador de liquidez, e esse campo não tem relação com liquidez.

Medição feita na cadeia real do ITUB4 (série 2026-09-18, snapshot de 28/08/2026, spot R$ 39,55):

| | Séries | Open Interest somado |
|---|--------|---------------------|
| `confidence: 'high'` | **2** de 18 puts | 1.709.000 contratos |
| `confidence: 'medium'` ou `'low'` | **16** de 18 puts | **17.250.500 contratos** |

A série com **maior** Open Interest de toda a faixa — ITUBU431, strike 39,05, **3.287.900 contratos em aberto** — está classificada como `low`. A série com `confidence: 'high'` e menor OI tem 714.500 contratos. No lado das calls o padrão se repete: 1 série `high` em 8, e a ITUBI422 com **2.426.600 contratos** e movimentação de +27.000 no dia está como `low`.

**Conclusão:** `confidence` qualifica o cálculo analítico (IV e gregas) daquela série, não a negociabilidade dela. Usá-lo como porta de entrada de perna de estrutura elimina a cadeia inteira dos ativos mais líquidos da B3.

Quatro defeitos, em ordem de impacto:

| ID | Defeito | Efeito |
|----|---------|--------|
| **E1** | `confidence === 'high'` usado como filtro de elegibilidade de perna | 16 de 18 séries do ITUB4 descartadas |
| **E2** | Seleção das pernas é independente e só depois valida a largura | as 2 séries sobreviventes são adjacentes → largura 0,63% < mínimo de 1,5% → bloqueio garantido |
| **E3** | Preço mínimo único (R$ 0,10) para perna vendida e perna comprada | asa de proteção barata, que é justamente o que se quer comprar, é descartada |
| **E4** | `electBestOptionStrategy` devolve `null` sem motivo | UI exibe "falta de liquidez" para qualquer causa de bloqueio — diagnóstico errado ao usuário |

---

## 1. Evidência — ITUB4, cadeia de puts 2026-09-18

Spot 39,55 · `underlyingPrice` da fonte 39,19 · 18 séries na faixa 34,21–39,05

| Símbolo | Strike | Preço | Delta | OI | ΔOI no dia | Confidence | Elegível hoje |
|---------|--------|-------|-------|-----|-----------|-----------|---------------|
| ITUBU345 | 34,21 | 0,03 | −0,026 | 2.211.300 | 0 | medium | não (preço, delta) |
| ITUBU348 | 34,46 | 0,05 | −0,039 | 95.700 | 0 | low | não |
| ITUBU353 | 34,96 | 0,06 | −0,048 | 461.100 | −33.300 | low | não |
| ITUBU355 | 35,21 | 0,06 | −0,050 | 299.100 | +5.100 | medium | não |
| ITUBU364 | 35,71 | 0,08 | −0,066 | 395.500 | +19.900 | low | não |
| ITUBU361 | 36,21 | 0,12 | −0,094 | 750.200 | −5.900 | low | **não (só por confidence)** |
| ITUBU368 | 36,46 | 0,14 | −0,109 | 787.600 | −52.600 | low | **não (só por confidence)** |
| ITUBU36 | 36,71 | 0,18 | −0,132 | 362.300 | +600 | low | **não (só por confidence)** |
| ITUBU373 | 36,96 | 0,21 | −0,151 | 660.400 | +19.400 | low | **não (só por confidence)** |
| ITUBU379 | 37,21 | 0,24 | −0,171 | 2.175.700 | +113.300 | low | **não (só por confidence)** |
| ITUBU378 | 37,46 | 0,28 | −0,196 | 2.203.600 | +164.300 | low | **não (só por confidence)** |
| ITUBU38 | 37,71 | 0,35 | −0,229 | 714.500 | +31.700 | **high** | sim |
| ITUBU385 | 37,96 | 0,40 | −0,257 | 994.500 | −3.400 | **high** | sim |
| ITUBU2 | 38,21 | 0,49 | −0,295 | 589.700 | +2.000 | low | **não (só por confidence)** |
| ITUBU388 | 38,46 | 0,56 | −0,328 | 2.977.800 | +31.700 | low | **não (só por confidence)** |
| ITUBU393 | 38,71 | 0,65 | −0,365 | 1.032.800 | +33.400 | low | **não (só por confidence)** |
| ITUBU392 | 38,96 | 0,76 | −0,405 | 1.470.200 | −900 | low | não (delta > 0,38) |
| ITUBU431 | 39,05 | 0,79 | −0,418 | 3.287.900 | −96.700 | low | não (delta > 0,38) |

Todas as 18 séries têm `lastTradeDate = 2026-08-28`, igual à data do snapshot — ou seja, **todas negociaram no último pregão**. Todas têm `nullReason: null`, IV entre 26,6% e 33,0% (dispersão coerente) e delta calculado. Não há nada de errado com esses dados.

### 1.1 Simulação do algoritmo atual vs. sem o filtro de confidence

```
REGRA ATUAL (exige confidence = high): 2 séries elegíveis
  VENDE ITUBU385  K 37,96  δ −0,257  @ 0,40
  COMPRA ITUBU38  K 37,71  δ −0,229  @ 0,35
  largura R$ 0,25 (0,63% do spot)  →  REPROVA (mínimo 1,5%)
  => ESTRUTURA BLOQUEADA  →  usuário vê "falta de liquidez"

SEM o filtro de confidence: 13 séries elegíveis
  VENDE ITUBU2    K 38,21  δ −0,295  @ 0,49
  COMPRA ITUBU368 K 36,46  δ −0,109  @ 0,14
  largura R$ 1,75 (4,42% do spot)          OK
  crédito R$ 0,35 (20,0% da largura)       OK
  => ESTRUTURA ELEITA  ·  POP ≈ 71%  ·  R:R 1 : 4,0
```

A trava existe, é de manual, e está sendo descartada por um filtro que não mede o que se pretendia medir.

---

## 2. Causa-raiz E1 — `confidence` não é medida de liquidez

`confidence` acompanha `nullReason` no payload de analytics e qualifica **a confiabilidade do cálculo de IV e gregas** daquela série — provavelmente ligada à estabilidade da inversão numérica do preço, não ao volume negociado. A documentação da fonte descreve apenas que "campos vêm nulos com `nullReason` quando o cálculo não pode ser produzido a partir do dado observado".

Onde `nullReason` é `null` e todos os campos estão preenchidos, **o dado é utilizável** — independentemente do rótulo de confiança.

### Correção

`confidence` deixa de ser critério de elegibilidade e passa a ser:

1. **Metadado exibido** na perna, na UI (`Confiança do cálculo: alta/média/baixa`).
2. **Critério de desempate** quando duas séries empatam na escolha por delta.
3. **Gate apenas para o cálculo de IV ATM** — e mesmo ali, substituído por mediana com descarte de outlier (ver seção 5).

O critério de elegibilidade passa a usar os campos que **de fato** medem negociabilidade e que já vêm no mesmo payload: `openInterest`, `openInterestChange`, `lastTradeDate` e `optionPrice`.

---

## 3. Causa-raiz E2 — seleção independente das pernas

O algoritmo atual (`cme-election.ts`, cenário 1) escolhe:

1. a perna vendida como a de `|delta|` mais próximo de 0,28 entre as elegíveis;
2. a perna de proteção como a de `|delta|` mais próximo de 0,12 entre as elegíveis abaixo dela;
3. e **só depois** valida largura e crédito/largura.

Quando o conjunto elegível é pequeno, as duas escolhas caem em strikes adjacentes e a validação de largura reprova — mesmo existindo, no conjunto, um par perfeitamente válido. O algoritmo não volta atrás.

### Correção — enumerar pares e ranquear

Substituir a escolha sequencial por busca no espaço de pares:

```
1. Montar o conjunto elegível E.
2. Gerar todos os pares (curta, longa) de E que satisfaçam SIMULTANEAMENTE:
   - lado correto (put/put para bull put; call/call para bear call)
   - strike da curta > strike da longa (bull put)  |  curta < longa (bear call)
   - |delta| da curta <= SHORT_LEG_DELTA_MAX
   - largura dentro de [MIN_WIDTH_PCT, MAX_WIDTH_PCT] do spot
   - crédito/largura dentro de [MIN_CREDIT_TO_WIDTH, MAX_CREDIT_TO_WIDTH]
3. Se o conjunto de pares válidos for vazio -> bloquear com motivo específico.
4. Ranquear os pares válidos por score e eleger o primeiro.
```

**Função de score** (todos os termos normalizados em [0,1], maior é melhor):

| Termo | Peso | Definição |
|-------|------|-----------|
| Aderência de delta da perna vendida | 0,40 | `1 − |‖δ_curta‖ − 0,28| / 0,28` |
| Aderência de delta da perna comprada | 0,15 | `1 − |‖δ_longa‖ − 0,12| / 0,12` |
| Retorno sobre risco | 0,25 | `crédito / (largura − crédito)`, normalizado |
| Liquidez efetiva do par | 0,20 | `min(OI_curta, OI_longa)` normalizado pelo maior OI da cadeia |

Desempate, nesta ordem: maior `confidence` combinado das duas pernas (`high`=2, `medium`=1, `low`=0) → maior OI mínimo → menor largura.

Isso resolve o caso ITUB4 e, mais importante, torna o motor robusto a cadeias com poucos strikes.

---

## 4. Causa-raiz E3 — preço mínimo único para as duas pernas

`MIN_OPTION_PRICE: 0.10` é aplicado às duas pernas. As duas têm naturezas opostas:

- **Perna vendida:** prêmio baixo é ruim — você recebe pouco e o spread relativo de execução é enorme. Piso de R$ 0,10 é adequado, e poderia até ser maior.
- **Perna comprada (asa de proteção):** prêmio baixo é **desejável** — é o custo do seguro. Um piso de R$ 0,10 descarta exatamente as asas mais eficientes.

No ITUB4, a asa natural em delta −0,109 custa R$ 0,14 e passa. Em papéis de preço mais baixo — BBAS3 a R$ 20,86, por exemplo — a asa equivalente custa entre R$ 0,03 e R$ 0,08 e é descartada, matando a estrutura inteira por causa da perna que representa o menor risco da operação.

### Correção

Separar os pisos por papel da perna:

| Parâmetro | Valor | Aplicação |
|-----------|-------|-----------|
| `MIN_PRICE_SHORT_LEG` | 0,10 | perna vendida (recebe prêmio) |
| `MIN_PRICE_LONG_LEG` | 0,03 | perna comprada (paga prêmio) |

E aplicar um piso relativo adicional para a perna vendida em papéis caros: `max(0,10 ; 0,15% do spot)`.

---

## 5. IV ATM — relaxar sem perder o controle de qualidade

A regra atual exige `confidence: 'high'` também para compor a IV ATM. No ITUB4 isso funciona por sorte (as duas séries `high` caem dentro de ±5% do spot), mas na maioria dos ativos vai zerar a IV ATM — e IV ATM nula bloqueia **toda** estrutura de crédito.

### Correção

IV ATM passa a ser a **mediana** das IVs das séries que atendem: dentro de ±5% do spot · `optionPrice ≥ 0,10` · `openInterest ≥ 1.000` · `impliedVolatility` presente · `nullReason === null`.

Controle de qualidade substituto, no lugar do gate de confidence:

1. **Descarte de outlier:** remover da amostra qualquer IV que se afaste mais de 40% da mediana preliminar, e recalcular.
2. **Amostra mínima:** ao menos 3 séries após o descarte; abaixo disso, `ivAtm = null`.
3. **Divergência call/put** no strike mais próximo do spot > 5 pontos percentuais ⟹ IV marcada não confiável (regra já existente, mantida).

No ITUB4 a amostra de IV vai de 0,266 a 0,330 — dispersão normal, incluindo as séries `low`. O dado é bom; o rótulo é que não servia para essa decisão.

---

## 6. Causa-raiz E4 — bloqueio sem motivo

`electBestOptionStrategy` retorna `null` em pelo menos seis pontos distintos, e a UI (`QuoteView.tsx`, linha 896) traduz qualquer `null` como:

> "Este ativo não possui opções líquidas suficientes na B3 no vencimento corrente para montagem automatizada."

No caso do ITUB4 essa frase é factualmente falsa — o ativo tem 17 milhões de contratos em aberto na faixa analisada. O sistema está dando um diagnóstico errado ao usuário, o que é pior do que não dar diagnóstico nenhum.

### Correção

A função nunca retorna `null` por regra de negócio. Retorna sempre um objeto com motivo estruturado:

```ts
export type BlockReason =
  | 'SEM_ANALYTICS'            // fonte não devolveu a cadeia
  | 'SEM_SERIES_ELEGIVEIS'     // cadeia existe, nenhuma série passou nos critérios
  | 'SEM_PAR_VALIDO'           // séries elegíveis existem, nenhum par atende largura/crédito
  | 'DELTA_FORA_DA_FAIXA'      // nenhuma série com |delta| <= 0,38
  | 'VOL_COMPRIMIDA'           // squeeze bloqueia venda de crédito
  | 'DTE_FORA_DA_JANELA'       // fora de 12–35 dias úteis
  | 'PRECO_DEFASADO'           // drift do spot > 3%
  | 'FUNDAMENTOS_REPROVADOS'   // matriz de operação
  | 'IV_INDISPONIVEL';         // sem IV ATM confiável

export interface StructureBlock {
  status: 'BLOQUEADA';
  reason: BlockReason;
  message: string;              // texto exibido ao usuário
  diagnostics: {
    seriesInChain: number;
    seriesEligible: number;
    validPairs: number;
    bestShortDelta: number | null;
    dte: number;
    spotDriftPct: number;
  };
}
```

Mensagens por motivo, exibidas na UI (nenhuma delas menciona liquidez sem que a liquidez seja de fato o problema):

| Motivo | Mensagem |
|--------|----------|
| `SEM_ANALYTICS` | "Não há dados de opções publicados para este ativo neste vencimento." |
| `SEM_SERIES_ELEGIVEIS` | "As séries deste vencimento não atendem aos critérios mínimos de negociação (prêmio, contratos em aberto ou negociação recente)." |
| `SEM_PAR_VALIDO` | "Há séries negociáveis, mas nenhuma combinação atende à largura e ao prêmio mínimos da trava. Grade de strikes muito curta neste vencimento." |
| `DELTA_FORA_DA_FAIXA` | "Nenhuma série com distância segura do preço atual. Montar a trava exigiria vender opção próxima do dinheiro." |
| `VOL_COMPRIMIDA` | "Volatilidade implícita comprimida — venda de prêmio não compensa o risco de rompimento." |
| `DTE_FORA_DA_JANELA` | "Vencimento a {dte} dias úteis, fora da janela de 12 a 35." |
| `PRECO_DEFASADO` | "Preços de referência de {priceDate} estão {drift}% distantes do mercado atual." |
| `IV_INDISPONIVEL` | "Sem volatilidade implícita confiável nas séries próximas ao preço." |

O bloco `diagnostics` deve aparecer na UI em modo compacto (uma linha, fonte pequena): *"18 séries na cadeia · 13 elegíveis · 0 pares válidos"*. É o que permite ao usuário — e a você — distinguir "o mercado não tem" de "o filtro está errado".

---

## 7. Parâmetros — antes e depois

`src/lib/config/rules.ts`

| Parâmetro | Hoje | Proposto | Justificativa |
|-----------|------|----------|---------------|
| `REQUIRED_CONFIDENCE` | `'high'` | **remover** | não mede liquidez; elimina 16 de 18 séries do ITUB4 |
| `MIN_OPTION_PRICE` | 0,10 (ambas as pernas) | `MIN_PRICE_SHORT_LEG: 0.10` · `MIN_PRICE_LONG_LEG: 0.03` | asa de proteção barata é vantagem, não defeito |
| — | — | `MIN_PRICE_SHORT_PCT_OF_SPOT: 0.0015` | piso relativo para papéis caros |
| `MIN_OPEN_INTEREST` | 5.000 (ambas) | `MIN_OI_SHORT_LEG: 5000` · `MIN_OI_LONG_LEG: 1000` | a perna comprada não gera risco de exercício |
| — | — | `REQUIRE_TRADED_ON_SNAPSHOT_DATE: true` | `lastTradeDate === date` do snapshot — **este** é o filtro de liquidez real |
| — | — | `REQUIRE_NULL_REASON: true` | a própria fonte sinaliza cálculo inválido |
| `MIN_ABS_DELTA` / `MAX_ABS_DELTA` | 0,05 / 0,95 | manter | correto |
| `SHORT_LEG_DELTA_TARGET` / `_MAX` | 0,28 / 0,38 | **manter** | é o que impede a trava ATM; não relaxar |
| `MIN_WIDTH_PCT_OF_SPOT` | 0,015 | 0,015, **ou** no mínimo 2 intervalos de strike da grade, o que for menor | evita bloqueio em grade densa |
| `MAX_WIDTH_PCT_OF_SPOT` | 0,06 | 0,08 | dá folga para asa em delta 0,12 em papéis de vol baixa |
| `MIN_CREDIT_TO_WIDTH` | 0,15 | 0,12 | em regime de IV baixa, 15% é inatingível com delta 0,28 |
| `MAX_CREDIT_TO_WIDTH` | 0,45 | manter | é o que denuncia perna vendida ATM |
| ATM: `REQUIRED_CONFIDENCE` | `'high'` | remover; usar mediana com descarte de outlier ±40% e amostra mínima de 3 | mantém qualidade sem zerar a IV |

Nova elegibilidade consolidada:

```ts
function isEligibleLeg(o, role /* 'SHORT' | 'LONG' */, spot, snapshotDate) {
  const minPrice = role === 'SHORT'
    ? Math.max(RULES.MIN_PRICE_SHORT_LEG, spot * RULES.MIN_PRICE_SHORT_PCT_OF_SPOT)
    : RULES.MIN_PRICE_LONG_LEG;
  const minOi = role === 'SHORT' ? RULES.MIN_OI_SHORT_LEG : RULES.MIN_OI_LONG_LEG;

  return o.nullReason === null
    && o.optionPrice !== null && o.optionPrice >= minPrice
    && (o.openInterest || 0) >= minOi
    && o.lastTradeDate === snapshotDate            // negociou no pregão do snapshot
    && o.delta !== null && Math.abs(o.delta) >= RULES.MIN_ABS_DELTA
                        && Math.abs(o.delta) <= RULES.MAX_ABS_DELTA
    && o.impliedVolatility !== null && o.impliedVolatility > 0;
}
```

---

## 8. Efeito esperado

| Métrica | Hoje | Depois |
|---------|------|--------|
| Séries elegíveis no ITUB4 (puts, faixa analisada) | 2 | 13 |
| Pares válidos no ITUB4 | 0 | ≥ 8 |
| Estrutura eleita no ITUB4 | nenhuma | Bull Put 38,21 / 36,46 · crédito 0,35 · largura 1,75 · R:R 1:4,0 · POP ≈ 71% |
| Iron Condor viável em blue chips | praticamente impossível (exigia 4 pernas `high`) | viável |
| Mensagem ao usuário quando não há estrutura | sempre "falta de liquidez" | motivo específico + diagnóstico numérico |

---

## 9. O que **não** deve ser relaxado

A revisão afrouxa a porta de entrada, não os critérios de qualidade da estrutura. Estes permanecem exatamente como estão:

1. `SHORT_LEG_DELTA_MAX: 0.38` — é a regra que impede a trava ATM disfarçada de "colchão de segurança". Se relaxar isso, o defeito da v2.1 volta.
2. `MAX_CREDIT_TO_WIDTH: 0.45` — crédito acima de 45% da largura significa perna vendida colada no dinheiro.
3. **Zero fallback de prêmio** — série sem `optionPrice` continua inelegível, sem exceção.
4. **Controle de drift** — prêmio de D-1 com spot mais de 3% distante continua bloqueando.
5. **`assertDirection`** em 100% das estruturas antes de chegar à UI.
6. **DTE 12–35 dias úteis** para Iron Condor.

O relaxamento proposto é cirúrgico: incide sobre um único campo (`confidence`) que estava sendo usado para uma finalidade que ele não cumpre, e sobre dois pisos que tratavam as duas pernas como se tivessem a mesma natureza.

---

## 10. Testes obrigatórios

Fixture nova: `src/lib/services/__fixtures__/itub4-analytics.json` com as 18 séries de put e as 8 de call da seção 1, exatamente como a fonte devolve.

| ID | Cenário | Esperado |
|----|---------|----------|
| CT-901 | fixture ITUB4, elegibilidade nova | **13 séries elegíveis** de put (hoje 2) |
| CT-902 | fixture ITUB4, veredito COMPRA | estrutura **eleita**, não bloqueada |
| CT-903 | estrutura eleita no ITUB4 | perna vendida com `|delta| ≤ 0,38` |
| CT-904 | estrutura eleita no ITUB4 | largura ≥ 1,5% do spot e crédito/largura em [12%, 45%] |
| CT-905 | série `confidence: 'low'` com OI 2.977.800 e preço 0,56 | **elegível** |
| CT-906 | série com `nullReason` preenchido | inelegível |
| CT-907 | série com `lastTradeDate` anterior ao snapshot | inelegível |
| CT-908 | perna comprada a R$ 0,04 | elegível como LONG, inelegível como SHORT |
| CT-909 | cadeia com 2 séries elegíveis adjacentes | bloqueio com `reason: 'SEM_PAR_VALIDO'`, nunca com mensagem de liquidez |
| CT-910 | cadeia vazia | `reason: 'SEM_ANALYTICS'` |
| CT-911 | todas as séries com `|delta| > 0,38` | `reason: 'DELTA_FORA_DA_FAIXA'` |
| CT-912 | enumeração de pares no ITUB4 | ≥ 8 pares válidos; o eleito é o de maior score |
| CT-913 | dois pares com score idêntico | desempate por confidence combinado, determinístico |
| CT-914 | IV ATM no ITUB4 | mediana calculada, `ivAtm` não nulo |
| CT-915 | amostra de IV com um outlier de 90% | outlier descartado, mediana estável |
| CT-916 | amostra com 2 séries após descarte | `ivAtm = null` |
| CT-917 | `electBestOptionStrategy` em qualquer caminho | nunca retorna `null`; sempre objeto com `status` e `reason` |
| CT-918 | regressão v2.1 | nenhum teste de delta máximo, drift ou assertDirection quebrado |

Atualizar `cme-election.test.ts`: o caso B6/B7 atual afirma que `VBBRU349` (`medium`) é inelegível **por confidence** — a asserção precisa ser reescrita, porque o critério deixa de existir. A série continua inelegível ou não conforme os novos critérios de OI, preço e negociação recente.

---

## 11. Critérios de aceite

1. ITUB4, PETR4, BBAS3, VALE3 e BBDC4 produzem estrutura eleita no vencimento mensal corrente, ou um motivo de bloqueio que **não** seja liquidez.
2. Nenhuma mensagem de "falta de liquidez" é exibida para ativo com mais de 1 milhão de contratos em aberto na faixa analisada.
3. Todo bloqueio exibe motivo específico e o bloco de diagnóstico numérico.
4. `confidence` não aparece em nenhuma condição de filtro — apenas como metadado exibido e como desempate.
5. As seis regras da seção 9 permanecem intactas e com testes verdes.
6. A eleição de estrutura é determinística: mesma cadeia, mesmo par eleito, em execuções repetidas.

---

## 12. Nota de método

Esta correção existe porque um filtro foi escrito a partir do **nome** de um campo, não do **conteúdo** dele. `confidence: 'high'` parecia significar "série confiável para operar"; significa outra coisa.

Recomendação de processo, e é a mesma regra que já está na base de teste do projeto: todo filtro que consome campo de fonte externa precisa de um teste que meça o **percentual de descarte** em um ativo de referência conhecido. Um filtro que rejeita 89% da cadeia do ITUB4 deveria ter falhado no primeiro teste, muito antes de chegar à tela.

Sugestão concreta: adicionar ao CI um teste de sanidade que roda a elegibilidade sobre as fixtures de ITUB4, PETR4 e BBAS3 e falha se a taxa de aproveitamento cair abaixo de 40% da cadeia em qualquer um deles.
