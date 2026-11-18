terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # key = "microservices-data/<env>/terraform.tfstate" (via -backend-config)
  backend "s3" {
    bucket = "auto-repair-terraform-state"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "auto-repair-shop"
      Environment = var.environment
      Stack       = "microservices-data"
    }
  }
}

# Network comes from the k8s stack (ADR-003).
data "terraform_remote_state" "k8s" {
  backend = "s3"
  config = {
    bucket = "auto-repair-terraform-state"
    key    = "k8s/${var.environment}/terraform.tfstate"
    region = var.aws_region
  }
}

locals {
  name    = "auto-repair-${var.environment}"
  is_prod = var.environment == "prod"
}
