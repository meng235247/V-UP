# Local Emulator Test Runbook (AI Collaboration)

This runbook is the canonical process to boot a stable local test environment that behaves like production flow (clickable pages, login, save profile, public page rendering, uploads, milestones/posts).

## Scope

- Do not change UI files for environment bring-up.
- Use Firebase emulators (Auth + Firestore) and local upload server.
- Ensure repeatable startup with seeded VTuber test accounts.

## One-command Happy Path

Run from workspace root (`D:\code\vup\V-UP`):

```powershell
npm run local:reset
```

What it does:

1. `local:stop`: stops old/stale local processes (PID file + known ports).
2. `local:start`: starts Vite (5173), upload server (5176), Firestore emulator (8081), Auth emulator (9099), and waits until ports are truly ready.
3. `seed:vtuber`: seeds deterministic test accounts + profile/handle docs + demo milestone data.
4. `local:smoke`: validates routes, upload preflight, emulator data, and test account integrity.

If this command succeeds, environment is considered ready.

## URLs

- Web: `http://127.0.0.1:5173/index.html`
- Auth page: `http://127.0.0.1:5173/auth.html`
- Dashboard: `http://127.0.0.1:5173/dashboard.html`
- Public page example: `http://127.0.0.1:5173/vtuber_profile.html?id=auroramizu`
- Firestore emulator: `127.0.0.1:8081`
- Auth emulator: `127.0.0.1:9099`
- Upload server: `127.0.0.1:5176`

## Test Accounts (seeded)

1. `vtuber.aurora@test.local` / `VtuberTest123!` (handle: `auroramizu`)
2. `vtuber.nova@test.local` / `VtuberTest123!` (handle: `novakaze`)
3. `fan.test@test.local` / `FanTest123!` (role: `fan`)

These are created/updated by `scripts/seed-vtuber-emulator.js`.

## Manual End-to-End Validation Checklist

### Part 1: VTuber Dashboard & Publishing Flow
Use one seeded VTuber account and verify:

1. Open `index.html` and navigate to `auth.html`.
2. Login with seeded VTuber credentials.
3. Reach `dashboard.html` without milestone loading errors.
4. In dashboard, save profile fields (including handle) and confirm no permission errors.
5. Upload an image/file in dashboard and confirm upload URL is generated.
6. Create/publish milestone and verify it appears.
7. Create a public post and (optional) supporters-only post.
8. Open public page with handle (`vtuber_profile.html?id=<handle>`) and verify rendered content.
9. Logout and reopen public page; public content must remain visible.

### Part 2: Fan Sponsorship & Profile Verification
1. Login with seeded Fan credentials (`fan.test@test.local`).
2. Visit `vtuber_profile.html?id=auroramizu`.
3. Click "Sponsor" on the demo milestone and submit a simulated payment.
4. Verify that the milestone progress bar updates immediately without reloading the page.
5. Navigate to `fan_profile.html` and verify the sponsorship record, supported VTuber, and badge appear in the UI.

If browser appears to cache stale code, close old tabs and hard refresh (`Ctrl+F5`).

## Fast Diagnostics

```powershell
npm run local:doctor
```

This prints:

- Netstat for required ports.
- Quick HTTP checks.
- Tail of emulator/dev/upload logs.

## Troubleshooting (Known Failure Modes)

1. `chrome-error://chromewebdata` / cannot open `127.0.0.1:5173`
   - Root cause: Vite not running or crashed.
   - Fix: `npm run local:reset`.

2. `Property status is undefined` or `Property vtuberId is undefined` in milestone list
   - Root cause: rules evaluated on legacy docs with missing fields.
   - Fix: ensure latest `firestore.rules` is loaded by restarting via `npm run local:reset`.

3. Firestore emulator fails to start with jar path oddities
   - Root cause: bad env path handling.
   - Fix: use `scripts/start-local-dev.ps1` only (already patched with quoted env assignment).

4. Upload works in UI but stored file URL fails
   - Root cause: upload server not active on 5176.
   - Fix: check `npm run local:doctor`, then `npm run local:reset`.

5. Seed fails with `ECONNREFUSED 127.0.0.1:9099`
   - Root cause: Auth emulator not yet up.
   - Fix: rerun `npm run local:start` then `npm run seed:vtuber`.

## Commands Reference

```powershell
# Start only
npm run local:start

# Stop only
npm run local:stop

# Seed only
npm run seed:vtuber

# Smoke check only
npm run local:smoke

# Full reset (recommended default)
npm run local:reset
```

## Notes for AI Collaborators

- Prefer `npm run local:reset` before spending tokens on debugging.
- Do not change UI to solve environment issues.
- If startup fails, run `npm run local:doctor` and inspect `.codex-runtime/*.log`.
- Keep test identities deterministic (emails/handles above) so cross-session testing is stable.
