/**
 * 키보드 그림의 **배치** — 키 하나하나의 자리(pt/dp)를 계산한다. DOM 을 모른다(테스트가 부른다).
 *
 * - iOS 두벌식: ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔ / ㅁㄴㅇㄹㅎㅗㅓㅏㅣ / ⇧ ㅋㅌㅊㅍㅠㅜㅡ ⌫ /
 *   Face ID 기기 `123 😊 스페이스 return` + 아래 줄에 🌐 · 🎤, 홈 버튼 기기 `123 🌐 🎤 스페이스 return`.
 *   키 간격 6 · 좌우 3 · 줄 간격 12(키 216pt 판 기준 키 높이 42) — 시뮬레이터 화면에서 잰 근사.
 * - Gboard 두벌식: 같은 낱자 판 + 첫 줄 숫자 힌트(1~0), 마지막 줄 `?123 , ☺ 스페이스 . ⏎`,
 *   위에 도구 줄, 아래 내비게이션 자리(키보드 내리기 ⌄).
 */
import type { KeyboardSpec } from "./heights";

export type KeyKind =
  "char" | "shift" | "delete" | "space" | "enter" | "mode" | "globe" | "emoji" | "mic" | "hide";

export type KeyRect = {
  kind: KeyKind;
  /** 키에 적힌 글자(아이콘 키는 비어 있다) */
  label: string;
  /** 누르면 들어가는 글자(`char` · `space`) */
  text?: string;
  /** Gboard 첫 줄의 숫자 힌트 */
  hint?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** 회색(기능) 키인가 */
  functional: boolean;
  /** 테두리 없는 아이콘 자리(iOS 아래 줄의 🌐 · 🎤, Android 내비 자리의 ⌄) */
  bare?: boolean;
  /** 강조색 return(iOS 검색 · 보내기 · 완료 · 이동 / Gboard 는 늘) */
  accent?: boolean;
};

export type KeyboardLayout = {
  width: number;
  height: number;
  keys: KeyRect[];
  /** iOS 예측 막대 · Gboard 도구 줄의 칸 */
  suggestions: { label: string; x: number; width: number }[];
};

const ROWS = {
  base: ["ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔ", "ㅁㄴㅇㄹㅎㅗㅓㅏㅣ", "ㅋㅌㅊㅍㅠㅜㅡ"],
  shifted: ["ㅃㅉㄸㄲㅆㅛㅕㅑㅒㅖ", "ㅁㄴㅇㄹㅎㅗㅓㅏㅣ", "ㅋㅌㅊㅍㅠㅜㅡ"],
} as const;

/** `enterkeyhint`(RN `returnKeyType` 이 웹에서 되는 것) → 키에 적힐 말 */
const IOS_ENTER: Record<string, { label: string; accent: boolean }> = {
  done: { label: "완료", accent: true },
  go: { label: "이동", accent: true },
  search: { label: "검색", accent: true },
  send: { label: "보내기", accent: true },
  next: { label: "다음", accent: false },
  previous: { label: "이전", accent: false },
};
const GBOARD_ENTER: Record<string, string> = {
  done: "✓",
  go: "→",
  next: "→",
  previous: "←",
  search: "⌕",
  send: "➤",
};

export type LayoutOptions = { shift?: boolean; enterKeyHint?: string | null };

const IOS_SUGGESTIONS = ["나는", "오늘", "그냥"];

export function layoutKeyboard(
  spec: KeyboardSpec,
  width: number,
  options: LayoutOptions = {},
): KeyboardLayout {
  return spec.style === "ios"
    ? layoutIos(spec, width, options)
    : layoutGboard(spec, width, options);
}

function letterRows(
  shift: boolean,
  { side, gap, keyW, keyH, rowY, width }: Grid,
  rowHint?: string,
): KeyRect[] {
  const rows = shift ? ROWS.shifted : ROWS.base;
  const keys: KeyRect[] = [];
  const pitch = keyW + gap;
  [...rows[0]].forEach((jamo, i) =>
    keys.push({
      kind: "char",
      label: jamo,
      text: jamo,
      hint: rowHint?.[i],
      x: side + i * pitch,
      y: rowY(0),
      width: keyW,
      height: keyH,
      functional: false,
    }),
  );
  [...rows[1]].forEach((jamo, i) =>
    keys.push({
      kind: "char",
      label: jamo,
      text: jamo,
      x: side + pitch / 2 + i * pitch,
      y: rowY(1),
      width: keyW,
      height: keyH,
      functional: false,
    }),
  );
  const third = [...rows[2]];
  const start = (width - (third.length * keyW + (third.length - 1) * gap)) / 2;
  third.forEach((jamo, i) =>
    keys.push({
      kind: "char",
      label: jamo,
      text: jamo,
      x: start + i * pitch,
      y: rowY(2),
      width: keyW,
      height: keyH,
      functional: false,
    }),
  );
  return keys;
}

type Grid = {
  side: number;
  gap: number;
  keyW: number;
  keyH: number;
  width: number;
  rowY: (row: number) => number;
};

function layoutIos(spec: KeyboardSpec, width: number, options: LayoutOptions): KeyboardLayout {
  const side = 3;
  const gap = 6;
  const keyW = (width - 2 * side - 9 * gap) / 10;
  const pitchY = spec.keys / 4;
  const keyH = pitchY - 12;
  const top = spec.suggestionBar;
  const rowY = (row: number) => top + row * pitchY + (pitchY - keyH) / 2;
  const grid: Grid = { side, gap, keyW, keyH, width, rowY };
  const keys = letterRows(options.shift === true, grid);

  const fnW = keyW * 1.27;
  keys.push(
    { kind: "shift", label: "", x: side, y: rowY(2), width: fnW, height: keyH, functional: true },
    {
      kind: "delete",
      label: "",
      x: width - side - fnW,
      y: rowY(2),
      width: fnW,
      height: keyH,
      functional: true,
    },
  );

  const enter = IOS_ENTER[options.enterKeyHint ?? ""] ?? { label: "return", accent: false };
  const returnW = keyW * 2.65;
  const returnX = width - side - returnW;
  const faceId = spec.bottomArea > 0;
  const bottomRow: KeyRect[] = [];
  let x = side;
  const push = (kind: KeyKind, label: string, w: number) => {
    bottomRow.push({ kind, label, x, y: rowY(3), width: w, height: keyH, functional: true });
    x += w + gap;
  };
  if (faceId) {
    push("mode", "123", keyW * 1.3);
    push("emoji", "", keyW * 1.3);
  } else {
    push("mode", "123", keyW * 1.13);
    push("globe", "", keyW * 1.13);
    push("mic", "", keyW * 1.13);
  }
  bottomRow.push({
    kind: "space",
    label: "스페이스",
    text: " ",
    x,
    y: rowY(3),
    width: returnX - gap - x,
    height: keyH,
    functional: false,
  });
  bottomRow.push({
    kind: "enter",
    label: enter.label,
    x: returnX,
    y: rowY(3),
    width: returnW,
    height: keyH,
    functional: true,
    accent: enter.accent,
  });
  keys.push(...bottomRow);

  if (faceId) {
    // 지구본 · 마이크는 키 아래 줄에 테두리 없이 앉는다(홈 인디케이터 위)
    const iconSize = 30;
    const iconY = top + spec.keys + 8;
    keys.push(
      {
        kind: "globe",
        label: "",
        x: side + keyW * 0.65 - iconSize / 2 + 4,
        y: iconY,
        width: iconSize,
        height: iconSize,
        functional: true,
        bare: true,
      },
      {
        kind: "mic",
        label: "",
        x: width - side - keyW * 0.65 - iconSize / 2 - 4,
        y: iconY,
        width: iconSize,
        height: iconSize,
        functional: true,
        bare: true,
      },
    );
  }

  const cell = width / 3;
  return {
    width,
    height: spec.total,
    keys,
    suggestions: IOS_SUGGESTIONS.map((label, i) => ({ label, x: i * cell, width: cell })),
  };
}

function layoutGboard(spec: KeyboardSpec, width: number, options: LayoutOptions): KeyboardLayout {
  const side = 4;
  const gap = 5;
  const keyW = (width - 2 * side - 9 * gap) / 10;
  const area = spec.keys - 8;
  const pitchY = area / 4;
  const keyH = pitchY - 9;
  const top = spec.suggestionBar;
  const rowY = (row: number) => top + row * pitchY + (pitchY - keyH) / 2;
  const grid: Grid = { side, gap, keyW, keyH, width, rowY };
  const keys = letterRows(options.shift === true, grid, "1234567890");

  const fnW = keyW * 1.5 + gap / 2;
  keys.push(
    { kind: "shift", label: "", x: side, y: rowY(2), width: fnW, height: keyH, functional: true },
    {
      kind: "delete",
      label: "",
      x: width - side - fnW,
      y: rowY(2),
      width: fnW,
      height: keyH,
      functional: true,
    },
  );

  let x = side;
  const y = rowY(3);
  const push = (key: Omit<KeyRect, "x" | "y" | "height">) => {
    keys.push({ ...key, x, y, height: keyH });
    x += key.width + gap;
  };
  const enterW = fnW;
  const spaceW = width - 2 * side - (fnW + keyW * 3 + enterW) - 5 * gap;
  push({ kind: "mode", label: "?123", width: fnW, functional: true });
  push({ kind: "char", label: ",", text: ",", width: keyW, functional: true });
  push({ kind: "emoji", label: "", width: keyW, functional: true });
  push({ kind: "space", label: "", text: " ", width: spaceW, functional: false });
  push({ kind: "char", label: ".", text: ".", width: keyW, functional: true });
  push({
    kind: "enter",
    label: GBOARD_ENTER[options.enterKeyHint ?? ""] ?? "↵",
    width: enterW,
    functional: true,
    accent: true,
  });

  if (spec.bottomArea > 0) {
    // 키보드가 떠 있는 동안 내비게이션 자리 왼쪽에 「키보드 내리기」가 생긴다(Android 10+ 제스처 탐색)
    const size = Math.min(spec.bottomArea, 24);
    keys.push({
      kind: "hide",
      label: "",
      x: 20,
      y: spec.total - spec.bottomArea + (spec.bottomArea - size) / 2,
      width: size,
      height: size,
      functional: true,
      bare: true,
    });
  }

  return { width, height: spec.total, keys, suggestions: [] };
}
