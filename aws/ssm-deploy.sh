#!/usr/bin/env bash
# Called from CI/CD workflow to deploy updated containers on EC2 via SSM.
# Required env vars: ECR_REGISTRY, STACK_NAME, IMAGE_TAG, AWS_REGION, EC2_INSTANCE_ID

set -euo pipefail

IMAGE_URI="${ECR_REGISTRY}/${STACK_NAME}:${IMAGE_TAG}"
AUTH_IMAGE_URI="${ECR_REGISTRY}/${STACK_NAME}-auth:${IMAGE_TAG}"

# Build SSM parameters JSON using Python (no YAML-unsafe characters)
python3 -c "
import json

commands = [
    'set -e',
    'set -a && . /opt/todo/.env && set +a',
    'export IMAGE_URI=${IMAGE_URI}',
    'export AUTH_IMAGE_URI=${AUTH_IMAGE_URI}',
    'aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}',
    'docker pull \"\$IMAGE_URI\"',
    'docker pull \"\$AUTH_IMAGE_URI\"',
    'docker rm -f todo-auth || true',
    'docker run -d --name todo-auth --restart unless-stopped --network todo-net -p 3001:3001 -e PORT=3001 -e JWT_SECRET=\"\$JWT_SECRET\" -e DB_HOST=todo-db -e DB_PORT=5432 -e DB_USER=postgres -e DB_PASSWORD=\"\$DB_PASSWORD\" -e DB_NAME=todo_db -e DB_SSL=false \"\$AUTH_IMAGE_URI\"',
    'docker rm -f todo-app || true',
    'docker run -d --name todo-app --restart unless-stopped --network todo-net -p 80:3000 -e NODE_ENV=production -e PORT=3000 -e DB_TYPE=postgres -e DB_HOST=todo-db -e DB_PORT=5432 -e DB_USER=postgres -e DB_PASSWORD=\"\$DB_PASSWORD\" -e DB_NAME=todo_db -e DB_SSL=false -e JWT_SECRET=\"\$JWT_SECRET\" -v /opt/todo/data:/app/data \"\$IMAGE_URI\"',
    'echo Backend services restarted successfully',
]
print(json.dumps({'commands': commands}))
" > /tmp/ssm-deploy.json

# Send command via SSM
COMMAND_ID=$(aws ssm send-command \
  --region "${AWS_REGION}" \
  --instance-ids "${EC2_INSTANCE_ID}" \
  --document-name "AWS-RunShellScript" \
  --parameters file:///tmp/ssm-deploy.json \
  --query "Command.CommandId" \
  --output text)

echo "SSM Command ID: ${COMMAND_ID}"

# Wait for command to complete (up to 5 minutes)
for i in $(seq 1 150); do
  STATUS=$(aws ssm list-command-invocations \
    --command-id "${COMMAND_ID}" \
    --region "${AWS_REGION}" \
    --query "CommandInvocations[0].CommandPlugins[0].Status" \
    --output text 2>/dev/null || echo "NotReady")

  if [ "${STATUS}" = "Success" ]; then
    echo "Backend deployment successful!"
    exit 0
  elif [ "${STATUS}" = "Failed" ]; then
    echo "Backend deployment failed!"
    aws ssm list-command-invocations --command-id "${COMMAND_ID}" --details --region "${AWS_REGION}"
    exit 1
  fi

  sleep 2
done

echo "Deployment timed out after 5 minutes"
exit 1
