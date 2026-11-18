variable "environment" {
  description = "homolog | prod"
  type        = string
}

variable "notify" {
  description = "Datadog handles notified by alerts (e.g. @slack-oficina-alertas)."
  type        = list(string)
  default     = []
}

variable "queue_age_critical_seconds" {
  description = "Age of the oldest SQS message that triggers a backlog alert."
  type        = number
  default     = 300
}

variable "compensations_per_hour" {
  description = "Saga compensations per hour considered abnormal."
  type        = number
  default     = 5
}

variable "p95_latency_seconds" {
  type    = number
  default = 1
}
