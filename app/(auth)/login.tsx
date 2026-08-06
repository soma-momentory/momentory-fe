import { router } from "expo-router";
import { Image, StyleSheet, View } from "react-native";

import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import theme from "@/design/theme";

/**
 * `S1` · 로그인 · 소셜 3종
 *
 * **계정을 만들라고 하지 않는다.** 이메일·비밀번호 가입 경로를 두지 않아 첫 마찰을 없앤다.
 * 제목·설명·약속 세 줄은 **서로 다른 질문에 답한다** — 어떤 앱인지 / 무엇을 하는지 /
 * 어떤 마음으로 쓰는지. 사용자는 3~5초만 보므로 세 줄이 같은 말을 나눠 하면 하나도 남지 않는다.
 *
 * 규격은 `09_MVP/docs/S1.md`.
 */
/**
 * M2-0 인증 부트스트랩이 붙기 전까지의 임시 통로. **개발 빌드에서만 열린다.**
 *
 * 주석으로 "임시" 라고 적어두는 것은 빌드에서 걸러지지 않는다 — 이대로 배포되면
 * 세션 없이 누구나 보호 흐름에 들어간다. `__DEV__` 는 릴리스에서 false 이고
 * 그때 버튼은 비활성으로 남는다(온보딩 화면을 볼 수 없게 되는 것이 맞다).
 */
const DEV_SKIP_AUTH = __DEV__;
const skipAuth = () => router.push("/welcome");

export default function Login() {
  return (
    <ScreenBackground variant="entry">
      <View style={styles.root}>
        <View style={styles.hero}>
          <Image
            source={require("../../assets/baba/sitting-greeting.png")}
            style={styles.baba}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="바바"
          />

          <AppText variant="title" tone="strong" style={styles.centered}>
            하루를 함께 돌아보는{"\n"}작은 쉼터
          </AppText>

          <AppText variant="body" tone="body" style={styles.centered}>
            바바와 짧게 이야기하며 오늘을 천천히 돌아보는 공간
          </AppText>

          <AppText variant="bodySm" tone="caption" style={styles.centered}>
            잘 해내지 않아도, 매일 쓰지 않아도 괜찮아요.
          </AppText>
        </View>

        <View style={styles.actions}>
          {/*
            shape="rounded" — S1 은 MVP 리팩토링 대상이 아니라 원본 값을 쓴다
            (`9-mvp.mjs` 는 28화면뿐이고 진입 2장이 없다). MVP 화면의 CTA 는 알약이다.

            ⚠ **개발 빌드에서만 인증을 건너뛴다.** 화면만 만드는 동안 온보딩에
            도달할 길이 필요해서인데, 릴리스에서는 `__DEV__` 가 false 라 비활성으로
            남는다 — 세션 없이 보호 흐름에 들어가지 않는다.
            실제 흐름(소셜 SDK → 세션 교환 → 진입 판정)은 M2-0 에서 붙이고,
            그때 이 세 줄이 각자의 provider 를 부른다.
          */}
          <AppButton
            label="카카오로 시작하기"
            variant="kakao"
            shape="rounded"
            disabled={!DEV_SKIP_AUTH}
            onPress={skipAuth}
          />
          <AppButton
            label="Apple로 시작하기"
            variant="apple"
            shape="rounded"
            disabled={!DEV_SKIP_AUTH}
            onPress={skipAuth}
          />
          <AppButton
            label="Google로 시작하기"
            variant="google"
            shape="rounded"
            disabled={!DEV_SKIP_AUTH}
            onPress={skipAuth}
          />

          {/*
            동의 체크박스를 두지 않는다 — 로그인 행위가 동의다.
            대신 무엇에 동의하는지 버튼 아래에 그대로 적는다.
            "시작하면"이 아니라 "로그인하면" — 동의가 걸리는 행위를 정확히 가리킨다.
          */}
          <AppText variant="footnote" tone="legal" style={styles.centered}>
            로그인하면 <LegalLink label="이용약관" />과 <LegalLink label="개인정보 처리방침" />에
            동의하게 돼요. 기록은 안전하게 보호돼요. 약관은 마이에서 다시 볼 수 있어요.
          </AppText>
        </View>
      </View>
    </ScreenBackground>
  );
}

/**
 * ⚠ 현재는 눌리지 않는다.
 *
 * `L1`(이용약관)·`L2`(개인정보 처리방침)는 **MVP 30화면에 없다.** 문안도 법률 검토 중이라
 * (`06_운영문서/OPEN-ISSUES.md` R-10~R-15) 지금 링크를 살릴 근거가 없다.
 * 밑줄·색은 유지해 "여기에 원문이 있다"는 사실은 전한다.
 *
 * TODO 문안이 확정되면 `01_화면설계/1. SPLASH/docs/L1.md`·`L2.md` 를 화면으로 만들거나,
 *      웹 약관 URL 이 생기면 `Linking.openURL` 로 연결한다.
 */
function LegalLink({ label }: { label: string }) {
  return (
    <AppText
      variant="footnote"
      tone="accent"
      style={styles.link}
      accessibilityRole="link"
      accessibilityState={{ disabled: true }}
    >
      {label}
    </AppText>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "space-between",
    paddingTop: 48,
    paddingBottom: 24,
  },
  hero: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: theme.layout.gap.element,
  },
  baba: { width: 168, height: 168, marginBottom: 8 },
  centered: { textAlign: "center" },
  actions: { gap: theme.layout.gap.chip },
  link: { textDecorationLine: "underline" },
});
