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
