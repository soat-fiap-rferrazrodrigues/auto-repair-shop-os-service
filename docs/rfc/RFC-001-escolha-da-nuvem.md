# RFC-001: Escolha do provedor de nuvem

- **Status:** Aprovado
- **Autor:** Time de Arquitetura
- **Data:** 2026-09-15

## Resumo

Definir o provedor de nuvem que hospedará o cluster Kubernetes, o banco
gerenciado, a função serverless e o API Gateway da plataforma.

## Motivação

Os requisitos exigem, simultaneamente: API Gateway, função serverless, banco
gerenciado, cluster Kubernetes com escalabilidade e provisionamento por
Terraform. O provedor precisa entregar os cinco de forma integrada.

## Alternativas avaliadas

| Critério | AWS | Google Cloud | Azure |
|---|---|---|---|
| Kubernetes gerenciado | EKS | GKE (melhor DX) | AKS |
| Serverless | Lambda | Cloud Functions | Azure Functions |
| API Gateway | API Gateway v2 | API Gateway / Apigee | API Management |
| PostgreSQL gerenciado | RDS | Cloud SQL | Database for PostgreSQL |
| Gestão de segredos | Secrets Manager | Secret Manager | Key Vault |
| Maturidade Terraform | ✅ Muito alta | ✅ Alta | ⚠️ Média |
| Familiaridade do time | ✅ Alta | ⚠️ Média | ❌ Baixa |

## Proposta

Adotar a **AWS** como provedor único, na região `us-east-1`.

## Justificativa

1. **Cobertura completa** dos cinco requisitos com serviços de primeira linha.
2. **Integração nativa de identidade:** OIDC do GitHub Actions assume papel IAM,
   eliminando chaves de acesso estáticas nos pipelines.
3. **Módulos Terraform maduros** (`terraform-aws-modules/vpc` e `/eks`) reduzem
   significativamente o código de infraestrutura.
4. **Familiaridade do time**, reduzindo risco de execução no prazo do desafio.
5. **Continuidade:** a Fase 2 já havia iniciado com EKS e RDS.

## Impacto de custo

Provisionamento estimado (homolog, mensal aproximado):

| Recurso | Estimativa |
|---|---|
| EKS (control plane) | ~US$ 73 |
| 2× t3.medium | ~US$ 60 |
| NAT Gateway (único) | ~US$ 32 |
| RDS db.t3.micro | ~US$ 15 |
| Lambda + API Gateway | ~US$ 1 (baixo volume) |

Mitigação: `single_nat_gateway = true` fora de produção e destruição do ambiente
de homologação fora dos períodos de avaliação.

## Riscos

- **Vendor lock-in:** mitigado por Kubernetes (portável) e PostgreSQL (padrão).
  O acoplamento real fica restrito a Lambda e API Gateway.
- **Custo do NAT Gateway:** monitorado; pode migrar para VPC endpoints.
