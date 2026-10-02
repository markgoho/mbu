<script lang="ts">
  import { resolve } from '$app/paths';
  import Link from '#lib/components/atoms/Link.svelte';
  import { formatMediumDate, formatMediumDateTime } from '#lib/formatDate.js';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Review Queue - Merit Badge University Platform</title>
</svelte:head>

<main class="review-queue">
  <header class="review-queue__header">
    <h1>Review Queue</h1>
  </header>

  {#if data.universities.length === 0}
    <p class="review-queue__empty">Nothing is waiting for review.</p>
  {:else}
    <ul class="review-queue__list">
      {#each data.universities as row (row.id)}
        <li>
          <Link
            href={resolve('/(authed)/(verified)/(app)/admin/review/[id]', { id: row.id })}
            class="review-queue__card"
          >
            <span class="review-queue__title">{row.title}</span>
            <span class="review-queue__meta">
              {row.chancellorName} ({row.chancellorEmail}) ·
              {formatMediumDate(row.startDate)} · {row.classCount}
              {row.classCount === 1 ? 'class' : 'classes'}
              {#if row.submittedAt}
                · submitted {formatMediumDateTime(row.submittedAt)}
              {/if}
            </span>
          </Link>
        </li>
      {/each}
    </ul>
  {/if}
</main>

<style>
  .review-queue {
    max-width: 40rem;
    margin: 2rem auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0 1rem;
  }

  .review-queue__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .review-queue :global(.review-queue__card) {
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

  .review-queue__title {
    font-weight: 600;
  }

  .review-queue__meta {
    font-size: 0.875rem;
    color: var(--color-muted);
  }

  .review-queue__empty {
    color: var(--color-muted);
  }
</style>
