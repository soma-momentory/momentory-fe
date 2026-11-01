import { withAlpha } from "./color";
import { homeV2 } from "./homeV2";
import { layout, space } from "./metrics";

/** 회고 다이어리 — 2026-10-29 사용자 레퍼런스. 질감·외곽선 없이 단색 스티커를 쓴다. */
const USER_PAPER = homeV2.color.green;
const BABA_PAPER = "#EBDCC7";
const BABA_WIDTH = 158;
const INPUT_PADDING = space.xs;

export const retroDiary = {
  question: BABA_PAPER,
  answer: USER_PAPER,
  babaSkin: "#EAAE7C",
  babaInk: "#48291A",
  paper: "#FFFDF8",
  input: withAlpha(BABA_PAPER, 0.9),
  inputText: homeV2.color.ink,
  inputPlaceholder: homeV2.color.muted,
  onGreen: homeV2.color.white,
  sendIdle: "#D0DCC4",
  sendReady: homeV2.color.green,
  sendIcon: homeV2.color.green,
  sendDiameter: 40,
  choiceBorderWidth: 1.5,
  previewKeyboard: "#E2E4E8",
  radius: 28,
  bubbleMaxWidth: 320,
  answerMaxWidth: 286,
  inputPadding: INPUT_PADDING,
  inputMinHeight: layout.minTouch + INPUT_PADDING * 2,
  inputRadius: layout.minTouch / 2 + INPUT_PADDING,
  characterWidth: BABA_WIDTH,
  characterLeft: 12,
  characterLift: 78,
  // 키보드가 열린 동안은 상반신을 더 작게 표시하고 코의 가로 자리를 맞춘다.
  peekWidth: 126,
  peekDrop: 12,
  scheduleWidth: 288,
  methodIconSize: 44,
  methodFaceCrop: { x: 200, y: 140, width: 880 },
} as const;
