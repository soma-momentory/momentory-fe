/**
 * 가짜 서버 — **껍데기**. 갈래 B 가 채운다. 이름과 모양은 `../lab-contract.ts` 를 따른다.
 */
import type { DatasetId, DatasetInfo, LabFrameConfig, SampleParams } from "../lab-contract";

export const datasets: readonly (DatasetInfo & { id: DatasetId })[] = [
  { id: "new-user", label: "신규 사용자", description: "온보딩 전 · 기록 없음" },
  { id: "empty", label: "빈 계정", description: "온보딩 끝 · 기록 0" },
  { id: "normal", label: "보통", description: "2주치 기록" },
  { id: "many", label: "많음", description: "3개월치 · 일정 많음" },
  { id: "long-copy", label: "긴 문구", description: "긴 닉네임·제목·본문" },
];

/** 프레임 부트스트랩이 앱보다 먼저 부른다 — `window.fetch` 를 감싸 LAB_API_BASE_URL 요청에 응답한다 */
export function installFakeServer(_config: LabFrameConfig): void {}

/** 이 프레임의 가짜 DB 를 데이터 세트 초기값으로 되돌린다(localStorage 비움) */
export function resetFakeData(_config: LabFrameConfig): void {}

/** 동적 라우트(`/diary/[id]` 등)에 넣을 실제 id */
export function sampleParams(_datasetId: string, _now?: string | null): SampleParams {
  return {};
}
