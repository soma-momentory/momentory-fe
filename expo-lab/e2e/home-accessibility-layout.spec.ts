import { expect, test } from "@playwright/test";

const widths = [375, 390, 402, 430] as const;
const scales = [1, 1.5] as const;

test("home hero and emotion dock have separate measured bounds", async ({ page }) => {
  await page.goto("/#studio/home-main");
  const preview = page.getByTestId("studio-preview-B");

  for (const scenario of ["일정 없음", "일정 2개", "긴 일정 제목"]) {
    await page.getByRole("button", { name: scenario, exact: true }).click();
    for (const width of widths) {
      await page.getByRole("button", { name: `${width}pt` }).click();
      for (const scale of scales) {
        await page.getByRole("button", { name: `글씨 ${scale}×` }).click();
        const fixed = preview.getByTestId("home-v2-fixed");
        const hero = preview.getByTestId("studio-home-hero");
        const dock = preview.getByTestId("week-dock-stack");
        await expect(hero).toBeVisible();
        await expect(dock).toBeAttached();
        await expect
          .poll(
            async () => {
              const fixedBox = await fixed.boundingBox();
              const dockBox = await dock.boundingBox();
              return fixedBox && dockBox
                ? Math.max(0, fixedBox.y + fixedBox.height - dockBox.y)
                : Number.POSITIVE_INFINITY;
            },
            { message: `${scenario} ${width}pt ${scale}×: fixed content must not cross the dock` },
          )
          .toBeLessThanOrEqual(1);

        const heroBox = await hero.boundingBox();
        const dockBox = await dock.boundingBox();
        expect(heroBox).not.toBeNull();
        expect(dockBox).not.toBeNull();
        expect(
          Math.max(0, heroBox!.y + heroBox!.height - dockBox!.y),
          `${scenario} ${width}pt ${scale}×: actual hero/dock rectangles`,
        ).toBeLessThanOrEqual(1);

        const listViewport = preview.getByTestId("home-v2-list-scroll");
        if (await listViewport.count()) {
          const listBox = await listViewport.boundingBox();
          expect(listBox).not.toBeNull();
          expect(
            Math.max(0, listBox!.y + listBox!.height - dockBox!.y),
            `${scenario} ${width}pt ${scale}×: list viewport must end before the dock`,
          ).toBeLessThanOrEqual(1);
        }
      }
    }
  }
});

test("large text keeps the final schedule reachable after expanding the list", async ({ page }) => {
  await page.goto("/#studio/home-main");
  await page.getByRole("button", { name: "기능 테스트 모드" }).click();
  await page.getByRole("button", { name: "일정 10개 · 접기/펼치기" }).click();
  await page.getByRole("button", { name: "375pt" }).click();
  await page.getByRole("button", { name: "글씨 1.5×" }).click();
  const preview = page.getByTestId("studio-preview-B");
  const scroll = preview.getByTestId("home-v2-body-scroll");
  await expect(scroll).toBeAttached();
  await preview.getByRole("button", { name: /5개 더 보기/ }).click();
  const last = preview.getByText("추가 일정 5");
  await scroll.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(last).toBeInViewport();
});

test("home typography reaches 1.5× without splitting reminder words or crossing Baba", async ({
  page,
}) => {
  await page.goto("/#studio/home-main");
  const preview = page.getByTestId("studio-preview-B");

  for (const width of widths) {
    await page.getByRole("button", { name: `${width}pt` }).click();
    await page.getByRole("button", { name: "글씨 1×" }).click();
    const normal = await preview
      .getByTestId("home-v2-reminder")
      .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
    await page.getByRole("button", { name: "글씨 1.5×" }).click();
    const reminder = preview.getByTestId("home-v2-reminder");
    await expect
      .poll(async () =>
        reminder.evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
      )
      .toBeCloseTo(normal * 1.5, 1);

    const noteBox = await reminder.boundingBox();
    const babaBox = await preview.getByTestId("studio-home-baba").boundingBox();
    expect(noteBox).not.toBeNull();
    expect(babaBox).not.toBeNull();
    expect(
      noteBox!.y + noteBox!.height,
      `${width}pt: reminder ends before Baba`,
    ).toBeLessThanOrEqual(babaBox!.y + 1);

    const splitWords = await reminder.evaluate((element) => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const broken: string[] = [];
      let node = walker.nextNode();
      while (node) {
        const value = node.textContent ?? "";
        for (const match of value.matchAll(/\S+/g)) {
          const range = document.createRange();
          range.setStart(node, match.index);
          range.setEnd(node, match.index + match[0].length);
          if (range.getClientRects().length > 1) broken.push(match[0]);
        }
        node = walker.nextNode();
      }
      return broken;
    });
    expect(splitWords, `${width}pt: reminder words stay intact`).toEqual([]);
  }
});

test("home emotion dock remains usable when text is enlarged", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/#studio/home-main");
  await page.getByRole("button", { name: "감정 하단 고정" }).click();
  await page.getByRole("button", { name: "375pt" }).click();
  await page.getByRole("button", { name: "글씨 1.5×" }).click();
  await page.getByRole("button", { name: "기능 테스트 모드" }).click();
  const preview = page.getByTestId("studio-preview-B");
  const toggle = preview.getByTestId("week-dock-toggle");
  await toggle.scrollIntoViewIfNeeded();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const monday = preview.getByRole("button", { name: /월요일.*불안함/ });
  await monday.click();
  await expect(monday).toHaveAttribute("aria-pressed", "true");
  await expect(preview.getByTestId("week-dock-picked")).toContainText("불안함");
  await toggle.click();
  await expect(preview.getByTestId("week-dock-picked")).toHaveCount(0);
  expect(errors).toEqual([]);
});

for (const [screen, rootId] of [
  ["home-main", "studio-home-hero"],
  ["rest-hub", "studio-rest-root"],
  ["archive", "studio-archive-root"],
] as const) {
  test(`${screen} renders decorative artwork without React accessibility prop errors`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/#studio/${screen}`);
    const preview = page.getByTestId("studio-preview-B");
    await expect(preview.getByTestId(rootId)).toBeVisible();
    await expect.poll(() => preview.locator('[aria-hidden="true"]').count()).toBeGreaterThan(0);
    expect(errors, `${screen} console errors`).toEqual([]);
  });
}
