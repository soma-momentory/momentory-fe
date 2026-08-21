import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { KeyboardAvoidingView, StyleSheet, View } from "react-native";

import { Button, Screen, Text, TopNavigation } from "@/components/ds";
import { space, status } from "@/design/ds";
import { saveBasicInfo, type BasicInfo } from "@/features/my/model/basicInfo";

/**
 * 기본 정보 수정 상세(`M4`~`M8`)가 공유하는 껍데기 — 상단바 + 고치는 자리 + `저장`.
 *
 * 다섯 화면이 모양도 규칙도 같다(`My.dc.html` 「규칙」):
 *
 * - **설명 문구도 건너뛰기도 다음도 없다** — 기존 값이 채워진 상태로 시작한다.
 *   온보딩의 **입력 컴포넌트**만 재사용하고 온보딩 **플로우**는 재사용하지 않는다
 * - `저장` 은 **하단 full-width** 고정이고, 키보드가 올라오면 그 바로 위에 붙는다
 *   (`DESIGN.md` §7 키보드 규칙 — `KeyboardAvoidingView` 가 맡는다)
 * - 저장이 끝나면 **`M3` 목록으로 돌아간다**
 *
 * ## 저장 버튼의 세 상태
 *
 * 그대로면 잠기고, 바꾸면 열리고, **원래 값으로 되돌리면 다시 잠긴다.**
 * 그래서 「건드렸는가」가 아니라 **「지금 값이 저장된 값과 다른가」**로 판단한다
 * (`changed` — 화면이 `sameChoices` 등으로 계산해 넘긴다).
 *
 * 실패는 버튼 아래 **한 줄**로 흡수한다 — 화면을 닫지 않고 모달도 재시도 버튼도
 * 두지 않는다(`RULES.md` 4). 다시 누를 곳은 `저장` 하나다.
 */
type Props = {
  /** 상단바 제목 — 「닉네임」·「나이」처럼 **고치는 것의 이름**이다 */
  title: string;
  /** 저장된 값과 다른가. 되돌리면 다시 `false` 여야 한다 */
  changed: boolean;
  /** 보낼 수 있는 값인가 (빈 닉네임 · 「기타」를 켠 채 비워 둔 것 등) */
  ready?: boolean;
  /** 이 화면이 고친 항목만. 나머지는 `saveBasicInfo` 가 지금 값으로 채운다 */
  patch: Partial<BasicInfo>;
  children: ReactNode;
};

export function BasicInfoEditor({ title, changed, ready = true, patch, children }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);

    const result = await saveBasicInfo(patch);
    setSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    // 저장 후 M3 복귀 (`DESIGN.md` 「마이」)
    router.back();
  };

  return (
    <Screen>
      <TopNavigation leading="arrow-left" title={title} onLeadingPress={() => router.back()} />

      {/* 키보드는 **양쪽 다** 피한다 — edge-to-edge(Expo SDK 54+)에서는 안드로이드
          창이 `adjustResize` 로 줄지 않고 키보드가 그 위를 덮는다(`ChatScaffold`) */}
      <KeyboardAvoidingView style={styles.fill} behavior="padding">
        <View style={styles.body}>{children}</View>

        <View style={styles.dock}>
          <Button
            label="저장"
            fill
            disabled={!changed || !ready || saving}
            onPress={() => void save()}
          />
          {/* 실패는 경고 아이콘도 모달도 없이 글자 한 줄이다 */}
          {error != null ? (
            <Text variant="caption1" color={status.negative}>
              {error}
            </Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 0 },
  body: { flex: 1, minHeight: 0, gap: space.md, paddingTop: space.lg },
  dock: { gap: space.sm, paddingTop: space.md },
});
