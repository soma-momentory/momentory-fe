# 폰트

서체는 **둘**이다 — 본문 전부를 맡는 **Pretendard** 와, 제목 넷에만 쓰는
**교보손글씨 2025 이유빈**(2026-08-22 추가). 위계는 여전히 굵기·크기로 만들고,
손글씨는 위계가 아니라 **성격**을 위해 쓴다(`src/design/ds/typography.ts`).

---

## Pretendard

본문·라벨·버튼 전부. 위계는 굵기·크기·자간으로만 만든다.

## 왜 커밋하는가

체크아웃만으로 같은 빌드가 나와야 한다. 빌드 때 폰트를 내려받으면 배포본 URL 이
바뀌거나 버전이 올라갔을 때 사람마다 다른 글자가 렌더된다.

## 출처

|             |                                           |
| ----------- | ----------------------------------------- |
| 저장소      | https://github.com/orioncactus/pretendard |
| 릴리스      | `v1.3.9`                                  |
| 내려받은 것 | `Pretendard-1.3.9.zip` → `public/static/` |
| 받은 날     | 2026-08-05                                |

```
sha256(Pretendard-1.3.9.zip) = 04be351a74d6bf7d60c480a3087e51d185485d35a52023142af1df19eb8c428a
```

## 담은 것 — 4 weight

`theme.typography.weights` 가 쓰는 것만 넣는다. 9종 전부 넣으면 앱 용량만 6MB 늘어난다.

| 파일                      | weight | sha256                                                             |
| ------------------------- | ------ | ------------------------------------------------------------------ |
| `Pretendard-Regular.otf`  | 400    | `3ffbacde6ab8411f1d2db54bb9b1f0b3ee2a738932033722cf0388c06aed1c93` |
| `Pretendard-Medium.otf`   | 500    | `d39e50e4bb52b4993b6a4eeb821a171254745bd824446af01e1f616b89fface0` |
| `Pretendard-SemiBold.otf` | 600    | `c89bc43027dc7cde5726e96223376f8eec09302b2fc1f8147fd5b57cfc376118` |
| `Pretendard-Bold.otf`     | 700    | `2e91915fab54df71cc9598ebf608b2bdb54c6fe3c066ac61dff0bc44fca71cc7` |

RN 에서는 `fontWeight` 대신 **파일 이름으로 지정한다** — Android 는 `fontWeight` 로
OTF 굵기를 골라주지 않아 400 과 700 이 같게 렌더된다.

```tsx
{ fontFamily: "Pretendard-Bold" }   // ○
{ fontFamily: "Pretendard", fontWeight: "700" }   // ✗ Android 에서 안 먹는다
```

## 라이선스

SIL Open Font License 1.1 — 전문은 [`LICENSE.txt`](LICENSE.txt).
임베딩·재배포 모두 허용되고, 폰트 파일 자체를 파는 것만 금지된다.

---

## 교보손글씨 2025 이유빈

**제목 넷에만** 쓴다 — 홈 날짜(`title2Hand`)와 탭 제목 셋(`title3Hand`:
쉼터·보관함·마이). 웨이트가 하나뿐이라 본문에는 쓸 수 없다.

| 파일                          | weight         | sha256                                                             |
| ----------------------------- | -------------- | ------------------------------------------------------------------ |
| `KyoboHandwriting2025lyb.ttf` | 단일(700 자리) | `61e8b7fa8740c3e9ade6845d0cfff3209ab2a8afd783b3ab629eda0ba47db993` |

### 출처

교보문고 손글씨 캠페인 배포본 — https://store.kyobobook.co.kr/handwriting/font
(받은 날 2026-08-22 · 사용자가 직접 받아 넣은 파일)

### 라이선스 — 임베딩 **허용** (2026-08-22 확인)

배포 페이지의 사용 범위 표에서 **「디바이스 — 어플리케이션 GUI 디자인 · 디바이스 내
탑재」와 「임베딩 — 폰트파일 임베딩 서비스」가 모두 허용**이다. 우리가 하는 일
(앱 바이너리에 `.ttf` 를 담고 앱 UI 에 쓰는 것)이 정확히 그 둘이다.

⚠ **대신 금지되는 것이 있다 — 이 저장소에 직접 걸리는 것은 첫 줄이다.**

- **수정·변경(디지털 포맷 변경)·개작·개명 금지** → 받은 `.ttf` 를 **그대로 둔다.**
  용량이 5.7MB 로 크지만 **서브셋(한글 글자 솎아내기)·`.otf` 변환·이름 바꾸기를
  하지 않는다.** 빌드 파이프라인에 폰트 최적화 단계를 넣을 때 이 줄을 먼저 본다
- 재배포·유료양도·재판매 금지 — 폰트 파일 자체를 내주거나 파는 것
- 불법 사이트·허위과장광고 등 공서양속에 반하는 곳에 사용 금지
- 이 서체를 쓴 인쇄물·광고물 이미지는 **캠페인 홍보에 활용될 수 있다**

(`LICENSE.txt` 는 Pretendard 의 OFL 이다 — 이 서체와 무관하다.)

---

## Google Sans Medium

⚠ **우리 서체가 아니다 — 구글 로그인 버튼 한 줄에만 쓴다**(2026-08-25 ·
`src/components/ds/SocialButton.tsx`). Google의 2026-07-07 브랜딩 가이드가 지정하는
**Google Sans Medium 14/20**을 맞추기 위해 Google Fonts CSS API에 `opsz=18`,
`weight=500`을 요청해 받은 공식 정적 TTF를 그대로 넣었다. 내부 이름은
`Google Sans Flex Medium`, typographic subfamily는 `Medium`이다.

| 파일                       | weight | sha256                                                            |
| -------------------------- | ------ | ----------------------------------------------------------------- |
| `GoogleSans-Medium.ttf`    | 500    | `57d61bba609846324d21608a356efe817b02cfaf724dd6b1c42d35f6169f9e6a` |

출처: <https://fonts.google.com/specimen/Google+Sans> (2026-08-25). Google Fonts가
배포한 원본이며 파일의 라이선스 메타데이터를 보존한다.

---

## Roboto Medium (미사용 보관)

2026-07-07 Google 브랜딩 가이드 개정 전 사용하던 파일이다. 이제 앱에서 로드하지
않으며 이전 빌드와 자산 이력을 검증할 수 있도록 보관한다.

구글 [브랜딩 가이드라인](https://developers.google.com/identity/branding-guidelines?hl=ko)이
당시 가이드는 로그인 버튼 라벨의 서체를 「Roboto Medium」으로 지정했다.

그래서 [`src/design/ds/typography.ts`](../../src/design/ds/typography.ts) 의
`fontFamily` 토큰에는 **올리지 않았다** — 토큰은 「우리 서체」의 목록이고, 다른
화면이 이걸 집어 쓰면 위계가 서체로 갈라진다.

| 파일                | weight | sha256                                                             |
| ------------------- | ------ | ------------------------------------------------------------------ |
| `Roboto-Medium.ttf` | 500    | `2879a5ecb7fbfa13a7fc3e2cdd7fecbf73aa45e91b541dfdfa2c442eed0aac21` |

**한글 글리프가 없다.** 「Google 계정으로 로그인」의 한글은 OS 서체로 폴백한다 —
구글이 배포하는 한국어 버튼도 같은 방식이라 규격을 벗어나지 않는다.

### 출처

|         |                                                         |
| ------- | ------------------------------------------------------- |
| 저장소  | https://github.com/googlefonts/roboto-2 (`src/hinted/`) |
| 받은 날 | 2026-08-24                                              |

### 라이선스

Apache License 2.0 — 임베딩·재배포 모두 허용된다. 파일을 그대로 담는 우리 쓰임에
추가 조건이 붙지 않는다.
