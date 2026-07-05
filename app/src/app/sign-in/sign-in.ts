import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, type FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { safeReturnTo } from '../lib/return-to';
import { Auth } from '../services/auth';

@Component({
  selector: 'app-sign-in',
  imports: [ReactiveFormsModule],
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignIn {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  protected readonly mode = signal<'sign-in' | 'sign-up'>('sign-in');
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected toggleMode(): void {
    this.mode.set(this.mode() === 'sign-in' ? 'sign-up' : 'sign-in');
    this.errorMessage.set('');
  }

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    const { email, password } = this.form.value as {
      email: string;
      password: string;
    };

    try {
      await (this.mode() === 'sign-in'
        ? this.auth.signInWithEmailPassword(email, password)
        : this.auth.signUpWithEmailPassword(email, password));
      await this.router.navigateByUrl(this.returnTo());
    } catch (error) {
      if (error instanceof Error) this.errorMessage.set(error.message);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async onGoogle(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      await this.auth.signInWithGoogle();
      await this.router.navigateByUrl(this.returnTo());
    } catch (error) {
      if (error instanceof Error) this.errorMessage.set(error.message);
    } finally {
      this.isLoading.set(false);
    }
  }

  private returnTo(): string {
    return safeReturnTo(this.route.snapshot.queryParamMap);
  }
}
