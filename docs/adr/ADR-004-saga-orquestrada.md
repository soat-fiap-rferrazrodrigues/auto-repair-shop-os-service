# ADR-004 — Saga orquestrada para o fluxo da Ordem de Serviço

**Status:** Aceito · **Data:** 2026-11-16

## Contexto
Com a divisão em `os-service`, `billing-service` e `execution-service`, o fluxo
OS → orçamento → aprovação → pagamento (Mercado Pago) → execução passa a envolver
três bancos. Não é possível usar uma transação distribuída, então precisamos de
uma saga com compensações.

## Decisão
Adotar uma **saga orquestrada**, com o orquestrador (`OrderSagaOrchestrator`) no
`os-service`. A comunicação é feita por comandos e eventos em SNS/SQS.

| Evento | Ação / compensação |
|---|---|
| `BudgetGenerated` | OS → `AWAITING_APPROVAL` |
| `BudgetApproved` | OS → `AWAITING_PAYMENT`, comando `billing.CreatePayment` |
| `PaymentConfirmed` | OS → `IN_EXECUTION`, comando `execution.ReserveAndEnqueue` |
| `ExecutionFinished` | OS → `FINISHED` |
| `BudgetRejected` | OS → `RECEIVED` |
| `BudgetFailed` / `PaymentFailed` | OS → `CANCELLED` |
| `StockUnavailable` | comando `billing.RefundPayment`, OS → `CANCELLED` |

## Justificativa
- O fluxo é linear e já existia como máquina de estados (`STATUS_FLOW`).
- A OS é a dona natural do estado, e as compensações ficam num único lugar.
- O `orderId` é usado como `correlation_id`, o que permite rastrear a saga ponta a ponta no Datadog.
- Na coreografia, o rollback ficaria espalhado entre três repositórios.

## Consequências
- A saga começa ao concluir o diagnóstico (`POST /orders/:id/send-budget`): a OS vai para `AWAITING_APPROVAL` e o comando `billing.GenerateBudget` é emitido com os itens e preços congelados da OS (`{ orderId, items, total }`), já que o billing-service não acessa o banco do os-service. O `BudgetGenerated` que chega depois é tratado como no-op idempotente.
- O webhook de e-mail publica `BudgetApproved`/`BudgetRejected` no orquestrador; a aprovação leva a OS a `AWAITING_PAYMENT`, e não mais direto a `IN_EXECUTION`.
- O `os-service` passa a ser um ponto central. Ele escala horizontalmente porque é stateless e usa HPA.
- O aviso de fim da execução chega pelo evento `ExecutionFinished`, publicado pelo execution-service. Como o estoque passou a pertencer ao execution-service, o comando `execution.ReserveAndEnqueue` leva `{ orderId, paymentId, parts[] }`.
- Os handlers são idempotentes: um evento reentregue para um status já aplicado é ignorado.
- Novos status: `AWAITING_PAYMENT` e `CANCELLED` (migração `SagaStatuses1789600000000`).
