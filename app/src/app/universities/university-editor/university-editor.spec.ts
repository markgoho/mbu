import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { render, screen } from '@testing-library/angular/zoneless';
import { describe, expect, it, vi } from 'vitest';
import type { UniversityStatus } from '../../api-types/universities-api.types';
import { Universities } from '../../services/universities';
import { fakeResource } from '../../test-utils/fake-resource';
import { UniversityEditor } from './university-editor';

@Component({ template: '<router-outlet />', imports: [RouterOutlet] })
class TestApp {}

describe('UniversityEditor', () => {
  interface SetupOptions {
    status?: UniversityStatus;
    reviewNote?: string | null;
  }

  async function setup({ status = 'draft', reviewNote = null }: SetupOptions = {}) {
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
        reviewNote,
        submittedAt: null,
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      },
      classes: [],
    });

    await render(TestApp, {
      providers: [
        provideRouter([{ path: 'universities/:id', component: UniversityEditor }]),
        {
          provide: Universities,
          useValue: {
            activeUniversityId: signal<string | undefined>(undefined),
            flashMessage: signal<string | null>(null),
            detail,
            openUniversity: vi.fn(),
            submitUniversity: vi.fn(() => Promise.resolve()),
            closeUniversity: vi.fn(() => Promise.resolve()),
            deleteUniversity: vi.fn(() => Promise.resolve()),
            apiErrorMessage: (_error: unknown, fallback: string) => fallback,
          },
        },
      ],
    });
    await TestBed.inject(Router).navigateByUrl('/universities/uni1');
    await screen.findByText(status);
  }

  it('shows the status badge and a submit button for a draft event', async () => {
    await setup({ status: 'draft' });

    expect(screen.getByRole('button', { name: 'Submit for review' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Close event' })).not.toBeInTheDocument();
  });

  it('shows a close button and no submit button for a published event', async () => {
    await setup({ status: 'published' });

    expect(screen.getByRole('button', { name: 'Close event' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Submit for review' })).not.toBeInTheDocument();
  });

  it('shows the rejection note banner and still allows resubmission', async () => {
    await setup({ status: 'rejected', reviewNote: 'Missing counselor disclaimers' });

    expect(screen.getByText('Rejected: Missing counselor disclaimers')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Submit for review' })).toBeVisible();
  });

  it('disables the details form and hides class/period actions once submitted', async () => {
    await setup({ status: 'submitted' });

    expect(screen.getByLabelText('Title')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save university' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add class' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add period' })).not.toBeInTheDocument();
  });
});
