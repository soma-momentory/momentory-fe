import { StyleSheet, View } from "react-native";

import { BottomNavigation } from "../../../src/components/ds/BottomNavigation";
import { PreviewTabScreen as Screen } from "../backgrounds/PreviewTabScreen";
import { TabPaperBackground } from "../../../src/components/ds/TabPaperBackground";
import { PreviewFontScaleContext } from "../../../src/components/ds/Text";
import { background, layout } from "../../../src/design/ds";
import { MyMainView } from "../../../src/features/my/ui/MyMainView";

export const myMainScenarios = [
  { id: "default", label: "기본" },
  { id: "no-diaries", label: "기록 0일" },
  { id: "long-nickname", label: "긴 닉네임" },
  { id: "notification-off", label: "알림 꺼짐" },
  { id: "notification-blocked", label: "알림 권한 차단" },
  { id: "calendar-unlinked", label: "캘린더 연결 안 됨" },
  { id: "settings-error", label: "설정 저장 오류" },
  { id: "withdraw-error", label: "탈퇴 오류" },
] as const;

export type MyMainScenarioId = (typeof myMainScenarios)[number]["id"];

const TABS = [
  { name: "홈", label: "홈", icon: "home" },
  { name: "쉼터", label: "쉼터", icon: "heart" },
  { name: "보관함", label: "보관함", icon: "folder-job" },
  { name: "리포트", label: "리포트", icon: "document" },
  { name: "마이", label: "마이", icon: "nav-my-page" },
] as const;

/** 운영 Store/API/권한을 읽지 않는 마이 본문 어댑터. */
export function MyMainPreview({
  design,
  scenarioId,
  fontScale = 1,
  onMessage,
}: {
  design?: import("../../../src/design/studioDesign").StudioDesign;
  scenarioId: string;
  fontScale?: 1 | 1.3 | 1.5;
  onMessage: (message: string) => void;
}) {
  const scenario = myMainScenarios.find((item) => item.id === scenarioId)?.id ?? "default";
  const calendarOn = scenario !== "calendar-unlinked";

  return (
    <PreviewFontScaleContext.Provider value={fontScale}>
      <View style={styles.root}>
        <Screen
          proportional
          padded={false}
          edges={[]}
          grid={false}
          backdrop={<TabPaperBackground tab="마이" />}
        >
          <View style={styles.body}>
            <MyMainView
              design={design}
              nickname={
                scenario === "long-nickname"
                  ? "길고긴닉네임으로마이화면의줄임표와기록일수를확인해요"
                  : "모멘토리"
              }
              recordedDays={scenario === "no-diaries" ? 0 : 12}
              notifyValue={
                scenario === "notification-off" || scenario === "notification-blocked"
                  ? "꺼짐"
                  : "매일 오후 9:30"
              }
              settingsNote={
                scenario === "notification-blocked"
                  ? "기기 설정에서 알림을 켜면 이 시간에 찾아갈게요."
                  : scenario === "settings-error"
                    ? "설정을 저장하지 못했어요. 다시 시도해 주세요."
                    : undefined
              }
              calendarOn={calendarOn}
              withdrawing={false}
              withdrawError={
                scenario === "withdraw-error" ? "탈퇴하지 못했어요. 다시 시도해 주세요." : null
              }
              onOpenNotificationSettings={() => onMessage("알림 설정은 Lab Mock입니다.")}
              onOpenCalendarLink={() => onMessage("캘린더 연동은 Lab Mock입니다.")}
              onOpenProfile={() => onMessage("기본 정보 수정 이동은 Lab Mock입니다.")}
              onOpenInquiry={() => onMessage("문의하기 이동은 Lab Mock입니다.")}
              onOpenTerms={() => onMessage("이용약관 이동은 Lab Mock입니다.")}
              onOpenPrivacy={() => onMessage("개인정보 처리방침 이동은 Lab Mock입니다.")}
              onSignOut={() => onMessage("로그아웃은 Lab Mock입니다.")}
              onOpenWithdraw={() => onMessage("회원 탈퇴 확인은 Lab Mock입니다.")}
            />
          </View>
          <BottomNavigation
            items={TABS}
            active="마이"
            onPress={(tab) => onMessage(`${tab} 탭 이동은 Lab Mock입니다.`)}
          />
          <View style={styles.underTab} />
        </Screen>
      </View>
    </PreviewFontScaleContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  body: { flex: 1, minHeight: 0, paddingHorizontal: layout.screenPadding },
  underTab: { height: layout.minBottomInset, backgroundColor: background.tabBar },
});
