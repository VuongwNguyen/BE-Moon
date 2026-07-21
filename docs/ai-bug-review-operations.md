# Event-driven AI bug review

`AI Bug Review` runs only after the GitHub Actions workflow `Deploy to VPS`
successfully completes for `main`. It sends that workflow's exact `head_sha` to
the VPS, writes it atomically to `/home/saasbot/automation/be-moon-trigger.sha`,
and starts `be-moon-worker.service` once. There is no timer, cron job, or polling.

The worker locks with `flock`, verifies the SHA is on `origin/main`, audits only
the new diff in a read-only Codex sandbox, de-duplicates open Issues, and records
the last successfully reviewed SHA in
`/home/saasbot/automation/be-moon-last-reviewed.sha`. A high-confidence finding
can create at most one `ai-ready` Issue. If no Draft PR is already open, a second
Codex run makes the minimal fix on `develope-for-ai`; the wrapper validates,
commits, pushes, and opens a Draft PR. Nothing auto-merges or deploys.

## Install or update on the VPS

After this branch is available at `/home/saasbot/work/BE-Moon`, run exactly:

```bash
sudo /home/saasbot/work/BE-Moon/scripts/install-ai-bug-review-root
```

The installer is idempotent. It updates only this worker, its service unit, and
the narrow sudo rule needed by the SSH workflow. It does not touch SaaS OS and
does not create or enable any timer.

## Test a trigger safely

Choose a full 40-character SHA that is already contained in `origin/main`:

```bash
SHA="$(git -C /home/saasbot/work/BE-Moon rev-parse origin/main)"
printf '%s\n' "$SHA" > /home/saasbot/automation/be-moon-trigger.sha.tmp
mv /home/saasbot/automation/be-moon-trigger.sha.tmp /home/saasbot/automation/be-moon-trigger.sha
sudo -n /bin/systemctl start be-moon-worker.service
```

Reusing the value in `be-moon-last-reviewed.sha` is an idempotency smoke test:
the worker should log that the commit was already reviewed and exit successfully.
Do not use an unreviewed production SHA unless an actual Codex audit and possible
Issue/fix run is intended.

## Logs and status

```bash
systemctl status be-moon-worker.service --no-pager
journalctl -u be-moon-worker.service -n 200 --no-pager
```

The service is `Type=oneshot`, so `inactive (dead)` after a successful run is
normal. A dirty worktree, invalid SHA, merge conflict, failed validation, or an
existing open PR causes a safe stop or wait; the worker never resets, force-pushes,
merges a PR, deploys, runs PM2, or touches production data.
