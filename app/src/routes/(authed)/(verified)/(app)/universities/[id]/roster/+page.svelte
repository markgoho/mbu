<script lang="ts">
  import { resolve } from '$app/paths';
  import type { ClassRoster, RosterRow } from '#lib/api-types/registrations-api.types.js';
  import { apiFetch } from '#lib/api.js';
  import Button from '#lib/components/atoms/Button.svelte';
  import Link from '#lib/components/atoms/Link.svelte';
  import ConfirmDialog from '#lib/components/ConfirmDialog.svelte';
  import { classRosterToCsv, eventRosterToCsv } from '#lib/rosterCsv.js';
  import { ackRosterExport } from '#lib/session.svelte.js';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const roster = $derived(data.roster);

  // A print and a CSV export take youth information out of the app. The first
  // time, the user must acknowledge a warning. The API stores the time of the
  // acknowledgment on the account.
  const hasAckedExport = $derived(Boolean(data.session.user.rosterExportAckAt));
  let isExportWarningOpen = $state(false);
  // The export that waits for the answer to the warning. It is not reactive.
  let pendingExport: (() => void) | undefined;

  function requestExport(exportAction: () => void) {
    if (hasAckedExport) {
      exportAction();
      return;
    }
    pendingExport = exportAction;
    isExportWarningOpen = true;
  }

  // The dialog is closed when this runs.
  async function confirmExportWarning() {
    const exportAction = pendingExport;
    pendingExport = undefined;
    try {
      // Stores the acknowledgment and loads `data.session` again.
      await ackRosterExport(apiFetch);
    } catch {
      // No export without a stored acknowledgment. The next export asks again.
      return;
    }
    exportAction?.();
  }

  function cancelExportWarning() {
    pendingExport = undefined;
  }

  function downloadCsv(content: string, filename: string) {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function printRosters() {
    requestExport(() => print());
  }

  function exportEventCsv() {
    requestExport(() =>
      downloadCsv(eventRosterToCsv(roster), `${roster.university.title} - roster.csv`),
    );
  }

  function exportClassCsv(classRoster: ClassRoster) {
    requestExport(() =>
      downloadCsv(classRosterToCsv(classRoster), `${classRoster.class.badgeTitle} - roster.csv`),
    );
  }
</script>

<svelte:head>
  <title>Rosters - {roster.university.title} - Merit Badge University Platform</title>
</svelte:head>

<!-- The cells of a scout that the two tables share. The first cell is not here: it differs. -->
{#snippet scoutCells(row: RosterRow)}
  <td>{row.scoutLastName ?? '(purged)'}</td>
  <td>{row.scoutFirstName ?? '(purged)'}</td>
  <td>{row.scoutUnit ?? '—'}</td>
  <td>{row.accommodations ?? '—'}</td>
  <td>
    {#if row.parentName || row.parentEmail}
      {row.parentName} ({row.parentEmail})
    {:else}
      (purged)
    {/if}
  </td>
  <td>{row.consentReceived ? 'Yes' : 'No'}</td>
{/snippet}

<main class="roster-page">
  <Link href={resolve('/(authed)/(verified)/(app)/universities')}>← Back to dashboard</Link>

  <header class="roster-page__header">
    <h1>{roster.university.title} — Rosters</h1>
    <div class="roster-page__actions">
      <Button onclick={printRosters}>Print</Button>
      <Button onclick={exportEventCsv}>Export event CSV</Button>
    </div>
  </header>

  {#if roster.classRosters.length === 0}
    <p class="roster-page__empty">No classes in this event yet.</p>
  {/if}

  {#each roster.classRosters as classRoster (classRoster.class.classId)}
    <section class="roster-page__class">
      <header class="roster-page__class-header">
        <h2>{classRoster.class.badgeTitle}</h2>
        <span class="roster-page__class-meta">
          {classRoster.class.periodLabels.join(', ')}
          {#if classRoster.class.room}
            · {classRoster.class.room}
          {/if}
          · {classRoster.class.enrolledCount}/{classRoster.class.capacity} enrolled
          {#if classRoster.class.waitlistCount > 0}
            · {classRoster.class.waitlistCount} waitlisted
          {/if}
        </span>
        <Button onclick={() => exportClassCsv(classRoster)}>Export CSV</Button>
      </header>

      {#if classRoster.class.counselorNames.length > 0}
        <p class="roster-page__counselors">
          Counselors: {classRoster.class.counselorNames.join(', ')}
        </p>
      {/if}

      <table class="roster-page__table">
        <caption>Enrolled</caption>
        <thead>
          <tr>
            <th scope="col">Present</th>
            <th scope="col">Last Name</th>
            <th scope="col">First Name</th>
            <th scope="col">Unit</th>
            <th scope="col">Accommodations</th>
            <th scope="col">Parent</th>
            <th scope="col">Consent</th>
          </tr>
        </thead>
        <tbody>
          {#each classRoster.enrolled as row (row.scoutId)}
            <tr>
              <!-- The "Present" cell is empty: the counselor marks it on the printed roster. -->
              <td></td>
              {@render scoutCells(row)}
            </tr>
          {:else}
            <tr>
              <td colspan="7">No one enrolled.</td>
            </tr>
          {/each}
        </tbody>
      </table>

      {#if classRoster.waitlisted.length > 0}
        <table class="roster-page__table">
          <caption>Waitlisted</caption>
          <thead>
            <tr>
              <th scope="col">Position</th>
              <th scope="col">Last Name</th>
              <th scope="col">First Name</th>
              <th scope="col">Unit</th>
              <th scope="col">Accommodations</th>
              <th scope="col">Parent</th>
              <th scope="col">Consent</th>
            </tr>
          </thead>
          <tbody>
            {#each classRoster.waitlisted as row, index (row.scoutId)}
              <tr>
                <td>{index + 1}</td>
                {@render scoutCells(row)}
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </section>
  {/each}

  <ConfirmDialog
    bind:open={isExportWarningOpen}
    title="Export contains youth information"
    message="You are responsible for safeguarding and deleting this data per Youth Protection guidelines once you're done with it."
    confirmLabel="I understand, continue"
    onConfirm={confirmExportWarning}
    onCancel={cancelExportWarning}
  />
</main>

<style>
  .roster-page {
    max-width: 60rem;
    margin: 2rem auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 0 1rem;
  }

  .roster-page__header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .roster-page__actions {
    display: flex;
    gap: 0.5rem;
  }

  .roster-page__empty {
    color: var(--color-muted);
  }

  .roster-page__class {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-block-end: 1rem;
    border-bottom: 1px solid var(--color-border);
  }

  .roster-page__class-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
  }

  .roster-page__class-meta {
    color: var(--color-muted);
    font-size: 0.875rem;
  }

  .roster-page__counselors {
    color: var(--color-muted);
    font-size: 0.875rem;
    margin: 0;
  }

  .roster-page__table {
    width: 100%;
    border-collapse: collapse;
  }

  .roster-page__table th,
  .roster-page__table td {
    text-align: left;
    padding: 0.375rem 0.5rem;
    border-bottom: 1px solid var(--color-border);
  }

  /* The print layout: no controls, and one class on each page. The link and the
     buttons are elements of the atoms, so the selectors need `:global()`. */
  @media print {
    .roster-page > :global(a),
    .roster-page :global(button) {
      display: none;
    }

    .roster-page__class:not(:last-child) {
      break-after: page;
    }

    .roster-page__class {
      border-bottom: none;
    }
  }
</style>
