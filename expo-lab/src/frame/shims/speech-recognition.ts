/**
 * `expo-speech-recognition` 심. 웹 구현은 브라우저 `SpeechRecognition` 을 써서 **마이크 권한 창**을
 * 띄우고 음성을 브라우저 회사 서버로 보낸다 — Lab 에서는 둘 다 하지 않는다.
 *
 * 권한은 늘 허용이고, `start` 하면 정해 둔 한 문장을 「알아들은」 것처럼 흘린다(진행 중 결과 →
 * 확정 결과). 화면은 입력창이 채워지는 모습까지 그대로 보인다. 앱이 쓰는 것
 * (`src/components/ds/voiceInput.ts`)만 있다.
 */
import { useEffect, useRef } from "react";

export const LAB_TRANSCRIPT = "오늘은 생각보다 조금 지쳤던 것 같아요";

/** 진행 중 결과와 확정 결과 사이 — 채워지는 모습이 보일 만큼 */
const STEP_MS = 600;

type Listener = (event: never) => void;

const listeners = new Map<string, Set<Listener>>();
const timers = new Set<ReturnType<typeof setTimeout>>();
let listening = false;

const emit = (name: string, event: unknown = {}) => {
  listeners.get(name)?.forEach((listener) => (listener as (e: unknown) => void)(event));
};

const later = (ms: number, run: () => void) => {
  const timer = setTimeout(() => {
    timers.delete(timer);
    run();
  }, ms);
  timers.add(timer);
};

const finish = () => {
  timers.forEach(clearTimeout);
  timers.clear();
  if (!listening) return;
  listening = false;
  emit("end");
};

const result = (transcript: string, isFinal: boolean) => ({
  isFinal,
  results: [{ transcript, confidence: 1, segments: [] }],
});

const GRANTED = {
  status: "granted" as const,
  granted: true,
  canAskAgain: true,
  expires: "never" as const,
};

export const ExpoSpeechRecognitionModule = {
  getPermissionsAsync: async () => GRANTED,
  requestPermissionsAsync: async () => GRANTED,
  getMicrophonePermissionsAsync: async () => GRANTED,
  requestMicrophonePermissionsAsync: async () => GRANTED,
  isRecognitionAvailable: () => true,
  start: (_options?: object) => {
    if (listening) return;
    listening = true;
    emit("start");
    const half = LAB_TRANSCRIPT.slice(0, Math.ceil(LAB_TRANSCRIPT.length / 2));
    later(STEP_MS, () => emit("result", result(half, false)));
    later(STEP_MS * 2, () => emit("result", result(LAB_TRANSCRIPT, true)));
  },
  stop: finish,
  abort: finish,
};

export function useSpeechRecognitionEvent(name: string, listener: (event: never) => void): void {
  const latest = useRef(listener);
  useEffect(() => {
    latest.current = listener;
  });
  useEffect(() => {
    const relay: Listener = (event) => latest.current(event);
    const set = listeners.get(name) ?? new Set<Listener>();
    set.add(relay);
    listeners.set(name, set);
    return () => {
      set.delete(relay);
    };
  }, [name]);
}
