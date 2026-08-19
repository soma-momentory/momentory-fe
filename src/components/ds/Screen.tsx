import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { background, layout } from "@/design/ds";

import { GridBackground } from "./GridBackground";

/**
 * 화면 바닥 — 배경 + 격자 + Safe Area + **좌우 패딩 20**.
 *
 * `design.md` §3 의 「페이지 좌우 패딩 **20 고정**」이 여기 한 곳에서 지켜진다.
 * 화면이 각자 패딩을 잡으면 20 이 화면 수만큼 갈린다.
 *
 * **격자는 스크롤과 무관하게 프레임에 고정된다** — 그래서 `children` 밖, 배경
 * 레이어에 깔린다(`design.md` §5).
 *
 * 전체 폭을 써야 하는 것(탭바·하단 CTA 바·시트)은 `padded={false}` 로 받고
 * 자기 안에서 20 을 잡는다 — 좌우 여백을 음수 마진으로 되돌리지 않는다.
 */
type Props = {
  children: ReactNode;
  /** 기본 `normal`. 구분 영역이 필요한 화면만 `alternative` */
  surface?: "normal" | "alternative";
  /** 좌우 20 패딩. 탭바·하단 바처럼 전체 폭이 필요하면 `false` */
  padded?: boolean;
  /** 격자를 끈다 — 시안에서 격자가 없는 면(시트 내부 등) */
  grid?: boolean;
  /** Safe Area 를 적용할 변. 탭바가 있는 화면은 아래를 탭바가 맡는다 */
  edges?: readonly ("top" | "bottom" | "left" | "right")[];
};

export function Screen({
  children,
  surface = "normal",
  padded = true,
  grid = true,
  edges = ["top", "bottom"],
}: Props) {
  return (
    <View style={[styles.root, { backgroundColor: background[surface] }]}>
      {grid ? <GridBackground /> : null}
      <SafeAreaView style={[styles.body, padded ? styles.padded : null]} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // minHeight 0 — 안쪽 ScrollView 가 부모를 넘겨 밀지 않게 한다
  body: { flex: 1, minHeight: 0 },
  padded: { paddingHorizontal: layout.screenPadding },
});
