#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh  –  Build, push, and deploy todo-app to AWS ECS Fargate
#
# Usage:
#   export DB_PASSWORD="your-db-password"
#   export JWT_SECRET_VALUE="your-jwt-secret"
#   ./aws/deploy.sh
#
# Optional overrides (environment variables):
#   STACK_NAME       (default: todo-app-prod)
#   REGION           (default: ap-southeast-1)
#   IMAGE_TAG        (default: latest)
#   DESIRED_COUNT    (default: 1)
#   DB_INSTANCE_CLASS (default: db.t3.micro)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
STACK_NAME="${STACK_NAME:-todo-app-prod}"
REGION="${REGION:-ap-southeast-1}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
DESIRED_COUNT="${DESIRED_COUNT:-1}"
DB_INSTANCE_CLASS="${DB_INSTANCE_CLASS:-db.t3.micro}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_FILE="${SCRIPT_DIR}/cloudformation.yml"
APP_DIR="$(dirname "${SCRIPT_DIR}")"  # todo-app root

# ── Validation ────────────────────────────────────────────────────────────────
if [[ -z "${DB_PASSWORD:-}" ]]; then
  echo "ERROR: Set DB_PASSWORD before running this script."
  echo "  export DB_PASSWORD='your-secure-password'"
  exit 1
fi

if [[ -z "${JWT_SECRET_VALUE:-}" ]]; then
  echo "ERROR: Set JWT_SECRET_VALUE before running this script."
  echo "  export JWT_SECRET_VALUE='your-jwt-secret-min-16-chars'"
  exit 1
fi

if ! command -v aws &>/dev/null; then
  echo "ERROR: aws CLI not found. Install it from https://aws.amazon.com/cli/"
  exit 1
fi

if ! command -v docker &>/dev/null; then
  echo "ERROR: docker not found. Install Docker Desktop."
  exit 1
fi

echo "──────────────────────────────────────────────────────────────────────────"
echo " Todo App – AWS Deployment"
echo " Stack:  ${STACK_NAME}"
echo " Region: ${REGION}"
echo " Tag:    ${IMAGE_TAG}"
echo "──────────────────────────────────────────────────────────────────────────"

# ── Step 1: Get AWS account ID ────────────────────────────────────────────────
echo ""
echo "[1/6] Resolving AWS account ID..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${STACK_NAME}"
echo "      Account: ${ACCOUNT_ID}"
echo "      ECR URI: ${ECR_URI}"

# ── Step 2: Deploy CloudFormation stack ──────────────────────────────────────
echo ""
echo "[2/6] Deploying CloudFormation stack '${STACK_NAME}'..."
echo "      This creates ECR, VPC, RDS, ECS, ALB, Secrets Manager entries."
echo "      RDS provisioning can take 5-10 minutes on first deploy."

aws cloudformation deploy \
  --template-file "${TEMPLATE_FILE}" \
  --stack-name "${STACK_NAME}" \
  --region "${REGION}" \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    EnvironmentName="${STACK_NAME}" \
    DBPassword="${DB_PASSWORD}" \
    JwtSecret="${JWT_SECRET_VALUE}" \
    ImageTag="${IMAGE_TAG}" \
    AppDesiredCount="${DESIRED_COUNT}" \
    DBInstanceClass="${DB_INSTANCE_CLASS}" \
  --no-fail-on-empty-changeset

echo "      CloudFormation stack deployed."

# ── Step 3: Login to ECR ──────────────────────────────────────────────────────
echo ""
echo "[3/6] Logging in to ECR..."
aws ecr get-login-password --region "${REGION}" | \
  docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
echo "      ECR login successful."

# ── Step 4: Build Docker image ────────────────────────────────────────────────
echo ""
echo "[4/6] Building Docker image from ${APP_DIR}..."
docker build \
  --platform linux/amd64 \
  -t "${STACK_NAME}:${IMAGE_TAG}" \
  "${APP_DIR}"
echo "      Build complete."

# ── Step 5: Tag and push to ECR ───────────────────────────────────────────────
echo ""
echo "[5/6] Tagging and pushing image to ECR..."
docker tag "${STACK_NAME}:${IMAGE_TAG}" "${ECR_URI}:${IMAGE_TAG}"
docker push "${ECR_URI}:${IMAGE_TAG}"
echo "      Image pushed: ${ECR_URI}:${IMAGE_TAG}"

# ── Step 6: Force ECS to pull new image ──────────────────────────────────────
echo ""
echo "[6/6] Forcing new ECS deployment to pick up the new image..."
ECS_CLUSTER=$(aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --region "${REGION}" \
  --query "Stacks[0].Outputs[?OutputKey=='ECSClusterName'].OutputValue" \
  --output text)

ECS_SERVICE=$(aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --region "${REGION}" \
  --query "Stacks[0].Outputs[?OutputKey=='ECSServiceName'].OutputValue" \
  --output text)

aws ecs update-service \
  --cluster "${ECS_CLUSTER}" \
  --service "${ECS_SERVICE}" \
  --force-new-deployment \
  --region "${REGION}" \
  --output text > /dev/null

echo "      ECS deployment triggered."

# ── Print outputs ─────────────────────────────────────────────────────────────
echo ""
echo "──────────────────────────────────────────────────────────────────────────"
echo " Deployment complete. Stack outputs:"
aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --region "${REGION}" \
  --query "Stacks[0].Outputs[*].[OutputKey,OutputValue]" \
  --output table
echo ""
echo " Monitor deployment:"
echo "   aws ecs wait services-stable --cluster ${ECS_CLUSTER} --services ${ECS_SERVICE} --region ${REGION}"
echo ""
echo " Stream logs:"
echo "   aws logs tail /ecs/${STACK_NAME} --follow --region ${REGION}"
echo "──────────────────────────────────────────────────────────────────────────"
