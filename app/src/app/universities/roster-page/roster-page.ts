import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { ClassRoster } from '../../api-types/registrations-api.types';
import { classRosterToCsv, eventRosterToCsv } from '../../lib/roster-csv';
import { Registrations } from '../../services/registrations';
import { Universities } from '../../services/universities';

@Component({
  selector: 'app-roster-page',
  imports: [RouterLink],
  templateUrl: './roster-page.html',
  styleUrl: './roster-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RosterPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly universities = inject(Universities);
  private readonly registrations = inject(Registrations);

  protected readonly universityId = signal('');

  private readonly routeParams = toSignal(this.route.paramMap);

  protected readonly roster = this.registrations.roster;

  protected readonly loadError = computed(() => {
    const error = this.roster.error();
    if (!error) return null;
    if (error instanceof HttpErrorResponse && error.status === 403) return null;
    return 'Could not load rosters for this event.';
  });

  constructor() {
    effect(() => {
      const id = this.routeParams()?.get('id');
      if (id) {
        this.universityId.set(id);
        this.registrations.openRoster(id);
      }
    });

    effect(() => {
      const error = this.roster.error();
      if (error instanceof HttpErrorResponse && error.status === 403) {
        this.universities.flashMessage.set('You do not have access to those rosters.');
        void this.router.navigate(['/universities']);
      }
    });
  }

  protected print(): void {
    globalThis.print();
  }

  protected exportEventCsv(): void {
    const data = this.roster.value();
    if (!data) return;
    this.downloadCsv(eventRosterToCsv(data), `${data.university.title} - roster.csv`);
  }

  protected exportClassCsv(classRoster: ClassRoster): void {
    this.downloadCsv(
      classRosterToCsv(classRoster),
      `${classRoster.class.badgeTitle} - roster.csv`,
    );
  }

  private downloadCsv(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}
