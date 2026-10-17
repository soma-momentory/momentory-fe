import { chromium } from "playwright";

const baseURL = process.argv[2] ?? "http://127.0.0.1:8089";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const samples = {};
  for (const [mode, selector] of [
    ["studio", '[data-testid="studio-preview-B"]'],
    ["atlas", "text=APP SCREEN ATLAS"],
  ]) {
    await page.goto(`${baseURL}/#${mode}${mode === "atlas" ? "" : "/home-main"}`, {
      waitUntil: "domcontentloaded",
    });
    await page.locator(selector).waitFor();
    const readyMs = await page.evaluate(() => Math.round(performance.now()));
    await page.waitForTimeout(500);
    samples[mode] = await page.evaluate(() => ({
      domNodes: document.querySelectorAll("*").length,
      images: document.images.length,
    }));
    samples[mode].readyMs = readyMs;
  }
  await page.goto(`${baseURL}/#studio/home-main`);
  await page.locator('[data-testid="studio-preview-B"]').waitFor();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images, (image) => image.decode().catch(() => undefined)),
    );
  });
  await page.evaluate(() => {
    window.__studioMutations = { A: 0, B: 0 };
    for (const side of ["A", "B"]) {
      const root = document.querySelector(`[data-testid="studio-preview-${side}"]`);
      new MutationObserver((records) => {
        window.__studioMutations[side] += records.length;
      }).observe(root, { attributes: true, childList: true, characterData: true, subtree: true });
    }
  });
  await page
    .locator('[data-testid="studio-properties"] input[aria-label="배경색"]')
    .first()
    .fill("#F6DE8A");
  await page.waitForTimeout(100);
  samples.edit = await page.evaluate(() => window.__studioMutations);
  console.log(JSON.stringify(samples, null, 2));
  await page.close();
} finally {
  await browser.close();
}
