import { describe, expect, it } from "bun:test";
import { renderWaitlistPromotion } from "./waitlist-promotion.js";

describe("renderWaitlistPromotion", () => {
  it("renders subject/html/text mentioning the badge", () => {
    const email = renderWaitlistPromotion({ badgeTitle: "Cooking" });
    expect(email.subject).toContain("Cooking");
    expect(email.html).toContain("enrolled");
    expect(email.text).toContain("Cooking");
  });
});
