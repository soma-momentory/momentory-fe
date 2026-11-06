import { storage } from "@/features/rest/data/deviceStorage";

/**
 * 배경음악을 **기기에** 기억한다 (2026-11-05) — 고른 곡과 틀어 두었는지 둘뿐이다.
 * 서버에 두지 않는 것은 어떤 소리를 틀어 둘지가 기기 쪽 사정일 뿐이라서다. **던지지 않는다.**
 */
const KEY = "momentory.music";

export type MusicMemory = { trackId: string | null; playing: boolean };

/** 못 읽으면 아무것도 고르지 않은 것으로 친다 — 소리가 안 나는 쪽이 갑자기 나는 쪽보다 낫다 */
export async function readMusicMemory(): Promise<MusicMemory> {
  try {
    const raw = await storage().getItem(KEY);
    if (raw == null) return { trackId: null, playing: false };
    const v: unknown = JSON.parse(raw);
    if (typeof v !== "object" || v == null) return { trackId: null, playing: false };
    const { trackId, playing } = v as Record<string, unknown>;
    return {
      trackId: typeof trackId === "string" ? trackId : null,
      playing: playing === true,
    };
  } catch {
    return { trackId: null, playing: false };
  }
}

export async function writeMusicMemory(memory: MusicMemory): Promise<void> {
  try {
    if (memory.trackId == null) await storage().removeItem(KEY);
    else await storage().setItem(KEY, JSON.stringify(memory));
  } catch {
    // 못 남기면 다음에 켤 때 고른 곡이 안 이어지는 정도다
  }
}
