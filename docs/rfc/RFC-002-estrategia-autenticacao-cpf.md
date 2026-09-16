# RFC-002: Estratégia de autenticação por CPF

- **Status:** Aprovado com ressalvas
- **Data:** 2026-09-15

## Resumo

Definir como o cliente final se autentica para consultar suas ordens de serviço,
atendendo ao requisito de "proteger rotas sensíveis com autenticação via CPF".

## Motivação

O cliente da oficina não possui senha cadastrada. Exigir registro tradicional
criaria atrito em um fluxo cuja finalidade é apenas consultar o andamento do
próprio serviço.

## Proposta

Função serverless `POST /auth/token` que:

1. Normaliza e valida o CPF (dígitos verificadores, sequências inválidas).
2. Consulta `clients.cpfCnpj` no PostgreSQL.
3. Emite JWT HS256 com escopo restrito ao `clientId` do cliente.

```jsonc
// Requisição
{ "cpf": "529.982.247-25" }

// Resposta 200
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "client": { "id": "uuid", "name": "Maria Silva" }
}
```

### Códigos de resposta

| Código | Situação |
|---|---|
| 400 | CPF ausente ou inválido |
| 404 | Cliente não cadastrado |
| 403 | Cliente inativo |
| 503 | Banco indisponível |

## Segurança

### Ressalva registrada (LGPD)

CPF é um identificador **público-adjacente**, não um segredo. Autenticar apenas
com CPF permite que um terceiro que conheça o número consulte dados da OS
(veículo, placa, valores). Trata-se de risco aceito **apenas para o escopo
acadêmico** deste desafio.

### Mitigações implementadas

- **Escopo mínimo no token:** `role: client` e `clientId` fixo; o cliente só
  acessa a própria OS (verificação em `TrackOrderUseCase`).
- **Expiração curta:** 1 hora.
- **Mascaramento em log:** `maskCpf()` grava `529*****25`, nunca o CPF completo.
- **Throttling no API Gateway:** 100 req/s com burst de 200, dificultando
  enumeração de CPFs.
- **Resposta uniforme:** mensagens genéricas evitam confirmar existência de cadastro.

### Evolução recomendada para produção real

Adicionar **segundo fator OTP** enviado ao e-mail ou telefone já cadastrados do
cliente, transformando o fluxo em posse (CPF) + prova (código). Requer definição
de provedor de e-mail/SMS.

## Alternativas descartadas

| Alternativa | Motivo |
|---|---|
| CPF + senha | Atrito alto; requer cadastro prévio |
| Magic link por e-mail | Depende de e-mail atualizado; fora do escopo |
| Cognito | Complexidade e custo desproporcionais ao caso de uso |
