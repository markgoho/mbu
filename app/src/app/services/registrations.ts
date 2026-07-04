import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  RegisterRequest,
  RegistrationResponse,
  RosterResponse,
  ScheduleResponse,
} from '../api-types/registrations-api.types';

@Service()
export class Registrations {
  private readonly httpClient = inject(HttpClient);

  /** Set by the register page; drives the schedule resource. */
  readonly activeUniversityId = signal<string | undefined>(undefined);

  readonly schedule = httpResource<ScheduleResponse>(() => {
    const id = this.activeUniversityId();
    return id ? `/api/registrations/${id}` : undefined;
  });

  openUniversity(id: string): void {
    if (this.activeUniversityId() === id) {
      this.schedule.reload();
    } else {
      this.activeUniversityId.set(id);
    }
  }

  reloadSchedule(): void {
    this.schedule.reload();
  }

  /** Set by the roster page; drives the roster resource. */
  readonly rosterUniversityId = signal<string | undefined>(undefined);

  readonly roster = httpResource<RosterResponse>(() => {
    const id = this.rosterUniversityId();
    return id ? `/api/registrations/${id}/roster` : undefined;
  });

  openRoster(id: string): void {
    if (this.rosterUniversityId() === id) {
      this.roster.reload();
    } else {
      this.rosterUniversityId.set(id);
    }
  }

  async register(
    universityId: string,
    classId: string,
    body: RegisterRequest,
  ): Promise<RegistrationResponse> {
    const result = await firstValueFrom(
      this.httpClient.post<RegistrationResponse>(
        `/api/registrations/${universityId}/${classId}`,
        body,
      ),
    );
    this.reloadSchedule();
    return result;
  }

  async cancel(universityId: string, classId: string, scoutId: string): Promise<void> {
    await firstValueFrom(
      this.httpClient.delete(`/api/registrations/${universityId}/${classId}/${scoutId}`),
    );
    this.reloadSchedule();
  }
}
