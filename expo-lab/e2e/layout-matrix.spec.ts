/**
 * 기기별로 보기(매트릭스) — 같은 라우트를 표의 기기마다. 데이터 세트별 축은 지웠다(화면 조건의
 * 「화면 상태」로 바꾼다). 셸만으로 확인되는 것(프레임 수 · 설정 · 기기 크기 · 외형)을 본다. 프레임 안의 가로 넘침 검사는 실제 앱이 떠야 하므로 `LAB_FRAMES=1` 에서만.
 */
import { expect, test } from "@playwright/test";

import { labDevices } from "../src/lab-devices";

const config = (name: string | null) =>
  JSON.parse(name!.slice("momentory-lab:".length)) as Record<string, unknown>;

test("기기별 매트릭스 — 표의 모든 기기가 제 크기 · 제 외형으로 뜬다", async ({ page }) => {
  await page.goto(
    "/#/screens?route=/report&dataset=normal&platform=ios&device=iphone-16&layout=matrix&matrix=devices&zoom=0.5",
  );
  for (const device of labDevices) {
    const frame = page.getByTestId(`lab-frame-m-${device.id}`);
    await expect(frame).toHaveAttribute("src", "/report");
    expect(config(await frame.getAttribute("name"))).toMatchObject({
      deviceId: device.id,
      platform: device.platform,
    });
    const style = await frame.evaluate((el) => [el.style.width, el.style.height]);
    expect(style).toEqual([`${device.width}px`, `${device.height}px`]);
    const chrome = await page.getByTestId(`device-m-${device.id}`).getAttribute("data-chrome");
    // Android 는 로컬 SDK 스킨이 있으면 android-skin, 없으면 android(SVG)
    if (device.platform === "android") expect(chrome).toMatch(/^android/);
    else expect(chrome).toBe(device.bottomBar === "home-button" ? "ios-home-button" : "ios");
  }
});

test("옛 데이터 세트별 주소(matrix=datasets)는 기기별로 · 화면 상태는 모든 기기에 함께", async ({
  page,
}) => {
  await page.goto(
    "/#/screens?route=/archive&dataset=many&platform=android&device=pixel-8&layout=matrix&matrix=datasets&zoom=0.4",
  );
  for (const device of labDevices) {
    const frame = page.getByTestId(`lab-frame-m-${device.id}`);
    await expect(frame).toHaveAttribute("src", "/archive");
    expect(config(await frame.getAttribute("name"))).toMatchObject({
      datasetId: "many",
      deviceId: device.id,
    });
  }
  await expect(page.getByTestId("lab-frame-m-new-user")).toHaveCount(0);
  await expect(page).not.toHaveURL(/matrix=/);
});

test.describe("프레임 안 가로 넘침 (갈래 A 합친 뒤)", () => {
  test.skip(!process.env.LAB_FRAMES, "LAB_FRAMES=1 일 때만 — 프레임 부트스트랩이 있어야 한다");

  for (const route of ["/home", "/rest", "/archive", "/my", "/report"]) {
    test(`${route} 는 모든 기기 · 네 글씨 배율에서 가로로 넘치지 않는다`, async ({ page }) => {
      for (const scale of [0.85, 1, 1.3, 1.5]) {
        await page.goto(
          `/#/screens?route=${route}&dataset=long-copy&platform=ios&device=iphone-16&layout=matrix&matrix=devices&zoom=0.4&scale=${scale}`,
        );
        for (const device of labDevices) {
          const frame = page.frameLocator(`[data-testid="lab-frame-m-${device.id}"]`);
          const overflow = await frame
            .locator("body")
            .evaluate((body) => body.scrollWidth - body.clientWidth);
          expect(overflow, `${route} ${device.id} ${scale}×`).toBeLessThanOrEqual(2);
        }
      }
    });
  }
});
