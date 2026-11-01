import { expect, test } from "@playwright/test";

const approvedPapers = [
  ["home-main", "warm-ivory"],
  ["rest-hub", "soft-olive"],
  ["archive", "warm-ivory"],
  ["report", "warm-ivory"],
  ["my-main", "warm-ivory"],
] as const;

test("keeps the selected tab papers after comparing the two retained images", async ({ page }) => {
  await page.goto("/#backgrounds");
  for (const [screen, paper] of approvedPapers) {
    await expect(
      page.getByTestId(`background-panel-${screen}`).getByTestId(`preview-background-${paper}`),
    ).toHaveCount(1);
  }

  await page.getByRole("button", { name: "같은 배경 · 5개 탭", exact: true }).click();
  await expect(page.getByRole("button", { name: /^배경 / })).toHaveCount(3);
  await page.getByRole("button", { name: "배경 8 · 부드러운 올리브", exact: true }).click();
  await expect(page.getByTestId("preview-background-soft-olive")).toHaveCount(5);

  await page.getByRole("button", { name: "선택한 조합 · 5개 탭", exact: true }).click();
  await page.reload();
  await expect(page.getByTestId("preview-background-warm-ivory")).toHaveCount(4);
  await expect(page.getByTestId("preview-background-soft-olive")).toHaveCount(1);
});

test("compares the retained papers and grid on one selected tab", async ({ page }) => {
  await page.goto("/#backgrounds");
  await page.getByRole("button", { name: "같은 탭 · 모든 배경", exact: true }).click();
  await page.getByRole("button", { name: "마이", exact: true }).click();
  await expect(page.getByTestId("studio-my-root")).toHaveCount(3);
  await expect(page.getByTestId("preview-background-warm-ivory")).toHaveCount(1);
  await expect(page.getByTestId("preview-background-soft-olive")).toHaveCount(1);
  await expect(
    page.getByTestId("background-panel-grid").getByTestId("tab-paper-background"),
  ).toHaveCount(1);
});
