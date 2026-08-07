import Svg, { Circle, Path } from "react-native-svg";

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
export function CheckCircleIcon({ size = 17 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="12" fill={fill.primaryDeep} />
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
