# Pretendard

앱의 유일한 서체. 위계는 굵기·크기·자간으로만 만들고 서체를 섞지 않는다
(`02_디자인시스템/theme.ts` · `typography.fontFamily`).

## 왜 커밋하는가

체크아웃만으로 같은 빌드가 나와야 한다. 빌드 때 폰트를 내려받으면 배포본 URL 이
바뀌거나 버전이 올라갔을 때 사람마다 다른 글자가 렌더된다.

## 출처

| | |
|---|---|
| 저장소 | https://github.com/orioncactus/pretendard |
| 릴리스 | `v1.3.9` |
| 내려받은 것 | `Pretendard-1.3.9.zip` → `public/static/` |
| 받은 날 | 2026-08-05 |

```
sha256(Pretendard-1.3.9.zip) = 04be351a74d6bf7d60c480a3087e51d185485d35a52023142af1df19eb8c428a
```

## 담은 것 — 4 weight

`theme.typography.weights` 가 쓰는 것만 넣는다. 9종 전부 넣으면 앱 용량만 6MB 늘어난다.

| 파일 | weight | sha256 |
|---|---|---|
| `Pretendard-Regular.otf` | 400 | `3ffbacde6ab8411f1d2db54bb9b1f0b3ee2a738932033722cf0388c06aed1c93` |
| `Pretendard-Medium.otf` | 500 | `d39e50e4bb52b4993b6a4eeb821a171254745bd824446af01e1f616b89fface0` |
| `Pretendard-SemiBold.otf` | 600 | `c89bc43027dc7cde5726e96223376f8eec09302b2fc1f8147fd5b57cfc376118` |
| `Pretendard-Bold.otf` | 700 | `2e91915fab54df71cc9598ebf608b2bdb54c6fe3c066ac61dff0bc44fca71cc7` |

RN 에서는 `fontWeight` 대신 **파일 이름으로 지정한다** — Android 는 `fontWeight` 로
OTF 굵기를 골라주지 않아 400 과 700 이 같게 렌더된다.

```tsx
{ fontFamily: "Pretendard-Bold" }   // ○
{ fontFamily: "Pretendard", fontWeight: "700" }   // ✗ Android 에서 안 먹는다
```

## 라이선스

SIL Open Font License 1.1 — 전문은 [`LICENSE.txt`](LICENSE.txt).
임베딩·재배포 모두 허용되고, 폰트 파일 자체를 파는 것만 금지된다.
