import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import type {
  RegisterRequest,
  RegistrationResponse,
  RegistrationStatus,
} from '#lib/api-types/registrations-api.types.js';
import type {
  BootstrapResponse,
  ScoutRequest,
  ScoutResponse,
} from '#lib/api-types/users-api.types.js';
import { ApiError } from '#lib/api.js';
import type { Fetcher } from '#lib/fetcher.js';
import { IdempotencyKeys } from '#lib/idempotency.js';
import Page from './+page.svelte';
import { alexSmith, baileyJones, registrationFor, sampleEvent } from './registerFixture.js';
import { signedIn } from '../../../../identityFixture.js';

const { registerScout, cancelRegistration, createScout, refreshAll } = vi.hoisted(() => ({
  registerScout:
    vi.fn<
      (
        fetcher: Fetcher,
        universityId: string,
        classId: string,
        body: RegisterRequest,
        keys: IdempotencyKeys,
      ) => Promise<RegistrationResponse>
    >(),
  cancelRegistration:
    vi.fn<
      (fetcher: Fetcher, universityId: string, classId: string, scoutId: string) => Promise<void>
    >(),
  createScout:
    vi.fn<
      (fetcher: Fetcher, body: ScoutRequest, keys: IdempotencyKeys) => Promise<ScoutResponse>
    >(),
  refreshAll: vi.fn<() => Promise<void>>(),
}));
vi.mock('#lib/registrations.js', () => ({ registerScout, cancelRegistration }));
vi.mock('#lib/scouts.js', () => ({ createScout }));
vi.mock('$app/navigation', () => ({ refreshAll, goto: vi.fn() }));

const session: BootstrapResponse = {
  user: {
    uid: 'u1',
    displayName: 'Test Parent',
    email: 'parent@example.com',
    phone: null,
    acceptedTermsAt: '2026-01-01T00:00:00.000Z',
    acceptedPrivacyAt: '2026-01-01T00:00:00.000Z',
    acceptedPolicyVersion: '1',
    rosterExportAckAt: null,
  },
  needsConsent: false,
};

/**
How the API answers the registration that the user starts.
*/
type RegisterOutcome = 'enrolled' | 'waitlisted' | 'full-then-waitlist' | 'api-error' | 'no-answer';

interface SetupOptions {
  scouts?: ScoutResponse[];
  registrations?: RegistrationResponse[];
  registerOutcome?: RegisterOutcome;
  /**
  The answer of the user to the confirm question of a drop.
  */
  isConfirmed?: boolean;
  /**
  The error that the cancellation of a registration rejects with.
  */
  cancelError?: Error;
  /**
  The error that the add of a scout rejects with.
  */
  createScoutError?: Error;
}

async function setup({
  scouts = [alexSmith],
  registrations = [],
  registerOutcome = 'enrolled',
  isConfirmed = true,
  cancelError,
  createScoutError,
}: SetupOptions = {}) {
  const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(isConfirmed);
  onTestFinished(() => confirmSpy.mockRestore());

  // The fake API: the data that the `load` reads, and that a write changes.
  let storedEvent = sampleEvent;
  let storedScouts = scouts;
  let storedRegistrations = registrations;
  const changeSeats = (classId: string, status: RegistrationStatus, change: 1 | -1) => {
    storedEvent = {
      ...storedEvent,
      classes: storedEvent.classes.map((publicClass) => {
        if (publicClass.classId !== classId) return publicClass;
        return status === 'enrolled'
          ? {
              ...publicClass,
              enrolledCount: publicClass.enrolledCount + change,
              seatsRemaining: publicClass.seatsRemaining - change,
            }
          : { ...publicClass, waitlistCount: publicClass.waitlistCount + change };
      }),
    };
  };

  registerScout.mockReset();
  registerScout.mockImplementation(async (_fetcher, _universityId, classId, body) => {
    if (registerOutcome === 'api-error') {
      throw new ApiError(403, { code: 'REGISTRATION_CLOSED', message: 'Registration is closed' });
    }
    if (registerOutcome === 'no-answer') throw new TypeError('Failed to fetch');
    const isFirstCall = registerScout.mock.calls.length === 1;
    if (registerOutcome === 'full-then-waitlist' && isFirstCall && !body.acceptWaitlist) {
      throw new ApiError(409, { code: 'CLASS_FULL', message: 'Class is full' });
    }
    const status: RegistrationStatus = registerOutcome === 'enrolled' ? 'enrolled' : 'waitlisted';
    const registration = registrationFor(classId, status, body.scoutId);
    storedRegistrations = [...storedRegistrations, registration];
    changeSeats(classId, status, 1);
    return registration;
  });
  cancelRegistration.mockReset();
  cancelRegistration.mockImplementation(async (_fetcher, _universityId, classId, scoutId) => {
    if (cancelError) throw cancelError;
    const isCancelled = (registration: RegistrationResponse) =>
      registration.classId === classId && registration.scoutId === scoutId;
    const cancelled = storedRegistrations.find((registration) => isCancelled(registration));
    storedRegistrations = storedRegistrations.filter((registration) => !isCancelled(registration));
    if (cancelled) changeSeats(classId, cancelled.status, -1);
  });
  createScout.mockReset();
  createScout.mockImplementation(async (_fetcher, body) => {
    if (createScoutError) throw createScoutError;
    const created = { ...alexSmith, ...body, scoutId: `scout-new${storedScouts.length}` };
    storedScouts = [...storedScouts, created];
    return created;
  });

  const toData = () => ({
    ...signedIn,
    session,
    event: storedEvent,
    scouts: storedScouts,
    registrations: storedRegistrations,
  });
  const { rerender } = await render(Page, { data: toData() });
  // `refreshAll()` runs the `load` again, which gives the page new `data`.
  refreshAll.mockReset();
  refreshAll.mockImplementation(() => rerender({ data: toData() }));

  /**
  The card of a class. The heading finds it: the text of a conflict in a different card also has the title.
  */
  const classCard = (badgeTitle: string) =>
    page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: badgeTitle }) });
  const classButton = (badgeTitle: string, name: string) =>
    classCard(badgeTitle).getByRole('button', { name });

  return {
    confirmSpy,
    classCard,
    classButton,
    consent: page.getByRole('checkbox'),
    scoutButton: (name: string) =>
      page.getByRole('region', { name: 'Select a scout' }).getByRole('button', { name }),
    scoutFilter: page.getByLabelText('Filter scouts'),
    addAnotherScoutButton: page.getByRole('button', { name: 'Add another scout' }),
    /**
    Fills the quick-add form and submits it.
    */
    async addScout(firstName: string, lastName: string) {
      await page.getByLabelText('First name').fill(firstName);
      await page.getByLabelText('Last name').fill(lastName);
      await page.getByRole('button', { name: 'Add scout' }).click();
    },
  };
}

describe('registration page', () => {
  it('shows the event, the scout picker, and starting progress', async () => {
    const { scoutButton } = await setup();

    await expect
      .element(page.getByRole('heading', { name: 'Register for Spring MBU' }))
      .toBeVisible();
    await expect.element(page.getByText('Jun 1, 2026')).toBeVisible();
    await expect.element(scoutButton('Alex Smith')).toBeVisible();
    await expect.element(page.getByText('0/2 periods scheduled')).toBeVisible();
  });

  it('shows the classes of each period, with the times of the period and the seats', async () => {
    const { classCard } = await setup();

    await expect
      .element(page.getByRole('heading', { name: 'Period 1 · 9:00 AM – 10:00 AM' }))
      .toBeVisible();
    await expect
      .element(page.getByRole('heading', { name: 'Period 2 · 10:00 AM – 11:00 AM' }))
      .toBeVisible();
    await expect
      .element(classCard('Archery'))
      .toHaveTextContent(/2 of 10 seats filled · 8 seats left/);
  });

  it("blocks a class that shares a period with the scout's enrolled class", async () => {
    const { classCard, classButton } = await setup({
      registrations: [registrationFor('archery', 'enrolled')],
    });

    // Camping (p1) collides with the enrolled Archery (p1).
    await expect
      .element(classCard('Camping').getByText('Conflicts with Archery in this period.'))
      .toBeVisible();
    // Camping is full, so its action is the waitlist.
    const blockedButton = classButton('Camping', 'Join waitlist');
    await expect.element(blockedButton).toBeDisabled();
    await expect
      .element(blockedButton)
      .toHaveAttribute('title', 'Resolve the period conflict first');
  });

  it("blocks a class that shares a period with the scout's waitlisted class (the waitlist holds the slot)", async () => {
    const { classCard } = await setup({
      registrations: [registrationFor('archery', 'waitlisted')],
    });

    await expect.element(classCard('Archery').getByText('On waitlist')).toBeVisible();
    await expect.element(classCard('Camping').getByText(/Conflicts with Archery/)).toBeVisible();
  });

  it('keeps a blocked class disabled after the consent', async () => {
    const { classButton, consent } = await setup({
      registrations: [registrationFor('archery', 'enrolled')],
    });

    await consent.click();

    await expect.element(classButton('Hiking', 'Register')).toBeEnabled();
    await expect.element(classButton('Camping', 'Join waitlist')).toBeDisabled();
  });

  it("counts a waitlisted class toward the scout's scheduled periods", async () => {
    await setup({ registrations: [registrationFor('archery', 'waitlisted')] });

    await expect.element(page.getByText('1/2 periods scheduled')).toBeVisible();
  });

  it('marks the class as registered after the scout registers', async () => {
    const { classCard, classButton, consent } = await setup({ registerOutcome: 'enrolled' });

    await consent.click();
    await classButton('Archery', 'Register').click();

    await expect.element(classCard('Archery').getByText('Registered')).toBeVisible();
    await expect.element(classButton('Archery', 'Drop')).toBeVisible();
    expect(registerScout).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
      'uni1',
      'archery',
      {
        scoutId: 'scout1',
        acceptWaitlist: false,
        acceptConsent: true,
      },
      expect.any(IdempotencyKeys),
    );
  });

  it('shows the current seats and progress after a registration', async () => {
    const { classCard, classButton, consent } = await setup();

    await consent.click();
    await classButton('Archery', 'Register').click();

    await expect
      .element(classCard('Archery'))
      .toHaveTextContent(/3 of 10 seats filled · 7 seats left/);
    await expect.element(page.getByText('1/2 periods scheduled')).toBeVisible();
    // Camping is in the period of Archery, so it is blocked now.
    await expect.element(classCard('Camping').getByText(/Conflicts with Archery/)).toBeVisible();
  });

  it('offers the waitlist when a class turns out to be full, then shows the scout as waitlisted', async () => {
    const { classCard, classButton, consent } = await setup({
      registerOutcome: 'full-then-waitlist',
    });

    await consent.click();
    await classButton('Archery', 'Register').click();

    await expect
      .element(classCard('Archery').getByText('This class is full. Join the waitlist instead?'))
      .toBeVisible();
    await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
    await classButton('Archery', 'Join waitlist').click();

    await expect.element(classCard('Archery').getByText('On waitlist')).toBeVisible();
    expect(registerScout).toHaveBeenLastCalledWith(
      expect.any(Function),
      'uni1',
      'archery',
      {
        scoutId: 'scout1',
        acceptWaitlist: true,
        acceptConsent: true,
      },
      expect.any(IdempotencyKeys),
    );
  });

  it('does not join the waitlist when the scout declines the offer', async () => {
    const { classCard, classButton, consent } = await setup({
      registerOutcome: 'full-then-waitlist',
    });
    await consent.click();
    await classButton('Archery', 'Register').click();

    await classButton('Archery', 'Cancel').click();

    await expect.element(classButton('Archery', 'Register')).toBeEnabled();
    await expect
      .element(classCard('Archery').getByText(/This class is full/))
      .not.toBeInTheDocument();
    expect(registerScout).toHaveBeenCalledOnce();
  });

  it('joins the waitlist directly for a class that shows no seats', async () => {
    const { classCard, classButton, consent } = await setup({ registerOutcome: 'waitlisted' });

    await consent.click();
    await classButton('Camping', 'Join waitlist').click();

    await expect.element(classCard('Camping').getByText('On waitlist')).toBeVisible();
    expect(registerScout).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
      'uni1',
      'camping',
      {
        scoutId: 'scout1',
        acceptWaitlist: true,
        acceptConsent: true,
      },
      expect.any(IdempotencyKeys),
    );
  });

  it('shows the message of the API when a registration fails', async () => {
    const { classButton, consent } = await setup({ registerOutcome: 'api-error' });

    await consent.click();
    await classButton('Archery', 'Register').click();

    await expect.element(page.getByRole('alert')).toHaveTextContent('Registration is closed');
    await expect.element(classButton('Archery', 'Register')).toBeEnabled();
  });

  it('shows a fixed message when a registration fails with no message of the API', async () => {
    const { classButton, consent } = await setup({ registerOutcome: 'no-answer' });

    await consent.click();
    await classButton('Archery', 'Register').click();

    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent('Could not register for this class.');
  });

  it('does not show the answer for a scout to the scout that the user selects during the request', async () => {
    const { classCard, classButton, consent, scoutButton } = await setup({
      scouts: [alexSmith, baileyJones],
    });
    const pendingRegistration = Promise.withResolvers<RegistrationResponse>();
    registerScout.mockImplementationOnce(() => pendingRegistration.promise);
    await consent.click();
    await classButton('Archery', 'Register').click();

    await scoutButton('Bailey Jones').click();
    pendingRegistration.reject(new ApiError(409, { code: 'CLASS_FULL', message: 'Class is full' }));

    // The button is enabled again when the request is complete.
    await consent.click();
    await expect.element(classButton('Archery', 'Register')).toBeEnabled();
    await expect
      .element(classCard('Archery').getByText(/This class is full/))
      .not.toBeInTheDocument();
    await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
  });

  it('gates Register on consent but keeps Drop available', async () => {
    const { classButton, consent } = await setup({
      registrations: [registrationFor('archery', 'enrolled')],
    });

    // Dropping withdraws data, so it never requires a fresh share-consent.
    await expect.element(classButton('Archery', 'Drop')).toBeEnabled();
    await expect.element(classButton('Hiking', 'Register')).toBeDisabled();

    await consent.click();

    await expect.element(classButton('Hiking', 'Register')).toBeEnabled();
  });

  it('requires fresh consent after switching to another scout', async () => {
    const { classButton, consent, scoutButton } = await setup({ scouts: [alexSmith, baileyJones] });

    // Consent for the first (default-selected) scout enables Register.
    await consent.click();
    await expect.element(classButton('Hiking', 'Register')).toBeEnabled();

    // Switching scouts clears consent — the box unchecks and Register re-disables.
    await scoutButton('Bailey Jones').click();

    await expect.element(consent).not.toBeChecked();
    await expect.element(classButton('Hiking', 'Register')).toBeDisabled();
  });

  it('keeps the consent when the user selects the same scout again', async () => {
    const { consent, scoutButton } = await setup({ scouts: [alexSmith, baileyJones] });
    await consent.click();

    await scoutButton('Alex Smith').click();

    await expect.element(consent).toBeChecked();
  });

  it('shows a single consent checkbox for the whole event', async () => {
    await setup();

    await expect.element(page.getByRole('checkbox')).toHaveLength(1);
    await expect
      .element(
        page.getByLabelText(
          "I consent to share Alex Smith's information with the organizers of Spring MBU.",
        ),
      )
      .not.toBeChecked();
  });

  it("shows each scout's own schedule when the user switches scouts", async () => {
    const { classCard, classButton, scoutButton } = await setup({
      scouts: [alexSmith, baileyJones],
      registrations: [
        registrationFor('archery', 'enrolled'),
        registrationFor('camping', 'waitlisted', baileyJones.scoutId),
        registrationFor('hiking', 'enrolled', baileyJones.scoutId),
      ],
    });

    // The first scout of the list is selected at the start.
    await expect.element(scoutButton('Alex Smith')).toHaveAttribute('aria-pressed', 'true');
    await expect.element(classButton('Archery', 'Drop')).toBeVisible();
    await expect.element(classCard('Camping').getByText(/Conflicts with Archery/)).toBeVisible();
    await expect.element(page.getByText('1/2 periods scheduled')).toBeVisible();

    await scoutButton('Bailey Jones').click();

    await expect.element(scoutButton('Bailey Jones')).toHaveAttribute('aria-pressed', 'true');
    await expect.element(scoutButton('Alex Smith')).toHaveAttribute('aria-pressed', 'false');
    await expect.element(classCard('Camping').getByText('On waitlist')).toBeVisible();
    await expect.element(classCard('Archery').getByText(/Conflicts with Camping/)).toBeVisible();
    await expect.element(classCard('Hiking').getByText('Registered')).toBeVisible();
    await expect.element(page.getByText('2/2 periods scheduled')).toBeVisible();
    await expect
      .element(
        page.getByLabelText(
          "I consent to share Bailey Jones's information with the organizers of Spring MBU.",
        ),
      )
      .toBeVisible();
  });

  it('registers the selected scout', async () => {
    const { classButton, consent, scoutButton } = await setup({ scouts: [alexSmith, baileyJones] });

    await scoutButton('Bailey Jones').click();
    await consent.click();
    await classButton('Hiking', 'Register').click();

    await expect.element(classButton('Hiking', 'Drop')).toBeVisible();
    expect(registerScout).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
      'uni1',
      'hiking',
      expect.objectContaining({ scoutId: 'scout2' }),
      expect.any(IdempotencyKeys),
    );
  });

  it('filters the scouts by name', async () => {
    const { scoutButton, scoutFilter } = await setup({ scouts: [alexSmith, baileyJones] });

    await scoutFilter.fill(' JONES ');

    await expect.element(scoutButton('Bailey Jones')).toBeVisible();
    await expect.element(scoutButton('Alex Smith')).not.toBeInTheDocument();
  });

  it('drops a class after the user confirms, with no consent', async () => {
    const { confirmSpy, classCard, classButton } = await setup({
      registrations: [registrationFor('archery', 'enrolled')],
    });

    await classButton('Archery', 'Drop').click();

    // The consent is not given, so the button is there but it is disabled.
    await expect.element(classButton('Archery', 'Register')).toBeDisabled();
    await expect.element(classCard('Archery').getByText('Registered')).not.toBeInTheDocument();
    await expect.element(page.getByText('0/2 periods scheduled')).toBeVisible();
    expect(confirmSpy).toHaveBeenCalledExactlyOnceWith('Drop Archery?');
    expect(cancelRegistration).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
      'uni1',
      'archery',
      'scout1',
    );
  });

  it('does not drop a class when the user declines', async () => {
    const { classButton } = await setup({
      registrations: [registrationFor('archery', 'enrolled')],
      isConfirmed: false,
    });

    await classButton('Archery', 'Drop').click();

    await expect.element(classButton('Archery', 'Drop')).toBeEnabled();
    expect(cancelRegistration).not.toHaveBeenCalled();
  });

  it('shows a fixed message when a drop fails', async () => {
    const { classButton } = await setup({
      registrations: [registrationFor('archery', 'enrolled')],
      cancelError: new ApiError(500, { code: 'INTERNAL', message: 'Internal error' }),
    });

    await classButton('Archery', 'Drop').click();

    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent('Could not drop this class. Please try again.');
    await expect.element(classButton('Archery', 'Drop')).toBeEnabled();
  });

  it('prompts the caller to add a scout when they have none', async () => {
    await setup({ scouts: [] });

    await expect
      .element(page.getByRole('heading', { name: 'Add a scout to get started' }))
      .toBeVisible();
    await expect
      .element(page.getByText("You don't have any scouts yet. Add one to build a schedule."))
      .toBeVisible();
    await expect.element(page.getByRole('checkbox')).not.toBeInTheDocument();
  });

  it('adds the first scout, selects it and shows the schedule builder', async () => {
    const { addScout, scoutButton } = await setup({ scouts: [] });

    await addScout('Casey', 'Lee');

    await expect.element(scoutButton('Casey Lee')).toHaveAttribute('aria-pressed', 'true');
    await expect.element(page.getByText('0/2 periods scheduled')).toBeVisible();
    expect(createScout).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
      {
        firstName: 'Casey',
        lastName: 'Lee',
      },
      expect.any(IdempotencyKeys),
    );
  });

  it('adds another scout, selects it and asks for a fresh consent', async () => {
    const { addScout, addAnotherScoutButton, consent, scoutButton } = await setup();
    await consent.click();

    await addAnotherScoutButton.click();
    await addScout('Casey', 'Lee');

    await expect.element(scoutButton('Casey Lee')).toHaveAttribute('aria-pressed', 'true');
    await expect.element(scoutButton('Alex Smith')).toHaveAttribute('aria-pressed', 'false');
    await expect.element(consent).not.toBeChecked();
    // The form closes after the add.
    await expect.element(addAnotherScoutButton).toBeVisible();
    await expect.element(page.getByLabelText('First name')).not.toBeInTheDocument();
  });

  it('shows a fixed message and keeps the form when the add of a scout fails', async () => {
    const { addScout, addAnotherScoutButton } = await setup({
      createScoutError: new ApiError(500, { code: 'INTERNAL', message: 'Internal error' }),
    });

    await addAnotherScoutButton.click();
    await addScout('Casey', 'Lee');

    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent('Could not add this scout. Please try again.');
    await expect.element(page.getByLabelText('First name')).toHaveValue('Casey');
  });
});
