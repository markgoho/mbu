<!--
  The native anchor. It has no style of its own: #102 adds the design here.

  The `href` is a URL that is already resolved. For a route of the app, the
  caller makes it with `resolve()` from `$app/paths`, for example
  `<Link href={resolve('/(authed)/(verified)/(app)/universities')}>`.
-->
<script lang="ts">
  import type { HTMLAnchorAttributes } from 'svelte/elements';

  interface Properties extends HTMLAnchorAttributes {
    href: string;
  }

  let { href, children, ...rest }: Properties = $props();
</script>

<a {href} {...rest}>{@render children?.()}</a>
