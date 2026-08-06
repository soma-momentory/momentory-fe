import { StyleSheet, View } from "react-native";

import { RetroNav } from "@/components/common/RetroNav";
import { Toggle } from "@/components/common/Toggle";
import { RowSeparator, SettingRow } from "@/components/my/SettingRow";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import theme from "@/design/theme";
import { warnRow } from "@/design/tokens.mvp";
import { useSettings, type NotifyKey } from "@/features/my/model/settings";
import { formatKoreanTime } from "@/lib/time";

/**
 * `M3` · 알림 설정
 *
 * **하나의 설정을 두 줄로 나누지 않는다**(`M3.md`) — `[회고 시간 알림]` 한 행이
 * 시각과 켜짐을 함께 담는다. **행을 누르면 시각을 고치고 스위치는 켜고 끄기만**
 * 한다.
 *
 * - **꺼도 설정한 시각은 남는다** — 다시 켜면 그 시각 그대로다. 껐다고 값을
 *   지우면 다시 켜는 일이 다시 설정하는 일이 된다
 * - 시간이 없는 알림(새로운 소식)에는 **`›` 를 두지 않는다** — 누를 곳이 없는
 *   표식을 만들지 않는다
 * - **캘린더는 이 화면에 두지 않는다** — 알림과 데이터 연결은 다른 설정이라
 *   마이 홈의 `[연결 관리]` 에만 있다
 * - **앱 잠금을 두지 않는다** · **회고 완료 축하 토글을 만들지 않는다**
 * - 보호 안내는 **확정된 범위만** 말한다 — "지현님만 볼 수 있어요"는 서버가
 *   복호화할 수 있는 구조에서 지킬 수 없는 약속이라 뺐다
 *
 * ⚠ "기기 알림이 꺼져 있으면…" 줄은 **OS 권한이 실제로 꺼졌을 때만** 나타난다.
 * 그 상태는 아직 화면이 없다(`my.pendingStates`).
 */
const ROWS: readonly { key: NotifyKey; label: string; note: (time: string | null) => string }[] = [
  { key: "retro", label: "회고 시간 알림", note: (t) => `매일 ${formatKoreanTime(t ?? "21:30")}` },
  { key: "daily", label: "낮 기록 리마인드", note: (t) => `하루 한 번 · ${formatKoreanTime(t ?? "14:00")}` },
  { key: "weekly", label: "주간 돌아보기", note: (t) => `일요일 ${formatKoreanTime(t ?? "21:00")}` },
  { key: "news", label: "새로운 소식", note: () => "" },
];

export default function NotifySettings() {
  const notify = useSettings((s) => s.notify);
  const toggle = useSettings((s) => s.toggle);

  return (
    <ScreenBackground>
      <RetroNav title="알림 설정" rest={false} />

      <View style={styles.body}>
        <Card style={styles.rows}>
          {ROWS.map((row, i) => {
            const setting = notify[row.key];
            const note = row.note(setting.time);
            return (
              <View key={row.key}>
                {i > 0 ? <RowSeparator /> : null}
                <SettingRow
                  label={row.label}
                  value={note.length > 0 ? note : undefined}
                  // 시각이 있는 줄만 눌러 고친다 — 없는 줄에는 표식도 두지 않는다
                  // TODO OS 시간 피커 연결 (expo-notifications 도입과 함께)
                  onPress={setting.time == null ? undefined : () => {}}
                  trailing={
                    <Toggle
                      value={setting.enabled}
                      onChange={() => toggle(row.key)}
                      accessibilityLabel={row.label}
                    />
                  }
                />
              </View>
            );
          })}
        </Card>

        {/* 확정된 범위만 말한다 — 지킬 수 없는 약속을 쓰지 않는다 */}
        <View style={styles.warn}>
          <AppText tone="accent" weight="500" style={styles.warnText}>
            기록 보호 방식은 개인정보 처리방침에서 확인할 수 있어요
          </AppText>
        </View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: 10, paddingTop: theme.layout.gap.element },
  rows: { paddingVertical: 4, gap: 0 },
  warn: {
    borderRadius: warnRow.radius,
    paddingVertical: warnRow.paddingVertical,
    paddingHorizontal: warnRow.paddingHorizontal,
    backgroundColor: warnRow.background,
  },
  warnText: { fontSize: warnRow.fontSize, lineHeight: warnRow.fontSize * 1.55 },
});
