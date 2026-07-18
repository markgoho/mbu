import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { ClassResponse, Period } from '../../api-types/universities-api.types';
import { DISCLAIMER_TEXT } from '../../constants/disclaimer';
import { Auth } from '../../services/auth';
import { createUniversityAction } from '../../services/university-action';
import { Universities } from '../../services/universities';

@Component({
  selector: 'app-class-form',
  imports: [ReactiveFormsModule],
  templateUrl: './class-form.html',
  styleUrl: './class-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassForm {
  private readonly fb = inject(FormBuilder);
  private readonly universities = inject(Universities);
  private readonly auth = inject(Auth);

  readonly universityId = input.required<string>();
  readonly periods = input<Period[]>([]);
  readonly editing = input<ClassResponse | undefined>(undefined);
  readonly dismissed = output<void>();

  protected readonly disclaimerText = DISCLAIMER_TEXT;
  private readonly action = createUniversityAction(
    this.universities.apiErrorMessage.bind(this.universities),
  );
  protected readonly isLoading = this.action.pending;
  protected readonly errorMessage = this.action.error;

  protected readonly form = this.fb.group({
    badgeSlug: ['', Validators.required],
    periodIds: this.fb.control<string[]>([], Validators.required),
    capacity: [20, [Validators.required, Validators.min(1), Validators.max(200)]],
    room: [''],
    notes: [''],
    bsaId: ['', Validators.required],
    acceptDisclaimer: [false, Validators.requiredTrue],
  });

  constructor() {
    this.universities.badges.reload();
    effect(() => {
      const cls = this.editing();
      if (cls) {
        this.form.controls.bsaId.disable();
        this.form.controls.acceptDisclaimer.disable();
        this.applyEditing(cls);
      } else {
        this.form.controls.bsaId.enable();
        this.form.controls.acceptDisclaimer.enable();
      }
    });
  }

  private applyEditing(cls: ClassResponse): void {
    this.form.patchValue({
      badgeSlug: cls.badgeSlug,
      periodIds: cls.periodIds,
      capacity: cls.capacity,
      room: cls.room ?? '',
      notes: cls.notes ?? '',
      bsaId: cls.counselors[0]?.bsaId ?? '',
      acceptDisclaimer: true,
    });
  }

  protected togglePeriod(periodId: string, checked: boolean): void {
    const current = new Set(this.form.value.periodIds ?? []);
    if (checked) {
      current.add(periodId);
    } else {
      current.delete(periodId);
    }
    this.form.patchValue({ periodIds: [...current] });
  }

  protected isPeriodSelected(periodId: string): boolean {
    return (this.form.value.periodIds ?? []).includes(periodId);
  }

  protected chancellorName(): string {
    return this.auth.sessionUser()?.displayName ?? '';
  }

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if ((this.form.value.periodIds ?? []).length === 0) {
      this.errorMessage.set('Select at least one period.');
      return;
    }

    const v = this.form.value;
    const editing = this.editing();

    await this.action.run({
      fallback: 'Could not save the class.',
      action: () => {
        if (editing) {
          return this.universities.patchClass(this.universityId(), editing.classId, {
            badgeSlug: v.badgeSlug as string,
            periodIds: v.periodIds as string[],
            capacity: v.capacity as number,
            room: (v.room as string) || null,
            notes: (v.notes as string) || null,
          });
        }
        return this.universities.createClass(this.universityId(), {
          badgeSlug: v.badgeSlug as string,
          periodIds: v.periodIds as string[],
          capacity: v.capacity as number,
          room: (v.room as string) || null,
          notes: (v.notes as string) || null,
          counselor: {
            bsaId: (v.bsaId as string).trim(),
            acceptDisclaimer: true,
          },
        });
      },
      onSuccess: () => {
        this.form.reset({
          capacity: 20,
          periodIds: [],
          acceptDisclaimer: false,
        });
        this.dismissed.emit();
      },
    });
  }

  protected badges() {
    return this.universities.badges.value()?.badges ?? [];
  }
}
