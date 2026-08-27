import { stripDevLauncherNetworkKeys } from "../withoutDevLauncherNetwork";

/**
 * 이 테스트가 지키는 것은 **운영 바이너리에 개발 도구의 권한 문구가 남지 않는 것**이다.
 *
 * `expo-dev-client` 는 어떤 환경에서 prebuild 하든 `Info.plist` 에 로컬 네트워크 관련
 * 셋을 넣는다. 남겨 두면 사용자에게 개발 도구 문구 그대로 권한 안내가 뜨고, 자동
 * 심사가 **쓰지 않는 자원의 일반적인 목적 문구**를 걸고 넘어진다 — Reminders 기본
 * 문구로 이미 한 번 반려됐다(`APP-REVIEW-UI-TEST.md` §1-3).
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
