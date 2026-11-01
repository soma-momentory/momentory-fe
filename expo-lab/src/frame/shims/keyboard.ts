/**
 * **앱 코드에만** 끼우는 `Keyboard` — 웹(react-native-web)의 `Keyboard` 는 이벤트를 하나도 내지
 * 않아서(`isVisible()` 은 늘 false) 키보드에 반응하는 화면이 「열린」 모양을 한 번도 그리지 않는다.
 * 이 심은 프레임의 키보드(`../keyboard`)가 내는 RN 네이티브 모양의 이벤트를 앱에 넘긴다.
 *
 * Metro 가 **루트 `app/`·`src/` 안의 파일이 부르는** `Keyboard` 만 여기로 돌린다(`../metroShims.js`) —
 * 웹 Babel 프리셋이 `import { Keyboard } from "react-native"` 를
 * `react-native-web/dist/exports/Keyboard` 의 기본 내보내기로 바꿔 쓰므로 기본 내보내기로 둔다.
 *
 * 셸(프레임 설정 없음)에서는 키보드가 열리지 않으므로 웹의 진짜 `Keyboard` 와 같게 군다.
 */
import { Keyboard as WebKeyboard } from "react-native";

import { frameKeyboard, type KeyboardEventName, type LabKeyboardEvent } from "../keyboard";

const Keyboard = {
  addListener(
    eventType: KeyboardEventName,
    listener: (event: LabKeyboardEvent) => void,
    context?: unknown,
  ) {
    const bound = context == null ? listener : listener.bind(context);
    return frameKeyboard.addListener(eventType, bound);
  },
  removeAllListeners(eventType?: KeyboardEventName | null) {
    frameKeyboard.removeAllListeners(eventType ?? undefined);
  },
  /** 입력칸 포커스를 빼고(웹의 진짜 dismiss) 키보드를 내린다 — 셸이 강제로 연 것도 내린다 */
  dismiss() {
    WebKeyboard.dismiss();
    if (typeof document !== "undefined" && typeof HTMLElement !== "undefined") {
      const active = document.activeElement;
      if (active instanceof HTMLElement && active !== document.body) active.blur();
    }
    frameKeyboard.close();
  },
  isVisible(): boolean {
    return frameKeyboard.isVisible();
  },
  metrics() {
    return frameKeyboard.metrics();
  },
  /** 네이티브는 `LayoutAnimation` 을 거는 자리다 — 웹에는 LayoutAnimation 이 없다 */
  scheduleLayoutAnimation(_event: LabKeyboardEvent) {},
};

export default Keyboard;
