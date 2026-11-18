terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # key = "messaging/<env>/terraform.tfstate" (via -backend-config)
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
      Stack       = "messaging"
    }
  }
}

# DynamoDB table ARN for the execution-service role.
data "terraform_remote_state" "data" {
  backend = "s3"
  config = {
    bucket = "auto-repair-terraform-state"
    key    = "microservices-data/${var.environment}/terraform.tfstate"
    region = var.aws_region
  }
}

# OIDC provider looked up from the cluster itself (IRSA), so this stack does
# not depend on which outputs the k8s stack exports.
data "aws_eks_cluster" "this" {
  name = local.cluster_name
}

data "aws_iam_openid_connect_provider" "eks" {
  url = data.aws_eks_cluster.this.identity[0].oidc[0].issuer
}

locals {
  name         = "auto-repair-${var.environment}"
  cluster_name = coalesce(var.cluster_name, local.name)
  oidc_host    = replace(data.aws_eks_cluster.this.identity[0].oidc[0].issuer, "https://", "")
}
