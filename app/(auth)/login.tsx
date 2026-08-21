import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Screen, SocialButton, Text } from "@/components/ds";
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
 * **아직 SDK 가 없는 두 줄**(Apple·Google)의 개발 통로. **개발 빌드에서만 열린다.**
 *
 * `router.push` 로 건너뛰지 않는다 — `(onboarding)` 레이아웃의 라우트 가드가
 * 세션 없는 진입을 즉시 로그인으로 되돌린다(M2-0). 그래서 `signInDev` 가
 * SecureStore 에 가짜 세션을 만들고 나서 이동한다. 릴리스에서는 `__DEV__` 가
 * false 라 두 줄이 비활성으로 남는다 — 세션 없이 보호 흐름에 들어가지 않는다.
 *
 * 카카오는 이 통로를 쓰지 않는다 — **실제 로그인이 붙었다**.
 */
const DEV_SKIP_AUTH = __DEV__;
const skipAuth = async () => {
  // 다른 줄을 누르면 카카오 실패 안내는 지운다 — 지난 시도의 말이 남아 있으면
  // 방금 누른 것의 결과로 읽힌다
  useAuth.getState().clearSignInError();
  await useAuth.getState().signInDev();
  router.replace("/welcome");
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
    if (outcome.kind !== "signed-in") return;
    router.replace(outcome.onboardingRequired ? "/welcome" : "/home");
  };

  return (
    <Screen>
      {/* 로고 영역이 남은 높이를 다 차지하고 **광학 중앙**에 온다 —
          아래 96 을 비워 시각적 무게를 위로 올린다 (`Login.dc.html` 「수직 균형」) */}
      <View style={styles.hero}>
        <Text variant="title2" color={labelColor.strong}>
          모멘토리
        </Text>
        <Text variant="body2Reading" color={labelColor.neutral}>
          오늘을 돌아보고, 내일을 조금 다르게.
        </Text>
      </View>

      {/* 순서는 시안대로 카카오 → Google → Apple */}
      <View style={styles.actions}>
        <SocialButton
          provider="kakao"
          label="카카오로 계속하기"
          disabled={signingIn}
          onPress={signInKakao}
        />
        <SocialButton
          provider="google"
          label="Google로 계속하기"
          disabled={!DEV_SKIP_AUTH || signingIn}
          onPress={skipAuth}
        />
        <SocialButton
          provider="apple"
          label="Apple로 계속하기"
          disabled={!DEV_SKIP_AUTH || signingIn}
          onPress={skipAuth}
        />
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
          color={status.negative}
          style={styles.centered}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          {signInError}
        </Text>
      ) : null}

      <View style={styles.legal}>
        <Text variant="caption2" color={labelColor.alternative} style={styles.centered}>
          로그인하면 <LegalLink label="이용약관" link="terms" />과{" "}
          <LegalLink label="개인정보 처리방침" link="privacy" />에 동의하게 돼요. 마이에서 언제든
          다시 확인할 수 있어요.
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
      style={styles.legalLink}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    // 워드마크 ↔ 태그라인. 시안은 11 이지만 `DESIGN.md` §3 의 10단 스케일이 이긴다
    gap: space.md,
    // 광학 중앙 — 이 화면에서만 쓰는 값이라 스케일에 올리지 않는다
    paddingBottom: 96,
  },
  // `DESIGN.md` 「로그인」이 소셜 3종 간격을 10 으로 못박는다 (스케일 밖 · 이 화면 전용)
  actions: { gap: 10 },
  centered: { textAlign: "center" },
  // 약관은 버튼보다 좁게 — 좌우 20(Screen) + 12 = 32 (`Login.dc.html`)
  legal: { paddingTop: space.xl, paddingHorizontal: space.md },
  // 누를 수 있다는 신호를 색 하나에 맡기지 않는다
  legalLink: { textDecorationLine: "underline" },
});
