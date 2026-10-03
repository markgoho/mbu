<!--
  The message of one field at fault, from the last failure of a `FormAction`.
  Put it after the control, and spread `action.fieldAttributes(field)` on the
  control: the control then points to this message (`aria-describedby`).
-->
<script lang="ts">
  import type { FormAction } from '#lib/formAction.svelte.js';

  interface Properties {
    action: FormAction;
    /**
    The JSON name of the field in the request (`location.city`).
    */
    field: string;
  }

  let { action, field }: Properties = $props();

  const message = $derived(action.fieldError(field));
</script>

{#if message}
  <p class="field-error" id={action.fieldErrorId(field)}>{message}</p>
{/if}

<style>
  .field-error {
    color: var(--color-error);
    margin: 0;
  }
</style>
