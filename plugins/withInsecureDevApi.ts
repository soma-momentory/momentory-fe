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

const ANDROID_XML_RELATIVE = join(
  "app",
  "src",
  "main",
  "res",
  "xml",
  "network_security_config.xml",
);
const ANDROID_XML_REF = "@xml/network_security_config";

const networkSecurityConfigXml = (host: string) => `<?xml version="1.0" encoding="utf-8"?>
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

const withAndroidCleartextHost: ConfigPlugin<InsecureDevApiProps> = (config, { host }) => {
  // 1. res/xml 에 정책 파일을 쓴다. prebuild 가 android/ 를 다시 만들 때마다 함께 생긴다.
  config = withDangerousMod(config, [
    "android",
    (cfg) => {
      const target = join(cfg.modRequest.platformProjectRoot, ANDROID_XML_RELATIVE);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, networkSecurityConfigXml(host), "utf8");
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
