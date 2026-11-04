import {
  createMeditationClock,
  cueAt,
  formatMeditationClock,
  MEDITATION_CONCEPTS,
  MEDITATION_DURATION_MS,
  meditationConcept,
  visibleCueAt,
} from "../model/meditation";

describe("3분 명상 규칙", () => {
  it("풍경 다섯의 자막이 빈틈없이 0초부터 3분까지 이어진다", () => {
    expect(MEDITATION_CONCEPTS.map((c) => c.id)).toEqual([
      "wave",
      "forest",
      "sunlight",
      "rain",
      "lantern",
    ]);
    for (const { cues } of MEDITATION_CONCEPTS) {
      expect(cues[0]!.startMs).toBe(0);
      expect(cues[cues.length - 1]!.endMs).toBe(MEDITATION_DURATION_MS);
      cues.forEach((cue, i) => {
        if (i > 0) expect(cue.startMs).toBe(cues[i - 1]!.endMs);
        expect(cue.text.length).toBeGreaterThan(0);
      });
    }
  });

  it("지금 시간의 자막을 고르고, 끝에 닿으면 마지막 문장에 머문다", () => {
    const wave = meditationConcept("wave");
    expect(cueAt(wave, 0)).toBe(wave.cues[0]);
    expect(cueAt(wave, 59_999)).toBe(wave.cues[0]);
    expect(cueAt(wave, 60_000)).toBe(wave.cues[1]);
    expect(cueAt(wave, MEDITATION_DURATION_MS + 500)).toBe(wave.cues[2]);
  });

  it("작은 모닥불의 마지막 구간은 음성이 쉬어 가는 자리에서 두 문장으로 갈린다", () => {
    const lantern = meditationConcept("lantern");
    expect(cueAt(lantern, 125_400).text).toBe(
      "나에게 필요한 다정한 말을 골라 마음속으로 건네봅니다.",
    );
    expect(cueAt(lantern, 125_500).text).toContain("가슴 위에 손을");
  });

  it("자막은 음성이 끝나고 잠시 뒤 비었다가, 다음 구간에 다시 선다", () => {
    const wave = meditationConcept("wave");
    const firstEnd = wave.voices[0]!.startMs + wave.voices[0]!.durationMs;

    expect(visibleCueAt(wave, 0)).toBe(wave.cues[0]);
    expect(visibleCueAt(wave, firstEnd + 500)).toBe(wave.cues[0]);
    expect(visibleCueAt(wave, firstEnd + 700)).toBeNull();
    expect(visibleCueAt(wave, 59_999)).toBeNull();
    expect(visibleCueAt(wave, 60_000)).toBeNull();
    expect(visibleCueAt(wave, 60_300)).toBe(wave.cues[1]);
    expect(visibleCueAt(wave, 179_000)).toBeNull();
  });

  it("작은 모닥불의 마지막 토막은 두 문장 다 음성이 끝날 때까지 선다", () => {
    const lantern = meditationConcept("lantern");
    expect(visibleCueAt(lantern, 121_000)?.text).toContain("다정한 말");
    expect(visibleCueAt(lantern, 130_000)?.text).toContain("가슴 위에 손을");
    expect(visibleCueAt(lantern, 136_000)).toBeNull();
  });

  it("시계는 mm:ss 로 적고 3분을 넘기지 않는다", () => {
    expect(formatMeditationClock(45_900)).toBe("00:45");
    expect(formatMeditationClock(MEDITATION_DURATION_MS)).toBe("03:00");
    expect(formatMeditationClock(MEDITATION_DURATION_MS + 9_000)).toBe("03:00");
  });

  it("시계는 멈춘 채 태어나고 멈춘 시간을 세지 않는다", () => {
    let t = 1_000;
    const clock = createMeditationClock(() => t);
    t += 5_000;
    expect(clock.elapsed()).toBe(0);
    clock.resume();
    t += 10_000;
    clock.pause();
    t += 30_000;
    expect(clock.elapsed()).toBe(10_000);
    clock.resume();
    t += 2_000;
    expect(clock.elapsed()).toBe(12_000);
  });
});
