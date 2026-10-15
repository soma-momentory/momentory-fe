/**
 * 디자인 시스템 v0.2 「다꾸 메모」의 연결 지점 — 화면은 이 파일만 import 한다.
 *
 * **이 저장소만으로 빌드된다.** 외부 폴더(`~/Momentory/design-proposals/`)에 의존하지 않는다.
 * - `v0.2/tokens.css` · `v0.2/components.css` — 원본 v0.2 참조 구현의 **반입본**(README.md)
 * - 그림 · 서체 — v0.2 시안이 쓴 것과 **바이트가 같은 파일이 이 저장소 `assets/` 에 이미 있다.**
 *   design-lab 지침(「기존 앱 자산은 복사하지 않고 원본을 읽기 전용으로 연결」)대로 그쪽을 import 한다.
 *   교보손글씨도 앱이 이미 담고 있는 그 파일이라 새로 복사 · 변환하지 않는다(assets/fonts/README.md)
 */
import "./v0.2/tokens.css";
import "./v0.2/components.css";

import capyCalm from "../../../assets/body-release/capybara-calm.webp";
import memoLemon from "../../../assets/diary/memo-paper-lemon@2x.png";
import pebAngry from "../../../assets/emotion-pebble/angry.png";
import pebAnxious from "../../../assets/emotion-pebble/anxious.png";
import pebCalm from "../../../assets/emotion-pebble/calm.png";
import pebDepressed from "../../../assets/emotion-pebble/depressed.png";
import pebFrustrated from "../../../assets/emotion-pebble/frustrated.png";
import pebHappy from "../../../assets/emotion-pebble/happy.png";
import pebLethargic from "../../../assets/emotion-pebble/lethargic.png";
import pebProud from "../../../assets/emotion-pebble/proud.png";
import pebStuck from "../../../assets/emotion-pebble/stuck.png";
import pebTired from "../../../assets/emotion-pebble/tired.png";
import capyWave from "../../../assets/home/capybara-wave.png";

/** 감정 10종 — 키는 `diary-home-rest` 시안의 파일 이름, 이름은 앱 도메인(`features/emotion`)과 같다 */
export type EmotionKey =
  | "happy"
  | "proud"
  | "calm"
  | "tired"
  | "stuck"
  | "lethargic"
  | "anxious"
  | "depressed"
  | "angry"
  | "frustrated";

export const EMOTIONS: Record<EmotionKey, { name: string; pebble: string }> = {
  happy: { name: "행복함", pebble: pebHappy },
  proud: { name: "뿌듯함", pebble: pebProud },
  calm: { name: "평온함", pebble: pebCalm },
  tired: { name: "피곤함", pebble: pebTired },
  stuck: { name: "막막함", pebble: pebStuck },
  lethargic: { name: "무기력", pebble: pebLethargic },
  anxious: { name: "불안함", pebble: pebAnxious },
  depressed: { name: "우울함", pebble: pebDepressed },
  angry: { name: "화남", pebble: pebAngry },
  frustrated: { name: "답답함", pebble: pebFrustrated },
};

export const ART = {
  /** 홈 대표 메모 한 곳에만 — v0.2 「카피바라는 의미 있는 대표 장면에만」 */
  capybara: capyWave,
  /** 회고를 마친 날 같은 자리 — 손을 흔들지 않고 쉬는 모습 */
  capybaraCalm: capyCalm,
  /** 대표 메모지 질감 */
  memoLemon,
} as const;
