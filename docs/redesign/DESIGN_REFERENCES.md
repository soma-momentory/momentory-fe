# 네 화면 디자인 레퍼런스

> 상태: 2026-10-17 등록. 사용자가 지정한 Claude Design HTML 원본 네 개를 바이트 그대로 보존했다. 운영 앱 화면 변경이나 시안 구현 승인을 뜻하지 않는다.

## 원본과 운영 화면

원본 출처: 저장소 밖 `C:/SWM/momentory/momentory/홈화면 시안 3개 검토/export/`. 반입 경로: `design-imports/claude-home/홈화면 시안 3개 검토/`.

| 화면   | 등록한 HTML 원본                                                                                 | 원본 및 반입 파일 SHA-256                                          | 현재 운영 화면 캡처                        |
| ------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------ |
| 쉼터   | [02-rest.dc.html](<../../design-imports/claude-home/홈화면 시안 3개 검토/02-rest.dc.html>)       | `71f58fe1fddcddf382ff390c53b314227fc9605ecf86fd8db3635420c1862e29` | `expo-lab/assets/current-app/rest-hub.png` |
| 보관함 | [03-archive.dc.html](<../../design-imports/claude-home/홈화면 시안 3개 검토/03-archive.dc.html>) | `62fc7ed73dd4b9071591a1bdea0c4309544cec13743f073ad89d4875a853608f` | `expo-lab/assets/current-app/archive.png`  |
| 리포트 | [04-report.dc.html](<../../design-imports/claude-home/홈화면 시안 3개 검토/04-report.dc.html>)   | `ebcfb77ad915472c648738a80ca04a847b01357b432a81973a42d5951baacba2` | `expo-lab/assets/current-app/report.png`   |
| 마이   | [05-my.dc.html](<../../design-imports/claude-home/홈화면 시안 3개 검토/05-my.dc.html>)           | `ac85ca5645f6d2805ebacb0aa1c593e11803d51a3f41028fa8365431682dc339` | `expo-lab/assets/current-app/my-main.png`  |

HTML은 402 × 874 px 화면을 표현한다. 현재 운영 캡처는 비교 대상이며 새 시안 자산으로 복사하지 않았다.

## 의존 파일과 중복 방지

- 네 HTML이 참조하는 `support.js`, `image-slot.js`, `Baba.dc.html`, `PaperTabBar.dc.html`, `_ds/` 스타일 및 런타임, `assets/baba/` 캐릭터 레이어는 같은 반입 경로에 이미 있다. 원본 export의 대응 파일과 SHA-256이 같아 다시 복사하지 않았다.
- 쉼터 HTML의 `uploads/baba-sleep.png`는 새 이미지라 같은 경로에 한 번 등록했다. 원본 및 반입 파일 SHA-256은 `f5ea87d526a247ffe723c1f01d2d7e56e17c7acac1731e1a244baf6b7676cf35`다.
- 쉼터 HTML의 `uploads/worries.png`, `uploads/treasures.png`, `uploads/rest-records.png`는 각각 저장소의 `expo-lab/assets/current-app/` 파일과 SHA-256이 같다. 세 PNG의 사본은 만들지 않았다. [미리보기 서버](<../../design-imports/claude-home/홈화면 시안 3개 검토/preview-references.py>)가 이 세 요청만 기존 운영 캡처 경로로 연결한다.
- `docs/redesign/current-screens/`, `expo-lab/assets/current-app/`, `expo-lab/assets/current-app-thumbnails/`는 각기 기존 화면·축소 캡처 용도다. 새 원본의 저장 위치로 사용하지 않는다.

## 로컬에서 열기

저장소 루트에서 다음을 실행하고, 출력되는 네 `http://127.0.0.1:8765/...` 주소를 브라우저로 연다.

```powershell
python "design-imports/claude-home/홈화면 시안 3개 검토/preview-references.py"
```

`file://` 열람은 HTML 컴포넌트의 `fetch`가 차단될 수 있어 지원하지 않는다. 미리보기 서버는 로컬 루프백에서만 열리고, 원본 HTML을 수정하지 않으며, 중복 PNG 세 개만 기존 저장소 파일에 연결한다. HTML은 Google Fonts의 Gaegu를 요청하므로 오프라인에서는 대체 글꼴이 보일 수 있다.

2026-10-17 검증: 네 HTML과 공통 CSS/JS·이미지 경로를 HTTP 200으로 확인했다. Chrome에서 네 화면의 제목·콘텐츠·하단 탭과 쉼터 카드 이미지 및 캐릭터 렌더를 확인했다. 네 원본 HTML과 새 `baba-sleep.png`는 출처 파일과 SHA-256이 일치한다.
