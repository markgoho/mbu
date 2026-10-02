<!--
  The minimal "add a scout" form: the first name and the last name only. The
  parent can add the other profile fields later.

  The form does not call the API. It gives the names to `onAdd`, which adds the
  scout and loads the data of the route again.
-->
<script lang="ts">
  import type { ScoutRequest } from '#lib/api-types/users-api.types.js';
  import Button from '#lib/components/atoms/Button.svelte';
  import TextInput from '#lib/components/atoms/TextInput.svelte';

  interface Properties {
    onAdd: (scout: ScoutRequest) => Promise<unknown>;
  }

  let { onAdd }: Properties = $props();

  let firstName = $state('');
  let lastName = $state('');

  // The form does not use `FormAction`: that class shows the message of the
  // API, and this form shows a fixed message (#228, decision 13).
  let isAdding = $state(false);
  let errorMessage = $state('');

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const scout = { firstName: firstName.trim(), lastName: lastName.trim() };
    if (isAdding || scout.firstName === '' || scout.lastName === '') return;

    isAdding = true;
    errorMessage = '';
    try {
      await onAdd(scout);
      firstName = '';
      lastName = '';
    } catch {
      errorMessage = 'Could not add this scout. Please try again.';
    } finally {
      isAdding = false;
    }
  }
</script>

<!-- `novalidate`: the Angular form had no browser validation and no field messages. -->
<form class="scout-quick-add" novalidate onsubmit={handleSubmit}>
  <h2>Add a scout</h2>

  <label>
    First name
    <TextInput required bind:value={firstName} />
  </label>

  <label>
    Last name
    <TextInput required bind:value={lastName} />
  </label>

  {#if errorMessage}
    <p class="scout-quick-add__error" role="alert">{errorMessage}</p>
  {/if}

  <Button type="submit" disabled={isAdding}>
    {isAdding ? 'Adding…' : 'Add scout'}
  </Button>
</form>

<style>
  .scout-quick-add {
    display: grid;
    gap: 0.75rem;
    max-width: 20rem;
  }

  .scout-quick-add label {
    display: grid;
    gap: 0.25rem;
    font-size: 0.875rem;
  }

  .scout-quick-add__error {
    color: var(--color-error);
    margin: 0;
  }
</style>
