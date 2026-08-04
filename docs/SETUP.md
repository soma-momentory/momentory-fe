# 개발 환경 셋업

처음 오는 사람이 **앱을 화면에 띄우기까지**. 30분쯤 걸리고, 대부분은 네이티브 빌드 대기 시간이다.

> 막히면 아래 「자주 막히는 곳」부터 본다. 여기 적힌 6개는 전부 실제로 겪은 것이다.

---

## 0. 먼저 알아야 할 것 — Expo Go 로는 못 돈다

**앱 스토어의 Expo Go 앱으로는 이 프로젝트를 열 수 없다.** 두 가지 이유가 겹친다.

1. Expo Go 는 보통 최신 SDK 하나만 담는다. 기기의 Expo Go 가 낡으면 `Project is incompatible with this version of Expo Go` 가 뜬다.
2. 더 근본적으로, **M2 부터 카카오 로그인·캘린더·알림·생체인증이 들어온다.** 이건 Expo Go 에 없는 네이티브 모듈이라 어차피 못 돈다.

그래서 처음부터 **dev client**(우리 네이티브 모듈이 들어간 개발용 앱)를 빌드해서 쓴다.
한 번 빌드해두면 JS 변경은 그대로 리로드되므로, 네이티브 의존성을 추가할 때만 다시 빌드한다.

---

## 1. 공통

| | 버전 | 확인 |
|---|---|---|
| Node | **22.14** (`.nvmrc`) | `node -v` |
| npm | 11 이상 | `npm -v` |
| Git | 2.4x | `git --version` |
| JDK | **17 이상** (21 권장) | `java -version` |

```bash
git clone https://github.com/soma-momentory/momentory-fe.git
cd momentory-fe
nvm use          # 또는 fnm use
npm ci
cp .env.example .env
```

`.env` 값은 팀의 빌드 환경 변수에서 받는다. **비어 있어도 M1 까지는 앱이 뜬다** —
로그인·캘린더가 들어오는 M2 부터 필요하다. 값의 성격은 [`CONTRIBUTING.md` 「값을 다루는 세 등급」](CONTRIBUTING.md) 참조.

### 설계 저장소도 함께 받는다

**이 저장소만으로는 화면을 만들 수 없다.** 스펙·상태 기계·계측 규칙이 전부 설계 저장소에 있다.

```
C:\SWM\momentory\          ← 설계 저장소
  09_MVP/                  ← 우리가 만드는 30화면. 여기가 1순위
  momentory-fe/            ← 이 저장소
```

**폴더 위치를 이 구조로 맞춘다.** `npm run sync:theme` 이 `../02_디자인시스템/theme.ts` 를
상대 경로로 찾는다. 다른 곳에 두면 동기화만 안 되고 빌드는 정상이다(테마가 커밋돼 있으므로).

---

## 2. Android — Windows · Mac 공통

Windows 에서 개발한다면 이쪽이 유일한 경로다. Mac 이어도 Android 는 확인해야 한다.

### 설치

**Android Studio** 를 깔고 SDK Manager 에서:

- SDK Platforms — **Android 16 (API 36)**
- SDK Tools — **Build-Tools 36**, **Platform-Tools**, **Emulator**, **NDK 27.1**, **CMake 3.22.1**

NDK 와 CMake 는 안 깔아도 첫 빌드가 자동으로 받는다(각 1GB 안팎, 시간이 걸릴 뿐이다).

### 환경 변수

`ANDROID_HOME` 이 없으면 Gradle 이 SDK 를 못 찾는다.

```bash
# Windows (Git Bash) — 영구 설정은 시스템 환경 변수에
export ANDROID_HOME="C:/Users/<사용자>/AppData/Local/Android/Sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"

# macOS
export ANDROID_HOME="$HOME/Library/Android/sdk"
```

### 에뮬레이터 + 빌드

```bash
# 에뮬레이터를 먼저 띄운다 (Android Studio > Device Manager 로 만들어도 된다)
$ANDROID_HOME/emulator/emulator -list-avds
$ANDROID_HOME/emulator/emulator -avd <이름> &

# 부팅 확인
adb wait-for-device shell 'while [ "$(getprop sys.boot_completed)" != "1" ]; do sleep 2; done; echo OK'

npm run android      # prebuild → Gradle 빌드 → 설치 → 실행
```

**첫 빌드는 15~25분**이다 (Gradle 배포본·NDK·CMake 최초 1회 다운로드 포함).
그 다음부터는 1~3분이고, **JS 만 고칠 때는 다시 빌드하지 않는다** — Metro 가 리로드한다.

---

## 3. iOS — Mac 만

```bash
# Xcode + Command Line Tools 설치 후
sudo gem install cocoapods    # 또는 brew install cocoapods
npm run ios
```

첫 빌드는 10~20분. 시뮬레이터가 자동으로 뜬다.

---

## 4. 매일 쓰는 것

```bash
npm start              # Metro 만 띄운다 (이미 dev client 가 설치돼 있을 때)
npm run typecheck
npm run lint           # 경고도 실패다 (--max-warnings 0)
npm run check:theme    # 생성물이 손대졌는지
```

**다시 빌드해야 하는 때** — 네이티브 의존성 추가, `app.config.ts` 변경, config plugin 추가.
그 외에는 `npm start` 로 충분하다.

---

## 5. 자주 막히는 곳

### `Project is incompatible with this version of Expo Go`

Expo Go 를 쓰려 한 것이다. §0 을 읽고 `npm run android` / `npm run ios` 로 dev client 를 빌드한다.

### `Port 8081 is being used by another process`

Metro 가 이미 떠 있다. 그대로 쓰면 되므로 새로 띄울 필요가 없다.
정리하려면 그 프로세스를 끝낸다.

```bash
# Windows
netstat -ano | grep ":8081.*LISTENING"     # PID 확인 후
powershell -Command "Stop-Process -Id <PID>"
# macOS
lsof -ti:8081 | xargs kill
```

### `npm install` 이 `ERESOLVE` 로 실패

`.npmrc` 의 `legacy-peer-deps=true` 가 있으면 안 나야 정상이다. 안 나면 `npm ci` 로 다시 받는다.

⚠ **이 플래그는 진짜 충돌도 숨긴다.** 새 패키지를 넣은 뒤에는 반드시 `npm run lint` 와
`npm run typecheck` 를 돌린다. 실제로 이 플래그 때문에 ESLint 10 이 조용히 설치돼
린트가 통째로 터진 적이 있다. 제거 조건은 [`CONTRIBUTING.md` 「의존성」](CONTRIBUTING.md) 참조.

### `check:theme` 이 "생성 이후에 수정됐다" 로 실패

`src/design/theme.ts` 는 **생성물**이다. 직접 고쳤거나, 포매터가 건드렸거나, 상류가 바뀐 것이다.

```bash
npm run sync:theme    # 상류에서 다시 가져온다
```

값을 바꿔야 한다면 설계 저장소의 `05_도구/lib.mjs` 를 고치고
`node 05_도구/export-theme.mjs` 를 돌린 뒤 다시 동기화한다.

### 글자가 Pretendard 가 아닌 것 같다

`fontWeight` 로 굵기를 지정했을 가능성이 높다. **Android 는 `fontWeight` 로 OTF 굵기를 안 바꾼다.**

```tsx
{ fontFamily: "Pretendard-Bold" }                  // ○
{ fontFamily: "Pretendard", fontWeight: "700" }    // ✗
```

폰트 자체가 안 실렸는지 확인하려면 `adb logcat | grep -i "unrecognized font"` —
아무것도 안 나오면 정상 해석된 것이다.

### Gradle 빌드가 SDK 를 못 찾는다

`ANDROID_HOME` 이 셸에 없다. §2 를 다시 본다. `android/local.properties` 에
`sdk.dir` 을 직접 적어도 되지만, 그 파일은 생성물이라 `prebuild` 때 날아간다.

---

## 6. 에디터

VS Code 기준 권장 확장:

- **ESLint** · **Prettier** — 저장 시 포맷. `src/design/theme.ts` 는 `.prettierignore` 에 있으니 건드리지 않는다
- **Expo Tools**

```jsonc
// .vscode/settings.json (개인 설정 — 커밋하지 않는다)
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" }
}
```
