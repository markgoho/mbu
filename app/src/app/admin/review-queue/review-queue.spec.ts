import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular/zoneless';
import { describe, expect, it } from 'vitest';
import type { ReviewQueueRow } from '../../api-types/universities-api.types';
import { Universities } from '../../services/universities';
import { fakeResource } from '../../test-utils/fake-resource';
import { ReviewQueue } from './review-queue';

describe('ReviewQueue', () => {
  interface SetupOptions {
    rows?: ReviewQueueRow[];
  }

  const sampleRow: ReviewQueueRow = {
    id: 'uni1',
    title: 'Spring MBU',
    chancellorName: 'Alex Chancellor',
    chancellorEmail: 'alex@example.com',
    submittedAt: '2026-07-01T00:00:00.000Z',
    classCount: 2,
    startDate: '2026-06-01T12:00:00.000Z',
  };

  async function setup({ rows = [sampleRow] }: SetupOptions = {}) {
    await render(ReviewQueue, {
      providers: [
        provideRouter([]),
        {
          provide: Universities,
          useValue: {
            reviewQueue: fakeResource({ universities: rows }),
            openReviewQueue: () => {},
          },
        },
      ],
    });
  }

  it('renders a row per queued university', async () => {
    await setup();

    expect(await screen.findByText('Spring MBU')).toBeVisible();
    expect(screen.getByText(/Alex Chancellor/)).toBeVisible();
    expect(screen.getByRole('link', { name: /Spring MBU/ })).toHaveAttribute(
      'href',
      '/admin/review/uni1',
    );
  });

  it('shows an empty state when nothing is queued', async () => {
    await setup({ rows: [] });

    expect(await screen.findByText('Nothing is waiting for review.')).toBeVisible();
  });
});
