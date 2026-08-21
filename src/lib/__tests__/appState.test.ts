import { AppState, type AppStateStatus } from "react-native";

import { onForeground } from "@/lib/appState";

/** 등록된 구독의 핸들러 — 테스트가 상태 전이를 직접 흘려보낸다 */
let handlers: ((state: AppStateStatus) => void)[] = [];
const remove = jest.fn();

const at = (state: AppStateStatus) => {
  (AppState as { currentState: AppStateStatus }).currentState = state;
};

const change = (...states: AppStateStatus[]) => {
  for (const state of states) for (const handler of handlers) handler(state);
};

beforeEach(() => {
  handlers = [];
  remove.mockClear();
  at("active");
  jest.spyOn(AppState, "addEventListener").mockImplementation(((
    _type: string,
    handler: (state: AppStateStatus) => void,
  ) => {
    handlers.push(handler);
    return { remove };
  }) as never);
});

afterEach(() => jest.restoreAllMocks());

describe("onForeground", () => {
  it("백그라운드에 있다가 돌아오면 부른다 — Android 의 전이", () => {
    const back = jest.fn();
    onForeground(back);

    change("background", "active");

    expect(back).toHaveBeenCalledTimes(1);
  });

  it("iOS 처럼 inactive 를 거쳐 돌아와도 **한 번** 부른다", () => {
    // active → inactive → background → inactive → active. `background` 만 보면
    // 돌아오는 길의 직전 상태가 `inactive` 라 영영 안 불린다
    const back = jest.fn();
    onForeground(back);

    change("inactive", "background", "inactive", "active");

    expect(back).toHaveBeenCalledTimes(1);
  });

  it("앞에 있는 앱에 대고 다시 부르지 않는다", () => {
    const back = jest.fn();
    onForeground(back);

    change("active", "active");

    expect(back).not.toHaveBeenCalled();
  });

  it("앱이 백그라운드에서 시작했다면 첫 active 도 복귀다", () => {
    at("background");
    const back = jest.fn();
    onForeground(back);

    change("active");

    expect(back).toHaveBeenCalledTimes(1);
  });

  it("여러 번 오가면 그때마다 부른다", () => {
    const back = jest.fn();
    onForeground(back);

    change("background", "active", "background", "active");

    expect(back).toHaveBeenCalledTimes(2);
  });

  it("해제하면 구독을 걷는다", () => {
    const stop = onForeground(jest.fn());

    stop();

    expect(remove).toHaveBeenCalledTimes(1);
  });
});
