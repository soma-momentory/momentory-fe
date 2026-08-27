import { Platform, type TextStyle } from "react-native";

/**
 * **한 줄 입력의 세로 정렬** — 검색칸 · 일정 입력 · `TextField` 가 나눠 쓴다.
 *
 * 한 줄 `TextInput` 을 그냥 두면 두 가지가 함께 어긋난다. 하나만 고치면 다른 하나가
 * 드러나서 두 번 밟았다(2026-08-28 · 17 Pro Max · 스크린샷 픽셀 실측):
 *
 * 1. **받침이 잘린다.** 바깥 줄의 `alignItems: "center"` 는 입력칸을 **글꼴의 자연 줄
 *    높이**로 만드는데, 그 상자가 한글 글자보다 낮다 — 잉크가 40px 여야 할 자리에서
 *    34px 로 깎였다. `alignSelf: "stretch"` 로 상자를 칸 높이만큼 늘여 자리를 준다.
 * 2. **늘이면 글자가 아래로 쏠린다.** 늘어난 상자 안에서 iOS 가 글자를 놓는 기준이
 *    글꼴 지표라, 아래쪽 여백이 큰 Pretendard 는 아래로 내려앉는다(15pt 에서 4pt ·
 *    같은 칸의 아이콘은 정확히 가운데였다). 아래 여백으로 상자를 위로 당겨 되돌린다.
 *
 * **`padding` 이 아니라 `margin` 이다** — 패딩은 플랫폼마다 상자 **안쪽** 글자 위치를
 * 다르게 만든다. 여백은 상자 자체를 옮길 뿐이라 글자 배치에 손대지 않는다.
 *
 * **안드로이드에는 보정을 넣지 않는다** — 거기는 `textAlignVertical: "center"` 가 상자
 * 안에서 글자를 가운데 놓아 쏠림이 없다(iOS 는 이 속성을 무시한다).
 *
 * ⚠ **줄 간격(`lineHeight`)으로 풀려고 하지 말 것** — iOS 는 한 줄 입력에 줄 간격이
 * 있으면 글자를 줄 상자 **바닥에** 붙여 그린다. 여러 줄 입력에서만 뜻이 있다.
 */
export const singleLineInput = (fontSize: number): TextStyle => ({
  alignSelf: "stretch",
  textAlignVertical: "center",
  marginBottom: Platform.OS === "ios" ? fontSize * IOS_NUDGE_RATIO : 0,
});

/**
 * 글자 크기 대비 아래 여백 비율.
 *
 * 쏠림은 글꼴 지표에서 오므로 **글자 크기에 비례한다**. 15pt 에서 4pt 쏠렸고, 가운데
 * 정렬에서 아래 여백은 **절반만** 효과가 나므로 그 두 배를 준다 → `4 / 15 * 2`.
 */
const IOS_NUDGE_RATIO = (4 / 15) * 2;
