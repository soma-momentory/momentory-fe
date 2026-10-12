import { captureAnalytics, track } from "@/features/analytics";
import { router } from "expo-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";

import {
  Button,
  ChatBubble,
  ChatDock,
  ChatScaffold,
  Chip,
  Text,
  TypingBubble,
  type VoiceEvent,
} from "@/components/ds";
import {
  background,
  chatChoiceSelected,
  label as labelColor,
  layout,
  line,
  radius,
  raised,
  size,
  space,
} from "@/design/ds";
import { useActiveClock } from "@/features/analytics/activeClock";
import { EMOTIONS } from "@/features/emotion/model/emotion";
import { hasDiaryOn } from "@/features/diary/model/selectors";
import { useDiary } from "@/features/diary/model/diary";
import { visibleSchedules, useDay, useTodayContext } from "@/features/home/model/day";
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
import { settleRecommendation } from "@/features/rest/data/recommendMemory";
import { useRetro } from "@/features/retro/model/retro";
import { RETRO_BABA_LEFT, RetroBaba } from "@/features/retro/ui/RetroBaba";
import { RETRO_BABA_PEEK_LEFT, RetroBabaPeek } from "@/features/retro/ui/RetroBabaPeek";
import { RETRO_BABA_LIFT } from "@/features/retro/ui/RetroRug";

/**
 * 회고 대화 (채팅흐름_v2) — **서버가 주도한다.** 화면은 `startRetro`/`sendTurn` 을 부르고 응답의
 * 형태를 보고 무엇을 그릴지 정한다: `options` 면 선택지(자유 텍스트는 `직접 적기` 선지에서 열린다),
 * 아니면 자유 입력.
 *
 * v2 흐름: 일기 작성(자유 입력) → 분기점(감정 더 알아볼까, 1택) → 감정 탐색(감정·바람 최대 2택, 작은
 * 행동) → 종료. 감정을 시작 시 고르지 않으므로 마운트하면 바로 시작한다.
 *
 * 지키는 것: 지난 버블을 지우지 않는다 · 오류는 한 줄로 흡수(모달 금지) · 진행률/숫자 압박 없음.
 *
 * ## 바바가 왼쪽 아래에 앉아 있다 (2026-09-11 · 사용자 요청)
 *
 * 대화는 바바의 **머리 위에서 끝난다** — 새 질문이 머리 위에 뜨고, 내 답은 지금처럼 그 질문 바로
 * 밑에 쌓인다. 바바는 입력창 위에 떠 앉는다. 선택지가 뜨면 독이 자라며 바바를 아래부터 덮는다. 입력창은
 * 키보드 위로 올라가고 바바는 제자리다.
 *
 * **키보드가 올라와 있는 동안은 바바가 입력창 위로 고개를 내민다**(2026-10-03 · 사용자 요청 ·
 * `RetroBabaPeek`). 앉은 바바가 키보드에 덮여 안 보이던 자리다 — 키보드가 내려가면 다시 앉는다.
 *
 * ⚠ **러그(`RetroRug`)는 지금 깔지 않는다**(2026-09-11 · 사용자 요청으로 빼 보는 중). 컴포넌트는 남겨 뒀다 —
 * 되돌리려면 `ChatScaffold` 에 `backdrop={<RetroRug />}` 한 줄이면 된다. 바바를 띄우는 높이는 러그와 함께
 * 맞춘 값을 그대로 쓴다.
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

/**
 * 독에 앉은 선택지가 차지할 수 있는 화면 높이의 몫 — 넘치면 안에서 스크롤된다.
 * 바람 추천처럼 설명 달린 줄이 여럿이면 `직접 적기` 입력창·키보드와 겹쳐 대화가 사라진다.
 */
const OPTIONS_MAX_HEIGHT_RATIO = 0.4;

/**
 * 턴 계측에 싣는 회고 단계 — 그 밖의 단계는 버리지 않고 `other` 로 모은다.
 * ⚠ 위기 안내(`safety_hold`)는 일부러 목록에 없다. 민감 정보라 이름으로 내보내지 않는다.
 */
const TIMED_PHASES = ["diary_chat", "await_branch", "emotion_exploration"] as const;
const timedPhase = (phase: string | undefined) =>
  TIMED_PHASES.find((p) => p === phase) ?? ("other" as const);

export default function RetroTalk() {
  const nickname = useProfile((s) => s.nickname);
  const sessionId = useRetro((s) => s.sessionId);
  const turns = useRetro((s) => s.turns);
  const lastReply = useRetro((s) => s.lastReply);
  const beginSession = useRetro((s) => s.beginSession);
  const applyReply = useRetro((s) => s.applyReply);
  const addMyTurn = useRetro((s) => s.addMyTurn);
  const schedules = useDay((s) => s.schedules);
  const { height: windowHeight } = useWindowDimensions();
  const { date: today } = useTodayContext();
  /**
   * 오늘 일기를 이미 썼으면 **서버에 묻지 않고 처음부터** 「이미 마쳤어요」로 연다(2026-10-07 ·
   * 사용자 요청). 일정 확인을 거쳐 「시작하는 중」 뒤에야 막히던 길이다. 기기가 아직 모르는
   * 경우(목록을 못 불러온 날)는 그대로 서버의 409 가 막는다 — 문구는 같다.
   */
  const blockedToday = useRef(sessionId == null && hasDiaryOn(useDiary.getState().diaries, today));

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(() =>
    blockedToday.current ? FAILURE_MESSAGES.already_today : null,
  );
  const [startErrorCode, setStartErrorCode] = useState<RetroFailureCode | null>(() =>
    blockedToday.current ? "already_today" : null,
  );
  const [draftText, setDraftText] = useState("");
  /** 이번 턴에 고른 선택지들 — `보내기` 를 누를 때까지 확정되지 않는다(감정·바람 최대 2) */
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  /** `직접 적기` 를 골라 입력창으로 넘어갔나 */
  const [customOpen, setCustomOpen] = useState(false);
  /** 위기 안내에서 「이어서 얘기하기」를 골랐나 */
  const [resuming, setResuming] = useState(false);
  const starting = useRef(false);

  /**
   * 턴 시간 계측(2026-09-28) — 「어느 질문에서 오래 걸렸는가」를 셋으로 가른다.
   * 질문이 선 뒤 첫 입력까지(생각), 첫 입력부터 보내기까지(쓰기), 보낸 뒤 답이 오기까지(기다림).
   * 생각이 길면 질문이 어렵고, 쓰기가 길면 할 말이 많다 — 합치면 둘을 가를 수 없다.
   * 시간은 앱이 전면에 있던 동안만 센다. 사용자에게는 보이지 않는다.
   */
  const clock = useActiveClock();
  const askedAt = useRef(0);
  const firstInputAt = useRef<number | null>(null);
  const turnNo = useRef(0);
  /** 이번 턴에 음성 입력을 켰나 — 말로 답한 턴이 얼마나 되는지 본다 */
  const voiceUsed = useRef(false);
  useEffect(() => {
    askedAt.current = clock.now();
    firstInputAt.current = null;
    voiceUsed.current = false;
  }, [lastReply, clock]);
  useEffect(() => {
    turnNo.current = 0;
  }, [sessionId]);
  const markInput = () => {
    firstInputAt.current ??= clock.now();
  };

  useEffect(() => {
    if (sessionId != null || starting.current || blockedToday.current) return;
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
    if (lastReply?.phase === "await_branch" && input.optionIds?.length === 1) {
      // API의 고정 분기 1/2만 매핑한다. 감정/바람 선택 값은 기록하지 않는다.
      const selected = input.optionIds[0];
      if (selected === "1" || selected === "2") {
        track("retrospect_branch_selected", { branch: selected === "1" ? "explore" : "diary" });
      }
    }
    const sentAt = clock.now();
    const firstAt = firstInputAt.current ?? sentAt;
    const answering = timedPhase(lastReply?.phase);
    setPending(true);
    setError(null);
    const record = captureAnalytics();
    const result = await sendTurn(sessionId, input);
    const waitMs = clock.now() - sentAt;
    setPending(false);
    if (result.ok) {
      turnNo.current += 1;
      record("retrospect_turn_timed", {
        retrospect_id: String(sessionId),
        phase: answering,
        turn_no: turnNo.current,
        input_kind: input.content != null ? "text" : "selection",
        think_ms: Math.max(0, firstAt - askedAt.current),
        compose_ms: sentAt - firstAt,
        wait_ms: waitMs,
        // 내용은 보내지 않는다 — 길이만
        input_chars: input.content?.length ?? 0,
        voice_used: input.content != null && voiceUsed.current,
      });
      applyServerReply(result.data);
    } else setError(FAILURE_MESSAGES[result.code]);
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

  /** 음성 입력의 상태 변화 — 계측하고, 실패·거부는 독 위의 한 줄로 알린다 */
  const onVoice = (event: VoiceEvent) => {
    if (event.type === "started") {
      if (sessionId != null) track("voice_input_started", { retrospect_id: String(sessionId) });
      voiceUsed.current = true;
      markInput();
      setError(null);
    } else if (event.type === "permission") {
      track("voice_permission_result", { granted: event.granted });
      if (!event.granted) setError("마이크를 허용하면 말로 적을 수 있어요.");
    } else {
      track("voice_input_failed", { code: event.code });
      // 말이 없었던 것은 알릴 일이 아니다 — 버튼이 원래대로 돌아오는 것으로 충분하다
      if (event.code !== "no_speech") setError("음성을 알아듣지 못했어요. 직접 적어 주세요.");
    }
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
    markInput();
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
  // 위기 안내가 나온 날은 쉼터가 쉼 추천을 띄우지 않는다 — 그날을 여기서 미리 매듭짓는다
  // (`useRestRecommendation`). 저장을 누르지 않고 나가도 막히게 안내가 뜨는 순간에 적는다
  useEffect(() => {
    if (safetyHold) void settleRecommendation(today, "skipped");
  }, [safetyHold, today]);
  const options = lastReply?.options ?? null;
  const noSession = sessionId == null;
  const startTerminal = startErrorCode === "already_today";
  // 선택지 목록은 옵션이 있으면 늘 보인다.
  const hasOptions = !done && options != null && options.length > 0;
  // 후보 추천 스텝(감정 탐색) — 입력창을 늘 띄우고, 후보를 하나 고르면 「보내기」로 바뀐다(취소하면 다시 입력창).
  const candidateStep = phase === PHASE_EMOTION_EXPLORATION;
  // 독: 「보내기」를 보일지. 후보 스텝은 하나 골랐을 때만, 그 외(분기점·체크인)는 옵션이 있으면 늘.
  const showOptions = hasOptions && (!candidateStep || pickedIds.length > 0);

  const optionList =
    hasOptions && options != null ? (
      isEmotionChoice(options) ? (
        // 감정은 짧은 낱말이라 줄로 펴면 칸이 글자에 비해 너무 길다 — 칩으로 세우고
        // 감정끼리는 폭을 맞춘다(「화남」도 「행복함」과 같은 칸).
        <View style={styles.chips}>
          {options.map((o) => (
            <Underlay key={o.id} shape="chip">
              <Chip
                label={o.label}
                selected={pickedIds.includes(o.id)}
                onPress={() => toggle(o)}
                selectedStyle="soft"
                style={EMOTION_NAMES.has(o.label) ? styles.emotionChip : undefined}
              />
            </Underlay>
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
            <Underlay key={o.id} shape="chip">
              <Chip
                label={o.label}
                selected={pickedIds.includes(o.id)}
                onPress={() => toggle(o)}
                selectedStyle="soft"
              />
            </Underlay>
          ))}
        </View>
      )
    ) : null;

  return (
    <ChatScaffold
      leading="close"
      onLeadingPress={() => {
        // 끝나기 전에 나간다 — 어느 단계, 몇 번째 턴에서 그만뒀는가
        if (sessionId != null && !done) {
          track("retrospect_exited", {
            retrospect_id: String(sessionId),
            phase: timedPhase(lastReply?.phase),
            turn_no: turnNo.current,
          });
        }
        router.replace("/home");
      }}
      companion={<RetroBaba />}
      companionLift={RETRO_BABA_LIFT}
      companionLeft={RETRO_BABA_LEFT}
      companionRaised={<RetroBabaPeek />}
      companionRaisedLeft={RETRO_BABA_PEEK_LEFT}
      dock={
        <RetroDock
          optionList={optionList}
          optionsMaxHeight={windowHeight * OPTIONS_MAX_HEIGHT_RATIO}
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
          onChangeDraft={(text) => {
            if (text.length > 0) markInput();
            setDraftText(text);
          }}
          onSendText={sendText}
          onVoice={onVoice}
          customOpen={customOpen}
        />
      }
    >
      {turns.map((t) => (
        <ChatBubble key={t.id} variant={t.who === "baba" ? "question" : "answer"}>
          {t.text}
        </ChatBubble>
      ))}

      {/* 「오늘은 이미 회고를 마쳤어요」는 안내 한 줄이 아니라 **바바가 말풍선으로** 건넨다
          (2026-10-07 · 사용자 요청). 대화가 시작조차 안 된 화면이라, 바바의 머리 위가 비어 있었다 */}
      {startTerminal && error != null ? <ChatBubble variant="question">{error}</ChatBubble> : null}

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

/**
 * 선택지 뒤에 까는 **불투명한 바탕.** 선택지가 1px 들리거나 눌리는 동안 뒤의 바바가
 * 틈으로 비치지 않도록 칩과 같은 모양의 면을 한 겹 둔다.
 */
function Underlay({ shape, children }: { shape: "chip" | "row"; children: ReactNode }) {
  return (
    <View style={shape === "chip" ? styles.underlayChip : styles.underlayRow}>{children}</View>
  );
}

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
    <Underlay shape="row">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          selected ? styles.rowOn : styles.rowOff,
          pressed && styles.rowPressed,
        ]}
      >
        {option.hint != null ? (
          <Text
            variant="label2"
            color={selected ? chatChoiceSelected.label : labelColor.alternative}
          >
            {option.hint}
          </Text>
        ) : null}
        <Text variant="body1" color={selected ? chatChoiceSelected.label : labelColor.strong}>
          {option.label}
        </Text>
        {option.description != null ? (
          <Text variant="caption1" color={selected ? chatChoiceSelected.label : labelColor.neutral}>
            {option.description}
          </Text>
        ) : null}
      </Pressable>
    </Underlay>
  );
}

/** 하단 독 — 이번 턴의 선택지와, 무엇을 할 수 있는지 하나만 보여준다 */
type DockProps = {
  /** 이번 턴의 선택지 — 독 맨 위에 앉아 바바를 덮는다. `직접 적기` 입력 중에도 계속 보인다 */
  optionList: ReactNode;
  optionsMaxHeight: number;
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
  onVoice: (event: VoiceEvent) => void;
  /** `직접 적기` 로 열린 입력창 */
  customOpen: boolean;
};

function RetroDock(p: DockProps) {
  if (p.noSession) {
    // 하루 한 번에 막힌 날 — 말은 바바가 말풍선으로 했으니 독에는 버튼만 남긴다
    if (p.startTerminal) {
      return <Button label="홈으로 돌아가기" fill raised onPress={p.onGoHome} />;
    }
    if (p.error != null) {
      return (
        <>
          {/* 안내 한 줄은 body2 — caption1(12)은 안내가 너무 작게 읽혔다
              (2026-09-11 · 사용자 요청). 이 화면에서 할 수 있는 일을 알려 주는 유일한 글이다.
              자리는 **바바(빈백 아랫단)와 버튼 윗변의 한가운데** — 칸을 그 사이 전체로 펴고(독 간격까지
              음수 여백으로 먹는다) 글을 세로 가운데에 둔다. 가로도 가운데다 — 두 줄로 접혀도 줄마다 가운데로
              선다. 좁은 기기에서 두 줄로 접히면 칸이 자란다 */}
          <View style={styles.startError}>
            <Text variant="body2" color={labelColor.neutral} style={styles.startErrorText}>
              {p.error}
            </Text>
          </View>
          <Button label="다시 시도" fill raised onPress={p.onRetry} disabled={p.pending} />
        </>
      );
    }
    return <Button label="시작하는 중" fill raised disabled />;
  }

  return (
    <>
      {p.optionList != null ? (
        <ScrollView
          style={{ maxHeight: p.optionsMaxHeight }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          // 선택지가 짧으면 스크롤할 것이 없다 — 튕김으로 독이 흔들려 보이지 않게
          bounces={false}
        >
          {p.optionList}
        </ScrollView>
      ) : null}

      {p.error != null ? (
        <Text variant="body2" color={labelColor.neutral}>
          {p.error}
        </Text>
      ) : null}

      {p.ended ? (
        <Button label="홈으로 돌아가기" fill raised onPress={() => router.replace("/home")} />
      ) : p.safetyHold && !p.resuming ? (
        /* 위기 안내의 두 갈래는 **일기 저장 화면(`draft`)과 같은 배치**다(2026-09-11 · 사용자 요청):
           주 행동은 채운 버튼, 보조는 그 아래 **작은 텍스트 버튼이 가운데**. 같은 모양의 갈림길이
           화면마다 다르게 서 있으면 어느 쪽이 주 행동인지 매번 다시 읽어야 한다 */
        <View style={styles.holdActions}>
          <Button label="홈으로 돌아가기" fill raised onPress={() => router.replace("/home")} />
          <View style={styles.holdSecondary}>
            <Button label="이어서 얘기하기" variant="text" size="small" onPress={p.onContinue} />
          </View>
        </View>
      ) : p.done ? (
        <Button
          label="일기 확인하러 가기"
          fill
          raised
          onPress={() => router.push("/retro/draft")}
        />
      ) : p.showOptions ? (
        <Button
          label="보내기"
          fill
          raised
          disabled={!p.canSendPicked || p.pending}
          onPress={p.onSendPicked}
        />
      ) : (
        <ChatDock
          value={p.draftText}
          onChangeText={p.onChangeDraft}
          onSend={p.onSendText}
          onVoice={p.onVoice}
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
  /**
   * 위기 안내의 두 버튼 — 「이어서 얘기하기의 위아래 공간을 각각 반으로」(2026-09-11 · 사용자 요청).
   *
   * - **위**(주 버튼과의 사이): 12 → **6**(`layout.dockActionGap` · 같은 짝을 쓰는 화면이 전부 이 값이다)
   * - **아래**: 여기서 **따로 파고들지 않는다** — 아래 여백은 `Screen` 이 정한다(안드로이드는 시스템 바
   *   위에 한 뼘(16)을 더 얹는다 · `metrics.ts` `androidNavGap`)
   *
   * ⚠⚠ **Safe Area 패딩 전체의 절반을 먹으면 안 된다.** 그 값에는 **시스템 내비게이션 바(48)** 가 들어
   * 있어서, 절반만 파고들어도 보조 버튼이 내비 바 밑으로 들어가 글자가 가렸다(2026-09-11 실기기).
   *
   */
  holdActions: { gap: layout.dockActionGap },
  // `draft` 의 `secondary` 와 같은 값 — 보조 버튼은 가운데 선다
  holdSecondary: { alignItems: "center" },
  startError: {
    justifyContent: "center",
    // 바바 아랫단(독 바닥에서 RETRO_BABA_LIFT)부터 버튼 윗변(size.button.large)까지
    minHeight: RETRO_BABA_LIFT - size.button.large,
    marginBottom: -space.md,
  },
  startErrorText: { textAlign: "center" },
  underlayChip: { borderRadius: radius.full, backgroundColor: background.elevated },
  underlayRow: { borderRadius: radius.medium, backgroundColor: background.elevated },
  rows: { gap: space.sm },
  // 세로 패딩을 줄여 칸 높이를 낮춘다(바람 단계처럼 선택지가 많을 때 목록이 길어지지 않게)
  row: {
    gap: 2,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.medium,
  },
  rowOff: { backgroundColor: background.elevated, borderWidth: 1, borderColor: line.neutral },
  rowOn: {
    backgroundColor: chatChoiceSelected.surface,
    borderWidth: 1,
    borderColor: "transparent",
    transform: [{ translateY: -1 }],
    boxShadow: `0px ${raised.depth}px ${space.sm}px ${chatChoiceSelected.shadow}`,
  },
  rowPressed: { transform: [{ scale: 0.99 }] },
});
