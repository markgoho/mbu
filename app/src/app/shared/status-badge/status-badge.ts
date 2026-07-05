import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Accepts a plain string since list summaries carry an unliteraled status from the API. */
@Component({
  selector: 'app-status-badge',
  templateUrl: './status-badge.html',
  styleUrl: './status-badge.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadge {
  readonly status = input.required<string>();
}
