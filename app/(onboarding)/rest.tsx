import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Avatar } from "@/components/chat/Avatar";
import { BabaBubble } from "@/components/chat/BabaBubble";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { ChipFlow } from "@/components/chat/ChipFlow";
import { OnboardingTopBar } from "@/components/onboarding/OnboardingTopBar";
import { OtherRow } from "@/components/onboarding/OtherRow";
import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import { warnRow } from "@/design/tokens.mvp";
import { OTHER_REST_METHOD, useDraft } from "@/features/onboarding/model/draft";
import { useOnboardingOptions } from "@/features/onboarding/model/options";

/**
 * `07` · 쉬는 방법 (온보딩 4/6 · 필수 · 복수)
 *
 * **MVP 에서 이 답이 쓰이는 화면은 없다. 그래도 묻는다** — 답은
 * `User.restMethods` 로 저장만 하고 쉼터가 열릴 때 추천의 근거가 된다.
 * 나중에 다시 물으면 사용자는 같은 질문을 두 번 받는다(`07.md`).
 * 2026-08-05 판에서 뺐던 화면을 상류가 되살렸다(`DECISIONS.md` 0.36-r).
 *
 * - **"쉬고 싶을 때"가 아니라 "지치거나 스트레스를 받을 때"** — 앞의 말은
 *   상황이 아니라 성향을 묻는 것으로 읽힌다
 * - **선택지 15개를 한 화면에 다 보인다.** "더 보기"로 접으면 뒤쪽은 사실상
 *   선택되지 않는다 — 칩을 13.5 · gap 7 로 좁혀 다 들어가게 한다
 * - **칩의 이모지는 선택지 라벨의 일부다** — 이모지를 선 아이콘으로 바꾼
 *   규칙의 유일한 예외(`07.md` · `RULES.md` 「아이콘」)
 * - `[그때마다 달라요]` 는 회피가 아니라 유효한 답이고, `[멍하니 쉬기]` 도
 *   하나의 방법이다
 * - 복수 선택 · **상한 없음** · 다시 누르면 취소
 * - 작은 기기에서는 **대화 영역만 스크롤**되고 시작 높이는 다른 질문과 같다
 *
 * **칩 목록은 서버가 준다**(`GET /api/v1/onboarding/options` 의 `restMethods`).
 * 못 받았으면 대역(`model/options.ts`)으로 그린다 — 선택지를 기다리느라 온보딩을
 * 멈추지 않는다. ⚠ **서버 라벨에는 이모지가 없다**(`PRODUCT.md` 「상류와 차이」 9번).
 *
 * ⚠ **`[기타]` 를 누르면 입력 줄이 열린다 — 시안에 없는 줄이다.** 서버가
 * `OTHER` 와 함께 직접 입력 값을 요구해서(없으면 온보딩 제출이 400 ·
 * `DISCUSSION.md` §1-7), 관심 분야 `06-b` 와 같은 모양으로 더했다.
 * 기록: `PRODUCT.md` 「상류와 차이」 14번.
 */
export default function Rest() {
  const items = useOnboardingOptions((s) => s.restMethods);
  const picked = useDraft((s) => s.restMethods);
  const other = useDraft((s) => s.restMethodOther);
  const set = useDraft((s) => s.set);

  const etcOn = picked.includes(OTHER_REST_METHOD);
  const otherTrimmed = other.trim();
  // 기타를 켠 채 비워 두면 잠긴다 — 06-b 와 같은 규칙이다
  const ready = picked.length > 0 && (!etcOn || otherTrimmed.length > 0);

  const toggle = (id: string) => {
    if (picked.includes(id)) {
      set(
        "restMethods",
        picked.filter((x) => x !== id),
      );
      // 기타를 끄면 적던 값도 함께 비운다 — 꺼진 답을 초안에 남기지 않는다
      if (id === OTHER_REST_METHOD) set("restMethodOther", "");
      return;
    }
    set("restMethods", [...picked, id]);
  };

  /**
   * 기타 값 확정 — 키보드 완료 · 입력 줄 밖 탭(blur) · `[다음]` 세 경로가 전부
   * 여기를 지난다. 공백뿐이면 확정하지 않고 기타 선택을 취소한다(`06-c.md`).
   */
  const commitOther = () => {
    if (otherTrimmed.length === 0) {
      set(
        "restMethods",
        picked.filter((x) => x !== OTHER_REST_METHOD),
      );
      set("restMethodOther", "");
      return;
    }
    set("restMethodOther", otherTrimmed);
  };

  const goNext = () => {
    if (etcOn) commitOther();
    router.push("/retro-time");
  };

  return (
    <ScreenBackground>
      <OnboardingTopBar step={3} onBack={() => router.back()} />

      <ChatLayout>
        <Avatar />
        <BabaBubble index={0}>
          마음이 지치거나 스트레스를 받을 때, 어떤 방법이 가장 도움이 되나요?
        </BabaBubble>
        <BabaBubble index={1}>나중에 지쳐 보이는 날, 이걸 기억해뒀다 먼저 권해줄게요.</BabaBubble>
      </ChatLayout>

      <View style={styles.bottom}>
        {/* 15개를 한 화면에 — 칩 13.5 · gap 7 (9-mvp.mjs) */}
        <ChipFlow items={items} selected={picked} onToggle={toggle} chipSize={13.5} gap={7} />

        {etcOn ? (
          <OtherRow
            value={other}
            onChangeText={(v) => set("restMethodOther", v)}
            onCommit={commitOther}
          />
        ) : null}

        {/* 기타를 켠 채 비어 있을 때만 붙는 한 줄 — 모달이 아니고 입력을 막지 않는다 */}
        {etcOn && otherTrimmed.length === 0 ? (
          <View style={styles.warn}>
            <AppText tone="accent" style={styles.warnText}>
              기타에 무엇을 적을지 알려주세요.
            </AppText>
          </View>
        ) : null}

        <AppText variant="caption" tone="legal">
          {hintOf(picked.length, etcOn, otherTrimmed.length > 0)}
        </AppText>

        <AppButton label="다음" disabled={!ready} onPress={goNext} />
      </View>
    </ScreenBackground>
  );
}

/** `06` 과 같은 형식 — 몇 개를 골랐는지 사실만 말한다 */
function hintOf(count: number, etcOn: boolean, etcFilled: boolean) {
  if (count === 0) return "하나 이상 골라주세요";
  if (etcOn && etcFilled) return `${count}개 선택됨 · 완료를 누르면 칩이 됩니다`;
  return `${count}개 선택됨 · 다시 누르면 취소돼요`;
}

const styles = StyleSheet.create({
  // 칩 → (기타 줄) → (경고) → 안내 → 버튼. 시안 간격 11
  bottom: { gap: 11 },
  warn: {
    borderRadius: warnRow.radius,
    paddingVertical: warnRow.paddingVertical,
    paddingHorizontal: warnRow.paddingHorizontal,
    backgroundColor: warnRow.background,
  },
  warnText: { fontSize: warnRow.fontSize, lineHeight: warnRow.fontSize * 1.55 },
});
