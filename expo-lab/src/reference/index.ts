/**
 * 참고 시안 — 시안 이미지(피그마 · Claude Design)를 실제 앱 프레임 위에 겹쳐 맞추는 모듈의 입구.
 * 셸 · 편집기는 여기서만 가져온다.
 *
 * 셸에 붙이는 법:
 * - 오버레이: 기기 외형(`DeviceFrame`)의 화면 상자 안, iframe 과 **같은 쌓임 맥락**에 둔다 —
 *   `<ReferenceOverlay reference={useReferencesFor(scope).reference} width={기기 폭} height={기기 높이} />`.
 *   상태바까지 비교하려면 셸이 그리는 상태바(`DeviceOverlays`) **뒤에** 놓는다. 감싸는 상자에
 *   z-index · isolation · opacity · transform 을 주면 「다른 곳만 표시」가 iframe 과 섞이지 않는다.
 * - 옆에 나란히 놓기: 보기 방식이 `side` 면 실제 앱 칸 옆에 같은 기기 외형 + `ReferenceSidePhone`.
 * - 패널: `<ReferencePanel route={셸 라우트 패턴} draftId platform deviceId />` (폭 300–340).
 * - 단축키: document keydown 에서 `handleReferenceShortcut(event)` 가 true 면 preventDefault.
 */
export { ReferencePanel, describeScope, type ReferencePanelProps } from "./ReferencePanel";
export { ReferenceImage, ReferenceOverlay, ReferenceSidePhone } from "./ReferenceOverlay";
export { useReferenceSnapshot, useReferencesFor, type ReferencesFor } from "./useReferences";
export {
  createIndexedDbBackend,
  createMemoryBackend,
  createReferenceStore,
  deleteReference,
  filterReferences,
  getReferenceStore,
  getReferenceUrl,
  listReferences,
  referenceApplies,
  saveReference,
  setReferenceStore,
  setReferenceVisible,
  subscribeReferences,
  toggleReferenceVisible,
  updateReference,
  type ReferenceBackend,
  type ReferenceSnapshot,
  type ReferenceStore,
  type SaveReferenceMeta,
} from "./referenceStore";
export { handleReferenceShortcut, isEditableTarget, REFERENCE_SHORTCUT_HINT } from "./shortcuts";
export { matchRoute, normalizeRoute } from "./routeMatch";
export {
  describeFit,
  detectStatusBar,
  displayScale,
  guessPixelRatio,
  referenceLayout,
  toggleFit,
} from "./fit";
export * from "./types";
