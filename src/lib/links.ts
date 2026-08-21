import { openBrowserAsync } from "expo-web-browser";
import { Linking } from "react-native";

/**
 * 앱 밖 문서로 나가는 단일 통로 — **웹 주소를 아는 곳은 여기 하나다.**
 *
 * `notifications.ts` · `calendar.ts` 와 같은 자리다: 네이티브를 부르고 **던지지
 * 않는다.** 약관을 못 열었다고 로그인 화면이 멈추면 안 된다.
 *
 * ## 앱 안에서 연다
 *
 * `Linking.openURL` 은 앱을 **떠난다** — 사용자가 돌아오려면 앱을 다시 찾아야
 * 하고, 로그인 도중이었다면 흐름이 끊긴다. `openBrowserAsync` 는 앱 위에 브라우저를
 * 덮어(iOS SFSafariViewController · Android Custom Tabs) 닫으면 원래 화면 그대로다.
 *
 * 그래도 `Linking` 이 남아 있는 이유는 **네이티브 모듈이 없는 dev client** 때문이다.
 * `expo-web-browser` 는 2026-08-21 에 들어왔으므로 그 전에 만든 빌드에는 없다 —
 * 그때는 시스템 브라우저로라도 여는 편이 아무 일도 일어나지 않는 것보다 낫다.
 *
 * ## 주소를 화면에 적지 않는다
 *
 * 랜딩 페이지가 옮겨 가면 고칠 곳이 하나여야 한다. 화면은 `"terms"` 같은 **이름**만
 * 알고, 그 이름이 어디를 가리키는지는 이 파일이 정한다.
 */

/**
 * 랜딩 페이지의 법적 고지 두 장과 문의 폼.
 *
 * ⚠ **앱 안에 문안을 두지 않는다** — 약관은 법률 검토를 거쳐 웹에서 갱신되고,
 * 앱을 다시 배포해야 바뀌는 자리에 복사해 두면 두 벌이 어긋난다.
 */
export const EXTERNAL_LINKS = {
  /** 개인정보 처리방침 — 로그인 약관 줄 · 마이 「지원」 */
  privacy: "https://momentory-landing.vercel.app/privacy",
  /** 이용약관 — 로그인 약관 줄 · 마이 「지원」 */
  terms: "https://momentory-landing.vercel.app/terms",
  /** 문의하기 — Notion 폼. 별도의 문의 화면을 만들지 않는다 */
  support: "https://thirsty-meadowlark-63f.notion.site/3c12fa8ed7a180d9a36bd8cab3bf1f2d?pvs=105",
} as const;

export type ExternalLink = keyof typeof EXTERNAL_LINKS;

/**
 * 문서 하나를 앱 안 브라우저로 연다. **던지지 않는다.**
 *
 * 열지 못했으면 `false` 를 준다 — 지금 부르는 곳들은 그 값을 쓰지 않는다.
 * 브라우저가 하나도 없는 기기는 사실상 없고, 한 줄 안내를 띄우면 **눌린 순간
 * 화면 밖으로 나가버린 뒤라** 사용자가 그 줄을 볼 자리가 없기 때문이다.
 */
export async function openExternalLink(key: ExternalLink): Promise<boolean> {
  const url = EXTERNAL_LINKS[key];

  try {
    await openBrowserAsync(url);
    return true;
  } catch {
    // 네이티브 모듈이 없는 옛 dev client — 앱을 떠나더라도 문서는 보여 준다
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      return false;
    }
  }
}
