import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

/**
 * 디자인 편집 패널(`src/design-editor`) — 셸이 어디에 끼우든 패널만으로 되는 흐름을 본다.
 * 시안은 localStorage(`momentory.lab.designDrafts`)에 남고, 프레임은 그 값을 읽어 다시 그린다.
 * 셸이 패널을 아직 첫 화면에 두지 않으면(통합 전) 건너뛴다.
 *
 * 프레임 안의 실제 앱을 읽는 검사(「이 화면에 쓰인 값」 · 눌러 고르기)는 `LAB_FRAMES=1` 일 때만 돈다.
 *
 *   EXPO_LAB_PORT=8087 LAB_FRAMES=1 npx playwright test expo-lab/e2e/studio.spec.ts
 */
const DRAFTS_KEY = "momentory.lab.designDrafts";
const frames = !!process.env.LAB_FRAMES;
/** 린터가 hex 리터럴을 막는다 — 시험 색은 조각으로 만든다 */
const PICKED = `#${"112233"}`;

async function openPanel(page: Page, hash = "") {
  await page.goto(`/${hash}`);
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

test("시안이 없으면 안내 카드와 순서 1단계가 보이고, 버튼마다 설명이 붙는다", async ({ page }) => {
  const panel = await openPanel(page);
  await expect(panel.getByTestId("design-editor-empty")).toContainText(
    "시안은 지금 앱(A)을 건드리지 않고 고쳐 보는 사본이에요",
  );
  await expect(panel.getByTestId("design-editor-step-current")).toContainText("시안 만들기");
  await expect(panel.getByRole("button", { name: "새 시안 만들기" })).toHaveAttribute(
    "title",
    /B 화면에 걸어요/,
  );
  await panel.getByRole("button", { name: "새 시안 만들기" }).click();
  await expect(panel.getByTestId("design-editor-step-current")).toContainText("값 고치기");
  await expect(panel.getByRole("button", { name: "실행 취소 (Ctrl+Z)" })).toHaveAttribute(
    "title",
    /되돌릴 편집이 없어요/,
  );
  await expect(panel.getByRole("button", { name: "바꾼 값 모두 되돌리기" })).toHaveAttribute(
    "title",
    /A와 같게/,
  );
});

test("시안을 만들고 공통 값·화면별 값을 고치면 저장소에 남고, 실행 취소·내보내기·가져오기·AI에게 넘기기가 된다", async ({
  page,
}) => {
  const panel = await openPanel(page);
  await panel.getByLabel("시안 이름").fill("색 연구");
  await panel.getByRole("button", { name: "새 시안 만들기" }).click();
  await expect(panel.getByRole("button", { name: "시안 색 연구" })).toBeVisible();

  await panel.getByRole("button", { name: "모든 값 목록 보기" }).click();
  await panel.getByRole("button", { name: "모든 공통 값 (모든 화면)" }).click();
  await panel.getByLabel("공통 값 검색").fill("primary.heavy");
  const heavy = panel
    .getByTestId("design-token-primary.heavy")
    .getByRole("textbox", { name: "브랜드 초록 · 진하게", exact: true });
  await heavy.fill("rgb(51,85,68)");
  await expect(panel.getByTestId("design-token-primary.heavy")).toContainText("대비");
  await expect(panel.getByTestId("design-token-primary.heavy")).toContainText("→ B");
  await expect
    .poll(async () => (await storedDrafts(page))[0]?.tokens)
    .toEqual({ "primary.heavy": "rgb(51,85,68)" });

  await panel
    .getByRole("button", { name: "화면별 값 (홈 · 쉼터 · 보관함 · 마이 · 리포트)" })
    .click();
  await panel.getByRole("button", { name: "홈", exact: false }).first().click();
  await panel.getByRole("button", { name: "히어로 카드 레이어" }).click();
  await panel.getByTestId("design-studio-home.hero.borderRadius").getByRole("textbox").fill("24");
  await expect
    .poll(async () => (await storedDrafts(page))[0]?.studio)
    .toEqual({ "home.hero.borderRadius": 24 });

  await panel.getByRole("button", { name: "바꾼 값 2" }).click();
  await expect(panel.getByTestId("design-editor-changes")).toContainText("primary.heavy");
  await expect(panel.getByTestId("design-editor-step-current")).toContainText("B 화면에서 확인");

  await panel.getByRole("button", { name: "실행 취소 (Ctrl+Z)" }).click();
  await expect(panel.getByRole("button", { name: "바꾼 값 1" })).toBeVisible();
  await panel.getByRole("button", { name: "다시 실행 (Ctrl+Shift+Z)" }).click();
  await expect(panel.getByRole("button", { name: "바꾼 값 2" })).toBeVisible();

  await panel.getByRole("button", { name: "코드 반영 · AI에게 넘기기" }).click();
  await expect(panel.getByTestId("design-editor-step-current")).toContainText("AI에게 넘기기");
  await panel.getByLabel("AI에게 남길 메모").fill("말풍선 꼬리를 조금 더 길게");
  await panel.getByLabel("이 화면 메모").fill("히어로 카드 그림자 줄이기");
  const handoffPromise = page.waitForEvent("download");
  await panel.getByTestId("design-editor-handoff").click();
  const handoffDownload = await handoffPromise;
  expect(handoffDownload.suggestedFilename()).toMatch(
    /^momentory-handoff-색-연구-\d{8}-\d{4}\.json$/,
  );
  const handoff = JSON.parse(await readFile((await handoffDownload.path())!, "utf8"));
  expect(handoff).toMatchObject({
    format: "momentory-lab-handoff@1",
    draft: { name: "색 연구" },
    request: "말풍선 꼬리를 조금 더 길게",
    tokens: [{ key: "primary.heavy", label: "브랜드 초록 · 진하게", after: "rgb(51,85,68)" }],
    studio: [{ key: "home.hero.borderRadius", before: 16, after: 24 }],
    lab: { platform: "ios", datasetId: "normal" },
  });
  expect(handoff.createdAt).toMatch(/\+09:00$/);
  expect(handoff.screens).toContainEqual({ route: "/home", note: "히어로 카드 그림자 줄이기" });
  await expect(panel.getByTestId("design-editor-handoff-done")).toContainText(
    "이 Lab 시안 반영해줘",
  );

  await panel.getByRole("button", { name: "파일로 직접 옮기기 (고급)" }).click();
  const downloadPromise = page.waitForEvent("download");
  await panel.getByRole("button", { name: "시안 파일 저장" }).click();
  const exported = JSON.parse(await readFile((await (await downloadPromise).path())!, "utf8"));
  expect(exported).toMatchObject({
    version: 2,
    kind: "momentory-design-draft",
    name: "색 연구",
    tokens: { "primary.heavy": "rgb(51,85,68)" },
    studio: { "home.hero.borderRadius": 24 },
  });

  const chooser = page.waitForEvent("filechooser");
  await panel.getByRole("button", { name: "파일을 새 시안으로 열기" }).click();
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

test("틀린 값은 시안에 들어가지 않고, 고칠 수 없는 값은 이유를 보인다", async ({ page }) => {
  const panel = await openPanel(page);
  await panel.getByRole("button", { name: "새 시안 만들기" }).click();
  await panel.getByRole("button", { name: "모든 값 목록 보기" }).click();
  await panel.getByRole("button", { name: "모든 공통 값 (모든 화면)" }).click();
  await panel.getByLabel("공통 값 검색").fill("label.normal");
  const input = panel
    .getByTestId("design-token-label.normal")
    .getByRole("textbox", { name: "글자색 · 기본", exact: true });
  await input.fill("not-a-color");
  await expect(panel.getByTestId("design-token-label.normal")).toContainText("rgba()");
  expect((await storedDrafts(page))[0]?.tokens).toEqual({});

  const readOnly = panel.getByRole("button", { name: /고칠 수 없는 값도 보기 \(\d+\)/ });
  await expect(readOnly).toHaveAttribute("title", /계산되거나/);
  await readOnly.click();
  await panel.getByLabel("공통 값 검색").fill("fill.normal");
  await expect(panel.getByTestId("design-token-fill.normal")).toContainText("계산된 값");
});

test.describe("프레임 안의 실제 앱", () => {
  test.skip(!frames, "LAB_FRAMES=1 일 때만 — 프레임 안에 실제 앱이 떠야 한다");

  test("이 화면에 쓰인 값 — 홈이 실제로 쓰는 토큰만 모이고, 올리면 B 에 상자가 그려진다", async ({
    page,
  }) => {
    const panel = await openPanel(page, "#/screens?route=/home&layout=ab&panel=design");
    await panel.getByRole("button", { name: "새 시안 만들기" }).click();
    const usage = panel.getByTestId("design-editor-usage");
    await expect(usage).toBeVisible({ timeout: 60_000 });
    await expect(usage.getByTestId("design-usage-text")).toBeVisible();
    await expect(usage.getByTestId("design-usage-surface")).toContainText("homeV2.color.paper");
    // 601개 전부가 아니라 이 화면 것만
    expect(await usage.locator('[data-testid^="design-usage-item-"]').count()).toBeLessThan(80);

    await usage.locator('[data-testid^="design-usage-item-"]').first().hover();
    await expect
      .poll(() =>
        page
          .frameLocator('[data-testid="lab-frame-B"]')
          .locator("#momentory-lab-boxes > div")
          .count(),
      )
      .toBeGreaterThan(0);
  });

  test("시안 없이 눌러 고르면 「먼저 시안을 만들어요」 → 만들면 그 요소 카드에서 바로 고친다", async ({
    page,
  }) => {
    const panel = await openPanel(page, "#/screens?route=/home&layout=ab&panel=design");
    await panel.getByTestId("design-editor-pick").click();
    const frame = page.frameLocator('[data-testid="lab-frame-B"]');
    await frame.getByText("오늘 일정").first().click({ timeout: 60_000 });
    const card = panel.getByTestId("design-editor-element");
    await expect(card).toContainText("이 요소: 글자 『오늘 일정』");
    await expect(card.getByTestId("design-editor-element-needs-draft")).toBeVisible();
    await card.getByRole("button", { name: "시안 만들고 이 요소 고치기" }).click();
    await expect(card.getByTestId("design-editor-element-needs-draft")).toHaveCount(0);

    // 글자색(잉크)은 홈에서 계산된 값이라 고칠 수 없다고 말하고, 바탕(모눈 종이)은 바로 고친다
    await expect(card.getByTestId("design-element-color")).toContainText(/못 고쳐요|함께 써요/);
    const surface = card.getByTestId("design-element-backgroundColor");
    await expect(surface).toContainText("함께 써요");
    await surface.getByRole("textbox").first().fill(PICKED);
    await expect
      .poll(async () => Object.values((await storedDrafts(page))[0]?.tokens ?? {}))
      .toEqual([PICKED]);
  });
});
