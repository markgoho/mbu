import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import type { RosterResponse } from '#lib/api-types/registrations-api.types.js';
import type { BootstrapResponse } from '#lib/api-types/users-api.types.js';
import type { Fetcher } from '#lib/fetcher.js';
import Page from './+page.svelte';
import { sampleRoster } from './rosterFixture.js';

const { ackRosterExport } = vi.hoisted(() => ({
  ackRosterExport: vi.fn<(fetcher: Fetcher) => Promise<void>>(),
}));
vi.mock('#lib/session.svelte.js', () => ({ ackRosterExport }));

function buildSession(rosterExportAckAt: string | null): BootstrapResponse {
  return {
    user: {
      uid: 'u1',
      displayName: 'Casey Chancellor',
      email: 'casey@example.com',
      phone: null,
      acceptedTermsAt: '2026-01-01T00:00:00.000Z',
      acceptedPrivacyAt: '2026-01-01T00:00:00.000Z',
      acceptedPolicyVersion: '1',
      rosterExportAckAt,
    },
    needsConsent: false,
  };
}

interface SetupOptions {
  roster?: RosterResponse;
  /**
  The ISO time at which the user acknowledged the export warning, or `null` if they did not.
  */
  ackedAt?: string | null;
  /**
  The error that the acknowledgment request rejects with. The default is a request that succeeds.
  */
  ackError?: Error;
}

async function setup({ roster = sampleRoster, ackedAt = null, ackError }: SetupOptions = {}) {
  const printSpy = vi.spyOn(globalThis, 'print').mockImplementation(() => {});
  // A download is a click on a temporary link to an object URL of the CSV text.
  const downloads: { filename: string; csv: Promise<string> }[] = [];
  const blobs: Blob[] = [];
  const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    blobs.push(blob as Blob);
    return `blob:roster-${blobs.length - 1}`;
  });
  const linkClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    const blob = blobs[Number(this.href.split('-').at(-1))];
    downloads.push({ filename: this.download, csv: blob ? blob.text() : Promise.resolve('') });
  });
  onTestFinished(() => {
    printSpy.mockRestore();
    createObjectUrlSpy.mockRestore();
    linkClickSpy.mockRestore();
  });

  const { rerender } = await render(Page, { data: { session: buildSession(ackedAt), roster } });
  // The real function stores the acknowledgment and then loads the session again.
  ackRosterExport.mockReset();
  ackRosterExport.mockImplementation(async () => {
    if (ackError) throw ackError;
    await rerender({ data: { session: buildSession('2026-07-05T00:00:00.000Z'), roster } });
  });

  return {
    printSpy,
    downloads,
    warning: page.getByRole('alertdialog', { name: /Export contains youth information/ }),
    printButton: page.getByRole('button', { name: 'Print' }),
    exportEventButton: page.getByRole('button', { name: 'Export event CSV' }),
    exportClassButtons: page.getByRole('button', { name: 'Export CSV', exact: true }),
    acceptButton: page.getByRole('button', { name: 'I understand, continue' }),
    enrolledTables: page.getByRole('table', { name: 'Enrolled' }),
    waitlistedTables: page.getByRole('table', { name: 'Waitlisted' }),
  };
}

describe('roster page', () => {
  it("renders each class's enrolled and waitlisted tables, including an empty class", async () => {
    const { printButton, exportEventButton, exportClassButtons, enrolledTables, waitlistedTables } =
      await setup();

    await expect.element(page.getByRole('heading', { name: 'Spring MBU — Rosters' })).toBeVisible();
    await expect.element(page.getByRole('heading', { name: 'Camping' })).toBeVisible();
    await expect.element(page.getByText('Smith', { exact: true })).toBeVisible();
    await expect.element(page.getByText('Jones', { exact: true })).toBeVisible();
    await expect.element(page.getByRole('heading', { name: 'Archery' })).toBeVisible();
    await expect.element(page.getByText('No one enrolled.')).toBeVisible();
    await expect.element(printButton).toBeVisible();
    await expect.element(exportEventButton).toBeVisible();
    await expect.element(exportClassButtons).toHaveLength(2);
    await expect.element(enrolledTables).toHaveLength(2);
    // A class with no waitlist has no waitlist table.
    await expect.element(waitlistedTables).toHaveLength(1);
  });

  it('shows the details of each class and each scout', async () => {
    const { enrolledTables, waitlistedTables } = await setup();

    await expect
      .element(page.getByText('Period 1 · Room A · 1/10 enrolled · 1 waitlisted'))
      .toBeVisible();
    await expect.element(page.getByText('Period 2 · 0/5 enrolled')).toBeVisible();
    await expect.element(page.getByText('Counselors: Pat Counselor')).toBeVisible();
    await expect
      .element(enrolledTables.nth(0).getByRole('row').nth(1))
      .toHaveTextContent('Smith Alex Troop 1 — Jamie Smith (jamie@example.com) Yes');
    // The first cell of a waitlisted scout is the position in the waitlist.
    const waitlistedRow = waitlistedTables.getByRole('row').nth(1);
    await expect.element(waitlistedRow.getByRole('cell').nth(0)).toHaveTextContent(/^1$/);
    await expect
      .element(waitlistedRow)
      .toHaveTextContent('Jones Sam — Wheelchair access Robin Jones (robin@example.com) No');
    await expect
      .element(page.getByRole('link', { name: '← Back to dashboard' }))
      .toHaveAttribute('href', '/universities');
  });

  it('shows (purged) for a scout whose personal data was removed', async () => {
    const [camping] = sampleRoster.classRosters;
    const purged = {
      scoutId: 'scout1',
      scoutFirstName: null,
      scoutLastName: null,
      scoutUnit: null,
      accommodations: null,
      parentName: null,
      parentEmail: null,
      consentReceived: true,
      status: 'enrolled' as const,
    };
    const { enrolledTables } = await setup({
      roster: {
        ...sampleRoster,
        classRosters: [{ class: camping!.class, enrolled: [purged], waitlisted: [] }],
      },
    });

    await expect
      .element(enrolledTables.getByRole('row').nth(1))
      .toHaveTextContent('(purged) (purged) — — (purged) Yes');
  });

  it('shows a message when the event has no classes', async () => {
    await setup({ roster: { ...sampleRoster, classRosters: [] } });

    await expect.element(page.getByText('No classes in this event yet.')).toBeVisible();
  });

  it('shows the export-warning modal and acks it before the first export', async () => {
    const { printSpy, warning, printButton, acceptButton } = await setup();

    await printButton.click();

    await expect.element(warning).toBeVisible();
    await expect
      .element(warning)
      .toHaveTextContent(
        "You are responsible for safeguarding and deleting this data per Youth Protection guidelines once you're done with it.",
      );
    expect(printSpy).not.toHaveBeenCalled();

    await acceptButton.click();

    await expect.element(page.getByRole('alertdialog')).not.toBeInTheDocument();
    await expect.poll(() => printSpy).toHaveBeenCalledOnce();
    expect(ackRosterExport).toHaveBeenCalledExactlyOnceWith(expect.any(Function));
  });

  it('skips the modal on subsequent exports once already acked', async () => {
    const { printSpy, printButton } = await setup({ ackedAt: '2026-07-01T00:00:00.000Z' });

    await printButton.click();

    expect(printSpy).toHaveBeenCalledOnce();
    await expect.element(page.getByRole('alertdialog')).not.toBeInTheDocument();
    expect(ackRosterExport).not.toHaveBeenCalled();
  });

  it('skips the modal for the second export after the user acked the first', async () => {
    const { printSpy, printButton, acceptButton } = await setup();
    await printButton.click();
    await acceptButton.click();
    await expect.poll(() => printSpy).toHaveBeenCalledOnce();

    await printButton.click();

    expect(printSpy).toHaveBeenCalledTimes(2);
    await expect.element(page.getByRole('alertdialog')).not.toBeInTheDocument();
    expect(ackRosterExport).toHaveBeenCalledOnce();
  });

  it('dismisses the modal without exporting when cancelled', async () => {
    const { printSpy, warning, printButton } = await setup();
    await printButton.click();
    await expect.element(warning).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect.element(page.getByRole('alertdialog')).not.toBeInTheDocument();
    expect(printSpy).not.toHaveBeenCalled();
    expect(ackRosterExport).not.toHaveBeenCalled();
  });

  it('does not export when the acknowledgment cannot be stored', async () => {
    const { printSpy, printButton, acceptButton } = await setup({
      ackError: new TypeError('offline'),
    });
    await printButton.click();

    await acceptButton.click();

    await expect.poll(() => ackRosterExport).toHaveBeenCalledOnce();
    await expect.element(page.getByRole('alertdialog')).not.toBeInTheDocument();
    expect(printSpy).not.toHaveBeenCalled();
  });

  it('downloads the CSV of all classes of the event', async () => {
    const { downloads, exportEventButton } = await setup({ ackedAt: '2026-07-01T00:00:00.000Z' });

    await exportEventButton.click();

    expect(downloads).toHaveLength(1);
    expect(downloads[0]?.filename).toBe('Spring MBU - roster.csv');
    await expect(downloads[0]?.csv).resolves.toBe(
      [
        'Badge,Period(s),Room,Present,Last Name,First Name,Unit,Status,Waitlist Position,Accommodations,Parent Name,Parent Email,Consent',
        'Camping,Period 1,Room A,,Smith,Alex,Troop 1,enrolled,,,Jamie Smith,jamie@example.com,Yes',
        'Camping,Period 1,Room A,,Jones,Sam,,waitlisted,1,Wheelchair access,Robin Jones,robin@example.com,No',
      ].join('\r\n'),
    );
  });

  it('downloads the CSV of one class after the user acks the warning', async () => {
    const { downloads, warning, exportClassButtons, acceptButton } = await setup();

    await exportClassButtons.nth(0).click();

    await expect.element(warning).toBeVisible();
    expect(downloads).toHaveLength(0);

    await acceptButton.click();

    await expect.poll(() => downloads).toHaveLength(1);
    expect(downloads[0]?.filename).toBe('Camping - roster.csv');
    await expect(downloads[0]?.csv).resolves.toBe(
      [
        'Present,Last Name,First Name,Unit,Status,Waitlist Position,Accommodations,Parent Name,Parent Email,Consent',
        ',Smith,Alex,Troop 1,enrolled,,,Jamie Smith,jamie@example.com,Yes',
        ',Jones,Sam,,waitlisted,1,Wheelchair access,Robin Jones,robin@example.com,No',
      ].join('\r\n'),
    );
  });
});
