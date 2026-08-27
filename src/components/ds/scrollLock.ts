import { createContext, useContext } from "react";

/**
 * **가로로 끄는 조작이 도는 동안 세로 스크롤을 멈춘다.**
 *
 * `Slider` 는 `PanResponder`(JS 응답자)로 도는데, 그것이 잡혀 있어도 **네이티브
 * 스크롤 뷰는 계속 스크롤한다** — 대각선으로 끌면 값이 바뀌면서 대화가 같이
 * 위아래로 밀렸다(2026-08-28 실기기). `onShouldBlockNativeResponder` 로는 안 막혔다.
 *
 * 그래서 스크롤 뷰를 가진 쪽이 **잠글 손잡이를 내려 주고**, 끄는 쪽이 손을 대는
 * 동안만 잠근다. 화면이 둘을 이어 줄 필요가 없다 — 껍데기(`ChatScaffold`) 안에
 * 슬라이더를 넣으면 저절로 물린다. 잇는 일을 화면에 맡기면 다음 화면이 빠뜨린다.
 *
 * 스크롤 뷰 밖에서 쓰면 기본값이 아무 일도 하지 않는다.
 */
export const ScrollLockContext = createContext<(locked: boolean) => void>(() => {});

/** 잠금 손잡이. 손을 뗄 때 **반드시 풀어야 한다** — 안 풀면 스크롤이 죽은 채 남는다 */
export const useScrollLock = () => useContext(ScrollLockContext);
