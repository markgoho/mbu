<!--
  A question with a confirm action and a cancel action, in a modal dialog.

  It is the native `<dialog>` with `showModal()`, so the focus trap, the Escape
  key and the backdrop come from the browser. Render it always and bind `open`:
  do not put it in an `{#if}` block. A press of Escape and a click on the
  backdrop are a cancel.
-->
<script lang="ts">
  import Button from './atoms/Button.svelte';

  interface Properties {
    open?: boolean;
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }

  const titleId = $props.id();

  let {
    open = $bindable(false),
    title = '',
    message,
    confirmLabel = 'Continue',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
  }: Properties = $props();

  let dialog = $state<HTMLDialogElement>();

  // `showModal()` and `close()` are the only API that makes a dialog modal.
  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  });

  // The dialog closes before the callback runs, so the callback can open a
  // print dialog or go to a different page.
  function confirm() {
    open = false;
    dialog?.close();
    onConfirm();
  }

  function cancel() {
    open = false;
    dialog?.close();
    onCancel?.();
  }

  // The browser closed the dialog (Escape or the backdrop) if `open` is still
  // true here. A close that started from `open` has no callback. If the dialog
  // is open, this is the late event of a close before the caller opened it again.
  function handleClose() {
    if (open && !dialog?.open) cancel();
  }
</script>

<dialog
  bind:this={dialog}
  role="alertdialog"
  closedby="any"
  aria-labelledby={title ? titleId : undefined}
  aria-label={title ? undefined : message}
  onclose={handleClose}
>
  {#if title}
    <h2 id={titleId}>{title}</h2>
  {/if}
  <p>{message}</p>
  <div class="actions">
    <Button onclick={cancel}>{cancelLabel}</Button>
    <Button onclick={confirm}>{confirmLabel}</Button>
  </div>
</dialog>

<style>
  dialog {
    max-inline-size: min(28rem, 100% - 2rem);
    padding: 1.5rem;
    border: 0;
    border-radius: 0.5rem;
    background: var(--color-surface);
    color: var(--color-text);
    box-shadow: 0 0.5rem 1.5rem rgb(0 0 0 / 25%);
  }

  dialog::backdrop {
    background: rgb(0 0 0 / 50%);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-block-start: 1rem;
  }
</style>
