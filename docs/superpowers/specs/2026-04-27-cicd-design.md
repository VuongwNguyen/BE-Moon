# CI/CD Design — BE-Moon

**Date:** 2026-04-27  
**Approach:** GitHub Actions + SSH

## Overview

Auto-deploy to VPS on every push to `main`, with manual trigger option via GitHub UI.

**Flow:**
```
push to main (or manual trigger)
        │
        ▼
  GitHub Actions (ubuntu-latest)
        │
        ├─ SSH into VPS
        ├─ git pull origin main
        ├─ yarn install --frozen-lockfile
        └─ pm2 restart my-app
```

## Triggers

| Trigger | When |
|---------|------|
| `push` to `main` | Every commit merged/pushed to main |
| `workflow_dispatch` | Manual — click "Run workflow" in GitHub Actions tab |

## GitHub Secrets Required

All 5 secrets already configured in repo settings:

| Secret | Description |
|--------|-------------|
| `VPS_HOST` | VPS IP address |
| `VPS_USER` | SSH username |
| `VPS_SSH_KEY` | SSH private key (ed25519) |
| `VPS_PORT` | SSH port (default 22) |
| `VPS_APP_PATH` | Absolute path to app on VPS |

## Files to Create

### `.github/workflows/deploy.yml`

```yaml
name: Deploy to VPS

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.2.0
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          port: ${{ secrets.VPS_PORT }}
          script: |
            cd ${{ secrets.VPS_APP_PATH }}
            git pull origin main
            yarn install --frozen-lockfile
            pm2 restart my-app
```

## Key Decisions

- `--frozen-lockfile`: installs exactly what's in `yarn.lock`, prevents surprise updates on production
- `appleboy/ssh-action@v1.2.0`: most widely used SSH deploy action, no extra software needed on VPS
- PM2 app name `my-app`: matches existing `pm2 start npm --name my-app -- run start`
- SSH key type `ed25519`: modern, smaller, faster than RSA

## Out of Scope

- Docker / containerization
- Staging environment
- Rollback mechanism
- Slack/email notifications on deploy failure
