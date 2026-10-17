import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Card, Icon, ListCell, ListDivider, Text } from "@/components/ds";
import { label as labelColor, space, status } from "@/design/ds";

type Props = {
  nickname: string;
  recordedDays: number;
  notifyValue: string;
  settingsNote?: string;
  calendarOn: boolean;
  withdrawing: boolean;
  withdrawError: string | null;
  onOpenNotificationSettings: () => void;
  onOpenCalendarLink: () => void;
  onOpenProfile: () => void;
  onOpenInquiry: () => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
  onSignOut: () => void;
  onOpenWithdraw: () => void;
};

/** 마이 본문의 운영 UI. 값과 동작은 라우트 또는 Lab 어댑터가 전달한다. */
export function MyMainView({
  nickname,
  recordedDays,
  notifyValue,
  settingsNote,
  calendarOn,
  withdrawing,
  withdrawError,
  onOpenNotificationSettings,
  onOpenCalendarLink,
  onOpenProfile,
  onOpenInquiry,
  onOpenTerms,
  onOpenPrivacy,
  onSignOut,
  onOpenWithdraw,
}: Props) {
  return (
    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <View style={styles.profile}>
        <View style={styles.profileCopy}>
          <Text variant="title3Hand" color={labelColor.strong} numberOfLines={1}>
            {nickname}
          </Text>
          <Text variant="caption1" color={labelColor.alternative}>
            {`일기 ${recordedDays}일 기록`}
          </Text>
        </View>
      </View>

      <Group label="앱 설정" note={settingsNote}>
        <ListCell
          title="알림 설정"
          leading={<Icon name="bell" size={20} color={labelColor.alternative} />}
          value={notifyValue}
          onPress={onOpenNotificationSettings}
          chevron
        />
        <ListDivider />
        <ListCell
          title="캘린더 연동"
          leading={<Icon name="calendar" size={20} color={labelColor.alternative} />}
          value={calendarOn ? "연결됨" : "연결 안 함"}
          onPress={calendarOn ? undefined : onOpenCalendarLink}
          chevron={!calendarOn}
        />
        <ListDivider />
        <ListCell
          title="기본 정보 수정"
          leading={<Icon name="nav-my-page" size={20} color={labelColor.alternative} />}
          onPress={onOpenProfile}
          chevron
        />
      </Group>

      <Group label="지원">
        <ListCell
          title="문의하기"
          leading={<Icon name="send" size={20} color={labelColor.alternative} />}
          onPress={onOpenInquiry}
          chevron
        />
        <ListDivider />
        <ListCell
          title="이용약관"
          leading={<Icon name="document" size={20} color={labelColor.alternative} />}
          onPress={onOpenTerms}
          chevron
        />
        <ListDivider />
        <ListCell
          title="개인정보 처리방침"
          leading={<Icon name="document" size={20} color={labelColor.alternative} />}
          onPress={onOpenPrivacy}
          chevron
        />
      </Group>

      <Group label="계정">
        <ListCell
          title="로그아웃"
          leading={<Icon name="logout" size={20} color={labelColor.alternative} />}
          onPress={onSignOut}
          chevron
        />
      </Group>

      <View style={styles.leave}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: withdrawing }}
          hitSlop={space.sm}
          disabled={withdrawing}
          onPress={onOpenWithdraw}
        >
          <Text variant="label2" color={status.negative}>
            회원 탈퇴
          </Text>
        </Pressable>
        {withdrawError != null ? (
          <Text variant="caption1" color={status.negative}>
            {withdrawError}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

/** 그룹 라벨 + 줄 카드 한 장 — 운영 화면의 기존 간격과 면을 유지한다. */
function Group({
  label,
  note,
  children,
}: {
  label: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.group}>
      <Text variant="label2" color={labelColor.alternative} style={styles.groupLabel}>
        {label}
      </Text>
      <Card padding="none" style={styles.groupCard}>
        {children}
      </Card>
      {note != null ? (
        <Text variant="caption1" color={labelColor.alternative} style={styles.groupLabel}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.xl2, paddingTop: space.sm, paddingBottom: space.xl },
  profile: { flexDirection: "row", alignItems: "center", gap: 14 },
  profileCopy: { flex: 1, minWidth: 0, gap: space.xs2 },
  group: { gap: space.sm },
  groupLabel: { paddingLeft: space.xs },
  groupCard: { paddingHorizontal: space.lg, paddingVertical: space.xs },
  leave: { alignItems: "center", gap: space.xs, paddingTop: space.xs },
});
