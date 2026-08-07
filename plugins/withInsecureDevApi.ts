import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
  withInfoPlist,
  type ConfigPlugin,
} from "expo/config-plugins";

/**
 * 개발 API 서버가 **평문 HTTP** 일 때만 그 호스트 하나에 예외를 연다.
 *
 * 2026-08-07 현재 개발 서버는 IP 주소에 HTTPS 없이 떠 있다. Android 9+ 와 iOS ATS 는
 * 평문을 기본으로 막으므로 예외가 없으면 로그인 요청이 **전송 전에** 실패한다.
 *
 * **전체 허용(`usesCleartextTraffic` · `NSAllowsArbitraryLoads`)을 기본값으로 두지 않는다** —
 * 한 번 켜면 그 뒤의 모든 요청이 조용히 평문으로 나가고, 누구도 그것을 다시 끄지 않는다.
 * 그래서 이 플러그인은 **입력이 `http://` 일 때만** 동작하고, `EXPO_PUBLIC_API_BASE_URL`
 * 이 `https://` 로 바뀌는 순간 **아무것도 하지 않는다** — HTTPS 전환은 env 한 줄이다.
 * (호출부의 게이트: `app.config.ts` `cleartextHostOf`)
 *
 * ## 두 OS 가 같지 않다
 *
 * - **Android** — `network_security_config.xml` 로 **그 호스트만** 평문을 허용하고
 *   나머지는 `base-config` 가 계속 막는다. 원하는 만큼 좁다.
 *   ⚠ 단 **debug 빌드에는 같은 이름의 느슨한 판을 따로 둔다** — 좁은 정책 하나만
 *   두면 Metro 번들 서버(개발 PC 의 평문 8081)까지 막혀 앱이 뜨지 않는다.
 *   Android 가 `networkSecurityConfig` 앞에서 `usesCleartextTraffic` 을 무시하기
 *   때문이다. 자세한 것은 아래 `androidXmlPath` 주석.
 * - **iOS** — ATS 의 `NSExceptionDomains` 는 **도메인 이름만 받는다. IP 주소는 예외로
 *   등록할 수 없다**(Apple 문서 · 알려진 제약). 그래서 호스트가 IP 면 좁힐 방법이 없고
 *   `NSAllowsArbitraryLoads`(앱 전체) 말고는 선택지가 없다. 이 파일은 그 사실을 숨기지
 *   않고, **IP 일 때만** 전체 예외를 켠 뒤 `docs/SETUP.md` 에 제약으로 적어둔다.
 *   서버에 도메인이 생기면 자동으로 좁은 예외(`NSExceptionDomains`)로 내려간다.
 *
 * ⚠ **운영 배포는 이 경로를 쓰지 않는다.** 스토어 빌드의 `EXPO_PUBLIC_API_BASE_URL` 은
 * HTTPS 여야 하고, 그러면 이 플러그인은 매니페스트·Info.plist 를 건드리지 않는다.
 */
export type InsecureDevApiProps = {
  /** 평문 HTTP 로 접근할 호스트. 예: `3.39.210.114` — 포트·경로는 뺀다 */
  host: string;
};

/** 점 넷으로 된 IPv4 인가 — iOS 가 좁은 예외를 못 거는 경우다 */
const isIpLiteral = (host: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":");

/**
 * 같은 이름의 리소스를 **빌드 타입별로** 둘 쓴다. Gradle 의 리소스 병합이
 * `src/<buildType>/res` 를 `src/main/res` 보다 우선하므로, 파일 이름이 같으면
 * debug 빌드는 debug 판을, release 빌드는 main 판을 집는다.
 *
 * ⚠ **이 분리가 없으면 개발 자체가 막힌다.** Android 는 `networkSecurityConfig` 가
 * 있으면 `android:usesCleartextTraffic` 을 **무시한다** — RN/Expo 가 debug 매니페스트에
 * 켜 두는 그 스위치가 Metro(개발 PC 의 LAN 주소, 평문 8081)를 위한 것인데, 좁은 정책
 * 하나만 두면 그것까지 함께 막혀 번들을 못 받는다
 * (`CLEARTEXT communication to <개발 PC> not permitted`). 실제로 그렇게 막혔었다.
 */
export const androidXmlPath = (buildType: "main" | "debug") =>
  join("app", "src", buildType, "res", "xml", "network_security_config.xml");
const ANDROID_XML_REF = "@xml/network_security_config";

/** release·기본판 — 개발 API 서버 하나만 열고 나머지는 계속 막는다 */
export const networkSecurityConfigXml = (host: string) => `<?xml version="1.0" encoding="utf-8"?>
<!--
  생성물 — plugins/withInsecureDevApi.ts 가 쓴다. 직접 고치지 않는다.
  개발 API 서버(${host}) 하나만 평문 HTTP 를 허용하고 나머지는 계속 막는다.
-->
<network-security-config>
    <base-config cleartextTrafficPermitted="false" />
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="false">${host}</domain>
    </domain-config>
</network-security-config>
`;

/**
 * debug 판 — **RN/Expo 의 기본 동작 그대로** 평문을 연다.
 *
 * 좁히지 않는 이유는 Metro 주소가 고정이 아니기 때문이다. 개발 PC 의 LAN IP 는
 * 네트워크마다·재접속마다 바뀌고, 터널·에뮬레이터 경로(`10.0.2.2`)까지 더하면
 * 목록으로 따라잡을 수 없다. **debug 는 원래 이만큼 열려 있었다** — 이 파일이
 * 그 상태를 되돌릴 뿐, 새로 넓히는 것이 아니다. 좁은 정책은 아래 main 판이 든다.
 */
export const debugNetworkSecurityConfigXml = `<?xml version="1.0" encoding="utf-8"?>
<!--
  생성물 — plugins/withInsecureDevApi.ts 가 쓴다. 직접 고치지 않는다.
  debug 전용. Metro 번들 서버가 평문이라 여기서 막으면 앱이 뜨지 않는다.
  좁은 정책은 src/main/res/xml 의 같은 이름 파일이 든다 (release 가 그것을 쓴다).
-->
<network-security-config>
    <base-config cleartextTrafficPermitted="true" />
</network-security-config>
`;

const withAndroidCleartextHost: ConfigPlugin<InsecureDevApiProps> = (config, { host }) => {
  // 1. res/xml 에 정책 파일을 쓴다. prebuild 가 android/ 를 다시 만들 때마다 함께 생긴다.
  config = withDangerousMod(config, [
    "android",
    (cfg) => {
      const write = (relative: string, contents: string) => {
        const target = join(cfg.modRequest.platformProjectRoot, relative);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, contents, "utf8");
      };
      write(androidXmlPath("main"), networkSecurityConfigXml(host));
      write(androidXmlPath("debug"), debugNetworkSecurityConfigXml);
      return cfg;
    },
  ]);

  // 2. <application> 이 그 파일을 가리키게 한다. 이 줄이 없으면 파일은 무시된다.
  return withAndroidManifest(config, (cfg) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    application.$["android:networkSecurityConfig"] = ANDROID_XML_REF;
    // 정책 파일이 호스트 단위로 판단하므로 앱 전역 스위치는 켜지 않는다.
    delete application.$["android:usesCleartextTraffic"];
    return cfg;
  });
};

/** Info.plist 값의 최소 형태 — ATS 가지 하나만 다루므로 여기 이상은 필요 없다 */
type AtsValue = boolean | Record<string, Record<string, boolean>>;

const withIosCleartextHost: ConfigPlugin<InsecureDevApiProps> = (config, { host }) =>
  withInfoPlist(config, (cfg) => {
    const existing = (cfg.modResults.NSAppTransportSecurity ?? {}) as Record<string, AtsValue>;

    if (isIpLiteral(host)) {
      // ATS 는 IP 를 예외 도메인으로 받지 않는다 — 좁히는 방법이 없다.
      // 서버에 도메인이 붙거나 HTTPS 가 서면 이 가지는 실행되지 않는다.
      cfg.modResults.NSAppTransportSecurity = { ...existing, NSAllowsArbitraryLoads: true };
      return cfg;
    }

    const domains = (existing.NSExceptionDomains ?? {}) as Record<string, Record<string, boolean>>;
    cfg.modResults.NSAppTransportSecurity = {
      ...existing,
      NSExceptionDomains: {
        ...domains,
        [host]: {
          NSExceptionAllowsInsecureHTTPLoads: true,
          NSIncludesSubdomains: false,
        },
      },
    };
    return cfg;
  });

const withInsecureDevApi: ConfigPlugin<InsecureDevApiProps> = (config, props) => {
  if (!props?.host) return config;
  config = withAndroidCleartextHost(config, props);
  config = withIosCleartextHost(config, props);
  return config;
};

export default withInsecureDevApi;
