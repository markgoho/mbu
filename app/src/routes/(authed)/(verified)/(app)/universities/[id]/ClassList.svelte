<!--
  The classes of a university, with the form for a new class or an edited class.

  The list does not call the API. It gives a new class to `onCreate`, the
  changes of a class to `onUpdate`, and the ID of a class to delete to `onDelete`.
-->
<script lang="ts">
  import type {
    BadgeCatalogEntry,
    ClassCreateRequest,
    ClassPatchRequest,
    ClassResponse,
    Period,
  } from '#lib/api-types/universities-api.types.js';
  import Button from '#lib/components/atoms/Button.svelte';
  import { FormAction } from '#lib/formAction.svelte.js';
  import ClassForm from './ClassForm.svelte';

  interface Properties {
    periods: Period[];
    classes: ClassResponse[];
    /**
    The merit badge catalog, for the class form.
    */
    badges: BadgeCatalogEntry[];
    /**
    The name of the signed-in chancellor, who is the counselor of a new class.
    */
    counselorName: string;
    /**
    Hides the actions and the form.
    */
    readonly?: boolean;
    onCreate: (body: ClassCreateRequest) => Promise<unknown>;
    onUpdate: (classId: string, body: ClassPatchRequest) => Promise<unknown>;
    onDelete: (classId: string) => Promise<unknown>;
  }

  let {
    periods,
    classes,
    badges,
    counselorName,
    readonly = false,
    onCreate,
    onUpdate,
    onDelete,
  }: Properties = $props();

  let isFormOpen = $state(false);
  let editingClass = $state.raw<ClassResponse>();

  const action = new FormAction();

  function startCreate() {
    editingClass = undefined;
    isFormOpen = true;
  }

  function startEdit(classItem: ClassResponse) {
    editingClass = classItem;
    isFormOpen = true;
  }

  function closeForm() {
    isFormOpen = false;
    editingClass = undefined;
  }

  async function deleteClass(classItem: ClassResponse) {
    await action.run({
      confirm: `Delete ${classItem.badgeTitle}?`,
      action: () => onDelete(classItem.classId),
      fallback: 'Could not delete this class.',
    });
  }
</script>

<section class="class-list">
  <header class="class-list__header">
    <h2>Classes</h2>
    {#if !isFormOpen && !readonly}
      <Button onclick={startCreate}>Add class</Button>
    {/if}
  </header>

  {#if action.error}
    <p class="class-list__error" role="alert">{action.error}</p>
  {/if}

  {#if classes.length === 0 && !isFormOpen}
    <p class="class-list__empty">No classes yet.</p>
  {:else}
    <ul class="class-list__items">
      {#each classes as classItem (classItem.classId)}
        <li class="class-list__item">
          <span>
            <strong>{classItem.badgeTitle}</strong>
            · cap {classItem.capacity} · {classItem.periodIds.length} period(s)
            {#if classItem.room}
              · {classItem.room}
            {/if}
          </span>
          {#if !readonly}
            <span class="class-list__actions">
              <Button onclick={() => startEdit(classItem)}>Edit</Button>
              <Button disabled={action.pending} onclick={() => deleteClass(classItem)}>
                Delete
              </Button>
            </span>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}

  {#if isFormOpen && !readonly}
    <ClassForm
      {periods}
      {badges}
      {counselorName}
      editing={editingClass}
      {onCreate}
      {onUpdate}
      onDismiss={closeForm}
    />
  {/if}
</section>

<style>
  .class-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .class-list__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .class-list__items {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .class-list__item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 0.25rem;
  }

  .class-list__actions {
    display: flex;
    gap: 0.25rem;
  }

  .class-list__empty {
    color: var(--color-muted);
    margin: 0;
  }
</style>
