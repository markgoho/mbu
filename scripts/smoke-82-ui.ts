/**
 * UI slice of #82 V2 smoke — real auth + API via emulators (no route mocks).
 * Run with emulators + `ng serve` already up.
 */
import { chromium, type Page } from "playwright";

const AUTH = "http://127.0.0.1:9099";
const BASE = "http://localhost:4200";
const KEY = "fake-api-key";
const PASSWORD = "password123";

async function createVerifiedUser(email: string): Promise<void> {
  const signUp = await fetch(
    `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        password: PASSWORD,
        returnSecureToken: true,
      }),
    },
  );
  const { localId } = (await signUp.json()) as { localId: string };
  await fetch(
    `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:update?key=${KEY}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer owner",
      },
      body: JSON.stringify({ localId, emailVerified: true }),
    },
  );
}

async function signIn(page: Page, email: string): Promise<void> {
  await page.goto(`${BASE}/sign-in`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL((url) => !url.pathname.includes("/sign-in"), {
    timeout: 15_000,
  });
}

async function completeOnboarding(page: Page): Promise<void> {
  if (!page.url().includes("/onboarding")) return;
  await page.getByLabel("Your name").fill("Chancellor Pat");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL((url) => !url.pathname.includes("/onboarding"), {
    timeout: 15_000,
  });
}

async function main(): Promise<void> {
  const chancellorEmail = `ui-chancellor-${Date.now()}@smoke.test`;
  await createVerifiedUser(chancellorEmail);

  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage();

  console.log("\n=== V2 UI happy path ===\n");

  await signIn(page, chancellorEmail);
  await completeOnboarding(page);

  await page.goto(`${BASE}/universities`);
  await completeOnboarding(page);
  await page.waitForSelector("h1", { timeout: 15_000 });
  await page.locator("a.dashboard__create").click();
  await page.waitForURL(/\/universities\/new$/);

  await page.getByLabel("Title").fill("UI Smoke MBU");
  await page.locator("#startDate").fill("2026-09-01T09:00");
  await page.locator("#registrationClosesAt").fill("2026-08-25T23:59");
  await page.getByLabel("Venue name").fill("Scout Hall");
  await page.getByLabel("Street address").fill("1 Main St");
  await page.getByLabel("City").fill("Anytown");
  await page.getByLabel("State").fill("NY");
  await page.getByLabel("ZIP").fill("12345");
  await page.getByRole("button", { name: "Save university" }).click();

  await page.waitForURL(/\/universities\/[0-9a-f-]+$/);
  const uniUrl = page.url();
  console.log(`  ✓ created university via UI → ${uniUrl}`);

  await page.locator(".period-board__row").first().getByLabel("Label").fill("Morning");
  await page.locator(".period-board__row").first().getByLabel("Starts").fill("2026-09-01T08:00");
  await page.locator(".period-board__row").first().getByLabel("Ends").fill("2026-09-01T12:00");
  await page.getByRole("button", { name: "Save periods" }).click();
  const periodErr = page.locator(".period-board__error");
  await page.waitForTimeout(1500);
  if (await periodErr.isVisible()) {
    throw new Error(`Period save error: ${await periodErr.textContent()}`);
  }
  await page.reload();
  await page.waitForLoadState("networkidle");
  console.log("  ✓ saved period via period board");

  await page.getByRole("button", { name: "Add class" }).click();
  await page.getByLabel("Morning").waitFor({ state: "visible", timeout: 10_000 });
  await page.locator("#badgeSlug").selectOption("camping");
  await page.getByLabel("Morning").check();
  await page.locator("#bsaId").fill("999888777");
  await page
    .getByRole("group", { name: "Counselor (you)" })
    .getByRole("checkbox")
    .check();
  await page.getByRole("button", { name: "Add class" }).click();
  const classError = page.locator(".class-form__error");
  const camping = page.locator(".class-list__item strong").filter({ hasText: "Camping" });
  await Promise.race([
    camping.waitFor({ state: "visible", timeout: 15_000 }),
    classError.waitFor({ state: "visible", timeout: 15_000 }).then(async () => {
      throw new Error(`Class form error: ${await classError.textContent()}`);
    }),
  ]);
  console.log("  ✓ added Camping class via UI");

  await page.goto(`${BASE}/universities`);
  await page.getByText("UI Smoke MBU").waitFor({ state: "visible" });
  await page.getByText("draft").waitFor({ state: "visible" });
  console.log("  ✓ dashboard shows draft university");

  const intruderEmail = `ui-intruder-${Date.now()}@smoke.test`;
  await createVerifiedUser(intruderEmail);
  const intruder = await browser.newPage();
  await signIn(intruder, intruderEmail);
  await completeOnboarding(intruder);
  await intruder.goto(uniUrl);
  await intruder.waitForURL(`${BASE}/universities`);
  await intruder
    .getByText(/do not have access/i)
    .waitFor({ state: "visible" });
  console.log("  ✓ intruder redirected with access message");

  await browser.close();
  console.log("\n=== UI smoke passed ===\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
