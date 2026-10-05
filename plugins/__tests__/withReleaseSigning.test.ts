import { withReleaseApiCheckApplied, withSigningApplied } from "../withReleaseSigning";

/**
 * 이 테스트가 지키는 것은 **출시본이 debug 키로 서명되지 않는 것**이다.
 *
 * `/android` 는 생성물이라 손으로 붙인 서명 설정은 다음 prebuild 에 사라진다.
 * 그런데 사라진 자리에 Expo 템플릿이 넣어 두는 것이 하필 `signingConfigs.debug` 라,
 * 빌드는 성공하고 AAB 도 나온다 — 틀렸다는 사실은 Play Console 이 「디버그 모드로
 * 서명됨」으로 거절할 때에야 드러난다. 그래서 변환 자체를 여기서 고정한다.
 */

/** Expo 57 템플릿의 해당 대목 (군더더기를 덜어낸 형태) */
const TEMPLATE = `android {
    namespace 'kr.momentory.app'
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            signingConfig signingConfigs.debug
            minifyEnabled enableMinifyInReleaseBuilds
        }
    }
}
`;

describe("release 서명 붙이기", () => {
  const out = withSigningApplied(TEMPLATE);

  it("signingConfigs 에 release 칸이 생긴다", () => {
    expect(out).toMatch(/signingConfigs\s*\{[\s\S]*\brelease\s*\{/);
    expect(out).toContain("storeFile file(MOMENTORY_RELEASE_STORE_FILE)");
    expect(out).toContain("keyAlias MOMENTORY_RELEASE_KEY_ALIAS");
  });

  it("release 빌드 타입이 더는 debug 키를 집지 않는다", () => {
    const releaseBlock = out.slice(out.indexOf("release {", out.indexOf("buildTypes")));
    expect(releaseBlock).toContain("signingConfigs.release");
  });

  it("debug 빌드 타입은 그대로 debug 키를 집는다 — 같은 줄이 둘이라 헷갈리기 쉽다", () => {
    expect(out).toMatch(/debug\s*\{\s*signingConfig signingConfigs\.debug\s*\}/);
  });

  it("비밀번호를 파일에 굳혀 두지 않는다 — 이름으로만 참조한다", () => {
    // 값이 들어가는 순간 이력에 남는다. 참조는 ~/.gradle/gradle.properties 로 간다.
    expect(out).toContain("project.hasProperty('MOMENTORY_RELEASE_STORE_FILE')");
  });

  it("속성이 없는 기기에서도 구성은 된다 — 없으면 debug 로 떨어진다", () => {
    // 없는 속성을 그냥 참조하면 Gradle 이 설정 단계에서 던져 assembleDebug 까지 막힌다.
    expect(out).toContain("? signingConfigs.release : signingConfigs.debug");
  });

  it("떨어질 때는 경고를 찍는다 — 조용히 떨어지면 Play 가 거절할 때에야 안다", () => {
    expect(out).toContain("println");
  });

  it("두 번 적용해도 같다 — prebuild 는 몇 번이든 돈다", () => {
    expect(withSigningApplied(out)).toBe(out);
  });

  it("접두사를 바꾸면 참조도 함께 바뀐다 — 이름을 두 곳에 적지 않는다", () => {
    const renamed = withSigningApplied(TEMPLATE, "ACME");
    expect(renamed).toContain("storeFile file(ACME_STORE_FILE)");
    expect(renamed).not.toContain("MOMENTORY_RELEASE");
  });
});

describe("템플릿이 달라지면 조용히 넘어가지 않는다", () => {
  it("signingConfigs 가 없으면 던진다", () => {
    expect(() => withSigningApplied("android {\n  buildTypes {\n  }\n}")).toThrow();
  });

  it("buildTypes.release 의 signingConfig 줄이 없으면 던진다", () => {
    const noLine = TEMPLATE.replace(
      "            signingConfig signingConfigs.debug\n            minifyEnabled",
      "            minifyEnabled",
    );
    expect(() => withSigningApplied(noLine)).toThrow();
  });
});

describe("릴리스 빌드의 출시 검사", () => {
  const out = withReleaseApiCheckApplied(TEMPLATE);

  it("릴리스 작업이 잡히면 앱 설정 작업에 출시 표시를 넘긴다", () => {
    expect(out).toContain("(bundle|assemble)\\w*Release");
    expect(out).toContain("createExpoConfig");
    expect(out).toContain("environment('MOMENTORY_RELEASE_BUILD', '1')");
  });

  it("두 번 실행돼도 한 번만 붙는다", () => {
    expect(withReleaseApiCheckApplied(out)).toBe(out);
  });
});
