import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { Universities } from '../../services/universities';

@Component({
  selector: 'app-review-detail',
  imports: [RouterLink, StatusBadge, FormsModule],
  templateUrl: './review-detail.html',
  styleUrl: './review-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly universities = inject(Universities);

  protected readonly universityId = signal<string>('');

  /** Reactive route param — re-fires when navigating :idA → :idB (component reused). */
  private readonly routeParams = toSignal(this.route.paramMap);

  protected readonly detail = this.universities.detail;

  protected readonly showRejectForm = signal(false);
  protected readonly rejectNote = signal('');
  protected readonly actionPending = signal(false);
  protected readonly actionError = signal('');

  constructor() {
    effect(() => {
      const id = this.routeParams()?.get('id');
      if (id) {
        this.universityId.set(id);
        this.universities.openUniversity(id);
      }
    });
  }

  protected setRejectNote(value: string): void {
    this.rejectNote.set(value);
  }

  protected async approve(): Promise<void> {
    this.actionError.set('');
    this.actionPending.set(true);
    try {
      await this.universities.approveUniversity(this.universityId());
      await this.router.navigate(['/admin/review']);
    } catch (error) {
      this.actionError.set(
        this.universities.apiErrorMessage(error, 'Could not approve this event.'),
      );
    } finally {
      this.actionPending.set(false);
    }
  }

  protected async reject(): Promise<void> {
    const note = this.rejectNote().trim();
    if (!note) return;

    this.actionError.set('');
    this.actionPending.set(true);
    try {
      await this.universities.rejectUniversity(this.universityId(), note);
      await this.router.navigate(['/admin/review']);
    } catch (error) {
      this.actionError.set(
        this.universities.apiErrorMessage(error, 'Could not reject this event.'),
      );
    } finally {
      this.actionPending.set(false);
    }
  }
}
