import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./expo-lab/e2e",
  timeout: 120_000,
  expect: {
    timeout: 30_000,
    // Windows CI and local Windows rasterize font edges slightly differently.
    toHaveScreenshot: { animations: "disabled", maxDiffPixelRatio: 0.04 },
  },
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:8085",
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command: "npx expo start --web --port 8085",
    cwd: "expo-lab",
    url: "http://127.0.0.1:8085",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
