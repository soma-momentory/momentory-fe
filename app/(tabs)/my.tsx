import { captureAnalytics, track } from "@/features/analytics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  BottomSheet,
  Button,
  PaperGroup,
  Icon,
  TabScreen,
  Text,
  TextField,
  TimeSheet,
} from "@/components/ds";
import { label as labelColor, primary, space } from "@/design/ds";
import { useAuth } from "@/features/auth/model/auth";
import { CALENDAR_NOTICE } from "@/features/calendar/model/notice";

import { saveLetterPreference } from "@/features/letter/model/letter";
import { saveRetroReminder } from "@/features/my/model/basicInfo";
import { adoptGrantedCalendar, linkCalendar } from "@/features/my/model/calendarLink";
import { useRecordedDays } from "@/features/my/model/recordedDays";
import { useProfile, useSettings, type NotifySetting } from "@/features/my/model/settings";
import { ReflectionButton } from "@/features/home/ui/v2/HeroCard";
import { MyMainView } from "@/features/my/ui/MyMainView";
import { onForeground } from "@/lib/appState";
import { getCalendarAccess, openCalendarSettings, type CalendarAccess } from "@/lib/calendar";
import { openExternalLink } from "@/lib/links";
import {
  getNotificationPermission,
  requestNotificationPermission,
  type NotificationPermission,
} from "@/lib/notifications";
import { formatKoreanTime } from "@/lib/time";

/**
 * `M1` · 마이 기본 + `M2` · 알림 설정 시트 (2026-08-20 · `PLAN.md` A Phase 4)
 *
 * 프로필 한 줄 → 그룹 리스트 셋(앱 설정 · 지원 · 계정) → 바닥의 「회원 탈퇴」.
 * 모든 행이 같은 줄 컴포넌트다 — **새 설정 UI 패턴을 만들지 않는다**(`My.dc.html` 「규칙」).
 *
 * ## 새 디자인에서 바뀐 것
 *
 * - 프로필이 **닉네임 + 기록 일수** 한 줄이다 (캐릭터 그림은 N8 에서, 이니셜 아바타 원은
 *   2026-08-23 에 뺐다 — 동그라미 없이 글자만 남긴다)
 * - 「총 회고 12회」 → **「일기 쓴 날 12일」**(그 아래 「일기 12일 기록」 줄은 2026-11-10 에 뺐다). 「회고」는 내부 용어라 밖으로 내보내지 않는다.
 *   **세는 대상도 다르다** — 편수가 아니라 **기록이 남은 날 수**다
 * - 「회고 프로필」·「기본 정보」 두 줄이 **「기본 정보 수정」 한 줄**로 합쳐졌다(`M3` 목록)
 * - **알림 설정이 화면이 아니라 시트다** — 휠 + `완료` 하나(`DESIGN.md` §11 「시간 선택」).
 *   옛 화면의 알림 네 줄(회고·낮 기록·주간·새로운 소식) 중 시안이 남긴 것은 회고 시각뿐이다
 * - 「연결 관리」 줄이 없어졌다 — 시안의 목록에 없다. 캘린더 연결은 온보딩 `09` 에서
 *   정하고 지금은 그 값을 읽기로 보여 주기만 했다(누를 곳이 없는 줄이었다)
 * - **「캘린더 연동」 줄이 돌아왔다**(2026-09-28). 온보딩에서 「나중에 할게요」를 고르면
 *   앱 안에서 다시 이을 길이 없었다 — 연동 비율이 온보딩 화면 하나에서 정해지는 자리다.
 *   연결되지 않았을 때만 눌리고, **해제는 두지 않는다**(연결됨이면 갈 곳이 없는 줄이다)
 *
 * ## 그대로인 규칙
 *
 * - **연속 일수·점수·배지를 쓰지 않는다** (`RULES.md`)
 * - **갈 곳이 없는 줄은 눌리지 않게 둔다.** 「지원」 세 줄은 2026-08-21 에 갈 곳이
 *   생겼고(랜딩 페이지의 약관·개인정보 처리방침을 **앱 안 브라우저**로 연다 · `src/lib/links.ts` ·
 *   문의는 2026-10-13 부터 앱 안 화면 `app/my/inquiry.tsx`), **회원 탈퇴는 2026-08-23 에 붙었다**(BE #42)
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
  const { openNotificationSettings } = useLocalSearchParams<{
    openNotificationSettings?: string;
  }>();
  const nickname = useProfile((s) => s.nickname);
  const retro = useSettings((s) => s.notify.retro);
  const signOut = useAuth((s) => s.signOut);
  const withdraw = useAuth((s) => s.withdraw);
  const withdrawing = useAuth((s) => s.withdrawing);
  const withdrawError = useAuth((s) => s.withdrawError);
  const clearWithdrawError = useAuth((s) => s.clearWithdrawError);

  /** 시트를 여는 동안만 사는 값 — **`완료` 를 눌러야 설정이 된다**(`DESIGN.md` §11) */
  const [editingTime, setEditingTime] = useState<string | null>(null);
  /** 바바의 편지 알림 시트(2026-10-27) — 회고 시트와 같은 휠 · 같은 규칙이다 */
  const [editingLetter, setEditingLetter] = useState<string | null>(null);
  const letter = useSettings((s) => s.notify.letter);
  const letterChosen = useSettings((s) => s.letterChosen);

  useEffect(() => {
    if (openNotificationSettings !== "1") return;
    const timer = setTimeout(() => {
      setEditingTime(retro.time ?? "21:30");
      // 닫은 뒤 같은 URL로 돌아와도 시트를 다시 열지 않는다.
      router.setParams({ openNotificationSettings: "" });
    }, 0);
    return () => clearTimeout(timer);
  }, [openNotificationSettings, retro.time]);
  /** 탈퇴 확인 시트가 떠 있는가. 되돌릴 수 없는 행동이라 문구를 따라 써야 실행된다 */
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false);
  /** 확인 시트의 입력값 — `WITHDRAW_CONFIRM_PHRASE` 와 맞아야 탈퇴 버튼이 켜진다 */
  const [withdrawConfirmText, setWithdrawConfirmText] = useState("");
  /** `null` 은 아직 모르는 상태 — 모르는 채로 안내를 띄우지 않는다 */
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const calendarLinked = useProfile((s) => s.calendarLinked);
  /** 기기의 캘린더 권한. `null` 은 아직 모르는 상태 — 모르는 동안은 서버 값을 믿는다 */
  const [calendarAccess, setCalendarAccess] = useState<CalendarAccess | null>(null);
  /** 캘린더 연동 시트가 떠 있는가 */
  const [linkingCalendar, setLinkingCalendar] = useState(false);
  /** 권한은 받았는데 서버에 남기지 못했을 때의 한 줄(`RULES.md` 4) */
  const [calendarError, setCalendarError] = useState<string | null>(null);
  /** 알림 시각 · 끄기를 서버에 남기지 못했을 때의 한 줄 — 그때는 설정도 그대로다 */
  const [notifyError, setNotifyError] = useState<string | null>(null);

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

  useEffect(() => {
    let alive = true;
    // 묻기만 한다 — 알림과 같은 이유로 들어왔다고 다이얼로그를 띄우지 않는다.
    // 권한이 허용인데 서버 값만 꺼져 있으면 맞춘다(`adoptGrantedCalendar`). iOS 는 설정에서
    // 권한을 바꾸면 앱을 종료시키므로 「설정에서 돌아왔다」를 기억해서는 잡을 수 없다 —
    // 들어올 때와 앞으로 돌아올 때마다 지금 상태를 본다
    const check = () =>
      void getCalendarAccess().then((access) => {
        if (!alive) return;
        setCalendarAccess(access);
        void adoptGrantedCalendar(access);
      });
    check();
    const stop = onForeground(check);
    return () => {
      alive = false;
      stop();
    };
  }, []);

  /**
   * 「캘린더 연결하기」 — 권한을 묻고, 받으면 첫 적재를 시작한 뒤 서버에 남긴다
   * (`features/my/model/calendarLink.ts`). 거부는 오류가 아니라 답이라 아무 말도 하지
   * 않는다 — 다시 누르면 시트가 기기 설정으로 안내한다.
   */
  const connectCalendar = async () => {
    track("calendar_link_chosen", { source: "my", choice: "link" });
    setLinkingCalendar(false);
    setCalendarError(null);
    const record = captureAnalytics();
    const result = await linkCalendar();
    record("calendar_permission_result", { granted: result.granted });
    setCalendarAccess(await getCalendarAccess());
    if (result.kind === "failed") setCalendarError(result.message);
  };

  /**
   * 다시 물을 수 없는 기기 — 기기 설정을 연다. 거기서 켜면 iOS 가 앱을 종료시키고,
   * 다시 열린 마이가 권한을 보고 서버 값을 맞춘다(위 `check`).
   */
  const openCalendarSettingsFromSheet = () => {
    track("calendar_link_chosen", { source: "my", choice: "settings" });
    setLinkingCalendar(false);
    void openCalendarSettings();
  };

  const dismissCalendar = () => {
    track("calendar_link_chosen", { source: "my", choice: "later" });
    setLinkingCalendar(false);
  };

  // 연속 일수가 아니라 **기록이 남은 날 수**다 — 전체 기간 · 같은 날 두 편이어도 하루(`recordedDays.ts`)
  const recordedDays = useRecordedDays();
  const notifyValue = retro.enabled ? `매일 ${formatKoreanTime(retro.time ?? "21:30")}` : "꺼짐";

  /**
   * 시각 · 켜짐을 **서버에 남긴 뒤에** 바꾼다(`saveRetroReminder`). 기기에만 두면 앱을
   * 다시 켤 때 서버 값으로 되돌아가 「껐는데 또 온다」가 된다. 실패하면 그대로 두고 한 줄로
   * 알린다(`RULES.md` 4). 바뀐 것이 없으면 보내지 않는다.
   */
  const saveRetro = async (next: NotifySetting) => {
    setNotifyError(null);
    if (next.time === retro.time && next.enabled === retro.enabled) return;
    const result = await saveRetroReminder(next);
    if (!result.ok) setNotifyError(result.message);
  };

  /**
   * `완료` — 고른 시각을 남기고, 알림이 꺼져 있었다면 **그때 OS 권한을 묻는다.**
   * 권한을 받지 못하면 켜지 않는다 — 켜진 채 아무 알림도 오지 않으면 사용자는
   * 확인할 방법이 없다(`ARCHITECTURE §8` 의 앱 잠금과 같은 이유).
   */
  const confirmTime = async () => {
    const picked = editingTime;
    setEditingTime(null);
    if (picked == null) return;

    let enabled = retro.enabled;
    if (!enabled) {
      const result = await requestNotificationPermission();
      track("notify_permission_result", { source: "my", granted: result.granted });
      setPermission(result);
      enabled = result.granted;
    }
    await saveRetro({ time: picked, enabled });
  };

  /** 편지 알림 — 회고와 같다: 서버가 받은 뒤에 바꾸고, 꺼져 있었으면 `완료` 때 권한을 묻는다 */
  const saveLetter = async (time: string, enabled: boolean) => {
    setNotifyError(null);
    if (time === letter.time && enabled === letter.enabled && letterChosen === true) return;
    if (!(await saveLetterPreference(time, enabled))) {
      setNotifyError("편지 알림을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    }
  };

  const confirmLetterTime = async () => {
    const picked = editingLetter;
    setEditingLetter(null);
    if (picked == null) return;
    let enabled = letter.enabled;
    if (!enabled) {
      const result = await requestNotificationPermission();
      track("notify_permission_result", { source: "my", granted: result.granted });
      setPermission(result);
      enabled = result.granted;
    }
    await saveLetter(picked, enabled);
  };

  /** 확인 시트를 연다 — 지난 실패 한 줄과 입력값을 지우고 연다 */
  const openWithdraw = () => {
    track("withdrawal_opened", {});
    clearWithdrawError();
    setWithdrawConfirmText("");
    setConfirmingWithdraw(true);
  };

  /** 시트를 닫고 입력값을 버린다 — 딤을 누르거나 취소했을 때 */
  const cancelWithdraw = () => {
    if (!withdrawing) track("withdrawal_cancelled", {});
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
  // 서버 값과 기기 권한이 **둘 다** 켜져야 연결됨이다 — 기기 설정에서 권한을 끄고 오면
  // 동기화가 멈추므로 「연결됨」이라고 말할 수 없다. 권한을 아직 모르면 서버 값을 믿는다
  const calendarOn = calendarLinked && calendarAccess?.granted !== false;
  const calendarBlocked =
    calendarAccess != null && !calendarAccess.granted && !calendarAccess.canAskAgain;

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
          <TimeSheet
            title="알림 설정"
            time={editingTime}
            onChange={setEditingTime}
            onDismiss={() => setEditingTime(null)}
            onDone={() => void confirmTime()}
            /*
              ⚠ 시안에 없는 줄이다. 옛 알림 화면에는 스위치가 있었고 시안은 그 화면을
              통째로 시트로 줄이면서 **끄는 길을 그리지 않았다** — 그대로 옮기면 한 번 켠
              알림을 앱 안에서 끌 수 없게 된다. 켜져 있을 때만 나타나는 3순위 텍스트
              버튼으로 뒀다(`DESIGN.md` §6 CTA 위계 · 온보딩 `08` 의 「알림 없이 쓸게요」와 같은 자리).
            */
            onTurnOff={
              retro.enabled
                ? () => {
                    // 시각은 그대로 둔다 — 다시 켜면 그 시각이다
                    setEditingTime(null);
                    void saveRetro({ ...retro, enabled: false });
                  }
                : undefined
            }
          />
        ) : editingLetter != null ? (
          <TimeSheet
            title="바바의 편지 알림"
            time={editingLetter}
            onChange={setEditingLetter}
            onDismiss={() => setEditingLetter(null)}
            onDone={() => void confirmLetterTime()}
            onTurnOff={
              letter.enabled
                ? () => {
                    setEditingLetter(null);
                    void saveLetter(letter.time ?? "08:30", false);
                  }
                : undefined
            }
          />
        ) : linkingCalendar ? (
          /*
            캘린더 연동 — 온보딩 `09` 와 **같은 약속**을 보이고 묻는다(`CALENDAR_NOTICE`).
            이미 거부돼 다시 물을 수 없는 기기에는 물어도 아무 일이 없으므로, 약속 대신
            기기 설정으로 가는 길 하나만 둔다.
          */
          <BottomSheet title="캘린더 연동" onDismiss={dismissCalendar}>
            {calendarBlocked ? (
              <>
                <Text variant="body2Reading" color={labelColor.neutral}>
                  기기 설정에서 모멘토리의 캘린더 접근을 허용해 주세요. 허용하고 돌아오면 바로
                  연결돼요.
                </Text>
                <ReflectionButton
                  testID="calendar-open-settings"
                  label="설정 열기"
                  onPress={openCalendarSettingsFromSheet}
                  style={styles.sheetCta}
                />
              </>
            ) : (
              <>
                <PaperGroup padded>
                  <View style={styles.calendarNoticeHead}>
                    <Icon name="calendar" size={20} color={primary.heavy} />
                    <Text variant="label1" color={labelColor.strong}>
                      {CALENDAR_NOTICE.title}
                    </Text>
                  </View>
                  <Text variant="body2Reading" color={labelColor.neutral}>
                    {CALENDAR_NOTICE.body}
                  </Text>
                </PaperGroup>
                <ReflectionButton
                  testID="calendar-connect"
                  label="캘린더 연결하기"
                  onPress={() => void connectCalendar()}
                  style={styles.sheetCta}
                />
              </>
            )}
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
              variant="paper"
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
      <MyMainView
        nickname={nickname}
        recordedDays={recordedDays}
        notifyValue={notifyValue}
        letterValue={
          letterChosen == null
            ? undefined
            : letter.enabled
              ? formatKoreanTime(letter.time ?? "08:30")
              : "꺼짐"
        }
        onOpenLetterSettings={() => setEditingLetter(letter.time ?? "08:30")}
        settingsNote={
          notifyError ??
          calendarError ??
          (blocked ? "기기 설정에서 알림을 켜면 이 시간에 찾아갈게요." : undefined)
        }
        calendarOn={calendarOn}
        withdrawing={withdrawing}
        withdrawError={withdrawError}
        onOpenNotificationSettings={() => setEditingTime(retro.time ?? "21:30")}
        onOpenCalendarLink={() => setLinkingCalendar(true)}
        onOpenProfile={() => router.push("/my/profile")}
        onOpenInquiry={() => router.push("/my/inquiry")}
        onOpenTerms={() => void openExternalLink("terms")}
        onOpenPrivacy={() => void openExternalLink("privacy")}
        onSignOut={() => {
          track("logout_clicked", {});
          void signOut();
        }}
        onOpenWithdraw={openWithdraw}
      />
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  sheetCta: { marginTop: 0, marginHorizontal: 0 },
  calendarNoticeHead: { flexDirection: "row", alignItems: "center", gap: space.sm },
});
