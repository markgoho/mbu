import { createRawSnippet } from 'svelte';

/**
 * Makes a `children` snippet for a component spec, because a spec file has no
 * template. The HTML must be one element.
 */
export function htmlSnippet(html: string) {
  return createRawSnippet(() => ({ render: () => html }));
}
