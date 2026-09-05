import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { pond, pondSize } from "@/design/ds";
import type { SensePointKind } from "@/features/rest/model/sensePond";

/**
 * 감각의 **표** — 아래 판 한 칸의 글리프(눈 · 음표 · 손)
 * (2026-09-05 · 연못 위의 포인트가 사라지면서 판 전용이 됐다 2026-09-06).
 *
 * ## 왜 여기서 그리는가
 *
 * 앱의 아이콘은 Wanted 세트(`components/ds/icons/`)이고 **없는 글리프를 만들지
 * 않는다**(`CLAUDE.md`) — 눈·음표·손은 거기 없다. 그 규칙은 앱 껍데기의 아이콘
 * 이야기다. 감각연못은 격자도 끄고 사는 **작은 별도 세계**라 자기 그림을 자기가
 * 든다(`HoldGlow` 와 같은 판단). 그래서 세트를 늘리지 않고 여기서
 * 세 글리프만 그린다 — 이 파일 밖에서 쓰지 않는다.
 *
 * ## 연못 위에는 없다 (2026-09-06)
 *
 * 이 그림은 한때 연못 위에 떠서 **눌리는 표시**이기도 했다. 그러면 사용자가 보는
 * 것이 현실이 아니라 화면 속 아이콘이 되고, 「주변을 둘러보세요」라고 말해 놓고
 * 눈은 숨은그림찾기를 한다. 지금 연못은 표시 없이 **수면 하나**로 손짓을 받고,
 * 이 그림은 아래 판에서 **무엇을 세고 있는지**만 알려 준다.
 *
 * ## 셋은 결이 다르다
 *
 * 눈은 풀빛, 소리는 물빛, 손은 흙빛(`pond.markLine`·`markSound`·`markHand`).
 * 한 번에 한 종류만 뜨므로 서로를 구별하려는 색이 아니라 **그 감각의 결**이다.
 */
type Props = {
  kind: SensePointKind;
};

/** 글리프는 지름 24 의 좌표계에서 그린다 — 판의 원(44) 안에 여백을 두고 앉는다 */
const BOX = 24;
const STROKE = 1.5;

const INK: Record<SensePointKind, string> = {
  eye: pond.markLine,
  sound: pond.markSound,
  hand: pond.markHand,
};

export function SensePointMark({ kind }: Props) {
  const ink = INK[kind];
  return (
    <View style={styles.panelWrap} testID={`pond-panel-${kind}`}>
      {/* 그 감각의 색을 옅게 깐다 — 셋이 나란히 서므로 색으로 갈린다 */}
      <View style={[styles.panelTint, { backgroundColor: ink }]} />
      <View style={[styles.panelFace, { borderColor: ink }]}>
        <Svg width={BOX} height={BOX} viewBox={`0 0 ${BOX} ${BOX}`}>
          {kind === "eye" ? (
            <>
              {/* 눈꼬리가 살짝 올라간 아몬드 하나 + 눈동자 */}
              <Path
                d="M3.4 12c2.6-3.7 5.4-5.5 8.6-5.5s6 1.8 8.6 5.5c-2.6 3.7-5.4 5.5-8.6 5.5S6 15.7 3.4 12z"
                stroke={ink}
                strokeWidth={STROKE}
                strokeLinejoin="round"
                fill="none"
              />
              <Circle cx={12} cy={12} r={2.2} fill={ink} />
            </>
          ) : null}

          {kind === "sound" ? (
            <>
              {/* 음표 하나 — 기둥과 머리, 그리고 끝의 깃발 */}
              <Path
                d="M10.4 16.2V5.6l7.2-1.6v9.4"
                stroke={ink}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <Circle cx={8.2} cy={16.6} r={2.4} fill={ink} />
              <Circle cx={15.4} cy={14.6} r={2.4} fill={ink} />
            </>
          ) : null}

          {kind === "hand" ? (
            <>
              {/* 손바닥과 손가락 — 이 크기에서는 윤곽 하나가 손으로 읽힌다 */}
              <Path
                d="M8.2 12.6V6.4a1.35 1.35 0 012.7 0v4.7m0-.4V4.9a1.35 1.35 0 012.7 0v5.8m0-.3V6.6a1.35 1.35 0 012.7 0v6.9c0 3.4-2.2 5.9-5.4 5.9-2.4 0-3.8-1-4.9-2.9l-1.7-3a1.3 1.3 0 012.2-1.4l1 1.5"
                stroke={ink}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </>
          ) : null}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panelWrap: {
    width: pondSize.panelChip,
    height: pondSize.panelChip,
    alignItems: "center",
    justifyContent: "center",
  },
  panelTint: {
    position: "absolute",
    width: pondSize.panelChip,
    height: pondSize.panelChip,
    borderRadius: pondSize.panelChip / 2,
    opacity: 0.16,
  },
  panelFace: {
    width: pondSize.panelChip,
    height: pondSize.panelChip,
    borderRadius: pondSize.panelChip / 2,
    borderWidth: pondSize.chipRing,
    alignItems: "center",
    justifyContent: "center",
  },
});
