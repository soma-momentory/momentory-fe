import { showToast } from "@/lib/toast";

/**
 * 삭제 결과 한 줄 — **일기와 바람카드가 같은 말을 쓴다.**
 *
 * 지우는 자리가 둘(보관함의 일기 상세 · 쉼터의 바람카드)인데 각자 문안을 쓰면
 * 같은 일에 다른 말이 붙는다. 문장 틀을 하나 두고 **무엇을 지웠는지만** 갈아
 * 끼운다.
 *
 * ## 실패도 토스트다 — 모달이 아니다
 *
 * `RULES.md` 4 「오류·거부·실패는 **한 줄 안내로 흡수한다** · 모달·재시도·경고
 * 아이콘 금지」. 토스트가 바로 그 「한 줄」의 한 모양이라 규칙과 어긋나지 않는다
 * (`ds/Toast` 머리말). 그래서 실패 문장도 재시도를 **시키지 않고** 무슨 일이
 * 있었는지만 말한다.
 *
 * ## 색으로 말하지 않는다
 *
 * `Toast` 의 변형이 바꾸는 것은 아이콘 글리프뿐이고 글자는 늘 같은 색이다 —
 * 성공인지 실패인지는 **문장이** 말한다.
 */
export type DeleteTarget = "일기" | "바람카드";

/** 문안 정본 — 화면이 자기 말을 만들지 않게 여기서 만든다 */
export const deleteToastMessage = (target: DeleteTarget, ok: boolean): string =>
  ok ? `${target}를 삭제했어요.` : `${target}를 삭제하지 못했어요.`;

/** 지운 결과를 알린다. React 밖(store)에서도 부른다 */
export const notifyDeleteResult = (target: DeleteTarget, ok: boolean): void =>
  showToast(deleteToastMessage(target, ok), ok ? "positive" : "negative");
