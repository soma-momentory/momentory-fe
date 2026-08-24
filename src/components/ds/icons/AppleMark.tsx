import Svg, { Path } from "react-native-svg";

/**
 * Apple 로고 — **애플이 배포하는 공식 아트워크 그대로다** (2026-08-24 교체).
 *
 * 출처: Apple Design Resources 「Sign in with Apple Logo」
 * (`Logo-Sign-in-with-Apple.dmg` → `Sign in with Apple - Left Aligned/SVG/`
 * `Logo - SIWA - Left-aligned - White - Medium.svg`). **경로를 한 글자도 고치지
 * 않았다** — 좌표·곡선 전부 애플 파일의 것이다.
 *
 * HIG 가 커스텀 버튼에 대해 못박는 문장이 이것이다:
 * 「Use only the logo artwork downloaded from Apple Design Resources; **never
 * create a custom Apple logo**」. 2026-08-24 오전까지는 Wanted 아이콘 세트의
 * 애플 글리프를 썼는데(형태 일치도 96.3% · 가로세로비 2.8% 좁았다) 그것이 바로
 * 「custom Apple logo」다. 그래서 원본으로 갈아끼웠다.
 *
 * ## 왜 Medium 인가 — **옆 줄들과 마크 크기를 맞추라**는 것이 사이즈를 셋 둔 이유다
 *
 * 텍스트가 있는 버튼용 파일은 Small(24×44) · Medium(31×44) · Large(39×44) 셋이고,
 * 버튼 48 로 환산한 글리프 높이가 각각 **15.85 / 20.73 / 26.18** 이다. HIG 가 셋을
 * 두는 이유를 이렇게 적는다: 「Logos are available in small, medium, and large sizes,
 * so you can **match logo sizes in all the sign-up buttons you display**.」
 *
 * 우리 로그인 화면의 다른 두 마크는 **카카오 17.69 · Google 20.00** 이다.
 * Small(15.85)은 둘보다 눈에 띄게 작았고 — 2026-08-24 에 실제로 「애플 로고가 작다」로
 * 드러났다 — **Medium(20.73)** 이 Google 20 과 나란히 선다. 그래서 Medium 이다.
 *
 * ⚠ 애플이 직접 렌더한 48 버튼의 로고는 15.5(≈Small)다. 그쪽에 맞추면 **애플 버튼
 * 하나만** 놓고 볼 때 똑같아지지만, 세 줄을 함께 놓으면 애플 줄만 작아진다.
 * HIG 가 「match logo sizes in all the sign-up buttons」이라고 적은 쪽을 따른다.
 *
 * ## 크기는 「파일 높이 = 버튼 높이」에서 나온다
 *
 * HIG: 「**Match the height of the logo file to the height of the button.**」
 * 그래서 이 컴포넌트는 글리프 크기가 아니라 **버튼 높이**를 받는다 — 48 을
 * 손대는 날 로고가 저절로 따라 움직인다. 파일 44 안에서 글리프가 14.532 를
 * 차지하므로 버튼 48 에서는 20.73 이다.
 *
 * viewBox 를 글리프 경계로 잡는 것은 **투명 여백만 걷어내는 것**이고 로고 자체는
 * 자르지 않는다(「Don't crop the logo file」). 애플 파일의 여백은 **좌측 정렬**
 * 배치용인데(폴더 이름이 Left Aligned 다) 우리 버튼은 가운데 정렬이라, 그 여백을
 * 그대로 두면 세 줄 중 애플 줄만 광학 중심이 3.35 밀린다. 대신 로고~글자 간격은
 * 애플 자체 렌더의 실측값 10 을 `SocialButton` 이 명시적으로 준다 — 파일에 내장된
 * 여백(48 환산 6.58)은 애플이 「minimum margin」이라 부르는 하한이고, 10 은 그
 * 하한을 넘는다.
 *
 * ## 라이선스 — 임베딩이 허용된 아트워크다
 *
 * `Apple Inc. Developer Artwork License Agreement for Sign in with Apple` §2A 가
 * 「use the Developer Artwork **in the user interface of your software
 * applications** that run on Apple's iOS ... (**and corresponding web-based or
 * other versions** of your software applications that have the same title and
 * substantially equivalent features)」를 허용한다. 괄호 안의 「other versions」가
 * **우리 안드로이드 빌드**를 덮는다 — 같은 제목·같은 기능의 대응 버전이다.
 *
 * ⚠ dmg 볼륨 안의 `Apple Design Resources License.rtf` 는 **다른 문서다** —
 * 「mock-up 전용 · 소프트웨어 임베드 금지」인 범용 라이선스이고, 이 아트워크에
 * 적용되는 것은 위의 SIWA 전용 계약이다. 둘을 헷갈리지 않는다.
 *
 * ⚠ 그리고 §2A 에는 **「only if you are an Apple Developer Program member」**가
 * 붙는다 — 프로그램 멤버십이 끊기면 이 아트워크를 쓸 근거도 끊긴다.
 */
export function AppleMark({ buttonHeight, color }: { buttonHeight: number; color: string }) {
  const height = buttonHeight * (GLYPH.height / FILE_HEIGHT);

  return (
    <Svg
      width={height * ASPECT}
      height={height}
      // 애플 파일의 글리프 경계 — 투명 여백만 걷어낸 것이지 로고를 자르지 않는다
      viewBox={`${GLYPH.x} ${GLYPH.y} ${GLYPH.width} ${GLYPH.height}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* 색은 검정/흰 둘뿐이고 커스텀 색을 쓰지 않는다(HIG) — 호출자가 판 색에 맞춘다 */}
      <Path d={OFFICIAL_PATH} fill={color} />
    </Svg>
  );
}

/** 애플 파일의 높이. 「파일 높이 = 버튼 높이」 규칙의 분모다 */
const FILE_HEIGHT = 44;

/**
 * 애플 파일(31×44) 안에서 글리프가 실제로 차지하는 상자. 브라우저 `getBBox()` 로
 * 잰 값이다 — 세 사이즈(Small·Medium·Large)의 가로세로비가 **0.8137 로 모두 같다** — 사이즈만 다르고 형태는 하나다.
 */
const GLYPH = { x: 7.75, y: 10.5, width: 15.461, height: 19.0 } as const;

const ASPECT = GLYPH.width / GLYPH.height;

/**
 * ⚠ **애플 원본 경로다 — 고치지 않는다.** 라이선스가 `modify` 와
 * `create derivative works` 를 금지한다. 좌표 하나라도 손대면 그 순간
 * 「custom Apple logo」가 된다.
 */
const OFFICIAL_PATH =
  "M15.7099491,14.8846154 C16.5675461,14.8846154 17.642562,14.3048315 18.28274,13.5317864 C18.8625238,12.8312142 19.2852829,11.852829 19.2852829,10.8744437 C19.2852829,10.7415766 19.2732041,10.6087095 19.2490464,10.5 C18.2948188,10.5362365 17.1473299,11.140178 16.4588366,11.9494596 C15.9152893,12.56548 15.4200572,13.5317864 15.4200572,14.5222505 C15.4200572,14.6671964 15.4442149,14.8121424 15.4562937,14.8604577 C15.5166879,14.8725366 15.6133185,14.8846154 15.7099491,14.8846154 Z M12.6902416,29.5 C13.8618881,29.5 14.3812778,28.714876 15.8428163,28.714876 C17.3285124,28.714876 17.6546408,29.4758423 18.9591545,29.4758423 C20.2395105,29.4758423 21.0971074,28.292117 21.9063891,27.1325493 C22.8123013,25.8038779 23.1867451,24.4993643 23.2109027,24.4389701 C23.1263509,24.4148125 20.6743484,23.4122695 20.6743484,20.5979021 C20.6743484,18.1579784 22.6069612,17.0588048 22.7156707,16.974253 C21.4353147,15.1382708 19.490623,15.0899555 18.9591545,15.0899555 C17.5217737,15.0899555 16.3501271,15.9596313 15.6133185,15.9596313 C14.8161157,15.9596313 13.7652575,15.1382708 12.521138,15.1382708 C10.1536872,15.1382708 7.75,17.0950413 7.75,20.7911634 C7.75,23.0861411 8.64383344,25.513986 9.74300699,27.0842339 C10.6851558,28.4129053 11.5065162,29.5 12.6902416,29.5 Z";
