<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { ApiError, apiFetch } from '#lib/api.js';
  import Button from '#lib/components/atoms/Button.svelte';
  import { removeScout } from '#lib/scouts.js';
  import { deleteAccount } from '#lib/session.svelte.js';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // The page does not use `FormAction`: that class shows the message of the
  // API, and this page shows a fixed message for each action (#228, decision 13).
  let pendingScoutId = $state<string>();
  let isDeletingAccount = $state(false);
  let errorMessage = $state('');

  async function handleDeleteScout(scoutId: string, name: string) {
    if (!confirm(`Delete ${name}? This also cancels their registrations.`)) return;

    errorMessage = '';
    pendingScoutId = scoutId;
    try {
      await removeScout(apiFetch, scoutId);
      // Runs the `load` again, which reads the scouts.
      await invalidateAll();
    } catch {
      errorMessage = 'Could not delete this scout. Please try again.';
    } finally {
      pendingScoutId = undefined;
    }
  }

  async function handleDeleteAccount() {
    if (!confirm('Delete your account? This cannot be undone.')) return;

    errorMessage = '';
    isDeletingAccount = true;
    try {
      // Deletes the account, signs the user out, and goes to `/sign-in`.
      await deleteAccount(apiFetch);
    } catch (error) {
      errorMessage =
        error instanceof ApiError && error.body?.code === 'close_events_first'
          ? 'Close your events first before deleting your account.'
          : 'Could not delete your account. Please try again.';
    } finally {
      isDeletingAccount = false;
    }
  }
</script>

<svelte:head>
  <title>Settings - Merit Badge University Platform</title>
</svelte:head>

<main class="settings">
  <h1>Settings</h1>

  {#if errorMessage}
    <p class="settings__error" role="alert">{errorMessage}</p>
  {/if}

  <section class="settings__scouts" aria-label="Your scouts">
    <h2>Your scouts</h2>
    {#if data.scouts.length === 0}
      <p>You don't have any scouts yet.</p>
    {:else}
      <ul>
        {#each data.scouts as scout (scout.scoutId)}
          <li>
            {scout.firstName}
            {scout.lastName}
            <Button
              disabled={pendingScoutId === scout.scoutId}
              onclick={() =>
                handleDeleteScout(scout.scoutId, `${scout.firstName} ${scout.lastName}`)}
            >
              Delete
            </Button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="settings__account" aria-label="Account">
    <h2>Account</h2>
    <Button disabled={isDeletingAccount} onclick={handleDeleteAccount}>Delete my account</Button>
  </section>
</main>

<style>
  .settings__error {
    color: red;
  }
</style>
