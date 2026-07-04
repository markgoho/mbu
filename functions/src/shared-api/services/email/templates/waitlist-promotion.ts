import type { RenderedEmail } from "./types.js";

export interface WaitlistPromotionInput {
  badgeTitle: string;
}

export function renderWaitlistPromotion(
  input: WaitlistPromotionInput,
): RenderedEmail {
  const subject = `A seat opened up: ${input.badgeTitle}`;
  const text = `Good news — a seat opened up and your scout is now enrolled in the ${input.badgeTitle} merit badge class.`;
  const html = `<p>Good news — a seat opened up and your scout is now enrolled in the <strong>${input.badgeTitle}</strong> merit badge class.</p>`;
  return { subject, html, text };
}
