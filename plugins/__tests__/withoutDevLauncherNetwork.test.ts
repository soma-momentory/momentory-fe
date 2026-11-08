import { withInfoPlist, type ExportedConfig, type InfoPlist } from "expo/config-plugins";

import {
  stripDevLauncherNetworkKeys,
  withoutDevLauncherNetwork,
} from "../withoutDevLauncherNetwork";

/**
 * 이 테스트가 지키는 것은 **운영 바이너리에 개발 도구의 권한 문구가 남지 않는 것**이다.
 *
 * `expo-dev-client` 는 어떤 환경에서 prebuild 하든 `Info.plist` 에 로컬 네트워크 관련
 * 키를 넣는다. 남겨 두면 사용자에게 개발 도구 문구 그대로 권한 안내가 뜨고, 자동
 * 심사가 **쓰지 않는 자원의 일반적인 목적 문구**를 걸고 넘어진다 — Reminders 기본
 * 문구로 이미 한 번 반려됐다(PR #120).
 *
 * 두 층을 본다:
 * 1. `stripDevLauncherNetworkKeys` — 무엇을 지우고 무엇을 남기는가(순수 함수)
 * 2. 플러그인 체인 — **실제 `expo-dev-client` 플러그인과 함께 등록했을 때** 지워지는가.
 *    1.4.0 Build 8 prebuild 에서 1 은 통과하는데 2 가 틀렸다 — mod 가 등록 역순으로 돌아서
 *    맨 뒤에 둔 정리가 dev-client 보다 먼저 돌았다. 그래서 체인까지 고정한다.
 */

/** prebuild 가 실제로 만들어 내던 모양 (2026-08-28 · SDK 57) */
const devLauncherPlist = (): Record<string, unknown> => ({
  NSLocalNetworkUsageDescription:
    "Expo Dev Launcher uses the local network to discover and connect to development servers running on your computer.",
  NSBonjourServices: ["_expo._tcp"],
  NSAppTransportSecurity: { NSAllowsArbitraryLoads: false, NSAllowsLocalNetworking: true },
  NSCalendarsUsageDescription: "일정 제목을 …",
});

describe("stripDevLauncherNetworkKeys", () => {
  it("dev launcher 의 로컬 네트워크 흔적 셋을 지운다", () => {
    const plist = stripDevLauncherNetworkKeys(devLauncherPlist());

    expect(plist.NSLocalNetworkUsageDescription).toBeUndefined();
    expect(plist.NSBonjourServices).toBeUndefined();
    expect(plist.NSAppTransportSecurity).toEqual({ NSAllowsArbitraryLoads: false });
  });

  it("쓰는 권한은 건드리지 않는다 — 지우는 것은 개발 도구 몫뿐이다", () => {
    const plist = stripDevLauncherNetworkKeys(devLauncherPlist());

    expect(plist.NSCalendarsUsageDescription).toBe("일정 제목을 …");
  });

  it("`NSBonjourServices` 를 통째로 지우지 않는다 — 남는 서비스가 있으면 남긴다", () => {
    const base = devLauncherPlist();
    base.NSBonjourServices = ["_expo._tcp", "_other._tcp"];

    expect(stripDevLauncherNetworkKeys(base).NSBonjourServices).toEqual(["_other._tcp"]);
  });

  it("이미 깨끗한 plist 를 망가뜨리지 않는다 — 두 번 돌아도 같다", () => {
    const once = stripDevLauncherNetworkKeys(devLauncherPlist());
    const twice = stripDevLauncherNetworkKeys({ ...once });

    expect(twice).toEqual(once);
  });
});

/**
 * 실제 `expo-dev-client` 플러그인. `app.config.ts` 와 같은 옵션으로 건다.
 * (xcodeproj · Android mod 도 등록되지만 여기서는 iOS `infoPlist` 체인만 돌린다)
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withDevClient = (require("expo-dev-client/app.plugin") as { default: unknown }).default as (
  config: ExportedConfig,
  props: { launchMode: string },
) => ExportedConfig;

const baseConfig = (): ExportedConfig => ({
  name: "모멘토리",
  slug: "momentory",
  scheme: "momentory",
  ios: { bundleIdentifier: "kr.momentory.app" },
  android: { package: "kr.momentory.app" },
  _internal: { projectRoot: "/momentory" },
});

/** 베이스 mod 가 하는 일만 흉내 낸다 — 파일 대신 받은 객체를 체인에 넣고 결과를 돌려준다 */
const runIosInfoPlistChain = async (
  config: ExportedConfig,
  initial: InfoPlist,
): Promise<Record<string, unknown>> => {
  const chain = config.mods?.ios?.infoPlist;
  if (!chain) throw new Error("ios.infoPlist mod 가 등록되지 않았다");
  const result = await chain({
    ...config,
    modRequest: {
      projectRoot: "/momentory",
      platformProjectRoot: "/momentory/ios",
      modName: "infoPlist",
      platform: "ios",
      projectName: "app",
      introspect: true,
      ignoreExistingNativeFiles: false,
    },
    modResults: initial,
    modRawConfig: config,
  });
  return result.modResults as Record<string, unknown>;
};

/** 체인에 들어가기 전의 Info.plist — 템플릿이 주는 ATS 와 우리가 쓰는 권한 하나 */
const templatePlist = (): InfoPlist => ({
  NSAppTransportSecurity: { NSAllowsArbitraryLoads: false },
  NSCalendarsUsageDescription: "일정 제목을 …",
});

describe("withoutDevLauncherNetwork — 실제 expo-dev-client 와 한 체인에서", () => {
  it("dev-client 를 먼저, 정리를 나중에 등록해도(app.config 의 순서) 키가 남지 않는다", async () => {
    const config = withoutDevLauncherNetwork(
      withDevClient(baseConfig(), { launchMode: "most-recent" }),
    );

    const plist = await runIosInfoPlistChain(config, templatePlist());

    expect(plist.NSLocalNetworkUsageDescription).toBeUndefined();
    expect(plist.NSBonjourServices).toBeUndefined();
    expect(plist.NSCalendarsUsageDescription).toBe("일정 제목을 …");
  });

  it("정리를 먼저, dev-client 를 나중에 등록해도 키가 남지 않는다 — 자리에 기대지 않는다", async () => {
    const config = withDevClient(withoutDevLauncherNetwork(baseConfig()), {
      launchMode: "most-recent",
    });

    const plist = await runIosInfoPlistChain(config, templatePlist());

    expect(plist.NSLocalNetworkUsageDescription).toBeUndefined();
    expect(plist.NSBonjourServices).toBeUndefined();
  });

  it("dev-client 가 넣는 다른 것(URL 스킴)은 그대로 둔다", async () => {
    const config = withoutDevLauncherNetwork(
      withDevClient(baseConfig(), { launchMode: "most-recent" }),
    );

    const plist = await runIosInfoPlistChain(config, templatePlist());

    expect(plist.CFBundleURLTypes).toBeDefined();
  });

  it("정리 없이 dev-client 만 있으면 키가 들어간다 — 테스트가 진짜 플러그인을 보고 있다는 확인", async () => {
    const config = withDevClient(baseConfig(), { launchMode: "most-recent" });

    const plist = await runIosInfoPlistChain(config, templatePlist());

    expect(plist.NSLocalNetworkUsageDescription).toMatch(/Expo Dev Launcher/);
    expect(plist.NSBonjourServices).toEqual(["_expo._tcp"]);
  });

  /**
   * 왜 `withInfoPlist` 로는 안 되는가를 남겨 둔다 — 1.4.0 에서 실제로 난 일이다.
   * `withMod` 는 자기 action 을 돌린 뒤 `nextMod` 를 부르므로, 나중에 등록한 쪽이 먼저 돈다.
   * 이 테스트가 깨지면(= withInfoPlist 로도 지워진다면) config-plugins 의 실행 순서가 바뀐
   * 것이니 플러그인 머리말의 설명을 다시 본다.
   */
  it("(기록) withInfoPlist 로 맨 뒤에 등록하면 dev-client 보다 먼저 돌아 지워지지 않는다", async () => {
    const naive = (config: ExportedConfig) =>
      withInfoPlist(config, (mod) => {
        stripDevLauncherNetworkKeys(mod.modResults as unknown as Record<string, unknown>);
        return mod;
      });
    const config = naive(withDevClient(baseConfig(), { launchMode: "most-recent" }));

    const plist = await runIosInfoPlistChain(config, templatePlist());

    expect(plist.NSLocalNetworkUsageDescription).toMatch(/Expo Dev Launcher/);
  });
});
