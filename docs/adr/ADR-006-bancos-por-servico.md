# ADR-006 — Banco de dados por serviço (PostgreSQL + DynamoDB)

**Status:** Aceito · **Data:** 2026-11-16

## Contexto
Cada microsserviço deve ter base própria, com ao menos uma SQL e uma NoSQL, e
nenhum serviço pode ler o banco de outro.

## Decisão

| Serviço | Banco | Motivo |
|---|---|---|
| os-service | PostgreSQL (RDS existente) | Modelo relacional rico (clientes, veículos, OS, itens); relatórios com JOIN e agregação |
| billing-service | PostgreSQL (RDS exclusivo) | Dados financeiros exigem ACID, unicidade (`orderId`) e auditoria; consultas por status e período |
| execution-service | DynamoDB | Acesso por chave e fila FIFO; escrita intensa de mudanças de status; escala sob demanda sem gerenciar instância |

### Modelo do DynamoDB (single-table)

| Item | `pk` | `sk` | `gsi1pk` / `gsi1sk` |
|---|---|---|---|
| Execução | `EXEC#<orderId>` | `EXEC` | `QUEUE` / `<enqueuedAt>`, somente enquanto não está `FINISHED` (índice esparso) |
| Estoque | `PART#<partId>` | `STOCK` | — |

A reserva de peças e o enfileiramento acontecem num único `TransactWriteItems`,
com condição `quantity >= n` e `attribute_not_exists(pk)`. A operação é atômica e
idempotente sem precisar de lock.

## Alternativas
- **MongoDB / DocumentDB para execução:** exigiria um cluster dedicado. O DynamoDB é serverless e se integra ao IAM (IRSA), sem senha.
- **Banco único com schemas separados:** mais barato, mas reintroduz acoplamento e um ponto único de falha.

## Consequências
- ✅ Isolamento real, garantido por security group (RDS) e IAM (DynamoDB).
- ✅ O execution escala independentemente, com PITR e criptografia.
- ⚠️ Relatórios que cruzam domínios precisam de composição via API ou eventos; não há JOIN entre serviços.
- ⚠️ Os dados de peças usados pela execução chegam no payload do comando `ReserveAndEnqueue`.
