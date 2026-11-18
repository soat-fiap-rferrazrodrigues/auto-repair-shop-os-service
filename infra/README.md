# infra/ — Fase 4 (microsserviços)

Infraestrutura nova dos microsserviços. A infraestrutura existente (VPC, EKS e o
RDS do os-service) fica em `auto-repair-infra-k8s` e `auto-repair-infra-db`. Estas
pastas devem ser copiadas para lá:

| Pasta | Repositório destino | Chave de state |
|---|---|---|
| `terraform/microservices-data/` | `auto-repair-infra-db` | `microservices-data/<env>/terraform.tfstate` |
| `terraform/messaging/` | `auto-repair-infra-k8s` | `messaging/<env>/terraform.tfstate` |
| `terraform/observability/` | `auto-repair-infra-k8s` | `observability/<env>/terraform.tfstate` |
| `k8s/*.yaml` | `auto-repair-infra-k8s/k8s/` | — |

## Ordem de aplicação (ADR-003)
`k8s` → `db` → **`microservices-data`** → **`messaging`** → manifests.

```bash
cd terraform/microservices-data
terraform init -backend-config="key=microservices-data/homolog/terraform.tfstate"
terraform apply -var="environment=homolog"

cd ../messaging
terraform init -backend-config="key=messaging/homolog/terraform.tfstate"
terraform apply -var="environment=homolog"
terraform output service_env        # valores para os ConfigMaps
terraform output service_role_arns  # anotações dos ServiceAccounts
```

Depois, preencha o segredo do Mercado Pago, que nunca entra no código:
```bash
aws secretsmanager put-secret-value \
  --secret-id auto-repair-homolog/billing-service/mercadopago \
  --secret-string '{"MP_ACCESS_TOKEN":"TEST-...","MP_WEBHOOK_SECRET":"..."}'
```

O `JWT_SECRET` é lido do segredo já existente `auto-repair-<env>/api` (o mesmo do os-service).

Por fim, troque `ACCOUNT_ID`, `ENV` e `API_HOST` nos manifests e aplique.

## Recursos

**microservices-data**
- RDS PostgreSQL exclusivo do billing (SQL), com credenciais no Secrets Manager. Em produção: Multi-AZ, deletion protection e 30 dias de backup.
- Tabela DynamoDB do execution (NoSQL), com GSI esparso para a fila, PITR, criptografia e deletion protection em produção.

**messaging**
- Tópicos SNS: `os-commands`, `billing-events` e `execution-events`.
- Filas SQS:
  - `billing-commands`: recebe do `os-commands`, com filtro `type` de prefixo `billing.`;
  - `execution-commands`: recebe do `os-commands`, com filtro de prefixo `execution.`;
  - `os-saga-events`: recebe de `billing-events` e `execution-events`.
- Cada fila tem DLQ (`maxReceiveCount=5`, retenção de 14 dias) e alarme no CloudWatch quando a DLQ recebe mensagens.
- IRSA: uma role por ServiceAccount. Cada serviço só publica no próprio tópico e só consome a própria fila; o execution também tem acesso apenas à sua tabela.

Nenhum serviço tem credencial de outro banco. O isolamento é garantido por IAM e por security group.

**observability** (Datadog; requer `DD_API_KEY`/`DD_APP_KEY` no ambiente)
- DLQ com mensagens (qualquer fila da saga) e fila atrasada (idade da mensagem mais antiga > 5 min).
- Compensações da saga acima de 5/h e excesso de eventos ignorados (fora de ordem/duplicados), via logs.
- Por serviço: taxa de erro 5xx, latência p95 e réplicas indisponíveis.
- Dashboard "Saga OS" com filtro por `orderId` nos logs dos três serviços.

```bash
cd terraform/observability
terraform init -backend-config="key=observability/homolog/terraform.tfstate"
terraform apply -var="environment=homolog" -var='notify=["@slack-oficina-alertas"]'
```
