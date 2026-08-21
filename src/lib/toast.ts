import { create } from "zustand";

/**
 * 토스트의 **단일 통로** — 「끝난 일을 알리는 한 줄」이 뜨는 자리 하나.
 *
 * ## 화면이 각자 들지 않는 이유
 *
 * 토스트를 화면 상태로 들면 **그 화면이 살아 있는 동안만** 뜬다. 삭제가 그렇다:
 * 일기 삭제는 되돌리기 창(6초)이 닫힐 때 서버로 나가는 **지연 삭제**라, 결과가
 * 나올 즈음 사용자는 다른 화면에 가 있을 수 있다. 통로를 하나 두고 앱 껍데기가
 * 그리면 어디서 알리든 같은 자리에 뜬다.
 *
 * ## 문안을 모른다
 *
 * `lib/notifications.ts` 와 같은 규칙이다 — 여기는 「무엇을 언제 띄우는가」의
 * 배관이고, **무슨 말을 하는지는 도메인이 정한다**
 * (삭제 문안은 `features/diary/model/deleteToast.ts`).
 *
 * ## 한 번에 하나다
 *
 * 큐를 두지 않는다. 뒤에 온 것이 앞의 것을 **덮는다** — 사라지는 알림이 줄을
 * 서면 마지막 것이 뜰 때쯤엔 무엇에 대한 말인지 알 수 없다.
 */
export type ToastVariant = "normal" | "positive" | "negative";

export type ToastMessage = {
  message: string;
  variant: ToastVariant;
  /** 같은 문장을 다시 띄워도 새 알림으로 읽히게 하는 순번 */
  seq: number;
};

type ToastStore = {
  current: ToastMessage | null;
  show: (message: string, variant?: ToastVariant) => void;
  /** 스스로 사라졌거나 화면이 닫힐 때 */
  dismiss: () => void;
};

let seq = 0;

export const useToast = create<ToastStore>((set) => ({
  current: null,
  show: (message, variant = "normal") => set({ current: { message, variant, seq: ++seq } }),
  dismiss: () => set({ current: null }),
}));

/** React 밖(store·repository)에서 부르는 길 — 훅을 쓸 수 없는 자리가 있다 */
export const showToast = (message: string, variant: ToastVariant = "normal") =>
  useToast.getState().show(message, variant);
