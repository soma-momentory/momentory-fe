import { Redirect } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";

import { AnswerBubble } from "@/components/chat/AnswerBubble";
import { Avatar } from "@/components/chat/Avatar";
import { BabaBubble } from "@/components/chat/BabaBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { TypingDots } from "@/components/chat/TypingDots";
import { DirectionSheet } from "@/components/common/DirectionSheet";
import { RetroNav } from "@/components/common/RetroNav";
import { AppButton } from "@/components/primitives/AppButton";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import theme from "@/design/theme";
import { EMOTION_ADNOMINAL, useRetro } from "@/features/retro/model/retro";
import { SAMPLE_USER } from "@/mocks/sample";

/**
 * `C4` 대화 · 첫 질문 + `C4-b` 첫 이야기와 되짚기 + `C4-c`/`C4-c2` 방향 시트
 *
 * **바바가 일정을 먼저 지목하지 않는다**(`C4.md`) — "면접 스터디는 어땠어요?"로
 * 열면 오늘의 화제를 바바가 정하는 것이 된다. 무엇을 이야기하고 싶은지부터 묻고,
 * 일정에 없던 일도 괜찮다고 먼저 말한다.
 *
 * **되짚기까지만 하고 멈춘다**(`C4-b.md`) — 바바가 들은 것을 되돌려 말하는 데서
 * 끊고 다음 질문을 이어 붙이지 않는다. "그때 스스로에게 어떤 말을 했나요?"는
 * 이미 한 방향(다른 관점에서 보기)을 고른 질문이라, **묻기 전에 방향을 함께
 * 정한다**. 그래서 되짚기 뒤에 방향 시트가 열린다.
 *
 * - 한 메시지는 **2~3문장**, 질문은 한 번에 **하나**
 * - 감정은 **단정하지 않고 확인한다**
 * - **빠른 답변 칩·예시 placeholder 를 두지 않는다**
 * - **지난 버블을 삭제하지 않는다** — 회고는 스스로 한 말을 되읽는 과정이라
 *   위로 스크롤하면 그대로 남아 있다
 * - **진행률·단계 번호를 노출하지 않는다**
 *
 * ⚠ **바바의 응답이 아직 고정 문장이다.** 실제 응답은 서버가 만드는데 BE 연결이
 * 마지막이라(2026-08-07 결정), 지금은 `9-mvp.mjs` 의 시안 문장을 그대로 쓴다.
 * 대화 흐름·상태·규칙은 진짜이고 문장을 만드는 곳만 나중에 갈린다.
 */

/** 시안(`9-mvp.mjs`)의 첫 질문. 일정에 없던 일도 괜찮다고 먼저 말한다 */
const FIRST_QUESTION =
  "오늘은 어떤 이야기를 나누고 싶어요? 일정에 없던 일이나 지금 떠오른 생각도 괜찮아요.";

/** 되짚기 — 들은 것만 다시 말한다. 사용자가 말하지 않은 성공·교훈을 만들지 않는다 */
const MIRROR =
  "답이 막힌 순간이 계속 마음에 남았군요. 다른 사람들과 비교하면서 자신감도 많이 내려간 것 같아요.";

/** 바바가 답을 쓰는 것처럼 보이는 시간. 실제 응답이 붙으면 스트리밍이 이 자리를 쓴다 */
const TYPING_MS = 900;

export default function RetroTalk() {
  const startEmotion = useRetro((s) => s.startEmotion);
  const turns = useRetro((s) => s.turns);
  const direction = useRetro((s) => s.direction);
  const addTurn = useRetro((s) => s.addTurn);
  const setDirection = useRetro((s) => s.setDirection);

  const [typing, setTyping] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current != null) clearTimeout(timer.current); }, []);

  // 감정 없이 들어올 수 없다 — C3 이 필수이기 때문이다(C3.md)
  if (startEmotion == null) return <Redirect href="/retro/emotion" />;

  // 되짚기가 나왔고 방향을 아직 안 골랐으면 다음은 방향이다
  const mirrored = turns.some((t) => t.who === "baba" && t.text === MIRROR);
  const awaitingDirection = mirrored && direction == null;

  const send = (text: string) => {
    addTurn("me", text);
    setTyping(true);
    timer.current = setTimeout(() => {
      setTyping(false);
      addTurn("baba", MIRROR);
      // 되짚기 다음이 방향이다 — 바로 일기로 가면 행동 카드를 만들 재료가 없다
      setSheetOpen(true);
    }, TYPING_MS);
  };

  return (
    <ScreenBackground>
      <RetroNav emotion={startEmotion} />

      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ChatLayout>
          <Avatar />

          {/* 감정을 단정하지 않고 확인한다 — 상단 알약과 같은 감정을 말로도 한 번 */}
          <BabaBubble index={0}>
            {`${SAMPLE_USER.nickname}님, 지금은 ${EMOTION_ADNOMINAL[startEmotion]} 마음이 가장 가까이 있군요.`}
          </BabaBubble>
          <BabaBubble index={1}>{FIRST_QUESTION}</BabaBubble>

          {turns.map((t) =>
            t.who === "me" ? (
              <AnswerBubble key={t.id}>{t.text}</AnswerBubble>
            ) : (
              <BabaBubble key={t.id}>{t.text}</BabaBubble>
            ),
          )}

          {typing ? <TypingDots /> : null}
        </ChatLayout>

        <View style={styles.bottom}>
          {awaitingDirection && !sheetOpen ? (
            /*
              시트를 닫으면 아무것도 저장되지 않는다(`C4-c2.md`) — 그래서 다시
              여는 길이 필요하다. 시안에는 이 자리가 없다: 닫은 뒤의 상태가
              MVP 화면에 없어서다. 문구·형태는 상류 확인 후보다(`TASKS.md`).
            */
            <AppButton label="이야기 방향 고르기" onPress={() => setSheetOpen(true)} />
          ) : (
            <ChatInput onSend={send} disabled={typing || awaitingDirection} />
          )}
        </View>
      </KeyboardAvoidingView>

      {sheetOpen ? (
        <DirectionSheet
          onDismiss={() => setSheetOpen(false)}
          onConfirm={(d) => {
            // 누른 순간이 아니라 여기서 확정된다
            setDirection(d);
            setSheetOpen(false);
            // TODO C4-d — 고른 방향의 질문을 잇는다 (다음 PR)
          }}
        />
      ) : null}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bottom: { paddingTop: theme.layout.gap.element },
});
