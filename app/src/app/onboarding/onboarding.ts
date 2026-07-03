import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type FormGroup,
} from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type {
  OnboardingRequest,
  UserResponse,
} from '../api-types/users-api.types';
import { Auth } from '../services/auth';

@Component({
  selector: 'app-onboarding',
  imports: [ReactiveFormsModule],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Onboarding {
  private readonly auth = inject(Auth);
  private readonly httpClient = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form: FormGroup = this.fb.group({
    displayName: [
      this.auth.currentUser?.displayName ?? '',
      [Validators.required],
    ],
    acceptedTerms: [false, [Validators.requiredTrue]],
  });

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    const displayName = (this.form.value.displayName as string).trim();
    const body: OnboardingRequest = { displayName, acceptedTerms: true };

    try {
      await firstValueFrom(
        this.httpClient.patch<UserResponse>('/api/users/me', body),
      );
      await this.router.navigate(['/']);
    } catch {
      this.errorMessage.set('Could not save your details. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
