import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "../..");

describe("White Screen Startup — Bootstrap Failure Protection", () => {
  it("vite.config.ts uses host: '0.0.0.0' (not '::' which breaks on Windows IPv4)", () => {
    const cfg = fs.readFileSync(path.join(ROOT, "vite.config.ts"), "utf-8");
    expect(cfg).not.toContain('host: "::"');
    expect(cfg).toContain('host: "0.0.0.0"');
  });

  it("vite.config.ts sets strictPort: false to avoid silent port change", () => {
    const cfg = fs.readFileSync(path.join(ROOT, "vite.config.ts"), "utf-8");
    expect(cfg).toContain("strictPort: false");
  });

  it("main.tsx boots React with crash-safe fallback", () => {
    const main = fs.readFileSync(path.join(ROOT, "src/main.tsx"), "utf-8");
    expect(main).toContain("createRoot(rootEl).render(<App />)");
    expect(main).toContain("innerHTML");
  });

  it("main.tsx does NOT duplicate service worker registration", () => {
    const main = fs.readFileSync(path.join(ROOT, "src/main.tsx"), "utf-8");
    expect(main).not.toContain("serviceWorker");
    expect(main).not.toContain("sw.js");
  });

  it("index.html has only one service worker registration block", () => {
    const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf-8");
    const matches = html.match(/serviceWorker\.register/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(1);
  });

  it("index.html uses /src/main.tsx as entry (Vite ESM)", () => {
    const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf-8");
    expect(html).toContain('src="/src/main.tsx"');
    expect(html).toContain('type="module"');
  });

  it("bootstrapLogger.ts exists and exports bootLog", async () => {
    const mod = await import("../../src/lib/bootstrapLogger");
    expect(mod.bootLog).toBeDefined();
    expect(typeof mod.bootLog).toBe("function");
  });

  it("tsconfig paths alias @ -> ./src/*", () => {
    const tsconfig = JSON.parse(fs.readFileSync(path.join(ROOT, "tsconfig.json"), "utf-8"));
    expect(tsconfig.compilerOptions.paths["@/*"]).toBeDefined();
    expect(tsconfig.compilerOptions.paths["@/*"][0]).toBe("./src/*");
  });

  it("env file contains VITE_SUPABASE_URL for Vite frontend", () => {
    const env = fs.readFileSync(path.join(ROOT, ".env"), "utf-8");
    expect(env).toContain("VITE_SUPABASE_URL");
    expect(env).toContain("VITE_SUPABASE_ANON_KEY");
  });

  it("index.html has manifest.json link", () => {
    const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf-8");
    expect(html).toContain('href="/manifest.json"');
  });

  it("Google Maps script in index.html uses async defer", () => {
    const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf-8");
    const gmMatch = html.match(
      /maps\.googleapis\.com\/maps\/api\/js\?key=([A-Za-z0-9_-]+)/
    );
    expect(gmMatch).not.toBeNull();
    expect(html).toContain("async");
    expect(html).toContain("defer");
  });

  it("package.json dev script runs both frontend and backend via concurrently", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf-8"));
    expect(pkg.scripts.dev).toContain("concurrently");
    expect(pkg.scripts["dev:frontend"]).toBe("vite");
  });

  it("vite.config.ts proxy /api -> localhost:3000", () => {
    const cfg = fs.readFileSync(path.join(ROOT, "vite.config.ts"), "utf-8");
    expect(cfg).toContain("localhost:3000");
  });
});
