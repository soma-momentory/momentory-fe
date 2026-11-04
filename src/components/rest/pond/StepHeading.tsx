import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet } from "react-native";

import { Text } from "@/components/ds";
import { label as labelColor, pondMotion, space } from "@/design/ds";

/**
 * 쉼터 장면의 **머리글** — 화면 위쪽에서 지금 말할 것 하나
 * (2026-09-04 감각연못에서 시작 · 지금은 걱정상자 · 보물함 · 몸에 힘 빼기가 쓴다).
 *
 * ## 한 번에 한 가지만 말한다
 *
 * 여기 서는 것은 **제목 한 줄과 설명 한두 줄**뿐이다. 소개(「감각연못」)든 진행 중의
 * 단계든 완료든 형태가 같아서, 화면은 이 자리에 넣을 문구만 갈아 끼운다
 * 브랜드 이름과 단계 안내를 같이 쌓지 않는 것이 이 컴포넌트의 요점이다 —
 * 위가 조용해야 눈이 연못으로 간다. 그래서 옛 `note`(설명 아래 보조 문구 한 줄)도
 * 받지 않는다.
 *
 * ## 화면을 새로 그리지 않는다
 *
 * 소개 → 보기 → 듣기 → 감각 → 완료는 **같은 화면**이다. 연못도 카피바라도 그 자리에
 * 그대로 있고 **글자만** 갈린다 — 옅어졌다(`headingSwap.out`) 새 문구로 돌아온다
 * (`in`). 갈리는 동안 살짝 내려갔다 오는 것(`shift`)이 「다음 이야기」로 읽히게
 * 한다. 문구가 툭 바뀌면 화면이 갈아 끼워진 것처럼 보여 연못이 이어지지 않는다.
 *
 * 소개에서 첫 단계로 넘어갈 때도 같은 방식이라 **자리가 비는 순간이 없다** —
 * 사라졌다 나타나면 화면이 한 번 끊긴 것으로 읽힌다.
 *
 * ## 바뀌는 시각은 시계가 정한다
 *
 * 새 문구로 갈아 끼우는 순간은 애니메이션의 완료 콜백이 아니라 **타이머**가 정한다 —
 * 네이티브 드라이버의 완료는 jest 에 오지 않고앱이 뒤로
 * 갔다 오면 늦게 올 수 있다. 옅어지는 길이는 정해져 있으니 그 시각에 바꾼다.
 *
 * ## 글자는 한 단씩 크다 (2026-09-11 · 사용자 요청)
 *
 * 연못 장면 위의 글은 밝은 그림 위에 앉아 같은 크기여도 작게 읽혔다. 그래서 소개는
 * `title3Hand`(24) → `title1Hand`(32) · `caption1` → `body2`, 진행·완료는
 * `headline1`(18) → `heading1`(22) · `body2` → `body1` 로 한 단씩 올렸다. 위쪽 빛
 * (`SceneTopVeil` · 장면의 42%) 안에서 끝나고 물에는 닿지 않는다.
 */
type Props = {
  title: string;
  description: string;
  /**
   * 소개(`intro`)의 제목은 **손글씨로 크게** 선다 — 콘텐츠의 이름이라 브랜드의 결로
   * 읽혀야 한다. 진행·완료(`step`)의 제목은 지금 할 일이라 본문 위계의 굵은 한 줄이다.
   */
  tone?: "intro" | "lead" | "step" | "close" | "stepLead" | "closeLead";
};

type Shown = Required<Pick<Props, "title" | "description" | "tone">>;

type ViewProps = Props & {
  /** 연못 장면 위에 얹힐 때는 가운데로 선다(2026-09-05) */
  center?: boolean;
  /**
   * 결이 잔 그림(하늘 · 풀밭) 위에 앉을 때 글자 둘레에 두르는 빛의 색 — 주면 설명도
   * 한 단 진하게(`label.normal`) 선다. 몸에 힘 빼기의 노을 하늘 위에서 설명이 흐렸다
   * (실기기 · 2026-10-05). 감각연못은 위쪽 빛 한 겹(`SceneTopVeil`)이 그 일을 해서 쓰지 않는다.
   */
  halo?: string;
};

export function StepHeading({
  title,
  description,
  tone = "step",
  center = false,
  halo,
}: ViewProps) {
  const glow = halo == null ? null : { textShadowColor: halo, textShadowRadius: 8 };
  // 지금 **보이고 있는** 문구. 새 문구는 옅어진 뒤에야 여기로 온다
  const [shown, setShown] = useState<Shown>({ title, description, tone });
  // 저장소 관례(`ChatBubble`) — ref 는 렌더 중 읽지 않는다(react-hooks/refs)
  const [fade] = useState(() => new Animated.Value(1));

  const stale = shown.title !== title || shown.description !== description || shown.tone !== tone;

  useEffect(() => {
    if (!stale) return;
    const out = Animated.timing(fade, {
      toValue: 0,
      duration: pondMotion.headingSwap.out,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    });
    out.start();
    const swap = setTimeout(
      () => setShown({ title, description, tone }),
      pondMotion.headingSwap.out,
    );
    return () => {
      clearTimeout(swap);
      out.stop();
    };
  }, [stale, title, description, tone, fade]);

  /**
   * 돌아오는 길은 **새 문구가 자리에 앉은 다음**이다 — 갈아 끼우는 것과 같은 틱에
   * 시작하면 안드로이드(Fabric)에서 이 애니메이션이 붙을 곳을 잃고 **반쯤 옅은 채로
   * 굳는다**(2026-09-06 에뮬레이터에서 실제로 그랬다 · 소개 → 첫 단계가 늘 한 번은
   * 갈리므로 매번 보였다). `shown` 이 바뀐 뒤의 효과라 그때는 뷰가 이미 있다.
   */
  useEffect(() => {
    const back = Animated.timing(fade, {
      toValue: 1,
      duration: pondMotion.headingSwap.in,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    back.start();
    return () => back.stop();
  }, [shown, fade]);

  return (
    <Animated.View
      style={[
        styles.head,
        center && styles.center,
        {
          opacity: fade,
          transform: [
            {
              translateY: fade.interpolate({
                inputRange: [0, 1],
                outputRange: [pondMotion.headingSwap.shift, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Text
        variant={TITLE[shown.tone]}
        color={labelColor.strong}
        style={[center ? styles.mid : null, glow]}
      >
        {shown.title}
      </Text>
      <Text
        variant={DESCRIPTION[shown.tone]}
        color={halo == null ? labelColor.neutral : labelColor.normal}
        style={[center ? styles.mid : null, glow]}
      >
        {shown.description}
      </Text>
    </Animated.View>
  );
}

/**
 * 결마다의 글자 크기. `close` 는 콘텐츠를 **마치는 한마디**라 진행(`step`)보다 한 단씩
 * 크다 — 몸에 힘 빼기의 마지막 화면에서 22 · 16 은 작았다(실기기 · 2026-10-05).
 * `lead` 는 소개(`intro`)와 같은 손글씨 제목에 **설명만 18** 이다 — 걱정상자의 숲 그림
 * 위에서 15 짜리 소개 한 줄이 묻혔다(2026-10-05 · 사용자 피드백).
 * `stepLead` · `closeLead` 는 진행 · 마침을 **소개 제목과 같은 크기**로 세운다 — 몸에 힘
 * 빼기 · 감각연못에서 첫 화면의 큰 제목 뒤에 작아지는 글이 약했다(2026-10-06 · 사용자 요청).
 */
const TITLE = {
  intro: "title1Hand",
  lead: "title1Hand",
  step: "heading1",
  close: "title3",
  stepLead: "title1Hand",
  closeLead: "title1Hand",
} as const;
/**
 * 설명은 **결과 상관없이 18 하나**다 — 쉼터 셋(감각연못 · 걱정상자 · 몸에 힘 빼기)의 제목
 * 아래 글을 몸에 힘 빼기 진행 화면의 크기로 맞췄다(2026-10-06 · 사용자 요청). 소개 15 ·
 * 진행 16 은 그림 위에서 작았다.
 */
const DESCRIPTION = {
  intro: "headline1",
  lead: "headline1",
  step: "headline1",
  close: "headline1",
  stepLead: "headline1",
  closeLead: "headline1",
} as const;

const styles = StyleSheet.create({
  head: { paddingTop: space.sm, gap: space.xs },
  center: { alignItems: "center" },
  mid: { textAlign: "center" },
});
