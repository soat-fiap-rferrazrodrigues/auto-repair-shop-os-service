# auto-repair-infra-k8s

Cluster Kubernetes, manifests da aplicação e observabilidade da plataforma
Auto Repair Shop.

## Conteúdo

| Caminho | Descrição |
|---|---|
| `terraform/k8s/` | VPC, EKS 1.29 e managed node group (t3.medium, 2–5 nós) |
| `terraform/monitoring/` | Dashboards, monitores e synthetic tests no Datadog |
| `k8s/` | Deployment, Service, HPA, ConfigMap, External Secrets e Datadog Agent |
| `.github/workflows/infra-k8s.yml` | Plan em PR, apply em homolog e produção |

Este repositório **não** provisiona o banco de dados. O RDS vive em
`auto-repair-infra-db` e é consumido aqui via remote state.

## Pré-requisitos

- Terraform >= 1.5.0
- AWS CLI autenticado (localmente) — o pipeline usa OIDC, sem chaves estáticas
- Bucket S3 `auto-repair-terraform-state` para o state remoto

## Ordem de provisionamento

Este é o **primeiro** stack a ser aplicado: ele exporta a VPC e as subnets
privadas consumidas pelos repositórios de banco e da função de autenticação.

```bash
cd terraform/k8s

terraform init -backend-config="key=k8s/homolog/terraform.tfstate"
terraform plan  -var="environment=homolog"
terraform apply -var="environment=homolog"

aws eks update-kubeconfig --name auto-repair-homolog --region us-east-1
```

## Aplicando os manifests

```bash
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/external-secrets.yaml
kubectl apply -f k8s/datadog-agent.yaml
kubectl apply -f k8s/api-deployment.yaml
kubectl apply -f k8s/api-service.yaml
kubectl apply -f k8s/hpa.yaml
```

As credenciais do banco e a chave do Datadog não estão em nenhum manifest:
são sincronizadas do AWS Secrets Manager pelo External Secrets Operator.

## Observabilidade

```bash
cd terraform/monitoring

terraform init -backend-config="key=monitoring/homolog/terraform.tfstate"
terraform apply \
  -var="environment=homolog" \
  -var="datadog_api_key=$DD_API_KEY" \
  -var="datadog_app_key=$DD_APP_KEY" \
  -var="api_base_url=$API_URL"
```

## Secrets do repositório

| Secret | Uso |
|---|---|
| `AWS_ROLE_ARN` | Role assumida via OIDC pelo pipeline |
| `DD_API_KEY` / `DD_APP_KEY` | Provider do Datadog |

## Branch protection

`main` é protegida: exige Pull Request aprovado e o job de `plan` verde.
O push em `homolog` publica automaticamente; produção exige aprovação manual
através do GitHub Environment `production`.
