import { StyleSheet, View } from "react-native";

import { Card, EmotionDot, InfoBlock, Text } from "@/components/ds";
import { label as labelColor, line, space } from "@/design/ds";
import type { Diary } from "@/features/diary/model/diary";
import { emotionName, type EmotionId } from "@/features/emotion/model/emotion";
import { formatKoreanDateShort } from "@/lib/day";

/**
 * `A3-b` · 바바가 함께 본 오늘 — **회고를 마친 당시의 고정 스냅샷**이다.
 *
 * - **다시 만들기 버튼을 두지 않는다** — 스냅샷이 다시 생성되면 그때의 말이 사라진다.
 *   고정임을 화면이 먼저 말한다
 * - 근거는 **사용자가 실제로 쓴 말만** 인용한다 — 요약해 바꿔 말하지 않는다
 * - 그날의 기록은 감정을 **두 줄로 나눈다** — 「이야기 속 감정」과 「회고 시작
 *   감정」. 한 줄로 합치면 어느 시점의 감정인지 알 수 없다
 *
 * 본문 카드의 짜임은 내 면과 같다(Elevated + hairline · `body1Reading`) —
 * **두 면은 같은 하루의 두 시선**이지 위계가 다른 두 종류의 글이 아니다.
 *
 * ⚠ **캐릭터 그림이 없다**(`PLAN.md` A-2 N8) — 반입 패키지가 일러스트를 전부 뺐다.
 * 이름 「바바」는 회고와 `Diary.babaView` 에 그대로 남는다. 사라지는 것은 그림이다.
 *
 * ⚠ **날씨 아이콘도 없다.** Wanted 세트에 날씨 글리프가 없고 「없는 글리프를
 * 추측하지 않는다」(`DESIGN.md` §10) · 시안의 `☀︎` 는 이모지라 쓰지 않는다
 * (`RULES.md`). 그래서 날씨는 **글자로만** 말한다.
 */
export function DiaryBabaFace({ diary }: { diary: Diary }) {
  return (
    <>
      <Card padding="loose" style={styles.card}>
        <Text variant="body1Reading" color={labelColor.normal}>
          {diary.babaView ?? "이 일기에는 바바가 함께 본 오늘이 없어요."}
        </Text>

        {/* 다시 만들기 버튼을 두지 않는다 — 스냅샷이 다시 생성되면 그때의 말이 사라진다.
            안내문은 카드가 아니다(`DESIGN.md` §8) */}
        <InfoBlock>
          <Text variant="caption1" color={labelColor.neutral}>
            회고를 마친 당시의 대화를 바탕으로 작성됐어요. 이후 수정한 내 문장과 내용이 다를 수
            있어요.
          </Text>
        </InfoBlock>

        <Text variant="caption1" color={labelColor.alternative}>
          {`${formatKoreanDateShort(diary.date)} 회고를 마친 당시 작성된 기록이에요.`}
        </Text>
      </Card>

      {diary.babaViewBasis != null ? (
        <View style={styles.section}>
          <Text variant="label1" color={labelColor.neutral} style={styles.sectionLabel}>
            이 문장을 쓴 근거
          </Text>
          <Card padding="loose">
            {/* 사용자가 실제로 쓴 말만 인용한다 — 요약해 바꿔 말하지 않는다 */}
            <Text variant="body2Reading" color={labelColor.normal}>
              {diary.babaViewBasis}
            </Text>
          </Card>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text variant="label1" color={labelColor.neutral} style={styles.sectionLabel}>
          그날의 기록
        </Text>
        <Card padding="loose" style={styles.record}>
          {/* 감정을 두 줄로 나눈다 — 한 줄로 합치면 어느 시점의 감정인지 알 수 없다 */}
          <RecordRow label="이야기 속 감정" emotion={diary.storyEmotion} />
          <RecordRow label="회고 시작 감정" emotion={diary.startEmotion} divided />
          {diary.weather != null ? (
            // 읽기 전용 표시 — 히트 영역을 넓히지 않는다
            <View style={[styles.row, styles.divided]}>
              <Text variant="body2" color={labelColor.neutral} style={styles.rowLabel}>
                날씨
              </Text>
              <Text variant="body2" color={labelColor.normal}>
                {diary.weather}
              </Text>
            </View>
          ) : null}
        </Card>
      </View>
    </>
  );
}

/** 감정은 **도트 + 이름**이다 — 색만으로 판단하게 하지 않는다(`RULES.md`) */
function RecordRow({
  label,
  emotion,
  divided = false,
}: {
  label: string;
  emotion: EmotionId | null;
  /** 위 줄과 나누는 hairline. 첫 줄에는 두지 않는다 — 카드 테두리와 겹친다 */
  divided?: boolean;
}) {
  return (
    <View style={[styles.row, divided ? styles.divided : null]}>
      <Text variant="body2" color={labelColor.neutral} style={styles.rowLabel}>
        {label}
      </Text>
      {emotion != null ? (
        <View style={styles.value}>
          <EmotionDot id={emotion} />
          <Text variant="body2" color={labelColor.normal}>
            {emotionName(emotion)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md },
  section: { gap: space.md },
  sectionLabel: { paddingLeft: space.xs },

  // 줄 사이를 hairline 으로 나눈다 — 카드 안에 또 카드를 만들지 않는다
  record: { gap: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 40 },
  divided: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: line.alternative },
  rowLabel: { flex: 1, minWidth: 0 },
  value: { flexDirection: "row", alignItems: "center", gap: space.xs },
});
