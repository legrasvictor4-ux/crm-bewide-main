import { test, expect } from "@playwright/test";

test.describe("Map view interactions", () => {
  test("renders markers and handles filters", async ({ page }) => {
    await page.route("**/api/auth/login", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ token: "fake", user: { id: "1", email: "test@example.com" } }) })
    );
    await page.route("**/api/clients", (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify([{ id: "1", company: "ACME", status: "new", latitude: 48.8566, longitude: 2.3522 }]),
      })
    );

    await page.goto("/login");
    await page.getByTestId("login-email").fill("user@example.com");
    await page.getByTestId("login-password").fill("secret123");
    await page.getByTestId("login-submit").click();
    await page.waitForURL("/");

    await page.getByTestId("nav-map").click();
    await expect(page.getByTestId("map-canvas")).toBeVisible();
    await page.getByTestId("map-filter").click();
    await expect(page.getByText(/Filtres/)).toBeVisible();
  });
});
