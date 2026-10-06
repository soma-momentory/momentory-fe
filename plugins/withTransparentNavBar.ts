import { AndroidConfig, withAndroidStyles, type ConfigPlugin } from "expo/config-plugins";

/**
 * 안드로이드 내비게이션 바를 **정말로 투명하게** 둔다 (2026-10-06 · 사용자 요청).
 *
 * `AppTheme` 의 `navigationBarColor` 는 이미 투명인데도, **3버튼 내비게이션**에서는 바가 흰
 * 반투명 면으로 보였다 — 안드로이드 10+ 는 버튼이 읽히게 바 뒤에 **대비 막(scrim)** 을 스스로
 * 깐다(`enforceNavigationBarContrast` 기본값 true). 스플래시(베이지)에서 S0 로 넘어가는 순간 바만
 * 흰색으로 바뀌어 보였고, 모든 화면에서 바 자리가 앱 바탕과 따로 놀았다.
 *
 * - `enforceNavigationBarContrast=false` — 막을 걷어 앱 바탕이 바 뒤까지 이어진다
 * - `windowLightNavigationBar=true` — 바탕이 밝은 크림·베이지라 **버튼을 어둡게** 그린다.
 *   다크 모드는 두지 않으므로(`userInterfaceStyle: "light"`) 늘 이 값이다
 *
 * 제스처 내비게이션은 원래 막이 없어 바뀌는 것이 없다. 하단 독의 여백(`androidNavGap`)은
 * 그대로다 — 막이 사라져도 버튼 자리는 시스템 바 몫이다.
 */
export const NAV_BAR_ITEMS = [
  { name: "android:enforceNavigationBarContrast", value: "false" },
  { name: "android:windowLightNavigationBar", value: "true" },
] as const;

const withTransparentNavBar: ConfigPlugin = (config) =>
  withAndroidStyles(config, (cfg) => {
    let styles = cfg.modResults;
    for (const item of NAV_BAR_ITEMS) {
      styles = AndroidConfig.Styles.assignStylesValue(styles, {
        add: true,
        parent: AndroidConfig.Styles.getAppThemeGroup(),
        name: item.name,
        value: item.value,
        // 두 속성 모두 API 27·29 부터다 — 그 아래 기기에서 빌드가 깨지지 않게 표시해 둔다
        targetApi: item.name === "android:enforceNavigationBarContrast" ? "29" : "27",
      });
    }
    cfg.modResults = styles;
    return cfg;
  });

export default withTransparentNavBar;
