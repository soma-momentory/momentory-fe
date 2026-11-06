/**
 * 「지금은 내가 소리를 쓴다」는 표시 (2026-11-05) — 배경음악은 누가 표시해 둔 동안 비켜 선다.
 *
 * 3분 명상의 안내 음성과 회고 입력의 마이크가 표시한다. 함께 나면 음성이 묻히고, 마이크가 음악까지 받아 적는다.
 * 부르는 쪽이 음악을 모르게 하려고 여기를 지난다 — `components/ds/voiceInput.ts` 가 `features/` 를 볼 수 없다.
 *
 * `lib/audio.ts` 와 나눈 것은 네이티브 모듈을 불러오지 않으려고다. 채팅 입력창을 쓰는 화면이 전부 여기를 지난다.
 */
const claims = new Set<symbol>();
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

/** 돌려준 함수를 부르면 표시를 거둔다 — 두 번 불러도 한 번만 거둔다 */
export function claimAudio(): () => void {
  const claim = Symbol("audio-claim");
  claims.add(claim);
  notify();
  return () => {
    if (claims.delete(claim)) notify();
  };
}

export const isAudioClaimed = (): boolean => claims.size > 0;

export function onAudioClaimChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
