import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { background, layout } from "@/design/ds";

import { GridBackground } from "./GridBackground";

/**
 * 화면 바닥 — 배경 + 격자 + Safe Area + **좌우 패딩 20**.
 *
 * `DESIGN.md` §3 의 「페이지 좌우 패딩 **20 고정**」이 여기 한 곳에서 지켜진다.
 * 화면이 각자 패딩을 잡으면 20 이 화면 수만큼 갈린다.
 *
 * **격자는 스크롤과 무관하게 프레임에 고정된다** — 그래서 `children` 밖, 배경
 * 레이어에 깔린다(`DESIGN.md` §5).
 *
 * 전체 폭을 써야 하는 것(탭바·하단 CTA 바·시트)은 `padded={false}` 로 받고
 * 자기 안에서 20 을 잡는다 — 좌우 여백을 음수 마진으로 되돌리지 않는다.
 *
 * ## `SafeAreaView` 를 쓰지 않는다 — 아래에 **하한**이 필요하다
 *
 * `SafeAreaView` 는 인셋을 그대로 패딩으로 옮기는데, 안드로이드 **3버튼
 * 내비게이션** 기기는 `insets.bottom` 이 0 으로 온다(시스템 바가 창 밖에 있다).
 * 그러면 바닥 버튼이 시스템 버튼에 딱 붙는다 — 제스처 바 기기에서는 인셋이
 * 저절로 여백 노릇을 해서 보이지 않던 문제다. 그래서 인셋과
 * `layout.minBottomInset` 중 **큰 쪽**을 쓴다(라이브러리에 하한 옵션이 없다).
 *
 * ## 안드로이드는 그 위에 한 뼘 더 얹는다
 *
 * 인셋이 **제대로 오는** 안드로이드 기기에서는 하한이 아무 일도 하지 않아서,
 * 하단 독(「다음」·「이야기 시작하기」·채팅 입력)이 시스템 바에 **딱 맞닿아**
 * 있었다. `layout.androidNavGap` 을 인셋에 **더해** 숨을 만든다 — iOS 는 홈
 * 인디케이터 인셋이 이미 그 일을 해서 0 이다.
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
  const insets = useSafeAreaInsets();
  const on = (edge: "top" | "bottom" | "left" | "right") => edges.includes(edge);

  // 좌우는 화면 패딩(20)과 인셋을 **더한다** — 둘 중 하나로 덮으면 노치 기기에서
  // 20 이 사라지거나 인셋이 무시된다
  const side = padded ? layout.screenPadding : 0;
  const safe = {
    paddingTop: on("top") ? insets.top : 0,
    paddingBottom: on("bottom")
      ? Math.max(insets.bottom, layout.minBottomInset) + layout.androidNavGap
      : 0,
    paddingLeft: side + (on("left") ? insets.left : 0),
    paddingRight: side + (on("right") ? insets.right : 0),
  };

  return (
    <View style={[styles.root, { backgroundColor: background[surface] }]}>
      {grid ? <GridBackground /> : null}
      <View style={[styles.body, safe]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // minHeight 0 — 안쪽 ScrollView 가 부모를 넘겨 밀지 않게 한다
  body: { flex: 1, minHeight: 0 },
});
