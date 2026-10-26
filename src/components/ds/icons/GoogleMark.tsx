import { decorativeAccessibilityProps } from "@/components/ds/decorativeAccessibility";
import { Image } from "react-native";

/**
 * Google 공식 「G」 — **구글이 배포하는 PNG 원본 그대로다**
 * (`assets/brand/google-g.png` · 2026-08-24 에
 * <https://developers.google.com/static/identity/images/g-logo.png> 에서 받음).
 *
 * ## 왜 SVG 가 아니라 PNG 인가
 *
 * 2026-08-24 이전에는 4색 플랫 「G」를 `react-native-svg` 로 그렸다. 그런데
 * **구글이 2025 년에 마크를 그라디언트로 바꿨고**, 지금 `signin-assets.zip` 이
 * 주는 공식 SVG 는 conic gradient(원뿔형) 위에 가우시안 블러 타원 여섯을 얹고
 * 「G」 모양으로 마스킹한 것이다. `react-native-svg` 에는 **conic gradient 가
 * 없다** — 벡터로는 재현할 방법이 없다.
 *
 * 그래서 선택지는 둘뿐이었다: **옛 4색 마크를 계속 쓰거나**(규정 위반),
 * **구글이 렌더한 래스터를 그대로 쓰거나**. 후자를 골랐다 — 브랜딩 가이드라인이
 * 「로고의 크기·색상 변경 금지」를 못박는데, 옛 마크는 이미 「색상이 다른 로고」다.
 *
 * ⚠ **색을 받지 않는다.** 브랜드가 고정한 값이라 tint 를 허용하면 규정을 어긴다.
 * `resizeMode` 도 `contain` 으로 고정한다 — `cover`·`stretch` 는 로고를 왜곡한다.
 */
export function GoogleMark({ size = MARK_HEIGHT }: { size?: number }) {
  return (
    <Image
      source={require("../../../../assets/brand/google-g.png")}
      // 원본이 200×204 다. 높이를 규격에 맞추고 **폭은 비율에서 나오게** 둔다 —
      // 정사각으로 그리면 2% 눌린 로고가 된다(가이드라인이 금지하는 「왜곡」)
      style={{ width: size * MARK_ASPECT, height: size }}
      resizeMode="contain"
      {...decorativeAccessibilityProps}
    />
  );
}

/**
 * **20.** 브랜딩 가이드라인이 로고를 절대값으로 못박는다 — 표준 버튼(Android·Web
 * 40 · iOS 44)에서든 마크는 20 이다. 카카오처럼 「컨테이너에 비례해 키우라」는
 * 규정이 아니라서, 우리 버튼이 48 이어도 20 그대로 둔다.
 */
export const MARK_HEIGHT = 20;

/** 원본 200×204 의 가로세로비 */
const MARK_ASPECT = 200 / 204;
