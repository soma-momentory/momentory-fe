import { useEffect, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";

import {
  background,
  elevation,
  hairline,
  interaction,
  label as labelColor,
  layout,
  primary,
  radius,
  size,
  space,
  status,
  text,
  withAlpha,
} from "@/design/ds";

import { Icon } from "./icons/Icon";
import { useVoiceInput, type VoiceEvent } from "./voiceInput";

/**
 * Momentory DS — 대화 입력 독 (`Diary.dc.html` ③ 「자유 입력」).
 *
 * 알약 하나 안에 **여러 줄 입력 + 보내기**가 들어간다. 시안:
 * r22 · 면 `background.elevated` · hairline + 옅은 그림자 · 왼쪽 여백 18 ·
 * 입력은 최대 3줄까지 자라고 그 뒤로는 안에서 스크롤된다.
 *
 * ## 비어 있으면 보내지 못한다
 *
 * `DESIGN.md` §7 「전송/확인 — 값이 비면 비활성」. 빈 턴을 보내면 서버가
 * 되물을 말이 없다. **공백만 적은 것도 빈 것으로 본다.**
 *
 * ## 보내기는 44 다
 *
 * 시안의 원 버튼은 40 인데 **44 로 올렸다** — `metrics.layout.minTouch` 가
 * 44 이고(`ds.test` 가 고정한다), 대화 중 가장 자주 눌리는 버튼을 최소 히트
 * 영역 아래로 내릴 이유가 없다. 알약 높이가 4 커지는 것이 대가다.
 *
 * ## 마이크는 보내기 왼쪽이다 (2026-09-29)
 *
 * 누르면 말을 글자로 바꿔 입력창에 채운다(`voiceInput.ts`). 보내지는 않는다.
 * 한 번 더 누르면 멈춘다.
 *
 * **듣는 중은 빨간 파형이 뛴다**(2026-09-29 · 사용자 요청). 면만 채웠더니 켜진 건지
 * 헷갈렸다 — 녹음은 빨강이 관례라 `status.negative` 를 빌린다. 마이크 자리에 파형이 서서
 * 위아래로 뛰고, 버튼 둘레로 옅은 빨간 빛이 퍼진다. 모양·색·움직임 셋이 함께 바뀌므로
 * 색만으로 말하지 않는다.
 */
/**
 * 한 줄일 때 독의 높이 — 보내기(44) + 위아래 여백 + 테두리. 대화 화면이 그림을 **입력창 위에**
 * 앉힐 때 이 값만큼 띄운다(`ChatScaffold` 의 `companionLift`). 여러 줄로 자라도 그림은 따라 뜨지 않는다.
 */
export const CHAT_DOCK_HEIGHT = layout.minTouch + space.xs * 2 + StyleSheet.hairlineWidth * 2;

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  /** 낭독기가 읽을 이름. 무엇을 적는 자리인지가 화면마다 다르다 */
  accessibilityLabel?: string;
  /** 보낸 뒤 응답을 기다리는 동안 — 입력은 살리고 보내기만 잠근다 */
  disabled?: boolean;
  /** 음성 입력의 상태 변화 — 화면이 계측에 쓴다 */
  onVoice?: (event: VoiceEvent) => void;
};

export function ChatDock({
  value,
  onChangeText,
  onSend,
  placeholder = "답을 적어 주세요",
  accessibilityLabel = "답변",
  disabled = false,
  onVoice,
}: Props) {
  const [focused, setFocused] = useState(false);
  const voice = useVoiceInput({ value, onChangeText, onEvent: onVoice });
  const ready = value.trim().length > 0 && !disabled;

  return (
    <View style={[styles.dock, focused ? styles.docked : null]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={labelColor.assistive}
        accessibilityLabel={accessibilityLabel}
        multiline
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.input}
        // 여러 줄 입력이라 return 은 줄바꿈이다 — 보내기는 버튼이 한다
        blurOnSubmit={false}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={voice.listening ? "음성 입력 멈추기" : "음성으로 입력"}
        accessibilityState={{ selected: voice.listening }}
        onPress={() => void voice.toggle()}
        style={[styles.send, voice.listening ? styles.micListening : null]}
      >
        {voice.listening ? (
          <ListeningPulse />
        ) : (
          <Icon name="mic" size={20} color={labelColor.neutral} />
        )}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="보내기"
        accessibilityState={{ disabled: !ready }}
        disabled={!ready}
        onPress={() => {
          voice.cancel();
          onSend();
        }}
        style={[styles.send, ready ? styles.sendReady : styles.sendIdle]}
      >
        <Icon name="send" size={20} color={ready ? labelColor.onFill : labelColor.disabled} />
      </Pressable>
    </View>
  );
}

/** 파형이 한 번 뛰고 빛이 한 번 퍼지는 시간 */
const PULSE_MS = 900;

/** 듣는 중 — 파형이 위아래로 뛰고 버튼 둘레로 빛이 퍼진다. 움직임은 장식이라 낭독기는 버튼 이름으로 안다 */
function ListeningPulse() {
  // 값은 한 번 만들어 계속 쓴다 (`TypingBubble` 과 같은 방식)
  const [beat] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(beat, { toValue: 1, duration: PULSE_MS, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [beat]);

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            opacity: beat.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
            transform: [{ scale: beat.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }],
          },
        ]}
      />
      <Animated.View
        style={{
          transform: [
            { scaleY: beat.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.5, 1] }) },
          ],
        }}
      >
        <Icon name="pulse" size={20} color={status.negative} />
      </Animated.View>
    </>
  );
}

/**
 * **교보손글씨의 자연 줄 높이 비율** — `hhea` 의 `880 − (−255) + lineGap 0` / 1000.
 * 폰트 파일에서 직접 읽은 값이다(`assets/fonts/KyoboHandwriting2025lyb.ttf`).
 */
const HAND_LINE_RATIO = 1.135;

/**
 * **iOS 입력의 줄 간격 = 글꼴의 자연 줄 높이** (2026-09-13 · 사용자 지적 · iOS 한정).
 *
 * 커서 높이는 iOS 에서 따로 정할 수 없고 **줄 상자를 그대로 따라간다.** 단(`body1`)의
 * 29 를 그대로 쓰면 줄 상자(29)가 글자 덩어리(19 × 1.135 = 21.6)보다 7.4 크고, 글자는
 * 그 상자 **바닥**에 붙는다. 그래서 둘을 **동시에** 가운데 둘 수가 없었다 —
 * 글자를 맞추면 커서가 3.7 뜨고, 커서를 맞추면 글자가 3.7 내려앉는다.
 *
 * **줄 상자를 글자 높이와 같게 만들어 푼다.** 둘이 같아지면 하나를 가운데 두는 것이
 * 곧 둘 다 가운데 두는 것이고, 아래의 `IOS_LEADING_DROP` 도 저절로 0 이 된다
 * (보정이 사라진다 — 계산이 스스로 맞아떨어지는 자리가 맞는 자리다).
 *
 * ⚠ **여러 줄 간격이 29 → 21.6 으로 좁아진다.** 글꼴이 원래 갖고 있는 간격이고
 * 네이티브 입력이 쓰는 값이라 입력칸에서는 자연스럽지만, 말풍선(`body1Reading` 26)과는
 * 다르다 — 읽는 글이 아니라 적는 글이라 여기서만 그렇다.
 * ⚠ 커서가 21.6 으로 짧아진다. 「커서 줄이기」를 취소하셨지만 이건 취향이 아니라
 * **정렬의 조건**이다 — 커서가 글자보다 길면 둘의 가운데가 어긋난다.
 */
const IOS_INPUT_LINE = text.body1.fontSize * HAND_LINE_RATIO;

/** 이 입력이 실제로 차지하는 한 줄 높이 — 안드로이드는 단의 행간 그대로다 */
const INPUT_LINE = Platform.OS === "ios" ? IOS_INPUT_LINE : text.body1.lineHeight;

/**
 * **iOS 에는 줄 간격을 주지 않는다** — 단에서 `lineHeight` 를 떼어 낸 나머지.
 *
 * 값을 21.57(자연 줄 높이)로 맞춰 줘도 어긋났다. RN 이 `lineHeight` 를 주면 iOS 는
 * 문단 스타일의 min/max 줄 높이를 강제하고, 그 과정에서 첫 줄 기준선이 밀린다 —
 * 계산은 맞는데 눈이 안 맞는 자리다(2026-09-13 · 세 번 시도).
 *
 * **안 주면 된다.** 그러면 줄 상자 = 글꼴의 자연 줄 높이 = 글자 덩어리라, 커서도
 * 글자도 같은 상자를 쓴다. 위아래 여백만 똑같이 나눠 주면 둘 다 가운데에 선다.
 * 같은 화면의 입력 pill(`TextField`)이 이 방식이고 가운데가 맞는다 — 확인된 길이다.
 */
const { lineHeight: _body1Leading, ...BODY1_WITHOUT_LEADING } = text.body1;

/** 입력 칸(44) 안에서 한 줄을 가운데 두는 위아래 여백 */
const INPUT_PADDING_Y = (layout.minTouch - INPUT_LINE) / 2;

/**
 * **iOS 가 글자를 아래로 떨어뜨리는 양** (2026-09-13 · 실기기 스크린샷 · iOS 한정).
 *
 * 줄 간격을 주면 iOS 는 글자를 줄 상자의 **바닥에 붙여** 그린다 — 남는 여백이 전부
 * 글자 **위**로 간다. `body1` 은 19/29 인데 이 서체의 자연 줄 높이는 19 × 1.135 =
 * 21.6 이라, 남는 **7.4 가 위에 얹혀** 글자·커서·플레이스홀더가 함께 내려앉는다.
 * 칸(44) 안에서 위아래를 똑같이 나눠 줘도 상자만 가운데이고 글자는 아니었다.
 *
 * **남는 여백의 절반이다.** 글자 덩어리(21.6)가 줄 상자(29) 바닥에 붙으면 그 덩어리의
 * **중심**은 상자 중심보다 `(29 − 21.6) / 2 = 3.7` 만큼 내려간다 — 남는 7.4 전체가
 * 아니다. 2026-09-13 에 7.4 를 올렸다가 그만큼 위로 떠 버려 절반으로 고쳤다.
 *
 * **눈으로 재지 않고 계산한다.** 아래 여백에 이만큼 더 주고 위에서 같은 만큼 뺀다 —
 * 합이 그대로라 칸 높이(44)는 흔들리지 않고, 글자만 그 차이만큼 올라온다. 글꼴
 * 크기가 바뀌어도(iOS 타입 보정 등) 비율에서 다시 계산되므로 어긋나지 않는다.
 *
 * ⚠ 줄 간격을 **지우지 않는 이유**는 여러 줄일 때 줄 사이가 자연 줄 높이(21.6)까지
 * 좁아져서다. 채팅 입력은 세 줄까지 자란다.
 * ⚠ 안드로이드는 `textAlignVertical: "center"` 가 상자 안에서 글자를 가운데 놓아
 * 쏠림이 없다 — 건드리지 않는다.
 */
const IOS_LEADING_DROP =
  Platform.OS === "ios" ? (INPUT_LINE - text.body1.fontSize * HAND_LINE_RATIO) / 2 : 0;

const styles = StyleSheet.create({
  dock: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: space.sm,
    paddingLeft: space.lg,
    padding: space.xs,
    // §7 이 채팅 입력의 반경을 따로 정해 뒀다 — 카드(16)도 필(999)도 아니다
    borderRadius: size.input.chatRadius,
    backgroundColor: background.elevated,
    ...hairline.neutral,
    ...elevation.floating,
  },
  // 포커스는 테두리 색으로만 말한다 — 면을 바꾸면 글자 대비가 함께 흔들린다
  docked: { borderColor: primary.normal },
  input: {
    flex: 1,
    minWidth: 0,
    /**
     * **한 줄일 때 보내기 버튼과 세로 중심이 맞는다.** 칸을 44(버튼과 같은 높이)로
     * 잡고 위아래 9 씩 나눠 준다 — 26(lineHeight) + 9 + 9 = 44.
     *
     * 안드로이드는 여러 줄 입력의 글자를 **위에 붙이므로** `textAlignVertical` 로
     * 한 번 더 가운데로 당긴다(iOS 는 이 속성이 없고 위 패딩이 그 일을 한다).
     * 플레이스홀더가 칸 위쪽에 떠 보이던 것이 이 자리였다.
     */
    minHeight: layout.minTouch,
    textAlignVertical: "center",
    // 세 줄까지 자라고 그 뒤로는 안에서 스크롤된다 (§7 `maxLines`)
    maxHeight: INPUT_LINE * size.input.maxLines + INPUT_PADDING_Y * 2,
    // 위에서 뺀 만큼 아래에 더한다 — 합은 그대로라 칸 높이(44)가 안 흔들린다
    paddingTop: Math.max(INPUT_PADDING_Y - IOS_LEADING_DROP, 0),
    paddingBottom: INPUT_PADDING_Y + IOS_LEADING_DROP,
    paddingHorizontal: 0,
    // iOS 는 줄 간격을 빼고 준다 — `BODY1_WITHOUT_LEADING` 머리말
    ...(Platform.OS === "ios" ? BODY1_WITHOUT_LEADING : text.body1),
    color: labelColor.normal,
  },
  send: {
    width: layout.minTouch,
    height: layout.minTouch,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  sendReady: { backgroundColor: primary.heavy },
  micListening: { backgroundColor: withAlpha(status.negative, 0.12) },
  glow: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.full,
    backgroundColor: status.negative,
  },
  sendIdle: { backgroundColor: interaction.disabled },
});
