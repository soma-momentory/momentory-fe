import { useWardrobe } from "../model/wardrobe";
import { TangerineBurst } from "./TangerineBurst";

/**
 * 귤 축하를 그리는 **앱에 하나뿐인 자리** — 미션을 끝낸 화면(회고 · 쉼터 · 편지 · 홈)이 어디든 그 위에서 귤이 터진다.
 * 무엇을 띄울지는 `useWardrobe` 의 `celebration` 이 담는다(`ToastHost` 와 같은 결).
 */
export function TangerineCelebrationHost() {
  const celebration = useWardrobe((s) => s.celebration);
  const end = useWardrobe((s) => s.endCelebration);
  if (celebration == null) return null;
  return (
    <TangerineBurst
      key={celebration.key}
      title={celebration.title}
      amount={celebration.amount}
      onDone={end}
    />
  );
}
