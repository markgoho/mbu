import { describe, expect, it } from "bun:test";
import {
  renderRegistrationConfirmation,
  renderWaitlistConfirmation,
} from "./registration-confirmation.js";

describe("renderRegistrationConfirmation", () => {
  it("renders subject/html/text for the enrolled variant", () => {
    const email = renderRegistrationConfirmation({ badgeTitle: "Camping" });
    expect(email.subject).toContain("Camping");
    expect(email.subject).toContain("enrolled");
    expect(email.html).toContain("Camping");
    expect(email.text).toContain("Camping");
    expect(email.text).not.toContain("waitlist");
  });
});

describe("renderWaitlistConfirmation", () => {
  it("renders subject/html/text for the waitlisted variant", () => {
    const email = renderWaitlistConfirmation({ badgeTitle: "Camping" });
    expect(email.subject).toContain("waitlist");
    expect(email.html).toContain("Camping");
    expect(email.text).toContain("waitlist");
  });
});
