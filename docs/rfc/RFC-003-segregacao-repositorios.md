# RFC-003: Segregação em quatro repositórios

- **Status:** Aprovado
- **Data:** 2026-09-15

## Resumo

Dividir o monorepo atual em quatro repositórios independentes, cada um com seu
pipeline de CI/CD e regras de proteção de branch.

## Motivação

Aplicação, infraestrutura e função serverless têm **ciclos de vida, riscos e
permissões diferentes**. Mantê-los juntos significa que um ajuste de código
dispara planos de infraestrutura, e que o pipeline da aplicação precisa de
credenciais com poder para destruir o banco de dados.

## Proposta

| # | Repositório | Conteúdo | Gatilho de deploy |
|---|---|---|---|
| 1 | `auto-repair-shop-api` | NestJS, Dockerfile, testes | Build de imagem + rollout |
| 2 | `auto-repair-auth-lambda` | Função CPF→JWT, API Gateway | Empacota e aplica Terraform |
| 3 | `auto-repair-infra-k8s` | Terraform VPC/EKS + manifests | Aplica cluster e manifests |
| 4 | `auto-repair-infra-db` | Terraform RDS + Secrets Manager | Aplica banco |

### Ordem de provisionamento

```
infra-k8s  →  infra-db  →  lambda-auth  →  api
  (VPC)       (usa VPC)    (usa VPC+DB)   (usa cluster)
```

### Regras de proteção (idênticas nos quatro)

- Branch `main` protegida: **sem commits diretos**.
- Merge exclusivamente via **Pull Request** com no mínimo 1 aprovação.
- Status checks obrigatórios: `lint`, `test`, `build` (aplicação) ou
  `fmt`/`validate`/`plan` (infraestrutura).
- Histórico linear e force-push desabilitado.
- `CODEOWNERS` exigindo revisão do time de arquitetura nos repositórios de infra.

### Ambientes

| Branch | Ambiente | Deploy |
|---|---|---|
| `homolog` | Homologação | Automático após merge |
| `main` | Produção | Automático **com aprovação manual** no GitHub Environment |

## Justificativa

1. **Princípio do menor privilégio:** cada pipeline assume um papel IAM distinto.
2. **Blast radius reduzido:** conforme ADR-003.
3. **Planos de Terraform menores**, facilitando a revisão em PR.
4. **Cadência independente:** a aplicação faz deploy várias vezes ao dia; o banco,
   raramente.

## Consequências

**Negativas**
- Mudanças que atravessam repositórios exigem coordenação de PRs.
- Duplicação de configuração de pipeline. *Mitigação:* reusable workflows.
- Promoção da versão da imagem entre repositórios precisa de mecanismo explícito
  (tag versionada referenciada no repositório de infraestrutura).
