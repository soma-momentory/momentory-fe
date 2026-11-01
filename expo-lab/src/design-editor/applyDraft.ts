/**
 * 디자인 시안 적용 — **껍데기**. 갈래 D 가 채운다.
 * 프레임 부트스트랩이 앱 모듈을 불러오기 **전에** 부른다. `config.designDraftId` 의 시안을
 * localStorage(`DESIGN_DRAFTS_STORAGE_KEY`)에서 읽어 DS 토큰·Studio 승인값 객체를 덮어쓴다.
 */
import type { LabFrameConfig } from "../lab-contract";

export function applyDesignDraft(_config: LabFrameConfig): void {}
