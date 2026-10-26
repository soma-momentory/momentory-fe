import { expect, test, type Page } from "@playwright/test";
import { claudeHomeColor } from "../src/claude-home/tokens";

const screens = ["home-main", "rest-hub", "archive", "my-main", "report"];

async function expectPanelSnapshot(page: Page, name: string, width = 365, height = 779) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images, (image) => image.decode().catch(() => undefined)),
    );
  });
  const box = await page.getByTestId("studio-preview-A").boundingBox();
  expect(box).not.toBeNull();
  const screenshot = await page.screenshot({
    clip: { x: box!.x, y: box!.y, width, height },
    animations: "disabled",
    scale: "css",
  });
  expect(screenshot).toMatchSnapshot(name);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/#studio/home-main");
  await expect(page.getByTestId("studio-preview-A")).toBeVisible();
  await expect(page.getByTestId("studio-preview-B")).toBeVisible();
});

test("edits B immediately, preserves A, supports undo, redo, save, export and import", async ({
  page,
}) => {
  const a = page.getByTestId("studio-preview-A").getByTestId("studio-home-hero");
  const b = page.getByTestId("studio-preview-B").getByTestId("studio-home-hero");
  const original = await a.evaluate((element) => getComputedStyle(element).backgroundColor);
  const input = page.getByTestId("studio-properties").getByRole("textbox", { name: "배경색" });
  await input.fill(claudeHomeColor.today);
  await expect(b).toHaveCSS("background-color", "rgb(246, 222, 138)");
  await expect(a).toHaveCSS("background-color", original);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(b).toHaveCSS("background-color", original);
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(b).toHaveCSS("background-color", "rgb(246, 222, 138)");
  await page.reload();
  await expect(b).toHaveCSS("background-color", "rgb(246, 222, 138)");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON 내보내기" }).click();
  const download = await downloadPromise;
  const exported = await (await import("node:fs/promises")).readFile(await download.path(), "utf8");
  expect(JSON.parse(exported).design["home.hero.backgroundColor"]).toBe(claudeHomeColor.today);

  await page.getByRole("button", { name: "B 디자인 초기화" }).click();
  await expect(b).toHaveCSS("background-color", original);
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "JSON 가져오기" }).click();
  await (
    await chooser
  ).setFiles({ name: "draft.json", mimeType: "application/json", buffer: Buffer.from(exported) });
  await expect(b).toHaveCSS("background-color", "rgb(246, 222, 138)");
});

test("keeps named drafts separate and rejects invalid property input", async ({ page }) => {
  const properties = page.getByTestId("studio-properties");
  const b = page.getByTestId("studio-preview-B").getByTestId("studio-home-hero");
  await properties.getByRole("textbox", { name: "새 시안 이름" }).fill("Warm card");
  await properties.getByRole("button", { name: "현재 시안 복제" }).click();
  await properties.getByRole("textbox", { name: "배경색" }).fill(claudeHomeColor.today);
  await expect(b).toHaveCSS("background-color", "rgb(246, 222, 138)");
  await properties.getByRole("button", { name: "Draft 1" }).click();
  await expect(b).toHaveCSS("background-color", "rgb(251, 248, 241)");
  await properties.getByRole("button", { name: "Warm card" }).click();
  await expect(b).toHaveCSS("background-color", "rgb(246, 222, 138)");
  await properties.getByRole("textbox", { name: "배경색" }).fill("invalid");
  await expect(b).toHaveCSS("background-color", "rgb(246, 222, 138)");
  await properties.getByRole("textbox", { name: "배경색" }).blur();
  await expect(properties.getByRole("textbox", { name: "배경색" })).toHaveValue(
    claudeHomeColor.today,
  );
});

test("edits nested hero information blocks and restores the live shared view", async ({page}) => {
  const editor = page.getByTestId("studio-structure-editor");
  const preview = page.getByTestId("studio-preview-B");
  await editor.getByRole("button",{name:"그룹 추가"}).click();
  await editor.getByRole("button",{name:"텍스트 추가"}).click();
  await editor.getByRole("button",{name:"그룹에 넣기"}).click();
  await editor.getByRole("textbox",{name:"구조 텍스트"}).fill("오늘의 한 걸음");
  await expect(preview.getByTestId("studio-home-structure")).toContainText("오늘의 한 걸음");
  await expect(page.getByTestId("studio-preview-A").getByTestId("studio-home-structure")).toHaveCount(0);
  const downloadPromise=page.waitForEvent("download");
  await page.getByRole("button",{name:"JSON 내보내기"}).click();
  const download=await downloadPromise;
  const exported=JSON.parse(await (await import("node:fs/promises")).readFile(await download.path(),"utf8"));
  expect(exported.design["home.hero.structure"][0].children[0].text).toBe("오늘의 한 걸음");
  await page.reload();
  await expect(page.getByTestId("studio-preview-B").getByTestId("studio-home-structure")).toContainText("오늘의 한 걸음");
  await editor.getByRole("button",{name:"↳ 오늘의 한 걸음"}).click();
  await editor.getByRole("button",{name:"그룹 밖으로"}).click();
  await editor.getByRole("button",{name:"위로"}).click();
  await editor.getByRole("button",{name:"삭제"}).click();
  await expect(page.getByTestId("studio-preview-B").getByText("오늘의 한 걸음")).toHaveCount(0);
});

test("keeps the canvas and property panel reachable in a narrow browser", async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  const canvas = page.getByTestId("studio-canvas");
  const properties = page.getByTestId("studio-properties");
  expect((await canvas.boundingBox())?.height).toBeGreaterThan(500);
  await properties.scrollIntoViewIfNeeded();
  await properties.getByRole("textbox", { name: "배경색" }).fill(claudeHomeColor.today);
  await expect(page.getByTestId("studio-preview-B").getByTestId("studio-home-hero")).toHaveCSS(
    "background-color",
    "rgb(246, 222, 138)",
  );
});

test("renders five shared views with matching scenarios in A and B", async ({ page }) => {
  // The integrated shell sits above the canvas; keep the full phone inside the viewport.
  await page.setViewportSize({ width: 1440, height: 1200 });
  for (const screen of screens) {
    await page.goto(`/#studio/${screen}`);
    await expect(page.getByTestId("studio-preview-A")).toBeVisible();
    await expect(page.getByTestId("studio-preview-B")).toBeVisible();
    await expectPanelSnapshot(page, `${screen}-approved.png`);
  }
  await page.goto("/#studio/home-main");
  const sidebar = page.getByTestId("studio-sidebar");
  await sidebar.getByRole("button", { name: /일정 10개/ }).click();
  await expect(page.getByTestId("studio-preview-A")).toContainText("하루 돌아보기");
  await expect(page.getByTestId("studio-preview-B")).toContainText("하루 돌아보기");
  await page.getByRole("button", { name: "375pt" }).click();
  await page.getByRole("button", { name: "글씨 1.5×" }).click();
  await expectPanelSnapshot(page, "home-375-large-type.png", 353, 752);
});
