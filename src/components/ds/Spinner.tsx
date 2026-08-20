import { ActivityIndicator } from "react-native";

import { primary } from "@/design/ds";

/**
 * Momentory DS — 기다림 표시 (`Diary.dc.html` ④-a 「정리 중」).
 *
 * **진행률도 남은 시간도 말하지 않는다.** 시안 주석이 「Spinner + 두 줄 안내 —
 * 진행률·시간 표시 없음」이라고 못박았고, `RULES.md` 4 의 「숫자로 압박하지
 * 않는다」와도 같은 방향이다. 얼마나 걸리는지 모르는 일에 숫자를 붙이면
 * 그 숫자가 틀렸을 때 신뢰가 깎인다.
 *
 * OS 가 그리는 것을 그대로 쓴다 — 회전하는 원 하나에 우리 모양을 만들 이유가 없다.
 * 색만 브랜드로 맞춘다.
 */
export function Spinner({ size = "small" }: { size?: "small" | "large" }) {
  return <ActivityIndicator size={size} color={primary.normal} />;
}
