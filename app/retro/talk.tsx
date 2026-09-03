import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import {
  Button,
  ChatBubble,
  ChatDock,
  ChatScaffold,
  Chip,
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
  size,
  space,
} from "@/design/ds";
import { EMOTIONS } from "@/features/emotion/model/emotion";
import { visibleSchedules, useDay } from "@/features/home/model/day";
import { useProfile } from "@/features/my/model/settings";
import {
  PHASE_EMOTION_EXPLORATION,
  PHASE_ENDED,
  PHASE_SAFETY_HOLD,
  sendTurn,
  startRetro,
  type Reply,
  type ReplyOption,
  type RetroFailureCode,
  type StartScheduleItem,
  type TurnInput,
} from "@/features/retro/data/retroApi";
import { useRetro } from "@/features/retro/model/retro";

/**
 * 회고 대화 (채팅흐름_v2) — **서버가 주도한다.** 화면은 `startRetro`/`sendTurn` 을 부르고 응답의
 * 형태를 보고 무엇을 그릴지 정한다: `options` 면 선택지(자유 텍스트는 `직접 적기` 선지에서 열린다),
 * 아니면 자유 입력.
 *
 * v2 흐름: 일기 작성(자유 입력) → 분기점(감정 더 알아볼까, 1택) → 감정 탐색(감정·바람 최대 2택, 작은
 * 행동) → 종료. 감정을 시작 시 고르지 않으므로 마운트하면 바로 시작한다.
 *
 * 지키는 것: 지난 버블을 지우지 않는다 · 오류는 한 줄로 흡수(모달 금지) · 진행률/숫자 압박 없음.
 */

/** 실패 사유 → 화면 한 줄. 사용자가 할 수 있는 일이 같으면 문구도 같다 */
const FAILURE_MESSAGES: Record<RetroFailureCode, string> = {
  invalid_request: "지금은 회고를 이어갈 수 없어요. 잠시 뒤 다시 시도해 주세요.",
  already_today: "오늘은 이미 회고를 마쳤어요. 회고는 하루에 한 번이에요.",
  session_not_found: "회고를 이어갈 수 없어요. 처음부터 다시 시작해 주세요.",
  unauthenticated: "로그인이 만료됐어요. 다시 로그인해 주세요.",
  network: "지금 연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.",
  server: "지금은 회고를 이어갈 수 없어요. 잠시 뒤 다시 시도해 주세요.",
  malformed: "지금은 회고를 이어갈 수 없어요. 잠시 뒤 다시 시도해 주세요.",
  unconfigured: "지금은 회고를 이어갈 수 없어요. 잠시 뒤 다시 시도해 주세요.",
};

/** 감정·바람은 최대 2개까지 고른다 */
const MAX_PICK = 2;

export default function RetroTalk() {
  const nickname = useProfile((s) => s.nickname);
  const sessionId = useRetro((s) => s.sessionId);
  const turns = useRetro((s) => s.turns);
  const lastReply = useRetro((s) => s.lastReply);
  const beginSession = useRetro((s) => s.beginSession);
  const applyReply = useRetro((s) => s.applyReply);
  const addMyTurn = useRetro((s) => s.addMyTurn);
  const schedules = useDay((s) => s.schedules);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startErrorCode, setStartErrorCode] = useState<RetroFailureCode | null>(null);
  const [draftText, setDraftText] = useState("");
  /** 이번 턴에 고른 선택지들 — `보내기` 를 누를 때까지 확정되지 않는다(감정·바람 최대 2) */
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  /** `직접 적기` 를 골라 입력창으로 넘어갔나 */
  const [customOpen, setCustomOpen] = useState(false);
  /** 위기 안내에서 「이어서 얘기하기」를 골랐나 */
  const [resuming, setResuming] = useState(false);
  const starting = useRef(false);

  useEffect(() => {
    if (sessionId != null || starting.current) return;
    starting.current = true;
    void runStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  /** 새 응답이 오면 이번 턴의 입력 상태를 비운다 */
  const applyServerReply = (reply: Reply) => {
    applyReply(reply);
    setPickedIds([]);
    setCustomOpen(false);
    setResuming(false);
    setDraftText("");
  };

  async function runStart() {
    setPending(true);
    setError(null);
    setStartErrorCode(null);
    // v2: 시작 시 감정을 붙이지 않는다 — 감정은 대화로 알아간다.
    // id 는 회고 토픽을 그 일정에 잇는 데, completed 는 서버가 1턴 소재를 고르는 데 쓴다
    // (끝난 일 우선 — 아직 안 한 일은 돌아볼 거리가 없다).
    const items: StartScheduleItem[] = visibleSchedules(schedules).map((s) => {
      const id = Number(s.id);
      return {
        name: s.title,
        ...(Number.isSafeInteger(id) && id > 0 ? { id } : {}),
        completed: s.done,
      };
    });

    const result = await startRetro({ schedules: items, nickname: nickname || null });
    setPending(false);

    if (result.ok) beginSession(result.data.sessionId, result.data.reply);
    else {
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
    setDraftText("");
    addMyTurn(text);
    void runTurn({ content: text });
  };

  /** 고른 선택지들을 확정한다 */
  const sendPicked = () => {
    if (pickedIds.length === 0) return;
    const labels = pickedIds
      .map((id) => lastReply?.options?.find((o) => o.id === id)?.label)
      .filter((l): l is string => l != null);
    if (labels.length > 0) addMyTurn(labels.join(", "));
    void runTurn({ optionIds: pickedIds });
  };

  const retryStart = () => {
    starting.current = true;
    void runStart();
  };
  const goHome = () => router.replace("/home");

  const phase = lastReply?.phase ?? "";
  // 「직접 적기」가 없는 선지 묶음은 양자택일(분기점·단답 체크인) → 하나만 고른다.
  // 감정·바람·작은 행동처럼 직접 적기가 있는 추천은 여러 개 고를 수 있다.
  const singleSelect =
    (lastReply?.options ?? []).length > 0 &&
    !(lastReply?.options ?? []).some((o) => o.input === true);

  const toggle = (o: ReplyOption) => {
    if (o.input) {
      setCustomOpen(true);
      setPickedIds([]);
      return;
    }
    setCustomOpen(false);
    setPickedIds((prev) => {
      // 단일 선택 — 다시 누르면 해제(취소)된다. 해제하면 후보 스텝은 다시 입력창이 뜬다.
      if (singleSelect) return prev.includes(o.id) ? [] : [o.id];
      if (prev.includes(o.id)) return prev.filter((x) => x !== o.id);
      // 상한 도달 — 가장 오래된 것을 밀어내고 새 것을 담는다
      if (prev.length >= MAX_PICK) return [...prev.slice(1), o.id];
      return [...prev, o.id];
    });
  };

  const done = lastReply?.done === true;
  const ended = done && phase === PHASE_ENDED;
  const safetyHold = phase === PHASE_SAFETY_HOLD;
  const options = lastReply?.options ?? null;
  const noSession = sessionId == null;
  const startTerminal = startErrorCode === "already_today";
  // 선택지 목록은 옵션이 있으면 늘 보인다.
  const hasOptions = !done && options != null && options.length > 0;
  // 후보 추천 스텝(감정 탐색) — 입력창을 늘 띄우고, 후보를 하나 고르면 「보내기」로 바뀐다(취소하면 다시 입력창).
  const candidateStep = phase === PHASE_EMOTION_EXPLORATION;
  // 독: 「보내기」를 보일지. 후보 스텝은 하나 골랐을 때만, 그 외(분기점·체크인)는 옵션이 있으면 늘.
  const showOptions = hasOptions && (!candidateStep || pickedIds.length > 0);

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
          canSendPicked={pickedIds.length > 0}
          onSendPicked={sendPicked}
          draftText={draftText}
          onChangeDraft={setDraftText}
          onSendText={sendText}
          customOpen={customOpen}
        />
      }
    >
      {turns.map((t) => (
        <ChatBubble key={t.id} variant={t.who === "baba" ? "question" : "answer"}>
          {t.text}
        </ChatBubble>
      ))}

      {/* 선택지는 질문 바로 아래, 대화 안에 붙는다 — `직접 적기` 입력 중에도 계속 보인다.
          감정 탐색(감정·바람·작은 행동)은 모두 바람 추천과 같은 줄(OptionRow) 형태로 통일한다. */}
      {hasOptions && options != null ? (
        isEmotionChoice(options) ? (
          // 감정은 짧은 낱말이라 줄로 펴면 칸이 글자에 비해 너무 길다 — 칩으로 세우고
          // 감정끼리는 폭을 맞춘다(「화남」도 「행복함」과 같은 칸).
          <View style={styles.chips}>
            {options.map((o) => (
              <Chip
                key={o.id}
                label={o.label}
                selected={pickedIds.includes(o.id)}
                onPress={() => toggle(o)}
                style={EMOTION_NAMES.has(o.label) ? styles.emotionChip : undefined}
              />
            ))}
          </View>
        ) : phase === PHASE_EMOTION_EXPLORATION || rich(options) ? (
          <View style={styles.rows}>
            {options.map((o) => (
              <OptionRow
                key={o.id}
                option={o}
                selected={pickedIds.includes(o.id)}
                onPress={() => toggle(o)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.chips}>
            {options.map((o) => (
              <Chip
                key={o.id}
                label={o.label}
                selected={pickedIds.includes(o.id)}
                onPress={() => toggle(o)}
              />
            ))}
          </View>
        )
      ) : null}

      {pending ? <TypingBubble /> : null}
    </ChatScaffold>
  );
}

/** 설명을 들고 온 선택지가 하나라도 있으면 줄로 편다(바람의 뜻 등) */
const rich = (options: readonly ReplyOption[]) =>
  options.some((o) => o.hint != null || o.description != null);

const EMOTION_NAMES = new Set<string>(EMOTIONS.map((e) => e.name));

/**
 * 감정 고르기 턴인가 — 감정 이름이 하나라도 섞여 있으면.
 *
 * 나머지 선지는 「직접 적기」·「아직 잘 모르겠어요」뿐이라 이 검사로 갈린다. 바람·작은 행동은
 * 감정 이름과 겹치지 않으므로 지금처럼 줄로 편다.
 */
const isEmotionChoice = (options: readonly ReplyOption[]) =>
  options.some((o) => EMOTION_NAMES.has(o.label));

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

/** 하단 독 — 이번 턴에 무엇을 할 수 있는지 하나만 보여준다 */
type DockProps = {
  noSession: boolean;
  startTerminal: boolean;
  error: string | null;
  ended: boolean;
  done: boolean;
  safetyHold: boolean;
  resuming: boolean;
  onContinue: () => void;
  pending: boolean;
  onRetry: () => void;
  onGoHome: () => void;
  showOptions: boolean;
  canSendPicked: boolean;
  onSendPicked: () => void;
  draftText: string;
  onChangeDraft: (v: string) => void;
  onSendText: () => void;
  /** `직접 적기` 로 열린 입력창 */
  customOpen: boolean;
};

function RetroDock(p: DockProps) {
  if (p.noSession) {
    if (p.error != null) {
      return (
        <>
          <Text variant="caption1" color={labelColor.neutral}>
            {p.error}
          </Text>
          {p.startTerminal ? (
            <Button label="홈으로 돌아가기" fill onPress={p.onGoHome} />
          ) : (
            <Button label="다시 시도" fill onPress={p.onRetry} disabled={p.pending} />
          )}
        </>
      );
    }
    return <Button label="시작하는 중" fill disabled />;
  }

  return (
    <>
      {p.error != null ? (
        <Text variant="caption1" color={labelColor.neutral}>
          {p.error}
        </Text>
      ) : null}

      {p.ended ? (
        <Button label="홈으로 돌아가기" fill onPress={() => router.replace("/home")} />
      ) : p.safetyHold && !p.resuming ? (
        <View style={styles.holdActions}>
          <Button label="홈으로 돌아가기" fill onPress={() => router.replace("/home")} />
          <Button label="이어서 얘기하기" variant="text" fill onPress={p.onContinue} />
        </View>
      ) : p.done ? (
        <Button label="일기 확인하러 가기" fill onPress={() => router.push("/retro/draft")} />
      ) : p.showOptions ? (
        <Button
          label="보내기"
          fill
          disabled={!p.canSendPicked || p.pending}
          onPress={p.onSendPicked}
        />
      ) : (
        <ChatDock
          value={p.draftText}
          onChangeText={p.onChangeDraft}
          onSend={p.onSendText}
          disabled={p.pending}
          accessibilityLabel={p.customOpen ? "직접 적기" : "답변"}
          placeholder={p.customOpen ? "직접 적어 주세요" : undefined}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, alignSelf: "flex-start" },
  // 감정끼리 폭을 맞춘다 — 「화남」(2글자)도 「행복함」(3글자)과 같은 칸이 되게.
  emotionChip: { minWidth: size.chip.emotionMinWidth },
  holdActions: { gap: space.xs },
  rows: { gap: space.sm },
  // 세로 패딩을 줄여 칸 높이를 낮춘다(바람 단계처럼 선택지가 많을 때 목록이 길어지지 않게)
  row: {
    gap: 2,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.medium,
  },
  rowOff: { backgroundColor: background.elevated, borderWidth: 1, borderColor: line.neutral },
  rowOn: { backgroundColor: selectedTint, borderWidth: 2, borderColor: primary.normal },
});
