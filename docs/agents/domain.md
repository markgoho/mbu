# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT-MAP.md`** at the repo root — points at one `CONTEXT.md` per context. Read each one relevant to the topic.
- **`docs/adr/`** at the root — system-wide/cross-context decisions.
- The relevant context's own `docs/adr/` — context-scoped decisions.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

```
/
├── CONTEXT-MAP.md
├── CONTEXT.md                         ← Hugo site context
├── docs/adr/                          ← system-wide decisions
└── functions/
    ├── CONTEXT.md                     ← event-platform context (shared by app/ + functions/)
    └── docs/adr/                      ← event-platform-scoped decisions
```

## Contexts

- **Hugo site** — the public static site rendering merit badge requirements scraped from scouting.org. Domain doc: root `CONTEXT.md`. ADRs: root `docs/adr/`.
- **Event platform** — the self-serve SaaS (Angular SPA in `app/`, Elysia APIs in `functions/`) letting chancellors run Merit Badge Universities. One domain doc (`functions/CONTEXT.md`) covers both `app/` and `functions/` since the domain language (Chancellor, Event, Roster, etc.) is identical on both sides of that stack. ADRs: `functions/docs/adr/`.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in the relevant context's `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_
