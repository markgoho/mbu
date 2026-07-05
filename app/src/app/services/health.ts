import { httpResource } from '@angular/common/http';
import { Service } from '@angular/core';
import type { HealthResponse } from '../api-types/health-api.types';

@Service()
export class Health {
  readonly health = httpResource<HealthResponse>(() => '/api/health');
}
