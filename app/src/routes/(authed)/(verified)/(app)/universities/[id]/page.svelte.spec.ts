import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import type {
  BadgeCatalogEntry,
  ClassCreateRequest,
  ClassPatchRequest,
  ClassResponse,
  Period,
  PeriodsPutRequest,
  UniversityDetailResponse,
  UniversityPatchRequest,
  UniversityStatus,
} from '#lib/api-types/universities-api.types.js';
import type { BootstrapResponse } from '#lib/api-types/users-api.types.js';
import { ApiError } from '#lib/api.js';
import type { Fetcher } from '#lib/fetcher.js';
import Page from './+page.svelte';

const universities = vi.hoisted(() => ({
  patchUniversity:
    vi.fn<(fetcher: Fetcher, id: string, body: UniversityPatchRequest) => Promise<void>>(),
  deleteUniversity: vi.fn<(fetcher: Fetcher, id: string) => Promise<void>>(),
  submitUniversity: vi.fn<(fetcher: Fetcher, id: string) => Promise<void>>(),
  closeUniversity: vi.fn<(fetcher: Fetcher, id: string) => Promise<void>>(),
  putPeriods: vi.fn<(fetcher: Fetcher, id: string, body: PeriodsPutRequest) => Promise<void>>(),
  createClass: vi.fn<(fetcher: Fetcher, id: string, body: ClassCreateRequest) => Promise<void>>(),
  patchClass:
    vi.fn<
      (fetcher: Fetcher, id: string, classId: string, body: ClassPatchRequest) => Promise<void>
    >(),
  deleteClass: vi.fn<(fetcher: Fetcher, id: string, classId: string) => Promise<void>>(),
}));
const { goto, refreshAll } = vi.hoisted(() => ({
  goto: vi.fn<(url: string) => Promise<void>>(),
  refreshAll: vi.fn<() => Promise<void>>(),
}));
vi.mock('#lib/universities.js', () => universities);
vi.mock('$app/navigation', () => ({ goto, refreshAll }));

const session: BootstrapResponse = {
  user: {
    uid: 'u1',
    displayName: 'Casey Chancellor',
    email: 'casey@example.com',
    phone: null,
    acceptedTermsAt: '2026-01-01T00:00:00.000Z',
    acceptedPrivacyAt: '2026-01-01T00:00:00.000Z',
    acceptedPolicyVersion: '1',
    rosterExportAckAt: null,
  },
  needsConsent: false,
};

const badges: BadgeCatalogEntry[] = [
  { slug: 'archery', title: 'Archery', eagleRequired: false },
  { slug: 'camping', title: 'Camping', eagleRequired: true },
];

const morning: Period = {
  periodId: 'p1',
  label: 'Morning',
  startsAt: '2026-06-01T12:00:00.000Z',
  endsAt: '2026-06-01T14:00:00.000Z',
};

const campingClass: ClassResponse = {
  classId: 'cls1',
  badgeSlug: 'camping',
  badgeTitle: 'Camping',
  eagleRequired: true,
  periodIds: ['p1'],
  capacity: 12,
  enrolledCount: 0,
  waitlistCount: 0,
  room: null,
  notes: null,
  counselors: [],
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

function buildDetail(
  status: UniversityStatus,
  reviewNote: string | null,
  periods: Period[],
  classes: ClassResponse[],
): UniversityDetailResponse {
  return {
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
      periods,
      createdByUid: 'u1',
      reviewNote,
      submittedAt: null,
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    },
    classes,
  };
}

interface SetupOptions {
  status?: UniversityStatus;
  reviewNote?: string | null;
  periods?: Period[];
  classes?: ClassResponse[];
  /**
  The answer of the user to a confirm question.
  */
  isConfirmed?: boolean;
  /**
  The error that each write to the API rejects with. The default is that the writes succeed.
  */
  writeError?: Error;
}

async function setup({
  status = 'draft',
  reviewNote = null,
  periods = [],
  classes = [],
  isConfirmed = true,
  writeError,
}: SetupOptions = {}) {
  const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(isConfirmed);
  onTestFinished(() => confirmSpy.mockRestore());

  // The fake API: the university that the `load` reads, and that a write changes.
  let stored = buildDetail(status, reviewNote, periods, classes);
  const write = (change: () => void) => async () => {
    if (writeError) throw writeError;
    change();
  };
  const setStatus = (next: UniversityStatus) =>
    write(() => {
      stored = { ...stored, university: { ...stored.university, status: next } };
    });
  for (const mock of Object.values(universities)) mock.mockReset();
  universities.submitUniversity.mockImplementation(setStatus('submitted'));
  universities.closeUniversity.mockImplementation(setStatus('closed'));
  universities.patchUniversity.mockImplementation((_fetcher, _id, body) =>
    write(() => {
      stored = { ...stored, university: { ...stored.university, ...body } };
    })(),
  );
  universities.putPeriods.mockImplementation((_fetcher, _id, body) =>
    write(() => {
      const stamped = body.periods.map((period, index) => ({
        ...period,
        periodId: period.periodId ?? `new${index}`,
      }));
      stored = { ...stored, university: { ...stored.university, periods: stamped } };
    })(),
  );
  universities.createClass.mockImplementation((_fetcher, _id, body) =>
    write(() => {
      const created = { ...campingClass, ...body, classId: 'cls-new', badgeTitle: 'Archery' };
      stored = { ...stored, classes: [...stored.classes, created] };
    })(),
  );
  universities.patchClass.mockImplementation((_fetcher, _id, classId, body) =>
    write(() => {
      stored = {
        ...stored,
        classes: stored.classes.map((classItem) =>
          classItem.classId === classId ? { ...classItem, ...body } : classItem,
        ),
      };
    })(),
  );
  universities.deleteClass.mockImplementation((_fetcher, _id, classId) =>
    write(() => {
      stored = {
        ...stored,
        classes: stored.classes.filter((classItem) => classItem.classId !== classId),
      };
    })(),
  );
  universities.deleteUniversity.mockImplementation(write(() => {}));

  const toData = () => ({
    session,
    university: stored.university,
    classes: stored.classes,
    badges,
  });
  const { rerender } = await render(Page, { data: toData() });
  // `refreshAll()` runs the `load` again, which gives the page new `data`.
  refreshAll.mockReset();
  refreshAll.mockImplementation(() => rerender({ data: toData() }));
  goto.mockReset();
  goto.mockResolvedValue();

  return {
    confirmSpy,
    statusBadge: (status: UniversityStatus) => page.getByText(status, { exact: true }),
    submitButton: page.getByRole('button', { name: 'Submit for review' }),
    closeButton: page.getByRole('button', { name: 'Close event' }),
    deleteDraftButton: page.getByRole('button', { name: 'Delete draft' }),
    // The classes are the only list of the page.
    classItems: page.getByRole('listitem'),
    // `exact`: the disclaimer text of the class form also contains "merit badge".
    badgeField: page.getByLabelText('Merit badge', { exact: true }),
  };
}

describe('university editor page', () => {
  it('shows the title, and the links to the dashboard and to the rosters', async () => {
    await setup();

    await expect.element(page.getByRole('heading', { name: 'Spring MBU' })).toBeVisible();
    await expect
      .element(page.getByRole('link', { name: '← Back to dashboard' }))
      .toHaveAttribute('href', '/universities');
    await expect
      .element(page.getByRole('link', { name: 'View rosters' }))
      .toHaveAttribute('href', '/universities/uni1/roster');
  });

  it('shows the status badge and a submit button for a draft event', async () => {
    const { statusBadge, submitButton, closeButton, deleteDraftButton } = await setup({
      status: 'draft',
    });

    await expect.element(statusBadge('draft')).toBeVisible();
    await expect.element(submitButton).toBeVisible();
    await expect.element(deleteDraftButton).toBeVisible();
    await expect.element(closeButton).not.toBeInTheDocument();
  });

  it('shows a close button and no submit button for a published event', async () => {
    const { statusBadge, submitButton, closeButton, deleteDraftButton } = await setup({
      status: 'published',
    });

    await expect.element(statusBadge('published')).toBeVisible();
    await expect.element(closeButton).toBeVisible();
    await expect.element(submitButton).not.toBeInTheDocument();
    await expect.element(deleteDraftButton).not.toBeInTheDocument();
  });

  it('shows the rejection note banner and still allows resubmission', async () => {
    const { submitButton } = await setup({
      status: 'rejected',
      reviewNote: 'Missing counselor disclaimers',
    });

    await expect
      .element(page.getByRole('status'))
      .toHaveTextContent('Rejected: Missing counselor disclaimers');
    await expect.element(submitButton).toBeVisible();
  });

  it('disables the details form and hides class/period actions once submitted', async () => {
    const { statusBadge } = await setup({
      status: 'submitted',
      periods: [morning],
      classes: [campingClass],
    });

    await expect.element(statusBadge('submitted')).toBeVisible();
    await expect.element(page.getByLabelText('Title')).toBeDisabled();
    await expect
      .element(page.getByRole('button', { name: 'Save university' }))
      .not.toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Add class' })).not.toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Add period' })).not.toBeInTheDocument();
    await expect.element(page.getByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('submits the university for review and then locks the editor', async () => {
    const { statusBadge, submitButton } = await setup();

    await submitButton.click();

    await expect.element(statusBadge('submitted')).toBeVisible();
    await expect.element(submitButton).not.toBeInTheDocument();
    await expect.element(page.getByLabelText('Title')).toBeDisabled();
    expect(universities.submitUniversity).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
      'uni1',
    );
  });

  it('shows the message of the API, with the classes of the problem, when the submit fails', async () => {
    const { statusBadge, submitButton } = await setup({
      writeError: new ApiError(409, {
        error: 'Classes have no periods',
        details: { classes: [{ classId: 'cls1', title: 'Camping' }] },
      }),
    });

    await submitButton.click();

    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent('Classes have no periods (Camping)');
    await expect.element(statusBadge('draft')).toBeVisible();
    await expect.element(submitButton).toBeEnabled();
  });

  it('shows a general message when the submit fails with no API message', async () => {
    const { submitButton } = await setup({ writeError: new TypeError('offline') });

    await submitButton.click();

    await expect.element(page.getByRole('alert')).toHaveTextContent('Could not submit for review.');
  });

  it('closes a published event after the user confirms', async () => {
    const { confirmSpy, statusBadge, closeButton } = await setup({ status: 'published' });

    await closeButton.click();

    await expect.element(statusBadge('closed')).toBeVisible();
    await expect.element(closeButton).not.toBeInTheDocument();
    expect(confirmSpy).toHaveBeenCalledExactlyOnceWith('Close this event? This cannot be undone.');
    expect(universities.closeUniversity).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
      'uni1',
    );
  });

  it('does not close the event when the user declines', async () => {
    const { closeButton } = await setup({ status: 'published', isConfirmed: false });

    await closeButton.click();

    expect(universities.closeUniversity).not.toHaveBeenCalled();
  });

  it('deletes a draft after the user confirms, and goes to the dashboard', async () => {
    const { confirmSpy, deleteDraftButton } = await setup();

    await deleteDraftButton.click();

    await expect.poll(() => goto).toHaveBeenCalledExactlyOnceWith('/universities');
    expect(confirmSpy).toHaveBeenCalledExactlyOnceWith(
      'Delete this draft university and all its classes?',
    );
    expect(universities.deleteUniversity).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
      'uni1',
    );
    // The `load` of the deleted university must not run again.
    expect(refreshAll).not.toHaveBeenCalled();
  });

  it('does not delete the draft when the user declines', async () => {
    const { deleteDraftButton } = await setup({ isConfirmed: false });

    await deleteDraftButton.click();

    expect(universities.deleteUniversity).not.toHaveBeenCalled();
    expect(goto).not.toHaveBeenCalled();
  });

  it('stays on the page and shows a message when the deletion fails', async () => {
    const { deleteDraftButton } = await setup({ writeError: new TypeError('offline') });

    await deleteDraftButton.click();

    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent('Could not delete this university.');
    expect(goto).not.toHaveBeenCalled();
  });

  it('saves the details and shows the stored university', async () => {
    await setup();
    await page.getByLabelText('Title').fill('Summer MBU');

    await page.getByRole('button', { name: 'Save university' }).click();

    await expect.element(page.getByRole('heading', { name: 'Summer MBU' })).toBeVisible();
    expect(universities.patchUniversity).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
      'uni1',
      {
        title: 'Summer MBU',
        timezone: 'America/New_York',
        startDate: '2026-06-01T12:00:00.000Z',
        endDate: null,
        registrationOpensAt: null,
        registrationClosesAt: '2026-05-25T23:59:00.000Z',
        location: {
          name: 'Scout Hall',
          address: '1 Main St',
          city: 'Anytown',
          state: 'NY',
          zip: '12345',
        },
      },
    );
  });

  it('shows the message of the API in the details form when the save fails', async () => {
    await setup({ writeError: new ApiError(400, { error: 'Title is already in use' }) });

    await page.getByRole('button', { name: 'Save university' }).click();

    await expect.element(page.getByRole('alert')).toHaveTextContent('Title is already in use');
    expect(refreshAll).not.toHaveBeenCalled();
  });

  it('saves the periods of the university', async () => {
    await setup();
    await page.getByLabelText('Label').fill('Morning');
    await page.getByLabelText('Starts').fill('2026-06-01T08:00');
    await page.getByLabelText('Ends').fill('2026-06-01T10:00');

    await page.getByRole('button', { name: 'Save periods' }).click();

    await expect.poll(() => refreshAll).toHaveBeenCalledOnce();
    expect(universities.putPeriods).toHaveBeenCalledExactlyOnceWith(expect.any(Function), 'uni1', {
      periods: [
        {
          label: 'Morning',
          startsAt: '2026-06-01T12:00:00.000Z',
          endsAt: '2026-06-01T14:00:00.000Z',
        },
      ],
    });
  });

  it('adds a class with the signed-in chancellor as its counselor', async () => {
    const { classItems, badgeField } = await setup({ periods: [morning] });
    await page.getByRole('button', { name: 'Add class' }).click();
    await expect.element(page.getByText('Name: Casey Chancellor')).toBeVisible();
    await badgeField.selectOptions('archery');
    await page.getByLabelText('Morning').click();
    await page.getByLabelText('BSA member ID').fill('12345');
    await page.getByLabelText(/credentials have not been verified/).click();

    await page.getByRole('button', { name: 'Add class' }).click();

    await expect.element(classItems).toHaveLength(1);
    await expect.element(classItems).toHaveTextContent('Archery · cap 20 · 1 period(s)');
    await expect.element(badgeField).not.toBeInTheDocument();
    expect(universities.createClass).toHaveBeenCalledExactlyOnceWith(expect.any(Function), 'uni1', {
      badgeSlug: 'archery',
      periodIds: ['p1'],
      capacity: 20,
      room: null,
      notes: null,
      counselor: { bsaId: '12345', acceptDisclaimer: true },
    });
  });

  it('changes a class', async () => {
    const { classItems } = await setup({ periods: [morning], classes: [campingClass] });
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabelText('Capacity').fill('30');

    await page.getByRole('button', { name: 'Update class' }).click();

    await expect.element(classItems).toHaveTextContent('Camping · cap 30 · 1 period(s)');
    expect(universities.patchClass).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
      'uni1',
      'cls1',
      { badgeSlug: 'camping', periodIds: ['p1'], capacity: 30, room: null, notes: null },
    );
  });

  it('deletes a class after the user confirms', async () => {
    const { confirmSpy, classItems } = await setup({
      periods: [morning],
      classes: [campingClass],
    });

    await page.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect.element(page.getByText('No classes yet.')).toBeVisible();
    await expect.element(classItems).toHaveLength(0);
    expect(confirmSpy).toHaveBeenCalledExactlyOnceWith('Delete Camping?');
    expect(universities.deleteClass).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
      'uni1',
      'cls1',
    );
  });
});
