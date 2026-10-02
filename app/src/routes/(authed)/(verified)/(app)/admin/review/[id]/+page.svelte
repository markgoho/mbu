<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { apiFetch } from '#lib/api.js';
  import Button from '#lib/components/atoms/Button.svelte';
  import Link from '#lib/components/atoms/Link.svelte';
  import Textarea from '#lib/components/atoms/Textarea.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import { FormAction } from '#lib/formAction.svelte.js';
  import { approveUniversity, rejectUniversity } from '#lib/universities.js';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const university = $derived(data.university);
  const queuePath = resolve('/(authed)/(verified)/(app)/admin/review');

  // The two decisions: approve and reject.
  const action = new FormAction();
  let isRejectFormShown = $state(false);
  let rejectNote = $state('');
  const trimmedNote = $derived(rejectNote.trim());

  // The decision removes the university from the queue. `refreshAll` makes
  // sure that the queue and the guards above it load again.
  function backToQueue() {
    return goto(queuePath, { refreshAll: true });
  }

  async function approve() {
    await action.run({
      action: () => approveUniversity(apiFetch, university.id),
      fallback: 'Could not approve this event.',
      onSuccess: backToQueue,
    });
  }

  async function reject(event: SubmitEvent) {
    event.preventDefault();
    if (!trimmedNote) return;

    await action.run({
      action: () => rejectUniversity(apiFetch, university.id, trimmedNote),
      fallback: 'Could not reject this event.',
      onSuccess: backToQueue,
    });
  }
</script>

<svelte:head>
  <title>Review {university.title} - Merit Badge University Platform</title>
</svelte:head>

<main class="review-detail">
  <Link href={queuePath}>← Back to queue</Link>

  <header class="review-detail__header">
    <h1>{university.title}</h1>
    <StatusBadge status={university.status} />
  </header>

  <dl class="review-detail__meta">
    <dt>Location</dt>
    <dd>
      {university.location.name}, {university.location.city},
      {university.location.state}
    </dd>
    <dt>Timezone</dt>
    <dd>{university.timezone}</dd>
    <dt>Classes</dt>
    <dd>{data.classes.length}</dd>
  </dl>

  <section class="review-detail__classes">
    <h2>Classes</h2>
    <ul>
      {#each data.classes as reviewedClass (reviewedClass.classId)}
        <li>{reviewedClass.badgeTitle} · cap {reviewedClass.capacity}</li>
      {/each}
    </ul>
  </section>

  {#if action.error}
    <p class="review-detail__error" role="alert">{action.error}</p>
  {/if}

  {#if university.status === 'submitted'}
    <div class="review-detail__actions">
      <Button disabled={action.pending} onclick={approve}>Approve</Button>
      {#if !isRejectFormShown}
        <Button onclick={() => (isRejectFormShown = true)}>Reject</Button>
      {/if}
    </div>

    {#if isRejectFormShown}
      <form class="review-detail__reject-form" novalidate onsubmit={reject}>
        <label for="rejectNote">Reason for rejection</label>
        <Textarea id="rejectNote" bind:value={rejectNote} required />
        <Button type="submit" disabled={action.pending || !trimmedNote}>Submit rejection</Button>
      </form>
    {/if}
  {/if}
</main>

<style>
  .review-detail {
    max-width: 40rem;
    margin: 2rem auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 0 1rem;
  }

  .review-detail__header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .review-detail__meta {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.25rem 1rem;
    margin: 0;
  }

  .review-detail__meta dt {
    color: var(--color-muted);
  }

  .review-detail__classes ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .review-detail__actions {
    display: flex;
    gap: 0.5rem;
  }

  .review-detail__reject-form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .review-detail__error {
    color: var(--color-error);
  }
</style>
