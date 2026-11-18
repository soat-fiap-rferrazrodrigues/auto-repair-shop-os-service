# ── Topology ────────────────────────────────────────────────────────────────
#
#   os-service ──► SNS os-commands ──┬─(type prefix "billing.")───► SQS billing-commands ──► billing
#                                    └─(type prefix "execution.")─► SQS execution-commands ► execution
#   billing    ──► SNS billing-events   ──┐
#   execution  ──► SNS execution-events ──┴──────────────────────► SQS os-saga-events ───► os-service
#
# Every queue has a DLQ (maxReceiveCount) with a CloudWatch alarm.

locals {
  topics = ["os-commands", "billing-events", "execution-events"]

  queues = {
    os-saga-events = {
      topics = ["billing-events", "execution-events"]
      filter = null
    }
    billing-commands = {
      topics = ["os-commands"]
      filter = { type = [{ prefix = "billing." }] }
    }
    execution-commands = {
      topics = ["os-commands"]
      filter = { type = [{ prefix = "execution." }] }
    }
  }

  subscriptions = merge([
    for q, cfg in local.queues : {
      for t in cfg.topics : "${t}->${q}" => { topic = t, queue = q, filter = cfg.filter }
    }
  ]...)
}

resource "aws_sns_topic" "this" {
  for_each          = toset(local.topics)
  name              = "${local.name}-${each.key}"
  kms_master_key_id = "alias/aws/sns"
}

resource "aws_sqs_queue" "dlq" {
  for_each                  = local.queues
  name                      = "${local.name}-${each.key}-dlq"
  message_retention_seconds = 1209600 # 14 days to investigate
  sqs_managed_sse_enabled   = true
}

resource "aws_sqs_queue" "this" {
  for_each = local.queues
  name     = "${local.name}-${each.key}"

  # > handler time; consumers long-poll for 20s.
  visibility_timeout_seconds = 60
  receive_wait_time_seconds  = 20
  message_retention_seconds  = 345600 # 4 days
  sqs_managed_sse_enabled    = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq[each.key].arn
    maxReceiveCount     = var.max_receive_count
  })
}

resource "aws_sqs_queue_redrive_allow_policy" "dlq" {
  for_each  = local.queues
  queue_url = aws_sqs_queue.dlq[each.key].id
  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue"
    sourceQueueArns   = [aws_sqs_queue.this[each.key].arn]
  })
}

data "aws_iam_policy_document" "queue" {
  for_each = local.queues

  statement {
    sid       = "AllowSnsDelivery"
    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.this[each.key].arn]

    principals {
      type        = "Service"
      identifiers = ["sns.amazonaws.com"]
    }

    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      values   = [for t in each.value.topics : aws_sns_topic.this[t].arn]
    }
  }
}

resource "aws_sqs_queue_policy" "this" {
  for_each  = local.queues
  queue_url = aws_sqs_queue.this[each.key].id
  policy    = data.aws_iam_policy_document.queue[each.key].json
}

# Envelope delivery (raw = false): consumers read `type` from the SNS
# MessageAttributes; the filter policy applies to message attributes.
resource "aws_sns_topic_subscription" "this" {
  for_each             = local.subscriptions
  topic_arn            = aws_sns_topic.this[each.value.topic].arn
  protocol             = "sqs"
  endpoint             = aws_sqs_queue.this[each.value.queue].arn
  raw_message_delivery = false
  filter_policy        = each.value.filter == null ? null : jsonencode(each.value.filter)

  depends_on = [aws_sqs_queue_policy.this]
}

resource "aws_cloudwatch_metric_alarm" "dlq" {
  for_each            = local.queues
  alarm_name          = "${local.name}-${each.key}-dlq-not-empty"
  alarm_description   = "Saga messages failed ${var.max_receive_count}x on ${each.key}; inspect and redrive."
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  dimensions          = { QueueName = aws_sqs_queue.dlq[each.key].name }
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = var.alarm_actions
}
