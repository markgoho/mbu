<!--
  The native input for a value that the user types or picks: text, email,
  password, number, datetime-local, hidden, and so on. It has no style of its
  own: #102 adds the design here.

  `bind:value` is the binding of the native element. The value is a number
  when the type is `number` or `range`, and a string for the other types.
  A checkbox uses the Checkbox atom. A radio input and a file input have no atom.
-->
<script lang="ts">
  import type { HTMLInputAttributes, HTMLInputTypeAttribute } from 'svelte/elements';

  interface Properties extends Omit<HTMLInputAttributes, 'type' | 'checked' | 'files' | 'group'> {
    type?: Exclude<
      HTMLInputTypeAttribute,
      'checkbox' | 'radio' | 'file' | 'button' | 'submit' | 'reset' | 'image'
    >;
  }

  let { type = 'text', value = $bindable(), ...rest }: Properties = $props();
</script>

<input {type} bind:value {...rest} />
