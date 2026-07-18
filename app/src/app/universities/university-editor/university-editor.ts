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
import { createUniversityAction } from '../../services/university-action';
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

  protected readonly loadError = this.universities.recoverDenied(this.detail.error, {
    denied: 'You do not have access to that university.',
    fallback: 'Could not load this university.',
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

  private readonly action = createUniversityAction(
    this.universities.apiErrorMessage.bind(this.universities),
  );
  protected readonly actionPending = this.action.pending;
  protected readonly actionError = this.action.error;

  constructor() {
    effect(() => {
      const id = this.routeParams()?.get('id');
      if (id) {
        this.universityId.set(id);
        this.universities.openUniversity(id);
      }
    });
  }

  protected async deleteUniversity(): Promise<void> {
    await this.action.run({
      confirm: 'Delete this draft university and all its classes?',
      action: () => this.universities.deleteUniversity(this.universityId()),
      fallback: 'Could not delete this university.',
      onSuccess: () => this.router.navigate(['/universities']),
    });
  }

  protected async submitForReview(): Promise<void> {
    await this.action.run({
      action: () => this.universities.submitUniversity(this.universityId()),
      fallback: 'Could not submit for review.',
    });
  }

  protected async closeEvent(): Promise<void> {
    await this.action.run({
      confirm: 'Close this event? This cannot be undone.',
      action: () => this.universities.closeUniversity(this.universityId()),
      fallback: 'Could not close the event.',
    });
  }
}
