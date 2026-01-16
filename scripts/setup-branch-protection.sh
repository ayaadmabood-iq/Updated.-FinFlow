#!/bin/bash

# Setup branch protection rules for main and develop branches
# Run this script once to configure GitHub branch protection

REPO_OWNER="your-org"
REPO_NAME="fineflow"
GITHUB_TOKEN="${GITHUB_TOKEN}"

setup_branch_protection() {
  local BRANCH=$1
  
  echo "Setting up branch protection for $BRANCH..."
  
  curl -X PUT \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/branches/$BRANCH/protection" \
    -d '{
      "required_status_checks": {
        "strict": true,
        "contexts": [
          "Code Quality Checks",
          "Security Scanning",
          "Unit Tests",
          "Build Application"
        ]
      },
      "enforce_admins": true,
      "required_pull_request_reviews": {
        "dismissal_restrictions": {},
        "dismiss_stale_reviews": true,
        "require_code_owner_reviews": true,
        "required_approving_review_count": 2
      },
      "restrictions": null,
      "required_linear_history": true,
      "allow_force_pushes": false,
      "allow_deletions": false,
      "required_conversation_resolution": true
    }'
  
  echo "Branch protection setup complete for $BRANCH"
}

setup_branch_protection "main"
setup_branch_protection "develop"

echo ""
echo "All branch protection rules configured successfully!"
