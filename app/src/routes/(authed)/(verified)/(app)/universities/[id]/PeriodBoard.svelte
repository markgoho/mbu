<!--
  The periods (time blocks) of a university. The chancellor edits all rows and
  saves them together: the save replaces all periods of the university.

  The board does not call the API. It gives the periods to `onSave`.
-->
<script lang="ts">
  import type {
    ClassResponse,
    Period,
    PeriodInput,
  } from '#lib/api-types/universities-api.types.js';
  import Button from '#lib/components/atoms/Button.svelte';
  import TextInput from '#lib/components/atoms/TextInput.svelte';
  import FieldError from '#lib/components/FieldError.svelte';
  import { datetimeInputToIso, isoToDatetimeInput } from '#lib/eventDatetime.js';
  import { FormAction } from '#lib/formAction.svelte.js';
  import { findOverlaps } from '#lib/periodOverlap.js';

  interface Properties {
    periods: Period[];
    /**
    The classes of the university. A period that a class uses cannot be removed.
    */
    classes: ClassResponse[];
    /**
    Disables all fields and hides the actions.
    */
    readonly?: boolean;
    onSave: (periods: PeriodInput[]) => Promise<unknown>;
  }

  let { periods, classes, readonly = false, onSave }: Properties = $props();

  /**
  One row of the board. The times are `datetime-local` values.
  */
  class Row {
    readonly periodId: string | undefined;
    // The key of the row in the list. A new row has no `periodId` until the API stores it.
    readonly key: string;
    label = $state('');
    startsAt = $state('');
    endsAt = $state('');

    constructor(period?: Period) {
      this.key = period?.periodId ?? crypto.randomUUID();
      if (!period) return;
      this.periodId = period.periodId;
      this.label = period.label;
      this.startsAt = isoToDatetimeInput(period.startsAt);
      this.endsAt = isoToDatetimeInput(period.endsAt);
    }

    get isComplete(): boolean {
      return this.label.trim() !== '' && this.startsAt !== '' && this.endsAt !== '';
    }

    toPeriodInput(): PeriodInput {
      return {
        label: this.label.trim(),
        startsAt: datetimeInputToIso(this.startsAt),
        endsAt: datetimeInputToIso(this.endsAt),
        ...(this.periodId && { periodId: this.periodId }),
      };
    }
  }

  // The rows start again from `periods` each time the route loads the
  // university again: after a save, the new rows then have the `periodId` of
  // the API. A board with no periods starts with one empty row.
  let rows = $derived(periods.length > 0 ? periods.map((period) => new Row(period)) : [new Row()]);

  const uid = $props.id();
  const action = new FormAction(uid);
  let overlapWarning = $state('');

  function addRow() {
    rows = [...rows, new Row()];
  }

  function removeRow(row: Row) {
    const { periodId } = row;
    if (periodId && classes.some((classItem) => classItem.periodIds.includes(periodId))) {
      action.error = 'This period is assigned to a class. Remove or reassign the class first.';
      return;
    }
    action.error = '';
    rows = rows.filter((candidate) => candidate !== row);
  }

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    action.error = '';
    overlapWarning = '';
    if (rows.some((row) => !row.isComplete)) return;

    const periodInputs = rows.map((row) => row.toPeriodInput());
    // The API accepts periods that overlap. The board only warns.
    const overlap = findOverlaps(periodInputs);
    if (overlap) overlapWarning = `Periods "${overlap.a}" and "${overlap.b}" overlap in time.`;

    await action.run({
      action: () => onSave(periodInputs),
      fallback: 'Could not save periods.',
    });
  }
</script>

<section class="period-board">
  <h2>Periods</h2>
  <p class="period-board__hint">
    Define flexible time blocks for your event. Overlapping periods are allowed but warned.
  </p>

  {#if action.error}
    <p class="period-board__error" role="alert">{action.error}</p>
  {/if}
  {#if overlapWarning}
    <p class="period-board__warning" role="status">{overlapWarning}</p>
  {/if}

  <!-- `novalidate`: no browser validation. The messages of the fields come from the API:
       `periods.<index>.<field>`, where the index is the index of the row in the body. -->
  <form novalidate onsubmit={handleSubmit}>
    <div class="period-board__rows">
      {#each rows as row, index (row.key)}
        {@const field = `periods.${index}`}
        <fieldset class="period-board__row" {...action.fieldAttributes(field)}>
          <label>
            Label
            <TextInput
              {...action.fieldAttributes(`${field}.label`)}
              disabled={readonly}
              bind:value={row.label}
            />
          </label>
          <FieldError {action} field={`${field}.label`} />
          <label>
            Starts
            <TextInput
              type="datetime-local"
              {...action.fieldAttributes(`${field}.startsAt`)}
              disabled={readonly}
              bind:value={row.startsAt}
            />
          </label>
          <FieldError {action} field={`${field}.startsAt`} />
          <label>
            Ends
            <TextInput
              type="datetime-local"
              {...action.fieldAttributes(`${field}.endsAt`)}
              disabled={readonly}
              bind:value={row.endsAt}
            />
          </label>
          <FieldError {action} field={`${field}.endsAt`} />
          <FieldError {action} field={`${field}.periodId`} />
          <FieldError {action} {field} />
          {#if !readonly}
            <Button onclick={() => removeRow(row)}>Remove</Button>
          {/if}
        </fieldset>
      {/each}
    </div>
    <FieldError {action} field="periods" />
    {#if !readonly}
      <div class="period-board__actions">
        <Button onclick={addRow}>Add period</Button>
        <Button type="submit" disabled={action.pending}>
          {#if action.pending}
            Saving…
          {:else}
            Save periods
          {/if}
        </Button>
      </div>
    {/if}
  </form>
</section>

<style>
  .period-board {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .period-board__rows {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .period-board__row {
    border: 1px solid var(--color-border);
    border-radius: 0.25rem;
    padding: 0.75rem;
    display: grid;
    gap: 0.5rem;
  }

  .period-board__actions {
    display: flex;
    gap: 0.5rem;
  }

  .period-board__error {
    color: var(--color-error);
    margin: 0;
  }

  .period-board__warning {
    color: var(--color-muted);
    margin: 0;
  }

  .period-board__hint {
    color: var(--color-muted);
    font-size: 0.875rem;
    margin: 0;
  }
</style>
