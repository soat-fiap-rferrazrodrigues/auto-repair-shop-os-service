terraform {
  required_version = ">= 1.5.0"

  required_providers {
    datadog = {
      source  = "DataDog/datadog"
      version = "~> 3.40"
    }
  }

  # key = "observability/<env>/terraform.tfstate" (via -backend-config)
  backend "s3" {
    bucket = "auto-repair-terraform-state"
    region = "us-east-1"
  }
}

# DD_API_KEY / DD_APP_KEY / DD_HOST come from the environment (CI secrets).
provider "datadog" {}

locals {
  name     = "auto-repair-${var.environment}"
  services = ["os-service", "billing-service", "execution-service"]
  queues   = ["os-saga-events", "billing-commands", "execution-commands"]
  notify   = join(" ", var.notify)
  tags     = ["project:auto-repair-shop", "env:${var.environment}", "managed-by:terraform"]
}

# ---------------------------------------------------------------------------
# Messaging: a message in a DLQ means a saga step failed 5 times.
# ---------------------------------------------------------------------------
resource "datadog_monitor" "dlq_not_empty" {
  name    = "[${var.environment}] Saga DLQ com mensagens: {{queuename.name}}"
  type    = "metric alert"
  query   = "max(last_5m):max:aws.sqs.approximate_number_of_messages_visible{queuename:${local.name}-*-dlq} by {queuename} > 0"
  message = <<-EOT
    Mensagens na DLQ {{queuename.name}} — um passo da saga falhou após 5 tentativas.
    Runbook: inspecionar o payload (correlation_id = orderId), corrigir e reenviar
    com `aws sqs start-message-move-task`. {{#is_alert}}${local.notify}{{/is_alert}}
  EOT

  monitor_thresholds {
    critical = 0
  }
  notify_no_data = false
  tags           = concat(local.tags, ["team:platform", "component:saga"])
}

resource "datadog_monitor" "queue_backlog" {
  name    = "[${var.environment}] Fila da saga atrasada: {{queuename.name}}"
  type    = "metric alert"
  query   = "avg(last_10m):max:aws.sqs.approximate_age_of_oldest_message{${join(" OR ", [for q in local.queues : "queuename:${local.name}-${q}"])}} by {queuename} > ${var.queue_age_critical_seconds}"
  message = <<-EOT
    A mensagem mais antiga em {{queuename.name}} tem {{value}}s. Consumidor parado
    ou lento — verifique os pods e o HPA do serviço. ${local.notify}
  EOT

  monitor_thresholds {
    warning  = var.queue_age_critical_seconds / 2
    critical = var.queue_age_critical_seconds
  }
  tags = concat(local.tags, ["component:saga"])
}

# ---------------------------------------------------------------------------
# Saga business health (structured logs, correlation_id = orderId).
# ---------------------------------------------------------------------------
resource "datadog_monitor" "saga_compensations" {
  name    = "[${var.environment}] Compensações da saga acima do normal"
  type    = "log alert"
  query   = "logs(\"service:os-service env:${var.environment} (\\\"StockUnavailable\\\" OR \\\"PaymentFailed\\\" OR \\\"BudgetFailed\\\")\").index(\"*\").rollup(\"count\").last(\"1h\") > ${var.compensations_per_hour}"
  message = <<-EOT
    Mais de ${var.compensations_per_hour} compensações (estorno/cancelamento) na última hora.
    Possível falta de estoque recorrente ou instabilidade no Mercado Pago. ${local.notify}
  EOT

  monitor_thresholds {
    critical = var.compensations_per_hour
  }
  tags = concat(local.tags, ["component:saga"])
}

resource "datadog_monitor" "saga_ignored_transitions" {
  name    = "[${var.environment}] Eventos da saga ignorados (fora de ordem)"
  type    = "log alert"
  query   = "logs(\"service:os-service env:${var.environment} \\\"ignored transition\\\"\").index(\"*\").rollup(\"count\").last(\"30m\") > 10"
  message = "Muitos eventos chegando fora de ordem/duplicados. Verificar redeliveries no SQS. ${local.notify}"

  monitor_thresholds {
    critical = 10
  }
  tags = concat(local.tags, ["component:saga"])
}

# ---------------------------------------------------------------------------
# Per-service golden signals (APM, auto-instrumented via dd-trace).
# ---------------------------------------------------------------------------
resource "datadog_monitor" "error_rate" {
  for_each = toset(local.services)

  name    = "[${var.environment}] ${each.key}: taxa de erro 5xx alta"
  type    = "query alert"
  query   = "sum(last_5m):sum:trace.express.request.errors{service:${each.key},env:${var.environment}}.as_count() / sum:trace.express.request.hits{service:${each.key},env:${var.environment}}.as_count() > 0.05"
  message = "{{value}} de erros em ${each.key}. ${local.notify}"

  monitor_thresholds {
    warning  = 0.02
    critical = 0.05
  }
  require_full_window = false
  tags                = concat(local.tags, ["service:${each.key}"])
}

resource "datadog_monitor" "latency_p95" {
  for_each = toset(local.services)

  name    = "[${var.environment}] ${each.key}: latência p95 alta"
  type    = "query alert"
  query   = "percentile(last_10m):p95:trace.express.request{service:${each.key},env:${var.environment}} > ${var.p95_latency_seconds}"
  message = "p95 de ${each.key} em {{value}}s. ${local.notify}"

  monitor_thresholds {
    critical = var.p95_latency_seconds
  }
  tags = concat(local.tags, ["service:${each.key}"])
}

resource "datadog_monitor" "pods_unavailable" {
  for_each = toset(local.services)

  name    = "[${var.environment}] ${each.key}: réplicas indisponíveis"
  type    = "metric alert"
  query   = "max(last_5m):max:kubernetes_state.deployment.replicas_unavailable{kube_deployment:${each.key == "os-service" ? "auto-repair-api" : each.key},env:${var.environment}} >= 1"
  message = "Réplicas de ${each.key} indisponíveis (crashloop, probe ou falta de nós). ${local.notify}"

  monitor_thresholds {
    critical = 1
  }
  tags = concat(local.tags, ["service:${each.key}"])
}

# ---------------------------------------------------------------------------
# Dashboard: saga end-to-end.
# ---------------------------------------------------------------------------
resource "datadog_dashboard_json" "saga" {
  dashboard = jsonencode({
    title              = "Auto Repair — Saga OS (${var.environment})"
    layout_type        = "ordered"
    template_variables = [{ name = "orderId", prefix = "correlation_id", default = "*" }]
    widgets = [
      {
        definition = {
          type     = "timeseries"
          title    = "Mensagens visíveis por fila"
          requests = [{ q = "max:aws.sqs.approximate_number_of_messages_visible{queuename:${local.name}-*} by {queuename}", display_type = "bars" }]
        }
      },
      {
        definition = {
          type     = "timeseries"
          title    = "Idade da mensagem mais antiga (s)"
          requests = [{ q = "max:aws.sqs.approximate_age_of_oldest_message{queuename:${local.name}-*} by {queuename}" }]
        }
      },
      {
        definition = {
          type     = "timeseries"
          title    = "Requisições e erros por serviço"
          requests = [for s in local.services : { q = "sum:trace.express.request.hits{service:${s},env:${var.environment}}.as_count()", display_type = "bars" }]
        }
      },
      {
        definition = {
          type    = "log_stream"
          title   = "Logs da saga ($orderId)"
          query   = "service:(os-service OR billing-service OR execution-service) env:${var.environment} $orderId.value"
          indexes = []
          columns = ["service", "message"]
        }
      },
    ]
  })
}
