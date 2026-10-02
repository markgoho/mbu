<!--
  The form for one class of a university: a new class, or a class to edit.

  The form does not call the API. It gives a new class to `onCreate` and the
  changes of an edited class to `onUpdate`. After a save that is successful, and
  when the user cancels, it calls `onDismiss`.

  The chancellor is the counselor of a class that they create, so the counselor
  fields (the BSA member ID and the disclaimer) are only in the form of a new class.
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
  import Checkbox from '#lib/components/atoms/Checkbox.svelte';
  import Select from '#lib/components/atoms/Select.svelte';
  import Textarea from '#lib/components/atoms/Textarea.svelte';
  import TextInput from '#lib/components/atoms/TextInput.svelte';
  import { DISCLAIMER_TEXT } from '#lib/disclaimer.js';
  import { FormAction } from '#lib/formAction.svelte.js';

  const DEFAULT_CAPACITY = 20;
  const MIN_CAPACITY = 1;
  const MAX_CAPACITY = 200;

  interface Properties {
    /**
    The periods of the university. The class uses one or more of them.
    */
    periods: Period[];
    /**
    The merit badge catalog.
    */
    badges: BadgeCatalogEntry[];
    /**
    The class to edit. With no value, the form makes a new class.
    */
    editing?: ClassResponse | undefined;
    /**
    The name of the signed-in chancellor, who is the counselor of a new class.
    */
    counselorName: string;
    onCreate: (body: ClassCreateRequest) => Promise<unknown>;
    onUpdate: (classId: string, body: ClassPatchRequest) => Promise<unknown>;
    onDismiss: () => void;
  }

  let { periods, badges, editing, counselorName, onCreate, onUpdate, onDismiss }: Properties =
    $props();

  /**
  The values of the fields.
  */
  class Fields {
    badgeSlug = $state('');
    periodIds = $state<string[]>([]);
    // The value of a number input is `null` when the input is empty.
    capacity = $state<number | null>(DEFAULT_CAPACITY);
    room = $state('');
    notes = $state('');
    bsaId = $state('');
    hasAcceptedDisclaimer = $state(false);

    constructor(classToEdit: ClassResponse | undefined) {
      if (!classToEdit) return;
      this.badgeSlug = classToEdit.badgeSlug;
      this.periodIds = [...classToEdit.periodIds];
      this.capacity = classToEdit.capacity;
      this.room = classToEdit.room ?? '';
      this.notes = classToEdit.notes ?? '';
    }

    /**
    The values of all classes, or `undefined` when the badge or the capacity is not valid.
    */
    toPatch(): Required<ClassPatchRequest> | undefined {
      const { capacity } = this;
      if (
        capacity === null ||
        this.badgeSlug === '' ||
        capacity < MIN_CAPACITY ||
        capacity > MAX_CAPACITY
      ) {
        return undefined;
      }
      return {
        badgeSlug: this.badgeSlug,
        periodIds: [...this.periodIds],
        capacity,
        room: this.room || null,
        notes: this.notes || null,
      };
    }

    togglePeriod(periodId: string, isSelected: boolean) {
      const others = this.periodIds.filter((selected) => selected !== periodId);
      this.periodIds = isSelected ? [...others, periodId] : others;
    }
  }

  // The fields start again when the user edits a different class.
  let fields = $derived(new Fields(editing));

  const action = new FormAction();

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const patch = fields.toPatch();
    if (!patch) return;
    const bsaId = fields.bsaId.trim();
    if (!editing && (bsaId === '' || !fields.hasAcceptedDisclaimer)) return;
    if (patch.periodIds.length === 0) {
      action.error = 'Select at least one period.';
      return;
    }

    await action.run({
      action: () =>
        editing
          ? onUpdate(editing.classId, patch)
          : onCreate({ ...patch, counselor: { bsaId, acceptDisclaimer: true } }),
      fallback: 'Could not save the class.',
      onSuccess: onDismiss,
    });
  }
</script>

<!-- `novalidate`: the Angular form had no browser validation and no field messages. -->
<form class="class-form" novalidate onsubmit={handleSubmit}>
  {#if action.error}
    <p class="class-form__error" role="alert">{action.error}</p>
  {/if}

  <label for="badgeSlug">Merit badge</label>
  <Select id="badgeSlug" bind:value={fields.badgeSlug}>
    <option value="">Select a badge…</option>
    {#each badges as badge (badge.slug)}
      <option value={badge.slug}>
        {badge.title}
        {#if badge.eagleRequired}
          (Eagle required)
        {/if}
      </option>
    {/each}
  </Select>

  <fieldset class="class-form__fieldset">
    <legend>Periods</legend>
    {#if periods.length === 0}
      <p class="class-form__hint">Add periods before creating classes.</p>
    {/if}
    {#each periods as period (period.periodId)}
      <label class="class-form__checkbox">
        <Checkbox
          checked={fields.periodIds.includes(period.periodId)}
          onchange={(event) => fields.togglePeriod(period.periodId, event.currentTarget.checked)}
        />
        {period.label}
      </label>
    {/each}
  </fieldset>

  <label for="capacity">Capacity</label>
  <TextInput
    id="capacity"
    type="number"
    min={MIN_CAPACITY}
    max={MAX_CAPACITY}
    bind:value={fields.capacity}
  />

  <label for="room">Room (optional)</label>
  <TextInput id="room" bind:value={fields.room} />

  <label for="notes">Notes (optional)</label>
  <Textarea id="notes" rows={2} bind:value={fields.notes} />

  {#if !editing}
    <fieldset class="class-form__fieldset">
      <legend>Counselor (you)</legend>
      <p>
        Name: <strong>{counselorName}</strong>
      </p>
      <label for="bsaId">BSA member ID</label>
      <TextInput id="bsaId" autocomplete="off" bind:value={fields.bsaId} />
      <label class="class-form__checkbox">
        <Checkbox bind:checked={fields.hasAcceptedDisclaimer} />
        {DISCLAIMER_TEXT}
      </label>
    </fieldset>
  {/if}

  <div class="class-form__actions">
    <Button onclick={onDismiss}>Cancel</Button>
    <Button type="submit" disabled={action.pending}>
      {#if action.pending}
        Saving…
      {:else if editing}
        Update class
      {:else}
        Add class
      {/if}
    </Button>
  </div>
</form>

<style>
  .class-form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .class-form__fieldset {
    border: 1px solid var(--color-border);
    border-radius: 0.25rem;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .class-form__checkbox {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .class-form__actions {
    display: flex;
    gap: 0.5rem;
  }

  .class-form__error {
    color: var(--color-error);
    margin: 0;
  }

  .class-form__hint {
    color: var(--color-muted);
    margin: 0;
  }
</style>
