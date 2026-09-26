# AWS af-south-1 IaC skeleton — data sovereignty requirement per the confirmed
# architecture. This is intentionally minimal at Phase 1: it declares the shape
# (provider, region, tagging convention) that Phase 2+ infra work extends,
# rather than provisioning real resources yet.

terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "af-south-1"

  default_tags {
    tags = {
      Project    = "aggregates-store-platform"
      Division   = "aggregated-aggregates"
      Group      = "besbpo-group"
      ManagedBy  = "terraform"
      DataRegion = "af-south-1"
    }
  }
}

variable "environment" {
  description = "Deployment environment (staging | production)"
  type        = string
  default     = "staging"
}

# Placeholder outputs — Phase 2 build-out wires real S3 (media assets) and
# any CDN/WAF resources here once media hosting requirements are confirmed.
output "region" {
  value = "af-south-1"
}

output "environment" {
  value = var.environment
}
