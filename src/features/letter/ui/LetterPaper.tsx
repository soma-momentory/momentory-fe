import { useState, type ReactNode } from "react";
import { Linking, Pressable, StyleSheet, View, type TextLayoutLine } from "react-native";

import { Chip, Spinner, Text } from "@/components/ds";
import { Baba } from "@/components/onboarding/OnboardingParts";
import {
  cardPadding,
  chatChoiceSelected,
  iosVariant,
  label as labelColor,
  line,
  primary,
  radius,
  space,
  type TextToken,
} from "@/design/ds";
import { diaryMemo } from "@/design/ds/diaryMemo";
import { letterPaper } from "@/design/ds/letterPaper";
import type { Letter } from "@/features/letter/data/letterApi";
import {
  helplineParts,
  keepWords,
  receivedLabel,
  type WhenChoice,
} from "@/features/letter/model/letter";

/**
 * 편지 한 통(PRD 4-2) — 표시 전용이다. 고르기 · 저장은 화면(`app/letter/[date].tsx`)이 한다.
 *
 * **종이 한 장에 다 담는다**(2026-10-27 사용자 요청 · 프로토 `proto-v2.html` 순서) — 읽는 부분(받는 사람 ·
 * 어제 한 말 · 관점) → 점선 → 고르는 부분(작은 일 · 언제) → 오늘 밤 질문 예고 → 맨 끝 「바바가」 서명.
 * 고르는 부분을 종이 밖에 두었더니 편지가 짧게 끊겨 보였다. 작은 일은 처음부터 펼쳐 둔다.
 * 편지 글 · 질문 예고는 손글씨, 고르는 줄과 칩은 앱 글꼴이다.
 *
 * 종이는 **결 없는 한 색 + 옅은 밑줄**이다(2026-10-27 사용자 결정 · 프로토 `proto-v2.html` 의 편지지).
 * 처음엔 일기 확인(`C6`)의 수채화지 결 · 찢긴 테이프를 썼는데 긴 글 뒤에서 자글자글해 보였다.
 * 밑줄은 손글씨가 **실제로 그려진 줄**(`onTextLayout`)마다 긋는다 — 줄 높이를 계산해 깔면 글자 크기를
 * 키운 폰에서 글과 줄이 어긋난다.
 *
 * 고르는 부분은 **새 편지(받은 날 · 그다음 날)에만** 연다 — 지난 편지에서 「오늘 해 볼 일」을
 * 고르게 하지 않는다. 지난 편지는 그날 고른 일만 한 줄로 남긴다.
 */
type Props = {
  letter: Letter;
  nickname: string;
  choices: readonly WhenChoice[];
  /** 저장 중 — 두 번 누르지 않게 고르는 줄을 잠근다 */
  saving: boolean;
  /** 저장하지 못했을 때의 한 줄 */
  error: string | null;
  onPickAction: (position: number) => void;
  onPickWhen: (choice: WhenChoice) => void;
};

export function LetterPaper({
  letter,
  nickname,
  choices,
  saving,
  error,
  onPickAction,
  onPickWhen,
}: Props) {
  const quiet = letter.status === "QUIET";
  const chosen = letter.actions.find((a) => a.chosen) ?? null;
  const hand = iosVariant("body1ReadingHand", "body1ReadingHandLg");

  const tonight =
    chosen != null
      ? `오늘 밤엔 「${chosen.title}」 해 봤는지부터 물어볼게요.`
      : letter.tonightQuestion;
  const greeting = nickname.length > 0 ? `${nickname}님에게,` : "안녕하세요,";

  return (
    <View style={styles.paper}>
      {/* 받은 날 — 편지 맨 위 한 줄. 처음엔 캡션(12)이었는데 작아 한 단 키웠다(2026-10-27 사용자 요청) */}
      <Text variant="label1" color={labelColor.alternative}>
        {receivedLabel(letter.date)}
      </Text>
      {/* 어제 한 말은 **누구의 말인지 문장으로** 드러낸다 — 인용만 덩그러니 두면 바바의 말로 읽혔다
          (2026-10-27 사용자 피드백 · 프로토의 「어제 「…」라고 남겼죠」 문장) */}
      <Lined variant={hand} testID="letter-body">
        {keepWords(greeting)}
        {letter.quote != null ? (
          <>
            {/* 인용이 「어제 …」로 시작하면 앞의 「어제」를 빼서 「어제 「어제 …」」로 겹치지 않게 한다 */}
            {/^\s*어제/.test(letter.quote) ? "\n" : `\n${keepWords("어제")} `}
            <Text variant={hand} color={labelColor.strong} style={styles.mark}>
              {keepWords(`「${letter.quote}」`)}
            </Text>
            {keepWords("라고 남겼죠.")}
          </>
        ) : null}
        {`\n${keepWords(letter.insight)}`}
      </Lined>
      {/* 번호는 눌러서 바로 건다 — 위기 날 편지에서 번호를 다시 입력하게 하지 않는다 */}
      {letter.helplines.map((helpline) => (
        <Text key={helpline} variant="body2" color={labelColor.strong}>
          {helplineParts(helpline).map((part, i) =>
            part.tel ? (
              <Text
                key={i}
                variant="body2"
                color={labelColor.strong}
                style={styles.tel}
                accessibilityRole="link"
                accessibilityLabel={`${part.text} 전화 걸기`}
                testID="letter-helpline-tel"
                onPress={() => void Linking.openURL(`tel:${part.text}`)}
              >
                {part.text}
              </Text>
            ) : (
              part.text
            ),
          )}
        </Text>
      ))}

      {quiet ? null : letter.isNew ? (
        <>
          {letter.actions.length > 0 ? (
            <View style={styles.choose}>
              <Lined variant={hand}>{keepWords("오늘 해 볼 작은 일 하나 고를래요?")}</Lined>
              {letter.actions.map((action) => {
                const on = action.chosen;
                return (
                  <Pressable
                    key={action.position}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on, disabled: saving }}
                    disabled={saving}
                    onPress={() => onPickAction(action.position)}
                    style={[styles.action, on && styles.actionOn]}
                  >
                    <View style={[styles.check, on && styles.checkOn]} />
                    <Text
                      variant="body2"
                      color={on ? labelColor.strong : labelColor.normal}
                      style={styles.actionText}
                    >
                      {keepWords(action.title)}
                    </Text>
                  </Pressable>
                );
              })}
              {chosen != null ? (
                <>
                  {/* 바바의 질문이라 위 「오늘 해 볼 작은 일 …」과 같은 손글씨 + 밑줄로 묻는다(2026-10-27) */}
                  <View style={styles.when}>
                    <Lined variant={hand}>{keepWords("언제 할 거예요?")}</Lined>
                  </View>
                  <View style={styles.chips}>
                    {choices.map((choice) => (
                      <Chip
                        key={choice.label}
                        label={choice.label}
                        selected={chosen.whenLabel === choice.label}
                        disabled={saving}
                        onPress={() => onPickWhen(choice)}
                      />
                    ))}
                  </View>
                  {chosen.remindAt != null && chosen.whenLabel != null ? (
                    <Text variant="label2" color={labelColor.alternative}>
                      {`${chosen.whenLabel}에 한 번 알려 드릴게요`}
                    </Text>
                  ) : null}
                </>
              ) : null}
              {saving ? <Spinner /> : null}
              {error != null ? (
                <Text variant="caption1" color={labelColor.alternative}>
                  {error}
                </Text>
              ) : null}
            </View>
          ) : null}
          {tonight != null ? <Lined variant={hand}>{keepWords(tonight)}</Lined> : null}
        </>
      ) : chosen != null ? (
        <Lined variant={hand}>{keepWords(`그날 고른 일: ${chosen.title}`)}</Lined>
      ) : null}

      <View style={styles.sign}>
        <Baba size={36} />
        <Text variant={hand} color={labelColor.strong}>
          바바가
        </Text>
      </View>
    </View>
  );
}

/**
 * 편지지 밑줄 — 안의 글이 그려진 줄마다 그 아래에 옅은 선을 긋는다. 글은 한 덩어리(`Text` 하나)여야
 * 줄 위치를 한 번에 받는다. `maxLines` 를 주면 그 줄까지만 보이고 밑줄도 그만큼만 긋는다(일기 상세의 미리보기).
 */
export function Lined({
  variant,
  maxLines,
  testID,
  children,
}: {
  variant: TextToken;
  maxLines?: number;
  testID?: string;
  children: ReactNode;
}) {
  const [lines, setLines] = useState<readonly TextLayoutLine[]>([]);
  return (
    <View>
      {lines.slice(0, maxLines).map((l, i) => (
        <View
          key={i}
          testID="letter-rule"
          pointerEvents="none"
          style={[styles.rule, { top: l.y + l.height - 1 }]}
        />
      ))}
      <Text
        variant={variant}
        color={labelColor.normal}
        testID={testID}
        numberOfLines={maxLines}
        onTextLayout={(e) => setLines(e.nativeEvent.lines)}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  paper: {
    backgroundColor: letterPaper.paper,
    borderRadius: radius.large,
    // 종이 색이 화면 바탕과 거의 같아 외곽선으로 한 장을 가른다(2026-10-27 사용자 요청)
    borderWidth: 1,
    borderColor: line.neutral,
    boxShadow: diaryMemo.paperShadow,
    paddingTop: space.lg,
    paddingHorizontal: cardPadding.loose,
    paddingBottom: space.lg,
    gap: space.md,
  },
  // 편지지 밑줄 — 글 줄의 바닥에 옅게
  rule: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: line.alternative },
  // 형광펜 — 어제 한 말은 사용자의 말 그대로라 표시해 둔다
  mark: { backgroundColor: letterPaper.highlight },
  tel: { textDecorationLine: "underline" },
  sign: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: space.xs,
  },
  // 읽는 부분과 고르는 부분 사이 — 같은 종이 위의 점선. 아래도 한 줄 그어 고르는 자리를 닫는다
  // (프로토 `.tasks` 의 아래 점선) — 안 닫으면 칩 바로 밑의 「오늘 밤엔」 손글씨가 고르는 부분에 붙어 읽힌다
  choose: {
    gap: space.sm,
    borderTopWidth: letterPaper.foldWidth,
    borderBottomWidth: letterPaper.foldWidth,
    borderStyle: "dashed",
    borderColor: line.neutral,
    paddingVertical: space.md,
  },
  when: { marginTop: space.xs },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderWidth: 1,
    borderColor: line.neutral,
    borderRadius: radius.medium,
    padding: space.md,
  },
  // 선택은 바로 아래 「언제」 칩(`Chip` 선택)과 같은 말로 한다 — 초록 2px 테두리 · 옅은 초록 면 ·
  // 채운 동그라미 · 짙은 글자. 색만으로 말하지 않게 두께와 동그라미가 함께 바뀐다.
  // 글자 크기는 바꾸지 않는다 — 앱 글꼴이 손글씨 한 벌이라 굵기 단을 바꾸면 굵어지지 않고 작아지기만 했다.
  // 테두리가 1 두꺼워지는 만큼 안쪽 여백을 1 줄여 글이 밀리지 않게 한다
  actionOn: {
    borderWidth: 2,
    borderColor: primary.normal,
    backgroundColor: chatChoiceSelected.surface,
    padding: space.md - 1,
  },
  check: {
    width: letterPaper.check,
    height: letterPaper.check,
    borderRadius: letterPaper.check / 2,
    borderWidth: 2,
    borderColor: line.normal,
  },
  checkOn: { borderWidth: 6, borderColor: primary.normal },
  actionText: { flex: 1 },
  // 칩 사이 간격은 `DESIGN.md` §9 의 8
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});

/** 편지 종이 · 형광펜 — 일기 상세의 미리보기(`LetterPreviewCard`)가 같은 종이를 쓴다 */
export const letterPaperStyle = { paper: styles.paper, mark: styles.mark };
