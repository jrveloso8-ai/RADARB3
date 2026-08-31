# RADAR B3 PRO IA — Especificação de Requisitos Testáveis

**Documento base para geração de testes automatizados e manuais**

| Campo | Valor |
|-------|-------|
| Projeto | TESTE_BRAPI — Radar B3 Pro IA |
| Stack | Next.js 14 (App Router) · TypeScript · Vitest |
| Base de código | commit `f95cf95` + Espec. Técnica v2.1 |
| Versão do documento | 1.0 — 31/08/2026 |
| Escopo | Camada de domínio, rotas de API, contratos de dado externo, componentes de UI e fluxos ponta a ponta |

---

## 1. Objetivo e forma de uso

Este documento é a **base de teste** do sistema: cada regra abaixo está escrita de forma verificável, com entrada, saída esperada e valor de referência. Serve para três consumos:

1. **Geração de testes automatizados** — cada `RN-xxx` vira um ou mais `it()` em Vitest; os casos derivados já estão tabulados.
2. **Roteiro de teste exploratório** — a seção 12 lista o que não se automatiza.
3. **Critério de aceite de PR** — a seção 13 define quando uma entrega pode subir.

Regra de ouro para quem gera os testes: **nenhum teste deve ser escrito a partir da leitura do código**. Se o código diverge deste documento, o teste segue o documento e o código é corrigido — exceto onde a seção 14 registrar a divergência como decisão consciente.

---

## 2. Convenções

### 2.1 Identificadores

| Prefixo | Significado |
|---------|-------------|
| `RN-` | Regra de negócio verificável |
| `RC-` | Requisito de contrato (API interna ou fonte externa) |
| `RU-` | Requisito de interface |
| `RE-` | Requisito de fluxo ponta a ponta |
| `INV-` | Invariante — propriedade sempre verdadeira, candidata a teste baseado em propriedade |

### 2.2 Níveis de teste

| Nível | Alvo | Ferramenta | Onde vive |
|-------|------|-----------|-----------|
| **U** Unitário | funções puras de `src/lib/domain/**` | Vitest | `*.test.ts` ao lado do módulo |
| **C** Contrato | shape das respostas de API e do payload da BRAPI | Vitest + fixtures | `src/lib/services/*.test.ts`, `src/app/api/**/*.test.ts` |
| **I** Integração | rota completa com fonte mockada | Vitest | `src/app/api/**/*.test.ts` |
| **R** Render | componentes React com props controladas | Vitest + Testing Library | `src/components/**/*.test.tsx` |
| **E** Ponta a ponta | navegação real no browser | Playwright | `e2e/*.spec.ts` |

### 2.3 Prioridade por risco

Define profundidade obrigatória de teste. Segue a classificação de risco do projeto:

| Classe | Definição | Exigência mínima |
|--------|-----------|-----------------|
| **P0 — risco de decisão financeira** | cálculo ou regra que gera recomendação de operar | unitário com valor de referência conhecido + valor-limite + teste de regressão a cada mudança |
| **P1 — risco de dado externo** | tudo que consome BRAPI | teste de contrato com fixture real + teste de campo ausente/corrompido |
| **P2 — risco de contrato interno** | shape trocado entre API e UI | teste de snapshot de shape |
| **P3 — risco de apresentação** | formatação, cor, texto | render pontual; validação manual aceitável |

Módulos e suas classes: `fundamentals` P0 · `trends` P0 · `operation-matrix` P0 · `trade-plan` P0 · `cme-election` P0 · `options-barriers` P0/P1 · `volatility` P0 · `black-scholes` P0 · `brapi` P1 · rotas de API P1/P2 · `QuoteView`/`ScreenerView` P2/P3.

---

## 3. Mapa de módulos e fronteiras

```
BRAPI (externo)
  └─ services/brapi.ts ──────────────── RC-1xx (contrato externo)
        │
        ├─ domain/fundamentals.ts ───── RN-1xx  Camada 1
        ├─ domain/trends.ts ─────────── RN-2xx  Camada 2
        ├─ domain/indicators.ts ─────── RN-2xx
        ├─ domain/options-barriers.ts ─ RN-3xx  Camada 3
        ├─ domain/black-scholes.ts ──── RN-3xx
        ├─ domain/volatility.ts ─────── RN-3xx
        ├─ domain/b3-calendar.ts ────── RN-3xx
        ├─ domain/operation-matrix.ts ─ RN-4xx  Decisão
        ├─ domain/trade-plan.ts ─────── RN-5xx  Plano de trade
        └─ domain/cme-election.ts ───── RN-6xx  Estrutura de opções
              │
        app/api/{quote,trends,options}/route.ts ── RC-2xx (contrato interno)
              │
        components/{quote,screener,options}/** ─── RU-xxx
```

**Fronteira de pureza:** todo módulo em `domain/` deve ser função pura — mesma entrada, mesma saída, sem `fetch`, sem `Date.now()` afetando resultado, sem leitura de ambiente. Testes unitários não podem precisar de mock de rede. Onde hoje houver `new Date()` dentro de `domain/`, a data deve ser injetada por parâmetro (ver `RN-390`).

---

## 4. Massa de dados obrigatória

Fixtures reais, capturadas da BRAPI em 28–31/08/2026. Devem viver em `src/lib/services/__fixtures__/` e ser a **única** fonte de dados dos testes de P0 e P1. Nenhum teste de regra de negócio pode usar número inventado quando existe fixture.

### 4.1 `petr4-fundamentals.json` — empresa aprovada com liquidez corrente < 1

```json
{
  "netIncome": 133376000000, "returnOnEquity": 0.2781079, "netMargin": 0.2438609,
  "totalDebt": 676283000000, "totalCash": 53764000000, "ebitda": 273323000000,
  "currentRatio": 0.8544373, "priceEarnings": 4.662618, "priceToBook": 1.1670742
}
```
Derivado esperado: `debtToEbitda = 2.28`.

### 4.2 `mglu3-fundamentals.json` — empresa reprovada por score

```json
{
  "returnOnEquity": 0.007926154, "netMargin": 0.0023118942,
  "totalDebt": 10570417000, "totalCash": 1762218000, "ebitda": 3115884000,
  "currentRatio": 1.0990175
}
```
Derivado esperado: `debtToEbitda = 2.83`.

### 4.3 `vbbr3-analytics.json` — cadeia de puts, série 2026-09-18, snapshot de 28/08/2026

`underlyingPrice` da fonte: **33,38** · spot de 31/08: **34,27** · drift **+2,67%**

| symbol | strike | optionPrice | delta | IV | openInterest | confidence |
|--------|--------|-------------|-------|-----|--------------|-----------|
| VBBRU332 | 32,58 | 0,50 | −0,313 | 0,2980 | 35.400 | medium |
| VBBRU334 | 32,83 | 0,58 | −0,351 | 0,2950 | 63.900 | medium |
| VBBRU337 | 33,08 | 0,67 | −0,390 | 0,2922 | 19.300 | medium |
| VBBRU339 | 33,33 | 0,75 | −0,431 | 0,2831 | 53.700 | **high** |
| VBBRU344 | 33,83 | 1,00 | −0,518 | 0,2835 | 97.500 | **high** |
| VBBRU349 | 34,33 | 1,27 | −0,606 | 0,2767 | 128.300 | medium |
| VBBRU354 | 34,83 | 1,88 | −0,634 | 0,3710 | 67.600 | **high** |

### 4.4 `petr4-positions.json` — posições em aberto, série 2026-09-18

Payload do endpoint `/options/positions`. **Não contém** `optionPrice` nem `impliedVolatility` — essa ausência é parte do contrato e deve constar da fixture exatamente como a fonte devolve.

### 4.5 Séries sintéticas de preço

| Fixture | Conteúdo | Uso |
|---------|----------|-----|
| `serie-alta.json` | 260 fechamentos com Preço > MM20 > MM50 > MM200 | RN-201 |
| `serie-baixa.json` | 260 fechamentos com Preço < MM20 < MM50 < MM200 | RN-202 |
| `serie-lateral.json` | 260 fechamentos com médias cruzadas | RN-203 |
| `serie-curta-120.json` | 120 fechamentos (sem MM200) | RN-204 |
| `serie-curta-40.json` | 40 fechamentos | RN-205 |
| `serie-topo-historico.json` | série em máxima histórica, sem resistência acima | RN-503 |

---

## 5. Camada 1 — Crivo Fundamentalista

Módulo: `src/lib/domain/fundamentals.ts` · função `analyzeFundamentals(symbol, raw)` · **P0**

### 5.1 Pontuação

**RN-101** — O score é a soma de sete métricas independentes, com máximo de 100 pontos:

| Métrica | Faixa BOM | Pontos | Faixa NEUTRA | Pontos | Fora | Pontos |
|---------|-----------|--------|--------------|--------|------|--------|
| Lucro Líquido 12M | > 0 | 5 | — | — | ≤ 0 | 0 |
| ROE | ≥ 10% | 15 | 5% a 10% | 7 | < 5% | 0 |
| Margem Líquida | ≥ 8% | 15 | > 0% e < 8% | 7 | ≤ 0% | 0 |
| Dív. Líq./EBITDA | ≤ 2,5x | 20 | > 2,5x e ≤ 3,0x | 10 | > 3,0x | 0 |
| Liquidez Corrente | ≥ 1,2x | 15 | ≥ 1,0x e < 1,2x | 7 | < 1,0x | 0 |
| P/L | 3x a 25x | 15 | — | — | fora | 0 |
| P/VP | 0,5x a 4,0x | 15 | — | — | fora | 0 |

**RN-102** — Métrica sem dado disponível recebe **0 pontos** e não gera flag. O sistema nunca pontua por omissão.

**RN-103** — `debtToEbitda` é **calculado**, nunca lido da fonte: `(totalDebt − totalCash) / ebitda`, arredondado a 2 casas. Se qualquer um dos três for nulo, o resultado é `null`.

**RN-104** — Se `ebitda ≤ 0`, `debtToEbitda` é `null` e a flag `SUPERENDIVIDAMENTO` é levantada. Nunca dividir por EBITDA negativo.

**RN-105** — Percentuais aceitos em decimal ou em pontos percentuais são normalizados para pontos percentuais (0,2781 → 27,81).

### 5.2 Aprovação

**RN-110** — Fórmula de aprovação, todas as condições simultâneas:

```
APROVADO ⟺ score ≥ 45
            E eliminatoryFlags.length === 0
            E hasProfitabilityData   (ROE ou Margem ou Lucro Líquido presente)
            E hasSolvencyData        (DL/EBITDA ou Liquidez Corrente presente)
```

**RN-111** — Lista **fechada** de flags eliminatórias. Nenhuma outra condição reprova por si só:

| Flag | Dispara quando |
|------|----------------|
| `LUCRO_NEGATIVO` | Lucro Líquido 12M ≤ 0 |
| `MARGEM_NEGATIVA` | Margem Líquida ≤ 0% |
| `SUPERENDIVIDAMENTO` | DL/EBITDA > 3,5x **ou** EBITDA ≤ 0 |

**RN-112** — ROE abaixo de 5%, Liquidez Corrente abaixo de 1,0x, P/L ou P/VP fora da faixa **reduzem o score mas não reprovam**.

### 5.3 Casos de teste derivados

| ID | Entrada | Score esperado | Status esperado | Técnica |
|----|---------|----------------|-----------------|---------|
| CT-101 | fixture PETR4 | **85** | APROVADO | valor de referência |
| CT-102 | fixture MGLU3 | 24 (sem P/L e P/VP) | REPROVADO | valor de referência |
| CT-103 | PETR4 com `netIncome = -1` | 80 | REPROVADO · `LUCRO_NEGATIVO` | partição |
| CT-104 | PETR4 com `netMargin = -0.05` | 70 | REPROVADO · `MARGEM_NEGATIVA` | partição |
| CT-105 | PETR4 com `ebitda` tal que DL/EBITDA = 3,6 | 65 | REPROVADO · `SUPERENDIVIDAMENTO` | partição |
| CT-106 | PETR4 com `ebitda = -100` | — | REPROVADO · `SUPERENDIVIDAMENTO`, `debtToEbitda = null` | borda |
| CT-107 | só `priceEarnings: 10` e `priceToBook: 1` | 30 | REPROVADO (sem rentabilidade nem solvência) | anti-value-trap |
| CT-108 | `{}` | 0 | REPROVADO | borda |
| CT-109 | PETR4 com `currentRatio = 0.99` | 85 | **APROVADO** (não eliminatório) | partição |
| CT-110 | conjunto que soma exatamente 44 | 44 | REPROVADO | valor-limite |
| CT-111 | conjunto que soma exatamente 45 | 45 | APROVADO | valor-limite |
| CT-112 | conjunto que soma exatamente 46 | 46 | APROVADO | valor-limite |
| CT-113 | ROE = 4,99 / 5,00 / 9,99 / 10,00 | 0 / 7 / 7 / 15 | — | valor-limite |
| CT-114 | DL/EBITDA = 2,50 / 2,51 / 3,00 / 3,01 / 3,50 / 3,51 | 20 / 10 / 10 / 0 / 0 / 0 + flag | — | valor-limite |
| CT-115 | Liquidez = 0,99 / 1,00 / 1,19 / 1,20 | 0 / 7 / 7 / 15 | — | valor-limite |
| CT-116 | P/L = 2,99 / 3,00 / 25,00 / 25,01 | 0 / 15 / 15 / 0 | — | valor-limite |
| CT-117 | P/VP = 0,49 / 0,50 / 4,00 / 4,01 | 0 / 15 / 15 / 0 | — | valor-limite |
| CT-118 | ROE = 0,2781 e ROE = 27,81 | mesmo resultado | — | normalização |

---

## 6. Camada 2 — Classificação de tendência

Módulos: `trends.ts`, `indicators.ts` · **P0**

**RN-201** — `ALTA` ⟺ `preço > MM20 > MM50 > MM200`, alinhamento estrito.
**RN-202** — `BAIXA` ⟺ `preço < MM20 < MM50 < MM200`, alinhamento estrito.
**RN-203** — Qualquer outra combinação ⟹ `LATERAL`. Não existe quarto estado.
**RN-204** — Sem MM200 (menos de 200 fechamentos), o critério usa apenas MM20 e MM50, com a mesma regra de empilhamento.
**RN-205** — Com menos de 50 fechamentos, o resultado é `LATERAL`.
**RN-206** — RSI(14) e MACD **não** participam da classificação. Alterar RSI ou MACD não pode alterar `trend`.
**RN-207** — RSI saudável é a faixa fechada [40, 65]; sobrecompra > 70; sobrevenda < 30.
**RN-208** — MM é média aritmética simples do fechamento, com 2 casas decimais.

| ID | Entrada | Esperado | Técnica |
|----|---------|----------|---------|
| CT-201 | `serie-alta` | ALTA | caminho feliz |
| CT-202 | `serie-baixa` | BAIXA | caminho feliz |
| CT-203 | `serie-lateral` | LATERAL | caminho feliz |
| CT-204 | preço = MM20 exatamente | LATERAL (comparação estrita) | valor-limite |
| CT-205 | MM20 = MM50 exatamente | LATERAL | valor-limite |
| CT-206 | `serie-alta` com MM50 > MM200 invertido | LATERAL | tabela de decisão |
| CT-207 | `serie-curta-120` empilhada para cima | ALTA | RN-204 |
| CT-208 | `serie-curta-40` | LATERAL | RN-205 |
| CT-209 | `serie-alta` com RSI forçado a 85 | ALTA (inalterado) | RN-206 |
| CT-210 | `serie-alta` com MACD negativo | ALTA (inalterado) | RN-206 |
| CT-211 | RSI = 39,9 / 40 / 65 / 65,1 | fora / dentro / dentro / fora | valor-limite |
| CT-212 | histórico vazio | LATERAL, sem exceção | borda |

---

## 7. Matriz de decisão operacional

Módulo: `operation-matrix.ts` · função `resolveOperation(trend, fundamentalStatus)` · **P0**

**RN-301** — A matriz é uma tabela verdade de 6 combinações, exaustiva e sem estado implícito:

| ID | trend | fundamentalStatus | operation | listedInTracker |
|----|-------|-------------------|-----------|-----------------|
| CT-301 | ALTA | APROVADO | `COMPRA` | `true` |
| CT-302 | ALTA | REPROVADO | `SEM_OPERACAO` | `false` |
| CT-303 | LATERAL | APROVADO | `IRON_CONDOR` | `true` |
| CT-304 | LATERAL | REPROVADO | `SEM_OPERACAO` | `false` |
| CT-305 | BAIXA | REPROVADO | `VENDA` | `true` |
| CT-306 | BAIXA | APROVADO | `SAIDA_STOP` | `false` |

**RN-302** — O filtro fundamentalista tem **polaridade invertida** na direção BAIXA: ALTA e LATERAL exigem `APROVADO`; BAIXA exige `REPROVADO`.

**RN-303** — `listedInTracker` é `true` apenas para `COMPRA`, `VENDA` e `IRON_CONDOR`.

**RN-304** — Toda decisão carrega `reason` não vazia.

**CT-307** — Teste combinatório: iterar as 3×2 combinações e verificar que nenhuma retorna a decisão de fallback genérica.

---

## 8. Plano de trade

Módulo: `trade-plan.ts` · função `buildTradePlan(spot, trend, highs, lows, closes)` · **P0**

**RN-401** — Os alvos vêm de **níveis estruturais de preço** (pivôs de máxima e mínima), nunca de múltiplos do risco.

**RN-402** — Regra para `ALTA`: entrada = spot · alvo 1 = primeira resistência acima de `spot × 1,005` · alvo 2 = segunda resistência · stop = suporte imediato − 0,5 × ATR(14).

**RN-403** — Regra para `BAIXA`: espelhada — alvo 1 = primeiro suporte abaixo de `spot × 0,995` · stop = resistência imediata + 0,5 × ATR(14).

**RN-404** — `riskRewardRatio` é **medido**: `(alvo1 − entrada) / (entrada − stop)` em alta, invertido em baixa. Nunca constante.

**RN-405** — `isViable = riskRewardRatio ≥ 1,5 E stop do lado correto do spot E alvo1 do lado correto do spot`.

**RN-406** — Sem nível estrutural válido (topo ou fundo histórico), `isViable = false`, com `method` explicando. Nunca substituir por percentual arbitrário do spot como alvo válido.

**RN-407** — Em `LATERAL`, `isViable` é sempre `false` — não existe plano direcional em mercado lateral.

**RN-408** — `buildTradePlan` retorna `null` se `spot ≤ 0` ou histórico com menos de 5 fechamentos.

| ID | Entrada | Esperado | Técnica |
|----|---------|----------|---------|
| CT-401 | `serie-alta`, R:R calculado ≥ 1,5 | `isViable: true` | caminho feliz |
| CT-402 | série em que R:R resulta 1,49 | `isViable: false` | valor-limite |
| CT-403 | série em que R:R resulta exatamente 1,50 | `isViable: true` | valor-limite |
| CT-404 | `serie-topo-historico` | `isViable: false`, method cita topo histórico | RN-406 |
| CT-405 | `serie-lateral` | `isViable: false` | RN-407 |
| CT-406 | dois ativos distintos | `riskRewardRatio` diferente entre eles | anti-tautologia |
| CT-407 | `spot = 0` | `null` | borda |
| CT-408 | 4 fechamentos | `null` | valor-limite |
| CT-409 | `serie-alta` | `stop < entry < target1 < target2` | INV-401 |
| CT-410 | `serie-baixa` | `target2 < target1 < entry < stop` | INV-402 |

---

## 9. Camada 3 — Opções e volatilidade

### 9.1 Calendário e vencimento

Módulo: `b3-calendar.ts`, `options-barriers.ts` · **P0**

**RN-501** — DTE é contado em **dias úteis**, excluindo sábados, domingos e feriados B3 (fixos + móveis derivados da Páscoa: Carnaval segunda e terça, Sexta-feira Santa, Corpus Christi).
**RN-502** — Vencimento mensal é a **terceira sexta-feira** do mês.
**RN-503** — A série líquida selecionada é a mensal com `dte ≥ 5`; abaixo disso, rola para a mensal seguinte.
**RN-504** — Séries semanais nunca são selecionadas automaticamente.

| ID | Entrada | Esperado |
|----|---------|----------|
| CT-501 | 2026-08-31 → 2026-09-18 | 13 dias úteis |
| CT-502 | data em fim de semana | contagem inicia na segunda seguinte |
| CT-503 | intervalo contendo 07/09 | feriado descontado |
| CT-504 | intervalo contendo Corpus Christi | feriado descontado |
| CT-505 | primeira mensal com dte = 4 | seleciona a mensal seguinte |
| CT-506 | primeira mensal com dte = 5 | seleciona a primeira |

### 9.2 Elegibilidade de série

**RN-510** — Uma série só pode compor **perna de estrutura recomendada** se, simultaneamente: `confidence === 'high'` · `optionPrice ≥ 0,10` · `openInterest ≥ 5.000` · `0,05 < |delta| < 0,95` · `impliedVolatility` presente.

**RN-511** — Série inelegível como perna **ainda pode** compor muralha de Open Interest.

**RN-512** — Nenhum prêmio pode ser estimado. Série sem `optionPrice` da fonte não entra em estrutura, e nenhum campo monetário derivado pode ser preenchido por fórmula de fallback.

| ID | Entrada (fixture VBBR3) | Esperado |
|----|-------------------------|----------|
| CT-510 | VBBRU344 (high, 1,00, OI 97.500, δ −0,518) | elegível como perna |
| CT-511 | VBBRU349 (medium) | **inelegível** como perna; elegível como muralha |
| CT-512 | série com `optionPrice = 0,09` | inelegível |
| CT-513 | série com `openInterest = 4.999` | inelegível |
| CT-514 | série com `|delta| = 0,96` | inelegível |
| CT-515 | série sem `optionPrice` | inelegível; nenhum prêmio fabricado |

### 9.3 IV ATM e regime de volatilidade

**RN-520** — IV ATM é a **mediana** das IVs das séries elegíveis dentro de ±5% do spot, com `optionPrice ≥ 0,10` e `openInterest ≥ 1.000`.
**RN-521** — Se a divergência entre IV de call e IV de put no strike mais próximo do spot for > 5 pontos percentuais, a IV é marcada não confiável e tratada como ausente.
**RN-522** — Sem IV confiável, `ivAtm = null` ⟹ regime de volatilidade `null` ⟹ **nenhuma estrutura de crédito é eleita**.
**RN-523** — Classificação de regime: squeeze se `IV < 16%` ou (`IV/HV < 0,70` e `IV < 22%`); extrema se `IV ≥ 75%` ou `IV/HV ≥ 2,0`; alta se `IV ≥ 28%` ou `IV/HV ≥ 1,05`; caso contrário moderada.
**RN-524** — HV é o desvio padrão amostral dos retornos logarítmicos diários × √252, em pontos percentuais.

| ID | Entrada | Esperado |
|----|---------|----------|
| CT-520 | IV = 15,9 / 16,0 | MUITO_BAIXA / MODERADA |
| CT-521 | IV = 27,9 / 28,0 | MODERADA / ALTA |
| CT-522 | IV/HV = 1,04 / 1,05 | MODERADA / ALTA |
| CT-523 | IV = 74,9 / 75,0 | ALTA / EXTREMA |
| CT-524 | nenhuma série elegível | `ivAtm = null` e nenhuma estrutura eleita |
| CT-525 | IV call 32% e put 40% no ATM | IV marcada não confiável |
| CT-526 | série de preços constante | HV = 0, sem divisão por zero |
| CT-527 | menos de 22 fechamentos | HV = `null` |

### 9.4 Muralhas de opções

**RN-530** — Call Wall é o strike com maior `openInterest` de calls; Put Wall, o maior de puts.
**RN-531** — Alerta de barreira dispara quando a distância do spot ao strike for ≤ 3,0%.
**RN-532** — O alerta de barreira **não altera** a operação decidida pela matriz — é campo de alerta, não veredito.
**RN-533** — Max Pain é o strike de menor prejuízo agregado dos lançadores no vencimento.

| ID | Entrada | Esperado |
|----|---------|----------|
| CT-530 | fixture com OI conhecido | Call Wall = strike de maior OI de call |
| CT-531 | distância = 2,99% / 3,00% / 3,01% | alerta / alerta / sem alerta |
| CT-532 | ALTA + APROVADO + Call Wall a 1,8% | `operation` continua `COMPRA` |
| CT-533 | empate de OI entre dois strikes | escolha determinística (menor strike), documentada |

### 9.5 Seleção de pernas e coerência da estrutura

Módulo: `cme-election.ts` · **P0** — maior risco financeiro do sistema.

**RN-540** — A seleção de pernas é feita **por delta**, nunca por posição em array.
**RN-541** — Trava a crédito: perna vendida com `|delta|` mais próximo de 0,28, **descartando** `|delta| > 0,38`; perna de proteção com `|delta|` mais próximo de 0,12.
**RN-542** — Trava a débito: perna comprada com `|delta|` próximo de 0,55; perna vendida próxima de 0,25.
**RN-543** — Largura entre 1,5% e 6,0% do spot.
**RN-544** — Crédito/largura entre 15% e 45%. Fora disso, estrutura não eleita.
**RN-545** — Existe **um único** motor de estrutura em todo o sistema. Nenhuma outra função pode montar pernas.
**RN-546** — Toda estrutura passa por validação de direção antes de ser serializada: `payoff(0,5 × spot)` e `payoff(1,5 × spot)` devem ter a relação compatível com o viés declarado. Falha ⟹ estrutura não exibida e erro registrado.
**RN-547** — `maxProfit`, `maxLoss` e `breakEven` são obtidos por varredura do payoff das pernas, não por fórmula por cenário.
**RN-548** — Iron Condor só é montado com DTE entre 12 e 35 dias úteis e regime de volatilidade diferente de squeeze.

| ID | Entrada | Esperado | Técnica |
|----|---------|----------|---------|
| CT-540 | fixture VBBR3, veredito COMPRA | **VBBRU344 (δ −0,518) não pode ser perna vendida** | RN-541 |
| CT-541 | fixture VBBR3, veredito COMPRA | perna vendida com `|delta| ≤ 0,38` ou estrutura não eleita | RN-541 |
| CT-542 | largura = 1,4% do spot | não eleita | valor-limite |
| CT-543 | largura = 1,5% / 6,0% / 6,1% | eleita / eleita / não eleita | valor-limite |
| CT-544 | crédito/largura = 14% / 15% / 45% / 46% | não / sim / sim / não | valor-limite |
| CT-545 | Bull Put montado | `payoff(0,5·spot) < payoff(1,5·spot)` | RN-546 |
| CT-546 | Bear Call montado | `payoff(0,5·spot) > payoff(1,5·spot)` | RN-546 |
| CT-547 | Iron Condor montado | `payoff(spot)` maior que nos dois extremos | RN-546 |
| CT-548 | pernas invertidas injetadas | erro de direção; estrutura não retorna à UI | negativo |
| CT-549 | DTE = 11 / 12 / 35 / 36 | bloqueia / permite / permite / bloqueia | valor-limite |
| CT-550 | regime squeeze + LATERAL | Iron Condor bloqueado com motivo | tabela de decisão |
| CT-551 | grep por `buildSuggestedOptionStructure` | zero ocorrências no projeto | RN-545 |
| CT-552 | `maxProfit` por varredura vs fórmula fechada | diferença ≤ R$ 0,01 nos 4 tipos de trava | RN-547 |

### 9.6 Defasagem de preço

**RN-560** — Toda estrutura carrega `priceContext`: `priceDate`, `priceUnderlying`, `currentSpot`, `spotDriftPct`, `isStale`.
**RN-561** — `|spotDriftPct| > 1,5%` ⟹ `isStale = true` e advertência obrigatória na UI.
**RN-562** — `|spotDriftPct| > 3,0%` ⟹ estrutura **não é eleita**.

| ID | Entrada | Esperado |
|----|---------|----------|
| CT-560 | drift = 1,4% / 1,6% | `isStale: false` / `true` |
| CT-561 | drift = 2,67% (caso VBBR3 real) | eleita com advertência |
| CT-562 | drift = 3,1% | não eleita |
| CT-563 | qualquer estrutura eleita | `priceDate` presente e não vazia |

### 9.7 Black-Scholes e solver de IV

**RN-570** — Round-trip: dado σ, calcular preço teórico e recuperar σ pelo solver com erro ≤ 0,5 ponto percentual.
**RN-571** — O solver só é usado como fallback documentado; quando a fonte fornece `impliedVolatility`, ela prevalece.
**RN-572** — Taxa livre de risco e dividend yield vêm da série (`riskFreeRate`, `dividendYield`), não são constantes.

| ID | Entrada | Esperado |
|----|---------|----------|
| CT-570 | S=30, K=30, T=15/252, σ=0,35, call | preço 1,09 → IV ≈ 35,0 ± 0,5 |
| CT-571 | S=30, K=34, σ=0,40 | IV ≈ 40,0 ± 0,5 |
| CT-572 | preço abaixo do valor intrínseco | `null` |
| CT-573 | preço que implica σ > 400% | `null` |
| CT-574 | série com `dividendYield = 0` | usa 0, não 3% fixo |
| CT-575 | fixture com `impliedVolatility` presente | solver não é chamado |

---

## 10. Contratos

### 10.1 Contrato da fonte externa (BRAPI) — **P1**

**RC-101** — `/stocks/financial-data` fornece `totalDebt`, `totalCash`, `ebitda`, `currentRatio`, `returnOnEquity`, `profitMargins`. **Não** fornece `debtToEbitda`.
**RC-102** — `/stocks/statistics` fornece `netIncomeToCommon`, `trailingPE`, `priceToBook`. Os campos `sharesShort`, `shortRatio`, `shortPercentOfFloat` são sempre `null` para B3 — **nunca** usar como fonte de aluguel.
**RC-103** — `/options/positions` fornece apenas dados de posição: `openInterest`, `coveredQuantity`, `uncoveredQuantity`, `blockedQuantity`, `borrowerQuantity`, `lenderQuantity`. **Não** fornece preço nem IV.
**RC-104** — `/options/analytics` fornece `optionPrice`, `impliedVolatility`, `delta`, `gamma`, `theta`, `vega`, `riskFreeRate`, `dividendYield`, `confidence`, `nullReason`, `openInterest`, `underlyingPrice`, `date`, `optionStyle`, `model`.
**RC-105** — `impliedVolatility` vem em **decimal** (0,287) e é convertido para pontos percentuais uma única vez, na fronteira do serviço.
**RC-106** — `borrowerQuantity`/`lenderQuantity` referem-se à **série de opção**, não a empréstimo da ação.

| ID | Cenário | Esperado |
|----|---------|----------|
| CT-601 | fixture completa | parsing sem erro, todos os campos mapeados |
| CT-602 | `ebitda` ausente | `debtToEbitda = null`, sem exceção, sem aprovação por omissão |
| CT-603 | `netIncomeToCommon` ausente | 0 pontos na métrica, sem flag |
| CT-604 | resposta `{ results: [] }` | objeto vazio, análise segue com todas as métricas `null` |
| CT-605 | resposta HTML (erro de proxy) | erro tratado, sem `Unexpected token <` |
| CT-606 | timeout da fonte | falha isolada, demais camadas seguem |
| CT-607 | `impliedVolatility = 0.287` | vira 28,7 exatamente uma vez (não 2870 nem 0,287) |
| CT-608 | positions sem `optionPrice` | nenhuma perna eleita a partir dessa fonte isolada |

### 10.2 Contrato interno API → UI — **P2**

**RC-201** — `GET /api/quote?symbol=X` retorna, no **nível raiz**: `symbol`, `regularMarketPrice`, `historicalDataPrice`, `trendAnalysis`, `fundamentals`, `indicators`, `barrierAlert`, `verdict`, `operation`, `tradePlan`, `rentalAlert`, `optionAnalysis`, `electedOptionStrategy`, `selectedExpiration`, `availableExpirations`, `updatedAt`.

**RC-202** — `indicators` contém `sma20`, `sma50`, `sma200`, `rsi`, `macd`, `atr`, `volumeRatio`, `checklist`, `supports`, `resistances`. **Não** contém `riskReward` — o plano de trade vive em `tradePlan`.

**RC-203** — `GET /api/trends` retorna `totalAnalyzed` e `lists: { alta, baixa, lateral }`. Ativos com `listedInTracker: false` **não** aparecem em nenhuma lista.

**RC-204** — `GET /api/options?symbol=X` retorna a análise de opções com `ivAtm` possivelmente `null`.

**RC-205** — Toda rota devolve erro em JSON com a chave `error`, nunca HTML.

| ID | Cenário | Esperado |
|----|---------|----------|
| CT-701 | snapshot de shape de `/api/quote` | falha se qualquer chave de nível raiz sumir ou for renomeada |
| CT-702 | `/api/quote` | `indicators` **e** `tradePlan` presentes na raiz |
| CT-703 | `/api/quote` | `indicators.riskReward` **não** existe |
| CT-704 | `/api/trends` | soma das 3 listas ≤ `totalAnalyzed` |
| CT-705 | `/api/trends` | nenhum símbolo aparece em duas listas |
| CT-706 | `/api/trends` | nenhum item com `operation` em {`SEM_OPERACAO`, `SAIDA_STOP`} |
| CT-707 | símbolo inexistente | HTTP 404/500 com `error` em JSON |
| CT-708 | BRAPI fora do ar | resposta com listas vazias, sem stack trace vazando |

---

## 11. Interface

### 11.1 Consulta individual (`QuoteView`) — **P2/P3**

**RU-101** — O bloco "Estudo da Ação à Vista" lê `tradePlan`, nunca `indicators.riskReward`.
**RU-102** — Sem plano disponível, exibir `—`. **Nunca** exibir `R$ 0,00` como stop ou alvo — zero é um número plausível e mascara dado ausente.
**RU-103** — O gráfico de plano de trade só renderiza com `tradePlan.isViable === true`; caso contrário, exibe o motivo com o R:R medido.
**RU-104** — O painel de payoff exibe o nome da estratégia, o viés e o papel de cada perna (strike maior / strike menor).
**RU-105** — Todo painel com valor de prêmio exibe a data de referência dos preços.
**RU-106** — Estrutura com `isStale` exibe o selo de advertência de defasagem.
**RU-107** — Ativo com `operation = SAIDA_STOP` exibe "saída ou stop de posição existente; nenhuma estrutura nova autorizada".
**RU-108** — Ativo com `operation = SEM_OPERACAO` exibe o motivo da matriz.

| ID | Props | Esperado |
|----|-------|----------|
| CT-801 | `tradePlan: null` | três cards com `—`, sem gráfico, mensagem de indisponibilidade |
| CT-802 | `tradePlan.isViable: false` | sem gráfico, motivo com R:R medido |
| CT-803 | `tradePlan` válido | gráfico com entry/stop/target1/target2 |
| CT-804 | grep em `QuoteView.tsx` | zero ocorrências de `riskReward` |
| CT-805 | estrutura com `isStale: true` | selo de advertência visível |
| CT-806 | `operation: SAIDA_STOP` | texto de gestão de posição visível |
| CT-807 | estrutura eleita | nome da estratégia e viés visíveis no painel de payoff |

### 11.2 Rastreador (`ScreenerView`)

**RU-201** — Exibe exatamente três listas: ALTA, BAIXA, LATERAL.
**RU-202** — Não exibe as palavras "reprovado" ou "bloqueado", nem contador de excluídos, nem score.
**RU-203** — Lista vazia exibe "Nenhuma operação autorizada nesta direção hoje".

| ID | Cenário | Esperado |
|----|---------|----------|
| CT-810 | resposta com as 3 listas | três seções renderizadas |
| CT-811 | `lists.lateral: []` | mensagem de lista vazia, não spinner nem lista de outra direção |
| CT-812 | busca textual no componente | zero ocorrências de "Bloqueado (Fundam.)" |

---

## 12. Fluxos ponta a ponta

**RE-101** — Abrir o rastreador → as três listas carregam → clicar num ativo da lista ALTA → a consulta individual abre com o mesmo veredito. **O veredito nunca diverge entre as duas telas.**

**RE-102** — Consultar um ativo aprovado em tendência de alta → o plano de trade exibe stop e alvos numéricos → o gráfico renderiza com as marcações.

**RE-103** — Consultar um ativo em tendência de baixa e reprovado → a estrutura sugerida é trava de baixa → o alerta de aluguel aparece.

**RE-104** — Consultar um ativo lateral com volatilidade comprimida → Iron Condor bloqueado com motivo explícito.

**RE-105** — Simular BRAPI indisponível → nenhuma tela quebra; todas exibem estado de indisponibilidade.

### Teste exploratório (não automatizado, tempo alocado de 30 minutos por release)

- Trocar de ativo rapidamente várias vezes e observar se algum painel mantém dado do ativo anterior.
- Abrir a consulta individual com a aba de opções já selecionada.
- Consultar ativo sem opções negociadas.
- Consultar ativo com IPO recente (histórico curto).
- Consultar em dia de vencimento de opções.
- Conferir uma estrutura sugerida contra o book real do home broker e registrar a diferença de prêmio.

---

## 13. Invariantes globais

Propriedades que devem valer para **qualquer** entrada — candidatas a teste baseado em propriedade com entradas geradas.

| ID | Invariante |
|----|-----------|
| INV-101 | `0 ≤ score ≤ 100` |
| INV-102 | `status === 'APROVADO'` ⟹ `eliminatoryFlags.length === 0` |
| INV-103 | `trend` ∈ {ALTA, BAIXA, LATERAL}, sempre definido |
| INV-104 | `listedInTracker === true` ⟹ `operation` ∈ {COMPRA, VENDA, IRON_CONDOR} |
| INV-105 | Nenhum símbolo em mais de uma lista do rastreador |
| INV-401 | Plano de ALTA viável ⟹ `stop < entry < target1 ≤ target2` |
| INV-402 | Plano de BAIXA viável ⟹ `target2 ≤ target1 < entry < stop` |
| INV-403 | `isViable === true` ⟹ `riskRewardRatio ≥ 1,5` |
| INV-501 | Estrutura de viés ALTA ⟹ payoff cresce do extremo inferior para o superior |
| INV-502 | Estrutura com risco limitado ⟹ `maxLoss` finito e > 0 |
| INV-503 | Trava vertical ⟹ `maxProfit + maxLoss = largura` (tolerância R$ 0,01) |
| INV-504 | Nenhum valor monetário de opção exibido sem origem em `optionPrice` da fonte |
| INV-505 | `ivAtm === null` ⟹ nenhuma estrutura de crédito eleita |
| INV-601 | Nenhuma função de `domain/` faz I/O |
| INV-602 | Nenhuma resposta de API contém `NaN`, `Infinity` ou `undefined` serializado |

---

## 14. Divergências conhecidas e decisões registradas

Itens onde o comportamento pode surpreender quem escreve o teste. **Não** são bugs a corrigir.

| Item | Decisão |
|------|---------|
| Liquidez corrente < 1,0 não reprova | Setores de capital intensivo operam assim; derruba score, não elimina |
| LATERAL + REPROVADO não opera | Venda de volatilidade em empresa frágil tem cauda gorda; bloqueio deliberado |
| BAIXA + APROVADO fora do rastreador | Não há operação nova; é gestão de posição, exibida só na consulta individual |
| Lista vazia é resultado válido | Sistema não deve fabricar operação para preencher tela |
| Seleção por delta reduz o número de recomendações | Intencional — melhor nenhuma que estruturalmente ruim |
| Dados de derivativos são D-1 | Fonte publica em fechamento; por isso existe o controle de drift |
| Alerta de aluguel sem número | Fonte não publica BTC; estimar seria pior que omitir |

---

## 15. Critérios de saída

Uma entrega só pode subir quando:

1. Suíte completa verde, sem teste marcado como `skip` ou `only`.
2. Cobertura de linha ≥ **90%** em `src/lib/domain/**` e ≥ **80%** em `src/lib/services/**`. UI não tem meta numérica.
3. Todos os casos P0 deste documento implementados e passando.
4. Todo `RN-` alterado por um PR tem seu `CT-` correspondente atualizado no mesmo commit.
5. Nenhum teste de contrato (`RC-`) quebrado — quebra de contrato exige atualização deste documento antes do merge.
6. Teste exploratório da seção 12 executado e registrado.
7. Nenhum número mágico novo em `src/lib/domain/**`: todo limiar vem de `src/lib/config/rules.ts`.

---

## 16. Ambiente e execução

```bash
npm ci
npx vitest run                      # suíte completa
npx vitest run --coverage           # com cobertura
npx vitest run src/lib/domain       # só domínio (P0)
npx playwright test                 # ponta a ponta
```

**Determinismo obrigatório:** nenhum teste pode depender da data do sistema nem de chamada real à BRAPI. Datas entram por parâmetro; a fonte externa entra por fixture. Um teste que passa hoje e falha em novembro por causa de feriado móvel é um teste quebrado.

**Correção automática de teste é proibida.** Se um teste de lógica crítica quebrar após uma mudança, a quebra deve ser lida e explicada antes de qualquer ajuste. Ajustar o teste para passar sem entender por que ele quebrou anula o propósito da suíte.
