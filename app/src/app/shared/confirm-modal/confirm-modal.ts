import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Generic confirm/cancel dialog. The parent owns visibility via @if. */
@Component({
  selector: 'app-confirm-modal',
  templateUrl: './confirm-modal.html',
  styleUrl: './confirm-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(click)': 'cancelled.emit()' },
})
export class ConfirmModal {
  readonly title = input('');
  readonly message = input.required<string>();
  readonly confirmLabel = input('Continue');
  readonly cancelLabel = input('Cancel');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
