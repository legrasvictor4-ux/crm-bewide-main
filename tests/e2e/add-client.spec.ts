import { test, expect } from "@playwright/test";

test.describe("Add client flow", () => {
  test("creates client via form submission", async ({ page }) => {
    await page.route("**/api/auth/login", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ token: "fake", user: { id: "1", email: "test@example.com" } }) })
    );
    await page.route("**/api/clients", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 200,
          body: JSON.stringify({ id: "c1", company: "ACME", phone: "0102030405", status: "new" }),
        });
      }
      return route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.goto("/login");
    await page.getByTestId("login-email").fill("test@example.com");
    await page.getByTestId("login-password").fill("secret123");
    await page.getByTestId("login-submit").click();

    await page.waitForURL("/");
    await page.getByTestId("open-add-client").click();
    await page.getByTestId("client-name").fill("ACME Corp");
    await page.getByTestId("client-phone").fill("+33123456789");
    await page.getByTestId("client-email").fill("contact@acme.com");
    await page.getByTestId("client-description").fill("Important client");
    await page.getByTestId("client-submit").click();

    await expect(page.getByText(/client cree/i)).toBeVisible();
  });
});
