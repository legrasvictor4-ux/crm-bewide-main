import { test, expect } from "@playwright/test";

test.describe("Import Excel workflow", () => {
  test("handles successful import", async ({ page }) => {
    await page.route("**/api/auth/login", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ token: "fake", user: { id: "1", email: "test@example.com" } }) })
    );
    await page.route("**/api/import/excel", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({ status: 200, body: JSON.stringify({ imported: 2, errors: [] }) });
      }
      return route.continue();
    });
    await page.route("**/api/clients", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify([{ id: "1", company: "ACME", status: "new" }]) })
    );

    await page.goto("/login");
    await page.getByTestId("login-email").fill("user@example.com");
    await page.getByTestId("login-password").fill("secret123");
    await page.getByTestId("login-submit").click();
    await page.waitForURL("/");

    await page.getByTestId("nav-import").click();
    const fileInput = page.getByTestId("import-file");
    await fileInput.setInputFiles("supabase/fixtures/sample.xlsx");
    await page.getByTestId("import-submit").click();
    await expect(page.getByText(/import/i)).toBeVisible();
  });

  test("shows errors on invalid import", async ({ page }) => {
    await page.route("**/api/auth/login", (route) =>
      route.fulfill({ status: 200, body: JSON.stringify({ token: "fake", user: { id: "1", email: "test@example.com" } }) })
    );
    await page.route("**/api/import/excel", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 400,
          body: JSON.stringify({ error: { code: "INVALID_FILE", message: "Bad file", details: ["header missing"] } }),
        });
      }
      return route.continue();
    });

    await page.goto("/login");
    await page.getByTestId("login-email").fill("user@example.com");
    await page.getByTestId("login-password").fill("secret123");
    await page.getByTestId("login-submit").click();
    await page.waitForURL("/");

    await page.getByTestId("nav-import").click();
    const fileInput = page.getByTestId("import-file");
    await fileInput.setInputFiles("supabase/fixtures/invalid.xlsx");
    await page.getByTestId("import-submit").click();
    await expect(page.getByText(/bad file/i)).toBeVisible();
  });
});
