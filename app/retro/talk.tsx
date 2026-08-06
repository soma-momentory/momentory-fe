import { Redirect } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";

import { AnswerBubble } from "@/components/chat/AnswerBubble";
import { Avatar } from "@/components/chat/Avatar";
import { BabaBubble } from "@/components/chat/BabaBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { DirectionChip } from "@/components/chat/DirectionChip";
import { TypingDots } from "@/components/chat/TypingDots";
import { DirectionSheet } from "@/components/common/DirectionSheet";
import { RetroNav } from "@/components/common/RetroNav";
import { AppButton } from "@/components/primitives/AppButton";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import theme from "@/design/theme";
import {
  ACTION_ANSWER_INDEX,
  BALANCE_ANSWER_INDEX,
  EMOTION_ADNOMINAL,
  FOLLOW_UPS,
  directionOf,
  useRetro,
  type RetroDirection,
} from "@/features/retro/model/retro";
import { SAMPLE_USER } from "@/mocks/sample";

/**
 * 회고 대화 한 줄 — `C4` → `C4-b` → `C4-c`/`C4-c2` → `C4-d` → `C4-e`.
 *
 * 다섯 화면이 한 파일인 이유는 **같은 대화의 다른 순간**이기 때문이다. 라우트를
 * 나누면 뒤로가기가 대화를 되감는 것처럼 보이는데, 회고는 되감는 흐름이 아니다.
 *
 * - `C4` — **바바가 일정을 먼저 지목하지 않는다.** 무엇을 이야기하고 싶은지부터 묻는다
 * - `C4-b` — **되짚기까지만 하고 멈춘다.** 다음 질문은 방향을 정한 뒤다
 * - `C4-c`/`C4-c2` — 방향 시트(`DirectionSheet`)
 * - `C4-d` — **시트가 닫히면 대화가 그 자리에서 이어진다.** 되짚은 말 아래에
 *   방향 칩이 한 줄 남고 그다음이 그 방향의 첫 질문이다. 칩이 경계선 역할을 한다
 * - `C4-e` — **입력칸을 내리고 `[일기 보러 가기]` 하나만** 두어 대화가 끝났다는
 *   것을 자리로 알린다
 *
 * 공통으로 지키는 것:
 * - 한 메시지는 2~3문장, 질문은 한 번에 하나. 기본 **3~5회 답변** 안에 마무리
 * - **지난 버블을 삭제하지 않는다** — 위로 올리면 그대로 있다
 * - 내부 흐름(감정 확인 → 관점 전환 → 균형 근거 → 사용자 문장 → 작은 행동)의
 *   **단계 이름을 화면에 쓰지 않는다.** 진행률·단계 번호도 없다
 * - **사용자가 말하지 않은 성공·교훈을 만들지 않는다**
 *
 * ⚠ **바바의 응답은 아직 고정 문장이다**(`FOLLOW_UPS` 주석) — 흐름·상태·규칙은
 * 진짜이고 문장을 만드는 곳만 서버로 갈린다.
 */
const FIRST_QUESTION =
  "오늘은 어떤 이야기를 나누고 싶어요? 일정에 없던 일이나 지금 떠오른 생각도 괜찮아요.";

/** 되짚기 — 들은 것만 다시 말한다 */
const MIRROR =
  "답이 막힌 순간이 계속 마음에 남았군요. 다른 사람들과 비교하면서 자신감도 많이 내려간 것 같아요.";

/** 바바가 답을 쓰는 것처럼 보이는 시간. 실제 응답이 붙으면 스트리밍이 이 자리를 쓴다 */
const TYPING_MS = 900;

export default function RetroTalk() {
  const startEmotion = useRetro((s) => s.startEmotion);
  const turns = useRetro((s) => s.turns);
  const addTurn = useRetro((s) => s.addTurn);
  const setDirection = useRetro((s) => s.setDirection);
  const setBalanceSentence = useRetro((s) => s.setBalanceSentence);
  const setNextAction = useRetro((s) => s.setNextAction);

  const [typing, setTyping] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current != null) clearTimeout(timer.current); }, []);

  // 감정 없이 들어올 수 없다 — C3 이 필수이기 때문이다(C3.md)
  if (startEmotion == null) return <Redirect href="/retro/emotion" />;

  // 방향을 바꾸면 칩이 하나 더 붙는다 — 세는 기준은 **마지막** 칩이다
  const chipAt = turns.map((t) => t.who).lastIndexOf("chip");
  const answered = chipAt < 0 ? 0 : turns.slice(chipAt).filter((t) => t.who === "me").length;

  const mirrored = turns.some((t) => t.who === "baba" && t.text === MIRROR);
  const awaitingDirection = mirrored && chipAt < 0;
  // 마지막 묶음까지 나왔으면 대화가 끝났다
  const finished = chipAt >= 0 && answered >= FOLLOW_UPS.length && !typing;

  const reply = (lines: readonly string[]) => {
    setTyping(true);
    timer.current = setTimeout(() => {
      setTyping(false);
      lines.forEach((line) => addTurn("baba", line));
    }, TYPING_MS);
  };

  const send = (text: string) => {
    addTurn("me", text);

    if (chipAt < 0) {
      // 첫 이야기 — 되짚고 멈춘다. 다음은 방향이다
      setTyping(true);
      timer.current = setTimeout(() => {
        setTyping(false);
        addTurn("baba", MIRROR);
        setSheetOpen(true);
      }, TYPING_MS);
      return;
    }

    // 방향을 고른 뒤 — 이 답이 몇 번째인지가 무엇의 재료인지를 정한다
    const n = answered + 1;
    if (n === BALANCE_ANSWER_INDEX) setBalanceSentence(text); //  C6 일기
    if (n === ACTION_ANSWER_INDEX) setNextAction(text); //        C6-b 행동 카드

    const group = FOLLOW_UPS[n - 1];
    if (group != null) reply(group);
  };

  const confirmDirection = (d: RetroDirection) => {
    const picked = directionOf(d);
    setDirection(d);
    setSheetOpen(false);
    if (picked == null) return;
    // 칩이 경계선이고, 그다음 줄이 그 방향의 첫 질문이다
    addTurn("chip", picked.chip);
    reply([`좋아요. ${picked.question}`]);
  };

  return (
    <ScreenBackground>
      <RetroNav emotion={startEmotion} />

      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ChatLayout stickToEnd>
          <Avatar />

          {/* 감정을 단정하지 않고 확인한다 — 상단 알약과 같은 감정을 말로도 한 번 */}
          <BabaBubble index={0}>
            {`${SAMPLE_USER.nickname}님, 지금은 ${EMOTION_ADNOMINAL[startEmotion]} 마음이 가장 가까이 있군요.`}
          </BabaBubble>
          <BabaBubble index={1}>{FIRST_QUESTION}</BabaBubble>

          {turns.map((t) => {
            if (t.who === "me") return <AnswerBubble key={t.id}>{t.text}</AnswerBubble>;
            if (t.who === "chip") {
              return (
                <DirectionChip key={t.id} label={t.text} onChange={() => setSheetOpen(true)} />
              );
            }
            return <BabaBubble key={t.id}>{t.text}</BabaBubble>;
          })}

          {typing ? <TypingDots /> : null}
        </ChatLayout>

        <View style={styles.bottom}>
          {finished ? (
            // 입력칸을 내리고 하나만 둔다 — 대화가 끝났다는 것을 자리로 알린다
            <AppButton
              label="일기 보러 가기"
              // TODO C6 · C6-b 일기 두 면 (다음 PR). 재료는 store 에 남아 있다
              onPress={() => {}}
            />
          ) : awaitingDirection && !sheetOpen ? (
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
          // 방향을 바꿔도 그때까지의 대화는 지워지지 않는다 (C4-d.md)
          onConfirm={confirmDirection}
        />
      ) : null}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bottom: { paddingTop: theme.layout.gap.element },
});
