variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "environment" {
  description = "homolog | prod"
  type        = string

  validation {
    condition     = contains(["homolog", "prod"], var.environment)
    error_message = "environment must be homolog or prod."
  }
}

variable "cluster_name" {
  description = "EKS cluster name (defaults to auto-repair-<environment>)"
  type        = string
  default     = null
}

variable "namespace" {
  description = "Kubernetes namespace of the services"
  type        = string
  default     = "default"
}

variable "max_receive_count" {
  description = "Deliveries before a message moves to the DLQ"
  type        = number
  default     = 5
}

variable "alarm_actions" {
  description = "SNS topic ARNs notified when a DLQ receives messages"
  type        = list(string)
  default     = []
}
