import Constants from "expo-constants";
import { Platform } from "react-native";

import { authedRequest } from "@/lib/http";

/**
 * 문의하기 — `POST /api/v1/inquiries` (2026-10-13 · BE `feat/inquiry`). 그 전에는 Notion 폼을 열었다.
 *
 * 답변은 메일로 하므로 받을 이메일은 선택이다. 운영체제 · 버전 · 앱 버전은 **앱이 채운다** — 오류 신고를
 * 읽을 때 거의 늘 필요한데 사용자에게 적게 할 수는 없다. 관리 화면은 없고 개발자가 DB 에서 읽는다.
 * **던지지 않는다** — 실패는 `false` 로 닫고 화면이 한 줄로 흡수한다.
 */
export const INQUIRIES_PATH = "/api/v1/inquiries";

export const INQUIRY_CATEGORIES = [
  { id: "BUG", label: "오류 신고" },
  { id: "SUGGESTION", label: "기능 제안" },
  { id: "ACCOUNT", label: "계정과 로그인" },
  { id: "ETC", label: "기타" },
] as const;

export type InquiryCategory = (typeof INQUIRY_CATEGORIES)[number]["id"];

/** 서버 상한과 같다(`Inquiry.CONTENT_MAX_LENGTH`) */
export const INQUIRY_MAX_LENGTH = 2000;

// 서버가 30자로 자른다 — 넘으면 문의 전체가 400 이 되므로 보내기 전에 줄인다
const short = (v: unknown) => (v == null ? null : String(v).slice(0, 30));

export async function sendInquiry(input: {
  category: InquiryCategory;
  content: string;
  replyEmail: string;
}): Promise<boolean> {
  const result = await authedRequest<unknown>(
    "POST",
    INQUIRIES_PATH,
    {
      category: input.category,
      content: input.content.trim(),
      replyEmail: input.replyEmail.trim() || null,
      platform: Platform.OS === "ios" ? "IOS" : Platform.OS === "android" ? "ANDROID" : null,
      osVersion: short(Platform.Version),
      appVersion: short(Constants.expoConfig?.version),
    },
    { timeoutMs: 10_000 },
  );
  return result.ok;
}
