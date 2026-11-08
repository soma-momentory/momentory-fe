import { createContext, useContext } from "react";
import { StyleSheet, Text as RNText, useWindowDimensions, type TextProps } from "react-native";

import { label as labelColor, maxFontScale, text, type TextToken } from "@/design/ds";
import { typeScale } from "@/design/ds/typography";
import { keepWordsIn } from "@/lib/keepWords";
import { DesignViewportContext } from "./DesignViewport";

/**
 * Momentory DS — 글자.
 *
 * **크기·행간·웨이트를 따로 주지 않는다.** `variant` 하나가 셋을 함께 정한다
 * (`DESIGN.md` §2 의 12단). 화면이 `fontSize` 를 직접 적기 시작하면 스케일이 무너진다.
 *
 * ⚠ 웨이트는 **파일 이름**으로 간다(`Pretendard-SemiBold`) — Android 는 `fontWeight`
 * 가 안 먹는다(`CLAUDE.md` 규칙 5). `variant` 를 쓰면 그 규칙을 신경 쓸 일이 없다.
 *
 * 색 기본값은 `label.normal` 이다. 다른 색이 필요하면 **토큰을 넘긴다** —
 * `color="#..."` 로 hex 를 적으면 린터가 막는다.
 *
 * ## 글꼴 배율에 천장을 둔다 — 기본 1.3
 *
 * RN `Text` 는 시스템 글꼴 크기(안드로이드 「글꼴/화면 크기」)를 그대로 따라가서
 * 배율이 1.5·2.0 까지 오른다. 그러면 **고정 높이 그릇**(Button 48 · Chip 36 ·
 * 탭바)을 글자가 뚫고 나와 레이아웃이 깨진다 — 「내 기기는 멀쩡한데 남의
 * 기기에서 깨지는」 자리다. 그래서 배율 상한을 `maxFontScale`(1.3)로 둔다 —
 * 접근성을 완전히 죽이는 `allowFontScaling={false}` 대신의 절충값이다. 값이
 * 토큰에 있는 이유는 **글자 높이로 여백을 계산하는 화면이 같은 천장을 봐야**
 * 하기 때문이다(홈 머리의 날짜 정렬).
 *
 * `...rest` **앞에** 두어, 특정 화면이 필요하면 prop 으로 덮을 수 있게 남긴다.
 *
 * ## 한글은 어절에서만 접는다 (2026-11-08)
 *
 * iOS · Android 는 한글을 음절마다 끊어 「언제 지⏎치고」처럼 갈린다. 화면마다 `keepWords` 를
 * 걸던 것을 **여기 한 곳**으로 모았다 — 글자 children 에 단어 결합 문자를 넣는다(`@/lib/keepWords`).
 * 테스트 환경에서는 `jest.setup.ts` 가 이 걸음을 끈다(글자로 찾는 테스트가 그대로 돈다).
 */
type Props = TextProps & {
  variant?: TextToken;
  /** `@/design/ds` 의 label·status 토큰을 넘긴다 */
  color?: string;
};

/** Lab Web의 큰 글씨 레이아웃 검사에만 사용한다. 운영에서는 기기 배율을 그대로 따른다. */
export const PreviewFontScaleContext = createContext<number | null>(null);

export function useEffectiveFontScale(limit?: number) {
  const { fontScale } = useWindowDimensions();
  const previewScale = useContext(PreviewFontScaleContext);
  const { active } = useContext(DesignViewportContext);
  const nativeScale = Math.min(fontScale, limit ?? (active ? 1.5 : maxFontScale));
  return previewScale == null ? nativeScale : Math.max(nativeScale, previewScale);
}

export function Text({
  variant = "body1",
  color = labelColor.normal,
  maxFontSizeMultiplier,
  style,
  children,
  ...rest
}: Props) {
  const previewScale = useContext(PreviewFontScaleContext);
  const { active } = useContext(DesignViewportContext);
  // The approved web preview used the 1.12 DS type scale. In a proportional
  // viewport every OS uses that same type size; the canvas handles device width.
  const token = active
    ? {
        ...text[variant],
        fontSize: Math.round((text[variant].fontSize / typeScale) * 1.12),
        lineHeight: Math.round((text[variant].lineHeight / typeScale) * 1.12),
      }
    : text[variant];
  const flat =
    previewScale == null || previewScale === 1 ? null : StyleSheet.flatten([token, style]);
  // Native Text scales both fontSize and lineHeight with the system setting.
  // Web previews emulate that once; callers keep their line heights unscaled.
  const scaled =
    previewScale == null || previewScale === 1
      ? undefined
      : {
          ...(typeof flat?.fontSize === "number" ? { fontSize: flat.fontSize * previewScale } : {}),
          ...(typeof flat?.lineHeight === "number"
            ? { lineHeight: flat.lineHeight * previewScale }
            : {}),
        };
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? (active ? 1.5 : maxFontScale)}
      {...rest}
      style={[token, active && { includeFontPadding: false }, { color }, style, scaled]}
    >
      {keepWordsIn(children)}
    </RNText>
  );
}
