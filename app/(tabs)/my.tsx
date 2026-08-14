import { router } from "expo-router";
import { Image, ScrollView, StyleSheet, View } from "react-native";

import { Hill } from "@/components/common/Hill";
import { TabScreen } from "@/components/common/TabScreen";
import { CHARACTERS } from "@/components/icons/characters";
import { RowSeparator, SettingRow } from "@/components/my/SettingRow";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import { paperColors, paperRadius, paperTypography } from "@/design/paper";
import theme from "@/design/theme";
import { useAuth } from "@/features/auth/model/auth";
import { useDiary } from "@/features/diary/model/diary";
import { useProfile, useSettings } from "@/features/my/model/settings";
import { formatKoreanTime } from "@/lib/time";

/**
 * `M1` · 마이 홈
 *
 * **온보딩에서 답한 항목은 빠짐없이 편집 경로가 있어야 한다**(`M1.md`) —
 * 온보딩이 "마이에서 언제든 바꿀 수 있어요"라고 약속했기 때문이다. 회고
 * 프로필(닉네임·관심 분야·쉬는 방법) · 기본 정보 · 알림 · 연결 관리 넷이
 * 여섯 질문을 모두 덮는다.
 *
 * ## 새 디자인 (2026-08-14 · `PLAN.md` Phase 3-4)
 *
 * `docs/design/prototype/마이.dc.html` — 하늘 위 **프로필 한 줄**(카피바라 원
 * 74 · 닉네임 21/700 · 회고 수) → 곡선 언덕 → 언덕 면 위의 **그룹 리스트 카드
 * 셋**(앱 설정 · 지원 · 계정) → 바닥의 「회원 탈퇴」.
 *
 * **통계 3칸이 빠졌다**(시안에 없다 — `PLAN.md` 보고). 「총 회고 12회」는 프로필
 * 아래 한 줄로 남고, 「함께한 날」·「가장 많이 기록」은 자리가 사라졌다.
 *
 * - **연속 일수·점수·배지를 쓰지 않는다** — "3일째 기록 중"이 아니라 회고 수다
 * - **앱 잠금·내보내기 줄을 두지 않는다** — 기능이 없으므로 갈 곳 없는 줄을 만들지 않는다
 * - 캘린더는 **`[연결 관리]` 한 곳**에만 있다 — 알림 화면(`M3`)에 두지 않는다
 * - **회원 탈퇴는 계정 카드 밖 · 바닥의 한 줄**이다. 확인 화면이 아직 없어
 *   (`my.pendingStates`) **누르지 못한다** — 되돌릴 수 없는 동작을 확인 없이
 *   실행하지 않고, 눌리는데 아무 일도 없는 줄도 만들지 않는다
 */
export default function My() {
  const diaries = useDiary((s) => s.diaries);
  const nickname = useProfile((s) => s.nickname);
  const retro = useSettings((s) => s.notify.retro);
  const signOut = useAuth((s) => s.signOut);
  // 온보딩 `09` 에서 정한 값 — 연결 관리 줄이 지금 상태를 읽기로 보인다.
  // draft 가 아니라 프로필에서 읽는다 — `10` 이 draft 를 비우고 홈으로 보낸다
  const calendarLinked = useProfile((s) => s.calendarLinked);

  const diaryCount = diaries.length;

  return (
    <TabScreen active="마이" background="paperSky">
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Image
            source={CHARACTERS.capybaraAlt}
            resizeMode="contain"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.character}
          />
        </View>
        <View style={styles.profileCopy}>
          <AppText weight="700" style={styles.name}>
            {nickname}
          </AppText>
          {/* 연속 일수가 아니라 횟수다 */}
          <AppText style={styles.count}>{`총 회고 ${diaryCount}회`}</AppText>
        </View>
      </View>

      <Hill height={28} style={styles.hillCap} />

      <ScrollView
        style={styles.stack}
        contentContainerStyle={styles.stackContent}
        showsVerticalScrollIndicator={false}
      >
        {/*
          온보딩 답변의 편집 경로. **회고 프로필과 기본 정보가 같은 화면으로 간다** —
          상류 상태 기계(`my`)의 전이가 `editProfile → profile` 하나뿐이라 기본
          정보만 가는 화면이 없다. 화면을 새로 만들지 않고 `M2` 안의 섹션으로 뒀다.
        */}
        <Group label="앱 설정">
          <SettingRow label="회고 프로필" onPress={() => router.push("/my/profile")} />
          <RowSeparator />
          <SettingRow
            label="기본 정보"
            value="나이 · 성별"
            onPress={() => router.push("/my/profile")}
          />
          <RowSeparator />
          <SettingRow
            label="알림 설정"
            value={retro.enabled ? formatKoreanTime(retro.time ?? "21:30") : "꺼짐"}
            onPress={() => router.push("/my/notify")}
          />
          <RowSeparator />
          {/*
            캘린더는 여기 한 곳뿐이다 — 알림 화면에 두지 않는다.
            ⚠ 연결을 바꾸는 화면이 아직 없어 **누를 곳이 없다.** 「시간이 없는
            알림에는 › 를 두지 않는다」(`M3.md`)와 같은 이유로 표식도 두지 않고
            지금 상태만 읽기로 보인다 — 눌리는데 아무 일도 없는 줄을 만들지 않는다.
          */}
          <SettingRow
            label="연결 관리"
            value={calendarLinked ? "캘린더 연결됨" : "캘린더 연결 안 함"}
          />
        </Group>

        {/*
          ⚠ 약관·문의는 **갈 곳이 아직 없다.** 약관 문안은 법률 검토 중이고
          (`OPEN-ISSUES.md` R-10~R-15) 문의 채널도 정해지지 않았다. 확정되면
          `onPress` 가 붙는다 — 그때까지 표식을 두지 않는다.
        */}
        <Group label="지원">
          <SettingRow label="약관 및 정책" value="준비 중" />
          <RowSeparator />
          <SettingRow label="문의하기" value="준비 중" />
        </Group>

        <Group label="계정">
          <SettingRow label="로그아웃" onPress={() => void signOut()} />
        </Group>

        {/*
          위험 동작은 카드 밖 바닥에 홀로 둔다 — 로그아웃과 같은 무게로 보이지 않게.
          ⚠ **확인 화면이 아직 없다**(`my.pendingStates`) — 그래서 아직 눌리지 않고,
          왜 눌리지 않는지를 아래 한 줄이 말한다.
        */}
        <View style={styles.leave}>
          {/* 밑줄은 Text 가 아니라 감싼 View 가 긋는다 (Android 의 Text 테두리는 잘린다) */}
          <View style={styles.leaveUnderline}>
            <AppText style={styles.leaveLabel}>회원 탈퇴</AppText>
          </View>
          <AppText style={styles.leaveNote}>준비 중</AppText>
        </View>
      </ScrollView>
    </TabScreen>
  );
}

/** 그룹 라벨 + 줄 카드 한 장 — 언덕 위라 라벨은 `greenStrong` 이다(§대비 보정) */
function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <AppText style={styles.groupLabel}>{label}</AppText>
      <Card variant="paperSoft" style={styles.groupCard}>
        {children}
      </Card>
    </View>
  );
}

const { styles: type } = paperTypography;
const FULL_BLEED = -theme.layout.screenMargin;
const AVATAR = 74;
const CHARACTER = { width: 56, ratio: 988 / 755 };

const styles = StyleSheet.create({
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 1.5,
    borderColor: paperColors.bg.hill,
    backgroundColor: paperColors.bg.flat,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  character: { width: CHARACTER.width, height: CHARACTER.width * CHARACTER.ratio },
  profileCopy: { flex: 1, minWidth: 0, gap: 6 },
  // 시안의 닉네임은 21px/700 — 타이포 표에 없는 한 칸이라 여기서만 쓴다
  name: { fontSize: 21, lineHeight: 28, color: paperColors.text.primary },
  count: {
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight,
    color: paperColors.text.green,
  },

  // 언덕부터 아래는 화면 끝까지 초록 면이다
  hillCap: { marginHorizontal: FULL_BLEED },
  stack: { flex: 1, marginHorizontal: FULL_BLEED, backgroundColor: paperColors.bg.hill },
  stackContent: { flexGrow: 1, gap: 14, paddingHorizontal: 16, paddingBottom: 12 },

  group: { gap: 6 },
  groupLabel: {
    fontSize: type.label.fontSize,
    lineHeight: type.label.lineHeight,
    color: paperColors.text.greenStrong,
  },
  // 줄 여백은 각 줄이 만든다 — 카드는 면과 라운드만 준다
  groupCard: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    gap: 0,
    borderRadius: paperRadius.card,
    overflow: "hidden",
  },

  leave: { marginTop: "auto", alignItems: "center", gap: 4, paddingTop: 10, paddingBottom: 6 },
  leaveUnderline: { borderBottomWidth: 1, borderBottomColor: paperColors.text.greenStrong },
  leaveLabel: {
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight,
    color: paperColors.text.greenStrong,
  },
  leaveNote: {
    fontSize: type.caption.fontSize,
    lineHeight: type.caption.lineHeight,
    color: paperColors.text.greenStrong,
  },
});
