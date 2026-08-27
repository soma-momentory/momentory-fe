import { withInfoPlist, type ConfigPlugin } from "expo/config-plugins";

/**
 * 실제로 지우는 일 — **순수 함수로 꺼내 둔다.** 플러그인 껍데기(`withInfoPlist`)를
 * 테스트에서 흉내 내려면 mod 컨텍스트를 통째로 만들어야 해서, 규칙만 따로 고정한다
 * (`withInsecureDevApi` 의 XML 생성 함수와 같은 결).
 *
 * 받은 객체를 **그 자리에서** 고친다 — `withInfoPlist` 가 `modResults` 를 그대로
 * 돌려주기를 기대한다.
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
 * 환경에서 prebuild 하든 `Info.plist` 에 세 가지를 넣는다:
 *
 * - `NSLocalNetworkUsageDescription` — 「Expo Dev Launcher uses the local network to
 *   discover and connect to development servers running on your computer.」
 * - `NSBonjourServices` 의 `_expo._tcp` — 개발 서버 탐색용 mDNS 서비스
 * - `NSAppTransportSecurity.NSAllowsLocalNetworking` — 같은 탐색을 위한 ATS 완화
 *
 * 셋 다 **스토어 빌드에서는 쓰이지 않는다**(런처는 Debug 에서만 돈다). 그런데
 * 남겨 두면 두 가지가 문제다. 첫째, 사용자에게 「이 앱이 로컬 네트워크를 쓴다」는
 * 권한 안내가 개발 도구 문구 그대로 뜬다. 둘째, 자동 심사가 **쓰지 않는 자원의
 * 일반적인 목적 문구**를 걸고 넘어진다 — Reminders 기본 문구로 이미 한 번
 * 반려됐다(PR #120 · `APP-REVIEW-UI-TEST.md` §1-3).
 *
 * 그래서 **운영 prebuild 에서만** 이 셋을 지운다. 문구를 고치는 것이 아니라
 * **쓰지 않는 권한 자체를 없애는 것**이 원칙이다(같은 문서 §1-1).
 *
 * ⚠ **개발 빌드에서는 붙지 않는다** — `app.config.ts` 가
 * `MOMENTORY_BUILD_ENV=production` 일 때만 이 플러그인을 목록에 넣는다. 개발에서
 * 지우면 dev client 가 Metro 를 찾지 못한다(시뮬레이터에서 이미 잘 안 잡히는
 * 경로다 · `docs/SETUP.md`).
 *
 * ⚠ **`NSBonjourServices` 를 통째로 지우지 않는다** — 나중에 다른 라이브러리가
 * 자기 서비스를 넣을 수 있어서, `_expo._tcp` 하나만 빼고 남는 게 없을 때만 키를
 * 없앤다.
 */
export const withoutDevLauncherNetwork: ConfigPlugin = (config) =>
  withInfoPlist(config, (mod) => {
    stripDevLauncherNetworkKeys(mod.modResults as unknown as Record<string, unknown>);
    return mod;
  });

/** dev launcher 가 Metro 를 찾을 때 쓰는 mDNS 서비스 이름 */
const EXPO_BONJOUR_SERVICE = "_expo._tcp";

export default withoutDevLauncherNetwork;
