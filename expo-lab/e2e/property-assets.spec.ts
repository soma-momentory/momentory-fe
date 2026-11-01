import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { claudeHomeColor } from "../src/claude-home/tokens";

test("changes a registered project image in B, then restores it with Undo", async ({ page }) => {
  await page.goto("/#studio/rest-hub");
  const a = page
    .getByTestId("studio-preview-A")
    .getByTestId("studio-rest-baba-image")
    .locator("img")
    .last();
  const b = page
    .getByTestId("studio-preview-B")
    .getByTestId("studio-rest-baba-image")
    .locator("img")
    .last();
  const originalA = await a.getAttribute("src");
  const originalB = await b.getAttribute("src");
  await page.getByTestId("studio-preview-B").getByTestId("studio-rest-baba-image").click();
  await expect(page.getByTestId("studio-asset-browser")).toBeVisible();
  await page.getByRole("textbox", { name: "이미지 검색" }).fill("treasures");
  await page.getByRole("button", { name: "쉼터 보물 이미지 선택" }).click();
  await expect(b).not.toHaveAttribute("src", originalB!);
  await expect(a).toHaveAttribute("src", originalA!);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON 내보내기" }).click();
  const download = await downloadPromise;
  const exportedPath = await download.path();
  const exported = await readFile(exportedPath, "utf8");
  expect(JSON.parse(exported).design["rest.babaImage.assetId"]).toBe("rest-treasures");
  const apply = spawnSync(
    process.execPath,
    [path.join("expo-lab", "scripts", "apply-design.mjs"), exportedPath],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );
  expect(apply.status).toBe(0);
  expect(apply.stdout).toContain("rest.babaImage.assetId: rest-baba-sleep -> rest-treasures");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(b).toHaveAttribute("src", originalB!);
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "JSON 가져오기" }).click();
  await (
    await chooser
  ).setFiles({
    name: "asset-draft.json",
    mimeType: "application/json",
    buffer: Buffer.from(exported),
  });
  await expect(b).not.toHaveAttribute("src", originalB!);
});

test("edits text and card properties on the shared views", async ({ page }) => {
  await page.goto("/#studio/home-main");
  await page
    .getByTestId("studio-layer-tree")
    .getByRole("button", { name: "말풍선 문구 레이어" })
    .click();
  const text = page.getByTestId("studio-preview-B").getByTestId("studio-home-bubble-text");
  await page
    .getByTestId("studio-properties")
    .getByRole("textbox", { name: "글씨 크기" })
    .fill("30");
  await expect(text).toHaveCSS("font-size", "30px");
  await page.getByTestId("studio-properties").getByRole("button", { name: "가에구 보통" }).click();
  await expect(text).toHaveCSS("font-family", "Gaegu-Regular");
  await page.getByTestId("studio-properties").getByRole("button", { name: "가운데" }).click();
  await expect(text).toHaveCSS("text-align", "center");
  await page
    .getByTestId("studio-layer-tree")
    .getByRole("button", { name: "일기 작성하기 버튼 레이어" })
    .click();
  await page
    .getByTestId("studio-properties")
    .getByRole("textbox", { name: "배경색" })
    .fill(claudeHomeColor.today);
  await expect(
    page.getByTestId("studio-preview-B").getByTestId("home-v2-cta-shape"),
  ).toHaveAttribute("fill", claudeHomeColor.today);
  await expect(
    page.getByTestId("studio-preview-A").getByTestId("home-v2-cta-shape"),
  ).toHaveAttribute("fill", claudeHomeColor.green);
});

test("keeps history through mode changes and manages named drafts", async ({ page }) => {
  await page.goto("/#studio/home-main");
  const properties = page.getByTestId("studio-properties");
  const hero = page.getByTestId("studio-preview-B").getByTestId("studio-home-hero");
  await properties.getByRole("textbox", { name: "배경색" }).fill(claudeHomeColor.today);
  await expect(hero).toHaveCSS("background-color", "rgb(246, 222, 138)");
  await page.getByRole("tab", { name: "상태 비교" }).click();
  await page.getByRole("tab", { name: "디자인 편집" }).click();
  await properties.getByRole("button", { name: "Undo" }).click();
  await expect(hero).toHaveCSS("background-color", "rgb(251, 248, 241)");
  await properties.getByRole("button", { name: "Redo" }).click();
  await expect(hero).toHaveCSS("background-color", "rgb(246, 222, 138)");
  await page.getByRole("button", { name: "선택 모드" }).click();
  await page.keyboard.press("Control+z");
  await expect(hero).toHaveCSS("background-color", "rgb(251, 248, 241)");
  await page.keyboard.press("Control+Shift+z");
  await expect(hero).toHaveCSS("background-color", "rgb(246, 222, 138)");

  await properties.getByRole("textbox", { name: "새 시안 이름" }).fill("Warm study");
  await properties.getByRole("button", { name: "현재 시안 복제" }).click();
  await properties.getByRole("textbox", { name: "새 시안 이름" }).fill("Warm final");
  await properties.getByRole("button", { name: "시안 이름 변경" }).click();
  await expect(page.getByTestId("studio-shell")).toContainText("Warm final");
  await properties.getByRole("textbox", { name: "새 시안 이름" }).fill("Fresh");
  await properties.getByRole("button", { name: "새 시안", exact: true }).click();
  await expect(hero).toHaveCSS("background-color", "rgb(251, 248, 241)");
  await properties.getByRole("button", { name: "Warm final" }).click();
  await expect(hero).toHaveCSS("background-color", "rgb(246, 222, 138)");
  await page.reload();
  await expect(hero).toHaveCSS("background-color", "rgb(246, 222, 138)");
});
