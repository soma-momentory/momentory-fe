import { useEffect, useRef, useState } from "react";
import { Linking } from "react-native";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type ExpoSpeechRecognitionErrorCode,
} from "expo-speech-recognition";

import { claimAudio } from "@/lib/audioClaim";

/**
 * 입력창의 음성 입력(2026-09-29) — **OS 음성 인식기**(iOS `SFSpeechRecognizer` · Android
 * `SpeechRecognizer`)가 말을 글자로 바꾼다. 외부 STT API 도 서버 작업도 없다.
 *
 * 인식된 글자는 **입력창에 채울 뿐 보내지 않는다** — 잘못 알아들은 문장이 그대로 전송되지
 * 않도록, 사용자가 읽고 고친 뒤 직접 보낸다.
 *
 * ## 권한은 마이크를 처음 누를 때 묻는다
 *
 * 설치·실행 때 묻지 않는다. 한 번 거부해 **다시 물을 수 없으면**(iOS 는 첫 거부부터, Android 는
 * 두 번째 거부부터) 마이크를 누를 때 **바로 설정을 연다** — 남은 길이 거기뿐이다.
 *
 * ## 실패·거부를 여기서 알리지 않는다
 *
 * 「오류·거부·실패는 한 줄 안내로 흡수 · 모달 금지」(`CLAUDE.md`). 한 줄이 설 자리는 화면마다
 * 다르므로 상태 변화만 `onEvent` 로 올리고, 무엇을 말할지는 화면이 정한다.
 *
 * ## 멈추는 때는 앱이 정한다 (2026-09-29 · 사용자 요청)
 *
 * 인식기에 맡기면 말이 2~3초만 끊겨도 스스로 끝난다(iOS 비연속 모드의 타이머 · iOS 18 이상은
 * 첫 문장이 확정되는 순간). 회고는 생각하며 말하느라 쉬는 틈이 길어서, **연속 모드로 듣고
 * 마지막 결과 뒤 `SILENCE_MS` 동안 조용하면 앱이 멈춘다.** 연속 모드는 말이 끊길 때마다 한
 * 구간씩 확정(`isFinal`)하므로, 확정된 구간을 `base` 에 쌓고 그 뒤에 진행 중인 구간을 붙인다.
 * ⚠ Android 12 이하는 연속 모드가 없어 예전처럼 인식기가 스스로 끝낸다.
 *
 * ⚠ iOS 는 기본적으로 Apple 서버에서 인식하고 한 번에 약 1분까지만 듣는다. 회고 답은 대부분
 * 1분 안이라 기기 내 인식(`requiresOnDeviceRecognition`)은 켜지 않았다 — 기기마다 한국어 품질이
 * 떨어질 수 있어서다.
 */

/** 마지막으로 말을 알아들은 뒤 이만큼 조용하면 듣기를 멈춘다 */
export const SILENCE_MS = 5_000;

/** 분석에 남기는 실패 종류 — 원문 오류 메시지는 보내지 않는다 */
export type VoiceFailure = "no_speech" | "network" | "unavailable" | "other";

/** 화면이 계측에 쓰는 음성 입력의 상태 변화. DS 는 분석 도구를 모른다 */
export type VoiceEvent =
  | { type: "started" }
  | { type: "permission"; granted: boolean }
  | { type: "failed"; code: VoiceFailure };

/**
 * 말하기 전에 적어 둔 글 뒤에 인식된 글을 잇는다. 사이에 공백이 없으면 하나 넣는다.
 * 진행 중인 구간의 결과는 매번 **그 구간의 처음부터 다시** 오므로, 늘 확정된 글(`base`)에 새로 붙인다.
 * iOS 18 은 두 번째 구간부터 앞에 공백을 붙여 보내므로 떼고 잇는다.
 */
export function joinTranscript(base: string, transcript: string): string {
  const next = transcript.trimStart();
  if (base.length === 0 || /\s$/.test(base)) return base + next;
  return `${base} ${next}`;
}

export function voiceFailure(error: ExpoSpeechRecognitionErrorCode): VoiceFailure | null {
  switch (error) {
    // 사용자가 멈췄다 — 실패가 아니다
    case "aborted":
      return null;
    case "no-speech":
    case "speech-timeout":
      return "no_speech";
    case "network":
      return "network";
    case "service-not-allowed":
    case "language-not-supported":
    case "audio-capture":
    case "busy":
      return "unavailable";
    default:
      return "other";
  }
}

function openSettings() {
  Linking.openSettings().catch(() => {
    // 열 수 없는 기기에서도 버튼이 앱을 멈추게 하지 않는다
  });
}

export function useVoiceInput({
  value,
  onChangeText,
  onEvent,
}: {
  value: string;
  onChangeText: (value: string) => void;
  onEvent?: (event: VoiceEvent) => void;
}) {
  const [listening, setListening] = useState(false);
  /** 말하기 전에 적어 둔 글 + 지금까지 확정된 구간들 */
  const base = useRef("");
  const silence = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** 조용한 시간을 처음부터 다시 잰다 */
  const hush = () => {
    clearTimeout(silence.current);
    silence.current = setTimeout(() => ExpoSpeechRecognitionModule.stop(), SILENCE_MS);
  };
  /** 권한을 묻는 동안 한 번 더 눌려도 두 번 시작하지 않는다 */
  const busy = useRef(false);
  /** 보내기로 끊은 뒤 늦게 도착한 결과를 버린다 */
  const active = useRef(false);
  /** 듣는 동안 배경음악을 세워 둔다 — 마이크가 음악까지 받아 적지 않게 */
  const releaseAudio = useRef<(() => void) | null>(null);
  const giveBackAudio = () => {
    releaseAudio.current?.();
    releaseAudio.current = null;
  };

  useSpeechRecognitionEvent("start", () => {
    setListening(true);
    hush();
    onEvent?.({ type: "started" });
  });
  useSpeechRecognitionEvent("end", () => {
    clearTimeout(silence.current);
    active.current = false;
    setListening(false);
    giveBackAudio();
  });
  useSpeechRecognitionEvent("result", (event) => {
    if (!active.current) return;
    const transcript = event.results[0]?.transcript;
    if (!transcript?.trim()) return;
    const text = joinTranscript(base.current, transcript);
    if (event.isFinal) base.current = text;
    onChangeText(text);
    hush();
  });
  useSpeechRecognitionEvent("error", (event) => {
    setListening(false);
    giveBackAudio();
    const code = voiceFailure(event.error);
    if (code == null) return;
    onEvent?.({ type: "failed", code });
  });

  // 화면을 떠나면 마이크를 놓는다
  useEffect(
    () => () => {
      clearTimeout(silence.current);
      ExpoSpeechRecognitionModule.abort();
      releaseAudio.current?.();
      releaseAudio.current = null;
    },
    [],
  );

  const start = async () => {
    const current = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    let granted = current.granted;
    if (!granted && current.canAskAgain) {
      granted = (await ExpoSpeechRecognitionModule.requestPermissionsAsync()).granted;
      onEvent?.({ type: "permission", granted });
    }
    if (!granted) {
      // 방금 팝업에서 거부했으면 화면이 한 줄로 알린다. 다시 물을 수 없을 때만 설정을 연다
      if (!current.canAskAgain) openSettings();
      return;
    }
    base.current = value;
    active.current = true;
    releaseAudio.current ??= claimAudio();
    ExpoSpeechRecognitionModule.start({
      lang: "ko-KR",
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
    });
  };

  const toggle = async () => {
    if (listening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    if (busy.current) return;
    busy.current = true;
    try {
      await start();
    } finally {
      busy.current = false;
    }
  };

  /** 보내기 직전에 부른다 — 듣던 말이 비운 입력창에 다시 채워지지 않게 */
  const cancel = () => {
    if (!active.current) return;
    active.current = false;
    clearTimeout(silence.current);
    ExpoSpeechRecognitionModule.abort();
  };

  return { listening, toggle, cancel };
}
