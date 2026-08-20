import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { EmotionPill } from "@/components/common/EmotionPill";
import { AppText } from "@/components/primitives/AppText";
import { paperColors, paperTypography } from "@/design/paper";
import { type EmotionId } from "@/features/emotion/model/emotion";
import { retroNav } from "@/design/tokens.mvp";

/**
 * 회고 상단 — `momentory.css` `.nav` · `.navb` · `.navbHit`.
 *
 * 왼쪽 `‹` · (제목) · (시작 감정 알약) · `[잠시 쉬기]`.
 *
 * **진행률·단계 번호를 노출하지 않는다**(`C1.md` · `RULES.md` 「회고」) — 지금
 * 어떤 감정으로 이야기하는지를 보여줄 뿐이다. 옛 온보딩 상단바는 진행 점 6칸을
 * 들어서 다른 물건이었는데, **3세대 온보딩이 진행 표시를 없애면서 사라졌다**.
 *
 * 시작 감정 알약은 `C3` 에서 고른 값이고 `C4`~`C4-e` 내내 상단에 남는다 —
 * 대화가 길어져도 무엇으로 시작했는지가 화면에서 사라지지 않는다.
 *
 * `[잠시 쉬기]` 는 **중단을 묻지 않고 홈으로 나간다**(`C1.md`) — 확인 모달이
 * 없다. 회고 중단·재개 화면(원본 `C1-b`)은 MVP 범위 밖이다.
 *
 * ⚠ **아직 기기에 남기지 않는다.** 스펙의 "자동 저장하고 홈에서 이어간다"에서
 * 지금 지켜지는 것은 **앱이 떠 있는 동안**뿐이다 — 회고 store 가 메모리라
 * 앱을 끄면 사라진다(`retro.ts`). MMKV 도입은 `ARCHITECTURE.md §1` 의 M3 이고,
 * 그때까지 **영속 저장을 화면 문구로 약속하지 않는다.**
 */
type Props = {
  title?: string;
  /** `C3` 에서 고른 시작 감정. `C4` 부터 붙는다 */
  emotion?: EmotionId | null;
  /** `[잠시 쉬기]` 를 보일지. `C1`~`C3` 는 보인다 */
  rest?: boolean;
  onBack?: () => void;
  onRest?: () => void;
  /**
   * 새 디자인의 상단 — 글자색만 종이 톤으로 바꾼다(`PLAN.md` Phase 2 opt-in).
   * 회고·일기가 같은 컴포넌트를 쓰므로 **기본값은 그대로**다.
   */
  variant?: "default" | "paper";
};

export function RetroNav({
  title,
  emotion,
  rest = true,
  onBack,
  onRest,
  variant = "default",
}: Props) {
  const paper = variant === "paper";

  return (
    <View style={styles.nav}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="뒤로"
        // 시각 24 라서 44 를 hitSlop 으로 채운다 (.navbHit)
        hitSlop={11}
        onPress={onBack ?? (() => router.back())}
      >
        <AppText tone="body" style={[styles.chevron, paper ? styles.inkPaper : null]}>
          ‹
        </AppText>
      </Pressable>

      {title != null ? (
        <AppText
          tone="strong"
          weight={paper ? "700" : "600"}
          style={[styles.title, paper ? styles.titlePaper : null]}
        >
          {title}
        </AppText>
      ) : null}

      {/* 제목이 없어도 오른쪽 것들이 끝으로 밀리게 자리를 채운다 */}
      <View style={styles.spacer} />

      {emotion != null ? <EmotionPill id={emotion} variant={paper ? "paper" : "default"} /> : null}

      {rest ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={12}
          // 중단을 묻지 않는다 — 확인 모달 없이 홈으로 나간다 (C1.md).
          // 남은 값은 이 앱 세션 동안만 유효하다 (위 주석)
          onPress={onRest ?? (() => router.replace("/home"))}
        >
          <AppText tone="caption" style={[styles.rest, paper ? styles.restPaper : null]}>
            잠시 쉬기
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    alignItems: "center",
    gap: retroNav.gap,
    minHeight: retroNav.height,
  },
  chevron: { fontSize: retroNav.chevron, lineHeight: retroNav.chevron * 1.2 },
  title: { fontSize: retroNav.titleSize, lineHeight: retroNav.titleSize },
  spacer: { flex: 1 },
  rest: { fontSize: retroNav.restSize, lineHeight: retroNav.restSize * 1.3 },

  // ── 새 디자인 ────────────────────────────────────────────────────────
  inkPaper: { color: paperColors.text.primary },
  titlePaper: {
    fontSize: paperTypography.styles.cardTitle.fontSize,
    lineHeight: paperTypography.styles.cardTitle.lineHeight,
    color: paperColors.text.primary,
  },
  restPaper: { color: paperColors.text.green },
});
