import { withBaseMod, type ConfigPlugin, type ExportedConfigWithProps } from "expo/config-plugins";

/** dev launcher 가 Metro 를 찾을 때 쓰는 mDNS 서비스 이름 */
export const EXPO_BONJOUR_SERVICE = "_expo._tcp";

/**
 * 실제로 지우는 일 — **순수 함수로 꺼내 둔다.** 플러그인 껍데기를 테스트에서 흉내 내려면
 * mod 컨텍스트를 통째로 만들어야 해서, 규칙만 따로 고정한다
 * (`withInsecureDevApi` 의 XML 생성 함수와 같은 결).
 *
 * 받은 객체를 **그 자리에서** 고친다 — 베이스 mod 가 `modResults` 를 그대로 돌려주기를
 * 기대한다.
 */
export const stripDevLauncherNetworkKeys = <T extends Record<string, unknown>>(plist: T): T => {
  delete plist.NSLocalNetworkUsageDescription;

  const services = plist.NSBonjourServices;
  if (Array.isArray(services)) {
    const kept = services.filter((service) => service !== EXPO_BONJOUR_SERVICE);
    if (kept.length > 0) (plist as Record<string, unknown>).NSBonjourServices = kept;
    else delete plist.NSBonjourServices;
  }

  // ATS 는 다른 키(운영 평문 예외 등)를 함께 들 수 있으므로 이 항목만 뺀다
  const ats = plist.NSAppTransportSecurity;
  if (ats != null && typeof ats === "object") {
    delete (ats as Record<string, unknown>).NSAllowsLocalNetworking;
  }

  return plist;
};

/**
 * **배포 빌드에서 Expo Dev Launcher 의 로컬 네트워크 흔적을 지운다.**
 *
 * `expo-dev-client` 는 개발용이지만 의존성으로 들어 있어서, 그 플러그인이 어떤
 * 환경에서 prebuild 하든 `Info.plist` 에 두 가지를 넣는다(SDK 57 기준):
 *
 * - `NSLocalNetworkUsageDescription` — 「Expo Dev Launcher uses the local network to
 *   discover and connect to development servers running on your computer.」
 * - `NSBonjourServices` 의 `_expo._tcp` — 개발 서버 탐색용 mDNS 서비스
 *
 * (옛 SDK 는 `NSAppTransportSecurity.NSAllowsLocalNetworking` 도 넣었다 — 그 자리도 그대로
 * 지운다. 없으면 아무 일도 없다.)
 *
 * 둘 다 **스토어 빌드에서는 쓰이지 않는다**(런처는 Debug 에서만 돈다). 그런데
 * 남겨 두면 두 가지가 문제다. 첫째, 사용자에게 「이 앱이 로컬 네트워크를 쓴다」는
 * 권한 안내가 개발 도구 문구 그대로 뜬다. 둘째, 자동 심사가 **쓰지 않는 자원의
 * 일반적인 목적 문구**를 걸고 넘어진다 — Reminders 기본 문구로 이미 한 번
 * 반려됐다(PR #120). 그래서 **운영 prebuild 에서만** 지운다. 문구를 고치는 것이
 * 아니라 **쓰지 않는 권한 자체를 없애는 것**이 원칙이다.
 *
 * > 참고 — `expo-dev-launcher` 57 은 Xcode **빌드 단계**에서 Release 구성일 때 같은 키를
 * > 지우는 스크립트도 심는다(`[Expo Dev Launcher] Strip Local Network Keys for Release`).
 * > 그건 아카이브 안의 사본만 고치고 prebuild 가 만든 `Info.plist` 에는 남는다 — 심사 ·
 * > 검토가 보는 것은 저장소 옆의 그 파일이라 여기서 **원본부터** 지운다.
 *
 * ## 왜 `withInfoPlist` 가 아니라 `withBaseMod` 인가 (2026-11-08)
 *
 * config-plugins 의 mod 는 **나중에 등록된 것이 먼저 실행된다.** `withMod` 는 자기
 * action 을 돌린 뒤 `nextMod`(먼저 등록된 플러그인)를 부르는 구조라, `plugins` 배열의
 * 맨 뒤에 둔 이 플러그인이 **`expo-dev-client` 보다 먼저** 돌았고 지운 자리에 dev-client 가
 * 다시 키를 넣었다(1.4.0 Build 8 prebuild 에서 발견). `withInfoPlist` 를 쓰는 한 배열의
 * 어느 자리에 두어도 **자기보다 뒤에 등록된 플러그인**은 늘 먼저 돌아 버린다.
 *
 * 그래서 한 단계 아래 `withBaseMod` 로 내려가 **`nextMod` 를 먼저 부르고 그 결과를 지운다.**
 * 바깥쪽(뒤에 등록된) 플러그인은 이미 돌았고 안쪽(앞에 등록된) 플러그인은 `nextMod` 안에서
 * 돈 뒤라, 지우는 일은 **배열의 어느 자리에 있든 모든 플러그인 다음**에 일어난다.
 * `isIntrospective` 는 켜지 않는다 — 베이스 mod 가 소개(introspect)를 결정하고,
 * 이 플러그인은 그 체인 안에서 보통 mod 처럼 돈다(`expo config --type introspect` 에도 반영된다).
 *
 * ⚠ **개발 빌드에서는 붙지 않는다** — `app.config.ts` 가
 * `MOMENTORY_BUILD_ENV=production` 일 때만 이 플러그인을 목록에 넣는다. 개발에서
 * 지우면 dev client 가 Metro 를 찾지 못한다(`docs/SETUP.md`).
 *
 * ⚠ **`NSBonjourServices` 를 통째로 지우지 않는다** — 나중에 다른 라이브러리가
 * 자기 서비스를 넣을 수 있어서, `_expo._tcp` 하나만 빼고 남는 게 없을 때만 키를
 * 없앤다.
 *
 * 검증: `npm run check:ios-release`(`scripts/check-ios-release-plist.mjs`) 가 운영
 * introspect 결과와 생성된 `ios/app/Info.plist` 에 이 키들이 없는지 본다.
 */
export const withoutDevLauncherNetwork: ConfigPlugin = (config) =>
  withBaseMod<Record<string, unknown>>(config, {
    platform: "ios",
    mod: "infoPlist",
    async action({ modRequest: { nextMod, ...modRequest }, ...mod }) {
      const inner: ExportedConfigWithProps<Record<string, unknown>> = { ...mod, modRequest };
      // 먼저 등록된 플러그인(expo-dev-client 포함)을 **전부 돌린 뒤** 지운다
      const result = nextMod ? await nextMod(inner) : inner;
      stripDevLauncherNetworkKeys(result.modResults);
      return result;
    },
  });

export default withoutDevLauncherNetwork;
