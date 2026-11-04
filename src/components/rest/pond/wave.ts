import { useEffect, useState } from "react";
import { Animated, Easing } from "react-native";

const SAMPLES = 24;
const INPUT = Array.from({ length: SAMPLES + 1 }, (_, i) => i / SAMPLES);

/**
 * 천천히 오가는 움직임의 시계 — 0 에서 1 로 곧게 가는 값 하나를 네이티브에서 되풀이한다.
 *
 * ⚠ `Animated.loop(Animated.sequence(...))` 로 짜지 않는다(2026-11-04 · 실기기에서 연잎이 끊겼다).
 * `sequence` 를 감싼 반복은 네이티브 반복이 되지 못해 주기마다 JS 를 거쳐 다시 시작하고, 값을 시작값으로
 * 되돌린다. 시작값이 중간인 연잎은 그때마다 튀었다. 오가는 모양은 `waveRange` 의 표가 그린다.
 */
export function useWave(period: number, still: boolean) {
  const [clock] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(
      Animated.timing(clock, {
        toValue: 1,
        duration: period,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [clock, period, still]);
  return clock;
}

/** 시작(0)에서 끝(1)까지 한 번 오가는 곡선 — 처음과 끝이 같아 되풀이해도 이음매가 없다 */
export function waveShape(phase = 0) {
  return INPUT.map((t) => (1 - Math.cos(2 * Math.PI * (t + phase))) / 2);
}

/**
 * 한 번 뛰어오르는 곡선 — `t`(0~1)마다 높이(0~1) · 눌림(0~1).
 *
 * 몇 점만 찍어 곧게 이으면(옛 판) 꼭대기와 착지에서 속도가 꺾여 뚝뚝 끊겨 보인다. 그래서 곡선 자체를
 * 잘게 나눠 준다 — 살짝 웅크렸다가(`0~takeoff`) 포물선으로 날고, 내려앉으며 눌렸다가 천천히 펴진다.
 */
export const TAKEOFF = 0.14;
export const LAND = 0.8;
const smooth = (t: number) => t * t * (3 - 2 * t);
export function hopAt(t: number) {
  if (t < TAKEOFF) return { height: 0, squash: Math.sin((t / TAKEOFF) * Math.PI) * 0.6 };
  if (t < LAND) {
    const air = (t - TAKEOFF) / (LAND - TAKEOFF);
    return { height: 4 * air * (1 - air), squash: 0 };
  }
  const settle = (t - LAND) / (1 - LAND);
  return { height: 0, squash: 1 - smooth(settle) };
}

const HOP_INPUT = Array.from({ length: 41 }, (_, i) => i / 40);

/** 뛰어오르기 시계(`0→1`)를 값으로 옮기는 설정 — `pick` 이 높이 · 눌림에서 값을 고른다 */
export function hopRange(pick: (at: ReturnType<typeof hopAt>) => number) {
  return { inputRange: HOP_INPUT, outputRange: HOP_INPUT.map((t) => pick(hopAt(t))) };
}

/** `useWave` 의 값을 `from` ↔ `to` 사이로 옮기는 interpolate 설정 */
export function waveRange(from: number, to: number, phase = 0) {
  return {
    inputRange: INPUT,
    outputRange: waveShape(phase).map((w) => from + (to - from) * w),
  };
}
