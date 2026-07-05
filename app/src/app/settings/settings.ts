import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { ApiErrorBody } from '../api-types/universities-api.types';
import { Auth } from '../services/auth';
import { Scouts } from '../services/scouts';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.html',
  styleUrl: './settings.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings {
  private readonly auth = inject(Auth);
  protected readonly scouts = inject(Scouts);

  protected readonly scoutList = computed(() => this.scouts.mine.value()?.scouts ?? []);
  protected readonly pendingScoutId = signal<string | undefined>(undefined);
  protected readonly isDeletingAccount = signal(false);
  protected readonly errorMessage = signal('');

  protected async onDeleteScout(scoutId: string, name: string): Promise<void> {
    if (!globalThis.confirm(`Delete ${name}? This also cancels their registrations.`)) return;

    this.errorMessage.set('');
    this.pendingScoutId.set(scoutId);
    try {
      await this.scouts.remove(scoutId);
    } catch {
      this.errorMessage.set('Could not delete this scout. Please try again.');
    } finally {
      this.pendingScoutId.set(undefined);
    }
  }

  protected async onDeleteAccount(): Promise<void> {
    if (!globalThis.confirm('Delete your account? This cannot be undone.')) return;

    this.errorMessage.set('');
    this.isDeletingAccount.set(true);
    try {
      await this.auth.deleteAccount();
    } catch (error) {
      const body = errorBody(error);
      this.errorMessage.set(
        body?.code === 'close_events_first'
          ? 'Close your events first before deleting your account.'
          : 'Could not delete your account. Please try again.',
      );
    } finally {
      this.isDeletingAccount.set(false);
    }
  }
}

function errorBody(error: unknown): ApiErrorBody | null {
  if (error instanceof HttpErrorResponse) {
    return error.error as ApiErrorBody | null;
  }
  return null;
}
