#!/bin/bash
set -e

COMMITS=("ad09eba" "414ccaf" "083b2e6" "ff22e15" "956a074" "e096eaf" "1b9c3b2" "16ab4a0" "58bab31")
BRANCHES=("feat/stage-2" "feat/stage-3" "feat/stage-4" "feat/stage-5" "feat/stage-6" "feat/stage-7" "feat/stage-8" "feat/stage-9" "fix/global-sync-ts")
TITLES=("Stage 2: Mission Control Shell" "Stage 3: Discovery Integration" "Stage 4: Dossier Side Panel" "Stage 5: Engagement Actions" "Stage 6: Safe GitHub Commenting" "Stage 7: GitHub Engagement Sync" "Stage 8: Manual Tracking and AI Claim" "Stage 9: Final Polish and Automation" "Fix TS Errors in global-sync")

for i in "${!COMMITS[@]}"; do
  COMMIT=${COMMITS[$i]}
  BRANCH=${BRANCHES[$i]}
  TITLE=${TITLES[$i]}
  
  echo "Processing $TITLE ($COMMIT)..."
  
  git checkout -b "$BRANCH"
  git cherry-pick "$COMMIT"
  git push -u origin "$BRANCH"
  
  # Create PR and merge immediately
  gh pr create --title "$TITLE" --body "$TITLE implementation" --head "$BRANCH" --base main
  # Sleep to ensure GH processes the PR creation before attempting merge
  sleep 3
  gh pr merge "$BRANCH" --merge --delete-branch
  
  git checkout main
  git pull origin main
done
