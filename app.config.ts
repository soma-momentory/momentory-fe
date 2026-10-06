import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * 시크릿은 여기 적지 않는다 — env 에서 읽는다 (`.env.example` 참조).
 * 값이 필요한 곳은 `extra` 를 거쳐 `expo-constants` 로 읽는다.
 */
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
const kakaoAppKey = process.env.EXPO_PUBLIC_KAKAO_APP_KEY ?? "";
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";
const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
const buildEnvironment = process.env.MOMENTORY_BUILD_ENV ?? "development";

/**
 * 출시 바이너리가 붙는 **유일한** API 호스트. 개발 서버(`dev.momentory.co.kr`)도 https 라
 * 「https 인가」만 보면 그대로 통과한다 — 2026-10 에 App Store iOS 1.1.0 이 dev 주소를 품고
 * 나가 그 기간 iOS 신규 가입이 전부 개발 DB 로 갔다. 그래서 호스트까지 못박는다.
 */
const PRODUCTION_API_HOST = "api.momentory.co.kr";

/**
 * 출시 빌드인가 — 셋 중 하나면 아래 검사가 켜진다.
 *
 * - `MOMENTORY_BUILD_ENV=production` — 배포용 prebuild 에서 명시한다(`docs/SETUP.md`)
 * - `CONFIGURATION=Release` — **Xcode 가 Release 로 빌드 · 아카이브할 때** 앱 설정을 만드는
 *   스크립트(expo-constants)에 넘기는 값이다. prebuild 때 명시를 잊어도 아카이브에서 걸린다
 * - `MOMENTORY_RELEASE_BUILD=1` — Android 릴리스 작업(`bundleRelease` 등)이 잡히면 Gradle 이
 *   같은 스크립트에 넘긴다(`plugins/withReleaseSigning.ts`)
 *
 * `.env` 의 `MOMENTORY_BUILD_ENV=development` 는 늘 들어 있으므로 그 값만으로는 가르지 않는다.
 */
const isReleaseBuild =
  buildEnvironment === "production" ||
  process.env.CONFIGURATION === "Release" ||
  process.env.MOMENTORY_RELEASE_BUILD === "1";

/**
 * 배포 바이너리는 로그인이나 API가 조용히 빠지거나 **엉뚱한 서버를 가리킨 채** 만들어지면
 * 안 된다. 개발 환경은 빈 설정으로도 UI를 열 수 있지만, 출시 빌드는 여기서 막는다.
 */
const validateProductionEnvironment = () => {
  if (!isReleaseBuild) return;

  const required = {
    EXPO_PUBLIC_API_BASE_URL: apiBaseUrl,
    EXPO_PUBLIC_KAKAO_APP_KEY: kakaoAppKey,
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: googleIosClientId,
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: googleWebClientId,
  };
  const missing = Object.entries(required)
    .filter(([, value]) => value.trim() === "")
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`[production config] 필수 환경변수가 없습니다: ${missing.join(", ")}`);
  }

  let apiUrl: URL;
  try {
    apiUrl = new URL(apiBaseUrl);
  } catch {
    throw new Error("[production config] EXPO_PUBLIC_API_BASE_URL이 올바른 URL이 아닙니다.");
  }
  if (apiUrl.protocol !== "https:") {
    throw new Error("[production config] EXPO_PUBLIC_API_BASE_URL은 https:// 주소여야 합니다.");
  }
  if (apiUrl.hostname !== PRODUCTION_API_HOST) {
    throw new Error(
      `[production config] 출시 빌드의 EXPO_PUBLIC_API_BASE_URL은 https://${PRODUCTION_API_HOST} 여야 합니다(지금 ${apiUrl.hostname}). .env 를 운영 주소로 바꿔 주세요.`,
    );
  }
};

validateProductionEnvironment();

/**
 * API 서버가 **평문 HTTP** 일 때의 호스트. HTTPS·미설정이면 빈 문자열이다.
 *
 * 주소는 여기 한 곳에서만 읽는다 — 화면·repository 어디에도 IP 를 적지 않는다.
 * 평문 예외를 여는 유일한 조건이 이 값이므로, `.env` 가 `https://` 로 바뀌면
 * `withInsecureDevApi` 는 매니페스트·Info.plist 를 건드리지 않는다.
 */
const cleartextHostOf = (url: string): string => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" ? parsed.hostname : "";
  } catch {
    return ""; // 비어 있거나 형식이 아니면 예외를 열 이유가 없다
  }
};

const insecureApiHost = cleartextHostOf(apiBaseUrl);

/** `plugins` 배열의 한 칸 — 조건부로 넣고 뺄 때 타입을 잃지 않게 이름을 준다 */
type PluginEntry = NonNullable<ExpoConfig["plugins"]>[number];

/**
 * 카카오 로그인 (M2-1). 네이티브 앱 키가 매니페스트·Info.plist 의 URL 스킴
 * (`kakao<앱키>`)까지 들어가므로 **키 없이 붙이면 스킴이 깨진다** — 그래서
 * `.env` 가 비면 플러그인을 통째로 뺀다(빌드는 되고 로그인만 안 된다).
 */
const kakaoPlugin: PluginEntry[] = kakaoAppKey
  ? [["@react-native-seoul/kakao-login", { kakaoAppKey }]]
  : [];

/**
 * 구글이 iOS 앱에 돌아올 때 쓰는 URL 스킴 — **iOS 클라이언트 ID 를 뒤집은 값**이다.
 *
 * `.env` 에 따로 두지 않고 여기서 만든다. 손으로 적으면 클라이언트 ID 를 바꿀 때
 * 한쪽만 고쳐지고, 그 어긋남은 **로그인 시트는 뜨는데 앱으로 돌아오지 않는**
 * 모양으로만 드러난다 — 원인을 찾기 어려운 실패다.
 *
 * ```
 * 719283265966-s6jo83….apps.googleusercontent.com
 *   → com.googleusercontent.apps.719283265966-s6jo83…
 * ```
 */
const reversedIosClientId = (clientId: string): string => {
  const suffix = ".apps.googleusercontent.com";
  if (!clientId.endsWith(suffix)) return "";
  return `com.googleusercontent.apps.${clientId.slice(0, -suffix.length)}`;
};

/**
 * 구글 로그인. 카카오와 **같은 이유로 조건부**다 — 플러그인이 역순 클라이언트 ID 를
 * Info.plist 의 URL 스킴에 넣는데, 값이 없으면 플러그인이 아예 던진다
 * (`iosUrlScheme` 를 필수로 검사한다). `.env` 가 비면 통째로 뺀다: 빌드는 되고
 * 구글 로그인만 안 된다.
 *
 * ⚠ **Android 에는 이 플러그인이 손대는 것이 없다.** 구글은 Android 앱을
 * 패키지명 + 서명 지문으로 알아보므로 매니페스트에 넣을 키가 없다 — 앱이 드는
 * 값은 `extra` 의 웹 클라이언트 ID 하나뿐이다(`googleSdk.ts`).
 */
const googlePlugin: PluginEntry[] = reversedIosClientId(googleIosClientId)
  ? [
      [
        "@react-native-google-signin/google-signin",
        { iosUrlScheme: reversedIosClientId(googleIosClientId) },
      ],
    ]
  : [];

/**
 * 개발 서버가 평문 HTTP 인 동안만 그 호스트 하나에 예외를 연다.
 * HTTPS 로 바뀌면 `insecureApiHost` 가 비어 이 칸이 사라진다.
 */
const insecureApiPlugin: PluginEntry[] = insecureApiHost
  ? [["./plugins/withInsecureDevApi", { host: insecureApiHost }]]
  : [];

/**
 * **운영 빌드에서만** Expo Dev Launcher 의 로컬 네트워크 흔적을 지운다
 * (`plugins/withoutDevLauncherNetwork.ts` 머리말).
 *
 * 개발 빌드에는 붙이지 않는다 — 지우면 dev client 가 Metro 를 못 찾는다.
 * 목록의 **맨 뒤**에 둔다: 앞선 플러그인들이 넣은 키를 지우는 일이라 마지막에 돌아야 한다.
 */
const productionCleanupPlugins: PluginEntry[] =
  buildEnvironment === "production" ? ["./plugins/withoutDevLauncherNetwork"] : [];

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "모멘토리",
  slug: "momentory",
  version: "1.2.0",
  orientation: "portrait",
  scheme: "momentory", // 회고 알림 → 딥링크
  icon: "./assets/icon.png",

  // 다크모드에서도 크림 배경을 유지한다 — 쉼터 톤이 앱의 정체성이라 반전하지 않는다.
  // (09_MVP/docs/S0.md · 01_화면설계/1. SPLASH/docs/RULES.md)
  userInterfaceStyle: "light",

  // 앱 식별자 — 2026-08-24 개정 (`com.momentory.app` → `kr.momentory.app`).
  // 카카오·구글·애플과 스토어에 이 값으로 등록한다. 등록 뒤에는 바꿀 수 없다
  // (스토어는 같은 ID 를 재사용할 수 없다).
  //
  // ⚠ 옛 값 `com.momentory.app` 은 **쓸 수 없다.** 팀원이 무료 개인 계정(Personal
  // Team)으로 실기기에 올릴 때 Xcode 가 그 번들 ID 를 조용히 등록했고, 애플의 번들
  // ID 는 전 세계에서 유일해야 한다. Personal Team 의 등록은 developer.apple.com
  // Identifiers 목록에 **나타나지도 않으면서** 문자열만 점유한다 — 그래서 목록이
  // 비어 있는데 등록만 거부됐다. 되찾으려면 애플 지원 티켓뿐이라 이름을 바꿨다.
  //
  // iOS·Android 를 **같은 값으로 둔다** — 갈라두면 콘솔마다 다른 값을 넣게 되고
  // 어느 쪽이 맞는지 매번 확인해야 한다. 등록 절차와 키 해시·SHA-1 은
  // docs/SETUP.md 「앱 식별자와 외부 등록」 참조.
  ios: {
    supportsTablet: false,
    bundleIdentifier: "kr.momentory.app",
    /**
     * 빌드 번호 — **App Store Connect 에 올린 어떤 빌드보다 커야 한다.**
     *
     * 같은 `version`(0.1.0) 으로 다시 올리려면 이 값이 반드시 올라가야 하고,
     * 한 번 올린 번호는 그 버전에서 재사용할 수 없다(업로드가 거부된다).
     * 적지 않으면 Expo 가 `1` 로 만든다 — 첫 제출이 그 번호였다.
     *
     * `2` = Reminders·Face ID 권한 문구를 뺀 재제출 빌드(2026-08-28).
     * ⚠ **다음 업로드 전에 반드시 올린다.** 아카이브를 다시 만들 때마다가 아니라,
     * App Store Connect 에 **올릴 때마다**다.
     */
    buildNumber: "4",
  },
  android: {
    package: "kr.momentory.app",
    // 사용자가 제공한 새 아이콘을 기본·Android 런처에 함께 사용한다.
    adaptiveIcon: {
      backgroundColor: "#F0E2C6",
      foregroundImage: "./assets/icon.png",
    },
    predictiveBackGestureEnabled: false,

    // 스토어가 「이 빌드가 저것보다 새 것인가」를 판단하는 **유일한** 근거다
    // (`version` 은 사람이 읽는 이름일 뿐 순서를 만들지 않는다). Play 는 같은 값을
    // 두 번 받지 않으므로 **업로드마다 1 씩 올린다** — 심사에서 반려돼 다시 올릴
    // 때도 올려야 한다.
    //
    // ⚠ `android/app/build.gradle` 이 아니라 여기에 둔다. 그 파일은 prebuild 가
    // 다시 만드는 생성물이라, 거기서 올린 숫자는 다음 prebuild 에 1 로 되돌아간다.
    //
    // ⚠ **3 은 건너뛴다.** dev 서버(`dev.momentory.co.kr`)로 빌드한 AAB 를 실수로
    // 올렸다가 출시를 지웠는데, Play 는 **아티팩트가 라이브러리에 들어간 시점에**
    // 번호를 소비한다 — 출시를 지워도 그 번호는 돌아오지 않는다. 그래서 4 다.
    // (테스터에게 나가지는 않았다. 출시 전에 지웠다.)
    versionCode: 6,
  },

  // ⚠ 플러그인의 유일한 출처. `npx expo install` 이 app.json 을 만들어 여기 목록을
  // 덮이게 두지 않는다 — app.json 은 지웠고, 새 플러그인은 이 배열에 직접 추가한다.
  plugins: [
    "expo-router",
    [
      "expo-dev-client",
      {
        launchMode: "most-recent",
      },
    ],
    "expo-status-bar",
    // M2-0 인증 부트스트랩 — 세션 토큰 저장 (ARCHITECTURE §3)
    [
      "expo-secure-store",
      {
        // `requireAuthentication` 을 쓰지 않는다 — Face ID 를 요청하는 자리가 없다.
        // 기본값을 두면 플러그인의 영문 기본 문구가 Info.plist 에 들어가고,
        // Reminders 와 같은 종류의 자동 심사 대상이 된다.
        faceIDPermission: false,
      },
    ],
    // 회고 시간 알림(08 · M3) — 전부 로컬 알림이다. 푸시 토큰도 서버도 없다.
    // Android 상태바 아이콘은 **알파만 쓴다**(모양만 남고 색은 tint 로 칠해진다) —
    // 단색 실루엣인 모노크롬 아이콘이 그대로 맞는다. 색은 primary.
    [
      "expo-notifications",
      {
        icon: "./assets/android-icon-monochrome.png",
        color: "#C2703D",
      },
    ],
    // 09 캘린더 연결 — **읽기만 한다.** 원본을 고치지 않으므로 쓰기 권한 문구도
    // 미리 알림(iOS 전용)도 두지 않는다. 문구는 `09.md` 안내 카드 문안 그대로다 —
    // 시스템 다이얼로그와 앞 화면이 다른 말을 하면 안내가 안내가 아니게 된다.
    [
      "expo-calendar",
      {
        calendarPermission:
          "일정 제목을 모멘토리에 저장해 회고 질문을 만드는 데 사용해요. 캘린더 원본은 수정하지 않고, 다른 사람에게 공유하지 않아요.",
        // Apple Reminders(미리 알림)는 사용하지 않는다. expo-calendar의 기본값을
        // 그대로 두면 두 Reminders purpose string이 Info.plist에 추가되어 심사 대상이 된다.
        remindersPermission: false,
      },
    ],
    // 회고 음성 입력(2026-09-29) — OS 음성 인식기를 쓴다(외부 STT API 없음).
    // 권한 팝업은 설치·실행 때가 아니라 입력창의 마이크 버튼을 처음 누를 때 뜬다.
    // Android 는 RECORD_AUDIO 와 Google 음성 인식 서비스 조회(<queries>)가 추가된다.
    [
      "expo-speech-recognition",
      {
        microphonePermission: "회고를 말로 적을 수 있도록 마이크를 사용해요.",
        speechRecognitionPermission:
          "말한 내용을 글자로 바꿔 회고 입력창에 넣는 데 사용해요. 음성은 저장하지 않아요.",
      },
    ],
    // 카카오 SDK 는 Maven Central 에 없다 — 카카오 저장소를 Gradle 에 알린다.
    // (`@react-native-seoul/kakao-login` README 「EXPO」)
    //
    // R8 도 **여기서만 켤 수 있다.** `android/gradle.properties` 를 직접 고쳐도
    // 다음 prebuild 에 사라진다 — `withReleaseSigning` 을 만든 것과 같은 이유다.
    [
      "expo-build-properties",
      {
        ios: {
          enableSceneSupport: true,
        },
        android: {
          extraMavenRepos: ["https://devrepo.kakao.com/nexus/content/groups/public/"],

          // 코드 축소·난독화. **릴리스 빌드에서만 돈다** — 개발 중에는 무엇이 깨졌는지
          // 드러나지 않으므로, 이 값을 건드린 뒤에는 릴리스 산출물을 실기기에 깔아
          // 로그인 3종 · 알림 딥링크 · 캘린더 · 세션 복원을 손으로 확인한다.
          enableMinifyInReleaseBuilds: true,

          // 리소스 축소. 위 항목이 **전제 조건**이다(플러그인이 검사해서 던진다).
          // RN 앱은 이미지가 JS 번들 asset 이라 `res/` 에 거의 없어 절감폭은 작다.
          enableShrinkResourcesInReleaseBuilds: true,

          /**
           * ⚠ 여기 적은 것만 살아남는다 — `android/app/proguard-rules.pro` 는 생성물이다.
           *
           * 네이티브 의존은 대부분 자기 keep 룰을 AAR 에 담아 온다
           * (`consumerProguardFiles` — expo-modules-core · expo-notifications ·
           * expo-image · react-native-svg · kakao-login · google-signin 확인함).
           * **Amplitude 만 없다** — 리플렉션으로 이름을 찾다 깨지면 「빌드는 되는데
           * 이벤트만 안 올라간다」로 드러나서 알아채기 어렵다. 그래서 통째로 남긴다.
           */
          extraProguardRules: [
            "# @amplitude/analytics-react-native — AAR 에 consumer 룰이 없다 (2026-09-06 확인)",
            "-keep class com.amplitude.** { *; }",
            "-dontwarn com.amplitude.**",
          ].join("\n"),
        },
      },
    ],
    // 약관·개인정보 처리방침·문의는 웹 문서다 — 앱을 떠나지 않고 **앱 안에서**
    // 연다(iOS SFSafariViewController · Android Custom Tabs). 로그인 화면의 약관 줄과
    // 마이의 「지원」이 같은 통로(`src/lib/links.ts`)를 지난다.
    "expo-web-browser",
    // 감각연못의 카피바라(`CapybaraFigure`) — 움직이는 WebP 를 그린다.
    // ⚠ 이 플러그인이 하는 일은 **iOS Podfile 속성 하나**(AVIF 디코더 링크)뿐이고,
    // 움직이는 WebP 재생은 두 플랫폼 다 모듈 자체가 한다 — 그래도 `expo install` 이
    // 요구하는 줄이라 두어야 prebuild 결과가 갈리지 않는다.
    "expo-image",
    // 애플 로그인 (2026-08-24). 이 한 줄이 하는 일은 **엔타이틀먼트 하나**다 —
    // `com.apple.developer.applesignin: ["Default"]` 를 iOS 엔타이틀먼트에 넣고,
    // 애플 버튼이 시스템 언어를 따르도록 `CFBundleAllowMixedLocalizations` 를 켠다.
    //
    // ⚠ **키를 받지 않는다.** 카카오와 달리 앱 키가 없다 — 애플은 **번들 ID 로**
    // 앱을 알아본다(`kr.momentory.app`). 그래서 `.env` 에 더할 값도 없고,
    // 조건부로 뺄 이유도 없다(카카오는 키가 없으면 URL 스킴이 깨져 통째로 뺀다).
    //
    // ⚠ **Android 빌드에는 아무 영향이 없다** — 이 플러그인은 iOS 만 건드린다.
    // 애플 줄이 Android 에서 「쓸 수 없다」로 닫히는 것은 이 설정이 아니라
    // 네이티브 모듈이 없기 때문이다(`src/features/auth/data/appleSdk.ts`).
    //
    // 콘솔 쪽 준비(App ID · Sign In with Apple 체크 · Key)는
    // docs/SETUP.md 「애플 콘솔에서 정확히 무엇을 하는가」에 있다.
    "expo-apple-authentication",
    ...kakaoPlugin,
    ...googlePlugin,
    ...insecureApiPlugin,
    // release 를 출시용 키스토어로 서명한다. 키·비밀번호는 저장소에 없다 —
    // `~/.gradle/gradle.properties` 의 `MOMENTORY_RELEASE_*` 를 이름으로 참조할 뿐이다.
    // 값이 없는 기기에서는 debug 키로 떨어지고 빌드 로그에 경고가 찍힌다.
    "./plugins/withReleaseSigning",
    // 출시본에서 `SYSTEM_ALERT_WINDOW`(다른 앱 위에 표시)를 뺀다 — expo-dev-client 가
    // 개발자 메뉴 때문에 넣는 권한이라 출시본에는 쓸 일이 없는데 사용자에게는 보인다.
    // debug 는 그대로 둔다(release 소스셋에만 쓴다).
    "./plugins/withoutDevOverlayPermission",
    // 스플래시는 **런처 아이콘 + `Momentory` 워드마크**다 — `assets/icon.png`(카피바라 얼굴)
    // 아래에 옛 스플래시의 워드마크를 붙여 캔버스 가운데에 앉혔다(2026-10-06). 아이콘만
    // 바꾸고 스플래시를 옛 로고로 두었더니 앱을 켤 때마다 옛 그림이 먼저 떴다 —
    // **아이콘을 바꾸면 이 파일도 같이 바꾼다.**
    //
    // 배경은 아이콘 바탕과 같은 베이지(`ds/color.ts` `background.splash`)라 아이콘 테두리가
    // 보이지 않고 얼굴만 떠 있다. `S0`(`app/index.tsx`)가 **같은 색·같은 그림·같은 자리**를
    // 그려 이어받으므로 로딩 화면이 한 장으로 보인다 — 여기를 바꾸면 S0 도 같이 바꾼다.
    // 캔버스 바탕도 이 베이지로 **채워 둔다** — 투명으로 두면 기기가 줄일 때 아이콘 가장자리가
    // 반투명해져 희미한 네모 선이 보였다(2026-10-06 실기기).
    //
    // ⚠ 이미지 안의 내용은 정사각 캔버스의 **안쪽 66% 원** 안에만 있다 — 안드로이드 12+
    // 는 스플래시 아이콘을 원으로 깎으므로, 얼굴(캔버스 폭 47%)과 워드마크가 그 원에 들게
    // 줄였다. 그래서 `imageWidth` 는 화면에 보이길 바라는 폭이 아니라 그 1.5배다.
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        imageWidth: 288,
        resizeMode: "contain",
        backgroundColor: "#EFE0C6", // ds/color.ts background.splash — S0 와 같은 색
      },
    ],
    [
      "expo-font",
      {
        fonts: [
          "./assets/fonts/Pretendard-Regular.otf",
          "./assets/fonts/Pretendard-Medium.otf",
          "./assets/fonts/Pretendard-SemiBold.otf",
          "./assets/fonts/Pretendard-Bold.otf",
          "./assets/fonts/KyoboHandwriting2025lyb.ttf",
          // 구글 로그인 버튼 한 줄 전용 — `components/ds/SocialButton.tsx`
          "./assets/fonts/Roboto-Medium.ttf",
        ],
      },
    ],
    // ⚠ **맨 뒤여야 한다** — 앞선 플러그인들이 넣은 키를 지우는 일이다
    ...productionCleanupPlugins,
  ],

  experiments: {
    typedRoutes: true,
  },

  extra: {
    apiBaseUrl,
    kakaoAppKey,
    googleIosClientId,
    googleWebClientId,
  },
});
