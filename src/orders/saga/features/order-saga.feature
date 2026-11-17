# language: pt
Funcionalidade: Saga da ordem de serviço
  Como oficina
  Quero que a OS siga o fluxo orçamento → aprovação → pagamento → execução
  Para que falhas em qualquer etapa sejam compensadas

  Cenário: Fluxo completo com pagamento aprovado
    Dado uma OS em diagnóstico
    Quando o orçamento é enviado ao cliente
    Então a OS deve estar em "AWAITING_APPROVAL"
    E o comando "billing.GenerateBudget" deve ser publicado
    Quando o cliente aprova o orçamento por e-mail
    Então a OS deve estar em "AWAITING_PAYMENT"
    E o comando "billing.CreatePayment" deve ser publicado
    Quando o billing publica "PaymentConfirmed"
    Então a OS deve estar em "IN_EXECUTION"
    E o comando "execution.ReserveAndEnqueue" deve ser publicado
    Quando o execution publica "ExecutionFinished"
    Então a OS deve estar em "FINISHED"

  Cenário: Cliente rejeita o orçamento
    Dado uma OS em diagnóstico
    Quando o orçamento é enviado ao cliente
    E o cliente rejeita o orçamento por e-mail
    Então a OS deve estar em "RECEIVED"

  Cenário: Pagamento recusado cancela a OS
    Dado uma OS aguardando pagamento
    Quando o billing publica "PaymentFailed"
    Então a OS deve estar em "CANCELLED"

  Cenário: Falta de estoque estorna o pagamento
    Dado uma OS em execução com pagamento confirmado
    Quando o execution publica "StockUnavailable"
    Então o comando "billing.RefundPayment" deve ser publicado
    E a OS deve estar em "CANCELLED"
