<!--
  The native textarea. It has no style of its own: #102 adds the design here.
-->
<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';

  let { value = $bindable(), ...rest }: HTMLTextareaAttributes = $props();
</script>

<textarea bind:value {...rest}></textarea>
