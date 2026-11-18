output "billing_db_endpoint" {
  value = aws_db_instance.billing.endpoint
}

output "billing_db_secret_arn" {
  value = aws_secretsmanager_secret.billing_db.arn
}

output "mercadopago_secret_arn" {
  value = aws_secretsmanager_secret.mercadopago.arn
}

output "execution_table_name" {
  value = aws_dynamodb_table.execution.name
}

output "execution_table_arn" {
  value = aws_dynamodb_table.execution.arn
}
