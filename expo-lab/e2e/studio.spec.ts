import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

/**
 * 디자인 편집 패널(`src/design-editor`) — 셸이 어디에 끼우든 패널만으로 되는 흐름을 본다.
 * 시안은 localStorage(`momentory.lab.designDrafts`)에 남고, 프레임은 그 값을 읽어 다시 그린다.
 * 셸이 패널을 아직 첫 화면에 두지 않으면(통합 전) 건너뛴다.
 */
const DRAFTS_KEY = "momentory.lab.designDrafts";

async function openPanel(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const panel = page.getByTestId("design-editor-panel");
  const found = await panel
    .waitFor({ timeout: 60_000 })
    .then(() => true)
    .catch(() => false);
  test.skip(!found, "셸이 첫 화면에 디자인 편집 패널을 두지 않았다");
  return panel;
}

const storedDrafts = (page: Page) =>
  page.evaluate(
    (key) =>
      JSON.parse(localStorage.getItem(key) ?? "[]") as {
        id: string;
        name: string;
        tokens: Record<string, string | number>;
        studio: Record<string, string | number>;
      }[],
    DRAFTS_KEY,
  );

test("시안을 만들고 토큰·화면 속성을 고치면 저장소에 남고, 되돌리기·내보내기·가져오기가 된다", async ({
  page,
}) => {
  const panel = await openPanel(page);
  await panel.getByLabel("시안 이름").fill("색 연구");
  await panel.getByRole("button", { name: "새 시안" }).click();
  await expect(panel.getByRole("button", { name: "시안 색 연구" })).toBeVisible();

  await panel.getByLabel("토큰 검색").fill("primary.heavy");
  const heavy = panel
    .getByTestId("design-token-primary.heavy")
    .getByRole("textbox", { name: "브랜드 초록 · 진하게", exact: true });
  await heavy.fill("rgb(51,85,68)");
  await expect(panel.getByTestId("design-token-primary.heavy")).toContainText("대비");
  await expect
    .poll(async () => (await storedDrafts(page))[0]?.tokens)
    .toEqual({
      "primary.heavy": "rgb(51,85,68)",
    });

  await panel.getByRole("button", { name: "화면 속성" }).click();
  await panel.getByRole("button", { name: "홈", exact: false }).first().click();
  await panel.getByRole("button", { name: "히어로 카드 레이어" }).click();
  await panel.getByTestId("design-studio-home.hero.borderRadius").getByRole("textbox").fill("24");
  await expect
    .poll(async () => (await storedDrafts(page))[0]?.studio)
    .toEqual({
      "home.hero.borderRadius": 24,
    });

  await panel.getByRole("button", { name: "바뀐 것 2" }).click();
  await expect(panel.getByTestId("design-editor-changes")).toContainText("primary.heavy");

  await panel.getByRole("button", { name: "되돌리기 (Ctrl+Z)" }).click();
  await expect(panel.getByRole("button", { name: "바뀐 것 1" })).toBeVisible();
  await panel.getByRole("button", { name: "다시 하기 (Ctrl+Shift+Z)" }).click();
  await expect(panel.getByRole("button", { name: "바뀐 것 2" })).toBeVisible();

  await panel.getByRole("button", { name: "파일 · 코드 반영" }).click();
  const downloadPromise = page.waitForEvent("download");
  await panel.getByRole("button", { name: "JSON 내보내기" }).click();
  const exported = JSON.parse(await readFile((await (await downloadPromise).path())!, "utf8"));
  expect(exported).toMatchObject({
    version: 2,
    kind: "momentory-design-draft",
    name: "색 연구",
    tokens: { "primary.heavy": "rgb(51,85,68)" },
    studio: { "home.hero.borderRadius": 24 },
  });

  const chooser = page.waitForEvent("filechooser");
  await panel.getByRole("button", { name: "새 시안으로 가져오기" }).click();
  await (
    await chooser
  ).setFiles({
    name: "draft.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(exported)),
  });
  await expect(panel.getByRole("button", { name: "시안 색 연구 2" })).toBeVisible();
  expect((await storedDrafts(page)).map((draft) => draft.name)).toEqual(["색 연구", "색 연구 2"]);
});

test("틀린 값은 시안에 들어가지 않고, 읽기 전용 토큰은 이유를 보인다", async ({ page }) => {
  const panel = await openPanel(page);
  await panel.getByRole("button", { name: "새 시안" }).click();
  await panel.getByLabel("토큰 검색").fill("label.normal");
  const input = panel
    .getByTestId("design-token-label.normal")
    .getByRole("textbox", { name: "글자색 · 기본", exact: true });
  await input.fill("not-a-color");
  await expect(panel.getByTestId("design-token-label.normal")).toContainText("rgba()");
  expect((await storedDrafts(page))[0]?.tokens).toEqual({});

  await panel.getByRole("button", { name: /읽기 전용 \d+개도 보기/ }).click();
  await panel.getByLabel("토큰 검색").fill("fill.normal");
  await expect(panel.getByTestId("design-token-fill.normal")).toContainText("계산된 값");
});
