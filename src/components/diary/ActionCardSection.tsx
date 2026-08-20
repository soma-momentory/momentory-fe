import { StyleSheet, View } from "react-native";

import { Button, Card, Icon, Modal, Text, TextField } from "@/components/ds";
import { label as labelColor, space, status } from "@/design/ds";
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
 * ## 3세대 DS (2026-08-20)
 *
 * 라벨-값 블록의 짜임(`design.md` §8 · `Diary.dc.html` ④-d2)을 따랐다.
 * 되돌리기 확인은 그 자리에 열리던 카드에서 **`Modal`** 로 바뀌었다 —
 * 되돌릴 수 없는 행동의 확인은 모달이 맡는다(`PLAN.md` A-2 N2). 오류를 모달로
 * 띄우지 않는다는 `RULES.md` 규칙은 그대로 살아 있다.
 *
 * ⚠ 그 모달은 **이 컴포넌트가 그리지 않는다** — `UndoActionConfirm` 을 화면이
 * 스크롤 **밖**에 놓는다. 오버레이는 스스로 절대 배치되므로 스크롤 안에 두면
 * 화면이 아니라 **콘텐츠 높이**를 덮어 보이지 않는 곳에 뜬다. 문안은 여기 남는다.
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
  onSetReflection?: (cardId: string, text: string) => void;
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
          <>
            {/* 채워진 상태 + 해본 날짜. 실행 횟수를 세지 않는다 */}
            <Button
              label={`해봤어요 · ${card.doneAt == null ? "" : formatKoreanDateShort(card.doneAt.slice(0, 10))}`}
              variant="outlined"
              fill
              leading={<Icon name="circle-check" size={20} color={status.positive} />}
              accessibilityLabel="해봤어요 되돌리기"
              disabled={readOnly}
              onPress={() => onRequestUndo?.(card.id)}
            />

            {/* 느낀 점은 **선택**이다 — 완료한 뒤에야 자리가 열린다 */}
            {readOnly && (card.reflection ?? "").length === 0 ? null : (
              <TextField
                fieldLabel="느낀 점"
                accessibilityLabel="느낀 점"
                value={card.reflection ?? ""}
                onChangeText={(t) => onSetReflection?.(card.id, t)}
                editable={!readOnly}
                placeholder="한 줄 남겨도 좋아요"
                multiline
              />
            )}

            <Text variant="caption1" color={labelColor.alternative}>
              {`${formatKoreanDateShort(diaryDate)} 회고에서 만들어졌어요`}
            </Text>
          </>
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

/**
 * 되돌리기 확인 — **되돌릴 때만 묻는다.** 완료 기록과 느낀 점이 함께 사라지므로
 * 잃는 것이 있고, 잃는 것이 있을 때만 모달을 쓴다(`components/ds/Modal`).
 *
 * 화면이 **스크롤 밖에서** 그린다 — 위 주석 참조.
 */
export function UndoActionConfirm({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      title="해본 기록을 지울까요?"
      description="해본 날짜와 느낀 점이 함께 지워져요."
      cancelLabel="그대로 두기"
      confirmLabel="지우기"
      destructive
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
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
});
