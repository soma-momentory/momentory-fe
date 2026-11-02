/**
 * 「전 화면」 셸 — 셸만으로 확인되는 것(목록 · 해시 · 레이아웃 · 프레임 설정 · 기기 크기 · 가상 시각).
 *
 * ⚠ 프레임 안에 실제 앱이 뜨는 것(갈래 A 부트스트랩)과 가짜 서버(갈래 B)가 있어야 하는 검사는
 * `LAB_FRAMES=1` 일 때만 돈다 — A·B 가 합쳐지기 전에는 iframe 안이 「앱 프레임 준비 중」이다.
 *
 *   npx playwright test expo-lab/e2e/shell.spec.ts
 */
import { expect, test, type Page } from "@playwright/test";

/** 오른쪽 패널은 처음에 디자인 편집기다 — 조작 패널로 바꾼다 */
const openControls = (page: Page) => page.getByRole("tab", { name: "조작" }).click();

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

test("라우트 목록은 앱 순서로 묶이고 검색된다", async ({ page }) => {
  await page.goto("/");
  const tree = page.getByTestId("route-tree");
  const headings = await tree.locator("h3").allTextContents();
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
  await tree.getByRole("searchbox", { name: "화면 검색" }).fill("걱정");
  await expect(tree.locator("[data-route]")).toHaveCount(2);
  await expect(tree.locator('[data-route="/rest/worry-box"]')).toBeVisible();
});

test("로그인 전 화면을 고르면 세션 없는 new-user 프레임으로 다시 뜬다", async ({ page }) => {
  await page.goto("/");
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
  await page.getByRole("tab", { name: "A/B 비교" }).click();
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
  await expect(page.getByLabel("데이터 세트")).toHaveValue("many");
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

  await page.getByRole("button", { name: "지금으로" }).click();
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
  await expect(page.getByTestId("lab-frame-solo")).toHaveAttribute("src", "/retro/confirm");
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

  test("가짜 서버 요청이 요청 기록에 쌓인다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: /^요청/ }).click();
    await expect(page.getByTestId("request-log")).toContainText("/api/v1/", { timeout: 60_000 });
  });
});
