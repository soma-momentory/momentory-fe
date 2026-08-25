import { StyleSheet, View } from "react-native";

import { Button, Card, Icon, Text, TextField } from "@/components/ds";
import { label as labelColor, line, space, status } from "@/design/ds";
import type { ActionCard } from "@/features/diary/model/diary";
import { formatKoreanDateShort } from "@/lib/day";

/**
 * `A3` 행동 카드 + `A3-c` 해본 뒤 — **그 일기 아래**에 붙고 따로 목록을 만들지 않는다.
 *
 * `A3-c` 는 별도 화면이 아니라 **행동 카드가 완료된 상태**다 — 버튼이 채워지고
 * 해본 날짜가 붙으며 느낀 점 한 줄이 자리에 들어온다. **빈 줄로 미리 열어두지
 * 않는다**: 쓰지 않은 칸이 먼저 보이면 안 한 일이 된다.
 *
 * - **`[해봤어요]` 는 토글이 아니라 버튼**이다 — 필요한 것은 "했다"는 사실 하나다
 * - **되돌릴 때만 확인을 묻는다** — 완료 기록과 느낀 점이 함께 지워지므로
 * - **실행 횟수·연속 일수를 세지 않는다**
 *
 * ⚠ **일기 상세(`A3`)는 이 카드를 `readOnly` 로 그린다**(2026-08-20) — 조작(해봤어요·
 * 되돌리기·느낀점)은 **쉼터**에서 한다. 아래 조작 경로(`onMarkDone` 등)와 되돌리기 확인은
 * 쉼터 등 조작 화면이 쓰는 것이고, 상세에서는 상태만 보여준다. 되돌리기 확인 모달은
 * **화면 쪽**에서 그린다(이 컴포넌트가 그리지 않는다) — 완료 기록·느낀 점이 함께 지워지는
 * 되돌릴 수 없는 행동이라 모달을 쓴다(`PLAN.md` A-2 N2 · 오류 모달 금지 규칙은 그대로).
 *
 * 라벨 문안은 스펙 그대로 「목표 행동」이다 — 시안의 「제안된 행동」은 쉼터 카드의
 * 말이다(`C6-b.md` · 문안은 `docs/spec` 우선).
 */
type Props = {
  card: ActionCard;
  /** 카드가 만들어진 회고의 날짜 — 「7월 27일 회고에서 만들어졌어요」 */
  diaryDate: string;
  onMarkDone?: (cardId: string) => void;
  /** 되돌리기는 **묻고 나서** 실행된다 — 확인은 화면이 그린다 */
  onRequestUndo?: (cardId: string) => void;
  /** 매 글자 — 로컬만 바꾼다(입력칸을 비춘다) */
  onSetReflection?: (cardId: string, text: string) => void;
  /** 포커스가 빠질 때 — 그때 서버에 커밋한다(매 글자 보내지 않게) */
  onCommitReflection?: (cardId: string) => void;
  /**
   * 읽기 전용 — 서버에서 불러온(store 에 없는) 카드일 때. 「해봤어요」·되돌리기·느낀
   * 점 편집이 store 를 바꾸는데 서버 카드는 그 대상이 아니라, 상호작용을 닫아 둔다.
   * done/reflection 쓰기 경로가 붙으면 풀린다.
   */
  readOnly?: boolean;
};

export function ActionCardSection({
  card,
  diaryDate,
  onMarkDone,
  onRequestUndo,
  onSetReflection,
  onCommitReflection,
  readOnly = false,
}: Props) {
  return (
    <View style={styles.section}>
      <Text variant="label1" color={labelColor.neutral} style={styles.sectionLabel}>
        이 일기의 행동 카드
      </Text>

      <Card padding="loose" style={styles.card}>
        <Field label="상황" value={card.situation} />
        <Field label="목표 행동" value={card.targetAction} />

        {card.done ? (
          readOnly ? (
            // `A3-c` 읽기 — 해본 뒤의 기록. 상세는 **읽는 곳**이라 「해봤어요」 버튼·느낀
            // 점 입력칸을 두지 않는다(조작은 쉼터에서 한다). 대신 목표 행동 아래 구분선을
            // 긋고, 「날짜 - 느낀 점」 한 줄로 보여준다(느낀 점이 없으면 날짜만).
            <>
              <View style={styles.record}>
                <Text variant="label2" color={labelColor.alternative}>
                  기록
                </Text>
                {/* 「날짜 - 느낀 점」 한 줄 — 느낀 점이 없으면 날짜만 남는다.
                    날짜·느낀 점 모두 손글씨(일기 본문과 같은 결)로 적는다 */}
                <Text variant="body1ReadingHand" color={labelColor.normal}>
                  {[
                    card.doneAt == null ? null : formatKoreanDateShort(card.doneAt.slice(0, 10)),
                    (card.reflection ?? "").length > 0 ? card.reflection : null,
                  ]
                    .filter(Boolean)
                    .join(" - ")}
                </Text>
              </View>

              <Text variant="caption1" color={labelColor.alternative}>
                {`${formatKoreanDateShort(diaryDate)} 회고에서 만들어졌어요`}
              </Text>
            </>
          ) : (
            <>
              {/* 채워진 상태 + 해본 날짜. 실행 횟수를 세지 않는다 */}
              <Button
                label={`해봤어요 · ${card.doneAt == null ? "" : formatKoreanDateShort(card.doneAt.slice(0, 10))}`}
                variant="outlined"
                fill
                leading={<Icon name="circle-check" size={20} color={status.positive} />}
                accessibilityLabel="해봤어요 되돌리기"
                onPress={() => onRequestUndo?.(card.id)}
              />

              {/* 느낀 점은 **선택**이다 — 완료한 뒤에야 자리가 열린다 */}
              <TextField
                fieldLabel="느낀 점"
                accessibilityLabel="느낀 점"
                value={card.reflection ?? ""}
                onChangeText={(t) => onSetReflection?.(card.id, t)}
                onBlur={() => onCommitReflection?.(card.id)}
                placeholder="한 줄 남겨도 좋아요"
                multiline
              />

              <Text variant="caption1" color={labelColor.alternative}>
                {`${formatKoreanDateShort(diaryDate)} 회고에서 만들어졌어요`}
              </Text>
            </>
          )
        ) : (
          <>
            {/* 서버 카드(읽기 전용)는 아직 「해봤어요」를 눌러도 저장할 곳이 없어 버튼을 닫는다 */}
            {readOnly ? null : (
              <Button label="해봤어요" fill onPress={() => onMarkDone?.(card.id)} />
            )}
            <Text variant="caption1" color={labelColor.alternative}>
              {readOnly
                ? `${formatKoreanDateShort(diaryDate)} 회고에서 만들어졌어요`
                : `${formatKoreanDateShort(diaryDate)} 회고에서 만들어졌어요 · 해본 뒤에 한 줄 남길 수 있어요`}
            </Text>
          </>
        )}
      </Card>
    </View>
  );
}

/** 라벨이 값 위에 선다 — 카드 안에서 역할과 내용이 두 줄로 갈린다(`Diary.dc.html` ④-d2) */
function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text variant="label2" color={labelColor.alternative}>
        {label}
      </Text>
      <Text variant="body1" color={labelColor.normal}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.md },
  sectionLabel: { paddingLeft: space.xs },
  card: { gap: space.lg },
  field: { gap: space.xs },
  // 목표 행동 아래 구분선 — 카드 안에 또 하나의 카드를 만들지 않는다(`DESIGN.md` §5)
  record: {
    gap: space.xs,
    paddingTop: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: line.alternative,
  },
});
