import { Text as RNText, type TextProps } from "react-native";

import { label as labelColor, text, type TextToken } from "@/design/ds";

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
 */
type Props = TextProps & {
  variant?: TextToken;
  /** `@/design/ds` 의 label·status 토큰을 넘긴다 */
  color?: string;
};

export function Text({ variant = "body1", color = labelColor.normal, style, ...rest }: Props) {
  return <RNText {...rest} style={[text[variant], { color }, style]} />;
}
