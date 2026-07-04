import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { render, screen } from '@testing-library/angular/zoneless';
import { describe, expect, it } from 'vitest';
import type { PublicUniversity } from '../api-types/universities-api.types';
import { PublicEvent } from './public-event';

@Component({
  template: '<router-outlet />',
  imports: [RouterOutlet],
})
class TestApp {}

const sampleEvent: PublicUniversity = {
  id: 'uni1',
  title: 'Spring MBU',
  timezone: 'America/New_York',
  startDate: '2026-06-01T12:00:00.000Z',
  endDate: null,
  registrationOpensAt: null,
  registrationClosesAt: '2026-05-25T23:59:59.000Z',
  location: {
    name: 'Scout Hall',
    address: '1 Main St',
    city: 'Anytown',
    state: 'NY',
    zip: '12345',
  },
  periods: [],
  classes: [
    {
      classId: 'cls1',
      badgeSlug: 'camping',
      badgeTitle: 'Camping',
      eagleRequired: true,
      periodIds: ['p1'],
      room: 'Room A',
      notes: null,
      capacity: 20,
      enrolledCount: 8,
      seatsRemaining: 12,
      waitlistCount: 0,
      counselors: [{ displayName: 'Alex Counselor' }],
    },
  ],
};

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('PublicEvent', () => {
  async function renderAt(path: string): Promise<HttpTestingController> {
    await render(TestApp, {
      providers: [
        provideRouter([{ path: 'e/:id', component: PublicEvent }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    await TestBed.inject(Router).navigateByUrl(path);
    await flushMicrotasks();
    return TestBed.inject(HttpTestingController);
  }

  it('renders seat counts and the register CTA for a published event', async () => {
    const httpMock = await renderAt('/e/uni1');

    httpMock
      .expectOne('/api/universities/uni1/public')
      .flush(sampleEvent);

    expect(await screen.findByText('Spring MBU')).toBeVisible();
    expect(await screen.findByText(/8 of 20 seats filled/)).toBeVisible();
    expect(await screen.findByText(/12 seats left/)).toBeVisible();

    const cta = await screen.findByText('Sign in to register');
    expect(cta).toBeVisible();
    expect(cta.getAttribute('href')).toContain('returnTo=%2Fe%2Funi1');
  });

  it('shows a not-found message for a 404 (missing or unpublished)', async () => {
    const httpMock = await renderAt('/e/missing');

    httpMock
      .expectOne('/api/universities/missing/public')
      .flush('not found', { status: 404, statusText: 'Not Found' });

    expect(await screen.findByText('Event not found')).toBeVisible();
    expect(
      await screen.findByText(/not available or has not been published yet/),
    ).toBeVisible();
  });

  it('shows a generic error for a non-404 failure instead of a blank page', async () => {
    const httpMock = await renderAt('/e/uni1');

    httpMock
      .expectOne('/api/universities/uni1/public')
      .flush('boom', { status: 500, statusText: 'Server Error' });

    expect(await screen.findByText('Something went wrong')).toBeVisible();
  });
});
