import { test, expect } from "@playwright/test";

test.describe("Navigation and logout", () => {
  test("navigates via sidebar/topnav and logs out", async ({ page }) => {
    await page.route("**/api/auth/login", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ token: "fake", user: { id: "1", email: "test@example.com" } }) })
    );
    await page.route("**/api/auth/logout", (route) => route.fulfill({ status: 200, body: "{}" }));
    await page.route("**/api/clients", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify([{ id: "1", company: "ACME", status: "new" }]) })
    );

    await page.goto("/login");
    await page.getByTestId("login-email").fill("user@example.com");
    await page.getByTestId("login-password").fill("secret123");
    await page.getByTestId("login-submit").click();
    await page.waitForURL("/");

    await page.getByTestId("nav-map").click();
    await expect(page).toHaveURL(/map/);
    await page.getByTestId("nav-dashboard").click();
    await expect(page).toHaveURL("/");

    await page.getByTestId("topnav-logout").click();
    await expect(page).toHaveURL(/login/);
  });
});
