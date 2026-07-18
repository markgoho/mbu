import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { ClassResponse, Period, PeriodInput } from '../../api-types/universities-api.types';
import { datetimeInputToIso, isoToDatetimeInput } from '../../lib/event-datetime';
import { createUniversityAction } from '../../services/university-action';
import { Universities } from '../../services/universities';

@Component({
  selector: 'app-period-board',
  imports: [ReactiveFormsModule],
  templateUrl: './period-board.html',
  styleUrl: './period-board.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodBoard {
  private readonly fb = inject(FormBuilder);
  private readonly universities = inject(Universities);

  readonly universityId = input.required<string>();
  readonly periods = input<Period[]>([]);
  readonly classes = input<ClassResponse[]>([]);
  readonly readonly = input(false);

  private readonly action = createUniversityAction(
    this.universities.apiErrorMessage.bind(this.universities),
  );
  protected readonly isLoading = this.action.pending;
  protected readonly errorMessage = this.action.error;
  protected readonly overlapWarning = signal<string | null>(null);

  protected readonly form = this.fb.group({
    rows: this.fb.array([]),
  });

  constructor() {
    // Reactively reseed the form whenever the periods input changes (e.g. after
    // a save reloads the detail with server-assigned periodIds).
    effect(() => {
      this.periods();
      this.syncPeriods();
    });

    effect(() => {
      if (this.readonly()) {
        this.form.disable();
      } else {
        this.form.enable();
      }
    });
  }

  protected get rows(): FormArray {
    return this.form.get('rows') as FormArray;
  }

  protected syncPeriods(): void {
    this.rows.clear();
    for (const period of this.periods()) {
      this.rows.push(this.createRow(period));
    }
    if (this.rows.length === 0) {
      this.addRow();
    }
  }

  protected addRow(): void {
    this.rows.push(this.createRow());
  }

  protected removeRow(index: number): void {
    const periodId = this.rows.at(index)?.value.periodId as string | undefined;
    if (periodId && this.isPeriodInUse(periodId)) {
      this.errorMessage.set(
        'This period is assigned to a class. Remove or reassign the class first.',
      );
      return;
    }
    this.errorMessage.set('');
    this.rows.removeAt(index);
  }

  protected isPeriodInUse(periodId: string): boolean {
    return this.classes().some((c) => c.periodIds.includes(periodId));
  }

  protected async save(): Promise<void> {
    this.errorMessage.set('');
    this.overlapWarning.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const periods: PeriodInput[] = this.rows.controls.map((control) => {
      const v = control.value;
      const entry: PeriodInput = {
        label: (v.label as string).trim(),
        startsAt: datetimeInputToIso(v.startsAt as string),
        endsAt: datetimeInputToIso(v.endsAt as string),
      };
      if (v.periodId) {
        entry.periodId = v.periodId as string;
      }
      return entry;
    });

    const overlap = findOverlaps(periods);
    if (overlap) {
      this.overlapWarning.set(`Periods "${overlap.a}" and "${overlap.b}" overlap in time.`);
    }

    await this.action.run({
      action: () => this.universities.putPeriods(this.universityId(), { periods }),
      fallback: 'Could not save periods.',
    });
  }

  private createRow(period?: Period) {
    return this.fb.group({
      periodId: [period?.periodId ?? ''],
      label: [period?.label ?? '', Validators.required],
      startsAt: [period ? isoToDatetimeInput(period.startsAt) : '', Validators.required],
      endsAt: [period ? isoToDatetimeInput(period.endsAt) : '', Validators.required],
    });
  }
}

export function findOverlaps(periods: PeriodInput[]): { a: string; b: string } | null {
  for (let i = 0; i < periods.length; i++) {
    for (let j = i + 1; j < periods.length; j++) {
      const a = periods[i]!;
      const b = periods[j]!;
      const aStart = new Date(a.startsAt).getTime();
      const aEnd = new Date(a.endsAt).getTime();
      const bStart = new Date(b.startsAt).getTime();
      const bEnd = new Date(b.endsAt).getTime();
      if (aStart < bEnd && bStart < aEnd) {
        return { a: a.label, b: b.label };
      }
    }
  }
  return null;
}
