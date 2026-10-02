<script lang="ts">
  import { goto, refreshAll } from '$app/navigation';
  import { resolve } from '$app/paths';
  import type {
    ClassCreateRequest,
    ClassPatchRequest,
    PeriodInput,
    UniversityStatus,
  } from '#lib/api-types/universities-api.types.js';
  import { apiFetch } from '#lib/api.js';
  import Button from '#lib/components/atoms/Button.svelte';
  import Link from '#lib/components/atoms/Link.svelte';
  import StatusBadge from '#lib/components/StatusBadge.svelte';
  import UniversityForm, { type UniversityFormValues } from '#lib/components/UniversityForm.svelte';
  import { FormAction } from '#lib/formAction.svelte.js';
  import {
    closeUniversity,
    createClass,
    deleteClass,
    deleteUniversity,
    patchClass,
    patchUniversity,
    putPeriods,
    submitUniversity,
  } from '#lib/universities.js';
  import ClassList from './ClassList.svelte';
  import PeriodBoard from './PeriodBoard.svelte';
  import type { PageData } from './$types';

  // The chancellor cannot change a university in these statuses.
  const LOCKED_STATUSES = new Set<UniversityStatus>(['submitted', 'published', 'closed']);
  const SUBMITTABLE_STATUSES = new Set<UniversityStatus>(['draft', 'rejected']);

  let { data }: { data: PageData } = $props();

  const university = $derived(data.university);
  const isLocked = $derived(LOCKED_STATUSES.has(university.status));
  const canSubmit = $derived(SUBMITTABLE_STATUSES.has(university.status));
  const canClose = $derived(university.status === 'published');

  // The actions of the header: delete, submit and close.
  const action = new FormAction();

  // Each write below runs the `load` again with `refreshAll()`, which gives
  // the page the stored university. A child component shows the message when
  // its write rejects.

  async function deleteDraft() {
    await action.run({
      confirm: 'Delete this draft university and all its classes?',
      action: () => deleteUniversity(apiFetch, university.id),
      fallback: 'Could not delete this university.',
      // No `refreshAll()`: the university of this route does not exist now.
      onSuccess: () => goto(resolve('/(authed)/(verified)/(app)/universities')),
    });
  }

  async function submitForReview() {
    await action.run({
      action: async () => {
        await submitUniversity(apiFetch, university.id);
        await refreshAll();
      },
      fallback: 'Could not submit for review.',
    });
  }

  async function closeEvent() {
    await action.run({
      confirm: 'Close this event? This cannot be undone.',
      action: async () => {
        await closeUniversity(apiFetch, university.id);
        await refreshAll();
      },
      fallback: 'Could not close the event.',
    });
  }

  async function saveDetails(values: UniversityFormValues) {
    await patchUniversity(apiFetch, university.id, values);
    await refreshAll();
  }

  async function savePeriods(periods: PeriodInput[]) {
    await putPeriods(apiFetch, university.id, { periods });
    await refreshAll();
  }

  async function addClass(body: ClassCreateRequest) {
    await createClass(apiFetch, university.id, body);
    await refreshAll();
  }

  async function updateClass(classId: string, body: ClassPatchRequest) {
    await patchClass(apiFetch, university.id, classId, body);
    await refreshAll();
  }

  async function removeClass(classId: string) {
    await deleteClass(apiFetch, university.id, classId);
    await refreshAll();
  }
</script>

<svelte:head>
  <title>{university.title} - Merit Badge University Platform</title>
</svelte:head>

<main class="editor">
  <Link href={resolve('/(authed)/(verified)/(app)/universities')}>← Back to dashboard</Link>

  <header class="editor__header">
    <h1>{university.title}</h1>
    <StatusBadge status={university.status} />
    <Link
      href={resolve('/(authed)/(verified)/(app)/universities/[id]/roster', { id: university.id })}
    >
      View rosters
    </Link>
    {#if university.status === 'draft'}
      <Button class="editor__delete" disabled={action.pending} onclick={deleteDraft}>
        Delete draft
      </Button>
    {/if}
    {#if canSubmit}
      <Button disabled={action.pending} onclick={submitForReview}>Submit for review</Button>
    {/if}
    {#if canClose}
      <Button disabled={action.pending} onclick={closeEvent}>Close event</Button>
    {/if}
  </header>

  {#if action.error}
    <p class="editor__error" role="alert">{action.error}</p>
  {/if}

  {#if university.status === 'rejected' && university.reviewNote}
    <p class="editor__review-note" role="status">Rejected: {university.reviewNote}</p>
  {/if}

  <section class="editor__section">
    <h2>Details</h2>
    <UniversityForm initial={university} readonly={isLocked} onSave={saveDetails} />
  </section>

  <PeriodBoard
    periods={university.periods}
    classes={data.classes}
    readonly={isLocked}
    onSave={savePeriods}
  />

  <ClassList
    periods={university.periods}
    classes={data.classes}
    badges={data.badges}
    counselorName={data.session.user.displayName}
    readonly={isLocked}
    onCreate={addClass}
    onUpdate={updateClass}
    onDelete={removeClass}
  />
</main>

<style>
  .editor {
    max-width: 40rem;
    margin: 2rem auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 0 1rem;
  }

  .editor__header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
  }

  .editor :global(.editor__delete) {
    margin-inline-start: auto;
    color: var(--color-error);
  }

  .editor__section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .editor__error {
    color: var(--color-error);
  }

  .editor__review-note {
    color: var(--color-error);
    margin: 0;
    padding: 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 0.25rem;
  }
</style>
