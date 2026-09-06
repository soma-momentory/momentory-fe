import {
  REMOVED_IN_RELEASE,
  releaseManifestPath,
  releaseManifestXml,
} from "../withoutDevOverlayPermission";

/**
 * 이 테스트가 지키는 것은 **개발자 메뉴를 죽이지 않으면서 출시본에서만 권한을 빼는 것**이다.
 * 두 가지가 함께 지켜져야 의미가 있다 — main 에서 지우면 개발이 불편해지고,
 * release 에 안 넣으면 사용자가 「다른 앱 위에 표시」를 본다.
 */

describe("release 소스셋에만 쓴다", () => {
  it("경로가 src/release 다 — main 을 건드리지 않는다", () => {
    expect(releaseManifestPath.split(/[\\/]/)).toEqual([
      "app",
      "src",
      "release",
      "AndroidManifest.xml",
    ]);
  });
});

describe("병합 결과에서 뺀다", () => {
  const xml = releaseManifestXml(REMOVED_IN_RELEASE);

  it("SYSTEM_ALERT_WINDOW 를 remove 표식으로 적는다", () => {
    expect(xml).toContain(
      '<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" tools:node="remove" />',
    );
  });

  it("tools 네임스페이스를 선언한다 — 없으면 병합이 표식을 못 읽는다", () => {
    expect(xml).toContain('xmlns:tools="http://schemas.android.com/tools"');
  });

  it("WRITE_CALENDAR 는 빼지 않는다 — expo-calendar 가 READ 와 한 쌍으로 확인한다", () => {
    // 빼면 Android 가 묻지도 않고 거부로 답해 09 캘린더 연결이 영원히 닫힌다.
    expect(xml).not.toContain("WRITE_CALENDAR");
  });

  it("권한을 늘리면 줄도 함께 는다 — 목록 한 곳만 고친다", () => {
    const two = releaseManifestXml(["a.PERM", "b.PERM"]);
    expect(two.match(/tools:node="remove"/g)).toHaveLength(2);
  });
});
