# Context Map

## Contexts

- [Hugo site](./CONTEXT.md) — public static site rendering merit badge requirements scraped from scouting.org
- [Event platform](./functions/CONTEXT.md) — self-serve SaaS (Angular SPA in `app/` + Elysia APIs in `functions/`) letting chancellors run Merit Badge Universities

## Relationships

- **Hugo site → Event platform**: the event platform's badge catalog (`functions/src/catalog/merit-badges.ts`) is a derived copy of the Hugo site's canonical list (`scripts/merit-badges.ts`); `Classes` in the event platform link to it by slug.
