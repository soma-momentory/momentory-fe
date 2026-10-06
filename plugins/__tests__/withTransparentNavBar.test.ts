import { NAV_BAR_ITEMS } from "../withTransparentNavBar";

/**
 * 3버튼 내비게이션 바가 흰 막으로 덮이지 않게 하는 두 값(`withTransparentNavBar` 머리말).
 * 하나만 남으면 막이 되살아나거나, 막은 걷혔는데 밝은 바탕 위에 흰 버튼이 그려져 안 보인다.
 */
describe("withTransparentNavBar", () => {
  const value = (name: string) => NAV_BAR_ITEMS.find((i) => i.name === name)?.value;

  it("시스템 대비 막을 끈다", () => {
    expect(value("android:enforceNavigationBarContrast")).toBe("false");
  });

  it("밝은 바탕이라 버튼을 어둡게 그린다", () => {
    expect(value("android:windowLightNavigationBar")).toBe("true");
  });
});
