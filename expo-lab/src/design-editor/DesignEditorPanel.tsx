/**
 * 디자인 편집 패널 — **껍데기**. 갈래 D 가 채우고, 셸(갈래 C)이 오른쪽에 끼워 쓴다.
 */
import { Text, View } from "react-native";

export type EditorFrameRef = {
  frameId: string;
  /** 같은 출처 iframe — 화면 요소 선택에 `contentDocument` 를 쓸 수 있다 */
  element: HTMLIFrameElement | null;
  /** 시안이 적용된 프레임인가(승인본 프레임은 false) */
  isDraft: boolean;
};

export type DesignEditorPanelProps = {
  /** 지금 시안 프레임에 걸린 시안 id. null 이면 시안 없음 */
  activeDraftId: string | null;
  onActiveDraftChange: (draftId: string | null) => void;
  /** 시안 내용이 바뀌었다 — 셸은 시안 프레임을 다시 불러온다 */
  onDraftChanged: (draftId: string) => void;
  frames: readonly EditorFrameRef[];
  /** 지금 보고 있는 라우트(예: "/home") */
  currentRoute: string;
};

export function DesignEditorPanel(_props: DesignEditorPanelProps) {
  return (
    <View testID="design-editor-panel">
      <Text>디자인 편집기 (준비 중)</Text>
    </View>
  );
}
