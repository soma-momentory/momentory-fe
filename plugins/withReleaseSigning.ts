import { withAppBuildGradle, type ConfigPlugin } from "expo/config-plugins";

/**
 * release 빌드를 **출시용 키스토어**로 서명하게 한다.
 *
 * `/android` 는 이력에 담지 않는 생성물이다(루트 `.gitignore` · CNG). 그래서
 * `android/app/build.gradle` 을 손으로 고쳐 서명을 붙이면 **다음 `npx expo prebuild`
 * 에 통째로 사라진다** — 그 상태로 빌드하면 Gradle 이 조용히 debug 키로 서명하고,
 * 문제는 AAB 를 올린 뒤 Play Console 이 「디버그 모드로 서명됨」으로 거절할 때에야
 * 드러난다. 네이티브를 고쳐야 하면 여기가 아니라 플러그인이라는 규칙이 그대로 적용된다.
 *
 * ## 비밀번호는 이 저장소에 없다
 *
 * 값 넷은 **`~/.gradle/gradle.properties`** 에서 온다(Gradle 이 사용자 홈에서 읽는
 * 파일 · 저장소 바깥이다). 이 파일이 하는 일은 그 값을 **이름으로 참조**하는 것뿐이라
 * 비밀번호가 코드에도 이력에도 남지 않는다.
 *
 * ```properties
 * MOMENTORY_RELEASE_STORE_FILE=/Users/<나>/keys/momentory-release.keystore
 * MOMENTORY_RELEASE_STORE_PASSWORD=…
 * MOMENTORY_RELEASE_KEY_ALIAS=…
 * MOMENTORY_RELEASE_KEY_PASSWORD=…
 * ```
 *
 * ⚠ **키스토어를 `android/` 안에 두지 않는다.** `expo prebuild --clean` 이 그 폴더를
 * 지운다 — 업로드 키를 잃으면 같은 앱을 **갱신할 수 없다**(Play 앱 서명을 쓰면 키 재설정을
 * 신청할 수 있지만 며칠이 걸린다). 절대 경로로 홈 밖에 두고 따로 백업한다.
 *
 * ## 값이 없으면 debug 로 떨어진다
 *
 * 넷이 없는 기기에서도 프로젝트는 **구성돼야 한다** — 없는 속성을 참조하면 Gradle 이
 * 설정 단계에서 던지고, 그러면 서명과 무관한 `assembleDebug` 까지 막힌다. 그래서
 * `hasProperty` 로 감싸고 없으면 debug 키로 떨어뜨리되, **빌드 로그에 경고를 찍는다** —
 * 조용히 떨어지면 위의 그 「Play 가 거절할 때에야 안다」로 돌아간다.
 */
export type ReleaseSigningProps = {
  /** `~/.gradle/gradle.properties` 속성 이름 접두사. 기본 `MOMENTORY_RELEASE` */
  prefix?: string;
};

const DEFAULT_PREFIX = "MOMENTORY_RELEASE";

/**
 * `header` 로 시작하는 Gradle 블록의 **본문 범위**를 중괄호 짝으로 찾는다.
 *
 * 정규식 하나로 `signingConfigs { … }` 를 통째로 잡으려 하면 안쪽의 `debug { … }` 가
 * 먼저 닫혀 범위가 어긋난다. 그래서 여는 괄호부터 깊이를 세어 짝을 찾는다.
 *
 * ⚠ 문자열·주석 안의 중괄호는 세지 않는다 — Expo 템플릿의 이 두 블록에는 없다.
 * 템플릿이 그런 줄을 들이면 여기가 먼저 깨지도록 실패를 던지게 두었다.
 */
const blockBody = (src: string, header: RegExp, from = 0): [number, number] => {
  const rest = src.slice(from);
  const found = rest.search(header);
  if (found < 0) throw new Error(`build.gradle 에서 ${header} 블록을 찾지 못했다`);

  const open = src.indexOf("{", from + found);
  if (open < 0) throw new Error(`build.gradle 에서 ${header} 의 여는 중괄호를 찾지 못했다`);

  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === "{") depth += 1;
    else if (src[i] === "}") {
      depth -= 1;
      if (depth === 0) return [open + 1, i];
    }
  }
  throw new Error(`build.gradle 에서 ${header} 의 닫는 중괄호를 찾지 못했다`);
};

/** `signingConfigs` 안에 들어갈 release 칸 */
const releaseSigningConfig = (prefix: string) => `
        // 생성물 — plugins/withReleaseSigning.ts 가 쓴다. 직접 고치지 않는다.
        // 값 넷은 ~/.gradle/gradle.properties 에서 온다 (저장소 바깥이다).
        release {
            if (project.hasProperty('${prefix}_STORE_FILE')) {
                storeFile file(${prefix}_STORE_FILE)
                storePassword ${prefix}_STORE_PASSWORD
                keyAlias ${prefix}_KEY_ALIAS
                keyPassword ${prefix}_KEY_PASSWORD
            } else {
                println "⚠ ${prefix}_* 가 없다 — release 가 debug 키로 서명된다. 스토어에는 올릴 수 없다."
            }
        }
`;

/** `buildTypes.release` 가 집을 서명 설정 — 값이 없으면 debug 로 떨어진다 */
const releaseSigningConfigRef = (prefix: string) =>
  `signingConfig project.hasProperty('${prefix}_STORE_FILE') ? signingConfigs.release : signingConfigs.debug`;

/**
 * `android/app/build.gradle` 문자열을 받아 서명 설정을 붙여 돌려준다.
 * 순수 함수라 테스트가 Gradle 없이 확인한다.
 */
export const withSigningApplied = (gradle: string, prefix = DEFAULT_PREFIX): string => {
  let out = gradle;

  // 1. signingConfigs 에 release 칸을 넣는다 (이미 있으면 그대로 둔다 — 두 번 실행돼도 같다)
  const [signingStart, signingEnd] = blockBody(out, /\bsigningConfigs\s*\{/);
  const signingBody = out.slice(signingStart, signingEnd);
  if (!/^\s*release\s*\{/m.test(signingBody)) {
    out = out.slice(0, signingEnd) + releaseSigningConfig(prefix) + out.slice(signingEnd);
  }

  // 2. buildTypes 의 release 가 debug 키를 집던 줄을 바꾼다.
  //    두 줄이 글자까지 같다(debug 빌드 타입에도 같은 줄이 있다) — 범위를 좁혀 그 안에서만 바꾼다.
  const [typesStart, typesEnd] = blockBody(out, /\bbuildTypes\s*\{/);
  const [relStart, relEnd] = blockBody(out.slice(0, typesEnd), /^\s*release\s*\{/m, typesStart);
  const releaseBody = out.slice(relStart, relEnd);
  const rewritten = releaseBody.replace(
    /signingConfig\s+signingConfigs\.\w+/,
    releaseSigningConfigRef(prefix),
  );
  if (rewritten === releaseBody && !releaseBody.includes("signingConfigs.release")) {
    throw new Error("build.gradle 의 buildTypes.release 에서 signingConfig 줄을 찾지 못했다");
  }

  return out.slice(0, relStart) + rewritten + out.slice(relEnd);
};

/** 아래 덧붙임이 이미 들어갔는지 알아보는 표식 — 두 번 실행돼도 한 번만 붙는다 */
const RELEASE_CHECK_MARK = "MOMENTORY_RELEASE_BUILD";

/**
 * 릴리스 작업(`bundleRelease` · `assembleRelease` …)이 잡히면 앱 설정을 만드는 작업
 * (expo-constants 의 `createExpoConfig`)에 `MOMENTORY_RELEASE_BUILD=1` 을 넘긴다. 그러면
 * `app.config.ts` 가 출시 검사를 켜서, API 주소가 운영(`api.momentory.co.kr`)이 아니면 **AAB 가
 * 만들어지기 전에 빌드가 실패한다**. iOS 는 Xcode 가 `CONFIGURATION=Release` 를 넘겨 같은 검사가
 * 켜진다 — Android 의 그 작업은 빌드 종류를 몰라서 여기서 알려 준다.
 *
 * dev 주소로 빌드한 AAB 를 테스트 트랙에 올린 일(2026-09-06 · versionCode 3)과 iOS 1.1.0 이
 * dev 주소로 출시된 일(2026-10)이 있었다 — 사람이 `.env` 를 바꿔 주기를 기대하지 않는다.
 */
const releaseApiCheck = `
// 생성물 — plugins/withReleaseSigning.ts 가 쓴다. 직접 고치지 않는다.
// 릴리스 빌드에서는 app.config.ts 의 출시 검사(운영 API 주소)를 켠다.
gradle.taskGraph.whenReady { graph ->
    if (graph.allTasks.any { it.name ==~ /(bundle|assemble)\\w*Release/ }) {
        graph.allTasks.findAll { it.name == 'createExpoConfig' }.each {
            it.environment('${RELEASE_CHECK_MARK}', '1')
        }
    }
}
`;

/** `app/build.gradle` 끝에 출시 검사 덧붙임을 붙인다(이미 있으면 그대로) */
export const withReleaseApiCheckApplied = (gradle: string): string =>
  gradle.includes(RELEASE_CHECK_MARK) ? gradle : `${gradle.trimEnd()}\n${releaseApiCheck}`;

const withReleaseSigning: ConfigPlugin<ReleaseSigningProps | void> = (config, props) =>
  withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== "groovy") {
      throw new Error("withReleaseSigning 은 Groovy build.gradle 만 다룬다");
    }
    cfg.modResults.contents = withReleaseApiCheckApplied(
      withSigningApplied(cfg.modResults.contents, props?.prefix ?? DEFAULT_PREFIX),
    );
    return cfg;
  });

export default withReleaseSigning;
