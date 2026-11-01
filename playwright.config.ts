import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.EXPO_LAB_PORT ?? 8085);

export default defineConfig({
  testDir: "./expo-lab/e2e",
  timeout: 120_000,
  // Bundled app fonts share the same approved baseline on macOS and Windows CI.
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
  expect: {
    timeout: 30_000,
    // Windows CI and local Windows rasterize font edges slightly differently.
    toMatchSnapshot: { maxDiffPixelRatio: 0.04 },
  },
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command: `npx expo start --web --port ${port}`,
    cwd: "expo-lab",
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
