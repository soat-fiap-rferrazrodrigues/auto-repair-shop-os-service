output "topic_arns" {
  value = { for k, t in aws_sns_topic.this : k => t.arn }
}

output "queue_urls" {
  value = { for k, q in aws_sqs_queue.this : k => q.id }
}

output "dlq_urls" {
  value = { for k, q in aws_sqs_queue.dlq : k => q.id }
}

output "service_role_arns" {
  description = "Annotate each ServiceAccount with eks.amazonaws.com/role-arn"
  value       = { for k, r in aws_iam_role.service : k => r.arn }
}

# Ready-to-use env vars for the ConfigMaps in infra/k8s.
output "service_env" {
  value = {
    os-service = {
      SAGA_SNS_TOPIC_ARN = aws_sns_topic.this["os-commands"].arn
      SAGA_SQS_QUEUE_URL = aws_sqs_queue.this["os-saga-events"].id
    }
    billing-service = {
      BILLING_SNS_TOPIC_ARN = aws_sns_topic.this["billing-events"].arn
      BILLING_SQS_QUEUE_URL = aws_sqs_queue.this["billing-commands"].id
    }
    execution-service = {
      EXECUTION_SNS_TOPIC_ARN = aws_sns_topic.this["execution-events"].arn
      EXECUTION_SQS_QUEUE_URL = aws_sqs_queue.this["execution-commands"].id
      DYNAMODB_TABLE          = data.terraform_remote_state.data.outputs.execution_table_name
    }
  }
}
