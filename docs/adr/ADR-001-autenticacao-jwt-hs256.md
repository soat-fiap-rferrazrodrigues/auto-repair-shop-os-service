# ADR-001: Autenticação por CPF com JWT HS256 e segredo compartilhado

- **Status:** Aceito
- **Data:** 2026-09-15
- **Decisores:** Time de Arquitetura

## Contexto

A autenticação do cliente deve ocorrer em uma função serverless, fora do cluster,
enquanto as rotas protegidas são servidas pela aplicação NestJS no Kubernetes.
Ambos precisam concordar sobre a validade do token.

Alternativas avaliadas:

1. **HS256 com segredo compartilhado** — Lambda e API assinam/validam com a mesma chave.
2. **RS256 com JWKS** — Lambda assina com chave privada; API valida pela pública.
3. **Amazon Cognito** — provedor gerenciado emitindo os tokens.

## Decisão

Adotar **JWT HS256 com `JWT_SECRET` compartilhado**, armazenado no AWS Secrets
Manager e injetado na Lambda (variável de ambiente via Terraform) e na API
(via External Secrets Operator).

## Justificativa

- A API **já valida HS256** (`JwtStrategy`), então não há reescrita do guard.
- Menor latência: validação local, sem busca de JWKS a cada requisição.
- Menor custo e complexidade operacional que o Cognito para o escopo do desafio.
- O segredo nunca aparece em Git; a rotação é feita no Secrets Manager.

## Consequências

**Positivas**
- Contrato único de token, centralizado em `AuthMapper` e coberto por testes nos dois lados.
- Emissor identificado pela claim `iss`, permitindo auditar a origem do token.

**Negativas**
- Segredo simétrico: quem valida também consegue emitir. Mitigado por IAM restrito
  e por rotação periódica.
- Rotação exige atualização coordenada dos dois consumidores.

**Trigger de revisão**
Migrar para RS256/JWKS caso surjam novos serviços consumidores do token, quando o
acoplamento do segredo simétrico passar a ser um risco relevante.
