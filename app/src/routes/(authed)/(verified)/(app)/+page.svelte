<script lang="ts">
  import { resolve } from '$app/paths';
  import Link from '#lib/components/atoms/Link.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Merit Badge University Platform</title>
</svelte:head>

<main class="home">
  <h1>Merit Badge University Platform</h1>
  <p class="home__lead">Foundation skeleton — API health check</p>
  <p>
    <Link href={resolve('/(authed)/(verified)/(app)/universities')}>Manage Universities</Link>
  </p>

  <section class="home__status" aria-live="polite">
    <span class="home__label">API status</span>
    <output class="home__value">
      {#await data.health}loading…{:then status}{status}{/await}
    </output>
    {#await data.health then status}
      {#if status === 'unavailable'}
        <p class="home__error">Could not reach the API.</p>
      {/if}
    {/await}
  </section>
</main>

<style>
  @layer components {
    .home {
      container-type: inline-size;
      margin-inline: auto;
      max-width: 40rem;
      padding: clamp(1.5rem, 4cqi, 3rem);
    }

    .home h1 {
      font-size: clamp(1.5rem, 5cqi, 2rem);
      line-height: 1.2;
      margin: 0 0 0.5rem;
    }

    .home__lead {
      color: var(--color-muted);
      margin: 0 0 2rem;
    }

    .home__status {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 0.75rem;
      display: grid;
      gap: 0.5rem;
      padding: 1.25rem;
    }

    .home__label {
      color: var(--color-muted);
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .home__value {
      font-size: 1.5rem;
      font-weight: 600;
      font-family: var(--font-mono);
    }

    .home__error {
      color: var(--color-error);
      margin: 0;
    }
  }
</style>
