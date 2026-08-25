import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { overlay, radius, size, social, space } from "@/design/ds";

import { Icon } from "./icons/Icon";
import { AppleMark } from "./icons/AppleMark";
import { GoogleMark, MARK_HEIGHT as GOOGLE_MARK } from "./icons/GoogleMark";
import { Text } from "./Text";

/**
 * 소셜 로그인 버튼 — `DESIGN.md` 「로그인」 · **3사 공식 규격**(2026-08-24 개정).
 *
 * > 소셜 3종(카카오·Google·Apple) **공식 색·마크 유지**, 높이 48 · 간격 10.
 * > 공통은 **높이·Radius·간격만** — 색·로고는 손대지 않는다.
 *
 * 그래서 `Button` 의 변형이 아니라 **따로 있는 컴포넌트**다. `Button` 의 variant 로
 * 넣으면 팔레트 밖 색이 DS 버튼 안으로 들어와 다음 사람이 그걸 일반 버튼에 쓴다.
 * 공유하는 것은 치수(`size.button.large` 48 · `radius.medium` 12)와 누름 표현뿐이다.
 *
 * ## 세 줄이 같은 값을 쓰지 않는다 — 규격이 서로 다르기 때문이다
 *
 * 2026-08-24 이전에는 마크 20 · 간격 8 · 여백 16 을 셋이 나눠 썼다. 공식 문서를
 * 실제로 읽어 보니 **세 회사가 마크 크기·간격·여백을 각자 다르게 못박고 있었다**:
 *
 * | | 마크 | 글자 | 마크~글자 | 좌우 여백 | 근거 |
 * | --- | --- | --- | --- | --- | --- |
 * | 카카오 | 24 (심볼 19.2×18.1) | 16 = 48÷3 | 8 | 16 | 컨테이너에 **비례** — 표준 90 버튼의 40%×37.8% |
 * | Google | 20 | 14 = 규격 그대로 | iOS 12 · 그 외 10 | iOS 16 · 그 외 12 | 브랜딩 가이드라인의 **절대값** |
 * | Apple | 15.85 (로고 12.90×15.85) | 20.64 = 48×43% | 10 | 16 | **공식 아트워크**(Small) · 파일 높이 = 버튼 높이 |
 *
 * 카카오·애플은 「컨테이너 크기에 비례해 키우라」는 규정이고 구글은 절대값 규정이라,
 * **같은 48 버튼인데도 마크가 24·20·15.5 로 갈린다.** 셋을 20 으로 통일하면 카카오
 * 심볼은 규정보다 22% 작고 애플 로고는 15% 크다 — 그래서 통일하지 않는다.
 *
 * ## 글자 크기도 통일하지 않는다 — 통일할 수가 없다
 *
 * 처음에는 셋을 16 으로 맞췄다(2026-08-24 오전). 규격을 다시 읽어 보니 **세 회사가
 * 서로 다른 크기를 요구**하고 있었고, 그중 둘은 권장이 아니라 요구였다:
 *
 * - 애플 43% — HIG 커스텀 버튼 절이 서체·굵기·크기 조정은 허용하면서
 *   「the title and button height ... **need to** use the same proportions that the
 *   system uses」라고 적는다 → 48 × 43% = 20.64
 * - 카카오 — 「폰트는 30Pt 크기」(표준 90 버튼) + 「레이블 세로 길이 ≤ 컨테이너
 *   높이의 1/3」 → 48 ÷ 3 = 16
 * - 구글 — 「Google Sans Medium | **14/20**」으로 크기와 행간을 함께 못박는다
 *
 * ⚠ **셋을 한 크기로 맞추는 길은 없다.** 카카오 상한(높이의 37.8% — 한글 ink/em
 * 0.88 을 반영한 값)이 애플 요구(43%)보다 낮다. 둘 다 **높이에 대한 비율** 규칙이라
 * 버튼을 키워도 같이 커진다 — 어느 높이에서도 동시에 만족할 수 없다.
 *
 * **그래서 세 줄의 글자가 16 · 14 · 20.64 로 갈린다.** 보기 좋게 통일하려는
 * 다음 사람을 위해 적어 둔다: 통일하는 순간 최소 한 줄이 규격을 벗어난다.
 *
 * ## 서체도 세 줄이 다르다 — **셋 다 각 사가 지정한 것**이다
 *
 * | | 서체 | 규격이 적는 말 |
 * | --- | --- | --- |
 * | 카카오 | **OS 시스템 서체** | 「폰트는 OS 별 기본 시스템 서체를 사용합니다」 |
 * | Google | **Google Sans Medium**(번들) | 「Font: Google Sans Medium | 14/20」 |
 * | Apple | **OS 시스템 서체** | 「Prefer the system font for the title」 |
 *
 * 카카오·애플은 `labelFamily` 를 **비워 둔다** — RN 에서 그것이 곧 시스템 서체다.
 * iOS 에서는 SF Pro(한글은 Apple SD Gothic Neo)라 **애플이 렌더한 공식 버튼과 같은
 * 서체**가 되고, 카카오가 말하는 「OS 별 기본 시스템 서체」도 동시에 만족한다.
 * 구글만 번들 파일을 지정하는데, 규격이 서체를 이름으로 못박는 곳이 거기뿐이다.
 *
 * ⚠ **그래서 이 화면의 버튼 셋만 Pretendard 를 쓰지 않는다.** 워드마크·태그라인·
 * 약관 줄은 그대로 Pretendard 다. 규격이 서체를 지정하는 자리라서 생긴 예외이고,
 * 다른 화면으로 번지지 않는다(`CLAUDE.md` 규칙 5 의 예외).
 *
 * ## 굵기는 500 이다 — 600 은 규격보다 두꺼웠다
 *
 * 처음에는 셋 다 SemiBold(600)였는데 공식 렌더와 나란히 놓으니 굵었다. 애플 공식
 * 버튼(375×64 @6x)에서 **획 두께 ÷ 글자 ink 높이**를 재면:
 *
 * | | 획/높이 | 공식 대비 |
 * | --- | --- | --- |
 * | **애플 공식 렌더** | **0.1090** | — |
 * | Regular 400 | 0.0897 | −18% |
 * | **Medium 500** | **0.1090** | **±0%** |
 * | SemiBold 600 | 0.1282 | +18% |
 *
 * 그래서 500 이다. 구글 규격이 못박는 Google Sans **Medium** 도 같은 단이라 셋이 한
 * 굵기로 모인다. Google Sans는 정적 Medium TTF이고 `fontWeight: 500`도 함께
 * 명시한다. 카카오 표준 버튼은 이보다 가볍지만(획/높이 0.0769) 이미지가 26px 라
 * 400 과 500 을 가릴 해상도가 아니다 — 확실한 것은 **600 이 아니라는 것**이다.
 *
 * ⚠ 시스템 서체는 굵기를 파일 이름으로 고를 수 없어 `fontWeight` 로 준다
 * (`CLAUDE.md` 규칙 5 는 **번들 OTF** 이야기다 — 시스템 서체에는 해당하지 않는다).
 * **Android 8 이하(API < 28)는 500 을 400 으로 떨어뜨린다** — 한 단 얇아질 뿐
 * 깨지지 않는다.
 *
 * 서체는 구글만 규격을 따라 **Google Sans Medium** 이다(가이드라인이 서체를 이름으로
 * 지정하는 곳은 구글뿐이다). 한글은 Google Sans 에 글리프가 없어 OS 서체로 폴백하는데,
 * 구글이 배포하는 한국어 버튼도 같은 방식이다. 카카오는 「OS 기본 시스템 서체」를
 * 규정하지만 Pretendard 로 둔다 — 애플 줄과 서체가 갈리면 두 줄이 따로 논다.
 *
 * ## 누름은 스크림이다
 *
 * 시안은 `filter: brightness(0.94)`(카카오)·배경 교체(Google·Apple)로 눌림을 그리는데
 * RN 에는 `filter` 가 없다. `Button` 과 같은 **스크림 오버레이**로 통일한다 —
 * 어두워진다는 결과가 같고, 브랜드 면 색 자체는 그대로 남는다(§6 의 방식).
 *
 * ## 비활성
 *
 * DS 버튼의 비활성 면(`interaction.disabled`)을 쓰지 않는다 — 그러면 브랜드 색이
 * 사라져 어느 줄이 무엇이었는지 읽히지 않는다. **면은 그대로 두고 흐리게만** 한다
 * (`momentory.css` `.off{opacity:.36}` 와 같은 방식). 경고 아이콘·문구는 붙이지 않는다.
 */
export type SocialProvider = "kakao" | "google" | "apple";

type Props = Omit<PressableProps, "style" | "children"> & {
  provider: SocialProvider;
  /**
   * ⚠ **문구도 규격이다 — 각 사 목록 안에서만 고른다.** 카카오는 「카카오 로그인」·
   * 「로그인」이 기본 레이블이고, 구글은 「로그인 / 가입 / 계속」을 권장하며(현지화는
   * 명시적으로 허용), 애플은 `sign-in` / `sign-up` / `continue` 세 변형의 **애플이
   * 렌더한 로케일 문자열**을 쓴다. 지어내지 않는다 — `app/(auth)/login.tsx`.
   */
  label: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function SocialButton({
  provider,
  label,
  disabled = false,
  accessibilityRole = "button",
  accessibilityState,
  style,
  ...rest
}: Props) {
  const v = PROVIDERS[provider];

  return (
    <Pressable
      {...rest}
      accessibilityRole={accessibilityRole}
      // 호출자 상태는 살리되 잠금은 우리가 쥔다
      accessibilityState={{ ...accessibilityState, disabled }}
      disabled={disabled}
      style={[
        styles.base,
        v.container,
        { gap: v.gap, paddingHorizontal: v.paddingHorizontal },
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          {provider === "google" ? <GoogleMark size={GOOGLE_MARK} /> : null}
          {/* 카카오만 심볼이 라벨보다 진하다 — 가이드가 심볼 100% · 레이블 85% 다 */}
          {provider === "kakao" ? (
            <Icon name="logo-kakao" size={size.icon.lg} color={social.kakao.symbol} />
          ) : null}
          {provider === "apple" ? (
            // 애플은 크기를 **버튼 높이에서** 계산한다 — HIG 「Match the height of the
            // logo file to the height of the button」(`AppleMark.tsx`)
            <AppleMark buttonHeight={size.button.large} color={v.labelColor} />
          ) : null}

          <Text
            style={[
              {
                fontFamily: v.labelFamily,
                fontWeight: v.labelWeight,
                fontSize: v.labelSize,
                lineHeight: v.labelLineHeight,
                color: v.labelColor,
              },
            ]}
          >
            {label}
          </Text>

          {pressed && !disabled ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim]} />
          ) : null}
        </>
      )}
    </Pressable>
  );
}

type Spec = {
  container: ViewStyle;
  labelColor: string;
  /**
   * **비워 두면 OS 시스템 서체다** — 카카오·애플이 규격으로 요구하는 것이 그것이다.
   * 값을 넣는 곳은 구글 하나뿐이다(규격이 서체를 이름으로 못박는다).
   */
  labelFamily?: string;
  /** 시스템 서체를 쓸 때 굵기를 고르는 유일한 손잡이 */
  labelWeight?: TextStyle["fontWeight"];
  /** 글자 크기도 줄마다 다르다 — 위 머리말의 표를 본다 */
  labelSize: number;
  labelLineHeight: number;
  /** 마크와 글자 사이 */
  gap: number;
  /** 가운데 정렬이라 **최소 여백**으로만 작동한다 — 규격값을 그대로 둔다 */
  paddingHorizontal: number;
};

/**
 * 애플 라벨은 **버튼 높이의 43%** 다 — 20.64.
 *
 * HIG 커스텀 버튼 절이 서체 교체·굵기·크기 조정은 허용하면서 **비율은 못박는다**:
 * 「Regardless of the font you choose, the title and button height of your custom
 * button **need to** use the same proportions that the system uses ... the title's
 * font size would be 43% of the button's height」.
 *
 * 그래서 높이에서 **계산한다** — 48 을 손대는 날 이 값이 따라 움직여야 한다.
 * (역방향 표현인 「높이 = 글자의 233%, 반올림」도 성립한다: round(20.64×2.33)=48.)
 */
const APPLE_LABEL_SIZE = size.button.large * 0.43;

/**
 * Google Sans Medium 정적 글꼴 — **구글 버튼 한 줄만** 쓴다
 * (`assets/fonts/GoogleSans-Medium.ttf`). Google Fonts CSS API에 `font-weight: 500`을
 * 요청해 받은 파일이며 내부 typographic subfamily도 Medium이다.
 * `fontFamily` 토큰에 올리지 않는 이유가 그것이다: 토큰은 「우리 서체」의 목록인데
 * 이건 구글 규격을 지키려고 들여온 남의 서체다. 다른 화면이 가져다 쓰면 안 된다.
 */
const GOOGLE_SANS_MEDIUM = "GoogleSans-Medium";

const PROVIDERS: Record<SocialProvider, Spec> = {
  /**
   * 카카오 — 심볼은 좌측 정렬과 **가운데 정렬 둘 다 허용**이라(가이드 「크기 변경」)
   * 나머지 두 줄과 같은 가운데 정렬로 둔다. 가운데 정렬일 때의 간격은 규정이
   * 따로 없어 DS 값(8)을 쓴다.
   */
  kakao: {
    container: { backgroundColor: social.kakao.background },
    labelColor: social.kakao.label,
    // 서체를 비운다 = OS 시스템 서체 — 「폰트는 OS 별 기본 시스템 서체를 사용합니다」
    labelWeight: "500",
    // 48 의 1/3 — 카카오 규정과 정확히 일치한다
    labelSize: 16,
    labelLineHeight: 24,
    gap: space.sm,
    paddingHorizontal: space.lg,
  },
  /**
   * Google — 테두리는 **inside 1px** 이다. RN 의 `borderWidth` 는 안쪽으로 그리므로
   * 높이 48 이 그대로 유지된다(바깥으로 그리는 웹 `outline` 과 다르다).
   *
   * 여백·간격이 플랫폼별로 다른 것은 가이드라인이 그렇게 적혀 있어서다 —
   * iOS 16·12·16 / Android·Web 12·10·12.
   */
  google: {
    container: {
      backgroundColor: social.google.background,
      borderWidth: 1,
      borderColor: social.google.border,
    },
    labelColor: social.google.label,
    labelFamily: GOOGLE_SANS_MEDIUM,
    labelWeight: "500",
    // 14/20 — 가이드라인이 「Google Sans Medium | 14/20」으로 크기·행간을 함께 적는다
    labelSize: 14,
    labelLineHeight: 20,
    gap: Platform.select({ ios: 12, default: 10 }),
    paddingHorizontal: Platform.select({ ios: space.lg, default: space.md }),
  },
  /** Apple — 공식 로고 파일 자체의 투명 여백이 로고~글자 간격을 포함한다. */
  apple: {
    container: { backgroundColor: social.apple.background },
    labelColor: social.apple.label,
    // 서체를 비운다 = OS 시스템 서체 — HIG 「Prefer the system font for the title」.
    // iOS 에서는 그것이 곧 **SF Pro**(한글은 Apple SD Gothic Neo)라, 애플이 렌더한
    // 공식 버튼과 **같은 서체**가 된다
    labelWeight: "500",
    labelSize: APPLE_LABEL_SIZE,
    // 20.64 한글의 ink 가 20.5 다 — 30 이어야 잘리지 않는다
    labelLineHeight: 30,
    gap: 0,
    paddingHorizontal: space.lg,
  },
};

const styles = StyleSheet.create({
  base: {
    height: size.button.large,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.medium,
  },
  // 면은 브랜드 색 그대로 두고 흐리게만 — 어느 줄이 무엇인지는 남는다
  disabled: { opacity: 0.4 },
  scrim: { backgroundColor: overlay.pressNormal, borderRadius: radius.medium },
});
