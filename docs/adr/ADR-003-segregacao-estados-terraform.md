# ADR-003: Segregação de estados do Terraform por stack

- **Status:** Aceito
- **Data:** 2026-09-15

## Contexto

Na Fase 2, VPC, cluster EKS e instância RDS conviviam em **um único estado**
Terraform. Isso significa que um `terraform destroy` do cluster colocava o banco
de dados de produção no mesmo raio de destruição.

## Decisão

Separar em **estados independentes**, com chaves distintas no bucket S3:

| Stack | Chave de estado | Conteúdo |
|---|---|---|
| `terraform/k8s` | `k8s/<env>/terraform.tfstate` | VPC, EKS, node groups, addons |
| `terraform/db` | `db/<env>/terraform.tfstate` | RDS, Secrets Manager, security groups |
| `lambda-auth/terraform` | `lambda-auth/<env>/terraform.tfstate` | Lambda, API Gateway, IAM |
| `terraform/monitoring` | `monitoring/terraform.tfstate` | Dashboards e monitores Datadog |

A comunicação entre stacks ocorre por `terraform_remote_state` somente leitura:
o stack de banco lê `vpc_id`, `private_subnets` e `node_security_group_id` do
stack de Kubernetes.

## Justificativa

- **Raio de destruição isolado:** recriar o cluster não ameaça o banco.
- **Ciclos de vida diferentes:** o cluster muda com frequência; o banco é estável.
- **Permissões distintas:** o pipeline de aplicação não precisa de poder sobre RDS.
- **Plano menor e mais legível** em cada Pull Request.

## Consequências

**Positivas**
- `deletion_protection` em produção somado a guardrail no pipeline que falha o PR
  se o plano indicar `delete` sobre `aws_db_instance`.
- Ambientes `homolog` e `prod` isolados pela chave de estado.

**Negativas**
- Ordem de aplicação passa a importar: `k8s` antes de `db` antes de `lambda-auth`.
- Mudanças que atravessam stacks exigem dois Pull Requests coordenados.
