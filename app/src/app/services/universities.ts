import { HttpClient, HttpErrorResponse, httpResource } from '@angular/common/http';
import { computed, effect, inject, Service, signal, type Signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type {
  ApiErrorBody,
  BadgeCatalogResponse,
  ClassCreateRequest,
  ClassPatchRequest,
  ClassResponse,
  PeriodsPutRequest,
  PeriodsResponse,
  PublicUniversity,
  ReviewQueueResponse,
  UniversityCreateRequest,
  UniversityDetailResponse,
  UniversityListResponse,
  UniversityPatchRequest,
  UniversityResponse,
} from '../api-types/universities-api.types';

@Service()
export class Universities {
  private readonly httpClient = inject(HttpClient);
  private readonly router = inject(Router);

  /** Set by the editor route; drives the detail resource. */
  readonly activeUniversityId = signal<string | undefined>(undefined);

  /** Set by the public register route; drives the public event resource. */
  readonly activePublicUniversityId = signal<string | undefined>(undefined);

  /** Flash message for dashboard redirects (e.g. 403). */
  readonly flashMessage = signal<string | null>(null);

  readonly mine = httpResource<UniversityListResponse>(() => '/api/universities/mine');

  readonly badges = httpResource<BadgeCatalogResponse>(() => '/api/universities/badges');

  readonly detail = httpResource<UniversityDetailResponse>(() => {
    const id = this.activeUniversityId();
    return id ? `/api/universities/${id}` : undefined;
  });

  /**
   * Published, parent-facing view of an event (the same read the marketing
   * page uses). Drives the register page so its collaborators are injectable.
   */
  readonly publicEvent = httpResource<PublicUniversity>(() => {
    const id = this.activePublicUniversityId();
    return id ? `/api/universities/${id}/public` : undefined;
  });

  /** Set by the admin review-queue route; gates the super-admin-only queue fetch. */
  readonly activeReviewQueue = signal(false);

  readonly reviewQueue = httpResource<ReviewQueueResponse>(() =>
    this.activeReviewQueue() ? '/api/admin/universities/review-queue' : undefined,
  );

  openReviewQueue(): void {
    // Gate the admin-only fetch behind explicit activation so it never fires
    // (and 403s) for non-super-admins who inject this service on other pages.
    if (this.activeReviewQueue()) {
      this.reviewQueue.reload();
    } else {
      this.activeReviewQueue.set(true);
    }
  }

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

  openPublicUniversity(id: string): void {
    if (this.activePublicUniversityId() === id) {
      this.publicEvent.reload();
    } else {
      this.activePublicUniversityId.set(id);
    }
  }

  reloadPublicEvent(): void {
    this.publicEvent.reload();
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

  async submitUniversity(id: string): Promise<UniversityResponse> {
    const result = await firstValueFrom(
      this.httpClient.post<UniversityResponse>(`/api/universities/${id}/submit`, {}),
    );
    this.reloadMine();
    if (this.activeUniversityId() === id) {
      this.reloadDetail();
    }
    return result;
  }

  async closeUniversity(id: string): Promise<UniversityResponse> {
    const result = await firstValueFrom(
      this.httpClient.post<UniversityResponse>(`/api/universities/${id}/close`, {}),
    );
    this.reloadMine();
    if (this.activeUniversityId() === id) {
      this.reloadDetail();
    }
    return result;
  }

  async approveUniversity(id: string): Promise<UniversityResponse> {
    const result = await firstValueFrom(
      this.httpClient.post<UniversityResponse>(`/api/admin/universities/${id}/approve`, {}),
    );
    this.reviewQueue.reload();
    if (this.activeUniversityId() === id) {
      this.reloadDetail();
    }
    return result;
  }

  async rejectUniversity(id: string, note: string): Promise<UniversityResponse> {
    const result = await firstValueFrom(
      this.httpClient.post<UniversityResponse>(`/api/admin/universities/${id}/reject`, {
        note,
      }),
    );
    this.reviewQueue.reload();
    if (this.activeUniversityId() === id) {
      this.reloadDetail();
    }
    return result;
  }

  recoverDenied(
    error: Signal<unknown>,
    { denied, fallback }: { denied: string; fallback: string },
  ): Signal<string | null> {
    const loadError = computed(() => {
      const value = error();
      if (!value || (value instanceof HttpErrorResponse && value.status === 403)) {
        return null;
      }
      return fallback;
    });

    effect(() => {
      const value = error();
      if (value instanceof HttpErrorResponse && value.status === 403) {
        this.flashMessage.set(denied);
        void this.router.navigate(['/universities']);
      }
    });

    return loadError;
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
