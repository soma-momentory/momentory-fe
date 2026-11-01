/**
 * 참고 시안 — 피그마 · Claude Design 에서 뽑은 **화면 이미지**를 실제 앱 프레임 위에 겹쳐
 * 디자인 편집기의 값을 맞춰 가는 도구의 모양.
 *
 * 이미지는 수 MB 라 localStorage(약 5MB 상한)에 못 둔다 — IndexedDB 에 Blob 그대로 둔다
 * (`referenceStore.ts`). 보이기/숨기기 · 고른 시안 같은 **화면 상태**는 작아서 localStorage 다.
 */
import type { LabPlatform } from "../lab-contract";

export type ReferenceViewMode = "overlay" | "difference" | "side" | "wipe";

/**
 * 시안 이미지를 기기 화면(CSS px)에 놓는 법.
 * - `fit: "width"` — 이미지 폭을 기기 폭에 맞춘 뒤 `scale` 을 곱한다(기본 · 1x/2x/3x 무엇이든 맞는다)
 * - `fit: "none"` — 이미지 1px = CSS 1px 에 `scale` 을 곱한다(@3x 시안이면 scale 1/3 이 실제 크기)
 * 이동(`offsetX`·`offsetY`)은 배율을 곱한 **뒤** 기기 CSS px 로 더한다.
 */
export type ReferenceAlign = {
  fit: "width" | "none";
  scale: number;
  offsetX: number;
  offsetY: number;
};

export type ReferenceView = {
  mode: ReferenceViewMode;
  /** 「반투명 겹치기」의 진하기(0–1) */
  opacity: number;
  /** 「밀어서 앞뒤 비교」 경계선(0–1) — 왼쪽이 시안, 오른쪽이 실제 앱 */
  wipe: number;
};

export type ReferenceMeta = {
  id: string;
  /**
   * expo-router 주소 패턴(예: "/home", "/diary/[id]"). `/diary/[id]` 는 `/diary/123` 에도 맞는다
   * — `matchRoute`(`routeMatch.ts`)
   */
  route: string;
  /** null = 모든 플랫폼 */
  platform: LabPlatform | null;
  /** null = 그 플랫폼의 모든 기기 */
  deviceId: string | null;
  /** null = 시안과 무관(승인본 · 모든 시안 프레임에 보인다) */
  draftId: string | null;
  name: string;
  naturalWidth: number;
  naturalHeight: number;
  /** 이미지 MIME(image/png …) */
  mimeType: string;
  byteSize: number;
  createdAt: string;
  align: ReferenceAlign;
  view: ReferenceView;
};

export type Reference = ReferenceMeta & { blob: Blob };

/** `updateReference` 가 받는 조각 — align · view 는 일부만 줘도 된다 */
export type ReferencePatch = Partial<
  Pick<ReferenceMeta, "route" | "platform" | "deviceId" | "draftId" | "name">
> & {
  align?: Partial<ReferenceAlign>;
  view?: Partial<ReferenceView>;
};

/** 어느 프레임(화면 · 시안 · 플랫폼 · 기기)에 보일 시안을 찾는가 */
export type ReferenceScope = {
  /** 지금 화면 — 패턴(`/diary/[id]`)이어도, 실제 주소(`/diary/123`)여도 된다 */
  route: string;
  /** 프레임에 건 디자인 시안. 승인본 프레임이면 null */
  draftId: string | null;
  platform?: LabPlatform | null;
  deviceId?: string | null;
};

export const DEFAULT_ALIGN: ReferenceAlign = { fit: "width", scale: 1, offsetX: 0, offsetY: 0 };
export const DEFAULT_VIEW: ReferenceView = { mode: "overlay", opacity: 0.5, wipe: 0.5 };

/** 받는 이미지 형식 — 파일 고르기 `accept` 와 끌어다 놓기 · 붙여넣기 검사가 같이 쓴다 */
export const REFERENCE_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export const VIEW_MODES: readonly { id: ReferenceViewMode; label: string; help: string }[] = [
  {
    id: "overlay",
    label: "반투명 겹치기",
    help: "시안을 반투명하게 앱 위에 겹쳐요. 진하기로 어느 쪽을 더 볼지 정해요.",
  },
  {
    id: "difference",
    label: "다른 곳만 표시",
    help: "똑같은 곳은 검게 지우고 다른 곳만 밝게 남겨요. 어긋난 위치 · 색을 찾을 때 써요.",
  },
  {
    id: "wipe",
    label: "밀어서 앞뒤 비교",
    help: "경계선 왼쪽은 시안, 오른쪽은 앱이에요. 선을 끌어 옮기며 견줘요.",
  },
  {
    id: "side",
    label: "옆에 나란히 놓기",
    help: "시안을 앱 옆에 따로 세워요. 겹치지 않고 전체를 견줄 때 써요.",
  },
];
