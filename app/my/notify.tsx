import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useEffect, useState } from "react";
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
import {
  getNotificationPermission,
  requestNotificationPermission,
  type NotificationPermission,
} from "@/lib/notifications";
import { dateAtTime, formatKoreanTime, toHHMM } from "@/lib/time";

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
 * ⚠ **"기기 알림이 꺼져 있으면…" 줄은 OS 권한이 실제로 꺼졌을 때만** 나타난다
 * (`M3.md`). 시안에 그 상태가 없어(`my.pendingStates`) 문구는 우리가 썼다 —
 * `docs/PRODUCT.md` 「상류와 차이」.
 *
 * **스위치를 켜는 것과 알림이 오는 것은 다르다.** 켤 때 OS 권한을 확인해서,
 * 권한이 없으면 **스위치를 켜지 않는다** — 켜진 채 아무 알림도 오지 않으면
 * 사용자는 확인할 방법이 없다(`ARCHITECTURE §8` 의 앱 잠금과 같은 이유).
 * 이미 거부해 앱이 다시 물을 수 없을 때만 한 줄로 길을 알려준다 —
 * 모달도 재시도 버튼도 두지 않는다(`RULES.md` 4).
 *
 * **「새로운 소식」은 권한을 묻지 않는다** — 서버 푸시가 필요한 설정인데 MVP 에
 * 푸시 인프라가 없다. 지금은 값만 받아 둔다(`features/my/model/reminders.ts`).
 */
const ROWS: readonly { key: NotifyKey; label: string; note: (time: string | null) => string }[] = [
  { key: "retro", label: "회고 시간 알림", note: (t) => `매일 ${formatKoreanTime(t ?? "21:30")}` },
  {
    key: "daily",
    label: "낮 기록 리마인드",
    note: (t) => `하루 한 번 · ${formatKoreanTime(t ?? "14:00")}`,
  },
  {
    key: "weekly",
    label: "주간 돌아보기",
    note: (t) => `일요일 ${formatKoreanTime(t ?? "21:00")}`,
  },
  { key: "news", label: "새로운 소식", note: () => "" },
];

export default function NotifySettings() {
  const notify = useSettings((s) => s.notify);
  const toggle = useSettings((s) => s.toggle);
  const setTime = useSettings((s) => s.setTime);

  /** 시각을 고치는 중인 줄. **행을 눌러야 열린다** — 스위치는 켜고 끄기만 한다 */
  const [editing, setEditing] = useState<NotifyKey | null>(null);
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

  const onPick = (key: NotifyKey) => (_e: DateTimePickerEvent, date?: Date) => {
    setEditing(null);
    // 껐다 켜도 이 값은 남는다 — enabled 와 따로 저장한다
    if (date) setTime(key, toHHMM(date));
  };

  const onToggle = async (key: NotifyKey) => {
    // 끄는 것과 「새로운 소식」(서버 푸시)은 OS 권한과 상관이 없다
    if (notify[key].enabled || key === "news") {
      toggle(key);
      return;
    }

    const result = await requestNotificationPermission();
    setPermission(result);
    // 받지 못하면 켜지 않는다 — 지킬 수 없는 스위치를 켜 두지 않는다
    if (result.granted) toggle(key);
  };

  // 앱이 다시 물을 수 있는 동안에는 안내하지 않는다 — 스위치가 곧 그 물음이다
  const blocked = permission != null && !permission.granted && !permission.canAskAgain;

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
                  onPress={setting.time == null ? undefined : () => setEditing(row.key)}
                  trailing={
                    <Toggle
                      value={setting.enabled}
                      onChange={() => void onToggle(row.key)}
                      accessibilityLabel={row.label}
                    />
                  }
                />
                {editing === row.key && setting.time != null ? (
                  <DateTimePicker
                    mode="time"
                    value={dateAtTime(setting.time)}
                    onChange={onPick(row.key)}
                  />
                ) : null}
              </View>
            );
          })}
        </Card>

        {/* 거부는 한 줄로 흡수한다 — 모달도 재시도 버튼도 경고 아이콘도 없다 */}
        {blocked ? (
          <AppText variant="caption" tone="caption" style={styles.blockedNote}>
            기기 설정에서 알림을 켜면 이 시간에 찾아갈게요.
          </AppText>
        ) : null}

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
  // 카드 밖 한 줄 — 카드 안에 넣으면 설정 항목처럼 읽힌다
  blockedNote: { paddingHorizontal: 2, lineHeight: 20 },
  warn: {
    borderRadius: warnRow.radius,
    paddingVertical: warnRow.paddingVertical,
    paddingHorizontal: warnRow.paddingHorizontal,
    backgroundColor: warnRow.background,
  },
  warnText: { fontSize: warnRow.fontSize, lineHeight: warnRow.fontSize * 1.55 },
});
