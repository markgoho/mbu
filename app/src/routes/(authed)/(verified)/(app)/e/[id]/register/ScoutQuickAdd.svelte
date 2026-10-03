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
  import FieldError from '#lib/components/FieldError.svelte';
  import { FormAction } from '#lib/formAction.svelte.js';

  interface Properties {
    onAdd: (scout: ScoutRequest) => Promise<unknown>;
  }

  let { onAdd }: Properties = $props();

  let firstName = $state('');
  let lastName = $state('');

  // The message of a refusal of the API, and the messages of its fields
  // (#263). A failure with no message of the API shows a fixed message.
  const uid = $props.id();
  const action = new FormAction(uid);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const scout = { firstName: firstName.trim(), lastName: lastName.trim() };
    if (scout.firstName === '' || scout.lastName === '') return;

    await action.run({
      action: () => onAdd(scout),
      fallback: 'Could not add this scout. Please try again.',
      onSuccess: () => {
        firstName = '';
        lastName = '';
      },
    });
  }
</script>

<!-- `novalidate`: no browser validation. The messages of the fields come from the API. -->
<form class="scout-quick-add" novalidate onsubmit={handleSubmit}>
  <h2>Add a scout</h2>

  <label>
    First name
    <TextInput required {...action.fieldAttributes('firstName')} bind:value={firstName} />
  </label>
  <FieldError {action} field="firstName" />

  <label>
    Last name
    <TextInput required {...action.fieldAttributes('lastName')} bind:value={lastName} />
  </label>
  <FieldError {action} field="lastName" />

  {#if action.error}
    <p class="scout-quick-add__error" role="alert">{action.error}</p>
  {/if}

  <Button type="submit" disabled={action.pending}>
    {action.pending ? 'Adding…' : 'Add scout'}
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
