import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, IconButton, Text } from "@/components/ds";
import {
  background,
  elevation,
  fontFamily,
  hairline,
  interaction,
  label as labelColor,
  layout,
  primary,
  radius,
  size,
  space,
  text,
} from "@/design/ds";

/**
 * 일정 입력 바 — **추가(`12-e`)와 수정(`12-c`)이 같은 바를 쓴다**
 * (`Schedule.dc.html` 4-1·4-3 · `design.md` 「일정」).
 *
 * 시안의 규칙 그대로:
 * - **추가**: `＋ 추가` → 하단 알약 + 키보드. 확정은 **바 안의 ＋ 또는 키보드
 *   `완료`** 두 곳이고, **빈 값이면 둘 다 비활성**이다
 * - **수정**: 같은 바에 **Primary 링 + `일정 수정` 캡션**만 더한다. 취소 / 저장
 * - **삭제는 여기 없다.** 줄의 ⋮ 메뉴로 옮겼다(시안 4-2) — 지우는 길과 고치는
 *   길이 한 자리에 있으면 고치러 왔다가 지우게 된다
 *
 * ## 화면이지만 시트다
 *
 * 라우트로 열리고 **닫기는 `router.back()`** 이다(`PLAN.md` A-4) — 기기 뒤로가기·
 * 스와이프백이 그대로 닫기가 된다. 바깥 아무 데나 눌러도 닫힌다: 투명 레이어가
 * 바보다 **뒤에** 있어야 바 안쪽 탭이 먹힌다.
 */
type Props = {
  /** `add` 는 빈 바 + ＋ · `edit` 는 값이 담긴 바 + 취소/저장 */
  mode: "add" | "edit";
  initialTitle?: string;
  /** 캘린더에서 가져온 일정 — 제목을 고칠 수 없다(`12-c`) */
  readOnly?: boolean;
  onSubmit: (title: string) => void;
  /** 바 위 한 줄 — 수정이면 「일정 수정」, 추가면 어디에 저장되는지 */
  caption: string;
};

export function ScheduleEditBar({
  mode,
  initialTitle = "",
  readOnly = false,
  onSubmit,
  caption,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const insets = useSafeAreaInsets();
  const editing = mode === "edit";
  const ready = title.trim().length > 0 && !readOnly;

  const close = () => router.back();
  const submit = () => {
    if (!ready) return;
    onSubmit(title);
    close();
  };

  return (
    <View style={styles.root}>
      {/* 딤 없는 레이어 — 탭만 받는다. 바보다 뒤에 있어야 바 안쪽이 눌린다 */}
      <Pressable
        style={StyleSheet.absoluteFill}
        accessibilityRole="button"
        accessibilityLabel="닫기"
        onPress={close}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.dock, { paddingBottom: Math.max(insets.bottom, space.md) }]}
      >
        <Text variant="caption1" color={labelColor.alternative} style={styles.caption}>
          {caption}
        </Text>

        <View style={[styles.bar, editing ? styles.barEditing : null]}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            editable={!readOnly}
            autoFocus={!readOnly}
            returnKeyType="done"
            onSubmitEditing={submit}
            placeholder={editing ? undefined : "어떤 일정을 더할까요?"}
            placeholderTextColor={labelColor.assistive}
            selectionColor={primary.normal}
            style={styles.input}
            accessibilityLabel="일정 제목"
          />
          {editing ? (
            // 되돌릴 길 — 값이 있을 때만 붙는다(시안 4-3 의 지우기 ×)
            title.length > 0 && !readOnly ? (
              <IconButton
                name="close"
                size={size.icon.sm}
                accessibilityLabel="제목 지우기"
                color={labelColor.assistive}
                onPress={() => setTitle("")}
                style={styles.clear}
              />
            ) : null
          ) : (
            <IconButton
              name="plus"
              size={size.icon.md}
              accessibilityLabel="일정 추가"
              color={ready ? labelColor.onFill : labelColor.disabled}
              disabled={!ready}
              onPress={submit}
              // 채운 원 — 비활성은 §6 의 비활성 면·라벨로 말한다
              style={StyleSheet.flatten([
                styles.add,
                { backgroundColor: ready ? primary.heavy : interaction.disabled },
              ])}
            />
          )}
        </View>

        {/* 수정에만 취소/저장이 붙는다 — 추가는 ＋ 하나로 끝난다 */}
        {editing ? (
          <View style={styles.actions}>
            <Button label="취소" variant="outlined" onPress={close} style={styles.cancel} />
            <Button label="저장" disabled={!ready} onPress={submit} style={styles.save} />
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  // 바 아래는 앱 배경으로 덮는다 — 시안은 바가 페이지 위에 앉아 있다
  dock: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: space.md,
    gap: space.sm,
    backgroundColor: background.normal,
  },
  caption: { paddingLeft: space.xs2 + space.xs },
  // 입력 pill — radius Full · 오른쪽에 버튼이 앉을 만큼만 여백을 준다(§7)
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: 60,
    paddingLeft: 18,
    paddingRight: space.sm,
    borderRadius: radius.full,
    backgroundColor: background.elevated,
    ...hairline.neutral,
    ...elevation.floating,
  },
  // 수정임을 링 하나로 말한다 — 캡션과 함께 두 신호다(색만으로 말하지 않는다)
  barEditing: { borderWidth: 1, borderColor: primary.normal },
  input: {
    flex: 1,
    // 입력값은 Regular 400 (`design.md` §2)
    fontFamily: fontFamily.regular,
    fontSize: text.body1Reading.fontSize,
    lineHeight: text.body1Reading.lineHeight,
    color: labelColor.normal,
    padding: 0,
  },
  clear: { width: size.icon.lg, height: size.icon.lg },
  add: { width: layout.minTouch, height: layout.minTouch, borderRadius: radius.full },
  actions: { flexDirection: "row", gap: space.sm },
  // 시안의 1 : 2 — 머무는 쪽보다 나아가는 쪽이 넓다
  cancel: { flex: 1 },
  save: { flex: 2 },
});
