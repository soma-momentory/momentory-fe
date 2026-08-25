import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * 시크릿은 여기 적지 않는다 — env 에서 읽는다 (`.env.example` 참조).
 * 값이 필요한 곳은 `extra` 를 거쳐 `expo-constants` 로 읽는다.
 */
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
const kakaoAppKey = process.env.EXPO_PUBLIC_KAKAO_APP_KEY ?? "";
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";
const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";

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

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "모멘토리",
  slug: "momentory",
  version: "0.1.0",
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
  },
  android: {
    package: "kr.momentory.app",
    // 배경색은 **로고 자체의 면**이다(`assets/logo.jpeg` = #F2E4DC).
    //
    // 전경 PNG 는 그 면을 지운 **내용만**이라(투명 배경), 베이지를 그리는 것은
    // 배경층 하나뿐이다 — 여기를 바꾸면 카피바라가 다른 색 위에 뜬 것처럼 된다.
    //
    // ⚠ 전경은 **워드마크를 뺀 카피바라만**이다(2026-08-24). 홈 화면의 아이콘은
    // 손톱만 하고 그 옆에 앱 이름이 이미 적혀 있다 — 워드마크를 같이 넣으면
    // 읽히지도 않으면서 카피바라만 작아진다. 온전한 로고는 스플래시가 맡는다.
    //
    // ⚠ 배율이 `icon.png`(67%)보다 작은 **44%** 인 것은 실수가 아니다. 런처는
    // 108dp 중 안쪽 72dp(66%) 만 보여 주고 거기에 마스크를 씌우므로, 그 틀 안에서
    // iOS 와 같아 보이려면 0.66 × 0.67 ≈ 44% 다. 67% 로 그리면 원이 카피바라를
    // 자른다 — 바꿀 때는 원형으로 깎아 확인한다.
    adaptiveIcon: {
      backgroundColor: "#F2E4DC",
      foregroundImage: "./assets/android-icon-foreground.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },

  // ⚠ 플러그인의 유일한 출처. `npx expo install` 이 app.json 을 만들어 여기 목록을
  // 덮이게 두지 않는다 — app.json 은 지웠고, 새 플러그인은 이 배열에 직접 추가한다.
  plugins: [
    "expo-router",
    "expo-status-bar",
    // M2-0 인증 부트스트랩 — 세션 토큰 저장 (ARCHITECTURE §3)
    "expo-secure-store",
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
      },
    ],
    // 카카오 SDK 는 Maven Central 에 없다 — 카카오 저장소를 Gradle 에 알린다.
    // (`@react-native-seoul/kakao-login` README 「EXPO」)
    [
      "expo-build-properties",
      {
        android: {
          extraMavenRepos: ["https://devrepo.kakao.com/nexus/content/groups/public/"],
        },
      },
    ],
    // 약관·개인정보 처리방침·문의는 웹 문서다 — 앱을 떠나지 않고 **앱 안에서**
    // 연다(iOS SFSafariViewController · Android Custom Tabs). 로그인 화면의 약관 줄과
    // 마이의 「지원」이 같은 통로(`src/lib/links.ts`)를 지난다.
    "expo-web-browser",
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
    // 스플래시도 **같은 로고 하나**다 — 런처 아이콘과 마찬가지로
    // `assets/logo.jpeg` 에서 배경을 지워 뽑았다.
    //
    // 배경은 앱의 첫 화면과 같은 크림(`ds/color.ts` `background.normal`)이다 —
    // 스플래시가 다른 색이면 `S0` 로 넘어가는 순간 바탕이 한 번 튄다. 옛 값
    // `#F2E9DA`(2세대 palette.bgMid)는 어느 화면의 색도 아니었다.
    //
    // ⚠ 이미지 안의 내용은 정사각 캔버스의 **안쪽 66%** 에만 있다 — 안드로이드 12+
    // 는 스플래시 아이콘을 원으로 깎으므로, 가장자리까지 채우면 워드마크가 잘린다.
    // 그래서 `imageWidth` 는 화면에 보이길 바라는 폭이 아니라 그 1.5배다.
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        imageWidth: 288,
        resizeMode: "contain",
        backgroundColor: "#F7F4ED", // ds/color.ts background.normal
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
        ],
      },
    ],
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
