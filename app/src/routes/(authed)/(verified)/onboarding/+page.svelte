<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { apiFetch } from '#lib/api.js';
  import Button from '#lib/components/atoms/Button.svelte';
  import Checkbox from '#lib/components/atoms/Checkbox.svelte';
  import Link from '#lib/components/atoms/Link.svelte';
  import TextInput from '#lib/components/atoms/TextInput.svelte';
  import { completeOnboarding, session } from '#lib/session.svelte.js';

  // The page does not use `FormAction`: that class shows the message of the
  // API, and this page shows one fixed message (#228, decision 13).
  let isLoading = $state(false);
  let errorMessage = $state('');

  let displayName = $state(session.user?.displayName ?? '');
  let hasAcceptedTerms = $state(false);
  // A field shows its message only after the user left it, or tried to submit.
  let touched = $state({ displayName: false, acceptedTerms: false });

  const trimmedName = $derived(displayName.trim());

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!trimmedName || !hasAcceptedTerms) {
      touched = { displayName: true, acceptedTerms: true };
      return;
    }

    isLoading = true;
    errorMessage = '';
    try {
      await completeOnboarding(apiFetch, { displayName: trimmedName, acceptedTerms: true });
      // `invalidateAll` makes the `(app)` guard bootstrap the account again.
      await goto(resolve('/(authed)/(verified)/(app)'), { invalidateAll: true });
    } catch {
      errorMessage = 'Could not save your details. Please try again.';
    } finally {
      isLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Onboarding - Merit Badge University Platform</title>
</svelte:head>

<main class="onboarding">
  <h1>Welcome</h1>
  <p>Finish setting up your account.</p>

  {#if errorMessage}
    <p class="onboarding__error" role="alert">{errorMessage}</p>
  {/if}

  <!-- `novalidate`: the page shows its own field messages, not those of the browser. -->
  <form class="onboarding__form" novalidate onsubmit={handleSubmit}>
    <label for="displayName">Your name</label>
    <TextInput
      id="displayName"
      autocomplete="name"
      bind:value={displayName}
      onblur={() => (touched.displayName = true)}
    />
    {#if !trimmedName && touched.displayName}
      <p class="onboarding__error">Please enter your name.</p>
    {/if}

    <label class="onboarding__checkbox">
      <Checkbox bind:checked={hasAcceptedTerms} onblur={() => (touched.acceptedTerms = true)} />
      I agree to the <Link href={resolve('/terms')}>Terms</Link> and
      <Link href={resolve('/privacy')}>Privacy Policy</Link>
    </label>
    {#if !hasAcceptedTerms && touched.acceptedTerms}
      <p class="onboarding__error">You must accept the Terms and Privacy Policy.</p>
    {/if}

    <Button type="submit" disabled={isLoading}>
      {#if isLoading}
        Saving…
      {:else}
        Continue
      {/if}
    </Button>
  </form>
</main>

<style>
  .onboarding {
    max-width: 24rem;
    margin: 3rem auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .onboarding__form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .onboarding__checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .onboarding__error {
    color: #b00020;
    font-size: 0.875rem;
    margin: 0;
  }
</style>
