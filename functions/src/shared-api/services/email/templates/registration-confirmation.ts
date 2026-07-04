import type { RenderedEmail } from "./types.js";

export interface RegistrationConfirmationInput {
  badgeTitle: string;
}

export function renderRegistrationConfirmation(
  input: RegistrationConfirmationInput,
): RenderedEmail {
  const subject = `You're enrolled: ${input.badgeTitle}`;
  const text = `Your scout is enrolled in the ${input.badgeTitle} merit badge class. See you there!`;
  const html = `<p>Your scout is enrolled in the <strong>${input.badgeTitle}</strong> merit badge class. See you there!</p>`;
  return { subject, html, text };
}

export function renderWaitlistConfirmation(
  input: RegistrationConfirmationInput,
): RenderedEmail {
  const subject = `You're on the waitlist: ${input.badgeTitle}`;
  const text = `Your scout is on the waitlist for the ${input.badgeTitle} merit badge class. We'll email you if a seat opens up.`;
  const html = `<p>Your scout is on the waitlist for the <strong>${input.badgeTitle}</strong> merit badge class. We'll email you if a seat opens up.</p>`;
  return { subject, html, text };
}
