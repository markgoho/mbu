<!--
  The fields of a university, for the create page and for the editor.

  The form does not call the API. It gives the values to `onSave`, and the
  caller creates or changes the university. While `onSave` is in progress the
  button shows "Saving…". If `onSave` rejects, the form shows the message.
-->
<script lang="ts" module>
  import type { UniversityLocation } from '#lib/api-types/universities-api.types.js';

  /**
  The values of the form, with trimmed text and ISO UTC datetimes. They are the
  body of a `PATCH`, and with an `id` the body of a `POST`.
  */
  export interface UniversityFormValues {
    title: string;
    timezone: string;
    startDate: string;
    endDate: string | null;
    registrationOpensAt: string | null;
    registrationClosesAt: string;
    location: UniversityLocation;
  }
</script>

<script lang="ts">
  import type { UniversityResponse } from '#lib/api-types/universities-api.types.js';
  import Button from '#lib/components/atoms/Button.svelte';
  import TextInput from '#lib/components/atoms/TextInput.svelte';
  import { datetimeInputToIso, isoToDatetimeInput } from '#lib/eventDatetime.js';
  import { FormAction } from '#lib/formAction.svelte.js';

  const MAX_TITLE_LENGTH = 120;

  interface Properties {
    /**
    The university to edit. With no value, the form starts empty.
    */
    initial?: UniversityResponse | undefined;
    /**
    Disables all fields and hides the save button.
    */
    readonly?: boolean;
    onSave: (values: UniversityFormValues) => Promise<unknown>;
  }

  let { initial, readonly = false, onSave }: Properties = $props();

  function optionalDatetimeInput(iso: string | null | undefined): string {
    return iso ? isoToDatetimeInput(iso) : '';
  }

  /**
  The text of the fields. The datetimes are `datetime-local` values.
  */
  class Fields {
    title = $state('');
    timezone = $state('America/New_York');
    startDate = $state('');
    endDate = $state('');
    registrationOpensAt = $state('');
    registrationClosesAt = $state('');
    locationName = $state('');
    locationAddress = $state('');
    locationCity = $state('');
    locationState = $state('');
    locationZip = $state('');

    constructor(university: UniversityResponse | undefined) {
      if (!university) return;
      this.title = university.title;
      this.timezone = university.timezone;
      this.startDate = isoToDatetimeInput(university.startDate);
      this.endDate = optionalDatetimeInput(university.endDate);
      this.registrationOpensAt = optionalDatetimeInput(university.registrationOpensAt);
      this.registrationClosesAt = isoToDatetimeInput(university.registrationClosesAt);
      this.locationName = university.location.name;
      this.locationAddress = university.location.address;
      this.locationCity = university.location.city;
      this.locationState = university.location.state;
      this.locationZip = university.location.zip;
    }

    /**
    The values to save, or `undefined` when a required field is empty or the title is too long.
    */
    toValues(): UniversityFormValues | undefined {
      const values: UniversityFormValues = {
        title: this.title.trim(),
        timezone: this.timezone.trim(),
        startDate: this.startDate,
        endDate: this.endDate || null,
        registrationOpensAt: this.registrationOpensAt || null,
        registrationClosesAt: this.registrationClosesAt,
        location: {
          name: this.locationName.trim(),
          address: this.locationAddress.trim(),
          city: this.locationCity.trim(),
          state: this.locationState.trim(),
          zip: this.locationZip.trim(),
        },
      };
      const required = [
        values.title,
        values.timezone,
        values.startDate,
        values.registrationClosesAt,
        ...Object.values(values.location),
      ];
      if (required.includes('') || values.title.length > MAX_TITLE_LENGTH) return undefined;

      return {
        ...values,
        startDate: datetimeInputToIso(values.startDate),
        endDate: values.endDate && datetimeInputToIso(values.endDate),
        registrationOpensAt:
          values.registrationOpensAt && datetimeInputToIso(values.registrationOpensAt),
        registrationClosesAt: datetimeInputToIso(values.registrationClosesAt),
      };
    }
  }

  // The fields start again from `initial` each time the route loads the
  // university again (after a write), and when the route shows a different one.
  let fields = $derived(new Fields(initial));

  const action = new FormAction();

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const values = fields.toValues();
    if (!values) return;

    await action.run({
      action: () => onSave(values),
      fallback: 'Could not save the university.',
    });
  }
</script>

<!-- `novalidate`: this form has no browser validation and no field messages (#102 owns them). -->
<form class="uni-form" novalidate onsubmit={handleSubmit}>
  {#if action.error}
    <p class="uni-form__error" role="alert">{action.error}</p>
  {/if}

  <label for="title">Title</label>
  <TextInput id="title" disabled={readonly} bind:value={fields.title} />

  <label for="timezone">Timezone (IANA)</label>
  <TextInput id="timezone" list="tz-list" disabled={readonly} bind:value={fields.timezone} />
  <datalist id="tz-list">
    <option value="America/New_York"></option>
    <option value="America/Chicago"></option>
    <option value="America/Denver"></option>
    <option value="America/Los_Angeles"></option>
    <option value="America/Phoenix"></option>
  </datalist>

  <label for="startDate">Event start</label>
  <TextInput
    id="startDate"
    type="datetime-local"
    disabled={readonly}
    bind:value={fields.startDate}
  />

  <label for="endDate">Event end (optional — leave blank for single-day)</label>
  <TextInput id="endDate" type="datetime-local" disabled={readonly} bind:value={fields.endDate} />

  <label for="registrationOpensAt">Registration opens (optional)</label>
  <TextInput
    id="registrationOpensAt"
    type="datetime-local"
    disabled={readonly}
    bind:value={fields.registrationOpensAt}
  />

  <label for="registrationClosesAt">Registration closes</label>
  <TextInput
    id="registrationClosesAt"
    type="datetime-local"
    disabled={readonly}
    bind:value={fields.registrationClosesAt}
  />

  <fieldset class="uni-form__fieldset">
    <legend>Location</legend>
    <label for="locationName">Venue name</label>
    <TextInput id="locationName" disabled={readonly} bind:value={fields.locationName} />
    <label for="locationAddress">Street address</label>
    <TextInput id="locationAddress" disabled={readonly} bind:value={fields.locationAddress} />
    <label for="locationCity">City</label>
    <TextInput id="locationCity" disabled={readonly} bind:value={fields.locationCity} />
    <label for="locationState">State</label>
    <TextInput id="locationState" disabled={readonly} bind:value={fields.locationState} />
    <label for="locationZip">ZIP</label>
    <TextInput id="locationZip" disabled={readonly} bind:value={fields.locationZip} />
  </fieldset>

  {#if !readonly}
    <Button type="submit" disabled={action.pending}>
      {#if action.pending}
        Saving…
      {:else}
        Save university
      {/if}
    </Button>
  {/if}
</form>

<style>
  .uni-form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .uni-form__fieldset {
    border: 1px solid var(--color-border);
    border-radius: 0.25rem;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .uni-form__error {
    color: var(--color-error);
    margin: 0;
  }
</style>
