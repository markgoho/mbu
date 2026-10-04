# Context Map

## Contexts

- [Hugo site](./CONTEXT.md) — public static site rendering merit badge requirements scraped from scouting.org
- [Event platform](./api/CONTEXT.md) — self-serve SaaS (SvelteKit SPA in `app/` + the Go API in `api/`, on Cloud Run with Postgres) letting chancellors run Merit Badge Universities. API decisions are in [`api/docs/adr/`](./api/docs/adr/); the app decision (SvelteKit) is in [`app/docs/adr/0002-app-spa-is-sveltekit.md`](./app/docs/adr/0002-app-spa-is-sveltekit.md)

## Relationships

- **Hugo site → Event platform**: the event platform's badge catalog (`api/internal/catalog/badges.json`, made by `bun run generate:badge-catalog`) is a derived copy of the Hugo site's canonical list (`scripts/merit-badges.ts`); `Classes` in the event platform link to it by slug.
