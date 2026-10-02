<script lang="ts">
  import { resolve } from '$app/paths';
  import type { PublicUniversity } from '#lib/api-types/universities-api.types.js';
  import Link from '#lib/components/atoms/Link.svelte';
  import { formatMediumDate, formatShortTime } from '#lib/formatDate.js';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const title = $derived.by(() => {
    if (data.event) return data.event.title;
    return data.failure === 'not-found' ? 'Event not found' : 'Something went wrong';
  });

  /**
   * The sign-in page with the registration page of the event as its `returnTo`
   * path. A visitor who signs in goes to the registration page. A visitor who
   * is signed in already goes there immediately: the guard of the sign-in page
   * sends a signed-in user to the `returnTo` path.
   */
  function signInToRegisterHref(event: PublicUniversity): string {
    const registerPath = resolve('/(authed)/(verified)/(app)/e/[id]/register', { id: event.id });
    return `${resolve('/(signed-out)/sign-in')}?returnTo=${encodeURIComponent(registerPath)}`;
  }

  function counselorNames(counselors: PublicUniversity['classes'][number]['counselors']): string {
    return counselors.map((counselor) => counselor.displayName).join(', ');
  }

  function formatLocation({ location }: PublicUniversity): string {
    return `${location.name}, ${location.city}, ${location.state}`;
  }
</script>

<svelte:head>
  <title>{title} - Merit Badge University Platform</title>
</svelte:head>

<main class="public-event">
  {#if data.event}
    {@const event = data.event}
    <header class="public-event__header">
      <h1>{event.title}</h1>
      <p>{formatLocation(event)}</p>
      <p>
        {formatMediumDate(event.startDate, event.timezone)}
        {#if event.endDate}
          – {formatMediumDate(event.endDate, event.timezone)}
        {/if}
      </p>
    </header>

    {#if event.periods.length > 0}
      <section class="public-event__periods">
        <h2>Periods</h2>
        <ul>
          {#each event.periods as period (period.periodId)}
            <li>
              <strong>{period.label}</strong>
              · {formatShortTime(period.startsAt, event.timezone)}
              – {formatShortTime(period.endsAt, event.timezone)}
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    <section class="public-event__classes">
      <h2>Classes</h2>
      {#if event.classes.length === 0}
        <p>No classes listed yet.</p>
      {:else}
        <ul class="public-event__class-list">
          {#each event.classes as publicClass (publicClass.classId)}
            <li class="public-event__class-card">
              <h3>{publicClass.badgeTitle}</h3>
              {#if publicClass.eagleRequired}
                <p class="public-event__eagle">Eagle-required</p>
              {/if}
              <p>
                {publicClass.enrolledCount} of {publicClass.capacity} seats filled ·
                {publicClass.seatsRemaining} seats left
              </p>
              {#if publicClass.waitlistCount > 0}
                <p>{publicClass.waitlistCount} on waitlist</p>
              {/if}
              {#if publicClass.counselors.length > 0}
                <p>Counselor: {counselorNames(publicClass.counselors)}</p>
              {/if}
              {#if publicClass.room}
                <p>Room: {publicClass.room}</p>
              {/if}
              {#if publicClass.notes}
                <p>{publicClass.notes}</p>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <p class="public-event__cta">
      <Link href={signInToRegisterHref(event)}>Sign in to register</Link>
    </p>
  {:else if data.failure === 'not-found'}
    <h1>Event not found</h1>
    <p>This event is not available or has not been published yet.</p>
  {:else}
    <h1>Something went wrong</h1>
    <p>We couldn't load this event. Please refresh to try again.</p>
  {/if}
</main>

<style>
  .public-event {
    container-type: inline-size;
    margin-inline: auto;
    max-width: 40rem;
    padding: clamp(1.5rem, 4cqi, 3rem);
  }

  .public-event h1 {
    font-size: clamp(1.5rem, 5cqi, 2rem);
    line-height: 1.2;
    margin: 0 0 0.5rem;
  }

  .public-event__header p {
    color: var(--color-muted);
    margin: 0.25rem 0;
  }

  .public-event__periods,
  .public-event__classes {
    margin-block: 2rem;
  }

  .public-event__class-list {
    display: grid;
    gap: 1rem;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .public-event__class-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1rem;
  }

  .public-event__class-card h3 {
    margin: 0 0 0.5rem;
  }

  .public-event__eagle {
    color: var(--color-muted);
    font-size: 0.875rem;
    margin: 0 0 0.5rem;
  }

  .public-event__cta {
    margin-top: 2rem;
  }
</style>
