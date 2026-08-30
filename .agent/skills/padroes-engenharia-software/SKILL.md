---
name: padroes-engenharia-software
description: Padrões técnicos detalhados de engenharia de software para qualquer stack ou domínio — segurança (injeção, autorização, segredos, supply chain), performance (N+1, índices, paginação, cache), resiliência de código (timeout, retry, idempotência), observabilidade de aplicação, testes e uso seguro de IA no código. Use SEMPRE que estiver escrevendo, revisando ou arquitetando código, mesmo que o pedido não mencione "boas práticas" ou "segurança". Dispare especialmente ao criar endpoint, integração externa, query de banco, autenticação/autorização, tratamento de dado pessoal, ou antes de declarar qualquer código pronto para produção. Dispare também quando o usuário perguntar "isso está seguro?", "está performático?", "o que falta antes de subir?", ou pedir revisão de código. Complementa o prompt de sessão do engenheiro sênior (papel, fluxo, lógica de negócio), `analista-funcional-requisitos` (upstream, antes do código) e `arquitetura-infraestrutura-deploy` (onde/como o sistema roda — hospedagem, pipeline, deploy) — esta skill cobre exclusivamente o código em si, não decisão de infraestrutura.
---

# Padrões de Engenharia de Software

Critérios técnicos aplicáveis a qualquer linguagem, stack ou domínio. O rigor de cada item varia conforme a criticidade do que está sendo construído (CRÍTICO / IMPORTANTE / BAIXO) — segurança é a exceção: aplica-se sempre.

## Arquitetura e código

- Regra de negócio não conhece framework, banco nem protocolo HTTP. Domínio puro no centro, adaptadores nas bordas.
- **Injeção de dependência obrigatória**: função de negócio nunca instancia cliente de API, conexão de banco ou leitor de arquivo internamente. Sempre por parâmetro ou construtor — é o que torna o código testável sem infraestrutura.
- Funções pequenas, responsabilidade única. Se precisa de "e" para descrever, são duas.
- Estado imutável por padrão — mutação compartilhada origina a maioria dos bugs de concorrência.
- **Erros explícitos, nunca silenciosos**: proibido `except: pass`, `catch {}` vazio ou default silencioso em caminho crítico. Falhe alto e cedo.
- Sem código morto nem código comentado — o git é o arquivo morto.
- Nomes descritivos no vocabulário do domínio. Comentário explica *por que*, não *o que*.

## Segurança (não-negociável, independente de criticidade)

**Entrada e saída**
- Validar toda entrada externa no limite do sistema (request, webhook, arquivo, mensagem de fila), inclusive de fonte "confiável". Whitelist de formato, não blacklist.
- Queries parametrizadas sempre. Nunca concatenar input em SQL, comando de shell, path de arquivo ou template.
- Escapar saída conforme o contexto (HTML, atributo, JS, URL).
- Sanitizar path contra traversal (`../`) quando o caminho depende de input.

**Segredos**
- Zero hardcode de URL de produção, string de conexão, token, chave, senha ou porta — exclusivamente variável de ambiente ou secrets manager.
- `.env` nunca commitado; `.env.example` com valores fictícios, sim.
- Segredo nunca vai para log, mensagem de erro, resposta de API ou stack trace exposta.
- Se a arquitetura torna a troca de uma chave dolorosa, isso é defeito de design.

**Autenticação e autorização**
- Autorização verificada no servidor, em cada requisição — nunca confiar em controle feito só no frontend.
- Verificar **no nível do recurso**, não só da rota: o clássico é usuário A acessar `/pedido/123` que pertence ao usuário B.
- Menor privilégio para credencial de serviço, conta de banco e permissão de cloud.
- Senha com hash forte e salt (bcrypt/argon2) — nunca criptografia reversível nem hash rápido.

**Superfície de ataque e dependências**
- Rate limiting em endpoint público ou custoso.
- CORS restritivo, nunca `*` em produção. HTTPS obrigatório. Cookies com `HttpOnly`, `Secure`, `SameSite`.
- Antes de adicionar dependência: confirmar que o pacote existe, é o oficial e é mantido. Nome parecido com pacote conhecido é vetor de ataque real (typosquatting/slopsquatting) — risco elevado quando a sugestão veio de IA.
- Cada dependência é superfície de ataque herdada. Preferir as com manutenção ativa.

**Dado pessoal**
- Coletar o mínimo; não logar dado pessoal ou sensível. Criptografia em repouso para dado sensível, em trânsito sempre.
- Se houver exigência de LGPD/GDPR/PCI/HIPAA, aplicar desde o design (direito à exclusão, retenção, trilha de auditoria) — retrofit de compliance é caro e falho.

## Performance

Otimize com medição, não intuição. Mas os itens abaixo não são otimização prematura — são design correto de custo zero:

- **N+1 queries** — causa nº 1 de lentidão com ORM. Carregue relacionamento em lote.
- **Índice** nas colunas de filtro, join e ordenação. Ausência só aparece em produção com volume real.
- **Paginação obrigatória** em endpoint que retorna lista.
- Não carregar dataset inteiro em memória quando streaming/chunk resolve.
- I/O não bloqueia thread ou loop principal em contexto assíncrono.
- **Timeout explícito em toda chamada externa** — sem ele, uma dependência lenta derruba o sistema.

Só com evidência:
- Cache exige estratégia de invalidação definida **antes** de ser adicionado — cache sem isso troca lentidão por bug de dado velho, que é pior.
- Antes de otimizar: profiling, tempo de query, alocação. Sem número, é palpite.
- Serviço que escala horizontalmente deve ser stateless; trabalho pesado vai para fila, não para o ciclo de request (a decisão de *como* escalar a infraestrutura em si está em `arquitetura-infraestrutura-deploy`).

## Resiliência

Toda dependência externa falha em algum momento:

- Timeout + retry com backoff exponencial. Retry imediato em loop transforma incidente pequeno em avalanche.
- **Idempotência** em operação reexecutável (webhook, retry, reprocessamento de fila) — sem isso, retry vira cobrança duplicada.
- Transação atômica onde múltiplas escritas precisam ser consistentes; definir o comportamento em falha parcial.
- Degradação graciosa: funcionalidade secundária cai, núcleo continua.
- Migração de schema de banco com caminho de rollback definido antes de aplicar (rollback de *deploy/infraestrutura* como um todo está em `arquitetura-infraestrutura-deploy`).
- Identificar race conditions em escrita concorrente; lock ou controle otimista onde necessário.

## Observabilidade

- Log estruturado com timestamp, severidade e identificador de correlação para rastrear requisição ponta a ponta.
- `ERROR` é o que exige ação humana — não poluir com ruído informativo.
- Contexto suficiente para debugar sem reproduzir. "Erro ao processar" sem identificar o quê é log inútil.
- Nunca logar segredo ou dado pessoal.
- Métricas de saúde em serviço de longa duração: latência, taxa de erro, throughput. Health check quando houver orquestrador.

## Testes

- Pirâmide: muitos unitários (rápidos, isolados), alguns de integração, poucos end-to-end.
- Unitário não toca rede, banco nem disco — se toca, é de integração.
- Cobrir: caminho feliz, entrada inválida/nula/vazia, valor no limite exato de uma regra, falha da dependência externa.
- Teste de regressão a cada bug corrigido — bug que voltou é bug sem teste.
- Teste deve ser determinístico. Teste intermitente é pior que teste ausente: treina a equipe a ignorar falha.
- Dado de teste isolado; nunca rodar suíte contra base de produção.

## Uso de IA no código

- Código gerado por IA é rascunho revisável. O risco não é código que quebra — é código sintaticamente perfeito e logicamente errado, que passa em revisão superficial.
- Nunca inventar nome de função, parâmetro de biblioteca, endpoint ou comportamento de framework. Sem certeza, verificar em vez de produzir algo plausível.
- Ao replicar padrão existente do projeto, verificar se o padrão está correto antes de propagá-lo — copiar um erro consistentemente não o torna certo.
- Havendo mais de uma abordagem viável, apresentar as opções com trade-off em vez de escolher silenciosamente.

## Definição de pronto

- [ ] Caminho feliz e bordas identificadas funcionam
- [ ] Erros tratados explicitamente, sem falha silenciosa
- [ ] Nenhum segredo hardcoded nem em log
- [ ] Entrada validada; query parametrizada
- [ ] Autorização no servidor, no nível do recurso
- [ ] Sem N+1; índices existem; listas paginadas
- [ ] Timeout em toda chamada externa
- [ ] Teste no nível da criticidade, passando
- [ ] Log com contexto suficiente para debugar sem reproduzir
- [ ] Dependências novas verificadas e justificadas
- [ ] Premissas de negócio não-óbvias documentadas
- [ ] Limitações conhecidas declaradas ao usuário
