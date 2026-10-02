<script lang="ts">
  import { page } from '$app/state';
</script>

<svelte:head>
  <title>{page.status} | Merit Badge University Platform</title>
</svelte:head>

<main>
  <h1>{page.status}</h1>
  <p>{page.error?.message}</p>
</main>
