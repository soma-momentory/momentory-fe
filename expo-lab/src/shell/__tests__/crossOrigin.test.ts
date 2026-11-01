/**
 * 「AI 수정 결과」 미리보기 — 다른 출처(작업 공간의 다른 포트)에 뜬 프레임과 말하는 규칙.
 * 셸 쪽(`frameBus`)과 프레임 쪽(`frame/messages`)의 출처 판정 · 미리보기 프레임 설정을 고정한다.
 */
import { describe, expect, it, jest } from "@jest/globals";

import { isFromShell } from "../../frame/messages";
import { FrameBus, frameOrigin } from "../frameBus";
import { framesFor, withPreview } from "../frameSpecs";
import { DEFAULT_STATE } from "../hashState";

const SHELL = "http://127.0.0.1:8102";
const PREVIEW = "http://localhost:8103";

/** iframe 흉내 — `src` 와 창 하나 */
function fakeFrame(src: string) {
  const contentWindow = { postMessage: jest.fn() };
  const element = {
    src,
    getAttribute: (name: string) => (name === "src" ? src : null),
    contentWindow,
  } as unknown as HTMLIFrameElement;
  return { element, contentWindow };
}

describe("셸 — frameBus 가 다른 출처 프레임과 말한다", () => {
  it("iframe 의 출처는 src 로 정한다 — 상대 주소면 셸 출처", () => {
    expect(frameOrigin(fakeFrame(`${PREVIEW}/home`).element, `${SHELL}/`)).toBe(PREVIEW);
    expect(frameOrigin(fakeFrame("/home").element, `${SHELL}/`)).toBe(SHELL);
  });

  it("같은 출처 메시지는 예전처럼 받는다", () => {
    const bus = new FrameBus();
    expect(bus.accepts({ origin: SHELL, source: null }, "solo", SHELL)).toBe(true);
  });

  it("다른 출처는 그 frameId 로 붙은 iframe 의 창이 보낸 것만 받는다", () => {
    const bus = new FrameBus();
    const b = fakeFrame(`${PREVIEW}/home`);
    const other = fakeFrame(`${PREVIEW}/rest`);
    bus.attach("B", b.element);
    const fromB = { origin: PREVIEW, source: b.contentWindow as unknown as Window };
    const fromOther = { origin: PREVIEW, source: other.contentWindow as unknown as Window };
    expect(bus.accepts(fromB, "B", SHELL)).toBe(true);
    // 다른 창이 B 를 흉내 내거나, 붙지 않은 frameId 를 대면 버린다
    expect(bus.accepts(fromOther, "B", SHELL)).toBe(false);
    expect(bus.accepts(fromB, "A", SHELL)).toBe(false);
    expect(bus.accepts({ origin: PREVIEW, source: null }, "B", SHELL)).toBe(false);
  });

  it("보낼 때는 그 iframe 이 뜬 서버의 출처로 보낸다", () => {
    const bus = new FrameBus();
    const b = fakeFrame(`${PREVIEW}/home`);
    bus.attach("B", b.element);
    // 준비 전이면 보내지 않는다
    expect(bus.post("B", { type: "lab:keyboard", open: true })).toBe(false);
    bus.handle({ type: "lab:ready", frameId: "B", pathname: "/home" });
    expect(bus.post("B", { type: "lab:keyboard", open: true })).toBe(true);
    expect(b.contentWindow.postMessage).toHaveBeenCalledWith(
      { type: "lab:keyboard", open: true },
      PREVIEW,
    );
  });

  it("lab:keyboardState 로 키보드 상태를 들고, 다시 붙으면 닫힌 것으로 돌린다", () => {
    const bus = new FrameBus();
    const b = fakeFrame(`${PREVIEW}/home`);
    bus.attach("B", b.element);
    bus.handle({ type: "lab:keyboardState", frameId: "B", open: true, height: 291 });
    expect(bus.get("B").keyboard).toEqual({ open: true, height: 291 });
    bus.handle({ type: "lab:keyboardState", frameId: "B", open: false, height: 291 });
    expect(bus.get("B").keyboard).toEqual({ open: false, height: 0 });
    bus.handle({ type: "lab:keyboardState", frameId: "B", open: true, height: 291 });
    bus.attach("B", fakeFrame(`${PREVIEW}/home`).element);
    expect(bus.get("B").keyboard.open).toBe(false);
  });
});

describe("프레임 — 셸 메시지를 믿는 기준", () => {
  const parent = { name: "parent" };
  const frameWin = { parent, location: { origin: PREVIEW } };

  it("부모 창이 셸 출처(shellOrigin)에서 보낸 것만 받는다", () => {
    expect(isFromShell({ source: parent, origin: SHELL }, frameWin, SHELL)).toBe(true);
    expect(isFromShell({ source: parent, origin: PREVIEW }, frameWin, SHELL)).toBe(false);
    expect(isFromShell({ source: { other: 1 }, origin: SHELL }, frameWin, SHELL)).toBe(false);
  });

  it("같은 서버 프레임(설정에 shellOrigin 없음 = 자기 출처)은 예전과 같다", () => {
    const same = { parent, location: { origin: SHELL } };
    expect(isFromShell({ source: parent, origin: SHELL }, same, SHELL)).toBe(true);
    expect(isFromShell({ source: parent, origin: PREVIEW }, same, SHELL)).toBe(false);
  });

  it("부모가 없는 창(직접 연 프레임)은 자기 창이 자기 출처로 보낸 것을 받는다", () => {
    const solo: { parent: unknown; location: { origin: string } } = {
      parent: null,
      location: { origin: SHELL },
    };
    solo.parent = solo;
    expect(isFromShell({ source: solo, origin: SHELL }, solo, SHELL)).toBe(true);
    expect(isFromShell({ source: solo, origin: PREVIEW }, solo, SHELL)).toBe(false);
  });
});

describe("미리보기 프레임 설정", () => {
  it("B 자리만 다른 서버에서 — 시안 없이 · 셸 출처를 싣고 · 새 화면이면 그 주소에서 시작", () => {
    const [, b] = framesFor({ ...DEFAULT_STATE, layout: "ab", draft: "v" }, () => ({}), 0);
    const spec = withPreview(
      b!,
      { url: `${PREVIEW}/`, workspaceId: "ws", title: "잠 기록", route: "/rest/sleep-log" },
      SHELL,
    );
    expect(spec.origin).toBe(PREVIEW);
    expect(spec.startPath).toBe("/rest/sleep-log");
    expect(spec.config).toMatchObject({ frameId: "B", designDraftId: null, shellOrigin: SHELL });
    // 원래 B 는 그대로(시안을 건 채)
    expect(b!.config.designDraftId).toBe("v");
    expect(b!.config.shellOrigin).toBeUndefined();
  });
});
