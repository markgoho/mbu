<!--
  The native button. It has no style of its own: #102 adds the design here.
  The type is `button` unless the caller gives one, so a button in a form does
  not submit it by accident.
-->
<script lang="ts">
  import type { HTMLButtonAttributes } from 'svelte/elements';

  let { type = 'button', children, ...rest }: HTMLButtonAttributes = $props();
</script>

<button {type} {...rest}>{@render children?.()}</button>
