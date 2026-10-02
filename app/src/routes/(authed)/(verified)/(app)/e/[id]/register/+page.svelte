<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import type { Period, PublicClass } from '#lib/api-types/universities-api.types.js';
  import type { ScoutRequest } from '#lib/api-types/users-api.types.js';
  import { ApiError, apiFetch } from '#lib/api.js';
  import Button from '#lib/components/atoms/Button.svelte';
  import Checkbox from '#lib/components/atoms/Checkbox.svelte';
  import TextInput from '#lib/components/atoms/TextInput.svelte';
  import { formatMediumDate, formatShortTime } from '#lib/formatDate.js';
  import { cancelRegistration, registerScout } from '#lib/registrations.js';
  import { findScheduleConflict, scoutProgress } from '#lib/scheduleRules.js';
  import { createScout } from '#lib/scouts.js';
  import ScoutQuickAdd from './ScoutQuickAdd.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const event = $derived(data.event);

  // The scout that the user picked. With no pick, or when that scout is not in
  // the list now, the first scout of the list is the selected one.
  let pickedScoutId = $state<string>();
  const selectedScout = $derived(
    data.scouts.find((scout) => scout.scoutId === pickedScoutId) ?? data.scouts[0],
  );

  let scoutFilter = $state('');
  let isAddScoutOpen = $state(false);
  let hasConsent = $state(false);

  // The page does not use `FormAction`: a "class full" answer is not an error
  // (it opens the waitlist offer), and a drop shows a fixed message (#228, decision 13).
  let actionError = $state('');
  let pendingClassId = $state<string>();
  let waitlistOfferClassId = $state<string>();

  const filteredScouts = $derived.by(() => {
    const filter = scoutFilter.trim().toLowerCase();
    if (!filter) return data.scouts;
    return data.scouts.filter((scout) =>
      `${scout.firstName} ${scout.lastName}`.toLowerCase().includes(filter),
    );
  });

  const selectedScoutRegistrations = $derived(
    selectedScout
      ? data.registrations.filter((registration) => registration.scoutId === selectedScout.scoutId)
      : [],
  );

  const progress = $derived(scoutProgress(selectedScoutRegistrations, event.periods.length));

  const consentLabel = $derived.by(() => {
    const scoutName = selectedScout
      ? `${selectedScout.firstName} ${selectedScout.lastName}`
      : 'your scout';
    return `I consent to share ${scoutName}'s information with the organizers of ${event.title}.`;
  });

  /**
  Makes a scout the selected one, with no consent, no message and no waitlist offer of the scout before.
  */
  function startScout(scoutId: string) {
    pickedScoutId = scoutId;
    actionError = '';
    waitlistOfferClassId = undefined;
    // The consent is for one scout in one event: a different scout needs a new one.
    hasConsent = false;
  }

  function selectScout(scoutId: string) {
    if (scoutId !== selectedScout?.scoutId) startScout(scoutId);
  }

  async function addScout(scout: ScoutRequest) {
    const created = await createScout(apiFetch, scout);
    // Runs the `load` again, which reads the scouts.
    await invalidateAll();
    isAddScoutOpen = false;
    startScout(created.scoutId);
  }

  function classesOf(period: Period): PublicClass[] {
    return event.classes.filter((publicClass) => publicClass.periodIds.includes(period.periodId));
  }

  function isFull(publicClass: PublicClass): boolean {
    return publicClass.seatsRemaining <= 0;
  }

  /**
   * Registers the selected scout for a class. After the write, the `load` runs
   * again, so the seat counts and the registrations are current.
   *
   * When the class became full after the page got its seat count, the API
   * answers `class_full`. The page then offers the waitlist.
   */
  async function register(publicClass: PublicClass, isWaitlistAccepted: boolean) {
    if (!selectedScout || !hasConsent) return;
    const { scoutId } = selectedScout;

    actionError = '';
    pendingClassId = publicClass.classId;
    try {
      await registerScout(apiFetch, event.id, publicClass.classId, {
        scoutId,
        acceptWaitlist: isWaitlistAccepted,
        acceptConsent: true,
      });
      await invalidateAll();
    } catch (error) {
      // The user selected a different scout during the request: the answer is not for that scout.
      if (selectedScout?.scoutId !== scoutId) return;
      const body = error instanceof ApiError ? error.body : undefined;
      if (!isWaitlistAccepted && body?.code === 'class_full') {
        waitlistOfferClassId = publicClass.classId;
      } else {
        actionError = body?.error ?? 'Could not register for this class.';
      }
    } finally {
      pendingClassId = undefined;
    }
  }

  async function answerWaitlistOffer(publicClass: PublicClass, isAccepted: boolean) {
    waitlistOfferClassId = undefined;
    if (isAccepted) await register(publicClass, true);
  }

  async function drop(publicClass: PublicClass) {
    if (!selectedScout || !confirm(`Drop ${publicClass.badgeTitle}?`)) return;

    actionError = '';
    pendingClassId = publicClass.classId;
    try {
      await cancelRegistration(apiFetch, event.id, publicClass.classId, selectedScout.scoutId);
      await invalidateAll();
    } catch {
      actionError = 'Could not drop this class. Please try again.';
    } finally {
      pendingClassId = undefined;
    }
  }
</script>

<svelte:head>
  <title>Register for {event.title} - Merit Badge University Platform</title>
</svelte:head>

<main class="register">
  <header class="register__header">
    <h1>Register for {event.title}</h1>
    <p>
      {formatMediumDate(event.startDate, event.timezone)}
      {#if event.endDate}
        – {formatMediumDate(event.endDate, event.timezone)}
      {/if}
    </p>
  </header>

  {#if data.scouts.length === 0}
    <section class="register__empty-scouts">
      <h2>Add a scout to get started</h2>
      <p>You don't have any scouts yet. Add one to build a schedule.</p>
      <ScoutQuickAdd onAdd={addScout} />
    </section>
  {:else}
    <section class="register__scout-picker" aria-label="Select a scout">
      <label>
        Filter scouts
        <TextInput type="search" bind:value={scoutFilter} />
      </label>

      <ul class="register__scout-list">
        {#each filteredScouts as scout (scout.scoutId)}
          {@const isSelected = scout.scoutId === selectedScout?.scoutId}
          <li>
            <Button
              class={isSelected ? 'register__scout--selected' : undefined}
              aria-pressed={isSelected}
              onclick={() => selectScout(scout.scoutId)}
            >
              {scout.firstName}
              {scout.lastName}
            </Button>
          </li>
        {/each}
      </ul>

      {#if isAddScoutOpen}
        <ScoutQuickAdd onAdd={addScout} />
      {:else}
        <Button onclick={() => (isAddScoutOpen = true)}>Add another scout</Button>
      {/if}

      <p class="register__progress" aria-live="polite">
        {progress.scheduled}/{progress.total} periods scheduled
      </p>
    </section>

    <section class="register__consent">
      <label>
        <Checkbox bind:checked={hasConsent} />
        {consentLabel}
      </label>
    </section>

    {#if actionError}
      <p class="register__error" role="alert">{actionError}</p>
    {/if}

    <section class="register__periods">
      {#each event.periods as period (period.periodId)}
        <div class="register__period-row">
          <h2>
            {period.label} ·
            {formatShortTime(period.startsAt, event.timezone)}
            – {formatShortTime(period.endsAt, event.timezone)}
          </h2>

          <ul class="register__class-list">
            {#each classesOf(period) as publicClass (publicClass.classId)}
              {@const registration = selectedScoutRegistrations.find(
                (candidate) => candidate.classId === publicClass.classId,
              )}
              {@const conflict = findScheduleConflict(
                publicClass.classId,
                publicClass.periodIds,
                selectedScoutRegistrations,
              )}
              {@const isPending = pendingClassId === publicClass.classId}
              <li class="register__class-card">
                <h3>{publicClass.badgeTitle}</h3>
                <p>
                  {publicClass.enrolledCount} of {publicClass.capacity} seats filled ·
                  {publicClass.seatsRemaining} seats left
                </p>

                {#if registration}
                  <p>{registration.status === 'waitlisted' ? 'On waitlist' : 'Registered'}</p>
                  <Button disabled={isPending} onclick={() => drop(publicClass)}>Drop</Button>
                {:else if conflict}
                  <p class="register__conflict">
                    Conflicts with {conflict.badgeTitle} in this period.
                  </p>
                  <Button disabled title="Resolve the period conflict first">
                    {isFull(publicClass) ? 'Join waitlist' : 'Register'}
                  </Button>
                {:else if waitlistOfferClassId === publicClass.classId}
                  <p>This class is full. Join the waitlist instead?</p>
                  <Button
                    disabled={!hasConsent}
                    onclick={() => answerWaitlistOffer(publicClass, true)}
                  >
                    Join waitlist
                  </Button>
                  <Button onclick={() => answerWaitlistOffer(publicClass, false)}>Cancel</Button>
                {:else}
                  <Button
                    disabled={isPending || !hasConsent}
                    onclick={() => register(publicClass, isFull(publicClass))}
                  >
                    {isFull(publicClass) ? 'Join waitlist' : 'Register'}
                  </Button>
                {/if}
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </section>
  {/if}
</main>

<style>
  .register {
    container-type: inline-size;
    margin-inline: auto;
    max-width: 48rem;
    padding: clamp(1.5rem, 4cqi, 3rem);
  }

  .register__scout-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    list-style: none;
    margin: 0.5rem 0;
    padding: 0;
  }

  .register :global(.register__scout--selected) {
    font-weight: bold;
  }

  .register__period-row {
    margin-block: 1.5rem;
  }

  .register__class-list {
    display: grid;
    gap: 1rem;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .register__class-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1rem;
  }

  .register__conflict,
  .register__error {
    color: var(--color-error);
  }
</style>
