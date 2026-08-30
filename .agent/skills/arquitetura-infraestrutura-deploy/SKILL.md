---
name: arquitetura-infraestrutura-deploy
description: Decisões de infraestrutura e deploy — onde e como o sistema roda, paridade de ambientes, pipeline de CI/CD, infraestrutura como código, estratégia de deploy (rolling/blue-green/canary), backup e disaster recovery, e custo como requisito não-funcional. Use SEMPRE que o usuário pedir para decidir hospedagem, montar pipeline de CI/CD, containerizar aplicação, definir estratégia de deploy, planejar backup/recuperação de desastre, ou perguntar "como subir isso para produção", "que infra usar", "como escalar isso". NÃO cobre resiliência de código de aplicação (timeout, retry, idempotência — isso é `padroes-engenharia-software`) nem cálculo de teste (isso é `qa-sistemas-proprios`) — esta skill é a camada de ambiente/pipeline/operação, não a de código.
---

# Arquitetura de Infraestrutura e Deploy

Decide onde e como o sistema roda — a camada que fica entre "o código está pronto" e "o usuário está usando em produção". Complementa `padroes-engenharia-software` (que cobre resiliência dentro do código) sem repeti-la.

## Princípio central

Decisão de infra é trade-off entre custo, complexidade operacional e confiabilidade — nunca "qual tecnologia é mais moderna". Kubernetes para um projeto solo de baixo tráfego é over-engineering tão real quanto pular teste em sistema crítico é sub-engineering. O nível de sofisticação de infra deve ser proporcional à escala e criticidade declaradas no projeto, não ao que é tendência.

## Escolha de hospedagem

- **Gerenciado (PaaS/serverless) vs. auto-hospedado (VM/container próprio):** gerenciado custa mais por unidade de recurso, mas elimina operação (patch de SO, backup de infra, scaling manual) — vale para time pequeno ou solo. Auto-hospedado compensa em escala grande e previsível, onde o custo operacional se dilui.
- Decida com base em: tamanho e expertise do time (não em "o que todo mundo usa"), previsibilidade de custo, e criticidade declarada do sistema.
- Evitar a armadilha comum: adotar a arquitetura de infra de uma empresa 100x maior "para já vir pronta para escalar" — a complexidade extra tem custo hoje, o benefício é hipotético e distante.

## Paridade de ambientes

- Dev, staging e produção devem rodar a **mesma imagem/build**, com configuração diferente só via variável de ambiente — nunca código diferente entre ambientes.
- Divergência de configuração entre ambientes é causa recorrente do clássico "funciona na minha máquina" — elimine na origem, não com mais log.
- Staging deve espelhar produção o suficiente para pegar problema de integração antes do usuário — se staging usa dado ou versão muito diferente de produção, ele não está cumprindo a função.

## Infraestrutura como código (IaC)

- Configuração de infra (rede, banco, permissão, variável de ambiente) versionada em arquivo — Terraform, CloudFormation, Pulumi, ou até um `docker-compose.yml` bem estruturado para escala menor.
- Mudança manual direto no console/servidor ("ClickOps") é mudança não documentada e não reproduzível — se a instância cair, ninguém sabe como ela foi montada.
- **Diff de infraestrutura antes de aplicar, sempre.** Uma mudança de IaC aplicada sem revisão pode destruir recurso em produção — isso é tão crítico quanto revisar código antes de merge.

## Pipeline de CI/CD

Estágios mínimos, nesta ordem: build → teste automatizado → verificação de dependência/segurança → deploy.

- Deploy deve ser automatizado e repetível — passo manual documentado em wiki não é pipeline, é ritual que alguém vai esquecer sob pressão.
- Pipeline falha o build se teste falhar — sem exceção "só dessa vez".
- Verificação de dependência (pacote vulnerável ou desatualizado) faz parte do pipeline, não é etapa manual esporádica.

## Estratégia de deploy

- **Rolling, blue-green ou canary** conforme a criticidade: sistema que não tolera downtime precisa de blue-green ou canary; sistema de baixa criticidade pode aceitar rolling simples.
- **Plano de rollback definido antes do deploy, nunca improvisado durante o incidente.** Se a pergunta "como eu volto atrás nisso" só é respondida depois que já quebrou, o plano de deploy está incompleto.
- Feature flag para desacoplar deploy de código de liberação de funcionalidade — permite reverter comportamento sem reverter deploy inteiro.

## Segredos e configuração (perspectiva de operação)

- Segredo é injetado no momento do deploy via secrets manager ou variável de ambiente — nunca embutido na imagem/build. Imagem deve ser agnóstica de ambiente.
- Rotação de credencial deve ser possível sem rebuild de aplicação — se trocar uma chave exige novo deploy completo, isso é um defeito de arquitetura de configuração.

## Backup e disaster recovery

- **Backup sem teste de restauração periódico não é backup, é suposição.** Teste de restore deve fazer parte da rotina, não ser descoberto como quebrado no momento da emergência real.
- Definir explicitamente **RPO** (quanto dado se pode perder) e **RTO** (quanto tempo até voltar a operar) para qualquer sistema com dado real — sem esses dois números, "temos backup" não significa nada operacional.
- Backup replicado em local diferente da infraestrutura principal — backup na mesma região/provedor que pode cair junto não cobre o cenário que mais importa.

## Custo como requisito não-funcional

- Custo não é detalhe financeiro à parte — é requisito não-funcional como performance e segurança, e deve ser considerado na escolha de arquitetura, não descoberto na fatura do mês seguinte.
- Atenção a: recurso provisionado e ocioso, custo de egress de dado entre provedores/regiões, instância superdimensionada "para garantir".

## Uso de IA em decisão de infraestrutura

- **Nunca aplicar mudança de IaC sugerida por IA direto em produção sem revisar o diff.** Uma sugestão de infraestrutura plausível e errada pode destruir recurso real — o risco aqui é maior que em código de aplicação, porque o efeito colateral (deletar banco, remover permissão) muitas vezes não é reversível.
- IA pode acelerar o rascunho de pipeline ou de arquivo de IaC — trate como esboço técnico a validar contra o ambiente real, nunca como comando a executar às cegas.

## Checklist antes de considerar o deploy pronto

- [ ] Ambientes com mesma imagem/build, config isolada por variável de ambiente
- [ ] Infraestrutura versionada como código, sem mudança manual não documentada
- [ ] Pipeline com teste e verificação de dependência antes do deploy
- [ ] Plano de rollback definido e testado, não improvisado
- [ ] Segredo injetado em runtime, nunca embutido na imagem
- [ ] Backup com teste de restauração recente; RPO/RTO definidos
- [ ] Custo avaliado como parte da decisão de arquitetura, não só depois
- [ ] Mudança de infraestrutura sugerida por IA revisada antes de aplicar
