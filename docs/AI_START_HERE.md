# LORGUS — AI agent entry point

> Read this file first when starting a new ChatGPT, Codex, Claude, or other agent session.
> This is an index and operating contract, not a replacement for the detailed project memory.
> Updated: 2026-10-26. Documentation-only change; no app code, production data, Supabase schema, Telegram messages, or deploy configuration changed.

## 1. Read in this order

1. `AGENTS.md` — mandatory repository rules and safety boundaries.
2. `LORGUS_CHECKLIST.md` — master project memory; required reading and required update after each completed task.
3. `.agent/CURRENT.md` — last known stopping point and next task.
4. `.agent/STATE.md` — technical context and historical notes.
5. `.agent/TASKS.md` — task queue.
6. `.agent/DECISIONS.md` — architecture decisions.
7. `docs/AGENT_AUDIT_20261026.md` — findings from the latest static/read-only audit.
8. `docs/HANDOFF_CLAUDE.md` — fuller handoff and audit protocol.
9. `docs/LAUNCH_SMOKE_TEST.md` — existing manual smoke-test scenarios, where relevant.

Do not assume historical notes are still true without checking current code, GitHub Actions, and the relevant live behavior.

## 2. Project in one minute

- LORGUS is a literary dark-fantasy browser RP platform, not a generic RPG HUD.
- Frontend: static HTML/CSS/JavaScript, with `app.js`, `index.html`, `style.css`, `src/**`.
- Backend: Supabase Auth, database, RLS, RPCs, Storage, and Edge Functions.
- The repository includes a Cloudflare Worker and a GitHub Actions workflow that can deploy to Cloudflare.
- The owner has also reported using the static host `https://friend-s-rpg.layero.app/`. The actual canonical production host and deployed commit are **not yet reconciled** with the repository's older Cloudflare documentation. Do not infer that both hosts are synchronized.
- Core rules: physical RP presence is authoritative; only canonical direct routes are allowed; Flood is not RP; mail is delayed in-world communication; Gehenna remains closed to players; preserve world canon and the established visual style.

## 3. Mandatory safety contract

- Start with a read-only audit. Confirm symptoms before changing code.
- Do not change production, run production SQL, apply migrations, modify grants/RLS, send Telegram test messages, or alter live player data during an audit.
- Do not create a test account or persistent test rows without explicit task authorization and a safe cleanup plan. Prefer existing isolated test fixtures when available.
- Never ask the owner to paste passwords, API keys, service-role keys, bot tokens, or one-time codes into chat. Never commit secrets.
- Do not guess Telegram chat/topic IDs, production migration status, or which host is canonical.
- Do not treat an RPC timeout as proof that authorization is broken. Do not bypass an access check to hide a hang.
- Keep changes narrow and reversible. Use a separate branch and reviewable diff for risky work.
- Documentation-only changes should not deploy the application; keep them confined to docs/agent memory files. Do not change the deploy workflow as part of documentation work.
- Never claim a fix or test passed unless the corresponding check actually ran and its result was observed.

## 4. Required task loop

1. Read the ordered context files above.
2. Check current branch/head and inspect the relevant implementation and recent changes.
3. Write down the baseline, evidence, hypotheses, and acceptance criteria.
4. Make the smallest safe change on a separate branch.
5. Run the checks that are possible; clearly label checks not run.
6. Review the diff for unrelated changes, data loss, security regressions, and deployment triggers.
7. Update `LORGUS_CHECKLIST.md` and the relevant `.agent/*.md` files with what changed, checks/results, unresolved issues, stopping point, and one concrete next task.
8. Report the branch/commit or PR link, changed files, verification, risks, and next step. Do not merge or deploy without explicit authorization where production could be affected.

## 5. Current priorities (2026-10-26)

### P0 — resolve host/deployment truth
- Compare recent GitHub Actions runs and commit SHAs.
- Determine which host is actually canonical: Layero, Cloudflare Worker, or both for different purposes.
- Verify what each host serves without changing the workflow or deploying.
- Only then propose a migration of the deployment workflow.

### P1 — security findings from the read-only audit
- Test the draft currency-transfer blacklist gate on an isolated test database; it is not merged to `main` and must not be assumed applied to production.
- Inspect actual grants for `lorgus_telegram_client_error_event()`; the missing explicit revoke in one migration is a finding to verify, not proof of direct exploitability.
- Review the currency transfer SECURITY DEFINER RPC and preserve current authorization, ownership, balance, and RLS behavior.
- Never run security experiments against real players or live balances.

### P1 — Telegram delivery
- Confirm the real topic IDs for applications, items, replies, and mentions from authoritative configuration.
- Fix event-type routing/formatting only after destinations are confirmed.
- Decide explicitly how to handle the 35 historical `rp_message` failures (`message thread not found`); do not replay or send test messages in production without approval.

### P2 — reproducible browser QA
- Initial unauthenticated desktop pass on Layero found the login landing and a guide popup across routes. Empty login fields show browser-native required-field validation.
- That pass did **not** validate authenticated flows, mobile layout, console/network errors, real load performance, application submission, or admin behavior.
- Next, use a dedicated test account only when authorized and use a safe cleanup plan. Test desktop and mobile sizes, screenshots, buttons, navigation, forms, image loading, Markdown, admin startup, and network/console errors.
- Treat TinyFish navigation/fetch duration as tool timing, not a valid page-performance metric.

## 6. Known audit evidence and caveats

See `docs/AGENT_AUDIT_20261026.md` for details. Key findings are static/read-only and not all runtime-reproduced:
- Workflow `.github/workflows/deploy-lorgus.yml` still deploys to Cloudflare on qualifying pushes to `main`; documentation paths are ignored, but app changes may deploy there.
- `public.lorgus_transfer_character_currency_in_chat(...)` draft blacklist guard exists on branch `audit/currency-transfer-blacklist-guard`, not `main`.
- Telegram notifier has topic/formatter issues described in the audit; do not guess topic IDs.
- SECURITY DEFINER trigger ACL needs verification.
- Admin startup hangs, Layero slowness, missing portraits, and Lorebook Markdown are reported symptoms; current root causes are not proven.

## 7. Definition of done

A task is done only when:
- the requested behavior is implemented or the investigation is fully documented;
- appropriate checks are run and their exact result is recorded;
- no unrelated or unsafe production changes were made;
- `LORGUS_CHECKLIST.md` is updated;
- the next agent can continue from this file and the linked project memory without asking the owner to reconstruct prior context.
