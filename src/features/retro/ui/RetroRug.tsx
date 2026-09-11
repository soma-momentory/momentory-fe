import { StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Ellipse, Rect } from "react-native-svg";

import { CHAT_DOCK_HEIGHT, useScreenBottomInset } from "@/components/ds";
import { layout, retroRug } from "@/design/ds";

import { RETRO_BABA_LEFT, RETRO_BABA_WIDTH } from "./RetroBaba";

/**
 * 회고 대화 화면에서 **바바가 앉은 큰 둥근 아이보리 러그**(2026-09-11 · 사용자 요청) — **단색**이다.
 *
 * 바바가 격자 위에 떠 있지 않고 **바닥에 깔린 러그 위에 앉아 있게** 한다. 회고 대화에만 깔린다 —
 * 같은 대화 껍데기를 쓰는 온보딩에는 없다.
 *
 * 같은 날 여러 번 바뀌었다: 화면 바닥 전체의 갈색 동산 → 바바 밑의 작은 타원 러그(테두리 + 점선 스티치) →
 * **「스티치·테두리 없이, 더 크게, 밑의 화면까지 다 채우게」**. 그래서 지금은 화면보다 큰 타원 하나이고,
 * 보이는 것은 **바바 뒤에서 둥글게 솟은 윗변**과 그 아래를 화면 바닥까지 채운 면이다. 입력창·선택지는
 * 이 위에 앉는다.
 *
 * ## 모양
 *
 * - 타원의 꼭대기가 **바바 한가운데 뒤**에 온다. 가로 반지름이 화면 폭의 72% 라 좌우 끝과 아래는 화면 밖으로
 *   나가고, 윗변은 바바에서 멀어질수록 둥글게 내려간다.
 * - 오른쪽 끝에서 윗변이 너무 내려가 입력창보다 낮아지지 않게 세로 반지름을 줄여 잡는다 — 넓은 기기일수록
 *   곡선이 조금 완만해진다.
 * - 테두리·스티치는 없다(사용자 요청으로 지웠다).
 *
 * ## 단색이다
 *
 * 질감을 여러 번 얹었다가(둥근 띠 두 톤 · 사선 짜임 결 → 펠트 그림을 따른 잔 반점 + 윗변 두께 띠) 사용자
 * 요청으로 **한 색 면**으로 돌아왔다. 빈백 밑의 **그림자**만 남긴다 — 무늬가 아니라 바바가 러그 위에
 * 앉아 보이게 하는 것이다.
 *
 * ## 높이는 여기 한 곳이 정한다
 *
 * 러그는 화면 바닥(`Screen` 의 `backdrop`)에, 바바는 대화 층 바닥(`companionLift`)에 앉아 기준선이
 * 다르다 — 둘 사이가 `useScreenBottomInset()` 이다. 그래서 **바바를 띄우는 높이(`RETRO_BABA_LIFT`)도
 * 이 파일이 내보낸다.** 한쪽만 고치면 바바가 러그에서 뜨거나 러그 밖으로 밀려난다.
 */

/**
 * 바바(빈백 아랫단)를 대화 층 바닥에서 띄우는 높이 — 앞쪽으로 러그가 드러나는 자리. 같은 날 「캐릭터만
 * 조금 내려줘」로 52 → 32 가 됐다(러그는 그대로).
 */
export const RETRO_BABA_LIFT = CHAT_DOCK_HEIGHT + 32;

/**
 * 러그 꼭대기(바바 한가운데 뒤) — 입력창 윗변에서 148. 빈백 아랫단보다 한참 위라 러그가 빈백 **뒤로**
 * 넉넉히 이어진다. ⚠ 바바 높이에 묶지 않는다 — 같은 날 「러그만 위로」·「캐릭터만 아래로」가 따로 왔다.
 */
const APEX = CHAT_DOCK_HEIGHT + 148;
/** 오른쪽 끝에서 윗변이 내려갈 수 있는 가장 낮은 자리 — 입력창 윗변보다 위라 입력창이 통째로 러그 위다 */
const RIGHT_MIN = CHAT_DOCK_HEIGHT + 16;
/** 가로 반지름 ÷ 화면 폭 — 1 을 넘는 지름이라 좌우 끝이 화면 밖으로 나간다 */
const RADIUS_X_RATIO = 0.72;
/** 세로 반지름 ÷ 가로 반지름의 상한 — 비스듬히 내려다본 둥근 러그의 납작함 */
const MAX_FLATNESS = 0.55;

/** 빈백 그림자의 세로 반지름 */
const SHADOW_RY = 18;

export function RetroRug() {
  const bottomInset = useScreenBottomInset();
  const { width } = useWindowDimensions();

  // 꼭대기는 바바 한가운데 뒤 — Screen 의 좌우 패딩(20) + 바바의 왼쪽 끝 + 그림 폭의 절반
  const cx = layout.screenPadding + RETRO_BABA_LEFT + RETRO_BABA_WIDTH / 2;
  const rx = width * RADIUS_X_RATIO;

  // 오른쪽 끝(꼭대기에서 dx 떨어진 자리)에서 윗변이 꼭대기보다 `rx·√…` 만큼 내려간다 —
  // 그 낙차가 RIGHT_MIN 아래로 가지 않게 세로 반지름을 줄인다
  const dx = Math.min(1, (width - cx) / rx);
  const dropPerRy = 1 - Math.sqrt(1 - dx * dx);
  const ry = Math.min(rx * MAX_FLATNESS, dropPerRy > 0 ? (APEX - RIGHT_MIN) / dropPerRy : Infinity);

  // 캔버스는 꼭대기부터 화면 바닥까지
  const height = bottomInset + APEX;

  return (
    <View testID="retro-rug" style={[styles.rug, { height }]}>
      <Svg width={width} height={height}>
        {/* ⚠ 타원의 **가운데 줄 아래는 사각형으로 채운다.** 타원은 가운데 줄에서 가장 넓고(화면보다 넓다)
            아래로 갈수록 좁아져서, 캔버스가 깊으면 아래 모서리가 비었다(2026-09-11 실기기) */}
        <Ellipse cx={cx} cy={ry} rx={rx} ry={ry} fill={retroRug.fill} />
        <Rect x={0} y={ry} width={width} height={Math.max(0, height - ry)} fill={retroRug.fill} />

        {/* 빈백이 드리운 그림자 — 빈백 아랫단 바로 위에 납작하게. 빈백이 그 위를 덮어 앞쪽 가장자리만 보인다 */}
        <Ellipse
          cx={cx}
          cy={height - bottomInset - RETRO_BABA_LIFT - SHADOW_RY / 2}
          rx={RETRO_BABA_WIDTH * 0.52}
          ry={SHADOW_RY}
          fill={retroRug.shadow}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  rug: { position: "absolute", left: 0, right: 0, bottom: 0 },
});
