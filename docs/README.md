# Documentação Arquitetural — Auto Repair Shop

Documentação da plataforma de gestão de oficina, elevada a operação corporativa
com API Gateway, autenticação serverless, Kubernetes escalável e observabilidade.

## Índice

### Diagramas
- [Diagrama de Componentes](diagrams/component-diagram.md) — visão de nuvem, APIs, banco e monitoramento
- [Diagramas de Sequência](diagrams/sequence-diagrams.md) — autenticação por CPF e abertura de OS

### Banco de Dados
- [Modelo de Dados e Justificativa](database/data-model.md) — ER, relacionamentos e escolha do PostgreSQL

### ADRs — Decisões arquiteturais permanentes
- [ADR-001](adr/ADR-001-autenticacao-jwt-hs256.md) — Autenticação JWT HS256 com segredo compartilhado
- [ADR-002](adr/ADR-002-escalabilidade-hpa.md) — Escalabilidade via Horizontal Pod Autoscaler
- [ADR-003](adr/ADR-003-segregacao-estados-terraform.md) — Segregação de estados do Terraform
- [ADR-004](adr/ADR-004-saga-orquestrada.md) — Saga orquestrada para o fluxo da OS
- [ADR-005](adr/ADR-005-mensageria-sns-sqs.md) — Mensageria assíncrona com SNS + SQS
- [ADR-006](adr/ADR-006-bancos-por-servico.md) — Banco por serviço (PostgreSQL + DynamoDB)

### RFCs — Decisões técnicas relevantes
- [RFC-001](rfc/RFC-001-escolha-da-nuvem.md) — Escolha do provedor de nuvem
- [RFC-002](rfc/RFC-002-estrategia-autenticacao-cpf.md) — Estratégia de autenticação por CPF
- [RFC-003](rfc/RFC-003-segregacao-repositorios.md) — Segregação em quatro repositórios

## Mapa dos quatro repositórios

| # | Repositório | Conteúdo neste workspace |
|---|---|---|
| 1 | `auto-repair-os-service` (antigo `auto-repair-shop-api`) | `src/`, `Dockerfile`, `.github/workflows/ci-cd.yml` |
| 2 | `auto-repair-auth-lambda` | `lambda-auth/` |
| 3 | `auto-repair-infra-k8s` | `terraform/k8s/`, `k8s/`, `.github/workflows/infra-k8s.yml` |
| 4 | `auto-repair-infra-db` | `terraform/db/`, `.github/workflows/infra-db.yml` |

> O stack `terraform/monitoring/` (dashboards e alertas Datadog) acompanha o
> repositório de infraestrutura Kubernetes.

### Gerando os repositórios

O script abaixo materializa esse mapa, já sem `node_modules`, `.terraform`,
states e segredos, e com um `.gitignore` adequado em cada pasta:

```bash
./scripts/split-repos.sh
```

O resultado fica em `repos/` (ignorado pelo Git). Basta mover cada pasta para
fora do projeto e publicá-la:

```bash
mv repos/auto-repair-infra-db ~/Documents/
cd ~/Documents/auto-repair-infra-db
git init && git add . && git commit -m "chore: initial commit"
gh repo create soat-fiap-rferrazrodrigues/auto-repair-infra-db --private --source=. --push
```

Depois, em cada repositório: proteger a branch `main` exigindo Pull Request,
criar os Environments `homolog` e `production` (com required reviewer em
produção) e cadastrar os secrets listados no README correspondente.


## Ordem de provisionamento

```bash
# 1. Cluster e rede (exporta vpc_id, subnets, node security group)
cd terraform/k8s && terraform init && terraform apply -var="environment=homolog"

# 2. Banco gerenciado (consome a rede do stack anterior)
cd terraform/db && terraform init && terraform apply -var="environment=homolog"

# 3. Função de autenticação e API Gateway
cd lambda-auth && npm run package
cd terraform && terraform init && terraform apply \
  -var="environment=homolog" \
  -var="jwt_secret=$JWT_SECRET" \
  -var="api_backend_url=$API_URL"

# 4. Observabilidade
cd terraform/monitoring && terraform init && terraform apply \
  -var="api_base_url=$API_URL"
```

## Requisitos e onde foram atendidos

| Requisito | Implementação |
|---|---|
| API Gateway | `lambda-auth/terraform/api-gateway.tf` |
| Function serverless de autenticação | `lambda-auth/src/handler.ts` |
| Validação de CPF | `lambda-auth/src/cpf.ts` |
| Banco gerenciado | `terraform/db/rds.tf` |
| Cluster com escalabilidade | `terraform/k8s/eks.tf` + `k8s/hpa.yaml` |
| Latência das APIs | `terraform/monitoring/monitors.tf` |
| Recursos do Kubernetes | `k8s/datadog-agent.yaml` |
| Healthchecks e uptime | `src/health/` + synthetic test |
| Alertas de falha em OS | `datadog_monitor.service_order_failures` |
| Logs estruturados com correlação | `src/common/logger/json.logger.ts` |
| Dashboards | `terraform/monitoring/dashboards.tf` |
```
