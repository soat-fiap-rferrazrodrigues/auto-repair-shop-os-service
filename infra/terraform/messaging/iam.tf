# ── IRSA: one least-privilege role per service account ──────────────────────

locals {
  services = {
    os-service = {
      publish = "os-commands"
      consume = "os-saga-events"
    }
    billing-service = {
      publish = "billing-events"
      consume = "billing-commands"
    }
    execution-service = {
      publish = "execution-events"
      consume = "execution-commands"
    }
  }
}

data "aws_iam_policy_document" "assume" {
  for_each = local.services

  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [data.aws_iam_openid_connect_provider.eks.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_host}:sub"
      values   = ["system:serviceaccount:${var.namespace}:${each.key}"]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_host}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "service" {
  for_each           = local.services
  name               = "${local.name}-${each.key}"
  assume_role_policy = data.aws_iam_policy_document.assume[each.key].json
}

data "aws_iam_policy_document" "messaging" {
  for_each = local.services

  statement {
    sid       = "Publish"
    actions   = ["sns:Publish"]
    resources = [aws_sns_topic.this[each.value.publish].arn]
  }

  statement {
    sid = "Consume"
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:ChangeMessageVisibility",
      "sqs:GetQueueAttributes",
    ]
    resources = [aws_sqs_queue.this[each.value.consume].arn]
  }
}

resource "aws_iam_role_policy" "messaging" {
  for_each = local.services
  name     = "messaging"
  role     = aws_iam_role.service[each.key].id
  policy   = data.aws_iam_policy_document.messaging[each.key].json
}

data "aws_iam_policy_document" "execution_dynamodb" {
  statement {
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:Query",
      "dynamodb:ConditionCheckItem",
    ]
    resources = [
      data.terraform_remote_state.data.outputs.execution_table_arn,
      "${data.terraform_remote_state.data.outputs.execution_table_arn}/index/*",
    ]
  }
}

resource "aws_iam_role_policy" "execution_dynamodb" {
  name   = "dynamodb"
  role   = aws_iam_role.service["execution-service"].id
  policy = data.aws_iam_policy_document.execution_dynamodb.json
}
