import { test, expect } from "@playwright/test";

test.describe("Prospection filters and sorting", () => {
  test("filters by status and search", async ({ page }) => {
    await page.route("**/api/auth/login", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ token: "fake", user: { id: "1", email: "test@example.com" } }) })
    );
    await page.route("**/api/clients", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify([
          { id: "1", company: "ACME", status: "new", lead_score: 30 },
          { id: "2", company: "Beta", status: "success", lead_score: 90 },
        ]),
      })
    );

    await page.goto("/login");
    await page.getByTestId("login-email").fill("user@example.com");
    await page.getByTestId("login-password").fill("secret123");
    await page.getByTestId("login-submit").click();
    await page.waitForURL("/");

    await page.getByTestId("filter-select").click();
    await page.getByRole("option", { name: /succ/i }).click();
    await expect(page.getByText("Beta")).toBeVisible();
    await expect(page.getByText("ACME")).toBeHidden();

    await page.getByTestId("search-input").fill("acme");
    await expect(page.getByText("ACME")).toBeVisible();
  });
});
