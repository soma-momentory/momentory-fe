import * as MediaLibrary from "expo-media-library/legacy";
import * as Sharing from "expo-sharing";
import { createRef } from "react";
import { PixelRatio, Platform, type View } from "react-native";
import { captureRef } from "react-native-view-shot";

import { savePictureCard, sharePictureCard } from "@/lib/pictureCard";

const SIZE = { width: 1080, height: 1920 };
const mounted = () => {
  const ref = createRef<View>();
  (ref as { current: View | null }).current = {} as View;
  return ref;
};

describe("그림일기 카드 저장 · 공유", () => {
  beforeEach(() => jest.clearAllMocks());

  it("쓰기 전용 권한으로 묻고, 스토리 크기 JPEG 로 찍어 사진첩에 저장한다", async () => {
    jest.spyOn(PixelRatio, "get").mockReturnValue(3);
    await expect(savePictureCard(mounted(), SIZE)).resolves.toBe("ok");
    expect(MediaLibrary.requestPermissionsAsync).toHaveBeenCalledWith(true);
    expect(captureRef).toHaveBeenCalledWith(
      expect.anything(),
      // iOS 는 포인트로 받으므로 3배 화면에서 360 × 640 을 넘겨야 1080 × 1920 이 된다
      expect.objectContaining({ format: "jpg", width: 360, height: 640, result: "tmpfile" }),
    );
    expect(MediaLibrary.saveToLibraryAsync).toHaveBeenCalledWith("file:///tmp/picture-card.jpg");
  });

  it("Android 는 크기를 픽셀 그대로 넘긴다", async () => {
    const os = jest.replaceProperty(Platform, "OS", "android");
    await savePictureCard(mounted(), SIZE);
    expect(captureRef).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ width: 1080, height: 1920 }),
    );
    os.restore();
  });

  it("권한을 거절하면 찍지도 저장하지도 않는다", async () => {
    jest.mocked(MediaLibrary.requestPermissionsAsync).mockResolvedValueOnce({
      granted: false,
    } as Awaited<ReturnType<typeof MediaLibrary.requestPermissionsAsync>>);
    await expect(savePictureCard(mounted(), SIZE)).resolves.toBe("denied");
    expect(captureRef).not.toHaveBeenCalled();
    expect(MediaLibrary.saveToLibraryAsync).not.toHaveBeenCalled();
  });

  it("공유는 찍은 JPEG 를 기본 공유 시트로 보낸다", async () => {
    await expect(sharePictureCard(mounted(), SIZE)).resolves.toBe("ok");
    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      "file:///tmp/picture-card.jpg",
      expect.objectContaining({ mimeType: "image/jpeg" }),
    );
  });

  it("카드가 아직 그려지지 않았거나 찍기 · 공유가 실패하면 던지지 않고 failed 다", async () => {
    await expect(sharePictureCard(createRef<View>(), SIZE)).resolves.toBe("failed");
    jest.mocked(captureRef).mockRejectedValueOnce(new Error("blank"));
    await expect(savePictureCard(mounted(), SIZE)).resolves.toBe("failed");
    jest.mocked(Sharing.isAvailableAsync).mockResolvedValueOnce(false);
    await expect(sharePictureCard(mounted(), SIZE)).resolves.toBe("failed");
  });
});
