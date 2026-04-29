#!/usr/bin/env bash
# Build + push Docker image, deploy low-cost CloudFormation, then refresh app on EC2 via SSM.
#
# Usage:
#   export JWT_SECRET_VALUE='your-long-jwt-secret'
#   ./aws/deploy-lowcost.sh
#
# Optional overrides:
#   STACK_NAME=todo-app-lowcost
#   REGION=ap-southeast-1
#   IMAGE_TAG=latest
#   INSTANCE_TYPE=t3.micro
#   SSH_CIDR=0.0.0.0/0

set -euo pipefail

STACK_NAME="${STACK_NAME:-todo-app-lowcost}"
REGION="${REGION:-ap-southeast-1}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
INSTANCE_TYPE="${INSTANCE_TYPE:-t3.micro}"
SSH_CIDR="${SSH_CIDR:-0.0.0.0/0}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_FILE="${SCRIPT_DIR}/cloudformation.lowcost.yml"
APP_DIR="$(dirname "${SCRIPT_DIR}")"
AUTH_DIR="${APP_DIR}/services/auth"
FE_DIR="$(dirname "${APP_DIR}")/todo-app-fe"
# Elastic IP for the EC2 instance (used to bake API URLs into the FE build)
EC2_PUBLIC_IP="${EC2_PUBLIC_IP:-18.138.41.18}"

if [[ -z "${JWT_SECRET_VALUE:-}" ]]; then
  echo "ERROR: set JWT_SECRET_VALUE before running."
  echo "  export JWT_SECRET_VALUE='your-secret-min-16-chars'"
  exit 1
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "ERROR: aws CLI is not installed or not in PATH."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker is not installed or not in PATH."
  exit 1
fi

if ! command -v yarn >/dev/null 2>&1; then
  echo "ERROR: yarn is not installed or not in PATH."
  exit 1
fi

echo "[1/11] Resolving AWS account ID..."
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text --region "${REGION}")"
ECR_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${STACK_NAME}"
ECR_AUTH_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${STACK_NAME}-auth"
ECR_FE_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${STACK_NAME}-fe"
echo "      Account: ${ACCOUNT_ID}"

echo "[2/11] Deploying/Updating low-cost CloudFormation stack..."
aws cloudformation deploy \
  --template-file "${TEMPLATE_FILE}" \
  --stack-name "${STACK_NAME}" \
  --region "${REGION}" \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    EnvironmentName="${STACK_NAME}" \
    JwtSecret="${JWT_SECRET_VALUE}" \
    ImageTag="${IMAGE_TAG}" \
    InstanceType="${INSTANCE_TYPE}" \
    SSHCidr="${SSH_CIDR}" \
  --no-fail-on-empty-changeset

echo "[3/11] Logging into ECR..."
aws ecr get-login-password --region "${REGION}" | \
  docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

echo "[4/11] Building Docker image (main app)..."
docker build --platform linux/amd64 -t "${STACK_NAME}:${IMAGE_TAG}" "${APP_DIR}"

echo "[5/11] Pushing main app Docker image..."
docker tag "${STACK_NAME}:${IMAGE_TAG}" "${ECR_URI}:${IMAGE_TAG}"
docker push "${ECR_URI}:${IMAGE_TAG}"

echo "[6/11] Building auth service Docker image..."
docker build --platform linux/amd64 -t "${STACK_NAME}-auth:${IMAGE_TAG}" "${AUTH_DIR}"

echo "[7/11] Pushing auth service Docker image..."
docker tag "${STACK_NAME}-auth:${IMAGE_TAG}" "${ECR_AUTH_URI}:${IMAGE_TAG}"
docker push "${ECR_AUTH_URI}:${IMAGE_TAG}"

echo "[8/11] Building frontend Docker image..."
(
  cd "${FE_DIR}"
  rm -rf dist/apps/web
  VITE_API_URL="http://${EC2_PUBLIC_IP}" \
  VITE_AUTH_API_URL="http://${EC2_PUBLIC_IP}:3001" \
  NX_SKIP_NX_CACHE=true yarn build
)
docker build --platform linux/amd64 -t "${STACK_NAME}-fe:${IMAGE_TAG}" "${FE_DIR}"

echo "[9/11] Pushing frontend Docker image..."
docker tag "${STACK_NAME}-fe:${IMAGE_TAG}" "${ECR_FE_URI}:${IMAGE_TAG}"
docker push "${ECR_FE_URI}:${IMAGE_TAG}"

echo "[10/11] Getting EC2 instance ID from stack outputs..."
INSTANCE_ID="$(aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --region "${REGION}" \
  --query "Stacks[0].Outputs[?OutputKey=='InstanceId'].OutputValue" \
  --output text)"

if [[ -z "${INSTANCE_ID}" || "${INSTANCE_ID}" == "None" ]]; then
  echo "ERROR: Could not resolve InstanceId output from CloudFormation."
  exit 1
fi

echo "[11/11] Refreshing app on EC2 via SSM (pull + restart)..."
cat > /tmp/ssm-params-deploy-lowcost.json <<JSON
{
  "commands": [
    "set -e",
    "mkdir -p /opt/todo/data/postgres",
    "touch /opt/todo/.env",
    "sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=${IMAGE_TAG}/' /opt/todo/.env || true",
    "if ! grep -q '^IMAGE_TAG=' /opt/todo/.env; then echo IMAGE_TAG=${IMAGE_TAG} >> /opt/todo/.env; fi",
    "if ! grep -q '^JWT_SECRET=' /opt/todo/.env; then echo JWT_SECRET=$(openssl rand -base64 48 | tr -d '\\n') >> /opt/todo/.env; fi",
    "if ! grep -q '^DB_PASSWORD=' /opt/todo/.env; then echo DB_PASSWORD=$(openssl rand -base64 24 | tr -d '\\n') >> /opt/todo/.env; fi",
    "set -a && . /opt/todo/.env && set +a",
    "IMAGE_URI=${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${STACK_NAME}:${IMAGE_TAG}",
    "FE_IMAGE_URI=${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${STACK_NAME}-fe:${IMAGE_TAG}",
    "AUTH_IMAGE_URI=${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${STACK_NAME}-auth:${IMAGE_TAG}",
    "aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com",
    "docker network create todo-net || true",
    "docker pull \"\$IMAGE_URI\"",
    "docker pull \"\$AUTH_IMAGE_URI\"",
    "docker pull \"\$FE_IMAGE_URI\"",
    "docker rm -f todo-db || true",
    "docker run -d --name todo-db --restart unless-stopped --network todo-net -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=\"\$DB_PASSWORD\" -e POSTGRES_DB=todo_db -v /opt/todo/data/postgres:/var/lib/postgresql/data postgres:14",
    "docker rm -f todo-auth || true",
    "docker run -d --name todo-auth --restart unless-stopped --network todo-net -p 3001:3001 -e PORT=3001 -e JWT_SECRET=\"\$JWT_SECRET\" -e DB_HOST=todo-db -e DB_PORT=5432 -e DB_USER=postgres -e DB_PASSWORD=\"\$DB_PASSWORD\" -e DB_NAME=todo_db -e DB_SSL=false \"\$AUTH_IMAGE_URI\"",
    "docker rm -f todo-app || true",
    "docker run -d --name todo-app --restart unless-stopped --network todo-net -p 80:3000 -e NODE_ENV=production -e PORT=3000 -e DB_TYPE=postgres -e DB_HOST=todo-db -e DB_PORT=5432 -e DB_USER=postgres -e DB_PASSWORD=\"\$DB_PASSWORD\" -e DB_NAME=todo_db -e DB_SSL=false -e JWT_SECRET=\"\$JWT_SECRET\" -v /opt/todo/data:/app/data \"\$IMAGE_URI\"",
    "docker rm -f todo-fe || true",
    "docker run -d --name todo-fe --restart unless-stopped --network todo-net -p 8080:8080 \"\$FE_IMAGE_URI\"",
    "docker image prune -f"
  ]
}
JSON

SSM_COMMAND_ID="$(aws ssm send-command \
  --region "${REGION}" \
  --instance-ids "${INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --comment "Refresh todo-app container" \
  --parameters file:///tmp/ssm-params-deploy-lowcost.json \
  --query "Command.CommandId" \
  --output text)"

echo "      SSM command ID: ${SSM_COMMAND_ID}"

echo ""
echo "Stack outputs:"
aws cloudformation describe-stacks \
  --stack-name "${STACK_NAME}" \
  --region "${REGION}" \
  --query "Stacks[0].Outputs[*].[OutputKey,OutputValue]" \
  --output table

echo ""
echo "To check command result:"
echo "aws ssm list-command-invocations --command-id ${SSM_COMMAND_ID} --details --region ${REGION}"
