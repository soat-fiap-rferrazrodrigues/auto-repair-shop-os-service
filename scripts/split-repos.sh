#!/usr/bin/env bash
#
# Splits this workspace into the four repositories described in docs/README.md.
#
# The output lands in ./repos/, which is git-ignored. Each folder is ready to be
# moved out of this project and pushed as its own repository:
#
#   mv repos/auto-repair-os-service ~/Documents/
#   cd ~/Documents/auto-repair-os-service && git init && git add . && git commit -m "chore: initial commit"
#
# Re-running the script rebuilds ./repos/ from scratch.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/repos"

API="$OUT/auto-repair-os-service"
LAMBDA="$OUT/auto-repair-auth-lambda"
INFRA_K8S="$OUT/auto-repair-infra-k8s"
INFRA_DB="$OUT/auto-repair-infra-db"
BILLING="$OUT/auto-repair-billing-service"
EXECUTION="$OUT/auto-repair-execution-service"

echo "==> Rebuilding $OUT"
rm -rf "$OUT"
mkdir -p "$API" "$LAMBDA" "$INFRA_K8S" "$INFRA_DB" "$BILLING" "$EXECUTION"

# Artefacts that must never be copied into a fresh repository.
EXCLUDES=(
  --exclude 'node_modules'
  --exclude 'dist'
  --exclude 'coverage'
  --exclude '.git'
  --exclude '.scannerwork'
  --exclude '.env'
  --exclude '.terraform'
  --exclude '.terraform.lock.hcl'
  --exclude '*.tfstate'
  --exclude '*.tfstate.*'
  --exclude '*.zip'
)

copy() { rsync -a "${EXCLUDES[@]}" "$@"; }

# Copies only when the source exists. Parts of the legacy layout (lambda-auth/,
# terraform/, k8s/) already live in their own repositories.
copy_if() {
  local dest="${*: -1}" src
  for src in "${@:1:$#-1}"; do
    if [[ -e "$src" ]]; then
      copy "$src" "$dest"
    else
      echo "    (skip) ${src#$ROOT/} not found"
    fi
  done
}

# ---------------------------------------------------------------------------
# 1. auto-repair-os-service — NestJS application (OS + saga orchestrator)
# ---------------------------------------------------------------------------
echo "==> 1/6 auto-repair-os-service"
copy "$ROOT/src" "$ROOT/test" "$ROOT/docs" "$API/"
copy \
  "$ROOT/Dockerfile" \
  "$ROOT/docker-compose.yml" \
  "$ROOT/package.json" \
  "$ROOT/package-lock.json" \
  "$ROOT/tsconfig.json" \
  "$ROOT/tsconfig.build.json" \
  "$ROOT/nest-cli.json" \
  "$ROOT/eslint.config.mjs" \
  "$ROOT/.prettierrc" \
  "$ROOT/.gitignore" \
  "$ROOT/sonar-project.properties" \
  "$ROOT/README.md" \
  "$API/"
copy_if "$ROOT/.env.example" "$API/"
copy_if "$ROOT/k8s" "$API/"
mkdir -p "$API/scripts" "$API/docs"
copy_if "$ROOT/scripts/coverage-summary.js" "$API/scripts/"
copy_if "$ROOT/docs/postman" "$API/docs/"
mkdir -p "$API/.github/workflows"
copy_if "$ROOT/.github/workflows/ci-cd.yml" "$API/.github/workflows/"

# The API repository no longer carries infrastructure, so docker-compose keeps
# only the database used for local development and migration generation.

# ---------------------------------------------------------------------------
# 2. auto-repair-auth-lambda — serverless CPF authentication
# ---------------------------------------------------------------------------
echo "==> 2/6 auto-repair-auth-lambda"
copy_if "$ROOT/lambda-auth/." "$LAMBDA/"

# ---------------------------------------------------------------------------
# 3. auto-repair-infra-k8s — cluster, manifests and observability
# ---------------------------------------------------------------------------
echo "==> 3/6 auto-repair-infra-k8s"
mkdir -p "$INFRA_K8S/terraform" "$INFRA_K8S/.github/workflows"
copy_if "$ROOT/terraform/k8s" "$ROOT/terraform/monitoring" "$INFRA_K8S/terraform/"
copy_if "$ROOT/k8s" "$INFRA_K8S/"
copy_if "$ROOT/.github/workflows/infra-k8s.yml" "$INFRA_K8S/.github/workflows/"
# Phase 4: SNS/SQS + IRSA stack and microservice manifests.
copy "$ROOT/infra/terraform/messaging" "$ROOT/infra/terraform/observability" "$INFRA_K8S/terraform/"
mkdir -p "$INFRA_K8S/k8s"
copy "$ROOT/infra/k8s/." "$INFRA_K8S/k8s/"

# ---------------------------------------------------------------------------
# 4. auto-repair-infra-db — managed PostgreSQL
# ---------------------------------------------------------------------------
echo "==> 4/6 auto-repair-infra-db"
mkdir -p "$INFRA_DB/terraform" "$INFRA_DB/.github/workflows"
copy_if "$ROOT/terraform/db" "$INFRA_DB/terraform/"
copy_if "$ROOT/.github/workflows/infra-db.yml" "$INFRA_DB/.github/workflows/"
# Phase 4: billing RDS + execution DynamoDB.
copy "$ROOT/infra/terraform/microservices-data" "$INFRA_DB/terraform/"

# The infrastructure repositories get their own README; the one under
# terraform/ in this workspace describes all stacks at once and would be
# misleading once they are split apart.
cp "$ROOT/scripts/templates/README-infra-k8s.md" "$INFRA_K8S/README.md"
cp "$ROOT/scripts/templates/README-infra-db.md" "$INFRA_DB/README.md"

# ---------------------------------------------------------------------------
# 5. auto-repair-billing-service — budgets + Mercado Pago (self-contained)
# ---------------------------------------------------------------------------
echo "==> 5/6 auto-repair-billing-service"
copy "$ROOT/microservices/billing-service/." "$BILLING/"

# ---------------------------------------------------------------------------
# 6. auto-repair-execution-service — repair queue + stock (DynamoDB)
# ---------------------------------------------------------------------------
echo "==> 6/6 auto-repair-execution-service"
copy "$ROOT/microservices/execution-service/." "$EXECUTION/"

# ---------------------------------------------------------------------------
# Terraform .gitignore for the infrastructure repositories.
#
# This is deliberate: provider binaries under .terraform/ exceed GitHub's 100 MB
# per-file limit and will break the very first push if they are ever committed.
# ---------------------------------------------------------------------------
for repo in "$LAMBDA" "$INFRA_K8S" "$INFRA_DB"; do
  cat > "$repo/.gitignore" <<'EOF'
# Dependencies and build output
node_modules/
dist/
coverage/
*.zip

# Terraform
**/.terraform/*
.terraform.lock.hcl
*.tfstate
*.tfstate.*
*.tfvars
!example.tfvars
crash.log
override.tf
override.tf.json

# Environment
.env
.env.local

# OS
.DS_Store
EOF
done

echo
echo "==> Done. Structure:"
for repo in "$API" "$LAMBDA" "$INFRA_K8S" "$INFRA_DB" "$BILLING" "$EXECUTION"; do
  echo
  echo "--- $(basename "$repo")"
  (cd "$repo" && find . -maxdepth 2 -not -path '*/.git/*' | sed 's|^\./||' | sort | head -30)
done
