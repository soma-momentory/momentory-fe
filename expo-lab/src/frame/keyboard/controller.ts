/**
 * 프레임의 **키보드 상태 하나** — 열고 닫는 판정과, 앱이 듣는 RN `Keyboard` 이벤트를 낸다.
 *
 * 누가 쓰나:
 * - `shims/keyboard.ts` — 앱 코드의 `Keyboard`(addListener · dismiss · isVisible · metrics)
 * - `shims/keyboard-avoiding-view.tsx` — 앱 코드의 `KeyboardAvoidingView`
 * - `keyboard/layer.ts` — 입력칸 포커스로 열고 닫고, 키보드를 그린다 · 셸에 상태를 알린다
 *
 * 셸(프레임 설정 없음)에서는 아무도 `open` 을 부르지 않는다 — 웹의 진짜 `Keyboard` 처럼
 * 늘 닫혀 있다.
 *
 * ## 이벤트 순서 — RN 네이티브 그대로
 *
 * | 플랫폼  | 열 때                                                                  | 닫을 때                     |
 * | ------- | ---------------------------------------------------------------------- | --------------------------- |
 * | iOS     | (다음 틱) WillChangeFrame · WillShow → (250ms) → DidChangeFrame · DidShow | 같은 순서로 Hide         |
 * | Android | (애니메이션이 끝나면) DidShow — `duration: 0`                             | DidHide — `height: 0`    |
 *
 * `isVisible()` · `metrics()` 는 RN 처럼 **DidShow 뒤부터 DidHide 전까지**다.
 */
import {
  ANDROID_KEYBOARD_DURATION_MS,
  IOS_KEYBOARD_DURATION_MS,
  type KeyboardSpec,
} from "./heights";

export type KeyboardEventName =
  | "keyboardWillShow"
  | "keyboardDidShow"
  | "keyboardWillHide"
  | "keyboardDidHide"
  | "keyboardWillChangeFrame"
  | "keyboardDidChangeFrame";

export type KeyboardMetrics = { screenX: number; screenY: number; width: number; height: number };

export type LabKeyboardEvent = {
  duration: number;
  easing: "keyboard";
  endCoordinates: KeyboardMetrics;
  startCoordinates?: KeyboardMetrics;
  isEventFromThisApp?: boolean;
};

export type KeyboardListener = (event: LabKeyboardEvent) => void;
export type Subscription = { remove: () => void };

/** 지금 프레임의 판 — 열 때마다 새로 읽는다(창 크기가 바뀌었을 수 있다) */
export type KeyboardEnv = {
  platform: "ios" | "android";
  spec: KeyboardSpec;
  screenWidth: number;
  screenHeight: number;
};

/** 그림 · 셸 알림이 듣는 상태. `open` 은 **가려는 쪽**이다(애니메이션 시작 순간 바뀐다) */
export type KeyboardVisualState = {
  open: boolean;
  /** 화면 바닥 → 키보드 윗변(pt/dp). 닫혀 있으면 0 */
  height: number;
  durationMs: number;
  spec: KeyboardSpec | null;
  /** 누가 열었나 — 셸이 강제로 연 키보드는 포커스가 빠져도 닫히지 않는다 */
  source: OpenSource | null;
};

export type OpenSource = "focus" | "shell";

type Timers = {
  set: (fn: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
};

const defaultTimers: Timers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export type KeyboardController = ReturnType<typeof createKeyboardController>;

export function createKeyboardController(
  getEnv: () => KeyboardEnv | null,
  timers: Timers = defaultTimers,
) {
  const listeners = new Map<KeyboardEventName, Set<KeyboardListener>>();
  const visualListeners = new Set<(state: KeyboardVisualState) => void>();

  let target: { env: KeyboardEnv; source: OpenSource } | null = null;
  /** DidShow 가 지난 키보드(RN `Keyboard._currentlyShowing`) */
  let shown: LabKeyboardEvent | null = null;
  let pending: unknown = null;

  const emit = (name: KeyboardEventName, event: LabKeyboardEvent) => {
    for (const listener of [...(listeners.get(name) ?? [])]) listener(event);
  };

  let lastEnv: KeyboardEnv | null = null;

  const durationOf = (env: KeyboardEnv | null) =>
    env?.platform === "android" ? ANDROID_KEYBOARD_DURATION_MS : IOS_KEYBOARD_DURATION_MS;

  const visualState = (): KeyboardVisualState => ({
    open: target != null,
    height: target?.env.spec.total ?? 0,
    durationMs: durationOf(target?.env ?? lastEnv),
    spec: (target?.env ?? lastEnv)?.spec ?? null,
    source: target?.source ?? null,
  });

  const notifyVisual = () => {
    const state = visualState();
    for (const listener of [...visualListeners]) listener(state);
  };

  const openFrame = (env: KeyboardEnv): KeyboardMetrics => ({
    screenX: 0,
    screenY: env.screenHeight - env.spec.total,
    width: env.screenWidth,
    height: env.spec.eventHeight,
  });

  /** iOS 는 닫힌 키보드를 화면 밖(아래)에 같은 높이로 둔다. Android 는 높이 0 */
  const closedFrame = (env: KeyboardEnv): KeyboardMetrics =>
    env.platform === "ios"
      ? { screenX: 0, screenY: env.screenHeight, width: env.screenWidth, height: env.spec.total }
      : { screenX: 0, screenY: env.screenHeight, width: env.screenWidth, height: 0 };

  const showEvent = (env: KeyboardEnv): LabKeyboardEvent =>
    env.platform === "ios"
      ? {
          duration: IOS_KEYBOARD_DURATION_MS,
          easing: "keyboard",
          startCoordinates: closedFrame(env),
          endCoordinates: openFrame(env),
          isEventFromThisApp: true,
        }
      : { duration: 0, easing: "keyboard", endCoordinates: openFrame(env) };

  const hideEvent = (env: KeyboardEnv): LabKeyboardEvent =>
    env.platform === "ios"
      ? {
          duration: IOS_KEYBOARD_DURATION_MS,
          easing: "keyboard",
          startCoordinates: openFrame(env),
          endCoordinates: closedFrame(env),
          isEventFromThisApp: true,
        }
      : { duration: 0, easing: "keyboard", endCoordinates: closedFrame(env) };

  const cancelPending = () => {
    if (pending != null) timers.clear(pending);
    pending = null;
  };

  /** 앱이 이번 열림을 들었나(iOS Will · Android DidShow 가 나갔나) — 못 들었으면 닫힘도 알리지 않는다 */
  let announced = false;

  /**
   * 이벤트는 **다음 틱부터** 낸다 — 네이티브 이벤트는 다리를 건너 비동기로 JS 에 온다. 입력칸이
   * `autoFocus` 로 포커스를 잡는 순간(자식 effect)은 그 화면의 `KeyboardAvoidingView` 가 아직
   * 구독하기 전(부모 componentDidMount)이라, 같은 틱에 내면 iOS 의 Will 을 놓친다.
   */
  const animate = (env: KeyboardEnv, event: LabKeyboardEvent, phase: "Show" | "Hide") => {
    pending = timers.set(() => {
      pending = null;
      if (env.platform === "ios") {
        announced = phase === "Show";
        emit("keyboardWillChangeFrame", event);
        emit(`keyboardWill${phase}`, event);
      }
      pending = timers.set(() => {
        pending = null;
        shown = phase === "Show" ? event : null;
        announced = phase === "Show";
        if (env.platform === "ios") emit("keyboardDidChangeFrame", event);
        emit(`keyboardDid${phase}`, event);
      }, durationOf(env));
    }, 0);
  };

  function open(source: OpenSource = "focus"): boolean {
    if (target != null) {
      // 이미 열렸다 — 셸이 강제로 연 것이면 그 표시만 남긴다(포커스가 빠져도 안 닫히게)
      if (source === "shell" && target.source !== "shell") {
        target = { ...target, source };
        notifyVisual();
      }
      return false;
    }
    const env = getEnv();
    if (env == null) return false;
    cancelPending();
    target = { env, source };
    lastEnv = env;
    notifyVisual();
    animate(env, showEvent(env), "Show");
    return true;
  }

  function close(): boolean {
    if (target == null) return false;
    const { env } = target;
    cancelPending();
    target = null;
    notifyVisual();
    if (announced || shown != null) animate(env, hideEvent(env), "Hide");
    return true;
  }

  return {
    open,
    close,
    /** 가려는 쪽이 열림인가(애니메이션 중 포함) */
    isOpen: () => target != null,
    /** 누가 열었나. 닫혔으면 `null` */
    openedBy: (): OpenSource | null => target?.source ?? null,
    /** RN `Keyboard.isVisible()` — DidShow 뒤부터 DidHide 전까지 */
    isVisible: () => shown != null,
    /** RN `Keyboard.metrics()` */
    metrics: (): KeyboardMetrics | undefined => shown?.endCoordinates,
    visualState,
    addListener(name: KeyboardEventName, listener: KeyboardListener): Subscription {
      const set = listeners.get(name) ?? new Set();
      listeners.set(name, set);
      set.add(listener);
      return { remove: () => set.delete(listener) };
    },
    removeAllListeners(name?: KeyboardEventName) {
      if (name) listeners.delete(name);
      else listeners.clear();
    },
    listenerCount: (name: KeyboardEventName) => listeners.get(name)?.size ?? 0,
    /** 그림 · 셸 알림용. 끊는 함수를 돌려준다 */
    onVisualChange(listener: (state: KeyboardVisualState) => void): () => void {
      visualListeners.add(listener);
      return () => visualListeners.delete(listener);
    },
  };
}
