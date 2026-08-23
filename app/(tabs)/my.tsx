import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import {
  BottomSheet,
  Button,
  Card,
  Icon,
  ListCell,
  ListDivider,
  TabScreen,
  Text,
  TextField,
  WheelPicker,
} from "@/components/ds";
import { fill, hairline, label as labelColor, radius, space, status } from "@/design/ds";
import { useAuth } from "@/features/auth/model/auth";
import { useDiary } from "@/features/diary/model/diary";
import { useProfile, useSettings } from "@/features/my/model/settings";
import { openExternalLink } from "@/lib/links";
import {
  getNotificationPermission,
  requestNotificationPermission,
  type NotificationPermission,
} from "@/lib/notifications";
import {
  formatKoreanTime,
  fromWheelTime,
  toWheelTime,
  WHEEL_HOURS,
  WHEEL_MINUTES,
  WHEEL_PERIODS,
  type WheelTime,
} from "@/lib/time";

/**
 * `M1` · 마이 기본 + `M2` · 알림 설정 시트 (2026-08-20 · `PLAN.md` A Phase 4)
 *
 * 프로필 한 줄 → 그룹 리스트 셋(앱 설정 · 지원 · 계정) → 바닥의 「회원 탈퇴」.
 * 모든 행이 같은 줄 컴포넌트다 — **새 설정 UI 패턴을 만들지 않는다**(`My.dc.html` 「규칙」).
 *
 * ## 새 디자인에서 바뀐 것
 *
 * - 프로필이 **이니셜 아바타 + 기록 일수** 한 줄이다 (캐릭터 그림이 사라졌다 — `PLAN.md` N8)
 * - 「총 회고 12회」 → **「일기 12일 기록」**. 「회고」는 내부 용어라 밖으로 내보내지 않는다.
 *   **세는 대상도 다르다** — 편수가 아니라 **기록이 남은 날 수**다
 * - 「회고 프로필」·「기본 정보」 두 줄이 **「기본 정보 수정」 한 줄**로 합쳐졌다(`M3` 목록)
 * - **알림 설정이 화면이 아니라 시트다** — 휠 + `완료` 하나(`DESIGN.md` §11 「시간 선택」).
 *   옛 화면의 알림 네 줄(회고·낮 기록·주간·새로운 소식) 중 시안이 남긴 것은 회고 시각뿐이다
 * - 「연결 관리」 줄이 없어졌다 — 시안의 목록에 없다. 캘린더 연결은 온보딩 `09` 에서
 *   정하고 지금은 그 값을 읽기로 보여 주기만 했다(누를 곳이 없는 줄이었다)
 *
 * ## 그대로인 규칙
 *
 * - **연속 일수·점수·배지를 쓰지 않는다** (`RULES.md`)
 * - **갈 곳이 없는 줄은 눌리지 않게 둔다.** 「지원」 세 줄은 2026-08-21 에 갈 곳이
 *   생겼고(랜딩 페이지의 약관·개인정보 처리방침과 Notion 문의 폼을 **앱 안 브라우저**로
 *   연다 · `src/lib/links.ts`), **회원 탈퇴는 2026-08-23 에 붙었다**(BE #42)
 * - **회원 탈퇴는 목록 밖**의 낮춘 위험색 글자다 — 로그아웃과 같은 무게로 보이지 않게.
 *   되돌릴 수 없어 **확인 모달**을 거치고(`DESIGN.md` N2), 서버(`DELETE /users/me`)가
 *   카카오 연결을 끊고 계정을 지운 **뒤에만** 기기를 비운다(`features/auth/model/auth.ts`
 *   의 `withdraw`). 실패는 모달이 아니라 자리 아래 **한 줄**로 흡수한다(`RULES.md` 4)
 * - **알림 예약을 화면이 부르지 않는다** — 설정 store 를 `features/my/model/reminders.ts`
 *   가 구독해 OS 예약을 맞춘다. 여기서는 값만 바꾼다
 */
/**
 * 탈퇴 확인 문구 — **정확히 이 글자를 따라 써야** 탈퇴가 실행된다. 되돌릴 수 없는
 * 동작을 실수로 한 번에 누르지 못하게 하는 마찰이다(GitHub 저장소 삭제와 같은 방식).
 * 공백만 다듬어 비교한다 — 사용자가 앞뒤에 실수로 띄운 칸까지 틀렸다고 하지 않는다.
 */
const WITHDRAW_CONFIRM_PHRASE = "회원탈퇴";

export default function My() {
  const diaries = useDiary((s) => s.diaries);
  const nickname = useProfile((s) => s.nickname);
  const retro = useSettings((s) => s.notify.retro);
  const setTime = useSettings((s) => s.setTime);
  const toggle = useSettings((s) => s.toggle);
  const signOut = useAuth((s) => s.signOut);
  const withdraw = useAuth((s) => s.withdraw);
  const withdrawing = useAuth((s) => s.withdrawing);
  const withdrawError = useAuth((s) => s.withdrawError);
  const clearWithdrawError = useAuth((s) => s.clearWithdrawError);

  /** 시트를 여는 동안만 사는 값 — **`완료` 를 눌러야 설정이 된다**(`DESIGN.md` §11) */
  const [editingTime, setEditingTime] = useState<string | null>(null);
  /** 탈퇴 확인 시트가 떠 있는가. 되돌릴 수 없는 행동이라 문구를 따라 써야 실행된다 */
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false);
  /** 확인 시트의 입력값 — `WITHDRAW_CONFIRM_PHRASE` 와 맞아야 탈퇴 버튼이 켜진다 */
  const [withdrawConfirmText, setWithdrawConfirmText] = useState("");
  /** `null` 은 아직 모르는 상태 — 모르는 채로 안내를 띄우지 않는다 */
  const [permission, setPermission] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    let alive = true;
    // 묻기만 한다 — 화면에 들어왔다는 이유로 권한 다이얼로그를 띄우지 않는다
    void getNotificationPermission().then((p) => {
      if (alive) setPermission(p);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 연속 일수가 아니라 **기록이 남은 날 수**다 — 같은 날 두 편을 써도 하루다
  const recordedDays = new Set(diaries.map((d) => d.date)).size;
  const initial = nickname.trim().slice(0, 1);
  const notifyValue = retro.enabled ? `매일 ${formatKoreanTime(retro.time ?? "21:30")}` : "꺼짐";

  /**
   * `완료` — 고른 시각을 남기고, 알림이 꺼져 있었다면 **그때 OS 권한을 묻는다.**
   * 권한을 받지 못하면 켜지 않는다 — 켜진 채 아무 알림도 오지 않으면 사용자는
   * 확인할 방법이 없다(`ARCHITECTURE §8` 의 앱 잠금과 같은 이유).
   */
  const confirmTime = async () => {
    const picked = editingTime;
    setEditingTime(null);
    if (picked == null) return;

    setTime("retro", picked);
    if (retro.enabled) return;

    const result = await requestNotificationPermission();
    setPermission(result);
    if (result.granted) toggle("retro");
  };

  /** 확인 시트를 연다 — 지난 실패 한 줄과 입력값을 지우고 연다 */
  const openWithdraw = () => {
    clearWithdrawError();
    setWithdrawConfirmText("");
    setConfirmingWithdraw(true);
  };

  /** 시트를 닫고 입력값을 버린다 — 딤을 누르거나 취소했을 때 */
  const cancelWithdraw = () => {
    setConfirmingWithdraw(false);
    setWithdrawConfirmText("");
  };

  /** 문구가 정확히 맞아야 탈퇴 버튼이 켜진다 */
  const canWithdraw = withdrawConfirmText.trim() === WITHDRAW_CONFIRM_PHRASE;

  /**
   * 「탈퇴하기」 — 서버가 계정을 지우고 성공하면 store 가 `anonymous` 로 닫아
   * 라우트 가드가 로그인으로 돌려보낸다(여기서 옮기지 않는다). 실패하면 시트를
   * 닫고, `withdrawError` 한 줄이 회원 탈퇴 자리 아래에 뜬다(시트엔 오류를 두지 않는다).
   */
  const confirmWithdraw = async () => {
    // 진행 중 중복 탭 방지는 store 가 하지만, 문구가 안 맞으면 애초에 안 부른다
    if (!canWithdraw) return;
    await withdraw();
    setConfirmingWithdraw(false);
    setWithdrawConfirmText("");
  };

  // 앱이 다시 물을 수 있는 동안에는 안내하지 않는다 — 시트의 `완료` 가 곧 그 물음이다
  const blocked = permission != null && !permission.granted && !permission.canAskAgain;
  const wheel = toWheelTime(editingTime ?? retro.time ?? "21:30");
  const setWheel = (next: Partial<WheelTime>) =>
    setEditingTime(fromWheelTime({ ...wheel, ...next }));

  return (
    <TabScreen
      active="마이"
      /*
        `M2` — **하나의 결정만 담는다**(`DESIGN.md` §11). 시트에 설정 줄을 늘리지 않고
        시각 하나만 고른다. 라우트가 아니라 이 화면 안에서 열리는 것은 시안이 마이
        위에 겹쳐 그리기 때문이고, 온보딩 `08` 의 시간 시트와 같은 방식이다.

        `overlay` 로 넘기는 이유는 **`Screen` 밖에 그려야 하기 때문**이다 — 시트는
        절대 배치로 부모를 덮는데 `Screen` 안에 두면 Safe Area 안쪽만 덮어 딤이
        상태바·홈 인디케이터 자리에서 끊긴다(`TabScreen` 머리말).
      */
      overlay={
        editingTime != null ? (
          <BottomSheet title="알림 설정" onDismiss={() => setEditingTime(null)}>
            <Text variant="label2" color={labelColor.alternative}>
              알림 시간
            </Text>
            {/* 세 열이 하이라이트 밴드 **하나**를 공유한다 — 열마다 그리면 사이가 끊긴다 */}
            <WheelPicker
              columns={[
                {
                  key: "period",
                  label: "오전 오후",
                  items: WHEEL_PERIODS,
                  value: wheel.period,
                  onChange: (period) => setWheel({ period }),
                  width: 88,
                },
                {
                  key: "hour",
                  label: "시",
                  items: WHEEL_HOURS,
                  value: wheel.hour,
                  onChange: (hour) => setWheel({ hour }),
                  width: 72,
                  format: (h) => `${h}시`,
                },
                {
                  key: "minute",
                  label: "분",
                  items: WHEEL_MINUTES,
                  value: wheel.minute,
                  onChange: (minute) => setWheel({ minute }),
                  width: 72,
                  format: (m) => `${m}분`,
                },
              ]}
            />
            <Button label="완료" fill onPress={() => void confirmTime()} />
            {/*
              ⚠ 시안에 없는 줄이다. 옛 알림 화면에는 스위치가 있었고 시안은 그 화면을
              통째로 시트로 줄이면서 **끄는 길을 그리지 않았다** — 그대로 옮기면 한 번 켠
              알림을 앱 안에서 끌 수 없게 된다. 켜져 있을 때만 나타나는 3순위 텍스트
              버튼으로 뒀다(`DESIGN.md` §6 CTA 위계 · 온보딩 `08` 의 「알림 없이 쓸게요」와 같은 자리).
            */}
            {retro.enabled ? (
              <View style={styles.secondary}>
                <Button
                  label="알림 받지 않기"
                  variant="text"
                  onPress={() => {
                    // 시각은 그대로 둔다 — 다시 켜면 그 시각이다
                    toggle("retro");
                    setEditingTime(null);
                  }}
                />
              </View>
            ) : null}
          </BottomSheet>
        ) : confirmingWithdraw ? (
          /*
            회원 탈퇴 확인 — **문구를 따라 써야** 실행된다(되돌릴 수 없는 동작의 마찰).
            알림 시트와 같은 이유로 `overlay` 로 넘긴다 — `Screen` 안에 두면 딤이
            상태바·홈 인디케이터 자리에서 끊긴다(위 알림 시트 주석).
          */
          <BottomSheet title="회원 탈퇴" onDismiss={cancelWithdraw}>
            <Text variant="body2Reading" color={labelColor.neutral}>
              탈퇴하면 기록한 일기와 대화가 모두 지워지고 되돌릴 수 없어요.
            </Text>
            {/* 오류가 아니라 확인이라 시트에 둔다 — 실패(카카오 등)는 시트를 닫고
                회원 탈퇴 자리 아래 한 줄로 흡수한다(`RULES.md` 4) */}
            <TextField
              fieldLabel={`확인을 위해 아래에 ${WITHDRAW_CONFIRM_PHRASE} 를 입력해 주세요`}
              placeholder={WITHDRAW_CONFIRM_PHRASE}
              value={withdrawConfirmText}
              onChangeText={setWithdrawConfirmText}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!withdrawing}
              returnKeyType="done"
              onSubmitEditing={() => void confirmWithdraw()}
            />
            <Button
              label={withdrawing ? "탈퇴 중…" : "탈퇴하기"}
              variant="destructive"
              fill
              // 문구가 맞기 전에는 눌리지 않는다 — 진행 중에도 잠근다(중복 탭 방지)
              disabled={!canWithdraw || withdrawing}
              onPress={() => void confirmWithdraw()}
            />
          </BottomSheet>
        ) : null
      }
    >
      {/* 탭 루트라 상단바가 없다 — 본문의 Title 3 이 제목 노릇을 한다(`DESIGN.md` §10) */}
      <View style={styles.head}>
        <Text variant="title3Hand" color={labelColor.strong}>
          마이
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.profile}>
          {/* 그림이 아니라 이니셜이다 — 새 디자인에 캐릭터가 없다(N8) */}
          <View style={styles.avatar} accessibilityElementsHidden>
            <Text variant="headline1" color={labelColor.neutral}>
              {initial}
            </Text>
          </View>
          <View style={styles.profileCopy}>
            <Text variant="heading1" color={labelColor.strong} numberOfLines={1}>
              {nickname}
            </Text>
            {/* 연속 일수가 아니라 기록이 남은 날 수다 */}
            <Text variant="caption1" color={labelColor.alternative}>
              {`일기 ${recordedDays}일 기록`}
            </Text>
          </View>
        </View>

        {/* 거부는 카드 밖 한 줄로 흡수한다 — 모달도 재시도 버튼도 경고 아이콘도 없다 */}
        <Group
          label="앱 설정"
          note={blocked ? "기기 설정에서 알림을 켜면 이 시간에 찾아갈게요." : undefined}
        >
          <ListCell
            title="알림 설정"
            leading={<Icon name="bell" size={20} color={labelColor.alternative} />}
            value={notifyValue}
            onPress={() => setEditingTime(retro.time ?? "21:30")}
            chevron
          />
          <ListDivider />
          {/* 온보딩에서 답한 다섯 항목이 이 한 줄 뒤에 모여 있다 (`M3` 목록) */}
          <ListCell
            title="기본 정보 수정"
            leading={<Icon name="nav-my-page" size={20} color={labelColor.alternative} />}
            onPress={() => router.push("/my/profile")}
            chevron
          />
        </Group>

        {/*
            세 줄 다 **앱 안 브라우저**로 랜딩 페이지를 연다(2026-08-21 · `src/lib/links.ts`).
            앱 안에 문안을 두지 않는 이유는 약관이 웹에서 갱신되기 때문이다 — 복사해
            두면 배포 주기가 다른 두 벌이 생긴다.

            ⚠ 옛 「정책 · 약관」 한 줄이 **이용약관 · 개인정보 처리방침 둘로 갈렸다** —
            주소가 둘이라 한 줄로는 어느 쪽으로 갈지 말할 수 없다. 로그인 화면의 약관
            줄과 **같은 이름**을 쓴다(「마이에서 언제든 다시 확인할 수 있어요」가
            가리키는 곳이다).
          */}
        <Group label="지원">
          <ListCell
            title="문의하기"
            leading={<Icon name="send" size={20} color={labelColor.alternative} />}
            onPress={() => void openExternalLink("support")}
            chevron
          />
          <ListDivider />
          <ListCell
            title="이용약관"
            leading={<Icon name="document" size={20} color={labelColor.alternative} />}
            onPress={() => void openExternalLink("terms")}
            chevron
          />
          <ListDivider />
          {/* 같은 글리프를 두 줄이 나눠 쓴다 — 세트에 자물쇠·방패가 없고,
           **없는 글리프를 만들지 않는다**(`CLAUDE.md` 아이콘 규칙) */}
          <ListCell
            title="개인정보 처리방침"
            leading={<Icon name="document" size={20} color={labelColor.alternative} />}
            onPress={() => void openExternalLink("privacy")}
            chevron
          />
        </Group>

        <Group label="계정">
          <ListCell
            title="로그아웃"
            leading={<Icon name="arrow-left" size={20} color={labelColor.alternative} />}
            onPress={() => void signOut()}
            chevron
          />
        </Group>

        {/*
            위험 동작은 목록 밖 바닥에 홀로 둔다 — 로그아웃과 같은 무게로 보이지 않게.
            면을 채우지 않고 낮춘 위험색 글자다(`M1` 규칙 · `dangerInk` = `status.negative`).
            누르면 되돌릴 수 없어 **확인 시트에서 문구를 따라 써야** 실행된다.
            실패는 시트가 아니라 이 자리 아래 **한 줄**로 흡수한다(`RULES.md` 4).
          */}
        <View style={styles.leave}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: withdrawing }}
            hitSlop={space.sm}
            disabled={withdrawing}
            onPress={openWithdraw}
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
    </TabScreen>
  );
}

/** 그룹 라벨 + 줄 카드 한 장 — 시안의 섹션 셋이 같은 모양이다 */
function Group({
  label,
  note,
  children,
}: {
  label: string;
  /** 카드 **밖**의 한 줄 — 카드 안에 넣으면 설정 항목처럼 읽힌다 */
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.group}>
      <Text variant="label2" color={labelColor.alternative} style={styles.groupLabel}>
        {label}
      </Text>
      {/* 줄 여백은 각 줄이 만든다 — 카드는 면과 라운드만 준다 */}
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

const AVATAR = 56;

const styles = StyleSheet.create({
  // 좌우 20 은 `TabScreen` 이 잡는다 — 여기서 또 잡으면 두 겹이 된다
  head: { paddingTop: space.sm, paddingBottom: space.xl },
  body: {
    gap: space.xl2,
    paddingBottom: space.xl,
  },

  profile: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: radius.full,
    backgroundColor: fill.normal,
    alignItems: "center",
    justifyContent: "center",
    ...hairline.neutral,
  },
  profileCopy: { flex: 1, minWidth: 0, gap: space.xs2 },

  group: { gap: space.sm },
  groupLabel: { paddingLeft: space.xs },
  groupCard: { paddingHorizontal: space.lg, paddingVertical: space.xs },

  leave: { alignItems: "center", gap: space.xs, paddingTop: space.xs },
  secondary: { alignItems: "center" },
});
