import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { MaskingTape } from "@/components/ds/MaskingTape";
import { Icon, Text, type IconName } from "@/components/ds";
import { label as labelColor, space, status } from "@/design/ds";
import { myPaper as paper } from "@/design/ds/myPaper";
import { approvedDesign, type StudioDesign } from "@/design/studioDesign";

type Props = {
  design?: StudioDesign;
  nickname: string;
  recordedDays: number;
  notifyValue: string;
  /** 바바의 편지 아침 알림 줄(2026-10-27). 없으면 줄을 그리지 않는다(Lab) */
  letterValue?: string;
  settingsNote?: string;
  calendarOn: boolean;
  withdrawing: boolean;
  withdrawError: string | null;
  onOpenNotificationSettings: () => void;
  onOpenLetterSettings?: () => void;
  onOpenCalendarLink: () => void;
  onOpenProfile: () => void;
  onOpenInquiry: () => void;
  onOpenTerms: () => void;
  onOpenPrivacy: () => void;
  onSignOut: () => void;
  onOpenWithdraw: () => void;
};

type Tone = "settings" | "support" | "account";

/** 운영과 Lab이 같은 종이 카드·설정 행을 그린다. 값과 동작은 각 어댑터가 전달한다. */
export function MyMainView({
  design = approvedDesign,
  nickname,
  recordedDays,
  notifyValue,
  letterValue,
  settingsNote,
  calendarOn,
  withdrawing,
  withdrawError,
  onOpenNotificationSettings,
  onOpenLetterSettings,
  onOpenCalendarLink,
  onOpenProfile,
  onOpenInquiry,
  onOpenTerms,
  onOpenPrivacy,
  onSignOut,
  onOpenWithdraw,
}: Props) {
  return (
    <ScrollView
      testID="studio-my-root"
      contentContainerStyle={styles.body}
      showsVerticalScrollIndicator={false}
    >
      <View
        testID="my-profile-card"
        style={[
          styles.profileCard,
          {
            backgroundColor: design["my.profileCard.backgroundColor"],
            borderRadius: design["my.profileCard.borderRadius"],
            paddingHorizontal: design["my.profileCard.paddingHorizontal"],
            shadowOpacity: design["my.profileCard.shadowOpacity"],
          },
        ]}
      >
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.profileTapeSlot}
        >
          <View testID="my-profile-tape" style={styles.profileTape}>
            <MaskingTape color={paper.title} />
          </View>
        </View>
        <View style={styles.profileTop}>
          <View style={styles.profileCopy}>
            <View style={styles.nicknameRow}>
              <Text
                testID="studio-my-nickname"
                variant="title1Hand"
                color={design["my.nickname.color"]}
                style={[styles.nickname, { fontFamily: design["my.nickname.fontFamily"] }]}
              >
                {nickname}
              </Text>
              <Text variant="title1Hand" color={labelColor.strong}>
                님
              </Text>
            </View>
            <Text variant="body1ReadingHand" color={labelColor.neutral}>
              모멘토리와 함께한 기록
            </Text>
          </View>
          <View
            testID="studio-my-baba"
            style={styles.babaFrame}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Image
              source={require("../../../../assets/home/v2/baba-composite.png")}
              resizeMode="contain"
              style={styles.babaFace}
            />
          </View>
        </View>
        <View style={styles.profileRule} />
        <View style={styles.profileStat}>
          <Text variant="body1ReadingHandLg" color={labelColor.neutral}>
            일기 쓴 날
          </Text>
          <Text variant="title3Hand" color={labelColor.strong}>
            {recordedDays}일
          </Text>
        </View>
        <Text variant="caption1" color={labelColor.alternative} style={styles.recordedCaption}>
          {"일기 " + recordedDays + "일 기록"}
        </Text>
      </View>

      <Group label="앱 설정" tone="settings" note={settingsNote}>
        <SettingRow
          title="알림 설정"
          icon="bell"
          value={notifyValue}
          tone="settings"
          onPress={onOpenNotificationSettings}
        />
        {letterValue != null ? (
          <SettingRow
            title="바바의 편지 알림"
            icon="mail"
            value={letterValue}
            tone="settings"
            onPress={onOpenLetterSettings}
            divided
          />
        ) : null}
        <SettingRow
          title="캘린더 연동"
          icon="calendar"
          value={calendarOn ? "연결됨" : "연결 안 함"}
          tone="settings"
          onPress={calendarOn ? undefined : onOpenCalendarLink}
          divided
        />
        <SettingRow
          title="기본 정보 수정"
          icon="nav-my-page"
          tone="settings"
          onPress={onOpenProfile}
          divided
        />
      </Group>

      <Group label="지원" tone="support">
        <SettingRow title="문의하기" icon="send" tone="support" onPress={onOpenInquiry} />
        <SettingRow title="이용약관" icon="document" tone="support" onPress={onOpenTerms} divided />
        <SettingRow
          title="개인정보 처리방침"
          icon="document"
          tone="support"
          onPress={onOpenPrivacy}
          divided
        />
      </Group>

      <Group label="계정" tone="account">
        <SettingRow title="로그아웃" icon="logout" tone="account" onPress={onSignOut} />
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

function Group({
  label,
  tone,
  note,
  children,
}: {
  label: string;
  tone: Tone;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHeading}>
        <View style={[styles.headingHighlight, HIGHLIGHTS[tone]]} />
        <Text variant="body1ReadingHandLg" color={labelColor.strong}>
          {label}
        </Text>
      </View>
      <View style={[styles.groupCard, GROUP_PAPER[tone]]}>
        <View pointerEvents="none" style={[styles.tape, TAPES[tone]]}>
          <MaskingTape color={TAPE_COLORS[tone]} />
        </View>
        {children}
      </View>
      {note != null ? (
        <Text variant="caption1" color={labelColor.alternative} style={styles.groupNote}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}

function SettingRow({
  title,
  icon,
  value,
  tone,
  onPress,
  divided = false,
}: {
  title: string;
  icon: IconName;
  value?: string;
  tone: Tone;
  onPress?: () => void;
  divided?: boolean;
}) {
  const content = (
    <>
      <View style={[styles.iconDot, DOTS[tone]]}>
        <Icon name={icon} size={16} color={labelColor.neutral} />
      </View>
      <Text variant="body1ReadingHandLg" color={labelColor.normal} style={styles.rowTitle}>
        {title}
      </Text>
      {value != null ? (
        <Text variant="body1ReadingHand" color={labelColor.neutral} style={styles.rowValue}>
          {value}
        </Text>
      ) : null}
      {onPress != null ? (
        <Icon name="chevron-right" size={16} color={labelColor.alternative} />
      ) : null}
    </>
  );
  const rowStyle = [styles.row, divided ? styles.rowDivided : null];

  if (onPress == null) return <View style={rowStyle}>{content}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={rowStyle}>
      {content}
    </Pressable>
  );
}

const GROUP_PAPER = {
  settings: { backgroundColor: paper.settings, transform: [{ rotate: "-0.8deg" }] },
  support: { backgroundColor: paper.support, transform: [{ rotate: "0.7deg" }] },
  account: { backgroundColor: paper.account, transform: [{ rotate: "-0.5deg" }] },
} as const;

const DOTS = {
  settings: { backgroundColor: paper.settingsDot },
  support: { backgroundColor: paper.supportDot },
  account: { backgroundColor: paper.accountDot },
} as const;

const HIGHLIGHTS = {
  settings: { backgroundColor: paper.settingsDot },
  support: { backgroundColor: paper.supportTape },
  account: { backgroundColor: paper.accountTape },
} as const;

const TAPE_COLORS = {
  settings: paper.settingsDot,
  support: paper.supportTape,
  account: paper.accountTape,
} as const;

const TAPES = {
  settings: { transform: [{ rotate: "-4deg" }] },
  support: { transform: [{ rotate: "3deg" }] },
  account: { transform: [{ rotate: "-2deg" }] },
} as const;

const styles = StyleSheet.create({
  body: { gap: 18, paddingTop: space.lg, paddingBottom: space.xl },
  profileCard: {
    backgroundColor: paper.profile,
    borderColor: paper.rule,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 16,
    transform: [{ rotate: "-0.6deg" }],
    shadowColor: paper.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  profileTapeSlot: {
    position: "absolute",
    top: -15,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  profileTape: {
    width: 100,
    height: 30,
  },
  profileTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  profileCopy: { flex: 1, minWidth: 0, gap: 4 },
  nicknameRow: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: 4 },
  nickname: { flexShrink: 1 },
  babaFrame: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: "hidden",
    marginRight: 8,
    backgroundColor: paper.title,
    borderWidth: 1,
    borderColor: paper.rule,
  },
  babaFace: { position: "absolute", width: 80, height: 110, left: -7, top: 6 },
  profileRule: { marginTop: 12, borderTopWidth: 1, borderColor: paper.rule, borderStyle: "dashed" },
  profileStat: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "baseline",
    gap: 8,
    paddingTop: 10,
  },
  recordedCaption: { textAlign: "center", marginTop: 2 },
  group: { gap: 8 },
  groupHeading: { alignSelf: "flex-start", marginLeft: 4, paddingHorizontal: 2 },
  headingHighlight: { position: "absolute", left: 0, right: 0, bottom: 4, height: 9 },
  groupCard: {
    borderRadius: 9,
    paddingHorizontal: 12,
    shadowColor: paper.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  tape: { position: "absolute", top: -7, right: 17, width: 46, height: 14, opacity: 0.8 },
  groupNote: { marginLeft: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, paddingVertical: 8 },
  rowDivided: { borderTopWidth: 1, borderColor: paper.rule, borderStyle: "dashed" },
  iconDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { flex: 1, minWidth: 0 },
  rowValue: { maxWidth: "42%", textAlign: "right", flexShrink: 1 },
  leave: { alignItems: "center", gap: space.xs, paddingTop: space.xs },
});
