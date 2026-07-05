import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Universities } from '../../services/universities';
import { fakeResource } from '../../test-utils/fake-resource';
import { ReviewDetail } from './review-detail';

@Component({ template: '<router-outlet />', imports: [RouterOutlet] })
class TestApp {}

@Component({ template: '<p>Queue</p>' })
class QueueStub {}

describe('ReviewDetail', () => {
  interface SetupOptions {
    status?: string;
    approveFails?: boolean;
    rejectFails?: boolean;
  }

  async function setup({
    status = 'submitted',
    approveFails = false,
    rejectFails = false,
  }: SetupOptions = {}) {
    const detail = fakeResource({
      university: {
        id: 'uni1',
        title: 'Spring MBU',
        status,
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
        createdByUid: 'u1',
        reviewNote: null,
        submittedAt: '2026-07-01T00:00:00.000Z',
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      },
      classes: [
        {
          classId: 'cls1',
          badgeSlug: 'camping',
          badgeTitle: 'Camping',
          eagleRequired: true,
          periodIds: [],
          capacity: 20,
          enrolledCount: 0,
          waitlistCount: 0,
          room: null,
          notes: null,
          counselors: [],
          createdAt: '2026-07-01T00:00:00.000Z',
          updatedAt: '2026-07-01T00:00:00.000Z',
        },
      ],
    });

    await render(TestApp, {
      providers: [
        provideRouter([
          { path: 'admin/review', component: QueueStub },
          { path: 'admin/review/:id', component: ReviewDetail },
        ]),
        {
          provide: Universities,
          useValue: {
            detail,
            openUniversity: vi.fn(),
            approveUniversity: vi.fn(() =>
              approveFails ? Promise.reject(new Error('fail')) : Promise.resolve(),
            ),
            rejectUniversity: vi.fn(() =>
              rejectFails ? Promise.reject(new Error('fail')) : Promise.resolve(),
            ),
            apiErrorMessage: (_error: unknown, fallback: string) => fallback,
          },
        },
      ],
    });
    await TestBed.inject(Router).navigateByUrl('/admin/review/uni1');
    await screen.findByText('Spring MBU');

    return { user: userEvent.setup() };
  }

  it('renders the event and its classes for a submitted event', async () => {
    await setup();

    expect(screen.getByText('submitted')).toBeVisible();
    expect(screen.getByText(/Camping/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeVisible();
  });

  it('approves and navigates back to the queue', async () => {
    const { user } = await setup();

    await user.click(screen.getByRole('button', { name: 'Approve' }));

    expect(await screen.findByText('Queue')).toBeVisible();
  });

  it('shows an error and stays on the page when approval fails', async () => {
    const { user } = await setup({ approveFails: true });

    await user.click(screen.getByRole('button', { name: 'Approve' }));

    expect(await screen.findByText('Could not approve this event.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeVisible();
  });

  it('rejects with a note and navigates back to the queue', async () => {
    const { user } = await setup();

    await user.click(screen.getByRole('button', { name: 'Reject' }));
    const textarea = await screen.findByLabelText('Reason for rejection');
    await user.type(textarea, 'Missing counselor disclaimers');
    await user.click(screen.getByRole('button', { name: 'Submit rejection' }));

    expect(await screen.findByText('Queue')).toBeVisible();
  });

  it('disables the rejection submit button until a note is entered', async () => {
    const { user } = await setup();

    await user.click(screen.getByRole('button', { name: 'Reject' }));

    expect(screen.getByRole('button', { name: 'Submit rejection' })).toBeDisabled();
  });
});
