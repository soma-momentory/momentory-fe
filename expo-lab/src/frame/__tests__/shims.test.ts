import { afterEach, describe, expect, it } from "@jest/globals";
import path from "path";
import { Platform as RealPlatform } from "react-native";

import labAppConfig from "../../../app.config";
import { DEFAULT_FRAME_CONFIG, LAB_API_BASE_URL } from "../../lab-contract";
import { parseShellMessage } from "../messages";
import { getFrameInsets, setFrameConfig } from "../runtime";
import * as appleAuthentication from "../shims/apple-authentication";
import * as calendar from "../shims/calendar";
import * as location from "../shims/location";
import * as notifications from "../shims/notifications";
import Platform from "../shims/platform";
import * as secureStore from "../shims/secure-store";
import { resolveStatusBarStyle } from "../shims/status-bar";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { labShimFor, WEB_SHIMS, shimDir, repoRoot } = require("../metroShims") as {
  labShimFor: (origin: string, moduleName: string) => string | null;
  WEB_SHIMS: Record<string, string>;
  shimDir: string;
  repoRoot: string;
};

afterEach(() => setFrameConfig(null));

describe("metro shim map", () => {
  const appFile = path.join(repoRoot, "src", "lib", "calendar.ts");
  const routeFile = path.join(repoRoot, "app", "(tabs)", "home.tsx");
  const libraryFile = path.join(repoRoot, "node_modules", "expo-router", "build", "index.js");
  const shellFile = path.join(repoRoot, "expo-lab", "src", "App.tsx");

  it("redirects native modules from anywhere but the shims themselves", () => {
    for (const [name, file] of Object.entries(WEB_SHIMS)) {
      expect(labShimFor(appFile, name)).toBe(path.join(shimDir, file));
      expect(labShimFor(libraryFile, name)).toBe(path.join(shimDir, file));
      expect(labShimFor(path.join(shimDir, file), name)).toBeNull();
    }
  });

  it("swaps react-native only for app code", () => {
    const rnShim = path.join(shimDir, "react-native.ts");
    const platformShim = path.join(shimDir, "platform.ts");
    const babelPlatform = "react-native-web/dist/exports/Platform";
    expect(labShimFor(appFile, "react-native")).toBe(rnShim);
    expect(labShimFor(routeFile, "react-native-web")).toBe(rnShim);
    expect(labShimFor(appFile, babelPlatform)).toBe(platformShim);
    expect(labShimFor(routeFile, `${babelPlatform}/index.js`)).toBe(platformShim);
    expect(labShimFor(appFile, "react-native-web/dist/exports/View")).toBeNull();
    expect(labShimFor(libraryFile, "react-native")).toBeNull();
    expect(labShimFor(libraryFile, babelPlatform)).toBeNull();
    expect(labShimFor(shellFile, babelPlatform)).toBeNull();
    expect(labShimFor(platformShim, babelPlatform)).toBeNull();
    expect(labShimFor(rnShim, "react-native")).toBeNull();
    expect(labShimFor(appFile, "react-native-svg")).toBeNull();
  });
});

describe("Platform shim", () => {
  it("is the real platform in the shell", () => {
    expect(Platform.OS).toBe(RealPlatform.OS);
  });

  it("follows the frame platform", () => {
    setFrameConfig({ ...DEFAULT_FRAME_CONFIG, platform: "android", deviceId: "pixel-8" });
    expect(Platform.OS).toBe("android");
    expect(Platform.select({ ios: 1, android: 2, default: 3 })).toBe(2);
    expect(Platform.select({ native: 4, default: 3 })).toBe(4);
    expect(Platform.select({ web: 5, default: 3 })).toBe(3);

    setFrameConfig({ ...DEFAULT_FRAME_CONFIG, platform: "ios" });
    expect(Platform.OS).toBe("ios");
    expect(Platform.select({ ios: 1, android: 2 })).toBe(1);
  });
});

describe("frame runtime", () => {
  it("gives the device's insets only inside a frame", () => {
    expect(getFrameInsets()).toBeNull();
    setFrameConfig({ ...DEFAULT_FRAME_CONFIG, deviceId: "iphone-16-pro" });
    expect(getFrameInsets()).toEqual({ top: 62, bottom: 34, left: 0, right: 0 });
  });
});

describe("OS shims never prompt and always grant", () => {
  it("location is granted at fixed Seoul coordinates", async () => {
    expect((await location.requestForegroundPermissionsAsync()).granted).toBe(true);
    expect(await location.hasServicesEnabledAsync()).toBe(true);
    const position = await location.getCurrentPositionAsync({
      accuracy: location.Accuracy.Balanced,
    });
    expect(position.coords).toMatchObject({ latitude: 37.57, longitude: 126.98 });
  });

  it("notifications record schedules in memory", async () => {
    expect((await notifications.getPermissionsAsync()).granted).toBe(true);
    await notifications.scheduleNotificationAsync({
      identifier: "momentory.reminder.retro",
      content: { title: "t", body: "b" },
      trigger: { type: notifications.SchedulableTriggerInputTypes.DAILY, hour: 21, minute: 30 },
    });
    expect(
      (await notifications.getAllScheduledNotificationsAsync()).map((r) => r.identifier),
    ).toEqual(["momentory.reminder.retro"]);
    await notifications.cancelScheduledNotificationAsync("momentory.reminder.retro");
    expect(await notifications.getAllScheduledNotificationsAsync()).toEqual([]);
  });

  it("calendar is granted and empty", async () => {
    expect((await calendar.getCalendarPermissions()).granted).toBe(true);
    expect(await calendar.getCalendars(calendar.EntityTypes.EVENT)).toEqual([]);
  });

  it("apple sign-in is available only on emulated iOS", async () => {
    setFrameConfig({ ...DEFAULT_FRAME_CONFIG, platform: "android" });
    expect(await appleAuthentication.isAvailableAsync()).toBe(false);
    setFrameConfig({ ...DEFAULT_FRAME_CONFIG, platform: "ios" });
    expect(await appleAuthentication.isAvailableAsync()).toBe(true);
    const credential = await appleAuthentication.signInAsync({ nonce: "n" });
    expect(credential.identityToken).toBe(appleAuthentication.LAB_APPLE_IDENTITY_TOKEN);
    expect(credential.authorizationCode).toBeTruthy();
    expect(credential.user).toBeTruthy();
  });
});

describe("secure store shim", () => {
  it("keeps values per frame", async () => {
    setFrameConfig({ ...DEFAULT_FRAME_CONFIG, frameId: "a" });
    await secureStore.setItemAsync("momentory.session", "A");
    setFrameConfig({ ...DEFAULT_FRAME_CONFIG, frameId: "b" });
    expect(await secureStore.getItemAsync("momentory.session")).toBeNull();
    setFrameConfig({ ...DEFAULT_FRAME_CONFIG, frameId: "a" });
    expect(await secureStore.getItemAsync("momentory.session")).toBe("A");
    await secureStore.deleteItemAsync("momentory.session");
    expect(await secureStore.getItemAsync("momentory.session")).toBeNull();
  });
});

describe("status bar and shell messages", () => {
  it("maps expo-status-bar styles to the shell's two colours", () => {
    expect(resolveStatusBarStyle("light")).toBe("light");
    expect(resolveStatusBarStyle("inverted")).toBe("light");
    expect(resolveStatusBarStyle("dark")).toBe("dark");
    expect(resolveStatusBarStyle("auto")).toBe("dark");
    expect(resolveStatusBarStyle(undefined)).toBe("dark");
  });

  it("accepts only well-formed shell messages", () => {
    expect(parseShellMessage({ type: "lab:navigate", pathname: "/home" })).toEqual({
      type: "lab:navigate",
      pathname: "/home",
    });
    expect(parseShellMessage({ type: "lab:navigate", pathname: "https://x" })).toBeNull();
    expect(parseShellMessage({ type: "lab:reload" })).toEqual({ type: "lab:reload" });
    expect(parseShellMessage({ type: "lab:resetData", extra: 1 })).toEqual({
      type: "lab:resetData",
    });
    expect(parseShellMessage({ type: "lab:ready" })).toBeNull();
    expect(parseShellMessage("lab:reload")).toBeNull();
    expect(parseShellMessage(null)).toBeNull();
  });
});

describe("expo-lab app config", () => {
  it("points the app at the fake server and fills the sign-in placeholders", () => {
    const config = labAppConfig({ config: {} } as Parameters<typeof labAppConfig>[0]);
    expect(config.extra?.apiBaseUrl).toBe(LAB_API_BASE_URL);
    expect(config.extra?.googleWebClientId).toBeTruthy();
  });
});
