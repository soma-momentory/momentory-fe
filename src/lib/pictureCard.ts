import * as MediaLibrary from "expo-media-library/legacy";
import * as Sharing from "expo-sharing";
import type { RefObject } from "react";
import { PixelRatio, Platform, type View } from "react-native";
import { captureRef } from "react-native-view-shot";

/**
 * 화면에 그린 카드(그림일기 공유 카드)를 이미지로 찍어 **사진첩에 저장**하거나 **기본 공유 시트**로 보내는 단일 통로
 * (2026-11-18). 문안을 모른다 — 결과만 돌려주고, 무엇을 보일지는 부르는 쪽이 정한다. 던지지 않는다.
 *
 * - 찍기: `react-native-view-shot` 이 화면 밖에 그려 둔 뷰를 JPEG 임시 파일로 남긴다.
 * - 저장: `expo-media-library` 의 쓰기 전용 권한만 쓴다. Android 13 이상은 권한을 묻지 않고, 그 아래는 쓰기 권한
 *   하나를 묻는다. 사진 **읽기** 권한은 앱 설정(`app.config.ts` `blockedPermissions`)에서 막아 두었다.
 * - 공유: `expo-sharing` 이 iOS · Android 기본 공유 시트를 연다(인스타그램 스토리 · 카카오톡 등은 시트가 보여 준다).
 */
export type PictureCardResult = "ok" | "denied" | "failed";

type Size = { width: number; height: number };

async function capture(view: RefObject<View | null>, size: Size): Promise<string | null> {
  if (view.current == null) return null;
  // iOS 는 크기를 포인트로 받아 기기 배율을 곱하고, Android 는 픽셀 그대로 쓴다
  const scale = Platform.OS === "ios" ? PixelRatio.get() : 1;
  try {
    return await captureRef(view, {
      format: "jpg",
      quality: 0.92,
      result: "tmpfile",
      width: size.width / scale,
      height: size.height / scale,
    });
  } catch {
    return null;
  }
}

export async function savePictureCard(
  view: RefObject<View | null>,
  size: Size,
): Promise<PictureCardResult> {
  try {
    const permission = await MediaLibrary.requestPermissionsAsync(true);
    if (!permission.granted) return "denied";
    const uri = await capture(view, size);
    if (uri == null) return "failed";
    await MediaLibrary.saveToLibraryAsync(uri);
    return "ok";
  } catch {
    return "failed";
  }
}

export async function sharePictureCard(
  view: RefObject<View | null>,
  size: Size,
): Promise<PictureCardResult> {
  try {
    if (!(await Sharing.isAvailableAsync())) return "failed";
    const uri = await capture(view, size);
    if (uri == null) return "failed";
    await Sharing.shareAsync(uri, { mimeType: "image/jpeg", UTI: "public.jpeg" });
    return "ok";
  } catch {
    return "failed";
  }
}
