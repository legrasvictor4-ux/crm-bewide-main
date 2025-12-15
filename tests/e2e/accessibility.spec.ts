import { test, expect } from "@playwright/test";

test.describe("Accessibility smoke", () => {
  test("login form has labels and roles", async ({ page }) => {
    await page.goto("/login");
    const email = page.getByTestId("login-email");
    const password = page.getByTestId("login-password");
    await expect(email).toHaveAttribute("aria-label", /email/i);
    await expect(password).toHaveAttribute("aria-label", /mot de passe|password/i);
    await expect(page.getByRole("button", { name: /connexion|login/i })).toBeVisible();
  });
});
