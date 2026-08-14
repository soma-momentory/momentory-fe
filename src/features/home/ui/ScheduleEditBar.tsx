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
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { AppText } from "@/components/primitives/AppText";
import { paperColors, paperHomeCard, paperRadius, paperTypography } from "@/design/paper";

/**
 * 일정 입력 바 — **추가(`12-e`)와 수정(`12-c`)이 같은 바를 쓴다**
 * (`docs/design/app-flow.md` §2.1 · `홈.dc.html`).
 *
 * 시안은 시트가 아니라 **화면 아래에서 올라오는 알약 입력**이다:
 * `＋ 추가` 는 빈 바를, 제목 탭은 **기존 값이 담긴 바 + 🗑 삭제**를 연다.
 * 하나의 바가 둘을 다 하므로 「추가」와 「수정」의 조작이 갈리지 않는다.
 *
 * - 확정은 **완료 또는 키보드의 확인** 한 곳. 빈 제목이면 잠긴다
 * - 화면 아무 데나 누르면 닫힌다(`app-flow.md` §3 입력 레이어 규칙) —
 *   투명 오버레이가 바보다 **뒤에** 있어야 바 안쪽 탭이 먹힌다
 * - 삭제는 **확인을 한 번 묻는다**(시안의 확인 모달) — 되돌릴 수 없기 때문이다.
 *   가져온 일정은 지우는 것이 아니라 숨기는 것이라 묻지 않는다
 */
type Props = {
  /** 편집이면 기존 제목이 담겨 온다 */
  initialTitle?: string;
  /** 편집 모드의 지우기. 넘기지 않으면 🗑 을 그리지 않는다(추가 모드) */
  onDelete?: () => void;
  /** 지우기 확인 문구 — 「삭제」와 「숨기기」가 다른 말을 한다 */
  deleteLabel?: string;
  deleteConfirm?: string | null;
  /** 제목을 고칠 수 없는 일정(캘린더에서 가져온 것) */
  readOnly?: boolean;
  onSubmit: (title: string) => void;
  /** 바 왼쪽의 원 — 그 일정의 마침 상태를 그대로 비춘다 */
  circleColor?: string;
  hint: string;
};

export function ScheduleEditBar({
  initialTitle = "",
  onDelete,
  deleteLabel = "삭제",
  deleteConfirm = null,
  readOnly = false,
  onSubmit,
  circleColor,
  hint,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [asking, setAsking] = useState(false);
  const ready = title.trim().length > 0;

  const close = () => router.back();
  const submit = () => {
    if (!ready || readOnly) return;
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
        style={styles.dock}
      >
        {/* 바 아래를 종이로 덮는다 — 시안은 입력이 열리면 탭바가 내려가는데
            시트가 라우트라 탭바를 내릴 수 없다. 대신 위쪽만 페이드로 흐린다
            (`app-flow.md` §3-1 의 뜻을 같은 결과로 지킨다) */}
        <Svg style={styles.fade} pointerEvents="none">
          <Defs>
            <LinearGradient id="editFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={paperColors.bg.paper} stopOpacity={0} />
              <Stop offset="1" stopColor={paperColors.bg.paper} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#editFade)" />
        </Svg>

        <AppText style={styles.hint}>{hint}</AppText>

        <View style={styles.bar}>
          <View
            style={[styles.circle, circleColor != null ? { backgroundColor: circleColor } : null]}
          />
          <TextInput
            value={title}
            onChangeText={setTitle}
            editable={!readOnly}
            autoFocus={!readOnly}
            returnKeyType="done"
            onSubmitEditing={submit}
            placeholder="무엇을 할까요?"
            placeholderTextColor={paperColors.text.faint}
            selectionColor={paperColors.brand.greenDark}
            style={styles.input}
            accessibilityLabel="일정 제목"
          />
          {onDelete != null ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={deleteLabel}
              hitSlop={10}
              onPress={() => (deleteConfirm != null ? setAsking(true) : onDelete())}
              style={styles.trash}
            >
              {/* 🗑 대신 선으로 그린 통 — 이모지를 쓰지 않는다 */}
              <View style={styles.trashLid} />
              <View style={styles.trashBody} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={close}>
            <AppText style={styles.cancel}>취소</AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !ready || readOnly }}
            disabled={!ready || readOnly}
            onPress={submit}
            style={[styles.done, !ready || readOnly ? styles.doneOff : null]}
          >
            <AppText weight="700" style={styles.doneLabel}>
              완료
            </AppText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* 확인 모달 — 지우는 것은 되돌릴 수 없다 */}
      {asking && deleteConfirm != null ? (
        <View style={styles.modalRoot}>
          <Pressable
            style={[StyleSheet.absoluteFill, styles.modalDim]}
            accessibilityRole="button"
            accessibilityLabel="확인 닫기"
            onPress={() => setAsking(false)}
          />
          <View style={styles.modal}>
            <AppText weight="700" style={styles.modalTitle}>
              {deleteConfirm}
            </AppText>
            <View style={styles.modalRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setAsking(false)}
                style={[styles.modalButton, styles.modalCancel]}
              >
                <AppText weight="700" style={styles.modalCancelLabel}>
                  그대로 둘게요
                </AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onDelete}
                style={[styles.modalButton, styles.modalDelete]}
              >
                <AppText weight="700" style={styles.modalDeleteLabel}>
                  {deleteLabel}
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const { styles: type } = paperTypography;

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  dock: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    gap: 10,
    backgroundColor: paperColors.bg.paper,
  },
  // 종이 면이 시작되는 자리를 부드럽게 — 뒤의 잔디에서 이어지는 것처럼
  fade: { position: "absolute", left: 0, right: 0, top: -28, height: 28 },
  hint: {
    fontSize: type.caption.fontSize,
    lineHeight: type.caption.lineHeight,
    color: paperColors.text.mutedWarmText,
    textAlign: "center",
  },
  // 알약 입력 — 홈의 카드와 같은 잉크 테두리라 같은 종이 위의 것으로 읽힌다
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: paperRadius.pill,
    backgroundColor: paperColors.bg.card,
    borderWidth: paperHomeCard.borderWidth,
    borderColor: paperHomeCard.borderColor,
    ...paperHomeCard.shadow,
  },
  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: paperColors.neutral.task,
  },
  input: {
    flex: 1,
    fontFamily: paperTypography.fontFamily.regular,
    fontSize: type.cardTitle.fontSize,
    lineHeight: type.cardTitle.lineHeight,
    color: paperColors.text.primaryHome,
    padding: 0,
  },
  trash: { width: 22, height: 22, alignItems: "center", justifyContent: "center", gap: 2 },
  trashLid: {
    width: 16,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: paperColors.accent.dangerFill,
  },
  trashBody: {
    width: 12,
    height: 13,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: paperColors.accent.dangerFill,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },

  actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cancel: {
    minHeight: 44,
    lineHeight: 44,
    fontSize: type.bodyLg.fontSize,
    color: paperColors.text.mutedWarmText,
  },
  done: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 22,
    borderRadius: paperRadius.pill,
    backgroundColor: paperColors.brand.greenDark,
  },
  doneOff: { opacity: 0.36 },
  doneLabel: {
    fontSize: type.bodyLg.fontSize,
    lineHeight: type.bodyLg.lineHeight,
    color: paperColors.text.onFill,
  },

  modalRoot: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  modalDim: { backgroundColor: paperColors.overlay.dim },
  modal: {
    left: 0,
    right: 0,
    marginHorizontal: 30,
    alignSelf: "stretch",
    gap: 16,
    padding: 22,
    borderRadius: paperRadius.cardHome,
    backgroundColor: paperColors.bg.cardOpaque,
  },
  modalTitle: {
    fontSize: type.cardTitle.fontSize,
    lineHeight: type.cardTitle.lineHeight,
    textAlign: "center",
    color: paperColors.text.primary,
  },
  modalRow: { flexDirection: "row", gap: 10 },
  modalButton: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: paperRadius.pill,
  },
  modalCancel: { borderWidth: 1.5, borderColor: paperColors.neutral.tabInactiveBorder },
  modalCancelLabel: { fontSize: type.bodySm.fontSize, color: paperColors.text.primary },
  modalDelete: { backgroundColor: paperColors.accent.dangerFill },
  modalDeleteLabel: { fontSize: type.bodySm.fontSize, color: paperColors.text.onFill },
});
