import { expect, test } from "@playwright/test";

test("selects a real nested RN element and keeps tree and inspector in sync", async ({ page }) => {
  await page.goto("/#studio/rest-hub");
  const preview = page.getByTestId("studio-preview-B");
  const photo = preview.getByTestId("studio-rest-baba-image");
  await photo.click();
  await expect(page.getByTestId("studio-selection-label")).toHaveText("선택: 바바 이미지");
  await expect(
    page.getByTestId("studio-layer-tree").getByRole("button", { name: "바바 이미지 레이어" }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("studio-asset-browser")).toBeVisible();
  await expect(photo).toHaveCSS("outline-style", "solid");

  await page
    .getByTestId("studio-layer-tree")
    .getByRole("button", { name: "바람카드 레이어" })
    .click();
  await expect(preview.getByTestId("studio-rest-wish-paper")).toHaveCSS("outline-style", "solid");
  await expect(page.getByTestId("studio-properties")).toContainText("속성 · 바람카드");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("studio-selection-label")).toHaveText("화면에서 요소를 선택하세요");
});

test("selection mode blocks a card action and function mode runs its Lab Mock action", async ({
  page,
}) => {
  await page.goto("/#studio/rest-hub");
  const card = page.getByTestId("studio-preview-B").getByTestId("studio-rest-wish-paper");
  await card.click();
  await expect(page.getByTestId("studio-selection-label")).toContainText("선택: 바람카드");
  await expect(page.getByText("바람카드 이동은 Lab Mock입니다.")).toHaveCount(0);

  await page.getByRole("button", { name: "기능 테스트 모드" }).click();
  await card.click();
  await expect(page.getByText("바람카드 이동은 Lab Mock입니다.")).toBeVisible();
});
