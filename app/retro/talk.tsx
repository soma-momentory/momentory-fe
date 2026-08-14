import { Redirect, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";

import { AnswerBubble } from "@/components/chat/AnswerBubble";
import { BabaBubble } from "@/components/chat/BabaBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { DirectionChip } from "@/components/chat/DirectionChip";
import { MeasureInput } from "@/components/chat/MeasureInput";
import { RetroButton } from "@/components/chat/RetroButton";
import { RetroScene } from "@/components/chat/RetroScene";
import { TypingDots } from "@/components/chat/TypingDots";
import { DirectionSheet, type DirectionChoice } from "@/components/common/DirectionSheet";
import { RetroNav } from "@/components/common/RetroNav";
import { AppText } from "@/components/primitives/AppText";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import { paperColors, paperTypography } from "@/design/paper";
import theme from "@/design/theme";
import {
  PHASE_ENDED,
  UI_MEASURE,
  sendTurn,
  startRetro,
  type Reply,
  type RetroFailureCode,
  type StartScheduleItem,
  type TurnInput,
} from "@/features/retro/data/retroApi";
import { visibleSchedules, useDay } from "@/features/home/model/day";
import { emotionKeyOf, useRetro } from "@/features/retro/model/retro";
import { useProfile } from "@/features/my/model/settings";

/**
 * 회고 대화 — **서버가 주도한다**(`C4`~`C4-e`). 옛 고정 스크립트(`FOLLOW_UPS`)는
 * BE 연결로 사라졌다: 화면은 `startRetro`/`sendTurn` 을 부르고 **응답의 형태를 보고
 * 무엇을 그릴지 정할** 뿐이다.
 *
 * - `options` 있음 → 방향/세부/일정 **선택 시트**(`DirectionSheet`)
 * - `ui==="measure"` → **0~10 눈금**(`MeasureInput`)
 * - 그 밖의 텍스트 질문 → **자유 입력**(`ChatInput`)
 * - `done` → 일기가 있으면 `[일기 보러 가기]`(`draft`), 없으면 안전 종료(`ended`)
 *
 * phase 가 아니라 **형태로 분기**한다 — 같은 `script` phase 에서도 셋이 번갈아 온다.
 *
 * 공통으로 지키는 것:
 * - **지난 버블을 삭제하지 않는다** — `turns` 는 쌓기만 한다
 * - **방향을 고른 지점에 경계 칩**을 남긴다(`C4-d.md`) — 선택 라벨을 그대로
 * - **오류는 한 줄로 흡수한다** — 모달·경고 아이콘을 두지 않는다(`RULES.md` 4).
 *   대화 중 실패는 입력을 잠그지 않고 다시 말할 수 있게 둔다
 *
 * 새 디자인(`PLAN.md` D2 — 흐름은 그대로, 시각만): 언덕·카피바라 배경
 * (`RetroScene`) 위에 말풍선 둘과 **입력 독**이 뜬다. **바바 얼굴(`Avatar`)은
 * 뺐다** — 배경의 카피바라가 그 자리를 대신하고, 말풍선 위에 얼굴을 한 번 더
 * 얹으면 같은 캐릭터가 두 번 나온다.
 */

/** 실패 사유 → 화면 한 줄. 사용자가 할 수 있는 일이 같으면 문구도 같다 */
const FAILURE_MESSAGES: Record<RetroFailureCode, string> = {
  invalid_request: "지금은 회고를 이어갈 수 없어요. 잠시 뒤 다시 시도해 주세요.",
  session_not_found: "회고를 이어갈 수 없어요. 처음부터 다시 시작해 주세요.",
  unauthenticated: "로그인이 만료됐어요. 다시 로그인해 주세요.",
  network: "지금 연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.",
  server: "지금은 회고를 이어갈 수 없어요. 잠시 뒤 다시 시도해 주세요.",
  malformed: "지금은 회고를 이어갈 수 없어요. 잠시 뒤 다시 시도해 주세요.",
  unconfigured: "지금은 회고를 이어갈 수 없어요. 잠시 뒤 다시 시도해 주세요.",
};

/** 선택을 경계 칩으로 남기는 phase — 나머지(일정 선택 등)는 내가 한 말로 남긴다 */
const isDirectionPhase = (phase: string) =>
  phase === "await_direction" || phase === "await_sub_direction";

export default function RetroTalk() {
  // 마이(M2)에서 고친 닉네임이 시작 요청의 호칭으로 간다 — 같은 store 를 본다
  const nickname = useProfile((s) => s.nickname);
  const startEmotion = useRetro((s) => s.startEmotion);
  const sessionId = useRetro((s) => s.sessionId);
  const turns = useRetro((s) => s.turns);
  const lastReply = useRetro((s) => s.lastReply);
  const beginSession = useRetro((s) => s.beginSession);
  const applyReply = useRetro((s) => s.applyReply);
  const addMyTurn = useRetro((s) => s.addMyTurn);
  const addChipTurn = useRetro((s) => s.addChipTurn);
  const schedules = useDay((s) => s.schedules);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // 시작 요청을 한 번만 보낸다 — 첫 렌더의 이펙트가 두 번 돌아도 세션이 둘 생기지 않게
  const starting = useRef(false);

  useEffect(() => {
    if (startEmotion == null || sessionId != null || starting.current) return;
    starting.current = true;
    void runStart(startEmotion);
    // runStart 는 렌더 스코프의 값(schedules·nickname)을 읽으므로 의존성에 담지 않고
    // 첫 진입에서 한 번만 돈다 — starting ref 가 재실행을 막는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startEmotion, sessionId]);

  // 감정 없이 들어올 수 없다 — C3 이 필수이기 때문이다(C3.md)
  if (startEmotion == null) return <Redirect href="/retro/emotion" />;

  const applyServerReply = (reply: Reply) => {
    applyReply(reply);
    // 선택지가 오면 시트를 연다 — 뒤 대화(방금 온 질문 버블)가 스크림 너머로 보인다
    setSheetOpen((reply.options?.length ?? 0) > 0);
  };

  async function runStart(emotion: NonNullable<typeof startEmotion>) {
    setPending(true);
    setError(null);
    const items: StartScheduleItem[] = visibleSchedules(schedules).flatMap((s) => {
      // BE 는 일정마다 감정 하나가 필수다 — 감정이 없는 줄은 보내지 않는다
      const first = s.emotions[0];
      return first == null ? [] : [{ name: s.title, emotion: emotionKeyOf(first) }];
    });

    const result = await startRetro({
      schedules: items,
      currentEmotion: emotionKeyOf(emotion),
      nickname: nickname || null,
    });
    setPending(false);

    if (result.ok) {
      beginSession(result.data.sessionId, result.data.reply);
      setSheetOpen((result.data.reply.options?.length ?? 0) > 0);
    } else {
      // 다시 시도할 수 있게 자물쇠를 푼다
      starting.current = false;
      setError(FAILURE_MESSAGES[result.code]);
    }
  }

  const runTurn = async (input: TurnInput) => {
    if (sessionId == null || pending) return;
    setPending(true);
    setError(null);
    const result = await sendTurn(sessionId, input);
    setPending(false);
    if (result.ok) applyServerReply(result.data);
    else setError(FAILURE_MESSAGES[result.code]);
  };

  const sendText = (text: string) => {
    addMyTurn(text);
    void runTurn({ content: text });
  };

  const confirmChoice = (choice: DirectionChoice) => {
    setSheetOpen(false);
    // "직접 입력" 옵션 — 사용자가 적은 행동을 내가 한 말로 남기고 자유 텍스트로 보낸다
    if ("content" in choice) {
      addMyTurn(choice.content);
      void runTurn({ content: choice.content });
      return;
    }
    const { optionId } = choice;
    const phase = lastReply?.phase ?? "";
    const option = lastReply?.options?.find((o) => o.id === optionId);
    if (option != null) {
      // 방향 선택은 경계 칩으로, 일정 선택 등은 내가 한 말로 남긴다
      if (isDirectionPhase(phase)) addChipTurn(option.label);
      else addMyTurn(option.label);
    }
    void runTurn({ optionId });
  };

  const submitMeasures = (values: Record<string, number>) => {
    // 요약은 서버가 다음 응답에 담아준다 — 여기서 내 버블을 지어내지 않는다
    void runTurn({ measures: values });
  };

  const retryStart = () => {
    if (startEmotion == null) return;
    starting.current = true;
    void runStart(startEmotion);
  };

  const done = lastReply?.done === true;
  const ended = done && lastReply?.phase === PHASE_ENDED;
  const hasOptions = (lastReply?.options?.length ?? 0) > 0;
  const isMeasure = lastReply?.ui === UI_MEASURE && (lastReply?.measures?.length ?? 0) > 0;
  const startFailed = sessionId == null && error != null;

  return (
    <ScreenBackground variant="paperFlat">
      <RetroScene />
      <RetroNav variant="paper" emotion={startEmotion} />

      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ChatLayout variant="paper" stickToEnd>
          {turns.map((t) => {
            if (t.who === "me")
              return (
                <AnswerBubble key={t.id} variant="paper">
                  {t.text}
                </AnswerBubble>
              );
            if (t.who === "chip")
              return <DirectionChip key={t.id} variant="paper" label={t.text} />;
            return (
              <BabaBubble key={t.id} variant="paper">
                {t.text}
              </BabaBubble>
            );
          })}

          {pending ? <TypingDots variant="paper" /> : null}
        </ChatLayout>

        <View style={styles.bottom}>
          {/* 대화 중 실패는 한 줄로 흡수하고 입력을 잠그지 않는다 */}
          {error != null && !startFailed ? <AppText style={styles.error}>{error}</AppText> : null}

          {startFailed ? (
            <>
              <AppText style={styles.error}>{error}</AppText>
              <RetroButton label="다시 시도" onPress={retryStart} disabled={pending} />
            </>
          ) : ended ? (
            // 안전 종료 — 마지막 바바 버블이 안내를 담고, 여기선 나가는 길만 둔다
            <RetroButton label="홈으로 돌아가기" onPress={() => router.replace("/home")} />
          ) : done ? (
            // 입력칸을 내리고 하나만 둔다 — 대화가 끝났다는 것을 자리로 알린다
            <RetroButton label="일기 보러 가기" onPress={() => router.push("/retro/draft")} />
          ) : isMeasure && lastReply?.measures != null ? (
            <MeasureInput
              variant="paper"
              measures={lastReply.measures}
              onSubmit={submitMeasures}
              disabled={pending}
            />
          ) : hasOptions && !sheetOpen ? (
            // 시트를 닫았을 때 다시 여는 길 — 닫으면 아무것도 확정되지 않는다(C4-c2.md)
            <RetroButton label="이야기 이어가기" onPress={() => setSheetOpen(true)} />
          ) : hasOptions ? (
            // 시트가 열려 있는 동안 하단은 비운다
            <View />
          ) : (
            <ChatInput variant="paper" onSend={sendText} disabled={pending} />
          )}
        </View>
      </KeyboardAvoidingView>

      {sheetOpen && lastReply?.options != null ? (
        <DirectionSheet
          options={lastReply.options}
          onConfirm={confirmChoice}
          onDismiss={() => setSheetOpen(false)}
        />
      ) : null}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bottom: {
    paddingTop: theme.layout.gap.element,
    paddingBottom: theme.layout.gap.element,
    gap: theme.layout.gap.element,
  },
  /**
   * 한 줄 안내는 **경고색을 쓰지 않는다**(`RULES.md` 4 — 오류는 흡수한다).
   * 게다가 이 줄은 화면 아래, 언덕(`bg/hill`) 위에 앉는다 — 위험색
   * `dangerFill` 은 그 면에서 3.2 로 AA 미달이라 잉크 톤이 맞다.
   */
  error: {
    fontSize: paperTypography.styles.bodySm.fontSize,
    lineHeight: paperTypography.styles.bodySm.lineHeight,
    color: paperColors.text.primary,
  },
});
