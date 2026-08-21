import { PixelRatio } from "react-native";

/**
 * 열 수가 **고정된** 격자의 칸 폭 — 감정 선택 3열(`ChoiceGrid`)과 달력 7열
 * (`Calendar`)이 나눠 쓴다.
 *
 * ## 왜 퍼센트로 두지 않나
 *
 * `width: '14.2857%'` 처럼 나누면 Yoga 가 칸마다 기기 픽셀로 **반올림**하는데,
 * 일곱 칸이 각자 조금씩 올라가면 합이 부모 폭을 넘는다. `flexWrap` 이 걸린
 * 격자에서는 그 순간 **마지막 칸이 다음 줄로 넘어간다** — 좁은 기기에서 한 주가
 * 6+1 로 접히고 감정 9칸의 3×3 이 깨지던 자리다. `gap` 이 붙으면 (감정 격자가
 * 그렇다) 간격까지 퍼센트 밖에서 더해져 더 쉽게 넘친다.
 *
 * 그래서 **실제 폭을 재고**(`onLayout`) 간격을 먼저 뺀 뒤, 기기 픽셀 격자 아래로
 * **내림**한다. 합이 부모를 넘지 않는 것이 보장되므로 줄이 밀리지 않는다.
 * 내림하고 남는 1px 남짓은 격자를 가운데 정렬해 양옆으로 흘린다.
 *
 * 아직 재기 전(`total` 이 0)이면 `null` 이다 — 부르는 쪽이 한 프레임만 퍼센트로
 * 그리고 다음 프레임에 갈아탄다.
 */
export function columnWidth(total: number, columns: number, gap = 0): number | null {
  if (total <= 0 || columns <= 0) return null;

  const usable = total - gap * (columns - 1);
  if (usable <= 0) return null;

  const scale = PixelRatio.get();
  return Math.floor((usable / columns) * scale) / scale;
}
