import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, type FormGroup } from '@angular/forms';
import type {
  UniversityCreateRequest,
  UniversityPatchRequest,
  UniversityResponse,
} from '../../api-types/universities-api.types';
import { Universities } from '../../services/universities';

/** Shared university fields form for create and edit. */
@Component({
  selector: 'app-university-form',
  imports: [ReactiveFormsModule],
  templateUrl: './university-form.html',
  styleUrl: './university-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UniversityForm {
  private readonly fb = inject(FormBuilder);
  private readonly universities = inject(Universities);

  /** When set, the form edits an existing university; otherwise it creates one. */
  readonly universityId = input<string | undefined>(undefined);
  readonly initial = input<UniversityResponse | undefined>(undefined);
  readonly readonly = input(false);

  readonly saved = output<UniversityResponse>();

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(120)]],
    timezone: ['America/New_York', Validators.required],
    startDate: ['', Validators.required],
    endDate: [''],
    registrationOpensAt: [''],
    registrationClosesAt: ['', Validators.required],
    locationName: ['', Validators.required],
    locationAddress: ['', Validators.required],
    locationCity: ['', Validators.required],
    locationState: ['', Validators.required],
    locationZip: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      const data = this.initial();
      if (data) this.applyInitial(data);
    });

    effect(() => {
      if (this.readonly()) {
        this.form.disable();
      } else {
        this.form.enable();
      }
    });
  }

  private applyInitial(data: UniversityResponse): void {
    this.form.patchValue({
      title: data.title,
      timezone: data.timezone,
      startDate: toLocalInput(data.startDate),
      endDate: data.endDate ? toLocalInput(data.endDate) : '',
      registrationOpensAt: data.registrationOpensAt ? toLocalInput(data.registrationOpensAt) : '',
      registrationClosesAt: toLocalInput(data.registrationClosesAt),
      locationName: data.location.name,
      locationAddress: data.location.address,
      locationCity: data.location.city,
      locationState: data.location.state,
      locationZip: data.location.zip,
    });
  }

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    const v = this.form.value;
    const location = {
      name: (v.locationName as string).trim(),
      address: (v.locationAddress as string).trim(),
      city: (v.locationCity as string).trim(),
      state: (v.locationState as string).trim(),
      zip: (v.locationZip as string).trim(),
    };

    try {
      const id = this.universityId();
      let result: UniversityResponse;
      if (id) {
        const body: UniversityPatchRequest = {
          title: (v.title as string).trim(),
          timezone: v.timezone as string,
          startDate: toIso(v.startDate as string),
          endDate: v.endDate ? toIso(v.endDate as string) : null,
          registrationOpensAt: v.registrationOpensAt
            ? toIso(v.registrationOpensAt as string)
            : null,
          registrationClosesAt: toIso(v.registrationClosesAt as string),
          location,
        };
        result = await this.universities.patchUniversity(id, body);
      } else {
        const body: UniversityCreateRequest = {
          id: crypto.randomUUID(),
          title: (v.title as string).trim(),
          timezone: v.timezone as string,
          startDate: toIso(v.startDate as string),
          endDate: v.endDate ? toIso(v.endDate as string) : null,
          registrationOpensAt: v.registrationOpensAt
            ? toIso(v.registrationOpensAt as string)
            : null,
          registrationClosesAt: toIso(v.registrationClosesAt as string),
          location,
        };
        result = await this.universities.createUniversity(body);
      }
      this.saved.emit(result);
    } catch (error) {
      this.errorMessage.set(
        this.universities.apiErrorMessage(error, 'Could not save the university.'),
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}

function toIso(localDatetime: string): string {
  return new Date(localDatetime).toISOString();
}

function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
