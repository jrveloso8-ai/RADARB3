---
name: qa-sistemas-proprios
description: Aprofundamento técnico de QA para qualquer desenvolvedor — técnicas de design de teste (particionamento de equivalência, valor limite, tabela de decisão), priorização de esforço por risco, teste exploratório estruturado, validação de dado externo, e uso crítico de IA na geração de testes. Complementa (não repete) o checklist rápido de testes já coberto pela skill padroes-engenharia-software. Use SEMPRE que o usuário pedir para "projetar casos de teste", "cobri todos os casos?", "que testes eu deveria rodar nisso", "revisar antes de subir para produção", ou depois de mudança em lógica de negócio crítica (cálculo, regra de decisão, validação). Dispare também quando o checklist básico de teste não for suficiente para decidir o que testar e com que profundidade.
---

# QA — Técnicas de Teste em Profundidade

Este é o aprofundamento de "como projetar teste bem", não o checklist de "o que não pode faltar" (isso está em `padroes-engenharia-software`). Útil sobretudo em contexto solo, sem QA dedicado nem segundo revisor humano constante — aqui o papel de "advogado do diabo" precisa ser assumido deliberadamente, inclusive revisando o próprio código com essa lente separada da lente de quem construiu.

## Princípio central

Separe o chapéu de "quem construiu" do chapéu de "quem valida". A pergunta não é "isso funciona no caso que eu tinha em mente" — é "o que quebra isso, e o que eu não pensei". Testar só o caminho feliz é o erro mais comum e mais caro em qualquer sistema.

## Técnicas de design de teste

- **Particionamento de equivalência + valor limite.** Para qualquer função que recebe valor numérico ou de faixa, teste: valor típico, zero, negativo, valor exatamente no limite de uma regra de negócio (ex.: no dia exato do vencimento de um prazo, não um dia antes ou depois), e valor extremo/fora do esperado.
- **Tabela de decisão para lógica com múltiplas condições.** Quando uma função combina 3+ condições (ex.: elegibilidade que depende de status + data + permissão), monte a tabela de combinações antes de testar — testar só os casos "óbvios" deixa combinação rara sem cobertura, que é justamente onde bug se esconde.
- **Teste exploratório com tempo alocado, não improviso.** Depois dos testes automatizados passarem, reserve um tempo curto e deliberado para tentar "quebrar" o sistema manualmente sem script — inserir dado malformado, cortar conexão no meio de uma chamada, repetir a mesma operação duas vezes seguidas, simular concorrência. Ferramenta automatizada não substitui isso.

## Priorização por risco — nem tudo pede o mesmo rigor

Classifique antes de testar, na mesma lógica de criticidade usada no restante do desenvolvimento:

- **Risco de negócio direto** (cálculo que decide dinheiro, permissão, elegibilidade, ou qualquer resultado que afeta o usuário de forma irreversível): rigor máximo — teste unitário obrigatório com valor de referência conhecido, mais teste de regressão a cada mudança.
- **Risco de dado externo** (qualquer pipeline que consome API, arquivo ou fonte de terceiro): teste de contrato de dado (schema esperado) e teste de comportamento com dado ausente/corrompido — fonte externa manda dado ruim com mais frequência do que se espera.
- **Risco de apresentação** (UI, formatação visual, texto): validação manual é aceitável — não vale o mesmo investimento de automação que o risco de negócio direto.

Testar UI e cálculo crítico com o mesmo nível de esforço é desperdício de tempo num lado e risco no outro — a priorização em si é parte do trabalho de QA, não um atalho.

## Validação de dado externo

- Validar contra uma segunda fonte quando possível, antes de confiar em pipeline novo.
- Checar timezone e formato de data/hora explicitamente — erro de fuso é causa recorrente de bug silencioso em dado histórico ou agendado.
- Tratar ausência ou atraso de dado como caso de teste obrigatório, não exceção — toda fonte externa falha ou atrasa em algum momento.

## Uso de IA na geração e execução de testes

- IA é útil para gerar rascunho de casos de teste a partir de especificação ou user story — mas a cobertura sugerida tende a parecer mais completa do que é. Trate como ponto de partida, não checklist final: sempre adicione manualmente os casos de borda específicos do domínio que a IA não tem contexto suficiente para prever.
- **Self-healing de teste automatizado é risco, não conveniência.** Se um framework "conserta sozinho" um teste que quebrou, isso pode mascarar mudança real de comportamento que deveria gerar alerta — nunca aceitar correção automática silenciosa em teste de lógica crítica sem revisar o motivo da quebra original.
- IA pode ajudar a gerar dado sintético de teste — mas valide que a distribuição gerada é plausível antes de tirar conclusão de robustez a partir dela.

## Checklist antes de dar "sinal verde"

- [ ] Caminho feliz E pelo menos 2 casos de borda testados por função de risco direto
- [ ] Comportamento com dado externo ausente/corrompido testado, não só assumido
- [ ] Cálculo ou regra crítica validada contra valor de referência conhecido
- [ ] Timezone e datas-limite tratados explicitamente onde aplicável
- [ ] Teste exploratório manual feito, não só suíte automatizada
- [ ] Casos de teste gerados por IA revisados e complementados manualmente
