import { Platform, StyleSheet, View } from "react-native";

import { Screen, SocialButton, Text } from "@/components/ds";
import { Baba } from "@/components/onboarding/OnboardingParts";
import { Rug, RUG_ASPECT } from "@/features/home/ui/v2/Rug";
import { routeAfterSignIn, startQuestions } from "@/components/onboarding/startQuestions";
import { label as labelColor, space, status } from "@/design/ds";
import { useAuth } from "@/features/auth/model/auth";
import { openExternalLink, type ExternalLink } from "@/lib/links";

/**
 * `S1` · 로그인 · 소셜 3종 — Momentory DS 이관 (2026-08-20 · `PLAN.md` A Phase 4).
 *
 * 시각 정본은 [`docs/DESIGN.md`](../../docs/DESIGN.md) 「로그인」. **인증 로직은 그대로다** — store·라우팅·실패 처리에 손대지 않았다.
 *
 * ## 구조가 바뀌었다
 *
 * 옛 화면은 바바 117 + 제목 2줄 + 소개 3덩어리였다. 새 디자인은
 * **워드마크 + 태그라인 한 줄**뿐이다 — 반입 패키지가 캐릭터 일러스트를 전부 뺐고
 * (`EXPORT_MANIFEST` §5) 브랜드를 텍스트 워드마크로 정했다.
 *
 * 그래서 `docs/spec/screens/S1.md` 의 제목·소개 문안은 **놓을 자리가 없어졌다**.
 * 워드마크·태그라인은 정본에 없는 새 슬롯이라 시안 문안을 쓴다. 반면 **약관 줄은
 * 두 곳에 다 있는 슬롯**이라 문안 정본 규칙대로 `S1.md` 것을 그대로 둔다
 * (「계속하면 서비스 이용약관과…」가 아니라 「로그인하면 이용약관과…」) —
 * "동의가 걸리는 행위를 정확히 가리킨다"는 근거가 `S1.md` 에 적혀 있다.
 *
 * ## 그대로 지킨 것
 *
 * - **계정을 만들라고 하지 않는다** — 이메일·비밀번호 가입 경로가 없다
 * - **동의 체크박스를 두지 않는다** — 로그인 행위가 동의다
 * - **실패는 한 줄로 흡수한다** — 모달·재시도 버튼·경고 아이콘 없음(`RULES.md` 4)
 * - **취소는 아무 일도 일으키지 않는다**
 */

/**
 * 개발 통로 — **「SNS 로그인」 줄을 길게 누른다.** 개발 빌드에서만 열린다.
 *
 * (2026-11-08 — 로고가 눌리지 않는 스플래시 그림이 되어 워드마크에서 이 줄로 옮겼다.)
 *
 * ⚠ **자리를 옮겼다** (구글 로그인 연결). 전에는 Google 줄이 이 통로였다 —
 * 그 줄에 SDK 가 없어서 비어 있었기 때문이다. 이제 세 줄이 전부 실제 SDK 와
 * 서버 교환을 지나므로 **비어 있는 버튼이 하나도 없다.**
 *
 * 그래서 **버튼이 아닌 자리**로 옮긴다. 화면에 「개발용」 컨트롤을 새로 두면
 * 릴리스에서 그것을 숨기는 일이 하나 더 생기고, 소셜 줄 중 하나를 다시
 * 개발 통로로 쓰면 **실기기에서 그 공급자를 검증할 수 없다.**
 * 길게 누르기는 릴리스에서 `__DEV__` 가 false 라 아무 일도 하지 않는다 —
 * 보이지도, 눌리지도 않는다.
 *
 * `router.push` 로 건너뛰지 않는다 — `(onboarding)` 레이아웃의 라우트 가드가
 * 세션 없는 진입을 즉시 로그인으로 되돌린다(M2-0). 그래서 `signInDev` 가
 * SecureStore 에 가짜 세션을 만들고 나서 이동한다.
 *
 * **로컬에서 이것이 유일한 로그인 통로다** — 카카오는 콘솔에 이 빌드의 키 해시가
 * 있어야 하고, 구글은 SHA-1 이, 애플은 iOS 기기가 필요하다.
 */
/** 가운데 바바의 키 — 이 화면에서만 쓰는 값이라 스케일에 올리지 않는다 */
const BABA_SIZE = 180;
/** 러그 폭 — 홈처럼 바바보다 넓게 */
const RUG_WIDTH = 200;

const skipAuth = async () => {
  if (!__DEV__) return;
  // 지난 시도의 실패 안내는 지운다 — 남아 있으면 방금 한 것의 결과로 읽힌다
  useAuth.getState().clearSignInError();
  await useAuth.getState().signInDev();
  startQuestions("replace");
};

export default function Login() {
  const signingIn = useAuth((s) => s.signingIn);
  const signInError = useAuth((s) => s.signInError);

  /**
   * 카카오 로그인 (M2-1). 다음 화면은 **서버가 정한다** —
   * `onboardingRequired` 가 true 면 온보딩, false 면 홈이다.
   *
   * 중복 클릭은 store 의 `signingIn` 이 막는다. 버튼도 함께 잠기지만
   * **자물쇠는 화면이 아니라 store 에 있다** — 두 곳에서 눌려도 한 번이다.
   */
  const signInKakao = async () => {
    const outcome = await useAuth.getState().signInWithKakao();
    if (outcome.kind === "signed-in") routeAfterSignIn();
  };

  /**
   * 애플 로그인 (2026-08-24). **카카오와 같은 모양으로 부른다** — 화면은 어느
   * 공급자가 무엇을 못 하는지 모른다.
   *
   * ✅ **릴리스 잠금이 풀렸다** (2026-08-24). 서버 교환이 붙어(`DISCUSSION.md`
   * §1-10 · `POST /api/v1/auth/apple`) 이 줄이 실제로 세션을 만든다. 잠가 두었던
   * 이유는 「애플이 이름·이메일을 첫 인가 한 번만 주는데 받아 둘 서버가 없다」
   * 였는데, 서버가 그 값을 **identity token 안에서** 읽으므로 태울 한 번이
   * 없어졌다(`appleAuthApi.ts` 머리말). 그래서 옛 `isAppleLineOpen` 을 지웠고
   * `disabled` 는 카카오와 같아졌다.
   *
   * Apple 인증을 제공하는 iOS에서만 이 핸들러를 연결한다. Android 로그인 화면에는
   * Apple 버튼 자체를 렌더하지 않는다.
   */
  const signInApple = async () => {
    const outcome = await useAuth.getState().signInWithApple();
    if (outcome.kind === "signed-in") routeAfterSignIn();
  };

  /**
   * 구글 로그인. **카카오·애플과 같은 모양으로 부른다** — 화면은 어느 공급자가
   * 무엇을 못 하는지 모른다.
   *
   * 「이 기기에서 되는가」(Android 의 Play 서비스)와 「설정이 됐는가」
   * (클라이언트 ID)는 `googleSdk.ts` 가 판정해 안내 한 줄로 돌려준다 —
   * 애플 줄과 같은 규칙이다.
   */
  const signInGoogle = async () => {
    const outcome = await useAuth.getState().signInWithGoogle();
    if (outcome.kind === "signed-in") routeAfterSignIn();
  };

  return (
    // 스플래시와 같은 베이지 면 · 격자 없음(2026-11-08 · 사용자 요청)
    <Screen surface="splash" grid={false}>
      {/* 남은 높이의 한가운데에 「모멘토리」 · 태그라인 · 홈의 바바 — 바바는 글자와 SNS 로그인 사이에 앉는다
          (2026-11-08 · 사용자 요청 「위가 비어 보인다」). 글자는 전부 교보 손글씨다 */}
      <View style={styles.hero}>
        <Text variant="wordmarkHand" color={labelColor.strong}>
          모멘토리
        </Text>
        <Text variant="label1Hand" color={labelColor.neutral}>
          오늘을 돌아보고, 내일을 조금 다르게.
        </Text>
        <View style={styles.baba}>
          {/* 홈처럼 발밑에 연노랑 러그를 깐다(2026-11-08 · 사용자 요청) — 장식이라 낭독기는 읽지 않는다 */}
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.rug}
          >
            <Rug />
          </View>
          <Baba size={BABA_SIZE} />
        </View>
      </View>

      {/*
        순서는 카카오 → Google → Apple이며, Apple은 iOS에서만 표시한다.

        **둥근 네모 안에 로고만 둔다**(2026-10-13 · `SocialButton` 머리말) — 세 회사의 글자 규칙이
        서로 부딪혀 서체 · 크기를 맞출 수 없었다. 그래서 `label` 은 화면에 쓰지 않고
        낭독기가 읽는 이름이다. 문구는 그전과 같이 **각 사 목록에서 꺼낸 것**이다
        (카카오 「카카오 로그인」 · 구글 「로그인」 변형 · 애플 `sign-in` 의 `ko_KR`).
      */}
      <View style={styles.sns}>
        <Text
          variant="body2"
          color={labelColor.neutral}
          // 개발 통로 — 릴리스에서는 `skipAuth` 가 즉시 되돌아간다(위 머리말).
          // `onPress` 를 주지 않으므로 짧게 눌러도 아무 일도 없다
          onLongPress={skipAuth}
        >
          SNS 로그인
        </Text>
        <View style={styles.snsRow}>
          <SocialButton
            provider="kakao"
            label="카카오 로그인"
            disabled={signingIn}
            onPress={signInKakao}
          />
          <SocialButton
            provider="google"
            label="Google 계정으로 로그인"
            disabled={signingIn}
            onPress={signInGoogle}
          />
          {Platform.OS === "ios" ? (
            <SocialButton
              provider="apple"
              label="Apple로 로그인"
              disabled={signingIn}
              onPress={signInApple}
            />
          ) : null}
        </View>
      </View>

      {/*
        실패 안내는 **한 줄**이다 — 모달·재시도 버튼·경고 아이콘을 두지 않고
        버튼 바로 아래에서 흡수한다(`RULES.md` 4). 사용자 취소에는 뜨지 않는다.
        `accessibilityLiveRegion` 으로 보조기술에도 같은 순간에 읽힌다 —
        화면을 보지 않는 사용자가 눌린 결과를 놓치지 않게.
      */}
      {signInError ? (
        <Text
          variant="caption1"
          color={status.negativeOnSplash}
          style={styles.centered}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          {signInError}
        </Text>
      ) : null}

      <View style={styles.legal}>
        {/* 베이지 면 위라 `alternative`(3.9)는 AA 미달 — `neutral`(4.96)로 올린다 */}
        <Text
          variant="caption2"
          color={labelColor.neutral}
          style={[styles.centered, styles.legalText]}
        >
          로그인하면 <LegalLink label="이용약관" link="terms" />과{" "}
          <LegalLink label="개인정보 처리방침" link="privacy" />에 동의하게 돼요.
          {"\n"}마이에서 언제든 다시 확인할 수 있어요.
        </Text>
      </View>
    </Screen>
  );
}

/**
 * 원문으로 나가는 줄 — **앱 안 브라우저**로 랜딩 페이지를 연다
 * (2026-08-21 · `src/lib/links.ts`).
 *
 * `L1`(이용약관)·`L2`(개인정보 처리방침)는 여전히 **MVP 40화면에 없다.** 앱 안에
 * 화면을 만들지 않고 웹 문서를 그대로 보여 주는 이유가 그것이다 — 약관은 웹에서
 * 갱신되므로 앱에 복사해 두면 배포 주기가 다른 두 벌이 생긴다.
 *
 * ⚠ **버튼이 아니라 링크다.** `accessibilityRole="link"` 를 지키면 소셜 3종만
 * 「버튼」으로 읽힌다 — 이 화면에서 누를 것이 다섯 개로 늘어난 것처럼 들리지 않게.
 *
 * 밑줄은 시안에 없지만 **누를 수 있게 된 뒤에 붙였다.** 옛 줄은 색만 달랐고 그때는
 * 그것으로 "여기에 원문이 있다"만 전하면 됐다. 지금은 눌리는 자리라 색만으로
 * 구분하지 않는다(`CLAUDE.md` 규칙 3 과 같은 이유).
 */
function LegalLink({ label, link }: { label: string; link: ExternalLink }) {
  return (
    <Text
      variant="caption2"
      color={labelColor.neutral}
      accessibilityRole="link"
      onPress={() => void openExternalLink(link)}
      style={[styles.legalText, styles.legalLink]}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.sm },
  // 글자 묶음과 바바 사이 — 태그라인에 붙어 보이지 않게 띄운다
  baba: { marginTop: space.xl3, alignItems: "center" },
  // 러그 가운데가 바바 발밑에 오게 — 아래로 높이의 40% 를 내린다
  rug: {
    position: "absolute",
    bottom: -RUG_WIDTH * RUG_ASPECT * 0.4,
    width: RUG_WIDTH,
    height: RUG_WIDTH * RUG_ASPECT,
  },
  // 「SNS 로그인」 한 줄 아래에 둥근 네모 셋이 가로로 선다(`DESIGN.md` 「로그인」)
  sns: { alignItems: "center", gap: space.lg },
  snsRow: { flexDirection: "row", gap: space.xl },
  centered: { textAlign: "center" },
  // 약관은 버튼보다 좁게 — 좌우 20(Screen) + 12 = 32 (`Login.dc.html`)
  // 위 48 — 버튼 줄이 약관에 붙어 화면 아래로 몰려 보였다(2026-10-13 사용자 요청 「조금 올려」)
  legal: { paddingTop: space.xl5, paddingHorizontal: space.md },
  // 약관 줄만 caption2(14)에서 1 작게(2026-11-08 · 사용자 요청 12 → 13) — 최소 14 규칙의 이 화면 예외
  legalText: { fontSize: 13, lineHeight: 19 },
  // 누를 수 있다는 신호를 색 하나에 맡기지 않는다
  legalLink: { textDecorationLine: "underline" },
});
