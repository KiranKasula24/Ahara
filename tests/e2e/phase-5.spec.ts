import { expect, test } from "@playwright/test";

test("Android viewport has a usable signed-out entry point", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Email me a sign-in link" })).toBeVisible();
});

// Full logging scenarios require an authenticated fixture user and imported Supabase catalogue.
// They are intentionally skipped instead of asserting against fabricated nutrition data.
test.skip("searches variants and logs a backdated entry with a frozen snapshot", async () => {});
