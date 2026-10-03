<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { apiFetch } from '#lib/api.js';
  import Link from '#lib/components/atoms/Link.svelte';
  import UniversityForm, { type UniversityFormValues } from '#lib/components/UniversityForm.svelte';
  import { IdempotencyKeys } from '#lib/idempotency.js';
  import { createUniversity } from '#lib/universities.js';

  // The client makes the ID of the new university (a UUID). The API requires it.
  // It is one ID for each visit of the page, so that a retry of the save after
  // a network failure is the same request, with the same idempotency key.
  const id = crypto.randomUUID();
  const keys = new IdempotencyKeys();

  async function createAndOpen(values: UniversityFormValues) {
    const created = await createUniversity(apiFetch, { id, ...values }, keys);
    await goto(resolve('/(authed)/(verified)/(app)/universities/[id]', { id: created.id }));
  }
</script>

<svelte:head>
  <title>Create University - Merit Badge University Platform</title>
</svelte:head>

<main class="uni-new">
  <Link href={resolve('/(authed)/(verified)/(app)/universities')}>← Back to dashboard</Link>
  <h1>Create University</h1>
  <UniversityForm onSave={createAndOpen} />
</main>

<style>
  .uni-new {
    max-width: 32rem;
    margin: 2rem auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0 1rem;
  }
</style>
