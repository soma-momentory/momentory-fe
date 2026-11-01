import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, render, screen } from "@testing-library/react-native";
import path from "path";
import { StyleSheet, Text } from "react-native";

import { DEFAULT_FRAME_CONFIG } from "../../lab-contract";
import { findDevice, labDevices, type LabDevice } from "../../lab-devices";
import { frameKeyboard } from "../keyboard";
import {
  createKeyboardController,
  type KeyboardEnv,
  type KeyboardEventName,
  type LabKeyboardEvent,
} from "../keyboard/controller";
import { typeJamo } from "../keyboard/hangul";
import { keyboardSpecFor, MEASURED_KEYBOARD_DEVICE_IDS } from "../keyboard/heights";
import { layoutKeyboard } from "../keyboard/layout";
import { emulateScreenAsWindow } from "../keyboard/screen";
import { parseKeyboardMessage } from "../messages";
import { setFrameConfig } from "../runtime";
import Keyboard from "../shims/keyboard";
import KeyboardAvoidingView, { relativeKeyboardHeight } from "../shims/keyboard-avoiding-view";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { labShimFor, shimDir, repoRoot } = require("../metroShims") as {
  labShimFor: (origin: string, moduleName: string) => string | null;
  shimDir: string;
  repoRoot: string;
};

const ALL_EVENTS: KeyboardEventName[] = [
  "keyboardWillChangeFrame",
  "keyboardWillShow",
  "keyboardDidChangeFrame",
  "keyboardDidShow",
  "keyboardWillHide",
  "keyboardDidHide",
];

const envFor = (deviceId: string): KeyboardEnv => {
  const device = findDevice(deviceId);
  return {
    platform: device.platform,
    spec: keyboardSpecFor(device),
    screenWidth: device.width,
    screenHeight: device.height,
  };
};

function recorder(env: KeyboardEnv) {
  const controller = createKeyboardController(() => env);
  const seen: [KeyboardEventName, LabKeyboardEvent][] = [];
  for (const name of ALL_EVENTS) controller.addListener(name, (e) => seen.push([name, e]));
  return { controller, seen, names: () => seen.map(([name]) => name) };
}

describe("keyboard heights", () => {
  it("has a measured or sourced entry for every Lab device", () => {
    for (const device of labDevices) {
      const spec = keyboardSpecFor(device);
      // 표에 없는 기기(예: 갤럭시)는 규칙으로 계산한다 — 그렇다고 출처에 밝혀야 한다
      if (!MEASURED_KEYBOARD_DEVICE_IDS.includes(device.id as never)) {
        expect(spec.source).toContain("확인하지 않았다");
      }
      expect(spec.style).toBe(device.platform);
      expect(spec.total).toBeCloseTo(spec.suggestionBar + spec.keys + spec.bottomArea, 5);
      expect(spec.total).toBeGreaterThan(250);
      expect(spec.total).toBeLessThan(device.height / 2);
      expect(spec.source).toBeTruthy();
    }
  });

  it("matches the known iOS frames and the measured Pixel 8 Gboard", () => {
    expect(keyboardSpecFor("iphone-se-3").total).toBe(260);
    expect(keyboardSpecFor("iphone-13-mini").total).toBe(335);
    expect(keyboardSpecFor("iphone-16").total).toBe(336);
    expect(keyboardSpecFor("iphone-16-plus").total).toBe(346);
    const pixel = keyboardSpecFor("pixel-8");
    expect(pixel.total).toBeCloseTo(336.38, 2);
    // RN Android 의 height 는 내비게이션 자리를 뺀다
    expect(pixel.eventHeight).toBeCloseTo(312.38, 2);
    expect(keyboardSpecFor("iphone-16").eventHeight).toBe(336);
  });

  it("gives unknown devices a rule-based keyboard", () => {
    const galaxy: LabDevice = {
      ...findDevice("pixel-8"),
      id: "galaxy-s25",
      width: 360,
      height: 780,
      insets: { top: 32, bottom: 48, left: 0, right: 0 },
    };
    const spec = keyboardSpecFor(galaxy);
    expect(spec.style).toBe("android");
    expect(spec.total).toBeCloseTo(312.38 + 48, 2);
    expect(spec.eventHeight).toBeCloseTo(312.38, 2);
    expect(spec.source).toContain("확인하지 않았다");

    const wideIphone: LabDevice = {
      ...findDevice("iphone-16"),
      id: "iphone-17-pro-max",
      width: 440,
    };
    expect(keyboardSpecFor(wideIphone).total).toBe(346);
  });
});

describe("keyboard controller", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("emits iOS Will → Did events with native payloads", () => {
    const env = envFor("iphone-16");
    const { controller, seen, names } = recorder(env);
    expect(controller.open()).toBe(true);
    expect(names()).toEqual([]); // 네이티브처럼 다음 틱에 온다
    jest.advanceTimersByTime(0);
    expect(names()).toEqual(["keyboardWillChangeFrame", "keyboardWillShow"]);
    expect(controller.isVisible()).toBe(false);
    const [, willShow] = seen[1]!;
    expect(willShow).toEqual({
      duration: 250,
      easing: "keyboard",
      isEventFromThisApp: true,
      startCoordinates: { screenX: 0, screenY: 852, width: 393, height: 336 },
      endCoordinates: { screenX: 0, screenY: 852 - 336, width: 393, height: 336 },
    });

    jest.advanceTimersByTime(250);
    expect(names().slice(2)).toEqual(["keyboardDidChangeFrame", "keyboardDidShow"]);
    expect(controller.isVisible()).toBe(true);
    expect(controller.metrics()).toEqual(willShow.endCoordinates);

    expect(controller.open()).toBe(false); // 이미 열렸다
    controller.close();
    jest.advanceTimersByTime(0);
    expect(names().slice(4)).toEqual(["keyboardWillChangeFrame", "keyboardWillHide"]);
    expect(seen[5]![1].endCoordinates).toEqual({
      screenX: 0,
      screenY: 852,
      width: 393,
      height: 336,
    });
    expect(controller.isVisible()).toBe(true); // DidHide 전까지는 보인다(RN 그대로)
    jest.advanceTimersByTime(250);
    expect(names().slice(6)).toEqual(["keyboardDidChangeFrame", "keyboardDidHide"]);
    expect(controller.isVisible()).toBe(false);
    expect(controller.metrics()).toBeUndefined();
  });

  it("emits only Did events on Android, like RN's ReactRootView", () => {
    const { controller, seen, names } = recorder(envFor("pixel-8"));
    controller.open();
    expect(names()).toEqual([]);
    jest.advanceTimersByTime(250);
    expect(names()).toEqual(["keyboardDidShow"]);
    const end = seen[0]![1].endCoordinates;
    expect(seen[0]![1].duration).toBe(0);
    expect(end.height).toBeCloseTo(312.38, 2);
    // 윗변은 내비 자리까지 포함한 높이로 잰다 — 화면 높이 - screenY = 336.38
    expect(915 - end.screenY).toBeCloseTo(336.38, 2);
    controller.close();
    jest.advanceTimersByTime(250);
    expect(names()).toEqual(["keyboardDidShow", "keyboardDidHide"]);
    expect(seen[1]![1].endCoordinates).toMatchObject({ height: 0, screenY: 915 });
  });

  it("tells the app nothing when Android closes before DidShow", () => {
    const { controller, names } = recorder(envFor("pixel-8"));
    controller.open();
    jest.advanceTimersByTime(100);
    controller.close();
    jest.advanceTimersByTime(500);
    expect(names()).toEqual([]);
  });

  it("cancels a pending show when closed mid-animation", () => {
    const { controller, names } = recorder(envFor("iphone-16"));
    controller.open();
    jest.advanceTimersByTime(100);
    controller.close();
    jest.advanceTimersByTime(500);
    expect(names()).toEqual([
      "keyboardWillChangeFrame",
      "keyboardWillShow",
      "keyboardWillChangeFrame",
      "keyboardWillHide",
      "keyboardDidChangeFrame",
      "keyboardDidHide",
    ]);
  });

  it("does nothing without a frame, and tracks who opened it", () => {
    const shell = createKeyboardController(() => null);
    expect(shell.open()).toBe(false);
    expect(shell.isOpen()).toBe(false);

    const { controller } = recorder(envFor("iphone-16"));
    const states: boolean[] = [];
    controller.onVisualChange((s) => states.push(s.open));
    controller.open("focus");
    controller.open("shell");
    expect(controller.openedBy()).toBe("shell");
    controller.close();
    expect(states).toEqual([true, true, false]);
  });
});

describe("Keyboard shim", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    frameKeyboard.close();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    setFrameConfig(null);
  });

  it("is inert in the shell and forwards frame events to listeners", () => {
    expect(Keyboard.isVisible()).toBe(false);
    expect(frameKeyboard.open()).toBe(false);

    setFrameConfig({ ...DEFAULT_FRAME_CONFIG, platform: "ios", deviceId: "iphone-se-3" });
    const shown: LabKeyboardEvent[] = [];
    const ctx = { tag: "ctx" };
    const subscription = Keyboard.addListener(
      "keyboardDidShow",
      function (this: typeof ctx, e: LabKeyboardEvent) {
        expect(this.tag).toBe("ctx");
        shown.push(e);
      },
      ctx,
    );
    frameKeyboard.open();
    jest.advanceTimersByTime(250);
    expect(shown).toHaveLength(1);
    expect(shown[0]!.endCoordinates.height).toBe(260);
    expect(Keyboard.isVisible()).toBe(true);
    expect(Keyboard.metrics()?.height).toBe(260);

    Keyboard.dismiss();
    jest.advanceTimersByTime(250);
    expect(Keyboard.isVisible()).toBe(false);
    subscription.remove();
    Keyboard.removeAllListeners("keyboardDidShow");
    expect(frameKeyboard.listenerCount("keyboardDidShow")).toBe(0);
  });
});

describe("KeyboardAvoidingView shim", () => {
  const frame = { x: 0, y: 103, width: 393, height: 749 };
  const keyboard = { screenX: 0, screenY: 516, width: 393, height: 336 };

  it("computes RN's overlap for each behavior", () => {
    expect(relativeKeyboardHeight("padding", frame, keyboard)).toBe(336);
    expect(relativeKeyboardHeight("padding", frame, keyboard, 16)).toBe(352);
    expect(relativeKeyboardHeight("position", frame, keyboard)).toBe(336);
    // height 는 자기가 이미 줄인 만큼을 되돌려 잰다
    expect(relativeKeyboardHeight("height", { ...frame, height: 413 }, keyboard, 0, 336)).toBe(336);
    expect(relativeKeyboardHeight("padding", { ...frame, height: 300 }, keyboard)).toBe(0);
    expect(relativeKeyboardHeight("padding", null, keyboard)).toBe(0);
    expect(relativeKeyboardHeight("padding", frame, null)).toBe(0);
  });

  describe("rendered", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      setFrameConfig({ ...DEFAULT_FRAME_CONFIG, platform: "ios", deviceId: "iphone-16" });
      Object.assign(globalThis, { innerWidth: 393, innerHeight: 852 });
    });
    afterEach(async () => {
      await act(async () => {
        frameKeyboard.close();
        jest.runOnlyPendingTimers();
      });
      jest.useRealTimers();
      setFrameConfig(null);
    });

    const layout = (height = 749, y = 103) => ({
      nativeEvent: { layout: { x: 0, y, width: 393, height } },
    });

    const styleOf = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);
    const layoutTo = (testID: string, height: number, y: number) =>
      act(async () => {
        screen.getByTestId(testID).props.onLayout(layout(height, y));
      });
    const openKeyboard = () =>
      act(async () => {
        frameKeyboard.open();
        jest.advanceTimersByTime(0);
      });

    it("adds bottom padding on keyboardWillShow (iOS) and removes it on hide", async () => {
      await render(
        <KeyboardAvoidingView testID="kav" behavior="padding" keyboardVerticalOffset={16}>
          <Text>child</Text>
        </KeyboardAvoidingView>,
      );
      await layoutTo("kav", 749, 103);
      await openKeyboard();
      // 852 - 336 = 516 → 103 + 749 - (516 - 16) = 352
      expect(styleOf("kav")).toMatchObject({ paddingBottom: 352 });
      await act(async () => {
        frameKeyboard.close();
        jest.advanceTimersByTime(0);
      });
      expect(styleOf("kav")).toMatchObject({ paddingBottom: 0 });
    });

    it("shrinks height and raises position content", async () => {
      await render(
        <>
          <KeyboardAvoidingView testID="h" behavior="height" style={{ flex: 1 }}>
            <Text>h</Text>
          </KeyboardAvoidingView>
          <KeyboardAvoidingView testID="p" behavior="position" contentContainerStyle={{ flex: 1 }}>
            <Text testID="p-child">p</Text>
          </KeyboardAvoidingView>
          <KeyboardAvoidingView testID="off" behavior="padding" enabled={false}>
            <Text>off</Text>
          </KeyboardAvoidingView>
        </>,
      );
      await layoutTo("h", 852, 0);
      await layoutTo("p", 852, 0);
      await layoutTo("off", 852, 0);
      await openKeyboard();
      expect(styleOf("h")).toMatchObject({ height: 852 - 336, flex: 0 });
      const inner = screen.getByTestId("p").children[0] as unknown as { props: { style: unknown } };
      expect(StyleSheet.flatten(inner.props.style as never)).toMatchObject({ bottom: 336 });
      expect(styleOf("off")).toMatchObject({ paddingBottom: 0 });
    });

    it("listens to Did events on emulated Android", async () => {
      setFrameConfig({ ...DEFAULT_FRAME_CONFIG, platform: "android", deviceId: "pixel-8" });
      Object.assign(globalThis, { innerWidth: 412, innerHeight: 915 });
      await render(
        <KeyboardAvoidingView testID="kav" behavior="padding">
          <Text>child</Text>
        </KeyboardAvoidingView>,
      );
      await layoutTo("kav", 915, 0);
      await openKeyboard();
      expect(styleOf("kav")).toMatchObject({ paddingBottom: 0 }); // DidShow 전
      await act(async () => {
        jest.advanceTimersByTime(250);
      });
      expect(styleOf("kav").paddingBottom).toBeCloseTo(336.38, 2);
    });
  });
});

describe("metro routes Keyboard only for app code", () => {
  const appFile = path.join(repoRoot, "src", "components", "ds", "ChatScaffold.tsx");
  const libraryFile = path.join(repoRoot, "node_modules", "expo-router", "build", "index.js");

  it("swaps the babel-split exports", () => {
    expect(labShimFor(appFile, "react-native-web/dist/exports/Keyboard")).toBe(
      path.join(shimDir, "keyboard.ts"),
    );
    expect(labShimFor(appFile, "react-native-web/dist/cjs/exports/KeyboardAvoidingView")).toBe(
      path.join(shimDir, "keyboard-avoiding-view.tsx"),
    );
    expect(labShimFor(libraryFile, "react-native-web/dist/exports/Keyboard")).toBeNull();
    expect(
      labShimFor(path.join(shimDir, "keyboard.ts"), "react-native-web/dist/exports/Keyboard"),
    ).toBeNull();
    expect(labShimFor(appFile, "react-native-web/dist/exports/toString")).toBeNull();
  });
});

describe("keyboard drawing helpers", () => {
  it("composes 두벌식 jamo like an IME", () => {
    const typed = (keys: string) => [...keys].reduce((text, jamo) => typeJamo(text, jamo), "");
    expect(typed("ㅎㅏㄴㄱㅡㄹ")).toBe("한글");
    expect(typed("ㄷㅏㄹㄱㅇㅣ")).toBe("닭이");
    expect(typed("ㄱㅗㅏㅇ")).toBe("광");
    expect(typed("ㅇㅏㄴㅈㅇㅏ")).toBe("앉아");
    expect(typed("ㅂㅏㄹㄱㅏ")).toBe("발가");
    expect(typed("ㄸㅏㄸ")).toBe("따ㄸ");
    expect(typeJamo("a", "ㅏ")).toBe("aㅏ");
  });

  it("lays out the Korean keyboards within the keyboard box", () => {
    for (const deviceId of ["iphone-se-3", "iphone-16", "iphone-16-plus", "pixel-8"]) {
      const device = findDevice(deviceId);
      const spec = keyboardSpecFor(device);
      const layout = layoutKeyboard(spec, device.width, { enterKeyHint: "send" });
      const chars = layout.keys.filter((k) => k.kind === "char").map((k) => k.label);
      expect(chars.join("")).toContain("ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔㅁㄴㅇㄹㅎㅗㅓㅏㅣㅋㅌㅊㅍㅠㅜㅡ");
      for (const key of layout.keys) {
        expect(key.x).toBeGreaterThanOrEqual(0);
        expect(key.x + key.width).toBeLessThanOrEqual(device.width + 0.01);
        expect(key.y + key.height).toBeLessThanOrEqual(spec.total + 0.01);
      }
      const enter = layout.keys.find((k) => k.kind === "enter")!;
      expect(enter.accent).toBe(true);
    }
    const shifted = layoutKeyboard(keyboardSpecFor("iphone-16"), 393, { shift: true });
    expect(shifted.keys.slice(0, 5).map((k) => k.label)).toEqual(["ㅃ", "ㅉ", "ㄸ", "ㄲ", "ㅆ"]);
    expect(
      layoutKeyboard(keyboardSpecFor("iphone-16"), 393).keys.find((k) => k.kind === "enter"),
    ).toMatchObject({ label: "return", accent: false });
  });

  it("reports the screen as the window", () => {
    const metrics = (height: number) => ({ width: 393, height, scale: 3, fontScale: 1 });
    let handler:
      | ((d: { window?: ReturnType<typeof metrics>; screen?: ReturnType<typeof metrics> }) => void)
      | null = null;
    const dims = {
      get: (d: "window" | "screen") => metrics(d === "window" ? 852 : 1080),
      addEventListener: (_: "change", h: typeof handler) => {
        handler = h;
      },
    };
    emulateScreenAsWindow(dims);
    expect(dims.get("screen").height).toBe(852);
    const seen: number[] = [];
    dims.addEventListener("change", (d) => seen.push(d.screen!.height));
    handler!({ window: metrics(800), screen: metrics(1080) });
    expect(seen).toEqual([800]);
  });

  it("accepts only well-formed keyboard messages", () => {
    expect(parseKeyboardMessage({ type: "lab:keyboard", open: true })).toEqual({
      type: "lab:keyboard",
      open: true,
    });
    expect(parseKeyboardMessage({ type: "lab:keyboard", open: "yes" })).toBeNull();
    expect(parseKeyboardMessage({ type: "lab:reload" })).toBeNull();
  });
});
