<!--
  The native select. The children are its `<option>` elements. It has no style
  of its own: #102 adds the design here.
-->
<script lang="ts">
  import type { HTMLSelectAttributes } from 'svelte/elements';

  let { value = $bindable(), children, ...rest }: HTMLSelectAttributes = $props();
</script>

<select bind:value {...rest}>{@render children?.()}</select>
