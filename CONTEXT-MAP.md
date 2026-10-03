# Context Map

## Contexts

- [Hugo site](./CONTEXT.md) — public static site rendering merit badge requirements scraped from scouting.org
- [Event platform](./api/CONTEXT.md) — self-serve SaaS (SvelteKit SPA in `app/` + the Go API in `api/`, which replaces the Elysia APIs in `functions/`) letting chancellors run Merit Badge Universities. API decisions are in [`api/docs/adr/`](./api/docs/adr/); the app decision (SvelteKit) is in [`functions/docs/adr/0002-app-spa-is-sveltekit.md`](./functions/docs/adr/0002-app-spa-is-sveltekit.md)

## Relationships

- **Hugo site → Event platform**: the event platform's badge catalog (`functions/src/catalog/merit-badges.ts`; the Go API's catalog after #248) is a derived copy of the Hugo site's canonical list (`scripts/merit-badges.ts`); `Classes` in the event platform link to it by slug.
