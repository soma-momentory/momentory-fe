/**
 * 참고 시안 단축키 — 셸이 document 의 keydown 에 걸어 쓴다(패널 밖에서도 돈다).
 *
 *   R          보이기 / 숨기기 (글 쓰는 칸에 있을 때는 아니다)
 *
 * 패널 안의 화살표(1px · Shift 10px) 이동은 패널이 스스로 받는다(`ReferencePanel`).
 */
import { getReferenceStore, type ReferenceStore } from "./referenceStore";

type KeyLike = Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "target"> & {
  code?: string;
};

/** 글을 쓰는 자리인가 — 거기서는 단축키를 먹지 않는다 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).tagName !== "string") return false;
  const element = target as HTMLElement;
  if (element.isContentEditable) return true;
  const tag = element.tagName.toLowerCase();
  if (tag === "textarea" || tag === "select") return true;
  if (tag !== "input") return false;
  const type = (element as HTMLInputElement).type;
  return !["button", "checkbox", "radio", "submit", "reset", "file", "color"].includes(type);
}

/** 처리했으면 true — 셸은 그때 `event.preventDefault()` 한다 */
export function handleReferenceShortcut(
  event: KeyLike,
  store: ReferenceStore = getReferenceStore(),
): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  if (isEditableTarget(event.target)) return false;
  // 한글 자판이면 key 가 「ㄱ」이다 — 자리(code)로도 본다
  if (event.code === "KeyR" || event.key === "r" || event.key === "R" || event.key === "ㄱ") {
    store.toggleVisible();
    return true;
  }
  return false;
}

export const REFERENCE_SHORTCUT_HINT = "R — 참고 시안 보이기 · 숨기기";
