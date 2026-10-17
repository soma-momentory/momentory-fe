import { expect, test } from "@playwright/test";

test("opens Studio by default and keeps legacy mode URLs", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("studio-shell")).toBeVisible();
  await expect(page.getByTestId("studio-preview-B")).toBeVisible();

  await page.getByRole("tab", { name: "상태 비교" }).click();
  await expect(page).toHaveURL(/#compare\//);
  await expect(page.getByText("SCREEN COMPARISON")).toBeVisible();

  await page.getByRole("tab", { name: "전체 화면 Atlas" }).click();
  await expect(page).toHaveURL(/#atlas/);
  await expect(page.getByText("APP SCREEN ATLAS")).toBeVisible();

  await page.getByRole("tab", { name: "디자인 편집" }).click();
  await expect(page).toHaveURL(/#studio\//);
  await expect(page.getByTestId("studio-preview-B")).toBeVisible();
});

test("keeps the current draft visible when changing modes", async ({ page }) => {
  await page.goto("/#studio/rest-hub");
  const properties = page.getByTestId("studio-properties");
  await properties.getByRole("textbox", { name: "새 시안 이름" }).fill("Studio 3 review");
  await properties.getByRole("button", { name: "현재 시안 복제" }).click();
  await expect(page.getByTestId("studio-shell")).toContainText("Studio 3 review");
  await page.getByRole("tab", { name: "상태 비교" }).click();
  await expect(page.getByTestId("studio-shell")).toContainText("Studio 3 review");
  await page.getByRole("tab", { name: "디자인 편집" }).click();
  await expect(properties.getByRole("button", { name: "Studio 3 review" })).toBeVisible();
});

test("filters the preserved Atlas captures by screen name", async ({ page }) => {
  await page.goto("/#atlas");
  await page.getByRole("textbox", { name: "화면 검색" }).fill("쉼터");
  await expect(page.getByText("쉼터 홈")).toBeVisible();
  await expect(page.getByText("로그인", { exact: true })).toHaveCount(0);
});

test("moves from a static Atlas capture to its editable shared RN screen", async ({ page }) => {
  await page.goto("/#atlas");
  await page.getByRole("button", { name: "공유 RN 편집 가능" }).click();
  await page.getByRole("textbox", { name: "화면 검색" }).fill("쉼터 홈");
  await expect(page.getByText("쉼터 홈")).toBeVisible();
  await expect(page.getByText("로그인", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "공유 RN 편집", exact: true }).click();
  await expect(page).toHaveURL(/#studio\/rest-hub/);
  await expect(
    page.getByTestId("studio-preview-B").getByTestId("studio-rest-wish-paper"),
  ).toBeVisible();
});

test("searches screens and Mock states and collapses independent panels", async ({ page }) => {
  await page.goto("/#studio/home-main");
  const sidebar = page.getByTestId("studio-sidebar");
  await sidebar.getByRole("textbox", { name: "화면 검색" }).fill("쉼터");
  await expect(sidebar.getByRole("button", { name: "쉼터", exact: true })).toBeVisible();
  await expect(sidebar.getByRole("button", { name: "홈", exact: true })).toHaveCount(0);
  await sidebar.getByRole("button", { name: "쉼터", exact: true }).click();
  await expect(page).toHaveURL(/#studio\/rest-hub/);
  await sidebar.getByRole("textbox", { name: "Mock 검색" }).fill("긴");
  await expect(sidebar.getByRole("button", { name: "긴 요약 문구" })).toBeVisible();

  await page.getByRole("button", { name: "왼쪽 패널 접기" }).click();
  await expect(sidebar).toHaveCount(0);
  await page.getByRole("button", { name: "오른쪽 패널 접기" }).click();
  await expect(page.getByTestId("studio-properties")).toHaveCount(0);
  await expect(page.getByTestId("studio-preview-B")).toBeVisible();
  await page.getByRole("button", { name: "왼쪽 패널 열기" }).click();
  await page.getByRole("button", { name: "오른쪽 패널 열기" }).click();
  await expect(sidebar).toBeVisible();
  await expect(page.getByTestId("studio-properties")).toBeVisible();
});
