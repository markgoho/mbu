<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import Button from '#lib/components/atoms/Button.svelte';
  import { reloadUser, resendEmailVerification, session } from '#lib/session.svelte.js';

  let isLoading = $state(false);
  let message = $state('');
  let errorMessage = $state('');

  async function handleResend() {
    isLoading = true;
    message = '';
    errorMessage = '';
    try {
      await resendEmailVerification();
      message = 'Verification email sent. Check your inbox.';
    } catch (error) {
      if (error instanceof Error) errorMessage = error.message;
    } finally {
      isLoading = false;
    }
  }

  async function handleContinue() {
    isLoading = true;
    errorMessage = '';
    try {
      await reloadUser();
      // `reloadUser` changes the user in place, so this is the new value. The
      // `(verified)` and `(app)` guards run for the navigation to the app home.
      if (session.user?.emailVerified) {
        await goto(resolve('/(authed)/(verified)/(app)'));
      } else {
        errorMessage = 'Email is not verified yet. Please try again.';
      }
    } catch (error) {
      if (error instanceof Error) errorMessage = error.message;
    } finally {
      isLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Verify your email - Merit Badge University Platform</title>
</svelte:head>

<main class="verify">
  <h1>Verify your email</h1>
  <p>
    We sent a verification link
    {#if session.user?.email}
      to <strong>{session.user.email}</strong>
    {/if}
    . Open it, then come back and continue.
  </p>

  {#if message}
    <p class="verify__message" role="status">{message}</p>
  {/if}
  {#if errorMessage}
    <p class="verify__error" role="alert">{errorMessage}</p>
  {/if}

  <div class="verify__actions">
    <Button onclick={handleResend} disabled={isLoading}>Resend email</Button>
    <Button onclick={handleContinue} disabled={isLoading}>I've verified — continue</Button>
  </div>
</main>

<style>
  .verify {
    max-width: 30rem;
    margin: 3rem auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .verify__actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .verify__error {
    color: #b00020;
    margin: 0;
  }

  .verify__message {
    color: #1b5e20;
    margin: 0;
  }
</style>
