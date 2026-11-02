/**
 * 셸 레이아웃별 관측 — 준비 시각 · DOM 수 · 붙은 프레임 수. 옛 `measure-studio.mjs`(#studio · #atlas)
 * 자리다. 개발 서버의 실행 변동을 포함한 단일 회차 관측이라 속도 개선의 근거로 쓰지 않는다.
 *
 *   node expo-lab/scripts/measure-shell.mjs http://127.0.0.1:8085
 */
import { chromium } from "playwright";

const baseURL = process.argv[2] ?? "http://127.0.0.1:8085";
const layouts = ["single", "ab", "matrix", "grid"];
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const samples = {};
  for (const layout of layouts) {
    await page.goto(
      `${baseURL}/#/screens?route=/home&dataset=normal&platform=ios&device=iphone-16&layout=${layout}`,
      { waitUntil: "domcontentloaded" },
    );
    await page.getByTestId("lab-shell").waitFor();
    const readyMs = await page.evaluate(() => Math.round(performance.now()));
    await page.waitForTimeout(1500);
    samples[layout] = {
      readyMs,
      ...(await page.evaluate(() => ({
        domNodes: document.querySelectorAll("*").length,
        frames: document.querySelectorAll("iframe").length,
      }))),
    };
  }
  console.log(JSON.stringify(samples, null, 2));
} finally {
  await browser.close();
}
