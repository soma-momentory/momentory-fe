import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Screen } from "@/components/ds";
import { useRestContentAnalytics } from "@/features/analytics/useRestContentAnalytics";
import { useSensePondAnalytics } from "@/features/analytics/useSensePondAnalytics";
import { hasDiaryOn } from "@/features/diary/model/selectors";
import { useDiary } from "@/features/diary/model/diary";
import { useTodayContext } from "@/features/home/model/day";
import { SceneTopVeil } from "@/components/rest/scene/SceneVeil";
import { SensePanel } from "@/components/rest/pond/SensePanel";
import { PondScene } from "@/components/rest/pond/PondScene";
import { StepHeading } from "@/components/rest/pond/StepHeading";
import { MoodExit } from "@/components/rest/scene/MoodExit";
import {
  SCENE_BACK_SIZE,
  SceneBackButton,
  SceneCornerButton,
  ScenePillButton,
} from "@/components/rest/scene/SceneChrome";
import { REST_RECORDS_LINK } from "@/features/rest/model/restRecord";
import { useRestRecord } from "@/features/rest/model/useRestRecord";
import { pond, pondMotion, pondVeil, space } from "@/design/ds";
import {
  SENSE_POND_DONE,
  SENSE_POND_STEPS,
  SENSE_POND_SUBTITLE,
  SENSE_POND_TITLE,
  type SensePondStepId,
  isStepDone,
  nextFound,
} from "@/features/rest/model/sensePond";

/**
 * 감각연못 — 「보이는 것 3개」 → 「들리는 소리 2개」 → 「몸에 닿는 감각 1개」 → 완료
 * (2026-09-03 · 장면 구조 개편 2026-09-05).
 *
 * 쉼터 `R1` 의 감각연못 카드가 여는 플레이 화면. 현실에서 감각 하나를 찾을 때마다
 * 연못 안의 **감각 포인트**를 눌러 앞으로 간다(`features/rest/model/sensePond.ts`).
 *
 * ## 화면이 곧 연못이다
 *
 * 앱 헤더 → 설명 → 작은 연못 카드 → 진행도로 쌓지 않는다(2026-09-05 개편).
 * **장면 하나가 화면 대부분을 채우고 그 위에 UI 가 떠 있다** — 뒤로가기 원 하나,
 * 지금 말할 것 한 묶음, 그리고 아래에서 살짝 올라온 크림 판.
 * 「연못 그림을 보고 있다」가 아니라 「연못 안에 있다」가 되어야 해서다.
 * 흰 카드도 제목 상자도 두지 않는다 — 글자는 장면 위에 그대로 앉고, 읽히지 않는
 * 곳에는 위쪽에만 **아주 옅은 빛 한 겹**(`SceneTopVeil` · `pondVeil`)을 깐다.
 *
 * ## 위에서는 한 번에 한 가지만 말한다 (2026-09-06)
 *
 * 「감각연못」 · 태도 한 줄 · 단계 제목 · 단계 설명 · 보조 문구가 **동시에** 서 있으면
 * 다섯 줄 중 어느 것이 지금 할 일인지 고르는 일부터 해야 한다. 그래서 상단은 셋 중
 * 하나만 보여 준다(`stage`):
 *
 * - `intro` — 들어온 직후. 「감각연못」과 태도 한 줄뿐이다. `pondMotion.introHold` 가
 *   지나거나 **첫 포인트를 찾으면**(둘 중 먼저) 물러나고 다시 오지 않는다. 그동안에도
 *   아래 판이 「보이는 것 0 / 3」과 안내 한 줄을 들고 있어 할 일이 비지 않는다.
 * - 진행 — 그 단계의 제목 한 줄과 설명 한두 줄.
 * - `finished` — 「잘 찾았어요」와 한 줄. 단계 설명은 하나도 남지 않는다.
 *
 * 셋은 **같은 자리에서 갈아 끼워진다**(`StepHeading`) — 사라졌다 나타나면 화면이
 * 한 번 끊긴 것으로 읽힌다.
 *
 * ## 단계는 한 화면 안에서 넘어간다
 *
 * 화면을 옮기지 않는다 — 연못은 그대로 두고 **안내와 포인트만** 다음 단계의 것으로
 * 바뀐다. 제목·설명은 툭 갈리지 않고 옅어졌다 돌아온다(`StepHeading`). 목표를
 * 채우면 `pondMotion.stepHold`(0.7초) 만큼 머문 뒤 넘어간다 — 마지막 하나가 셈해진
 * 것을 눈으로 볼 시간이다.
 *
 * ## 완료도 같은 화면이다
 *
 * 마지막 손짓의 물결이 **다 퍼질 때까지**(`pondMotion.doneHold`) 그대로 두고,
 * 그 뒤 **장면을 그대로 둔 채** 위 문안이 `SENSE_POND_DONE` 으로 바뀐다.
 * 아래 판은 진행 중에 이미 칸 셋이 차올라 있고(2026-09-11), 완료에는 그 위에
 * 「다 채웠어요」가 뜨고 아래에 「쉼터로 돌아가기」가 붙는다.
 *
 * ## 판은 첫 손짓에 올라온다 (2026-09-11 · 사용자 요청)
 *
 * 들어온 직후에는 아래 판이 없고 연못이 화면 끝까지 이어진다. 첫 손짓에 판이 올라와
 * 가운데에 칸 하나를 띄운다(`SensePanel` · 바탕 없음). 판은 장면 **위에 겹친다** —
 * 장면 아래에 쌓으면 판이 나타나는 순간 장면이 줄어 연못 그림과 카피바라가 손끝
 * 아래서 움직인다.
 *
 * 완료에는 판이 「다 채웠어요」와 버튼만큼 높아진다. 한때(2026-09-11) 그때 **장면을
 * 위로 비켜 올려** 카피바라 발밑을 판 위로 꺼냈는데, 버튼이 올라올 때 화면 전체가
 * 딸려 오는 것처럼 보여(2026-10-05 · 사용자 피드백) 지웠다 — **장면은 끝까지 그 자리다.**
 * 판이 카피바라 발치를 조금 덮지만 판 뒤 빛(`pondPanelVeil`)에 녹아 경계가 없다.
 * 돌아가기 버튼은 쉼터 안의 다른 버튼과 같은 빈티지 알약이다(`ScenePillButton`).
 * 돌아가기는 회고 완료와 같은 `router.replace` 다 — 딥링크로 들어와 뒤가 없어도
 * 쉼터 탭에 선다. ⚠ `/rest` 라고만 쓰면 `(onboarding)/rest`(쉬는 방법)에 먼저
 * 잡힌다 — 이름이 같은 라우트가 둘이라 **그룹을 명시한다**(에뮬레이터에서 실제로
 * 온보딩으로 갔다 · 2026-09-03).
 *
 * ## 오래 누르기는 두 번 말한다 (2026-09-11 · 사용자 요청)
 *
 * 감각 단계의 머리글에는 설명 아래 「꾸욱」 알약(`HoldHint`)이 붙고, 다 채우기 전에
 * 손을 떼면(`onHoldCancel`) 그 알약이 한 번 톡 튀며 「조금 더 오래 눌러요」로 바뀐다.
 * 짧은 누름은 여전히 세지 않는다 — 대신 **아무 일도 없는 화면**으로 두지 않는다.
 *
 * 세는 것은 이 화면의 상태(`stepIndex`·`found`·`finished`)뿐이고 어디에도 저장하지 않는다.
 */
export default function SensePondScreen() {
  const insets = useSafeAreaInsets();
  const [stepIndex, setStepIndex] = useState(0);
  const [found, setFound] = useState(0);
  const [finished, setFinished] = useState(false);
  // 소개 문구가 아직 위에 있다 — 한 호흡이 지나거나 첫 포인트를 찾으면 내려간다
  const [intro, setIntro] = useState(true);
  // 잠시 누르기에서 일찍 손을 뗀 횟수 — 오를 때마다 「꾸욱」 알약이 다시 말한다
  const [nudge, setNudge] = useState(0);
  const step = SENSE_POND_STEPS[stepIndex]!;
  const done = isStepDone(step, found);
  const hasNext = stepIndex + 1 < SENSE_POND_STEPS.length;
  // 단계별 소요 시간 계측 — 사용자에게는 보이지 않는다(`features/analytics/sensePond.ts`)
  const pond = useSensePondAnalytics(step.id);
  // 쉼 콘텐츠 공통 계측 — 열기 · 끝까지 · 어디서 나갔나(`features/analytics/restContent.ts`)
  const { date: today } = useTodayContext();
  const diaryToday = useDiary((s) => hasDiaryOn(s.diaries, today));
  const rest = useRestContentAnalytics("sense_pond", step.id, diaryToday);
  // 이용 기록 — 첫 감각을 찾은 판부터 남긴다. 기분을 골라야 돌아가는 길이 붙는다
  const record = useRestRecord("sense_pond", stepIndex > 0 || found > 0 || finished);
  // 「돌아가기」를 눌렀다 — 장면 위에 기분 쪽지가 뜨고, 고른 뒤에야 실제로 나간다
  const [asking, setAsking] = useState(false);

  // 마지막 감각을 찾은 순간이 끝이다 — `sense_pond_finished` 와 같은 때
  useEffect(() => {
    if (done && !hasNext) rest.complete();
  }, [done, hasNext, rest]);

  // 소개는 한 호흡만 머문다 — 손짓이 먼저 오면 그 자리에서 끝난다(아래 `onFound`)
  useEffect(() => {
    if (!intro) return;
    const t = setTimeout(() => setIntro(false), pondMotion.introHold);
    return () => clearTimeout(t);
  }, [intro]);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(
      () => {
        if (hasNext) {
          setStepIndex((i) => i + 1);
          setFound(0);
        } else {
          setFinished(true);
        }
      },
      hasNext ? pondMotion.stepHold : pondMotion.doneHold,
    );
    return () => clearTimeout(t);
  }, [done, hasNext]);

  /** 판이 보여 주는 셈 — 지난 단계는 다 채운 것으로, 아직 안 온 단계는 0 으로 */
  const counts = SENSE_POND_STEPS.reduce(
    (acc, s, i) => {
      acc[s.id] = finished || i < stepIndex ? s.goal : i === stepIndex ? found : 0;
      return acc;
    },
    {} as Record<SensePondStepId, number>,
  );

  /**
   * 위에서 **지금 말하는 것 하나** — 소개 · 지금 단계 · 완료 중 하나다.
   * 셋의 모양이 같아서(제목 한 줄 + 설명 한두 줄) 한 자리에서 갈아 끼운다.
   */
  const heading = intro
    ? { title: SENSE_POND_TITLE, description: SENSE_POND_SUBTITLE }
    : finished
      ? { title: SENSE_POND_DONE.title, description: SENSE_POND_DONE.description }
      : { title: step.title, description: step.description, hint: step.hint };

  return (
    <Screen grid={false} padded={false} edges={[]}>
      <View style={styles.scene}>
        <View style={styles.pan}>
          <PondScene
            step={step.id}
            point={step.point}
            input={step.input}
            onFound={() => {
              // 손짓이 시작됐다 — 소개는 여기서 끝난다(타이머를 기다리지 않는다)
              setIntro(false);
              pond.find(step.goal, !hasNext);
              setFound((n) => nextFound(step, n));
            }}
            onHoldCancel={() => {
              pond.holdCancel();
              setNudge((n) => n + 1);
            }}
            finished={finished}
          />
        </View>

        {/* 장면 위에 뜬 것들 — `box-none` 이라 빈 곳의 손짓은 아래 연못이 받는다 */}
        <View
          pointerEvents="box-none"
          // 글은 뒤로가기 원 **아래에서** 시작한다 — 같은 줄에 두면 한 줄 문구가
          // 원 뒤로 숨는다(레퍼런스도 원이 위, 제목이 아래다)
          style={[
            styles.overlay,
            { paddingTop: insets.top + space.sm + SCENE_BACK_SIZE + space.xs },
          ]}
        >
          {/* 글보다 먼저 깔린다 — 카드가 아니라 위쪽에서 사라지는 빛 한 겹이다 */}
          <SceneTopVeil veil={pondVeil} testID="pond-top-veil" />
          <SceneBackButton top={insets.top + space.sm} onPress={() => router.back()} />
          <SceneCornerButton
            top={insets.top + space.sm}
            label={REST_RECORDS_LINK}
            icon="clock"
            onPress={() => router.push("/rest/records?content=sense_pond")}
          />

          {/* 글은 장면 폭을 다 쓰지 않는다 — 끝까지 늘리면 한 글자만 다음 줄로 넘어간다 */}
          <View style={styles.words}>
            {/* 소개 → 단계 → 완료가 **한 자리에서** 갈린다. 셋을 함께 쌓지 않는다.
                단계 · 완료 제목도 소개 「감각연못」과 같은 크기다(2026-10-06 · 사용자 요청) */}
            <StepHeading
              center
              tone={intro ? "intro" : "stepLead"}
              title={heading.title}
              description={heading.description}
              hint={"hint" in heading ? heading.hint : undefined}
              nudge={nudge}
            />
          </View>
        </View>
      </View>

      {/* 첫 손짓 전에는 판이 없다. 그 뒤로 찾을 때마다 칸이 뜨고, 다 지나면 돌아가는 길이 붙는다 */}
      {finished || counts[SENSE_POND_STEPS[0]!.id] > 0 ? (
        <SensePanel
          current={finished ? null : step.id}
          found={counts}
          // 버튼이 제스처 바·내비 바 위에 선다
          bottomInset={insets.bottom}
          footer={
            !finished ? undefined : (
              <ScenePillButton label={SENSE_POND_DONE.cta} onPress={() => setAsking(true)} />
            )
          }
        />
      ) : null}
      {asking ? (
        <MoodExit
          leaveLabel={SENSE_POND_DONE.cta}
          onPick={record.pick}
          onLeave={() => router.replace("/(tabs)/rest")}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  // 장면이 화면을 전부 가진다 — 판은 그 위 바닥에 겹치므로 판이 떠도 장면이 줄지 않는다
  scene: { flex: 1, minHeight: 0, backgroundColor: pond.veil },
  pan: { flex: 1 },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    paddingHorizontal: space.xl,
    gap: space.xs,
  },
  // 「가운데」는 부모(overlay)가 정하는데 stretch 가 그걸 덮는다 — maxWidth 320 과 만나면
  // 320dp 보다 넓은 화면(폴드·태블릿)에서 교차축 시작점, 즉 왼쪽에 붙어 그려진다.
  words: { alignSelf: "center", maxWidth: 320, alignItems: "center", gap: space.xs },
});
