import { sep } from "node:path";

import withInsecureDevApi, {
  androidXmlPath,
  debugNetworkSecurityConfigXml,
  networkSecurityConfigXml,
} from "../withInsecureDevApi";

/**
 * 이 테스트가 지키는 것은 **개발이 막히지 않는 것**이다.
 *
 * 2026-08-07 에 실제로 막혔다. 좁은 정책 하나만 두었더니 Android 가
 * `networkSecurityConfig` 앞에서 `usesCleartextTraffic` 을 무시해서, RN·Expo 가
 * debug 매니페스트에 켜 두는 그 스위치가 죽었다 — Metro 번들 서버(개발 PC 의 평문
 * 8081)까지 함께 막혀 앱이 아예 뜨지 않았다
 * (`CLEARTEXT communication to <개발 PC> not permitted`).
 *
 * 그래서 아래 두 가지를 함께 고정한다. **둘 중 하나만 지키면 의미가 없다** —
 * debug 만 열면 운영이 새고, main 만 좁히면 개발이 막힌다.
 */
describe("main 판 — 좁게 연다 (release 가 쓴다)", () => {
  const xml = networkSecurityConfigXml("10.0.0.1");

  it("기본은 평문을 막는다 — 전역 허용을 기본값으로 두지 않는다", () => {
    expect(xml).toContain('<base-config cleartextTrafficPermitted="false" />');
  });

  it("받은 호스트 하나만 예외로 연다", () => {
    expect(xml).toContain('<domain includeSubdomains="false">10.0.0.1</domain>');
    // 하위 도메인까지 열면 예외가 의도보다 넓어진다
    expect(xml).not.toContain('includeSubdomains="true"');
  });

  it("호스트가 바뀌면 그 호스트가 들어간다 — 값을 굳혀 두지 않는다", () => {
    expect(networkSecurityConfigXml("api.example.com")).toContain(
      '<domain includeSubdomains="false">api.example.com</domain>',
    );
  });
});

describe("debug 판 — 열어 둔다 (Metro 가 평문이다)", () => {
  it("평문을 허용한다 — 막으면 번들을 못 받아 앱이 뜨지 않는다", () => {
    expect(debugNetworkSecurityConfigXml).toContain(
      '<base-config cleartextTrafficPermitted="true" />',
    );
  });

  it("호스트 목록으로 좁히지 않는다 — Metro 주소는 고정이 아니다", () => {
    // 개발 PC 의 LAN IP 는 네트워크마다 바뀌고 에뮬레이터 경로(10.0.2.2)까지 있다.
    // 목록으로 따라잡으려 하면 그 목록이 낡는 순간 다시 개발이 막힌다.
    expect(debugNetworkSecurityConfigXml).not.toContain("<domain");
  });
});

describe("두 판이 서로 다른 자리에 간다", () => {
  it("Gradle 이 빌드 타입별로 집도록 같은 파일 이름을 다른 소스셋에 둔다", () => {
    const main = androidXmlPath("main");
    const debug = androidXmlPath("debug");

    expect(main).not.toBe(debug);
    // 이름이 같아야 debug 판이 main 판을 **덮는다**. 다르면 둘 다 살아남아
    // 매니페스트가 가리키는 하나만 쓰이고 분리가 무의미해진다.
    expect(main.endsWith("network_security_config.xml")).toBe(true);
    expect(debug.endsWith("network_security_config.xml")).toBe(true);
    expect(main).toContain(["src", "main", "res", "xml"].join(sep));
    expect(debug).toContain(["src", "debug", "res", "xml"].join(sep));
  });
});

describe("HTTPS 로 바뀌면 아무것도 하지 않는다", () => {
  it("host 가 비면 config 를 그대로 돌려준다 — 예외를 열 이유가 없다", () => {
    const config = { name: "momentory", slug: "momentory" } as never;
    // 호출부(app.config.ts)가 https·미설정일 때 빈 문자열을 넘긴다
    expect(withInsecureDevApi(config, { host: "" })).toBe(config);
  });
});
