import { Redirect, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import {
  Button,
  ChatBubble,
  ChatDock,
  ChatScaffold,
  Chip,
  Slider,
  Text,
  TypingBubble,
} from "@/components/ds";
import {
  background,
  label as labelColor,
  line,
  primary,
  radius,
  selectedTint,
  space,
} from "@/design/ds";
import { visibleSchedules, useDay } from "@/features/home/model/day";
import { useProfile } from "@/features/my/model/settings";
import {
  PHASE_ENDED,
  PHASE_SAFETY_HOLD,
  UI_MEASURE,
  sendTurn,
  startRetro,
  type Reply,
  type ReplyOption,
  type RetroFailureCode,
  type StartScheduleItem,
  type TurnInput,
} from "@/features/retro/data/retroApi";
import { emotionKeyOf, useRetro } from "@/features/retro/model/retro";

/**
 * `C4` 회고 대화 — **서버가 주도한다.** 화면은 `startRetro`/`sendTurn` 을 부르고
 * **응답의 형태를 보고 무엇을 그릴지 정할** 뿐이다. phase 가 아니라 형태로 분기한다.
 *
 * `DESIGN.md` 「일기」 3번:
 * 「대화: 자유 입력 / 선택형 / 척도 3종. **선택형·척도에서는 입력창을 숨기고
 * `보내기` 로 확정**. 「직접 쓸게요」를 고르면 입력창으로 전환」
 *
 * ## 바텀시트가 사라졌다
 *
 * 옛 화면은 선택지가 오면 **시트**(`DirectionSheet`)를 띄웠다. 새 시안은 선택지를
 * **대화 안의 칩**으로 두고 아래 `보내기` 로 확정한다 — 고르는 일이 대화에서
 * 떨어져 나가지 않고, 시트를 닫았을 때 「무엇도 확정되지 않은 상태」라는 애매한
 * 자리도 없어진다.
 *
 * ⚠ **선택지가 설명을 들고 오면 칩이 아니라 줄로 편다.** 시안의 선택지는 라벨
 * 하나짜리라 칩 줄이 맞지만, 서버는 `hint`(예: 「지난 비슷한 상황에서 정한 행동」)와
 * `description` 을 함께 주는 턴이 있다(행동 추천). 칩 줄에는 그 두 줄을 얹을 자리가
 * 없어서 **고르기 전에 안 보이게 된다** — 고르는 데 쓰라고 준 맥락이라 감추면
 * 기능이 준다. 그래서 라벨만 있는 턴은 칩, 설명이 있는 턴은 줄이다.
 *
 * 공통으로 지키는 것:
 * - **지난 버블을 삭제하지 않는다** — `turns` 는 쌓기만 한다
 * - **오류는 한 줄로 흡수한다** — 모달·경고 아이콘을 두지 않는다(`RULES.md` 4).
 *   대화 중 실패는 입력을 잠그지 않고 다시 말할 수 있게 둔다
 */

/** 실패 사유 → 화면 한 줄. 사용자가 할 수 있는 일이 같으면 문구도 같다 */
const FAILURE_MESSAGES: Record<RetroFailureCode, string> = {
  invalid_request: "지금은 회고를 이어갈 수 없어요. 잠시 뒤 다시 시도해 주세요.",
  // 하루 한 번 — 다시 시도로 풀리지 않으므로 "잠시 뒤 다시" 라고 말하지 않는다
  already_today: "오늘은 이미 회고를 마쳤어요. 회고는 하루에 한 번이에요.",
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
  // 시작 실패의 사유 코드 — `already_today` 처럼 **재시도로 풀리지 않는** 실패와
  // 잠깐의 네트워크 실패를 가른다(전자는 다시 시도 대신 나가는 길만 준다)
  const [startErrorCode, setStartErrorCode] = useState<RetroFailureCode | null>(null);
  const [draftText, setDraftText] = useState("");
  /** 이번 턴에 고른 선택지 — `보내기` 를 누를 때까지 확정되지 않는다 */
  const [pickedId, setPickedId] = useState<string | null>(null);
  /** 척도 값 — 눈금별로 하나씩 */
  const [measureValues, setMeasureValues] = useState<Record<string, number>>({});
  /** 위기 안내에서 「이어서 얘기하기」를 골랐나 — true 면 안내 버튼 대신 입력창을 연다 */
  const [resuming, setResuming] = useState(false);
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

  // 감정 없이 들어올 수 없다 — C3 이 필수이기 때문이다(서버도 required 다)
  if (startEmotion == null) return <Redirect href="/retro/emotion" />;

  /** 새 응답이 오면 이번 턴의 입력 상태를 비운다 — 앞 턴의 선택이 남지 않게 */
  const applyServerReply = (reply: Reply) => {
    applyReply(reply);
    setPickedId(null);
    // 새 응답이 왔으니 이어가기 상태를 내린다 — 이어간 뒤 또 위기면 안내 버튼을 다시 띄운다
    setResuming(false);
    // 측정 슬라이더는 **가운데(중앙값)에서 시작**한다 — 0~10 이면 5.
    // 미리 채워 두면 사용자가 슬라이더를 건드리지 않아도 그 값이 서버로 실린다
    // (빈 채로 두면 `measureValues` 에 키가 없어 그 측정이 통째로 빠진다).
    setMeasureValues(
      reply.ui === UI_MEASURE && reply.measures != null
        ? Object.fromEntries(reply.measures.map((m) => [m.id, Math.round((m.min + m.max) / 2)]))
        : {},
    );
    setDraftText("");
  };

  async function runStart(emotion: NonNullable<typeof startEmotion>) {
    setPending(true);
    setError(null);
    setStartErrorCode(null);
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

    if (result.ok) beginSession(result.data.sessionId, result.data.reply);
    else {
      // 다시 시도할 수 있게 자물쇠를 푼다
      starting.current = false;
      setError(FAILURE_MESSAGES[result.code]);
      setStartErrorCode(result.code);
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

  const sendText = () => {
    const text = draftText.trim();
    if (text.length === 0) return;
    // 보낸 즉시 입력창을 비운다 — 서버 응답을 기다리지 않는다.
    // 보낸 말은 addMyTurn 으로 말풍선에 남으므로 사라지지 않는다
    setDraftText("");
    addMyTurn(text);
    void runTurn({ content: text });
  };

  /** 고른 선택지를 확정한다 — 「직접 입력」은 여기 오지 않고 입력창으로 넘어간다 */
  const sendPicked = () => {
    if (pickedId == null) return;
    const option = lastReply?.options?.find((o) => o.id === pickedId);
    if (option != null) {
      // 방향 선택은 경계 칩으로, 일정 선택 등은 내가 한 말로 남긴다
      if (isDirectionPhase(lastReply?.phase ?? "")) addChipTurn(option.label);
      else addMyTurn(option.label);
    }
    void runTurn({ optionId: pickedId });
  };

  const sendMeasures = () => {
    // 요약은 서버가 다음 응답에 담아준다 — 여기서 내 버블을 지어내지 않는다
    void runTurn({ measures: measureValues });
  };

  const retryStart = () => {
    starting.current = true;
    void runStart(startEmotion);
  };
  const goHome = () => router.replace("/home");

  const done = lastReply?.done === true;
  const ended = done && lastReply?.phase === PHASE_ENDED;
  // 위기 안내 후 멈춤 — 끝이 아니라 갈림길이다(나가기 / 이어가기). done 은 false 다.
  const safetyHold = lastReply?.phase === PHASE_SAFETY_HOLD;
  const options = lastReply?.options ?? null;
  const measures = lastReply?.measures ?? null;
  const isMeasure = lastReply?.ui === UI_MEASURE && (measures?.length ?? 0) > 0;
  // 세션이 서기 전 — 대화를 그릴 수 없다. 이 동안 dock 은 채팅 입력이 아니라
  // 시작/실패 상태만 보여준다(입력창이 순간 떴다 사라지는 깜빡임을 막는다)
  const noSession = sessionId == null;
  // 하루 한 번(`already_today`)처럼 **재시도로 풀리지 않는** 시작 실패 — 다시 시도
  // 대신 나가는 길만 둔다(눌러도 같은 실패라 화면이 깜빡이던 문제)
  const startTerminal = startErrorCode === "already_today";
  const picked = options?.find((o) => o.id === pickedId) ?? null;
  /** 「직접 쓸게요」를 고르면 칩을 접고 입력창으로 넘어간다(`DESIGN.md` 「일기」 3) */
  const customPicked = picked?.input === true;
  const showOptions = !done && options != null && options.length > 0 && !customPicked;

  return (
    <ChatScaffold
      leading="close"
      onLeadingPress={() => router.replace("/home")}
      dock={
        <RetroDock
          noSession={noSession}
          startTerminal={startTerminal}
          error={error}
          ended={ended}
          done={done}
          safetyHold={safetyHold}
          resuming={resuming}
          onContinue={() => setResuming(true)}
          pending={pending}
          onRetry={retryStart}
          onGoHome={goHome}
          showOptions={showOptions}
          canSendPicked={pickedId != null}
          onSendPicked={sendPicked}
          isMeasure={isMeasure && !customPicked}
          onSendMeasures={sendMeasures}
          draftText={draftText}
          onChangeDraft={setDraftText}
          onSendText={sendText}
          customPicked={customPicked}
        />
      }
    >
      {turns.map((t) => (
        <ChatBubble key={t.id} variant={t.who === "baba" ? "question" : "answer"}>
          {t.text}
        </ChatBubble>
      ))}

      {/* 선택지는 질문 바로 아래, 대화 안에 붙는다 — 시트로 떼어내지 않는다 */}
      {showOptions && options != null ? (
        rich(options) ? (
          <View style={styles.rows}>
            {options.map((o) => (
              <OptionRow
                key={o.id}
                option={o}
                selected={o.id === pickedId}
                onPress={() => setPickedId(o.id)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.chips}>
            {options.map((o) => (
              <Chip
                key={o.id}
                label={o.label}
                selected={o.id === pickedId}
                onPress={() => setPickedId(o.id)}
              />
            ))}
          </View>
        )
      ) : null}

      {/* 척도 — 슬라이더가 주인공이고 숫자는 결과값이다 */}
      {isMeasure && !customPicked && measures != null ? (
        <View style={styles.measures}>
          {measures.map((m) => (
            <View key={m.id} style={styles.measure}>
              <Text variant="body2" color={labelColor.neutral}>
                {m.label}
              </Text>
              <Slider
                accessibilityLabel={m.label}
                value={measureValues[m.id] ?? m.min}
                onChange={(v) => setMeasureValues((prev) => ({ ...prev, [m.id]: v }))}
                min={m.min}
                max={m.max}
                minLabel="아쉬웠어요"
                maxLabel="충분했어요"
                disabled={pending}
              />
            </View>
          ))}
        </View>
      ) : null}

      {/* 기다리는 동안 — **다음 말이 앉을 자리에** 점 셋을 둔다. 기다리는 대상이
          화면이 아니라 상대의 말이라, 답이 오면 이 말풍선이 글자로 바뀐다.
          진행률도 남은 시간도 말하지 않는다(`RULES.md` 4) */}
      {pending ? <TypingBubble /> : null}
    </ChatScaffold>
  );
}

/** 설명을 들고 온 선택지가 하나라도 있으면 줄로 편다 */
const rich = (options: readonly ReplyOption[]) =>
  options.some((o) => o.hint != null || o.description != null);

/**
 * 설명이 붙는 선택지 한 줄. **배지(`hint`)가 라벨 위**에 온다 — 「지난 비슷한
 * 상황에서 정한 행동」처럼 **고르는 데 쓰라고 준 맥락**이라 고르기 전에 보여야 한다.
 */
function OptionRow({
  option,
  selected,
  onPress,
}: {
  option: ReplyOption;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.row, selected ? styles.rowOn : styles.rowOff]}
    >
      {option.hint != null ? (
        <Text variant="label2" color={labelColor.alternative}>
          {option.hint}
        </Text>
      ) : null}
      <Text variant="body1" color={labelColor.strong}>
        {option.label}
      </Text>
      {option.description != null ? (
        <Text variant="caption1" color={labelColor.neutral}>
          {option.description}
        </Text>
      ) : null}
    </Pressable>
  );
}

/**
 * 하단 독 — **이번 턴에 무엇을 할 수 있는지 하나만** 보여준다.
 * 선택형·척도에서는 입력창을 숨긴다(`DESIGN.md` 「일기」 3).
 */
type DockProps = {
  /** 세션이 아직 없다 — 대화를 그릴 수 없어 시작/실패 상태만 둔다 */
  noSession: boolean;
  /** 재시도로 풀리지 않는 시작 실패(하루 한 번 등) — 다시 시도 대신 나가는 길 */
  startTerminal: boolean;
  error: string | null;
  ended: boolean;
  done: boolean;
  /** 위기 안내로 멈췄다 — 나가기 버튼과 「이어서 얘기하기」를 함께 둔다 */
  safetyHold: boolean;
  /** 「이어서 얘기하기」를 골라 입력창으로 넘어갔다 */
  resuming: boolean;
  onContinue: () => void;
  pending: boolean;
  onRetry: () => void;
  onGoHome: () => void;
  showOptions: boolean;
  canSendPicked: boolean;
  onSendPicked: () => void;
  isMeasure: boolean;
  onSendMeasures: () => void;
  draftText: string;
  onChangeDraft: (v: string) => void;
  onSendText: () => void;
  /** 「직접 쓸게요」로 열린 입력창 — 낭독기에 무엇을 적는 자리인지 말한다 */
  customPicked: boolean;
};

function RetroDock(p: DockProps) {
  // 세션이 서기 전 — 대화(입력창)를 미리 띄우지 않는다. 시작 중이거나 실패한 상태다.
  if (p.noSession) {
    if (p.error != null) {
      return (
        <>
          <Text variant="caption1" color={labelColor.neutral}>
            {p.error}
          </Text>
          {p.startTerminal ? (
            // 하루 한 번 같은 종결 실패 — 다시 눌러도 같은 답이라 나가는 길만 둔다
            <Button label="홈으로 돌아가기" fill onPress={p.onGoHome} />
          ) : (
            <Button label="다시 시도" fill onPress={p.onRetry} disabled={p.pending} />
          )}
        </>
      );
    }
    // 시작 중 — 아직 대화가 없어 눌러 넘어갈 곳이 없다. 채팅 입력 대신 잠근 버튼을 둔다
    return <Button label="시작하는 중" fill disabled />;
  }

  return (
    <>
      {/* 대화 중 실패는 한 줄로 흡수하고 입력을 잠그지 않는다 */}
      {p.error != null ? (
        <Text variant="caption1" color={labelColor.neutral}>
          {p.error}
        </Text>
      ) : null}

      {p.ended ? (
        // 어뷰징 종료 — 마지막 버블이 안내를 담고, 여기선 나가는 길만 둔다
        <Button label="홈으로 돌아가기" fill onPress={() => router.replace("/home")} />
      ) : p.safetyHold && !p.resuming ? (
        // 위기 안내 후 멈춤 — 나가기를 위에, 「이어서 얘기하기」를 그 아래 글자 버튼으로.
        // 이어가기를 고르면(resuming) 이 분기를 벗어나 아래 입력창으로 넘어간다.
        <View style={styles.holdActions}>
          <Button label="홈으로 돌아가기" fill onPress={() => router.replace("/home")} />
          <Button label="이어서 얘기하기" variant="text" fill onPress={p.onContinue} />
        </View>
      ) : p.done ? (
        <Button label="일기로 정리하기" fill onPress={() => router.push("/retro/draft")} />
      ) : p.showOptions ? (
        <Button
          label="보내기"
          fill
          disabled={!p.canSendPicked || p.pending}
          onPress={p.onSendPicked}
        />
      ) : p.isMeasure ? (
        <Button label="보내기" fill disabled={p.pending} onPress={p.onSendMeasures} />
      ) : (
        <ChatDock
          value={p.draftText}
          onChangeText={p.onChangeDraft}
          onSend={p.onSendText}
          disabled={p.pending}
          accessibilityLabel={p.customPicked ? "직접 입력한 행동" : "답변"}
          placeholder={p.customPicked ? "직접 적어 주세요" : undefined}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, alignSelf: "flex-start" },
  holdActions: { gap: space.xs },
  rows: { gap: space.sm },
  row: { gap: 2, padding: space.lg, borderRadius: radius.medium },
  rowOff: { backgroundColor: background.elevated, borderWidth: 1, borderColor: line.neutral },
  rowOn: { backgroundColor: selectedTint, borderWidth: 2, borderColor: primary.normal },
  measures: { gap: space.xl },
  measure: { gap: space.sm },
});
