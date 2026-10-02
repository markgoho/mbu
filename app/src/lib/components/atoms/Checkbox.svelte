<!--
  The native checkbox. The bound value is `checked`, which is the binding of
  the native element. The caller supplies the label. It has no style of its
  own: #102 adds the design here.
-->
<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface Properties extends Omit<HTMLInputAttributes, 'type' | 'checked' | 'files' | 'group'> {
    checked?: boolean;
  }

  let { checked = $bindable(false), ...rest }: Properties = $props();
</script>

<input type="checkbox" bind:checked {...rest} />
