<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '#lib/components/atoms/Button.svelte';
  import TextInput from '#lib/components/atoms/TextInput.svelte';
  import { isEmailAddress } from '#lib/emailAddress.js';
  import {
    completeGoogleRedirect,
    signInWithEmailPassword,
    signInWithGoogle,
    signUpWithEmailPassword,
  } from '#lib/session.svelte.js';

  const MIN_PASSWORD_LENGTH = 6;

  let mode = $state<'sign-in' | 'sign-up'>('sign-in');
  let isLoading = $state(false);
  let errorMessage = $state('');

  let email = $state('');
  let password = $state('');
  // A field shows its message only after the user left it, or tried to submit.
  let touched = $state({ email: false, password: false });

  const isEmailValid = $derived(isEmailAddress(email));
  const isPasswordValid = $derived(password.length >= MIN_PASSWORD_LENGTH);

  function showError(error: unknown) {
    if (error instanceof Error) errorMessage = error.message;
  }

  // The page does not navigate after a sign-in. The session functions
  // invalidate all `load` data, the `(signed-out)` guard runs again, and it
  // sends the signed-in user to the `returnTo` path or to the app home.

  // The Google sign-in goes to Google and comes back, so the result of a
  // completed sign-in is collected on the page load after the redirect back.
  onMount(async () => {
    try {
      await completeGoogleRedirect();
    } catch (error) {
      showError(error);
    }
  });

  function toggleMode() {
    mode = mode === 'sign-in' ? 'sign-up' : 'sign-in';
    errorMessage = '';
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (!isEmailValid || !isPasswordValid) {
      touched = { email: true, password: true };
      return;
    }

    isLoading = true;
    errorMessage = '';
    try {
      await (mode === 'sign-in'
        ? signInWithEmailPassword(email, password)
        : signUpWithEmailPassword(email, password));
    } catch (error) {
      showError(error);
    } finally {
      isLoading = false;
    }
  }

  async function handleGoogle() {
    isLoading = true;
    errorMessage = '';
    try {
      // The browser goes to Google here, so the page stays in the loading state.
      await signInWithGoogle();
    } catch (error) {
      showError(error);
      isLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Sign in - Merit Badge University Platform</title>
</svelte:head>

<main class="auth">
  <h1>{mode === 'sign-in' ? 'Sign In' : 'Create Account'}</h1>

  {#if errorMessage}
    <p class="auth__error" role="alert">{errorMessage}</p>
  {/if}

  <Button class="auth__google" onclick={handleGoogle} disabled={isLoading}>
    Continue with Google
  </Button>

  <!-- `novalidate`: the page shows its own field messages, not those of the browser. -->
  <form class="auth__form" novalidate onsubmit={handleSubmit}>
    <label for="email">Email</label>
    <TextInput
      id="email"
      type="email"
      autocomplete="email"
      bind:value={email}
      onblur={() => (touched.email = true)}
    />
    {#if !isEmailValid && touched.email}
      <p class="auth__error">Enter a valid email address.</p>
    {/if}

    <label for="password">Password</label>
    <TextInput
      id="password"
      type="password"
      autocomplete="current-password"
      bind:value={password}
      onblur={() => (touched.password = true)}
    />
    {#if !isPasswordValid && touched.password}
      <p class="auth__error">Password must be at least 6 characters.</p>
    {/if}

    <Button type="submit" disabled={isLoading}>
      {#if isLoading}
        Please wait…
      {:else}
        {mode === 'sign-in' ? 'Sign In' : 'Sign Up'}
      {/if}
    </Button>
  </form>

  <Button class="auth__toggle" onclick={toggleMode}>
    {#if mode === 'sign-in'}
      Need an account? Sign up
    {:else}
      Already have an account? Sign in
    {/if}
  </Button>
</main>

<style>
  .auth {
    max-width: 22rem;
    margin: 3rem auto;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .auth__form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .auth__error {
    color: #b00020;
    font-size: 0.875rem;
    margin: 0;
  }

  /* The buttons are elements of the Button atom, so the selector is global below the page root. */
  .auth :global(.auth__toggle),
  .auth :global(.auth__google) {
    background: none;
    border: 1px solid currentColor;
    padding: 0.5rem;
    cursor: pointer;
  }
</style>
