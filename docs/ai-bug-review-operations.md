# Event-driven AI bug review

`AI Bug Review` runs only after the GitHub Actions workflow `Deploy to VPS`
successfully completes for `main`. It sends that workflow's exact `head_sha` to
the VPS and passes it as one validated argument to the root-owned
`/usr/local/sbin/be-moon-trigger-review` helper. The helper validates it again,
writes `/home/saasbot/automation/be-moon-trigger.sha` atomically as
`saasbot:saasbot` mode `0640`, and starts `be-moon-worker.service` once. There is
no timer, cron job, or polling.

The worker locks with `flock`, verifies the SHA is on `origin/main`, audits only
the new diff in a read-only Codex sandbox, de-duplicates open Issues, and records
the last successfully audited SHA in
`/home/saasbot/automation/be-moon-last-reviewed.sha`. A high-confidence finding
can create at most one `ai-ready` Issue. If no Draft PR is already open, a second
Codex run makes the minimal fix on `develope-for-ai`; the wrapper validates,
commits, pushes, and opens a Draft PR. Nothing auto-merges or deploys.
Retrying an already audited SHA skips duplicate auditing but still resumes an
open `ai-ready` Issue when its fix or Draft PR is unfinished.

## Install or update on the VPS

The installer takes one non-secret argument: the Linux username used by the
workflow's SSH connection. This is the account configured by `VPS_USER`; it is
not necessarily `saasbot`. Do not put a secret value in the documentation or
repository. After this branch is available, substitute the actual Linux account:

```bash
sudo /home/saasbot/work/BE-Moon/scripts/install-ai-bug-review-root actual-linux-username
```

The installer is idempotent. It updates only this worker, its service unit, and
the root-owned trigger helper. The named SSH Linux user receives permission to
sudo only that helper; the helper accepts exactly one lowercase 40-character Git
SHA. Preflight checks require `git`, `gh`, `codex`, `jq`, `flock`, `node`, `yarn`,
`systemctl`, and `visudo`; missing packages are reported but never installed.
The installer does not touch SaaS OS and does not create or enable any timer.

## Test a trigger safely

Choose a full 40-character SHA that is already contained in `origin/main`:

```bash
SHA="$(git -C /home/saasbot/work/BE-Moon rev-parse origin/main)"
sudo -n /usr/local/sbin/be-moon-trigger-review "$SHA"
```

Reusing the value in `be-moon-last-reviewed.sha` is a retry smoke test: the worker
must skip audit, then wait on an open PR, resume an unfinished `ai-ready` Issue,
or exit if no Issue exists. Do not use an unreviewed production SHA unless an
actual Codex audit and possible Issue/fix run is intended.

## Logs and status

```bash
systemctl status be-moon-worker.service --no-pager
journalctl -u be-moon-worker.service -n 200 --no-pager
```

The service is `Type=oneshot`, so `inactive (dead)` after a successful run is
normal. A dirty worktree, invalid SHA, merge conflict, failed validation, or an
existing open PR causes a safe stop or wait; the worker never resets, force-pushes,
merges a PR, deploys, runs PM2, or touches production data.
