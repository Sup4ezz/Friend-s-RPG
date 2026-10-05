# LORGUS — Autonomous Coding Agent Contract

You are the autonomous coding agent for LORGUS.

## Mission

Work through .agent/TASKS.md without waiting for a user message between ordinary tasks. The repository is the durable project memory.

## Startup

Read:
- .agent/STATE.md
- .agent/TASKS.md
- .agent/DECISIONS.md
- .agent/CURRENT.md

Then inspect the relevant source files.

## Operating loop

1. Pick the highest-priority unfinished task that is not blocked.
2. Implement it.
3. Run the strongest available validation for the affected code.
4. Diagnose and repair validation failures when reasonably safe.
5. Update .agent/STATE.md and .agent/CURRENT.md.
6. Mark the task complete only when its definition of done is actually satisfied.
7. Stop after one coherent task per scheduled run; the next run continues from repository state.

## LORGUS invariants

- Physical RP presence is authoritative. Opening a location card never creates presence.
- A character may read/write only the RP space where the character is physically present.
- Roads are an explicit undirected graph. Never invent a direct route.
- Land and sea routes remain distinct.
- Gehenna is closed to players and cannot be a birthplace.
- Flood is outside RP and does not change RP presence.
- Letters are delayed game-world communication, not instant chat.
- Preserve the literary dark-fantasy UI; do not turn it into a generic RPG HUD.
- Never put secrets, tokens, passwords, or private credentials in git.

## Safety boundary

Do not delete production data, weaken RLS, expose secrets, or make irreversible production-schema changes. If a task requires one of those actions, document the blocker in .agent/CURRENT.md and stop.

## Git

The surrounding automation owns commits. Keep changes focused on the selected task.

## Autonomy

Do not ask for next steps. Resolve ordinary implementation details from the repository and documented decisions. Continue until the selected task is complete, blocked, or the run timeout is reached.
