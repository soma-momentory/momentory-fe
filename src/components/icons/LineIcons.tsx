import Svg, { Circle, Path } from "react-native-svg";

import { paperColors } from "@/design/paper";
import theme from "@/design/theme";
import { fill, lineIcon } from "@/design/tokens.mvp";

/**
 * 선 아이콘 한 벌 — `momentory.css` `.icoi`.
 *
 * ```css
 * .icoi{fill:none;stroke:currentColor;stroke-width:1.5;
 *       stroke-linecap:round;stroke-linejoin:round}
 * ```
 *
 * **이모지를 쓰지 않는다**(`RULES.md` 「아이콘」) — 기기마다 다르게 그려져 카드
 * 안에서 크기가 튄다. 상류가 2026-08-06 에 ☀️🔔✎🌙 를 전부 이 한 벌로 바꿨다.
 *
 * 피그마 판은 플러그인에 path·rotation 이 없어 원·둥근 사각으로 근사하고 이름에
 * `(선)` 을 남긴다 — **진짜 벡터가 사는 곳이 여기다.**
 *
 * 예외 하나: `07` 쉬는 방법 칩의 이모지는 **선택지 라벨의 일부**라 그대로 둔다.
 */
type IconProps = {
  size?: number;
  color?: string;
};

const { semantic } = theme.colors;

const stroke = {
  strokeWidth: lineIcon.strokeWidth,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  fill: "none",
};

/** 해 — 홈 상단의 날씨 */
export function SunIcon({ size = 13, color = semantic.textSlogan }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="4.5" stroke={color} {...stroke} />
      <Path
        d="M12 1.8v2.6M12 19.6v2.6M4.6 4.6l1.9 1.9M17.5 17.5l1.9 1.9M1.8 12h2.6M19.6 12h2.6M4.6 19.4l1.9-1.9M17.5 6.5l1.9-1.9"
        stroke={color}
        {...stroke}
      />
    </Svg>
  );
}

/** 구름 — 흐림 (새 디자인 홈의 날씨 줄) */
export function CloudIcon({ size = 13, color = semantic.textSlogan }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M7.2 18.5h9.6a4 4 0 0 0 .4-8 5.6 5.6 0 0 0-10.7 1.2 3.4 3.4 0 0 0 .7 6.8Z"
        stroke={color}
        {...stroke}
      />
    </Svg>
  );
}

/** 비 — 구름 + 빗줄기 */
export function RainIcon({ size = 13, color = semantic.textSlogan }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M7.4 14.6h9.2a3.6 3.6 0 0 0 .4-7.2 5.2 5.2 0 0 0-10 1.1 3.1 3.1 0 0 0 .4 6.1Z"
        stroke={color}
        {...stroke}
      />
      <Path d="M8.6 17.6l-1 2.8M13 17.6l-1 2.8M17.4 17.6l-1 2.8" stroke={color} {...stroke} />
    </Svg>
  );
}

/**
 * ✕ 닫기 — 일기 상세·수정의 왼쪽 위(`일기.dc.html`).
 * 시안의 `✕` 글리프는 이모지·특수문자라 기기마다 굵기가 튄다 — 선 두 개로 그린다.
 */
export function CloseIcon({ size = 18, color = semantic.textPrimary }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6.6 6.6l10.8 10.8M17.4 6.6L6.6 17.4" stroke={color} {...stroke} />
    </Svg>
  );
}

/** 위 꺾쇠 — 일정 순서 올리기 */
export function ChevronUpIcon({ size = 16, color = semantic.textBody }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5.5 15.2L12 8.8l6.5 6.4" stroke={color} {...stroke} />
    </Svg>
  );
}

/** 아래 꺾쇠 — 일정 순서 내리기 */
export function ChevronDownIcon({ size = 16, color = semantic.textBody }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5.5 8.8L12 15.2l6.5-6.4" stroke={color} {...stroke} />
    </Svg>
  );
}

/** 왼쪽 꺾쇠 — 보관함 달력의 **이전 달**(시안의 `‹`). 이모지·글리프를 쓰지 않는다 */
export function ChevronLeftIcon({ size = 18, color = semantic.textBody }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M15.2 5.2L8.4 12l6.8 6.8" stroke={color} {...stroke} />
    </Svg>
  );
}

/** 오른쪽 꺾쇠 — 보관함 달력의 **다음 달**(시안의 `›`) */
export function ChevronRightIcon({ size = 18, color = semantic.textBody }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M8.8 5.2L15.6 12l-6.8 6.8" stroke={color} {...stroke} />
    </Svg>
  );
}

/** 돋보기 — 보관함 목록의 일기 검색(시안의 `⌕`) */
export function SearchIcon({ size = 16, color = semantic.textBody }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="10.8" cy="10.8" r="6.3" stroke={color} {...stroke} />
      <Path d="M15.5 15.5L20 20" stroke={color} {...stroke} />
    </Svg>
  );
}

/** 종 — 홈 상단의 알림 */
export function BellIcon({ size = 15, color = semantic.textBody }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M18 8.5a6 6 0 1 0-12 0c0 6-2.2 7.5-2.2 7.5h16.4S18 14.5 18 8.5Z"
        stroke={color}
        {...stroke}
      />
      <Path d="M13.7 19.5a2 2 0 0 1-3.4 0" stroke={color} {...stroke} />
    </Svg>
  );
}

/** 달 — 회고 진입 줄 · 완료 카드의 「돌아보는 시간」 */
export function MoonIcon({ size = 16, color = fill.primaryDeep }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M20.5 15.3A8.8 8.8 0 1 1 9.2 3.6a6.9 6.9 0 0 0 11.3 11.7Z"
        stroke={color}
        {...stroke}
      />
    </Svg>
  );
}

/**
 * 위쪽 화살 — 회고 대화의 **전송**(`회고.dc.html` 의 `↑` 글리프).
 *
 * 시안은 문자 `↑` 를 쓰지만 기기마다 굵기·크기가 튀고 이모지 폰트로 대체되는
 * 기기가 있다(`RULES.md` 「아이콘」) — 선으로 그린다. 초록 면 위에 얹히므로
 * 기본색이 `onFill`(순백)이다. 획은 42 원 안에서 읽히게 2 로 굵다.
 */
export function SendIcon({ size = 18, color = paperColors.text.onFill }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 19.2V6.2" stroke={color} {...stroke} strokeWidth={2} />
      <Path d="M6.2 12L12 5.6l5.8 6.4" stroke={color} {...stroke} strokeWidth={2} />
    </Svg>
  );
}

/** 연필 — 순간 추가(`.mbtnQi`) */
export function PencilIcon({ size = 15, color = semantic.accentInk }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 20h4.2L20 8.2 15.8 4 4 15.8V20Z" stroke={color} {...stroke} />
      <Path d="M13.9 5.9 18.1 10.1" stroke={color} {...stroke} />
    </Svg>
  );
}

/**
 * 체크 — **`primaryDeep` 채운 원 + 흰 체크**(`10.md`).
 * `primary` 는 장식 전용이라 글리프가 얹히는 면은 `primaryDeep` 이다.
 * 완료 카드(`.ico17` 17)와 일정 행의 마침(`.chk` 22)이 같은 모양을 쓴다.
 */
export function CheckCircleIcon({
  size = 17,
  color = fill.primaryDeep,
}: {
  size?: number;
  /** 새 디자인은 마침 원을 **그날 감정색**으로 채운다 (`paper` 변형 — PLAN.md Phase 3) */
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="12" fill={color} />
      <Path
        d="M7 12.4l3.3 3.2 6.7-6.9"
        stroke={semantic.textOnDark}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
