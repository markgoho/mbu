import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ClassList } from '../class-list/class-list';
import { PeriodBoard } from '../period-board/period-board';
import { UniversityForm } from '../university-form/university-form';
import { StatusBadge } from '../../shared/status-badge/status-badge';
import { Universities } from '../../services/universities';

const LOCKED_STATUSES = new Set(['submitted', 'published', 'closed']);
const SUBMITTABLE_STATUSES = new Set(['draft', 'rejected']);

@Component({
  selector: 'app-university-editor',
  imports: [RouterLink, UniversityForm, PeriodBoard, ClassList, StatusBadge],
  templateUrl: './university-editor.html',
  styleUrl: './university-editor.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UniversityEditor {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly universities = inject(Universities);

  protected readonly universityId = signal<string>('');

  /** Reactive route param — re-fires when navigating :idA → :idB (component reused). */
  private readonly routeParams = toSignal(this.route.paramMap);

  protected readonly detail = this.universities.detail;

  protected readonly loadError = computed(() => {
    const error = this.detail.error();
    if (!error) return null;
    if (error instanceof HttpErrorResponse && error.status === 403) return null;
    return 'Could not load this university.';
  });

  protected readonly isLocked = computed(() =>
    LOCKED_STATUSES.has(this.detail.value()?.university.status ?? ''),
  );

  protected readonly canSubmit = computed(() =>
    SUBMITTABLE_STATUSES.has(this.detail.value()?.university.status ?? ''),
  );

  protected readonly canClose = computed(
    () => this.detail.value()?.university.status === 'published',
  );

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

    effect(() => {
      const error = this.detail.error();
      if (error instanceof HttpErrorResponse && error.status === 403) {
        this.universities.flashMessage.set('You do not have access to that university.');
        void this.router.navigate(['/universities']);
      }
    });
  }

  protected async deleteUniversity(): Promise<void> {
    const id = this.universityId();
    if (!globalThis.confirm('Delete this draft university and all its classes?')) {
      return;
    }
    await this.universities.deleteUniversity(id);
    await this.router.navigate(['/universities']);
  }

  protected async submitForReview(): Promise<void> {
    this.actionError.set('');
    this.actionPending.set(true);
    try {
      await this.universities.submitUniversity(this.universityId());
    } catch (error) {
      this.actionError.set(
        this.universities.apiErrorMessage(error, 'Could not submit for review.'),
      );
    } finally {
      this.actionPending.set(false);
    }
  }

  protected async closeEvent(): Promise<void> {
    if (!globalThis.confirm('Close this event? This cannot be undone.')) {
      return;
    }
    this.actionError.set('');
    this.actionPending.set(true);
    try {
      await this.universities.closeUniversity(this.universityId());
    } catch (error) {
      this.actionError.set(this.universities.apiErrorMessage(error, 'Could not close the event.'));
    } finally {
      this.actionPending.set(false);
    }
  }
}
