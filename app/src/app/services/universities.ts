import { HttpClient, HttpErrorResponse, httpResource } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type {
  ApiErrorBody,
  BadgeCatalogResponse,
  ClassCreateRequest,
  ClassPatchRequest,
  ClassResponse,
  PeriodsPutRequest,
  PeriodsResponse,
  UniversityCreateRequest,
  UniversityDetailResponse,
  UniversityListResponse,
  UniversityPatchRequest,
  UniversityResponse,
} from '../api-types/universities-api.types';

@Service()
export class Universities {
  private readonly httpClient = inject(HttpClient);

  /** Set by the editor route; drives the detail resource. */
  readonly activeUniversityId = signal<string | undefined>(undefined);

  /** Flash message for dashboard redirects (e.g. 403). */
  readonly flashMessage = signal<string | null>(null);

  readonly mine = httpResource<UniversityListResponse>(() => '/api/universities/mine');

  readonly badges = httpResource<BadgeCatalogResponse>(() => '/api/universities/badges');

  readonly detail = httpResource<UniversityDetailResponse>(() => {
    const id = this.activeUniversityId();
    return id ? `/api/universities/${id}` : undefined;
  });

  openUniversity(id: string): void {
    // Changing the id makes the detail resource refetch on its own; only force a
    // reload when re-opening the same university (the signal wouldn't change).
    if (this.activeUniversityId() === id) {
      this.detail.reload();
    } else {
      this.activeUniversityId.set(id);
    }
  }

  clearActiveUniversity(): void {
    this.activeUniversityId.set(undefined);
  }

  reloadMine(): void {
    this.mine.reload();
  }

  reloadDetail(): void {
    this.detail.reload();
  }

  async createUniversity(body: UniversityCreateRequest): Promise<UniversityResponse> {
    const result = await firstValueFrom(
      this.httpClient.post<UniversityResponse>('/api/universities', body),
    );
    this.reloadMine();
    return result;
  }

  async patchUniversity(id: string, body: UniversityPatchRequest): Promise<UniversityResponse> {
    const result = await firstValueFrom(
      this.httpClient.patch<UniversityResponse>(`/api/universities/${id}`, body),
    );
    this.reloadMine();
    if (this.activeUniversityId() === id) {
      this.reloadDetail();
    }
    return result;
  }

  async putPeriods(id: string, body: PeriodsPutRequest): Promise<PeriodsResponse> {
    const result = await firstValueFrom(
      this.httpClient.put<PeriodsResponse>(`/api/universities/${id}/periods`, body),
    );
    if (this.activeUniversityId() === id) {
      this.reloadDetail();
    }
    return result;
  }

  async createClass(universityId: string, body: ClassCreateRequest): Promise<ClassResponse> {
    const result = await firstValueFrom(
      this.httpClient.post<ClassResponse>(`/api/universities/${universityId}/classes`, body),
    );
    this.reloadMine();
    if (this.activeUniversityId() === universityId) {
      this.reloadDetail();
    }
    return result;
  }

  async patchClass(
    universityId: string,
    classId: string,
    body: ClassPatchRequest,
  ): Promise<ClassResponse> {
    const result = await firstValueFrom(
      this.httpClient.patch<ClassResponse>(
        `/api/universities/${universityId}/classes/${classId}`,
        body,
      ),
    );
    if (this.activeUniversityId() === universityId) {
      this.reloadDetail();
    }
    return result;
  }

  async deleteClass(universityId: string, classId: string): Promise<void> {
    await firstValueFrom(
      this.httpClient.delete(`/api/universities/${universityId}/classes/${classId}`),
    );
    this.reloadMine();
    if (this.activeUniversityId() === universityId) {
      this.reloadDetail();
    }
  }

  async deleteUniversity(id: string): Promise<void> {
    await firstValueFrom(this.httpClient.delete(`/api/universities/${id}`));
    this.clearActiveUniversity();
    this.reloadMine();
  }

  isForbidden(error: unknown): boolean {
    return error instanceof HttpErrorResponse && error.status === 403;
  }

  apiErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error as ApiErrorBody | null;
      const base = body?.error ?? fallback;
      const classes = body?.details?.classes;
      if (classes?.length) {
        return `${base} (${classes.map((c) => c.title).join(', ')})`;
      }
      return base;
    }
    return fallback;
  }
}
