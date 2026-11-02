/**
 * 「맞춤」 배율 — 가운데 무대에 기기가 꽉 차게 들어가는 배율을 계산한다(**크게도** 맞춘다 · 상한 2배).
 * 순수 함수라 `__tests__/stageFit.test.ts` 가 고정한다.
 *
 * 기기는 늘 실제 CSS 크기로 그리고 바깥에서 `transform: scale` 로 키우므로, 여기 값은 그
 * scale 하나다. 셸은 이 배율만큼 자리를 잡아 두어 스크롤이 맞는다(`DeviceFrame`).
 */
import type { LayoutId } from "./hashState";

export type Size = { width: number; height: number };

/** 무대 안쪽 좌우 여백 · 기기 사이 간격 — `ShellApp` 의 배치와 같은 값 */
export const STAGE_PAD_X = 24;
export const STAGE_PAD_BOTTOM = 24;
export const FRAME_GAP = 32;
/** 매트릭스 칸 이름 줄 높이(이름 + 간격) */
export const CELL_CAPTION = 26;
/** 칸 이름이 글자마다 줄바꿈되지 않게 — 칸은 이보다 좁아지지 않고 이름은 말줄임 */
export const MIN_CELL_WIDTH = 120;

export const FIT_MIN = 0.2;
export const FIT_MAX = 2;
/** 전체 화면(57칸)은 맞춤이어도 작게 — 한 줄에 여러 칸이 보이도록 */
export const GRID_FIT = 0.3;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * @param area   무대 스크롤 영역의 안쪽 크기
 * @param top    기기 줄 위에 이미 쓰인 높이(안내 줄 · A/B 설명 · 기기 이름) — 배율과 무관하다
 * @param phones 그릴 기기 외형의 실제 크기(배율 1)
 */
export function fitScale(
  layout: LayoutId,
  area: Size,
  top: number,
  phones: readonly Size[],
): number {
  if (layout === "grid" || !phones.length) return GRID_FIT;
  const maxW = Math.max(...phones.map((phone) => phone.width));
  const maxH = Math.max(...phones.map((phone) => phone.height));
  // 스크롤바가 생겼다 사라지며 흔들리지 않게 2px 덜 쓴다
  const width = area.width - STAGE_PAD_X * 2 - 2;
  const height = area.height - top - STAGE_PAD_BOTTOM - 2;
  if (width <= 0 || height <= 0) return FIT_MIN;

  if (layout === "single") return clamp(Math.min(width / maxW, height / maxH), FIT_MIN, FIT_MAX);
  if (layout === "ab" || layout === "variants") return fitRow(area, top, phones);
  const caption = CELL_CAPTION;
  // 기기별 — 줄 수를 1 부터 n 까지 바꿔 보며 가장 크게 들어가는 배치를 고른다
  const n = phones.length;
  let best = FIT_MIN;
  for (let rows = 1; rows <= n; rows += 1) {
    const cols = Math.ceil(n / rows);
    // 칸은 MIN_CELL_WIDTH 보다 좁아지지 않는다 — 그 폭으로도 한 줄에 못 들어가면 이 배치는 안 된다
    if (cols * MIN_CELL_WIDTH + (cols - 1) * FRAME_GAP > width && rows < n) continue;
    const byWidth = (width - (cols - 1) * FRAME_GAP) / (cols * maxW);
    const byHeight = (height - rows * caption - (rows - 1) * FRAME_GAP) / (rows * maxH);
    best = Math.max(best, Math.min(byWidth, byHeight));
  }
  return clamp(best, FIT_MIN, FIT_MAX);
}

/** 기기 n 대를 한 줄로 나란히 — A/B(두 대) · 시안 비교(기존 + 시안 최대 3) */
export function fitRow(area: Size, top: number, phones: readonly Size[]): number {
  if (!phones.length) return FIT_MIN;
  const maxW = Math.max(...phones.map((phone) => phone.width));
  const maxH = Math.max(...phones.map((phone) => phone.height));
  const n = phones.length;
  const width = area.width - STAGE_PAD_X * 2 - 2;
  const height = area.height - top - STAGE_PAD_BOTTOM - 2;
  if (width <= 0 || height <= 0) return FIT_MIN;
  return clamp(Math.min((width - (n - 1) * FRAME_GAP) / n / maxW, height / maxH), FIT_MIN, FIT_MAX);
}
