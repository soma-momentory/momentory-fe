import { Pressable, StyleSheet, View } from "react-native";

import { DiaryEmotionRow } from "@/components/diary/DiaryEmotionRow";
import { EmotionPebble, SelectLift, Text, WeekEmptyDot } from "@/components/ds";
import { cardPadding, label as labelColor, space } from "@/design/ds";
import { emotionName, type EmotionId } from "@/features/emotion/model/emotion";
import type { WeeklyMoodDay } from "@/features/report/model/weeklyReport";
import { koreanWeekday } from "@/lib/day";

import { WeekGround } from "./WeekGround";

/**
 * `W1` · 「**이번 주 감정들**」 — 일요일부터 토요일까지, 하루의 감정을 **쌓아 올린다**
 * (2026-09-12 · 사용자 시안).
 *
 * ## 점 하나에서 쌓이는 조약돌로
 *
 * 전에는 하루가 **점 하나**였고(`WeekMoodRow` — 이 파일이 대신한다) 대표 감정 색만
 * 맡았다. 그런데 하루의 감정은 하나가 아니다 — 「늦게 일어나서 기분 안좋았는데 라면
 * 먹고 기분 좋아졌어」 같은 하루는 우울함과 행복함이 함께 남는다. 점 하나뿐이던
 * 동안에는 나머지가 **눌러야만** 보였다.
 *
 * 이제 그날 감정이 **전부 자리를 차지한다**: 바닥에 **대표 감정**이 놓이고 나머지가
 * 그 위로 차례대로 쌓인다. 높이가 곧 「그날 마음이 몇 갈래였나」다.
 *
 * ⚠ **높이는 강도가 아니다.** 감정에 세기를 입력받지 않으므로(`W1.md` 「막대가 아니라
 * 점」) 이 높이가 말하는 것은 **감정의 가짓수**뿐이고, 조약돌 한 장은 어느 자리에 있든
 * 똑같이 한 감정이다. 막대(면)가 아니라 **낱장이 쌓인 더미**로 그리는 이유이기도 하다.
 *
 * ## 간격은 **누른 상태**가 정한다
 *
 * 사이는 2 다. 이 값은 가만히 있을 때가 아니라 **눌렀을 때를 보고** 잡았다
 * (2026-09-12 · 사용자 확인 「눌렀을 때 아주 약간 겹칠 정도로」) — 고른 칸은 조약돌이
 * 18% 커지므로(`SelectLift`) 위아래가 서로를 향해 2 남짓씩 다가온다. 사이가 2 면 그때
 * **겨우 맞물릴 만큼**만 겹치고, 손을 떼면 다시 떨어진다.
 *
 * ⚠ **준 값보다 벌어져 보인다** — 조약돌 그림이 제 상자를 꽉 채우지 않아서(수채 자국
 * 둘레에 여백이 조금 있다) 그 여백이 사이 값에 양쪽으로 더해진다. 실기기에서 옮겨 잡은
 * 자취(사이 → 눈에 보이는 틈): 4 → 6 「흩어져 보인다」 · 0 → 2 「붙어 있다」 ·
 * 4 물림 → 0 「너무 붙었어」. 값을 고칠 일이 있으면 **기기에서 눌러 보고** 정한다.
 *
 * ## 땅이 있다
 *
 * 일곱 칸을 가로지르는 **모래 언덕 두 겹**이 조약돌이 놓인 바닥이다(`WeekGround` ·
 * 2026-09-12 사용자 시안 그림). 칸마다 따로 두지 않는다 — 한 덩이로 이어져야 일곱 더미가
 * **같은 땅 위**에 선 것으로 읽히고, 높이도 서로 견줄 수 있다.
 *
 * ⚠ **갈색 언덕 한 겹을 거쳐 왔다**(2026-09-12 · 「별로다」) — 짙은 띠가 조약돌보다 먼저
 * 눈에 들어왔다. 지금 것은 배경과 같은 온도의 **모래색 두 겹**이라 뒤로 물러난다.
 *
 * 자리는 **세 장 높이**로 미리 잡아 둔다. 감정이 하루 한둘인 주에도 판이 같은 크기로 서서,
 * 주를 넘길 때마다 카드가 늘었다 줄었다 하지 않는다. 세 장보다 높이 쌓인 날이 있으면
 * **그 주의 가장 높은 더미에 맞춰 판을 키운다** — 쌓인 것을 잘라내지 않는다.
 *
 * ⚠ 시안은 **네 장**이었다(「총 높이 4배 길이」). 기기에서 보니 하루 감정이 한둘인 주가
 * 대부분이라 판 위쪽이 통째로 비어 보여서, 사용자 결정(2026-09-12)으로 한 장을 덜어냈다 —
 * 높이 고정이 주는 것(주를 넘겨도 안 출렁인다)은 그대로 두고 빈자리만 줄인 값이다.
 *
 * ## 눌러도 다른 화면으로 가지 않는다
 *
 * 칸을 누르면 **그날 감정이 글자로** 카드 제목 줄 오른쪽에 선다(`WeekMoodReveal`).
 * 조약돌 색만으로는 무슨 감정인지 가릴 수 없어서(감정 원색 대비 1.46~3.31 ·
 * `RULES.md` 「이름을 늘 함께 쓴다」) 이름을 확인할 자리가 이 화면 안에 있어야 한다 —
 * 그날 일기로 넘겨보내면 이름을 보러 갈 때마다 리포트를 떠나게 된다(2026-09-12 결정).
 * 선택은 색만이 아니라 **칸의 크기(살짝 커진다)와 드러난 글자**로 함께 말한다.
 */
const PEBBLE_SIZE = 26;

/**
 * 땅이 더미 바닥 **위로 올라오는 깊이** — 조약돌이 모래에 살짝 파묻히는 만큼이다
 * (2026-09-12 · 실기기 확인 뒤 사용자 요청 「조약돌이 위로 오게 조금 겹치게」).
 *
 * 가는 선이던 시절에는 반대로 **조금 내려** 두었다(닿으면 받침대처럼 보였다). 땅이 면이 된
 * 지금은 겹쳐야 조약돌이 **그 위에 놓인 것**이 아니라 **그 땅의 것**으로 보인다.
 * 8 로 시작해 **12** 까지 내렸다(2026-09-12 · 실기기 확인 「좀 더 내려줘」).
 *
 * ⚠ 겹치려면 **그리는 순서**가 함께 바뀌어야 한다 — 땅을 조약돌보다 **먼저** 그린다.
 * 나중에 그리면 언덕이 조약돌 아랫부분을 덮어, 파묻힌 것이 아니라 잘린 것으로 보인다.
 */
const GROUND_OVERLAP = space.md;

/**
 * 땅이 **카드 밖으로 번지는 폭** — 카드 안쪽 여백만큼 좌우로 넘겨 **카드 끝과 끝에 붙인다**
 * (2026-09-12 · 사용자 요청). 언덕이 여백 안에서 끝나면 카드 위에 놓인 **조각 그림**으로
 * 보이는데, 끝까지 이으면 카드가 곧 그 땅이 된다.
 *
 * ⚠ 이 값은 **이 더미가 `padding="loose"` 카드 안에 있다는 전제**다(`WeekEmotionCard`).
 * 카드 여백이 달라지면 여기도 함께 봐야 해서 `Card` 와 같은 토큰(`cardPadding`)을 본다.
 * 언덕이 서는 자리는 카드 세로 한가운데라 둥근 모서리와 부딪히지 않는다.
 */
const GROUND_BLEED = cardPadding.loose;

/** 판의 기본 높이 — 조약돌 **세 장**이 쌓일 자리를 늘 비워 둔다(위 머리말) */
const PLOT_ROWS = 3;

/** 쌓인 조약돌 사이 — 누른 칸이 「아주 약간 겹칠」 만큼만 띄운다(위 머리말) */
const STACK_GAP = space.xs2;

/** 조약돌 `n` 장이 쌓이는 높이 */
const stackHeight = (rows: number) => rows * PEBBLE_SIZE + (rows - 1) * STACK_GAP;

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
   * `emotion: null` 로 주므로, 둘을 가르는 것은 **로컬 일기 목록**이다 — 뒤쪽이면 빈 조약돌을 놓는다
   */
  writtenDates: ReadonlySet<string>;
  /** 고른 날(`YYYY-MM-DD`) — 카드가 들고 있다 */
  selected: string | null;
  /** 칸을 눌렀다 — 같은 칸을 다시 누르면 `null` 로 접는다 */
  onSelect: (date: string | null) => void;
};

export function WeekEmotionStack({ days, writtenDates, selected, onSelect }: Props) {
  // 그 주에서 가장 높은 더미가 판의 높이를 정한다 — 기본 세 장보다 낮은 주는 세 장이다
  const rows = Math.max(PLOT_ROWS, ...days.map((d) => d.emotions.length));
  const plotHeight = stackHeight(rows);

  return (
    <View style={styles.chart}>
      {/* 땅 — 일곱 칸을 **한 덩이로** 가로지른다. 칸 안에 그리면 일곱 토막이 생겨 같은
          바닥으로 읽히지 않는다. **조약돌보다 먼저** 그려 모래에 파묻힌 아래쪽을 내준다 */}
      <View pointerEvents="none" style={[styles.ground, { top: plotHeight - GROUND_OVERLAP }]}>
        <WeekGround />
      </View>

      <View style={styles.row}>
        {days.map((d) => {
          const weekday = koreanWeekday(d.date);
          const written = writtenDates.has(d.date);
          const isSelected = d.date === selected;

          return (
            <Pressable
              key={d.date}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              // ⚠ 라벨 꼴은 그대로 둔다 — 리포트 테스트가 「일요일 피곤함」 식으로 이걸 찾는다.
              // 감정이 여럿이면 「월요일 평온함, 뿌듯함」처럼 전부 읽는다(눌러 얻는 것과 같다)
              accessibilityLabel={`${weekday}요일 ${namesOf(d.emotions, written)}`}
              // 같은 칸을 다시 누르면 접는다 — 켜고 끄는 자리다
              onPress={() => onSelect(isSelected ? null : d.date)}
              style={styles.col}
            >
              {/* 더미는 **아래에서 위로** 자란다 — 대표 감정이 바닥이라 목록을 뒤집어 그린다.
                  감정이 있는 날은 수채 조약돌(`EmotionPebble`), 일기는 썼는데 감정이 없는 날은
                  빈 조약돌(테두리만), 일기가 없는 날은 테두리 없는 원(`WeekEmptyDot`) 한 장이
                  바닥에 놓여 자리를 지킨다. 고른 칸은 **살짝 커진다**(`SelectLift`) */}
              <View style={[styles.stack, { height: plotHeight }]}>
                {d.emotions.length > 0 ? (
                  [...d.emotions].reverse().map((e, i) => (
                    <SelectLift key={`${e}-${i}`} selected={isSelected} size={PEBBLE_SIZE}>
                      <EmotionPebble id={e} size={PEBBLE_SIZE} />
                    </SelectLift>
                  ))
                ) : (
                  <SelectLift selected={isSelected} size={PEBBLE_SIZE}>
                    {written ? (
                      <EmotionPebble id={null} size={PEBBLE_SIZE} />
                    ) : (
                      <WeekEmptyDot size={PEBBLE_SIZE} />
                    )}
                  </SelectLift>
                )}
              </View>
              {/* 요일은 **한 단 키웠다**(11 → 13 · 2026-09-12 사용자 요청) — 땅이 카드 바닥까지
                  차면서 글자가 그 위에 서게 되어, 최소 캡션으로는 모래에 묻혀 보였다 */}
              <Text
                variant="label2"
                color={
                  isSelected
                    ? labelColor.strong
                    : d.emotions.length === 0 && !written
                      ? labelColor.assistive
                      : labelColor.neutral
                }
                style={styles.weekday}
              >
                {weekday}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * 누른 날의 감정을 글자로 — 색만으로 안 보이던 그날 마음을 **전부** 확인한다.
 * 기록이 없는 날이면 「기록 없음」으로 솔직히 말한다.
 *
 * 카드 **제목 줄 오른쪽**에 선다(2026-09-11 · 사용자 요청 「선택했을 때 위치 안 변하게」) —
 * 더미 아래에 한 줄을 새로 세우면 그만큼 땅과 요일 글자가 밀려 내려간다. 그래서 이 줄은
 * **누른 것을 알리기만** 하고(`onSelect`), 그날 감정을 어디에 적을지는 제목 줄을 가진
 * 카드(`WeekEmotionCard`)가 정한다.
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
  // 땅을 절대 위치로 얹는 자리 — 칸들이 먼저 높이를 정하고 선이 그 위에 놓인다
  chart: { position: "relative" },
  row: { flexDirection: "row", gap: space.xs, alignItems: "flex-end" },
  col: { flex: 1, minWidth: 0, alignItems: "center" },
  // 더미는 바닥에서 쌓인다 — 판이 네 장 높이라도 한 장짜리 날은 바닥에 붙어 선다
  stack: { justifyContent: "flex-end", alignItems: "center", gap: STACK_GAP },
  // 요일 글자는 **언덕 위에** 선다(땅이 카드 바닥까지 차 있다) — 조약돌과의 거리만 둔다
  weekday: { textAlign: "center", marginTop: space.md },
  /**
   * 카드 여백 밖으로 번져 **좌우 끝과 아래 바닥까지** 닿는다(위 `GROUND_BLEED` ·
   * 2026-09-12 사용자 요청). 위는 조약돌이 파묻히는 자리라 부르는 쪽이 잡고,
   * 아래는 카드 안쪽 여백만큼 넘겨 **카드 바닥에 붙인다** — 그래서 이 상자의 높이는
   * 「조약돌 아래부터 카드 끝까지」가 되고, 그림이 그 상자를 꽉 채운다.
   */
  ground: {
    position: "absolute",
    left: -GROUND_BLEED,
    right: -GROUND_BLEED,
    bottom: -GROUND_BLEED,
  },
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
