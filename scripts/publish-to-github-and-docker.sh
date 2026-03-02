#!/usr/bin/env bash
set -euo pipefail

# Helper: create GitHub repo, push local repo, and set GitHub secrets for Docker publishing.
# Requirements: `gh` (GitHub CLI) authenticated, git installed.

REPO_NAME="todo-app"
GITHUB_VISIBILITY="private" # change to 'public' if you prefer

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required. Install and authenticate: https://cli.github.com/"
  exit 1
fi

if [ ! -d .git ] ; then
  git init
  git add .
  git commit -m "chore: initial commit"
fi

if ! gh repo view "$(git remote get-url origin 2>/dev/null || echo '')" >/dev/null 2>&1; then
  echo "Creating GitHub repo ${REPO_NAME}..."
  gh repo create "${REPO_NAME}" --${GITHUB_VISIBILITY} --source=. --remote=origin --push
else
  echo "Remote repo already exists; skipping create."
fi

echo "If you want this script to set Docker credentials as GitHub secrets, export DOCKER_USERNAME and DOCKER_PASSWORD in your shell before running this script."

if [ -n "${DOCKER_USERNAME-}" ] && [ -n "${DOCKER_PASSWORD-}" ]; then
  echo "Setting GitHub secrets for Docker..."
  gh secret set DOCKER_USERNAME --body "$DOCKER_USERNAME"
  gh secret set DOCKER_PASSWORD --body "$DOCKER_PASSWORD"
  # Optionally set registry (defaults to docker.io)
  gh secret set DOCKER_REGISTRY --body "${DOCKER_REGISTRY-docker.io}"
  echo "Secrets set. Ensure you created the corresponding Docker Hub repository: ${DOCKER_USERNAME}/${REPO_NAME}"
else
  echo "DOCKER_USERNAME or DOCKER_PASSWORD not provided — skipping secret creation."
  echo "Create a Docker Hub repo named ${REPO_NAME} under your Docker Hub account, then set the GitHub secrets:"
  echo "  gh secret set DOCKER_USERNAME --body '<your-docker-username>'"
  echo "  gh secret set DOCKER_PASSWORD --body '<your-docker-password>'"
fi

echo "Done. CI will build/push when you push to main and secrets are present."
