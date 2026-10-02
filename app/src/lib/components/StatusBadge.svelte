<!--
  The status of a university. The label is the status value: the CSS shows it
  in capital letters.
-->
<script lang="ts">
  import type { UniversityStatus } from '#lib/api-types/universities-api.types.js';

  let { status }: { status: UniversityStatus } = $props();
</script>

<span class={['status-badge', `status-badge--${status}`]}>{status}</span>

<style>
  .status-badge {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    background: var(--color-surface);
    color: var(--color-muted);
    border: 1px solid var(--color-border);
  }

  .status-badge--submitted,
  .status-badge--needs_review {
    color: #8a6d00;
    border-color: #e0c14b;
    background: #fdf6e0;
  }

  .status-badge--published {
    color: #1a7a3f;
    border-color: #7fcf9e;
    background: #e6f7ec;
  }

  .status-badge--rejected {
    color: var(--color-error);
    border-color: var(--color-error);
    background: #fbe9e9;
  }

  .status-badge--closed {
    color: var(--color-muted);
    border-color: var(--color-border);
    background: var(--color-surface);
  }
</style>
