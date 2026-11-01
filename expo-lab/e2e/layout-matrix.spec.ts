import { expect, test } from "@playwright/test";

const screens = [
  ["home-main", "studio-home-hero"],
  ["rest-hub", "studio-rest-root"],
  ["archive", "studio-archive-root"],
  ["my-main", "studio-my-root"],
  ["report", "studio-report-root"],
] as const;

for (const [screen, rootId] of screens) {
  test(`${screen} remains reachable at five widths and three text scales`, async ({ page }) => {
    await page.goto(`/#studio/${screen}`);
    const preview = page.getByTestId("studio-preview-B");
    const root = preview.getByTestId(rootId);
    for (const width of [360, 375, 390, 402, 430]) {
      await page.getByRole("button", { name: `${width}pt` }).click();
      for (const scale of [1, 1.3, 1.5]) {
        await page.getByRole("button", { name: `글씨 ${scale}×` }).click();
        await expect(root, `${screen} ${width}pt ${scale}×`).toBeVisible();
        // Home may remount the hero while measured space switches its scroll mode.
        await expect(async () => {
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
        }).toPass();
        if (screen === "home-main") {
          await expect(async () => {
            const canvas = await preview.getByTestId("design-canvas").boundingBox();
            const hero = await root.boundingBox();
            expect(hero!.width / canvas!.width).toBeCloseTo(358 / 390, 2);
            for (const id of ["home-date-tape", "home-weekday-tape"]) {
              const tape = preview.getByTestId(id);
              const paper = await tape.getByTestId("masking-tape").boundingBox();
              const copy = await tape.locator('[dir="auto"]').boundingBox();
              expect(copy!.x).toBeGreaterThanOrEqual(paper!.x);
              expect(copy!.x + copy!.width).toBeLessThanOrEqual(paper!.x + paper!.width + 1);
              expect(copy!.y).toBeGreaterThanOrEqual(paper!.y - 1);
              expect(copy!.y + copy!.height).toBeLessThanOrEqual(paper!.y + paper!.height + 1);
            }
            const scroll = preview
              .getByTestId("home-v2-body-scroll")
              .or(preview.getByTestId("home-v2-list-scroll"));
            const scrollBox = await scroll.boundingBox();
            const dock = await preview.getByTestId("week-dock").boundingBox();
            expect(scrollBox!.y + scrollBox!.height).toBeLessThanOrEqual(dock!.y + 1);
          }).toPass();
        }
      }
    }
  });
}
