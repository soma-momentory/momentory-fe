/**
 * 「전 화면」 셸 — 셸만으로 확인되는 것(목록 · 해시 · 레이아웃 · 프레임 설정 · 기기 크기 · 가상 시각).
 *
 * ⚠ 프레임 안에 실제 앱이 뜨는 것(갈래 A 부트스트랩)과 가짜 서버(갈래 B)가 있어야 하는 검사는
 * `LAB_FRAMES=1` 일 때만 돈다 — A·B 가 합쳐지기 전에는 iframe 안이 「앱 프레임 준비 중」이다.
 *
 *   npx playwright test expo-lab/e2e/shell.spec.ts
 */
import { expect, test, type Page } from "@playwright/test";

const DRAFTS = JSON.stringify([
  {
    id: "v",
    name: "테스트",
    tokens: { "label.normal": "rgb(31, 58, 95)" },
    studio: {},
    updatedAt: "2026-11-02T00:00:00.000Z",
  },
  { id: "e", name: "빈 시안", tokens: {}, studio: {}, updatedAt: "2026-11-02T00:00:00.000Z" },
]);

/** 오른쪽 패널은 처음에 디자인 편집기다 — 조작 패널로 바꾼다 */
const openControls = (page: Page) => page.getByRole("tab", { name: "화면 조건" }).click();

const frameConfig = async (page: Page, frameId: string) => {
  const name = await page.getByTestId(`lab-frame-${frameId}`).getAttribute("name");
  expect(name?.startsWith("momentory-lab:")).toBe(true);
  return JSON.parse(name!.slice("momentory-lab:".length)) as Record<string, unknown>;
};

test("기본 주소는 홈 한 화면이고 해시에 상태가 적힌다", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("lab-shell")).toBeVisible();
  await expect(page).toHaveURL(/#\/screens\?route=\/home&dataset=normal&platform=ios/);
  const frame = page.getByTestId("lab-frame-solo");
  await expect(frame).toHaveAttribute("src", "/home");
  expect(await frameConfig(page, "solo")).toMatchObject({
    frameId: "solo",
    datasetId: "normal",
    platform: "ios",
    deviceId: "iphone-16",
    signedIn: true,
    repeatToday: true,
  });
  // 첫 화면 오른쪽에 디자인 편집기가 보인다(갈래 D 의 studio.spec 이 여기서 시작한다)
  await expect(page.getByTestId("design-editor-panel")).toBeVisible();
});

test("라우트 목록은 앱 순서의 접힌 묶음이고, ＋ 로 펼치며 검색된다", async ({ page }) => {
  await page.goto("/");
  const tree = page.getByTestId("route-tree");
  const headings = await tree.locator("[data-section-title]").allTextContents();
  expect(headings).toEqual([
    "진입",
    "소개 (로그인 전)",
    "온보딩 (로그인 뒤)",
    "탭",
    "홈 시트",
    "회고",
    "편지",
    "일기",
    "쉼터 콘텐츠",
    "마이 세부",
  ]);
  // 처음엔 지금 화면(홈)의 묶음 「탭」만 펼쳐져 있다
  await expect(page.getByTestId("route-section-tabs")).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByTestId("route-section-entry")).toHaveAttribute("aria-expanded", "false");
  await expect(tree.locator("[data-route]")).toHaveCount(5);
  await expect(tree.locator('[data-route="/home"]')).toHaveAttribute("aria-current", "page");
  // 머리 줄을 누르면 펼치고, 펼친 묶음은 새로고침해도 남는다
  await page.getByTestId("route-section-letter").click();
  await expect(tree.locator('[data-route="/letter"]')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("route-section-letter")).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: "모두 펼치기" }).click();
  await expect(tree.locator('[data-route="/login"]')).toBeVisible();
  await page.getByRole("button", { name: "모두 접기" }).click();
  await expect(tree.locator("[data-route]")).toHaveCount(0);
  // 검색어가 있으면 접힘을 무시하고 일치하는 묶음만
  await tree.getByRole("searchbox", { name: "화면 검색" }).fill("걱정");
  await expect(tree.locator("[data-route]")).toHaveCount(2);
  await expect(tree.locator('[data-route="/rest/worry-box"]')).toBeVisible();
  await expect(tree.locator("section")).toHaveCount(1);
});

test("로그인 전 화면을 고르면 세션 없는 new-user 프레임으로 다시 뜬다", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("route-section-entry").click();
  await page.locator('[data-route="/login"]').click();
  await expect(page).toHaveURL(/route=\/login&dataset=new-user/);
  await expect(page).toHaveURL(/signedIn=0/);
  await expect(page.getByTestId("lab-frame-solo")).toHaveAttribute("src", "/login");
  expect(await frameConfig(page, "solo")).toMatchObject({ signedIn: false, datasetId: "new-user" });

  // 일반 화면으로 오면 로그인한 normal 로 돌아온다
  await page.locator('[data-route="/report"]').click();
  await expect(page.getByTestId("lab-frame-solo")).toHaveAttribute("src", "/report");
  expect(await frameConfig(page, "solo")).toMatchObject({ signedIn: true, datasetId: "normal" });
});

test("뒤로/앞으로가 레이아웃과 화면을 되돌린다", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-route="/archive"]').click();
  await page.getByRole("tab", { name: "지금 앱과 비교 (A/B)" }).click();
  await expect(page.getByTestId("lab-frame-A")).toBeVisible();
  await expect(page.getByTestId("lab-frame-B")).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/layout=single/);
  await expect(page.getByTestId("lab-frame-solo")).toBeVisible();
  await expect(page.getByTestId("lab-frame-A")).toHaveCount(0);

  await page.goBack();
  await expect(page).toHaveURL(/route=\/home/);
  await page.goForward();
  await page.goForward();
  await expect(page).toHaveURL(/route=\/archive.*layout=ab/);
  await expect(page.getByTestId("lab-frame-B")).toBeVisible();
});

test("해시를 그대로 열면 같은 상태로 돌아온다", async ({ page }) => {
  await page.goto(
    "/#/screens?route=/my/profile&dataset=many&platform=android&device=pixel-8&layout=single&now=2026-11-03T21:30:00%2B09:00&latency=1000&fail=/api/v1/reports&repeat=0&panel=controls",
  );
  expect(await frameConfig(page, "solo")).toMatchObject({
    datasetId: "many",
    platform: "android",
    deviceId: "pixel-8",
    now: "2026-11-03T21:30:00+09:00",
    latencyMs: 1000,
    failPaths: ["/api/v1/reports"],
    repeatToday: false,
  });
  await expect(page.getByLabel("테스트 데이터")).toHaveValue("many");
  await expect(page.getByLabel("오늘 다시 쓰기")).not.toBeChecked();
});

test("A/B — A 는 승인본, B 는 시안 자리 · 같은 라우트와 데이터", async ({ page }) => {
  await page.goto(
    "/#/screens?route=/report&dataset=normal&platform=ios&device=iphone-16&layout=ab",
  );
  const a = await frameConfig(page, "A");
  const b = await frameConfig(page, "B");
  expect(a.designDraftId).toBeNull();
  expect(a.datasetId).toBe(b.datasetId);
  await expect(page.getByTestId("lab-frame-A")).toHaveAttribute("src", "/report");
  await expect(page.getByTestId("lab-frame-B")).toHaveAttribute("src", "/report");
});

test("A/B 는 스스로 설명한다 — 시안이 없으면 B 에 「시안 만들기」, 있으면 이름 · 바꾼 값 수", async ({
  page,
}) => {
  await page.goto(
    "/#/screens?route=/home&dataset=normal&platform=ios&device=iphone-16&layout=ab&panel=controls",
  );
  await expect(page.getByTestId("ab-banner")).toContainText(
    "A는 지금 앱, B는 디자인 편집에서 고친 시안이에요.",
  );
  await expect(page.getByTestId("frame-label-A")).toContainText("A · 지금 앱");
  await expect(page.getByTestId("ab-no-draft")).toContainText("아직 시안이 없어서 A와 똑같아요");
  await page.getByRole("button", { name: "시안 만들기" }).click();
  await expect(page).not.toHaveURL(/panel=controls/);
  await expect(page.getByTestId("design-editor-panel")).toBeVisible();
  await expect(page.getByLabel("시안 이름")).toBeFocused();

  // 시안을 고르면 B 머리에 이름과 바꾼 값 수
  await page.evaluate((value) => localStorage.setItem("momentory.lab.designDrafts", value), DRAFTS);
  await page.goto(
    "/#/screens?route=/home&dataset=normal&platform=ios&device=iphone-16&layout=ab&draft=v",
  );
  await expect(page.getByTestId("frame-label-B")).toContainText("B · 시안 「테스트」");
  await expect(page.getByTestId("draft-change-count")).toHaveText("바꾼 값 1개");
  await expect(page.getByTestId("ab-no-draft")).toHaveCount(0);
  await page.goto(
    "/#/screens?route=/home&dataset=normal&platform=ios&device=iphone-16&layout=ab&draft=e",
  );
  await expect(page.getByTestId("ab-empty-draft")).toContainText(
    "시안 「빈 시안」에 아직 바꾼 값이 없어요",
  );
  // 차이 보기 — B 를 A 위에 겹친다
  await page.getByLabel("겹쳐서 차이 보기").check();
  const a = (await page.getByTestId("lab-frame-A").boundingBox())!;
  const b = (await page.getByTestId("lab-frame-B").boundingBox())!;
  expect(b.x).toBeCloseTo(a.x, 0);
  expect(b.y).toBeCloseTo(a.y, 0);
});

test("레이아웃 탭과 도구줄이 무엇을 하는지 말한다", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("tab", { name: "기기 · 데이터별로 보기" })).toHaveAttribute(
    "title",
    /기기별/,
  );
  await page.getByRole("tab", { name: "기기 · 데이터별로 보기" }).click();
  await expect(page.getByTestId("layout-description")).toHaveText(
    "같은 화면을 기기별(또는 테스트 데이터별)로 한꺼번에 봐요",
  );
  await page.getByRole("button", { name: "테스트 데이터별로 보기" }).click();
  await expect(page).toHaveURL(/matrix=datasets/);
  await expect(page.getByTestId("frame-cell-m-new-user")).toContainText("신규 사용자");
});

test("확대 — 도구줄 한 곳 · 해시에 남고 · 프레임은 기기 크기 그대로 키운다", async ({ page }) => {
  await page.goto(
    "/#/screens?route=/home&dataset=normal&platform=ios&device=iphone-16&layout=single",
  );
  const frame = page.getByTestId("lab-frame-solo");
  await expect(page.getByRole("button", { name: "화면에 맞게" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "150%" }).click();
  await expect(page).toHaveURL(/zoom=1\.5/);
  await expect(frame).toHaveCSS("width", "393px");
  expect((await frame.boundingBox())!.width).toBeCloseTo(393 * 1.5, 0);
  // 셸에 포커스가 있을 때 Ctrl + = / − / 0
  await page.getByTestId("stage-toolbar").click({ position: { x: 2, y: 2 } });
  await page.keyboard.press("Control+Equal");
  await expect(page).toHaveURL(/zoom=1\.75/);
  await page.keyboard.press("Control+Minus");
  await page.keyboard.press("Control+Minus");
  await expect(page).toHaveURL(/zoom=1\.25/);
  await page.keyboard.press("Control+0");
  await expect(page).not.toHaveURL(/zoom=/);
  // 맞춤은 크게도 맞춘다 — 넓은 창이면 100% 보다 크다
  await page.setViewportSize({ width: 1440, height: 1400 });
  await expect.poll(async () => (await frame.boundingBox())!.width).toBeGreaterThan(393 * 1.15);
  // 조작 패널에는 확대 버튼이 없다(한 곳)
  await openControls(page);
  await expect(
    page.getByTestId("controls-panel").getByRole("button", { name: "화면에 맞게" }),
  ).toHaveCount(0);
});

test("양옆 패널을 접고 펴며, 해시에 남는다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "패널 닫기" }).click();
  await expect(page).toHaveURL(/side=0/);
  await expect(page.getByTestId("side-panel")).toBeHidden();
  await expect(page.getByRole("button", { name: "편집 칸 보기" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.getByRole("button", { name: "목록 접기" }).click();
  await expect(page).toHaveURL(/nav=0/);
  await page.reload();
  await expect(page.getByTestId("route-tree")).toBeHidden();
  // 접힌 막대의 탭 이름을 누르면 그 탭으로 열린다
  await page.getByTestId("side-rail").getByRole("button", { name: "화면 조건 열기" }).click();
  await expect(page.getByTestId("controls-panel")).toBeVisible();
  await expect(page).not.toHaveURL(/side=0/);
  await page.getByRole("button", { name: "목록 보기" }).click();
  await expect(page.getByTestId("route-tree")).toBeVisible();
});

test("좁은 창(브라우저 확대)에서는 패널이 서랍이 되고 무대는 360px 아래로 줄지 않는다", async ({
  page,
}) => {
  await page.setViewportSize({ width: 720, height: 600 });
  await page.goto(
    "/#/screens?route=/report&dataset=normal&platform=ios&device=iphone-16&layout=matrix&matrix=datasets",
  );
  await expect(page.getByTestId("lab-shell")).toHaveAttribute("data-narrow", "1");
  await expect(page.getByTestId("route-tree")).toBeHidden();
  expect((await page.getByTestId("stage").boundingBox())!.width).toBeGreaterThanOrEqual(360);
  // 칸 이름은 한 줄(말줄임) — 글자마다 줄바꿈되지 않는다
  for (const label of await page.locator('[data-testid^="frame-label-"] span').all()) {
    const box = (await label.boundingBox())!;
    expect(box.height).toBeLessThan(24);
  }
  await page.getByRole("button", { name: "편집 칸 보기" }).click();
  await expect(page.getByTestId("side-panel")).toBeVisible();
  await page.getByTestId("drawer-backdrop").click({ position: { x: 10, y: 300 } });
  await expect(page.getByTestId("side-panel")).toBeHidden();
  await page.getByRole("button", { name: "목록 보기" }).click();
  await expect(page.getByTestId("route-tree")).toBeVisible();
});

test("글씨 배율 — 작게 0.85 도 고르고 해시 · 프레임 설정에 실린다", async ({ page }) => {
  await page.goto("/");
  await openControls(page);
  await page.getByRole("button", { name: "작게 0.85×" }).click();
  await expect(page).toHaveURL(/scale=0\.85/);
  expect((await frameConfig(page, "solo")).textScale).toBe(0.85);
});

test("하루 넘기기 · 되돌리기 · 지금으로 — 가상 날짜가 보이고 프레임 설정에 실린다", async ({
  page,
}) => {
  await page.goto("/");
  await openControls(page);
  const clock = page.getByTestId("virtual-clock");
  await expect(clock).toContainText("실제 시각");
  await page.getByRole("button", { name: "하루 넘기기 (+1일)" }).click();
  await expect(clock).toContainText("실제보다 +1일");
  await expect(page).toHaveURL(/now=/);
  const shifted = (await frameConfig(page, "solo")).now as string;
  expect(Date.parse(shifted) - Date.now()).toBeGreaterThan(23 * 3600 * 1000);

  await page.getByRole("button", { name: "밤 21:30" }).click();
  await expect(clock).toContainText("21:30 · 실제보다 +1일");
  await page.getByRole("button", { name: "하루 되돌리기 (−1일)" }).click();
  await page.getByRole("button", { name: "하루 되돌리기 (−1일)" }).click();
  await expect(clock).toContainText("21:30 · 실제보다 −1일");

  await page.getByRole("button", { name: "지금 시각으로" }).click();
  await expect(clock).toContainText("실제 시각");
  expect((await frameConfig(page, "solo")).now).toBeNull();
});

test("「오늘 다시 쓰기」와 일기 쓰기 다시 시작", async ({ page }) => {
  await page.goto("/");
  await openControls(page);
  await expect(page).toHaveURL(/panel=controls/);
  await page.getByLabel("오늘 다시 쓰기").uncheck();
  await expect(page).toHaveURL(/repeat=0/);
  expect((await frameConfig(page, "solo")).repeatToday).toBe(false);
  await page.getByRole("button", { name: "일기 쓰기 다시 시작" }).click();
  await expect(page).toHaveURL(/route=\/retro\/confirm/);
  // 오늘 일정은 홈이 받아 둔다 — 새로 띄우되 홈을 거쳐 일정 확인으로 옮긴다
  await expect(page.getByTestId("lab-frame-solo")).toHaveAttribute("src", "/home");
});

test("기기 크기 그대로의 iframe 이 외형 안에 놓이고, 상태바 높이가 기기 값이다", async ({
  page,
}) => {
  const cases = [
    ["ios", "iphone-16", 393, 852, 54],
    ["ios", "iphone-se-3", 375, 667, 20],
    ["android", "pixel-8", 412, 915, 50.29],
  ] as const;
  for (const [platform, device, width, height, statusBar] of cases) {
    await page.goto(
      `/#/screens?route=/home&dataset=normal&platform=${platform}&device=${device}&layout=single&zoom=1`,
    );
    const frame = page.getByTestId("lab-frame-solo");
    const box = await frame.boundingBox();
    expect(box?.width).toBeCloseTo(width, 0);
    expect(box?.height).toBeCloseTo(height, 0);
    const bar = await page.getByTestId("device-status-bar").boundingBox();
    expect(bar?.height).toBeCloseTo(statusBar, 0);
    expect(bar?.y).toBeCloseTo(box!.y, 0);
  }
});

test("전체 화면 — 라우트마다 칸 · 화면 근처만 부팅 · 누르면 한 화면", async ({ page }) => {
  await page.goto(
    "/#/screens?route=/home&dataset=normal&platform=ios&device=iphone-16&layout=grid",
  );
  const cells = page.locator('[data-testid^="grid-cell-"]');
  expect(await cells.count()).toBeGreaterThan(50);
  // 한꺼번에 부팅하지 않는다
  expect(await page.locator("iframe").count()).toBeLessThanOrEqual(4);
  await page.getByRole("button", { name: "로그인 한 화면으로 열기" }).click();
  await expect(page).toHaveURL(/route=\/login.*layout=single/);
  await expect(page.getByTestId("lab-frame-solo")).toHaveAttribute("src", "/login");
});

test("상태별로 보기 — 같은 화면을 상태마다 한 칸씩 · 누르면 그 상태로 한 화면", async ({
  page,
}) => {
  await page.goto("/");
  const tab = page.getByRole("tab", { name: "상태별로 보기" });
  await expect(tab).toHaveAttribute("title", /빈 계정 · 보통 · 많음 · 긴 문구 · 불러오는 중/);
  await page.locator('[data-route="/report"]').click();
  await tab.click();
  await expect(page).toHaveURL(/layout=states/);
  for (const id of ["empty", "normal", "many", "long-copy", "loading"]) {
    await expect(page.getByTestId(`state-cell-${id}`)).toBeVisible();
  }
  expect(await frameConfig(page, "s-many")).toMatchObject({ datasetId: "many", latencyMs: 0 });
  expect(await frameConfig(page, "s-loading")).toMatchObject({
    datasetId: "normal",
    latencyMs: 60_000,
  });
  await page.getByRole("button", { name: "「많음」 상태로 한 화면에서 열기" }).click();
  await expect(page).toHaveURL(/route=\/report&dataset=many.*layout=single/);
  // 한 화면 도구줄에서도 같은 상태를 고른다
  const picker = page.getByTestId("state-picker");
  await expect(picker).toHaveValue("many");
  await picker.selectOption({ label: "불러오는 중" });
  await expect(page).toHaveURL(/dataset=normal.*latency=60000/);
  expect(await frameConfig(page, "solo")).toMatchObject({ latencyMs: 60_000 });
});

test("상태별로 보기 — 로그인 전 화면은 신규 사용자 칸만, 요청이 없으면 그렇다고 알린다", async ({
  page,
}) => {
  await page.goto("/#/screens?route=/login&dataset=new-user&signedIn=0&layout=states");
  await expect(page.getByTestId("state-cell-new-user")).toBeVisible();
  await expect(page.getByTestId("state-cell-empty")).toHaveCount(0);
  expect(await frameConfig(page, "s-new-user")).toMatchObject({ signedIn: false });
});

test("참고 시안 — 오른쪽 탭에서 넣으면 폰 화면 위에 겹치고, R 로 숨기며, 나란히 놓기는 칸을 더한다", async ({
  page,
}) => {
  await page.goto("/#/screens?route=/home&layout=single");
  const tab = page.getByRole("tab", { name: "참고 시안" });
  await expect(tab).toHaveAttribute("title", /겹쳐/);
  await tab.click();
  await expect(page).toHaveURL(/panel=reference/);
  await expect(page.getByTestId("reference-panel")).toBeVisible();
  // 시안 이미지 — 지금 폰 화면을 찍은 것
  const image = await page.getByTestId("device-solo-screen").screenshot();
  await page
    .getByTestId("reference-file-input")
    .setInputFiles({ name: "home-mockup.png", mimeType: "image/png", buffer: image });
  // 기기 화면 상자 안, iframe 과 같은 자리에 겹친다
  const overlay = page.getByTestId("device-solo-screen").getByTestId("reference-overlay");
  await expect(overlay).toBeVisible();
  await expect(overlay).toHaveAttribute("data-mode", "overlay");
  await page.getByRole("radio", { name: "다른 곳만 표시" }).click();
  await expect(overlay).toHaveAttribute("data-mode", "difference");
  // R — 보이기 · 숨기기
  await page.keyboard.press("r");
  await expect(overlay).toHaveCount(0);
  await page.keyboard.press("r");
  await expect(overlay).toHaveCount(1);
  // 옆에 나란히 놓기 — 같은 기기 외형의 칸이 하나 더 · A/B 에서도
  await page.getByRole("radio", { name: "옆에 나란히 놓기" }).click();
  await expect(page.getByTestId("reference-side-cell")).toBeVisible();
  await expect(page.getByTestId("reference-side-phone")).toBeVisible();
  await page.getByRole("tab", { name: "지금 앱과 비교 (A/B)" }).click();
  await expect(page.getByTestId("reference-side-cell")).toBeVisible();
  await page.getByRole("radio", { name: "반투명 겹치기" }).click();
  await expect(page.getByTestId("device-B-screen").getByTestId("reference-overlay")).toBeVisible();
  await expect(page.getByTestId("device-A-screen").getByTestId("reference-overlay")).toHaveCount(0);
});

test.describe("실제 앱 프레임이 필요한 검사 (갈래 A·B 합친 뒤)", () => {
  test.skip(!process.env.LAB_FRAMES, "LAB_FRAMES=1 일 때만 — 프레임 부트스트랩이 있어야 한다");

  test("프레임이 준비되면 목록에 현재 화면 배지가 붙고, 고르면 lab:navigate 로 옮긴다", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("route-badge-solo")).toBeVisible({ timeout: 60_000 });
    await page.locator('[data-route="/archive"]').click();
    await expect(
      page.locator('[data-route="/archive"]').getByTestId("route-badge-solo"),
    ).toBeVisible();
  });

  test("차갑게 열면 다른 곳으로 가는 일기 상세는 보관함을 거쳐 연다", async ({ page }) => {
    await page.goto(
      "/#/screens?route=/diary/%5Bid%5D&dataset=normal&platform=ios&device=iphone-16&layout=single",
    );
    await expect(page.getByTestId("lab-frame-solo")).toHaveAttribute("src", "/archive");
    await expect(
      page.locator('[data-route="/diary/[id]"]').getByTestId("route-badge-solo"),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page).toHaveURL(/route=\/diary\//);
  });

  test("마이 세부는 기본 정보를 거쳐 열어 지금 닉네임이 칸에 들어 있다", async ({ page }) => {
    await page.goto("/#/screens?route=/my/nickname&layout=single");
    await expect(page.getByTestId("lab-frame-solo")).toHaveAttribute("src", "/my/profile");
    const input = page.frameLocator('[data-testid="lab-frame-solo"]').getByLabel("닉네임");
    await expect(input).toHaveValue("모리", { timeout: 60_000 });
  });

  test("상태별로 보기 — 불러오기 실패 칸은 이 화면이 부른 요청을 찾아 실패시킨다", async ({
    page,
  }) => {
    await page.goto("/#/screens?route=/report&layout=states");
    const failure = page.getByTestId("lab-frame-s-failure");
    await expect(failure).toBeAttached({ timeout: 60_000 });
    expect((await frameConfig(page, "s-failure")).failPaths).toContain("/api/v1/reports/weekly");
    await expect(page.getByTestId("state-cell-failure")).toContainText("/reports/weekly");
    await expect(
      page
        .frameLocator('[data-testid="lab-frame-s-failure"]')
        .getByText("리포트를 불러오지 못했어요"),
    ).toBeVisible({ timeout: 60_000 });
  });

  test("A/B 는 진입 가드의 잠깐 거치는 주소에 서로 끌려다니지 않는다", async ({ page }) => {
    await page.goto(
      "/#/screens?route=/report&dataset=normal&platform=ios&device=iphone-16&layout=ab",
    );
    await expect(page.getByTestId("route-badge-A")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("route-badge-B")).toBeVisible({ timeout: 60_000 });
    await page.waitForTimeout(3000);
    await expect(page.locator('[data-route="/report"]').getByTestId("route-badge-A")).toBeVisible();
    await expect(page.locator('[data-route="/report"]').getByTestId("route-badge-B")).toBeVisible();
    await expect(page).toHaveURL(/route=\/report/);
  });

  test("가짜 서버 요청이 조작 패널 맨 아래 「서버 요청 기록」에 쌓인다", async ({ page }) => {
    await page.goto("/");
    await openControls(page);
    const section = page.getByTestId("request-log-section");
    await expect(section).not.toHaveAttribute("open", "");
    await section.locator("summary").click();
    await expect(page.getByTestId("request-log")).toContainText("/api/v1/", { timeout: 60_000 });
  });

  test("실패한 요청은 접힌 머리에 빨간 숫자로 알린다", async ({ page }) => {
    await page.goto(
      "/#/screens?route=/report&dataset=normal&platform=ios&device=iphone-16&layout=single&fail=/api/v1/reports&panel=controls",
    );
    await expect(page.getByTestId("request-log-failed")).toBeVisible({ timeout: 60_000 });
  });

  test("한 화면 + 시안 — 「원래대로 잠깐 보기」를 누르는 동안만 승인본이 보인다", async ({
    page,
  }) => {
    await page.addInitScript((value) => {
      if (window.top === window) localStorage.setItem("momentory.lab.designDrafts", value);
    }, DRAFTS);
    await page.goto(
      "/#/screens?route=/home&dataset=normal&platform=ios&device=iphone-16&layout=single&draft=v",
    );
    const solo = page.getByTestId("lab-frame-solo");
    const base = page.getByTestId("lab-frame-solo-base");
    expect((await frameConfig(page, "solo-base")).designDraftId).toBeNull();
    await expect(page.getByTestId("single-draft-bar")).toContainText(
      "시안 「테스트」 적용 중 · 바꾼 값 1개",
    );
    const button = page.getByRole("button", { name: "원래대로 잠깐 보기" });
    await button.hover();
    await page.mouse.down();
    await expect(solo).not.toBeVisible();
    await expect(base).toBeVisible();
    await page.mouse.up();
    await expect(solo).toBeVisible();
    // 목록에서 화면을 옮기면 숨은 승인본도 따라간다
    await page.locator('[data-route="/archive"]').click();
    await expect
      .poll(() => base.evaluate((el) => (el as HTMLIFrameElement).contentWindow?.location.pathname))
      .toBe("/archive");
  });

  test("돋보기 — 렌즈 안에 같은 화면이 크게 · A/B 는 두 렌즈 · Esc 로 끈다", async ({ page }) => {
    await page.goto(
      "/#/screens?route=/home&dataset=normal&platform=ios&device=iphone-16&layout=ab",
    );
    await expect(page.getByTestId("route-badge-A")).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: "돋보기로 보기" }).click();
    await expect(page.getByTestId("magnifier-note")).toBeVisible();
    const box = (await page.getByTestId("lab-frame-A").boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.move(box.x + box.width / 2 + 4, box.y + box.height / 2 + 4);
    await expect(page.getByTestId("magnifier-lens-A")).toBeVisible();
    await expect(page.getByTestId("magnifier-lens-B")).toBeVisible();
    // 렌즈 안 문서에 앱 글자가 복제돼 있다
    await expect
      .poll(() =>
        page
          .getByTestId("magnifier-lens-A")
          .locator("iframe")
          .evaluate((el) => (el as HTMLIFrameElement).contentDocument?.body?.innerText.length ?? 0),
      )
      .toBeGreaterThan(10);
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("magnifier-layer")).toHaveCount(0);
  });
});
