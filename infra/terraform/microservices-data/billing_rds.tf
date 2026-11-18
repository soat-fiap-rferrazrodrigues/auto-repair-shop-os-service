# ── billing-service: dedicated PostgreSQL (SQL) ─────────────────────────────
# Never shared with the os-service instance.

resource "random_password" "billing" {
  length  = 32
  special = false
}

resource "aws_db_subnet_group" "billing" {
  name       = "${local.name}-billing-db"
  subnet_ids = data.terraform_remote_state.k8s.outputs.private_subnets
}

resource "aws_security_group" "billing_db" {
  name_prefix = "${local.name}-billing-db-"
  vpc_id      = data.terraform_remote_state.k8s.outputs.vpc_id

  ingress {
    description     = "PostgreSQL from EKS nodes"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [data.terraform_remote_state.k8s.outputs.node_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_db_instance" "billing" {
  identifier     = "${local.name}-billing"
  engine         = "postgres"
  engine_version = "16.3"
  instance_class = local.is_prod ? "db.t3.small" : "db.t3.micro"

  allocated_storage     = 20
  max_allocated_storage = 50
  storage_encrypted     = true

  db_name  = "billing"
  username = "billing"
  password = random_password.billing.result

  db_subnet_group_name   = aws_db_subnet_group.billing.name
  vpc_security_group_ids = [aws_security_group.billing_db.id]
  publicly_accessible    = false

  multi_az                  = local.is_prod
  backup_retention_period   = local.is_prod ? 30 : 7
  deletion_protection       = local.is_prod
  skip_final_snapshot       = !local.is_prod
  final_snapshot_identifier = local.is_prod ? "${local.name}-billing-final" : null
}

# Synced into the cluster by External Secrets (secret billing-service-secrets).
resource "aws_secretsmanager_secret" "billing_db" {
  name = "${local.name}/billing-service/database"
}

resource "aws_secretsmanager_secret_version" "billing_db" {
  secret_id = aws_secretsmanager_secret.billing_db.id
  secret_string = jsonencode({
    DATABASE_HOST     = aws_db_instance.billing.address
    DATABASE_PORT     = tostring(aws_db_instance.billing.port)
    DATABASE_NAME     = aws_db_instance.billing.db_name
    DATABASE_USER     = aws_db_instance.billing.username
    DATABASE_PASSWORD = random_password.billing.result
    DATABASE_SSL      = "true"
  })
}

# Mercado Pago credentials are filled in manually (console/CLI), never in code.
resource "aws_secretsmanager_secret" "mercadopago" {
  name = "${local.name}/billing-service/mercadopago"
}
