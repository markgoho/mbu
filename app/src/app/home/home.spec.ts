import { Component, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular/zoneless';
import { describe, expect, it } from 'vitest';
import type { HealthResponse } from '../api-types/health-api.types';
import { HealthService } from '../services/health.service';
import { Home } from './home';

@Component({
  imports: [Home],
  template: '<app-home />',
})
class TestHost {}

function fakeHealthService(
  value: HealthResponse | undefined,
  error: unknown,
): HealthService {
  return {
    health: { value: signal(value), error: signal(error) },
  } as unknown as HealthService;
}

describe('Home', () => {
  it('displays ok when the health resource resolves', async () => {
    await render(TestHost, {
      providers: [
        provideRouter([]),
        { provide: HealthService, useValue: fakeHealthService({ status: 'ok' }, undefined) },
      ],
    });

    expect(await screen.findByText('ok')).toBeVisible();
  });

  it('displays unavailable when the health resource errors', async () => {
    await render(TestHost, {
      providers: [
        provideRouter([]),
        {
          provide: HealthService,
          useValue: fakeHealthService(undefined, new Error('unreachable')),
        },
      ],
    });

    expect(await screen.findByText('unavailable')).toBeVisible();
  });
});
