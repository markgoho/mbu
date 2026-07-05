import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import type { ApiErrorBody, Period, PublicClass } from '../api-types/universities-api.types';
import type { RegistrationResponse } from '../api-types/registrations-api.types';
import type { ScoutResponse } from '../api-types/users-api.types';
import { Registrations } from '../services/registrations';
import { Scouts } from '../services/scouts';
import { Universities } from '../services/universities';
import { ScoutQuickAdd } from '../scouts/scout-quick-add/scout-quick-add';

@Component({
  selector: 'app-register',
  imports: [DatePipe, ScoutQuickAdd],
  templateUrl: './register.html',
  styleUrl: './register.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Register {
  private readonly route = inject(ActivatedRoute);
  private readonly registrations = inject(Registrations);
  private readonly universities = inject(Universities);
  protected readonly scouts = inject(Scouts);

  private readonly params = toSignal(this.route.paramMap);
  protected readonly universityId = computed(() => this.params()?.get('id') ?? '');

  // Same public read the marketing event page uses — this page adds actions
  // on top of it rather than embedding that component (whose CTA is
  // "sign in", not registration controls).
  protected readonly event = this.universities.publicEvent;

  protected readonly schedule = this.registrations.schedule;

  protected readonly selectedScoutId = signal<string | undefined>(undefined);
  protected readonly scoutFilter = signal('');
  protected readonly showAddScout = signal(false);
  protected readonly actionError = signal('');
  protected readonly pendingClassId = signal<string | undefined>(undefined);
  protected readonly waitlistPromptClassId = signal<string | undefined>(undefined);
  protected readonly consentAccepted = signal(false);

  protected readonly scoutList = computed(() => this.scouts.mine.value()?.scouts ?? []);

  protected readonly filteredScouts = computed(() => {
    const filter = this.scoutFilter().trim().toLowerCase();
    const list = this.scoutList();
    if (!filter) return list;
    return list.filter((s) => `${s.firstName} ${s.lastName}`.toLowerCase().includes(filter));
  });

  protected readonly registrationsList = computed(() => this.schedule.value()?.registrations ?? []);

  protected readonly selectedScoutRegistrations = computed(() => {
    const scoutId = this.selectedScoutId();
    if (!scoutId) return [];
    return this.registrationsList().filter((r) => r.scoutId === scoutId);
  });

  protected readonly selectedScoutProgress = computed(() => {
    const ev = this.event.value();
    if (!ev) return null;
    return scoutProgress(this.selectedScoutRegistrations(), ev.periods.length);
  });

  protected readonly consentLabel = computed(() => {
    const scout = this.scoutList().find((s) => s.scoutId === this.selectedScoutId());
    const scoutName = scout ? `${scout.firstName} ${scout.lastName}` : 'your scout';
    const universityTitle = this.event.value()?.title ?? 'this event';
    return `I consent to share ${scoutName}'s information with the organizers of ${universityTitle}.`;
  });

  constructor() {
    effect(() => {
      const id = this.universityId();
      if (id) {
        this.registrations.openUniversity(id);
        this.universities.openPublicUniversity(id);
      }
    });

    // Default to the first scout once the list loads (only if none picked yet).
    effect(() => {
      const list = this.scoutList();
      if (list.length > 0 && !this.selectedScoutId()) {
        this.selectedScoutId.set(list[0]!.scoutId);
      }
    });
  }

  protected selectScout(scoutId: string): void {
    if (scoutId === this.selectedScoutId()) return;
    this.selectedScoutId.set(scoutId);
    this.actionError.set('');
    // Consent is per scout per event: switching scouts requires a fresh act.
    this.consentAccepted.set(false);
  }

  protected onScoutAdded(scout: ScoutResponse): void {
    this.showAddScout.set(false);
    this.selectScout(scout.scoutId);
  }

  protected periodClasses(period: Period): PublicClass[] {
    return (this.event.value()?.classes ?? []).filter((c) => c.periodIds.includes(period.periodId));
  }

  protected scoutRegistrationFor(classId: string): RegistrationResponse | undefined {
    return this.selectedScoutRegistrations().find((r) => r.classId === classId);
  }

  protected conflictFor(cls: PublicClass): ScheduleConflict | null {
    return findScheduleConflict(cls.classId, cls.periodIds, this.selectedScoutRegistrations());
  }

  protected async onRegister(cls: PublicClass): Promise<void> {
    const scoutId = this.selectedScoutId();
    if (!scoutId) return;
    const acceptWaitlist = cls.seatsRemaining <= 0;
    await this.attemptRegister(cls, scoutId, acceptWaitlist);
  }

  private async attemptRegister(
    cls: PublicClass,
    scoutId: string,
    acceptWaitlist: boolean,
  ): Promise<void> {
    if (!this.consentAccepted()) return;
    this.actionError.set('');
    this.pendingClassId.set(cls.classId);
    try {
      await this.registrations.register(this.universityId(), cls.classId, {
        scoutId,
        acceptWaitlist,
        acceptConsent: true,
      });
      this.universities.reloadPublicEvent();
    } catch (error) {
      const body = errorBody(error);
      if (body?.code === 'class_full' && !acceptWaitlist) {
        this.waitlistPromptClassId.set(cls.classId);
      } else {
        this.actionError.set(body?.error ?? 'Could not register for this class.');
      }
    } finally {
      this.pendingClassId.set(undefined);
    }
  }

  protected async confirmWaitlist(cls: PublicClass, accept: boolean): Promise<void> {
    this.waitlistPromptClassId.set(undefined);
    const scoutId = this.selectedScoutId();
    if (!scoutId || !accept) return;
    await this.attemptRegister(cls, scoutId, true);
  }

  protected async onCancel(cls: PublicClass): Promise<void> {
    const scoutId = this.selectedScoutId();
    if (!scoutId) return;
    if (!globalThis.confirm(`Drop ${cls.badgeTitle}?`)) return;

    this.actionError.set('');
    this.pendingClassId.set(cls.classId);
    try {
      await this.registrations.cancel(this.universityId(), cls.classId, scoutId);
      this.universities.reloadPublicEvent();
    } catch {
      this.actionError.set('Could not drop this class. Please try again.');
    } finally {
      this.pendingClassId.set(undefined);
    }
  }
}

interface ScheduleConflict {
  classId: string;
  badgeTitle: string;
}

/**
 * Conflict check: does registering the scout into `candidateClassId` (covering
 * `candidatePeriodIds`) collide with a period the scout already holds an active
 * seat in for a *different* class? Mirrors the server's period exclusivity rule,
 * which treats both `enrolled` and `waitlisted` registrations as occupying the
 * period (a waitlist placement holds the slot). Keeping this in sync avoids
 * firing a register we know the API will reject with period_conflict.
 */
function findScheduleConflict(
  candidateClassId: string,
  candidatePeriodIds: string[],
  scoutRegistrations: RegistrationResponse[],
): ScheduleConflict | null {
  for (const reg of scoutRegistrations) {
    if (reg.classId === candidateClassId) continue;
    if (reg.periodIds.some((p) => candidatePeriodIds.includes(p))) {
      return { classId: reg.classId, badgeTitle: reg.badgeTitle };
    }
  }
  return null;
}

/**
 * Distinct periods the scout has committed to — enrolled *or* waitlisted, since
 * a waitlisted period is occupied and blocks other classes (matches the
 * server's exclusivity rule and findScheduleConflict above).
 */
function scoutProgress(
  scoutRegistrations: RegistrationResponse[],
  totalPeriods: number,
): { scheduled: number; total: number } {
  const scheduledPeriods = new Set<string>();
  for (const reg of scoutRegistrations) {
    for (const periodId of reg.periodIds) scheduledPeriods.add(periodId);
  }
  return { scheduled: scheduledPeriods.size, total: totalPeriods };
}

function errorBody(error: unknown): ApiErrorBody | null {
  if (error instanceof HttpErrorResponse) {
    return error.error as ApiErrorBody | null;
  }
  return null;
}
