# RADAR B3 PRO IA — Especificação Técnica v2.4

## Navegação, descoberta e testabilidade da camada de opções

**Projeto:** TESTE_BRAPI
**Base:** commit `4fda6ce`
**Data:** 31/08/2026
**Origem:** 3 testes automatizados de navegação falharam/bloquearam no ambiente publicado
**Status:** parecer sobre os diagnósticos recebidos + requisitos aprovados para implementação

---

## 0. Parecer sobre os diagnósticos recebidos

Os três relatórios atribuem as falhas a causas de hospedagem: *feature flags*, variáveis de ambiente, CORS, build de produção, erro de hidratação. **Verifiquei cada uma dessas hipóteses no código e nenhuma se sustenta.**

| Hipótese levantada | Verificação | Veredito |
|--------------------|-------------|----------|
| Feature flag desligando o componente | `grep` por `featureFlag`, `FEATURE_`, `NEXT_PUBLIC_` no projeto inteiro: **zero ocorrências** | ❌ impossível — o projeto não tem feature flags |
| Variável de ambiente ausente em produção | A publicação é `npm run start` na mesma máquina + túnel HTTPS (`publicar_link.bat`), lendo o mesmo `.env.local` do desenvolvimento | ❌ improvável |
| API não retornando dados para PETR4 | O badge do cabeçalho exibia "BRAPI Conectada · 164 ms" nas capturas | ❌ contrariado pela evidência |
| CORS / chamada de rede bloqueada | Todas as chamadas são same-origin para rotas `/api/*` do próprio Next.js | ❌ não se aplica |
| Componente ausente do build de produção | Importado estaticamente em `app/page.tsx`, sem carregamento dinâmico | ❌ não se aplica |
| Falta de fallback visível em caso de erro | `QuoteView.tsx:1333` já renderiza bloco de erro; estrutura bloqueada tem painel próprio desde a v2.2 | ❌ já implementado |

**A causa real das três falhas é outra, e é a mesma nos três casos:** o agente de teste procurou controles que não existem, em páginas onde a funcionalidade não está. Não é problema de infraestrutura — é de arquitetura de navegação e de ausência total de afordâncias de automação.

Fatos verificados no código:

1. **A aba "Barreiras de Opções" não tem painel de estruturas nem gráfico de payoff.** `OptionsBarriersView.tsx` tem **zero** ocorrências de `OptionPayoffChart`. Ela renderiza muralhas, Max Pain, IV ATM e a grade straddle — e nada mais. O painel de estrutura elegível e o payoff existem apenas em `QuoteView.tsx`, três níveis de navegação abaixo: aba **Consulta & Gráfico 12M** → sub-aba **Recomendações de Estudo** → seletor **Estratégia de Opções Eleita**.
2. **Não existe seleção de estrutura pelo usuário.** O motor elege **uma** estrutura de forma determinística. Não há caminho para "escolher uma trava de débito" — e isso é uma decisão de arquitetura da v2.1, não um defeito.
3. **O termômetro de sentimento é conteúdo inline** dentro de `TradingViewOverview.tsx`, sem rota, sem controle navegável e sem múltiplos resumos entre os quais alternar.
4. **O projeto tem zero `data-testid`, zero `role=` e zero atributos `aria-*`** em toda a camada de componentes. Um agente que navega por papel semântico ou rótulo acessível não encontra absolutamente nada.

**Conclusão:** discordo dos diagnósticos, concordo com parte das remediações. As sugestões de "expor um controle visível e acessível" estão certas pelo motivo errado — não porque algo está escondido por configuração, mas porque o controle **nunca foi construído**. Os requisitos abaixo convertem essa parte aproveitável em especificação.

---

## 1. Falha 1 — "Inspect eligible option structures"

### Diagnóstico correto

O teste abriu **Barreiras de Opções**, selecionou PETR4 e a série I/U de setembro, e procurou o painel de estruturas elegíveis. O painel não estava ausente por falha: **ele não pertence àquela página**.

Há ainda uma segunda possibilidade legítima, que o agente não conseguiria distinguir: se o motor tivesse devolvido bloqueio para PETR4, o painel exibido seria o de bloqueio, não o de estrutura — e um teste que procura por "estruturas elegíveis" trataria isso como ausência.

### Requisito RN-N101 — painel de estrutura na página de opções

A aba **Barreiras de Opções** passa a exibir, abaixo do bloco de muralhas e acima da grade straddle, a seção **"Estrutura Elegível para o Vencimento"**, alimentada pelo mesmo motor único (`electBestOptionStrategy`), com o mesmo contrato:

- Título da estratégia, viés e status.
- Pernas com papel explícito (strike maior / strike menor), preço, delta e OI.
- Crédito ou débito líquido, largura, lucro e perda máximos, breakeven.
- Data de referência dos prêmios e selo de defasagem quando `isStale`.
- Gráfico de payoff (`OptionPayoffChart`), o mesmo componente já usado em `QuoteView`.
- Quando bloqueado: motivo, mensagem e o bloco de diagnóstico numérico da v2.2.

A seção existe **em todos os estados** — autorizada, em análise ou bloqueada. Nunca é omitida do DOM. Estados de carregamento usam esqueleto visível, não ausência.

### Requisito RN-N102 — a rota de opções devolve a estrutura

`GET /api/options?symbol=X&expiration=Y` passa a incluir, além da análise atual:

```
electedOptionStrategy, operation, fundamentals (status e score), priceContext
```

Hoje essa rota devolve apenas a análise de posições, o que obriga a página a não ter estrutura. É a mudança de backend que habilita a RN-N101.

---

## 2. Falha 2 — "Select a debit vertical and view payoff analysis"

### Diagnóstico correto

O teste pressupõe que o usuário pode **escolher** uma trava de débito. Essa funcionalidade não existe, e não foi omitida por engano: a v2.1 estabeleceu motor único com eleição determinística justamente para eliminar as duas fontes concorrentes de estrutura que existiam antes.

**Não vou recomendar a sugestão como veio.** Adicionar um seletor livre de estratégias reabre a porta para o usuário montar estruturas que o motor bloquearia — sem validação de delta, largura, crédito/largura, drift ou coerência direcional. Seria desfazer a v2.1 para satisfazer um teste.

### Requisito RN-N103 — alternativa a débito, quando existir e for válida

O que faz sentido, e atende ao espírito do teste sem quebrar a arquitetura: quando **ambas** as estruturas passarem por todas as validações, o motor devolve a eleita e a alternativa.

```ts
interface ElectedOptionStrategy {
  // ... campos atuais
  alternative?: {
    strategy: ElectedOptionStrategy;   // mesma validação, mesmo assertDirection
    rationale: string;                 // por que não foi a eleita
  };
}
```

Regra de eleição entre as duas, mantida como está: regime de IV alta ou moderada favorece a estrutura a crédito; IV baixa favorece a débito. A alternativa só é oferecida quando **passa em todas as validações**, incluindo `assertDirection`, faixa de delta, largura e — no caso da estrutura a crédito — disponibilidade de IV ATM confiável.

Na UI, um par de controles com papel semântico:

```
[ Eleita: Trava de Alta a Crédito ]  [ Alternativa: Trava de Alta a Débito ]
```

Alternar entre eles troca o payoff e o bilhete de ordem. Quando não houver alternativa válida, o segundo controle aparece **desabilitado com o motivo em tooltip** — nunca ausente do DOM. Estado desabilitado é informação; elemento ausente é ambiguidade.

---

## 3. Falha 3 — "Switch between market overview summaries"

### Diagnóstico correto

O teste esperava alternar entre resumos de mercado. A página **Panorama Geral** é um bloco contínuo de conteúdo — termômetro de sentimento, índices, setores — sem separação navegável. Não há entre o que alternar.

**Não recomendo criar uma rota dedicada de sentimento**, como sugerido. Uma página só para o termômetro fragmenta o panorama sem ganho para o usuário.

### Requisito RN-N104 — panorama em visões nomeadas

`TradingViewOverview` passa a organizar o conteúdo já existente em três visões, com controles reais de alternância:

| Visão | Conteúdo (já existente) |
|-------|------------------------|
| **Sentimento** | Termômetro de Sentimento & Apetite a Risco, os 5 pilares de ponderação e a análise textual |
| **Índices** | Índices globais e domésticos |
| **Setores** | Desempenho setorial |

Implementação com semântica de abas: contêiner `role="tablist"`, cada controle `role="tab"` com `aria-selected` e `aria-controls`, cada painel `role="tabpanel"`. A visão ativa é refletida na URL (`?view=sentimento`), de modo que cada uma seja endereçável e recarregável — é isso que torna "alternar entre resumos" uma operação real, para o usuário e para o teste.

---

## 4. Correção transversal — testabilidade e acessibilidade

Esta é a causa comum das três falhas, e a correção de maior alcance do documento.

O projeto não tem **nenhum** atributo de automação ou acessibilidade. Um agente que procura "um botão chamado Recomendado" ou "um controle com papel de aba" não encontra nada, porque tudo é `<div>` com `onClick`. O sintoma aparece como "elemento não encontrado", e daí nasce a suposição de feature flag.

### Requisito RN-N105 — afordâncias obrigatórias

1. **Todo elemento clicável é `<button>` ou `<a>`.** Nenhum `onClick` em `<div>` ou `<span>`. Navegação por teclado precisa funcionar em toda a aplicação.
2. **Toda navegação por abas usa `role="tablist"` / `role="tab"` / `role="tabpanel"`** com `aria-selected` e `aria-controls`. Vale para a Navbar principal, para as sub-abas da consulta e para as visões do panorama.
3. **`data-testid` estável** nos pontos que os testes precisam alcançar, com nomenclatura `<área>-<elemento>`:

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

4. **`aria-live="polite"`** nos blocos que mudam após carregamento assíncrono (veredito, estrutura, plano de trade).
5. **Estado de carregamento é esqueleto visível com `data-testid` próprio**, nunca ausência de nó.
6. **Estado de bloqueio é distinguível de estado de erro e de estado vazio** — três `data-testid` diferentes, três textos diferentes. Um agente (ou um usuário) precisa distinguir "o motor decidiu não montar" de "a requisição falhou" de "não há dado publicado".

`data-testid` é contrato: renomear um exige atualizar os testes no mesmo commit.

---

## 5. Verificação de 1 minuto antes de qualquer correção

Embora eu tenha descartado as hipóteses de infraestrutura pela leitura do código, elas custam um minuto para eliminar de vez no ambiente publicado. Faça isso antes de abrir o PR — se algum retornar erro, o diagnóstico muda:

```
GET  <url-publicada>/api/health
     -> esperado: { status: "ONLINE", hasApiKey: true, latencyMs: <n> }

GET  <url-publicada>/api/quote?symbol=PETR4
     -> esperado: JSON com as chaves indicators, tradePlan, operation,
        electedOptionStrategy no nível raiz

GET  <url-publicada>/api/options?symbol=PETR4&expiration=2026-09-18
     -> esperado: análise com top5CallWalls, top5PutWalls e ivAtm preenchidos
```

Se as três responderem como esperado, a camada de dados está sã e o problema é integralmente de navegação — o que é a minha leitura.

---

## 6. Testes obrigatórios

| ID | Cenário | Esperado |
|----|---------|----------|
| CT-N01 | Barreiras de Opções, PETR4, série de setembro | `options-eligible-structures-panel` presente no DOM |
| CT-N02 | mesma tela, motor devolve bloqueio | painel presente, com `options-block-reason` e `options-block-diagnostics` |
| CT-N03 | mesma tela, estrutura autorizada | `options-payoff-chart` renderizado e pernas com papel explícito |
| CT-N04 | `/api/options` | resposta contém `electedOptionStrategy`, `operation` e `priceContext` |
| CT-N05 | estrutura com alternativa válida | `options-structure-alternative` habilitado; alternar troca o payoff |
| CT-N06 | estrutura sem alternativa válida | controle presente, desabilitado, com motivo acessível |
| CT-N07 | alternativa a débito eleita | passa em `assertDirection` e nas faixas de delta e largura |
| CT-N08 | Panorama Geral | três controles `role="tab"` com `aria-selected` correto |
| CT-N09 | `?view=sentimento` | abre direto na visão de sentimento |
| CT-N10 | navegação só por teclado | todas as abas e controles alcançáveis por Tab e acionáveis por Enter |
| CT-N11 | varredura estática | nenhum `onClick` em `<div>` ou `<span>` |
| CT-N12 | varredura estática | todos os `data-testid` da RN-N105 presentes |
| CT-N13 | estados de carregamento, erro, vazio e bloqueio | quatro `data-testid` distintos, nenhum compartilhado |

---

## 7. Critérios de aceite

1. A estrutura elegível e o payoff aparecem na aba **Barreiras de Opções**, sem exigir navegação até a consulta individual.
2. A seção de estrutura existe no DOM em todos os estados, com estado explícito e distinguível.
3. A alternativa a débito é oferecida quando válida, e o controle permanece visível e desabilitado quando não.
4. O Panorama Geral tem três visões navegáveis, endereçáveis por URL e acessíveis por teclado.
5. Zero `onClick` em elementos não interativos em toda a aplicação.
6. Todos os `data-testid` da RN-N105 presentes e cobertos por teste.
7. Os três testes que motivaram este documento passam sem alteração no roteiro deles.

---

## 8. Ordem de execução e prioridade

```
RN-N105 (afordâncias)  ──→  RN-N102 (API)  ──→  RN-N101 (painel na página de opções)  ──→  RN-N103 (alternativa)
                                                          │
                                                          └──→  RN-N104 (visões do panorama)
```

Prioridade relativa aos defeitos abertos da v2.3: **as correções da v2.3 vêm primeiro.** G1 (Iron Condor), G3 (gate de IV) e G4 (`lastTradeDate`) são defeitos de **conteúdo da recomendação** — eles fazem o sistema recomendar errado. As correções desta v2.4 são de **acesso à recomendação**. Uma recomendação errada bem exposta é pior que uma recomendação certa mal exposta.

---

## 9. Nota sobre o uso dos diagnósticos automatizados

Os três relatórios convergiram para a mesma explicação — *feature flag, build de produção, variável de ambiente* — a partir do mesmo sintoma: elemento não encontrado. É o padrão esperado de um agente que enxerga a aplicação apenas pela tela: sem acesso ao código, "o controle não existe" e "o controle está escondido por configuração" são indistinguíveis, e a segunda hipótese é a mais comum na experiência acumulada da ferramenta.

O que torna o relatório útil não é o diagnóstico, é a **observação**: três fluxos que um operador tentaria seguir não são alcançáveis pela navegação. Isso é verdade e vale a correção.

Recomendação de processo: tratar saída de agente de teste como **relato de sintoma**, nunca como causa-raiz — do mesmo modo que se trata um chamado de usuário. A causa vem da leitura do código, e neste caso três `grep` a resolveram: `featureFlag` (zero ocorrências), `OptionPayoffChart` em `OptionsBarriersView` (zero ocorrências), `data-testid` (zero ocorrências no projeto).
