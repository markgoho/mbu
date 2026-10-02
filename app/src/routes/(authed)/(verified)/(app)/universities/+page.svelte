<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import Button from '#lib/components/atoms/Button.svelte';
  import Link from '#lib/components/atoms/Link.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import { formatMediumDate } from '#lib/formatDate.js';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const newUniversityPath = resolve('/(authed)/(verified)/(app)/universities/new');

  // The message is in the URL (`?denied=...`). The navigation to the URL with
  // no query runs the `load` again, which then gives no message.
  async function dismissFlash() {
    await goto(resolve('/(authed)/(verified)/(app)/universities'), { replaceState: true });
  }
</script>

<svelte:head>
  <title>Your Universities - Merit Badge University Platform</title>
</svelte:head>

<main class="dashboard">
  <header class="dashboard__header">
    <h1>Your Universities</h1>
    <Link href={newUniversityPath} class="dashboard__create">Create University</Link>
  </header>

  {#if data.deniedMessage}
    <p class="dashboard__flash" role="status">
      {data.deniedMessage}
      <Button onclick={dismissFlash}>Dismiss</Button>
    </p>
  {/if}

  {#if data.universities.length === 0}
    <p class="dashboard__empty">
      You have not created a University yet.
      <Link href={newUniversityPath}>Create one</Link>.
    </p>
  {:else}
    <ul class="dashboard__list">
      {#each data.universities as university (university.id)}
        <li>
          <Link
            href={resolve('/(authed)/(verified)/(app)/universities/[id]', { id: university.id })}
            class="dashboard__card"
          >
            <span class="dashboard__title">{university.title}</span>
            <span class="dashboard__meta">
              <StatusBadge status={university.status} /> ·
              {formatMediumDate(university.startDate)}
              {#if university.endDate}
                – {formatMediumDate(university.endDate)}
              {/if}
              · {university.classCount}
              {university.classCount === 1 ? 'class' : 'classes'}
            </span>
          </Link>
        </li>
      {/each}
    </ul>
  {/if}
</main>

<style>
  .dashboard {
    max-width: 40rem;
    margin: 2rem auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0 1rem;
  }

  .dashboard__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .dashboard :global(.dashboard__create) {
    text-decoration: none;
    padding: 0.5rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: 0.25rem;
    color: inherit;
  }

  .dashboard__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .dashboard :global(.dashboard__card) {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 1rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    text-decoration: none;
    color: inherit;
    background: var(--color-surface);
  }

  .dashboard__title {
    font-weight: 600;
  }

  .dashboard__meta {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.875rem;
    color: var(--color-muted);
  }

  .dashboard__flash {
    color: var(--color-error);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 0.25rem;
  }

  .dashboard__empty {
    color: var(--color-muted);
  }
</style>
