// The fallback mode of adapter-static (`build/200.html`, see vite.config.ts)
// has no page-specific server data to hydrate, so each page must skip SSR and
// run fully client-side.
// eslint-disable-next-line unicorn/consistent-boolean-name -- `ssr` is the export name that SvelteKit requires
export const ssr = false;
