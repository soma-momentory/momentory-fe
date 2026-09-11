import { Pressable, StyleSheet, View } from "react-native";

import { DiaryEmotionRow } from "@/components/diary/DiaryEmotionRow";
import { EmotionPebble, SelectLift, Text, WeekEmptyDot } from "@/components/ds";
import { label as labelColor, space } from "@/design/ds";
import { emotionName, type EmotionId } from "@/features/emotion/model/emotion";
import type { WeeklyMoodDay } from "@/features/report/model/weeklyReport";
import { koreanWeekday } from "@/lib/day";

/**
 * `W1` · **이번 주의 마음 일곱 칸** — 일요일부터 토요일까지 하루 한 점이다.
 *
 * **막대가 아니라 점**이다(`W1.md`) — 감정에 강도를 입력받지 않으므로 높이로
 * 말할 수 있는 것이 없다. 기록이 없는 날은 색 없이 잔잔한 중립 원으로 자리만
 * 지킨다(`WeekEmptyDot` — 홈과 같은 **테두리 없는** 원) — 빈 칸을 강조하지 않는다.
 *
 * ## 점은 하루 한 개, 감정은 여러 개일 수 있다
 *
 * 예전 줄(`WeekEmotionRow`)은 하루 최대 세 점이었다. 점은 지금도 **하루 하나**이고
 * 시안의 26 그대로다 — 개수에 따라 지름을 줄이던 장치는 없앴다.
 *
 * ⚠ 다만 **하루의 감정이 하나인 것은 아니다**(2026-09-05). 「늦게 일어나서 기분
 * 안좋았는데 라면 먹고 기분 좋아졌어」 같은 하루는 우울함과 행복함이 함께 남는다.
 * 점 하나는 **대표 감정**(BE `DailyMood.emotion`) 색만 맡으므로, 나머지가 보이는
 * 곳은 **눌러서 드러나는 줄**(`WeekMoodReveal`)뿐이다. 홈의 「이번 주 감정」과 같은
 * 규칙이고 같은 컴포넌트(`DiaryEmotionRow`)를 쓴다.
 *
 * ## 감정 이름은 **눌러서** 글자로 확인한다
 *
 * 감정 원색은 배경 대비 1.46~3.31 이라 「이름을 늘 함께 쓴다」(`RULES.md` 「보관함」)가
 * 그 예외를 떠받친다. 이 줄은 시안대로 요일 글자만 두므로, 낭독기가 읽을 이름은 칸마다
 * 붙이고(감정이 여럿이면 **전부** 읽는다) 그 주 최다 감정은 아래 요약 문장이 말로 적는다.
 * **그 위에**, 요청(2026-08-25)으로 한 칸을 누르면 그날 감정을 글자로 드러낸다 —
 * 색만으로 갈리던 하루하루를 눌러 확인할 수 있다.
 * 선택은 색만이 아니라 **칸의 크기(살짝 커진다)와 드러난 글자**로 함께 말한다(색만 금지 규칙 유지 ·
 * `SelectLift` — 조약돌에 둥근 링을 두르면 깨진 테두리로 보여 2026-09-11 에 바꿨다).
 * 기록: `docs/PRODUCT.md` 「상류와 차이」.
 *
 * ## 고른 날은 이 줄이 아니라 카드가 든다
 *
 * ⚠ 드러난 글자는 **점 줄 아래가 아니라 카드 제목 줄 오른쪽**에 선다(2026-09-11 · 사용자
 * 요청 「선택했을 때 위치 안 변하게」). 아래에 한 줄을 새로 세우면 그만큼 구분선과 요약
 * 문장이 밀려 내려갔다. 그래서 이 줄은 **누른 것을 알리기만** 하고(`onSelect`), 그날 감정을
 * 어디에 적을지는 제목 줄을 가진 카드(`WeekMoodCard`)가 정한다.
 */
const DOT_SIZE = 26;

/**
 * 낭독기가 읽을 그날의 감정 — 눈으로 눌러 얻는 것과 같은 값이어야 한다.
 * 감정 없이 끝난 일기는 「기록 있음」이다(보관함 달력 칸과 같은 말 · `archive.tsx`)
 */
const namesOf = (emotions: readonly EmotionId[], written: boolean) => {
  const names = emotions.map(emotionName).filter((n) => n.length > 0);
  if (names.length > 0) return names.join(", ");
  return written ? "기록 있음" : "기록 없음";
};

type Props = {
  days: readonly WeeklyMoodDay[];
  /**
   * 일기가 있는 날(`YYYY-MM-DD`). 서버 칸은 「안 쓴 날」과 「썼는데 감정이 없는 날」을 똑같이
   * `emotion: null` 로 주므로, 둘을 가르는 것은 **로컬 일기 목록**이다 — 뒤쪽이면 빈 조약돌을 세운다
   */
  writtenDates: ReadonlySet<string>;
  /** 고른 날(`YYYY-MM-DD`) — 카드가 들고 있다 */
  selected: string | null;
  /** 칸을 눌렀다 — 같은 칸을 다시 누르면 `null` 로 접는다 */
  onSelect: (date: string | null) => void;
};

export function WeekMoodRow({ days, writtenDates, selected, onSelect }: Props) {
  return (
    <View style={styles.row}>
      {days.map((d) => {
        const weekday = koreanWeekday(d.date);
        const written = writtenDates.has(d.date);
        const names = namesOf(d.emotions, written);
        const isSelected = d.date === selected;

        return (
          <Pressable
            key={d.date}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            // ⚠ 라벨 꼴은 그대로 둔다 — 리포트 테스트가 「일요일 피곤함」 식으로 이걸 찾는다.
            // 감정이 여럿이면 「월요일 평온함, 뿌듯함」처럼 전부 읽는다(눌러 얻는 것과 같다)
            accessibilityLabel={`${weekday}요일 ${names}`}
            // 같은 칸을 다시 누르면 접는다 — 켜고 끄는 자리다
            onPress={() => onSelect(isSelected ? null : d.date)}
            style={styles.col}
          >
            {/* 감정이 있는 날은 **수채 조약돌 한 장**(`EmotionPebble` · 2026-09-11 시안),
                일기는 썼는데 감정이 없는 날은 **빈 조약돌**(테두리만),
                일기가 없는 날은 홈과 같은 테두리 없는 원(`WeekEmptyDot`)이 자리를 지킨다.
                고른 칸은 **살짝 커진다**(`SelectLift`) — 홈과 같은 결이다 */}
            <SelectLift selected={isSelected} size={DOT_SIZE}>
              {d.emotion != null || written ? (
                <EmotionPebble id={d.emotion} size={DOT_SIZE} />
              ) : (
                <WeekEmptyDot size={DOT_SIZE} />
              )}
            </SelectLift>
            <Text
              variant="caption2"
              color={
                isSelected
                  ? labelColor.strong
                  : d.emotion == null && !written
                    ? labelColor.assistive
                    : labelColor.neutral
              }
            >
              {weekday}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * 누른 날의 감정을 글자로 — 색만으로 안 보이던 그날 마음을 **전부** 확인한다.
 * 기록이 없는 날이면 「기록 없음」으로 솔직히 말한다.
 *
 * 카드 **제목 줄 오른쪽**에 선다(⚠ 위 「고른 날은 이 줄이 아니라 카드가 든다」). 줄 높이는
 * 제목(26)이 정하고 이 묶음은 18 이라 가운데로 따로 선다 — 들어와도 카드가 흔들리지 않는다.
 */
export function WeekMoodReveal({ day, written }: { day: WeeklyMoodDay; written: boolean }) {
  return (
    <View style={styles.reveal}>
      <Text variant="label2" color={labelColor.neutral}>
        {`${koreanWeekday(day.date)}요일 ·`}
      </Text>
      {day.emotions.length > 0 ? (
        <DiaryEmotionRow emotions={day.emotions} align="flex-end" />
      ) : (
        <Text variant="label2" color={labelColor.assistive}>
          {namesOf(day.emotions, written)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.xs, alignItems: "flex-start" },
  col: { flex: 1, minWidth: 0, alignItems: "center", gap: space.sm },
  // 제목 줄 오른쪽 — 남는 폭만 쓰고(줄어들 수 있다) 오른쪽 끝에 붙는다
  reveal: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: space.sm,
    flexShrink: 1,
    alignSelf: "center",
  },
});
