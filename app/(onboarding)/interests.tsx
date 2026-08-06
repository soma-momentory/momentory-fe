import { router } from "expo-router";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { Avatar } from "@/components/chat/Avatar";
import { BabaBubble } from "@/components/chat/BabaBubble";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { ChipFlow } from "@/components/chat/ChipFlow";
import { OnboardingTopBar } from "@/components/onboarding/OnboardingTopBar";
import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import theme from "@/design/theme";
import { clearButton, otherRow, warnRow } from "@/design/tokens.mvp";
import { MAX_INTERESTS, useDraft } from "@/features/onboarding/model/draft";

/**
 * `06` · 관심 분야 (온보딩 3/6 · 필수 · 복수) + `06-b`/`06-c` 기타 입력
 *
 * **칩 8개를 한 화면에 다 보인다.** 스크롤로 감추면 뒤쪽은 선택되지 않는다.
 *
 * **최대 3개.** 넷째부터는 눌러도 켜지지 않는다 — 다 고르면 아무것도 안 고른
 * 것과 같다(`06.md`). 제한 경고를 미리 띄우지 않고 안내는 몇 개를 골랐는지
 * **사실만** 말한다(`06-c.md`).
 *
 * **[기타]를 누르면 칩 바로 아래에 한 줄 입력이 열린다**(`06-b.md`) — 별도
 * 화면·시트로 보내지 않는다. 고른 칩들을 보면서 적어야 무엇을 더할지 판단할
 * 수 있다.
 *
 * - 기타를 켠 채 비워 두면 `[다음]` 이 잠긴다 — 켠 것은 "적을 게 있다"는 뜻
 * - 빠져나가는 길은 둘뿐 — **적거나, 기타를 끄거나**
 * - 확정 기준은 셋 — 키보드 `[완료]` · 입력 줄 밖 탭 · `[다음]`. 전부 trim 한
 *   값을 쓰고, **공백뿐이면 확정하지 않고 기타 선택을 취소한다**(`06-c.md`)
 * - 12자 상한 — 넘기면 더 입력되지 않고 오류 문구 없이 **카운터 색만** 바뀐다
 */
const MAX = MAX_INTERESTS;

const ITEMS = [
  { id: "study", label: "학업" },
  { id: "career", label: "취업·진로" },
  { id: "work", label: "일·직장생활" },
  { id: "relations", label: "인간관계" },
  { id: "family", label: "가족" },
  { id: "self", label: "나 자신" },
  { id: "health", label: "건강" },
  { id: "etc", label: "기타" },
] as const;

export default function Interests() {
  const picked = useDraft((s) => s.interests);
  const other = useDraft((s) => s.interestOther);
  const set = useDraft((s) => s.set);

  const etcOn = picked.includes("etc");
  const otherTrimmed = other.trim();
  // 기타를 켠 채 비워 두면 잠긴다 (06-b.md)
  const ready = picked.length > 0 && (!etcOn || otherTrimmed.length > 0);

  const toggle = (id: string) => {
    if (picked.includes(id)) {
      set(
        "interests",
        picked.filter((x) => x !== id),
      );
      // 기타를 끄면 적던 값도 함께 비운다 — 꺼진 답을 초안에 남기지 않는다
      if (id === "etc") set("interestOther", "");
      return;
    }
    // 넷째부터는 눌러도 켜지지 않는다 — 경고를 미리 띄우지 않는다 (06.md · 06-c.md)
    if (picked.length >= MAX) return;
    set("interests", [...picked, id]);
  };

  /**
   * 기타 값 확정 — 키보드 완료 · 입력 줄 밖 탭(blur) · `[다음]` 세 경로가
   * 전부 여기를 지난다. 공백뿐이면 확정하지 않고 기타 선택을 취소한다 —
   * 빈 칩을 만들지 않는다(`06-c.md`).
   */
  const commitOther = () => {
    if (otherTrimmed.length === 0) {
      set(
        "interests",
        picked.filter((x) => x !== "etc"),
      );
      set("interestOther", "");
      return;
    }
    set("interestOther", otherTrimmed);
  };

  const goNext = () => {
    if (etcOn) commitOther();
    router.push("/rest");
  };

  return (
    <ScreenBackground>
      <OnboardingTopBar step={2} onBack={() => router.back()} />

      <ChatLayout>
        <Avatar />
        <BabaBubble index={0}>요즘 마음이 가장 자주 머무는 곳은 어디인가요?</BabaBubble>
        <BabaBubble index={1}>
          관심 있는 이야기를 골라주시면, 당신의 하루와 가까운 질문을 건넬게요.
        </BabaBubble>
      </ChatLayout>

      <View style={styles.bottom}>
        <ChipFlow items={ITEMS} selected={picked} onToggle={toggle} />

        {etcOn ? (
          <OtherRow
            value={other}
            onChangeText={(v) => set("interestOther", v)}
            onCommit={commitOther}
          />
        ) : null}

        {/* 기타를 켠 채 비어 있을 때만 붙는 한 줄 경고 — 모달이 아니고 입력을 막지 않는다 */}
        {etcOn && otherTrimmed.length === 0 ? (
          <View style={styles.warn}>
            <AppText tone="accent" style={styles.warnText}>
              기타에 무엇을 적을지 알려주세요.
            </AppText>
          </View>
        ) : null}

        <AppText variant="caption" tone="legal">
          {hintOf(picked.length, etcOn, otherTrimmed.length > 0)}
        </AppText>

        <AppButton label="다음" disabled={!ready} onPress={goNext} />
      </View>
    </ScreenBackground>
  );
}

/**
 * 안내는 몇 개를 골랐는지 **사실만** 말한다(`06-c.md`) — "3개까지예요" 같은
 * 제한 경고를 미리 띄우지 않는다. 기타 입력 중에는 확정 방법을 말한다.
 * 선택 후 문구는 `07` 과 같은 형식("N개 선택됨 · …")이다.
 */
function hintOf(count: number, etcOn: boolean, etcFilled: boolean) {
  if (count === 0) return "하나 이상 골라주세요";
  if (etcOn && etcFilled) return `${count}개 선택됨 · 완료를 누르면 칩이 됩니다`;
  return `${count}개 선택됨 · 다시 누르면 취소돼요`;
}

/**
 * `.othr` — 기타 인라인 입력 줄. 밑줄만 강조한다 — 칩 줄 안에 사각 입력칸을
 * 넣으면 칩과 같은 것으로 읽힌다(`06-b.md`). 12자 상한 · 카운터 · 값이 있을 때
 * 지우기 ×(시각 19 · 히트 44).
 */
function OtherRow({
  value,
  onChangeText,
  onCommit,
}: {
  value: string;
  onChangeText: (v: string) => void;
  onCommit: () => void;
}) {
  const atLimit = value.length >= otherRow.maxLength;

  return (
    <View style={styles.othr}>
      <AppText tone="caption" style={styles.othLabel}>
        기타
      </AppText>
      <View style={styles.othField}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="직접 입력"
          placeholderTextColor={semantic.textSlogan}
          maxLength={otherRow.maxLength}
          returnKeyType="done"
          onSubmitEditing={onCommit}
          onBlur={onCommit}
          selectionColor={semantic.accentFill}
          style={styles.othInput}
        />
        <AppText
          variant="footnote"
          // 상한 도달은 색만 바뀐다 (06-c.md)
          tone={atLimit ? "accent" : "caption"}
          style={styles.othCounter}
        >
          {`${value.length}/${otherRow.maxLength}`}
        </AppText>
        {value.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="기타 지우기"
            hitSlop={clearButton.hitSlop}
            onPress={() => onChangeText("")}
            style={styles.othClear}
          >
            <AppText tone="body" style={styles.othClearMark}>
              ×
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const { semantic } = theme.colors;

const styles = StyleSheet.create({
  // 칩 → (기타 줄) → (경고) → 안내 → 버튼. 시안 간격 11
  bottom: { gap: 11 },
  othr: { flexDirection: "row", alignItems: "center", gap: otherRow.gap },
  othLabel: { fontSize: otherRow.labelSize, lineHeight: otherRow.labelSize },
  othField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: otherRow.field.gap,
    minHeight: otherRow.field.minHeight,
    paddingHorizontal: otherRow.field.paddingHorizontal,
    backgroundColor: semantic.surface,
    borderTopLeftRadius: otherRow.field.radiusTop,
    borderTopRightRadius: otherRow.field.radiusTop,
    borderBottomWidth: otherRow.field.underline,
    borderBottomColor: semantic.accentFill, // primaryDeep 밑줄 (.othf)
  },
  othInput: {
    flex: 1,
    fontFamily: "Pretendard-Medium",
    fontSize: otherRow.fontSize,
    color: semantic.textPrimary,
    padding: 0,
  },
  othCounter: { fontVariant: ["tabular-nums"] },
  othClear: {
    width: clearButton.size,
    height: clearButton.size,
    borderRadius: clearButton.size / 2,
    backgroundColor: clearButton.background,
    alignItems: "center",
    justifyContent: "center",
  },
  othClearMark: { fontSize: 12, lineHeight: 14 },
  warn: {
    borderRadius: warnRow.radius,
    paddingVertical: warnRow.paddingVertical,
    paddingHorizontal: warnRow.paddingHorizontal,
    backgroundColor: warnRow.background,
  },
  warnText: { fontSize: warnRow.fontSize, lineHeight: warnRow.fontSize * 1.55 },
});
