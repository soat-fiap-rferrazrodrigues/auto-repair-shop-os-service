# ADR-005 — Mensageria assíncrona com SNS + SQS

**Status:** Aceito · **Data:** 2026-11-16

## Contexto
A saga (ADR-004) precisa de comandos e eventos confiáveis entre os três serviços.
Requisitos:
- entrega garantida;
- retentativas;
- isolamento de falhas;
- nenhum serviço acessa o banco de outro;
- baixo custo operacional, já que a plataforma está na AWS (RFC-001).

## Decisão
Usar **SNS para publicação (fan-out) e SQS para consumo**:

| Tópico (produtor) | Fila (consumidor) | Filtro |
|---|---|---|
| `os-commands` (os) | `billing-commands` | `type` com prefixo `billing.` |
| `os-commands` (os) | `execution-commands` | `type` com prefixo `execution.` |
| `billing-events` / `execution-events` | `os-saga-events` | — |

- Cada fila tem DLQ (`maxReceiveCount=5`) e alarme no CloudWatch.
- `correlation_id` = `orderId`.
- A mensagem só é apagada após processamento com sucesso. Como a entrega é *at-least-once*, todos os handlers são idempotentes:
  - billing: `orderId` único;
  - execution: TransactWrite condicional;
  - os: transições inválidas são ignoradas.
- Permissões via IRSA: cada ServiceAccount só publica no próprio tópico e só lê a própria fila.

## Alternativas
- **RabbitMQ / Kafka (MSK):** mais recursos, mas exigem cluster próprio, upgrades e monitoramento. Kafka é excessivo para o volume de uma oficina.
- **EventBridge:** roteamento rico, mas sem fila de consumo própria nem DLQ por consumidor tão simples quanto SQS.
- **REST síncrono entre serviços:** acoplamento temporal. Uma indisponibilidade do billing travaria a abertura de OS.

## Consequências
- ✅ Gerenciado, *serverless*, com custo próximo de zero no volume atual.
- ✅ Um serviço fora do ar não perde mensagens: elas ficam na fila.
- ✅ Um novo consumidor entra só com uma nova assinatura, sem mudar produtores.
- ⚠️ Sem ordenação garantida (filas Standard); a máquina de estados da OS tolera eventos fora de ordem.
- ⚠️ Sem *outbox*: falha entre o commit e o publish pode perder um comando. Mitigação futura: tabela outbox + relay.
- ⚠️ Localmente, os serviços usam `LoggingMessagePublisher` quando as variáveis de ambiente não estão definidas.
