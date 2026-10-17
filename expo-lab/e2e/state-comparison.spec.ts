import { expect, test } from "@playwright/test";
import { claudeHomeColor } from "../src/claude-home/tokens";

test("compares two Mock states with one shared RN View and one design source", async ({ page }) => {
  await page.goto("/#compare/rest-hub/app-rest");
  const a = page.getByTestId("state-preview-A");
  const b = page.getByTestId("state-preview-B");
  await expect(page.getByTestId("state-comparison")).toBeVisible();
  await expect(a.getByTestId("studio-rest-wish-paper")).toBeVisible();
  await expect(b.getByTestId("studio-rest-wish-paper")).toBeVisible();
  await b.getByRole("button", { name: "긴 요약 문구" }).click();
  await expect(b).toContainText("글씨가 크거나 화면이 좁을 때에도");
  await expect(a).not.toContainText("글씨가 크거나 화면이 좁을 때에도");
  await page.getByTestId("state-comparison").getByRole("button", { name: "1.5배" }).click();
  await expect(page).toHaveURL(/type=1.5/);
});

test("uses the same current draft on both state previews without changing the approved source", async ({
  page,
}) => {
  await page.goto("/#studio/rest-hub");
  await page
    .getByTestId("studio-layer-tree")
    .getByRole("button", { name: "바람카드 레이어" })
    .click();
  await page
    .getByTestId("studio-properties")
    .getByRole("textbox", { name: "배경색" })
    .fill(claudeHomeColor.today);
  await page.getByRole("tab", { name: "상태 비교" }).click();
  const a = page.getByTestId("state-preview-A").getByTestId("studio-rest-wish-paper");
  const b = page.getByTestId("state-preview-B").getByTestId("studio-rest-wish-paper");
  await expect(a).toHaveCSS("background-color", "rgb(251, 248, 241)");
  await page.getByTestId("state-comparison").getByRole("button", { name: "현재 시안" }).click();
  await expect(a).toHaveCSS("background-color", "rgb(246, 222, 138)");
  await expect(b).toHaveCSS("background-color", "rgb(246, 222, 138)");
  await page.getByTestId("state-comparison").getByRole("button", { name: "승인 디자인" }).click();
  await expect(a).toHaveCSS("background-color", "rgb(251, 248, 241)");
  await expect(b).toHaveCSS("background-color", "rgb(251, 248, 241)");
  await page.getByRole("button", { name: "기존 캡처 대비" }).click();
  await expect(page.getByText("CURRENT APP")).toBeVisible();
});
