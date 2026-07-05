import { Component, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular/zoneless';
import { describe, expect, it } from 'vitest';
import type { HealthResponse } from '../api-types/health-api.types';
import { Health } from '../services/health';
import { Home } from './home';

@Component({
  imports: [Home],
  template: '<app-home />',
})
class TestHost {}

function fakeHealthService(value: HealthResponse | undefined, error: unknown): Health {
  return {
    health: { value: signal(value), error: signal(error) },
  } as unknown as Health;
}

describe('Home', () => {
  it('displays ok when the health resource resolves', async () => {
    await render(TestHost, {
      providers: [
        provideRouter([]),
        { provide: Health, useValue: fakeHealthService({ status: 'ok' }, undefined) },
      ],
    });

    expect(await screen.findByText('ok')).toBeVisible();
  });

  it('displays unavailable when the health resource errors', async () => {
    await render(TestHost, {
      providers: [
        provideRouter([]),
        {
          provide: Health,
          useValue: fakeHealthService(undefined, new Error('unreachable')),
        },
      ],
    });

    expect(await screen.findByText('unavailable')).toBeVisible();
  });
});
