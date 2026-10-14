# Expo Web Design Lab — Claude Design 홈 v2

운영 Expo Router와 별개인 웹 진입점이다. `design-imports/claude-home/`의 `홈화면 시안 v2.dc.html` 중 5a–5f를 React Native UI로 옮겼다. 원본 다운로드 파일과 기존 Vite Lab은 수정·삭제하지 않는다.

```bash
npm ci
npm run lab:web
npm run typecheck:expo-lab
```

브라우저에서 `http://localhost:8081`(터미널에 표시된 포트)을 열고 5a–5f 시나리오와 375·390·402·430px 화면을 선택한다. 주소에 `?scenario=5e&device=430`을 붙이면 특정 시작 상태를 바로 볼 수 있다.

- `src/claude-home/HomeView.tsx`: 표시 전용 `ClaudeHomeView`와 타입이 있는 `model`/`actions` Props. 앱 Provider·API·인증·알림·분석 import 없음.
- `src/claude-home/scenarios.ts`: Lab 전용 일정 Mock 6종. 체크·일정 추가·날씨 변경은 로컬 상태만 바꾼다.
- `src/claude-home/variants.ts`: 동일 Props 계약으로 후속 A/B/C RN 화면을 등록할 자리. 현재는 원본 v2 하나만 등록한다.
- `assets/claude-home/`: 원본 바바 `base-*` 레이어 10개와 날씨 이미지 6개의 바이트 동일 복사본. 원본 `design-imports/`는 그대로 둔다.
- `@expo-google-fonts/gaegu`: 원본이 참조한 Gaegu Regular/Bold 폰트. 패키지에 `LICENSE_FONT`가 포함된다.

종이 격자·날짜 스티커·폴라로이드·바바·하단 감정 카드·PaperTabBar를 RN View/Image/SVG로 구성했다. 브라우저 전용 선택 UI와 가상 상태바는 `src/App.tsx`에만 있으며, 실제 서비스에서 채택할 때는 표시 컴포넌트와 에셋/폰트 로딩 계약만 승격한다. 채택 전 운영 `app/`·`src/` 화면에서는 참조하지 않는다.

원본과 아직 다른 부분: iOS UIKit 상태바 대신 Lab 가상 상태바, CSS `backdrop-filter` 유리 흐림 대신 반투명 면, CSS `clip-path`/복합 `border-radius`의 일부 종이 가장자리는 SVG와 RN 모서리로 근사했다. iOS/Android에서 WebP·Gaegu 렌더와 safe area는 채택 전에 별도 확인해야 한다.

5a–5f와 375·390·402·430px 비교 결과, 수정 전후 차이 및 네이티브 검증 방법은 [시각 검증 기록](VISUAL_VALIDATION.md)에 정리했다.
