import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { ScoutListResponse, ScoutRequest, ScoutResponse } from '../api-types/users-api.types';

@Service()
export class Scouts {
  private readonly httpClient = inject(HttpClient);

  readonly mine = httpResource<ScoutListResponse>(() => '/api/users/me/scouts');

  reload(): void {
    this.mine.reload();
  }

  async create(body: ScoutRequest): Promise<ScoutResponse> {
    const result = await firstValueFrom(
      this.httpClient.post<ScoutResponse>('/api/users/me/scouts', body),
    );
    this.reload();
    return result;
  }

  async remove(scoutId: string): Promise<void> {
    await firstValueFrom(this.httpClient.delete(`/api/users/me/scouts/${scoutId}`));
    this.reload();
  }
}
