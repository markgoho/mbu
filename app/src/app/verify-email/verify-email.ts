import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../services/auth';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmail {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly email = this.auth.currentUser?.email ?? '';
  protected readonly isLoading = signal(false);
  protected readonly message = signal('');
  protected readonly errorMessage = signal('');

  protected async onResend(): Promise<void> {
    this.isLoading.set(true);
    this.message.set('');
    this.errorMessage.set('');
    try {
      await this.auth.resendEmailVerification();
      this.message.set('Verification email sent. Check your inbox.');
    } catch (error) {
      if (error instanceof Error) this.errorMessage.set(error.message);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async onContinue(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      await this.auth.reloadUser();
      if (this.auth.currentUser?.emailVerified) {
        await this.router.navigate(['/']);
      } else {
        this.errorMessage.set('Email is not verified yet. Please try again.');
      }
    } catch (error) {
      if (error instanceof Error) this.errorMessage.set(error.message);
    } finally {
      this.isLoading.set(false);
    }
  }
}
