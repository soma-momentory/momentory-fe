import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

import { EmotionPill } from "@/components/common/EmotionPill";
import { TabScreen } from "@/components/common/TabScreen";
import { RowSeparator, SettingRow } from "@/components/my/SettingRow";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import theme, { type EmotionId } from "@/design/theme";
import { archive as archiveTokens, my as tokens } from "@/design/tokens.mvp";
import { useAuth } from "@/features/auth/model/auth";
import { useDiary } from "@/features/diary/model/diary";
import { useProfile, useSettings } from "@/features/my/model/settings";
import { formatKoreanTime } from "@/lib/time";
import { SAMPLE_ALL_TIME_EMOTIONS } from "@/mocks/sample";

/**
 * `M1` · 마이 홈
 *
 * **온보딩에서 답한 항목은 빠짐없이 편집 경로가 있어야 한다**(`M1.md`) —
 * 온보딩이 "마이에서 언제든 바꿀 수 있어요"라고 약속했기 때문이다. 회고
 * 프로필(닉네임·관심 분야·쉬는 방법) · 기본 정보 · 알림 · 연결 관리 넷이
 * 여섯 질문을 모두 덮는다.
 *
 * - **같은 값을 두 칸에 넣지 않는다** — 「총 회고」와 「함께한 날」은 우연히 같은
 *   수지만 세는 대상이 다르다(`diaryCount` · `recordedDays`). 라벨이 그 차이를 말한다
 * - 가장 많이 기록한 감정은 **전체 기간 기준**이다 — 보관함(이번 달)·리포트(그 주)와
 *   **기간이 다르다**
 * - **회원 탈퇴는 로그아웃과 줄을 나눠** 위험 동작으로 분리하고 `dangerInk`
 *   **글자**를 쓴다. 면을 채우지 않는다
 * - **연속 일수·점수·배지를 쓰지 않는다** — "3일째 기록 중"이 아니라 "일기 12편"
 * - **앱 잠금·내보내기 줄을 두지 않는다** — 기능이 없으므로 갈 곳 없는 줄을 만들지 않는다
 * - 캘린더는 **`[연결 관리]` 한 곳**에만 있다 — 알림 화면(`M3`)에 두지 않는다
 */
export default function My() {
  const diaries = useDiary((s) => s.diaries);
  const nickname = useProfile((s) => s.nickname);
  const retro = useSettings((s) => s.notify.retro);
  const signOut = useAuth((s) => s.signOut);

  // 세는 대상이 다르다 — 장수와 날수
  const diaryCount = diaries.length;
  const recordedDays = new Set(diaries.map((d) => d.date)).size;
  const topAllTime = topOf(SAMPLE_ALL_TIME_EMOTIONS);

  return (
    <TabScreen active="마이">
      <AppText tone="strong" weight="700" style={styles.title}>
        마이
      </AppText>

      <ScrollView
        style={styles.stack}
        contentContainerStyle={styles.stackContent}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.profile}>
          <View style={styles.avatar} />
          <View style={styles.profileCopy}>
            <AppText tone="strong" weight="700" style={styles.name}>
              {nickname}
            </AppText>
            {/* 연속 일수가 아니라 장수다 */}
            <AppText variant="caption" tone="caption">
              {`${formatKoreanTime(retro.time ?? "21:30")} 회고 · 일기 ${diaryCount}편`}
            </AppText>
          </View>
        </Card>

        <View style={styles.stats}>
          <Stat value={`${diaryCount}회`} label="총 회고" />
          <Stat value={`${recordedDays}일`} label="함께한 날" />
          <Stat
            value={topAllTime == null ? "—" : theme.emotions[topAllTime - 1]?.name ?? "—"}
            label="가장 많이 기록"
            emotion={topAllTime}
          />
        </View>

        {/* 온보딩 여섯 질문의 편집 경로 — 빠짐없이 있어야 한다 */}
        <Card style={styles.rows}>
          <SettingRow label="회고 프로필" onPress={() => router.push("/my/profile")} />
          <RowSeparator />
          <SettingRow label="기본 정보" onPress={() => router.push("/my/profile")} />
          <RowSeparator />
          <SettingRow
            label="알림 설정"
            value={retro.enabled ? formatKoreanTime(retro.time ?? "21:30") : "꺼짐"}
            onPress={() => router.push("/my/notify")}
          />
          <RowSeparator />
          {/* 캘린더는 여기 한 곳뿐이다 — 알림 화면에 두지 않는다 */}
          <SettingRow label="연결 관리" value="캘린더" onPress={() => {}} />
        </Card>

        <Card style={styles.rows}>
          <SettingRow label="약관 및 정책" onPress={() => {}} />
          <RowSeparator />
          <SettingRow label="문의하기" onPress={() => {}} />
        </Card>

        {/* 위험 동작은 줄을 나눈다 — 로그아웃과 탈퇴가 같은 무게로 보이지 않게 */}
        <Card style={styles.rows}>
          <SettingRow label="로그아웃" onPress={() => void signOut()} />
          <RowSeparator />
          {/* 회원 탈퇴 확인 화면은 아직 없다 (my.pendingStates) */}
          <SettingRow label="회원 탈퇴" danger onPress={() => {}} />
        </Card>
      </ScrollView>
    </TabScreen>
  );
}

/** 가장 많이 기록한 감정 — 전체 기간. 보관함·리포트와 기간이 다르다 */
function topOf(counts: Partial<Record<EmotionId, number>>): EmotionId | null {
  let top: EmotionId | null = null;
  let best = 0;
  for (const [key, n] of Object.entries(counts)) {
    if ((n ?? 0) > best) {
      best = n ?? 0;
      top = Number(key) as EmotionId;
    }
  }
  return top;
}

function Stat({ value, label, emotion }: { value: string; label: string; emotion?: EmotionId | null }) {
  return (
    <Card style={styles.stat}>
      {emotion != null ? (
        <EmotionPill id={emotion} />
      ) : (
        <AppText tone="strong" weight="700" numberOfLines={1} style={styles.statValue}>
          {value}
        </AppText>
      )}
      <AppText tone="caption" numberOfLines={2} style={styles.statLabel}>
        {label}
      </AppText>
    </Card>
  );
}

const { semantic } = theme.colors;

const styles = StyleSheet.create({
  title: {
    fontSize: archiveTokens.titleSize,
    lineHeight: archiveTokens.titleSize * 1.3,
    letterSpacing: -0.44,
    paddingTop: 6,
    paddingBottom: theme.layout.gap.element,
  },

  stack: { flex: 1, marginHorizontal: -theme.layout.screenMargin },
  stackContent: {
    gap: 10,
    paddingHorizontal: theme.layout.screenMargin,
    paddingBottom: theme.layout.gap.element,
  },

  profile: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: tokens.avatar,
    height: tokens.avatar,
    borderRadius: tokens.avatar / 2,
    backgroundColor: semantic.surfaceTone,
  },
  profileCopy: { flex: 1, gap: 4 },
  name: { fontSize: 18, lineHeight: 25.2 },

  stats: { flexDirection: "row", gap: 7 },
  stat: {
    flex: 1,
    minWidth: 0,
    minHeight: 62,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 16, lineHeight: 19 },
  statLabel: { fontSize: 11, lineHeight: 14, textAlign: "center" },

  // 줄 사이 여백은 세퍼레이터가 만든다 — 카드는 좌우 여백만 준다
  rows: { paddingVertical: 4, gap: 0 },
});
