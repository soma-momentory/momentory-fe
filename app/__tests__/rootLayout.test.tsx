import { Children, isValidElement, type ReactElement, type ReactNode } from "react";

import RootLayout from "../_layout";

/**
 * 루트 스택의 **화면별 옵션**이 살아 있는지.
 *
 * 회고는 안쪽 스택(`app/retro/_layout.tsx`)에서 이미 스와이프-백을 껐는데, 회고
 * 한 벌이 **이 루트 스택의 화면 하나**라 바깥 제스처가 따로 살아 있었다 — `talk`
 * 의 슬라이더를 왼쪽 끝에서 오른쪽으로 끌면 대화가 통째로 닫혔다. 안쪽만 고쳐서는
 * 안 닫히는 자리라 여기에 못을 박는다.
 *
 * **그리지 않고 엘리먼트 트리만 읽는다** — 보려는 것이 화면이 아니라 설정이고,
 * 그리는 순간 폰트·스플래시·safe area 를 다 세워야 한다.
 */
jest.mock("expo-router", () => ({
  Stack: Object.assign(() => null, { Screen: () => null }),
}));

jest.mock("@/lib/providers", () => ({ AppProviders: () => null }));

const screenOptions = (tree: ReactNode): Map<string, Record<string, unknown>> => {
  const found = new Map<string, Record<string, unknown>>();

  const walk = (node: ReactNode): void => {
    Children.forEach(node, (child) => {
      if (!isValidElement(child)) return;
      const props = (child as ReactElement<Record<string, unknown>>).props;
      if (typeof props.name === "string" && props.options != null) {
        found.set(props.name, props.options as Record<string, unknown>);
      }
      walk(props.children as ReactNode);
    });
  };

  walk(tree);
  return found;
};

describe("RootLayout", () => {
  const options = screenOptions(RootLayout());

  it("회고는 루트 스택에서도 스와이프-백을 끈다", () => {
    expect(options.get("retro")).toEqual({ gestureEnabled: false });
  });

  it("홈 시트는 투명 모달로 남는다 — 뒤의 홈이 계속 보여야 한다", () => {
    expect(options.get("home")).toMatchObject({ presentation: "transparentModal" });
  });
});
