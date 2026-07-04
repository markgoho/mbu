import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { render, screen } from '@testing-library/angular/zoneless';
import { describe, expect, it } from 'vitest';
import type { RosterResponse } from '../../api-types/registrations-api.types';
import { Universities } from '../../services/universities';
import { RosterPage } from './roster-page';

@Component({
  template: '<router-outlet />',
  imports: [RouterOutlet],
})
class TestApp {}

/** Stub for the redirect target — renders the flash message so tests assert on what the user sees. */
@Component({
  template: '<p>Dashboard{{ universities.flashMessage() ? ": " + universities.flashMessage() : "" }}</p>',
})
class DashboardStub {
  protected readonly universities = inject(Universities);
}

const sampleRoster: RosterResponse = {
  university: {
    title: 'Spring MBU',
    startDate: '2026-06-01T12:00:00.000Z',
    endDate: null,
    location: { name: 'Scout Hall', address: '1 Main St', city: 'Anytown', state: 'NY', zip: '12345' },
    timezone: 'America/New_York',
  },
  classRosters: [
    {
      class: {
        classId: 'cls1',
        badgeTitle: 'Camping',
        periodLabels: ['Period 1'],
        room: 'Room A',
        capacity: 10,
        enrolledCount: 1,
        waitlistCount: 1,
        counselorNames: ['Pat Counselor'],
      },
      enrolled: [
        {
          scoutId: 'scout1',
          scoutFirstName: 'Alex',
          scoutLastName: 'Smith',
          scoutUnit: 'Troop 1',
          accommodations: null,
          parentName: 'Jamie Smith',
          parentEmail: 'jamie@example.com',
          consentReceived: true,
          status: 'enrolled',
        },
      ],
      waitlisted: [
        {
          scoutId: 'scout2',
          scoutFirstName: 'Sam',
          scoutLastName: 'Jones',
          scoutUnit: null,
          accommodations: 'Wheelchair access',
          parentName: 'Robin Jones',
          parentEmail: 'robin@example.com',
          consentReceived: false,
          status: 'waitlisted',
        },
      ],
    },
    {
      class: {
        classId: 'cls2',
        badgeTitle: 'Archery',
        periodLabels: ['Period 2'],
        room: null,
        capacity: 5,
        enrolledCount: 0,
        waitlistCount: 0,
        counselorNames: [],
      },
      enrolled: [],
      waitlisted: [],
    },
  ],
};

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('RosterPage', () => {
  async function renderAt(path: string): Promise<HttpTestingController> {
    await render(TestApp, {
      providers: [
        provideRouter([
          { path: 'universities/:id/roster', component: RosterPage },
          { path: 'universities', component: DashboardStub },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    await TestBed.inject(Router).navigateByUrl(path);
    await flushMicrotasks();
    return TestBed.inject(HttpTestingController);
  }

  it("renders each class's enrolled and waitlisted tables, including an empty class", async () => {
    const httpMock = await renderAt('/universities/uni1/roster');

    httpMock.expectOne('/api/registrations/uni1/roster').flush(sampleRoster);

    expect(await screen.findByText('Spring MBU — Rosters')).toBeVisible();
    expect(await screen.findByRole('heading', { name: 'Camping' })).toBeVisible();
    expect(screen.getByText('Smith')).toBeVisible();
    expect(screen.getByText('Jones')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Archery' })).toBeVisible();
    expect(screen.getByText('No one enrolled.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Print' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Export event CSV' })).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'Export CSV' })).toHaveLength(2);
  });

  it('redirects to the dashboard with a flash message on 403', async () => {
    const httpMock = await renderAt('/universities/uni1/roster');

    httpMock
      .expectOne('/api/registrations/uni1/roster')
      .flush('forbidden', { status: 403, statusText: 'Forbidden' });
    await flushMicrotasks();

    expect(await screen.findByText('Dashboard: You do not have access to those rosters.')).toBeVisible();
  });
});
