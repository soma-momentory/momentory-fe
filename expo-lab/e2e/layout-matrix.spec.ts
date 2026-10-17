import { expect, test } from "@playwright/test";

const screens = [
  ["home-main", "studio-home-hero"],
  ["rest-hub", "studio-rest-root"],
  ["archive", "studio-archive-root"],
  ["my-main", "studio-my-root"],
  ["report", "studio-report-root"],
] as const;

for (const [screen, rootId] of screens) {
  test(`${screen} remains reachable at four widths and three text scales`, async ({ page }) => {
    await page.goto(`/#studio/${screen}`);
    const preview = page.getByTestId("studio-preview-B");
    const root = preview.getByTestId(rootId);
    for (const width of [375, 390, 402, 430]) {
      await page.getByRole("button", { name: `${width}pt` }).click();
      for (const scale of [1, 1.3, 1.5]) {
        await page.getByRole("button", { name: `글씨 ${scale}×` }).click();
        await expect(root, `${screen} ${width}pt ${scale}×`).toBeVisible();
        const dimensions = await root.evaluate((element) => ({
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          scrollHeight: element.scrollHeight,
        }));
        expect(dimensions.clientWidth).toBeGreaterThan(0);
        expect(dimensions.scrollHeight).toBeGreaterThan(0);
        expect(
          dimensions.scrollWidth - dimensions.clientWidth,
          `${screen} ${width}pt ${scale}×`,
        ).toBeLessThanOrEqual(2);
      }
    }
  });
}
