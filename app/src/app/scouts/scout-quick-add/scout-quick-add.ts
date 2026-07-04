import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { ScoutResponse } from '../../api-types/users-api.types';
import { Scouts } from '../../services/scouts';

/**
 * Minimal "add a scout" form (first/last name only — full profile detail can be
 * filled in later). Kept as its own component so other pages can reuse it
 * instead of inlining scout creation.
 */
@Component({
  selector: 'app-scout-quick-add',
  imports: [ReactiveFormsModule],
  templateUrl: './scout-quick-add.html',
  styleUrl: './scout-quick-add.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScoutQuickAdd {
  private readonly fb = inject(FormBuilder);
  private readonly scouts = inject(Scouts);

  readonly created = output<ScoutResponse>();

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
  });

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      const scout = await this.scouts.create({
        firstName: (this.form.value.firstName as string).trim(),
        lastName: (this.form.value.lastName as string).trim(),
      });
      this.form.reset();
      this.created.emit(scout);
    } catch {
      this.errorMessage.set('Could not add this scout. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
