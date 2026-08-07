# 상류 스냅샷 — 반입 대장과 절차

`docs/spec/` 은 상류 설계 저장소 **momentory**(리모트 없는 로컬 git)의 MVP 계약을
반입한 스냅샷이다. **직접 고치지 않는다** — 고칠 것이 있으면 상류에서 고쳐져 재반입된다.
구현이 스펙과 어긋나야 하면 [PRODUCT.md 「상류와 차이」](../PRODUCT.md)에 기록하고,
상류 접근 담당자가 상류 `06_운영문서/OPEN-ISSUES.md` 에 제기한다.

- **일반 개발에는 상류가 필요 없다** — 이 폴더가 화면 작업의 참조 정본이다.
- 상류 접근이 필요한 일은 **재반입**과 **`npm run sync:theme`** 둘뿐이고, 전부 담당자 전용이다.
- 담당자: 상류 로컬 저장소를 가진 사람 (현재 저장소 관리자 1인).

## 반입 기준

| 무엇 | 값 |
| --- | --- |
| 상류 저장소 | momentory (로컬 전용 git — 리모트 없음) |
| 기준 커밋 | `b850920` — "09_MVP 40화면 — 상류 리팩토링 v2 반입 (30 → 40)" (2026-08-06) |
| 반입 번들 세대 | `07_반입/_archive/UXUI리팩토링_MVP_v2_20260806_반입완료` (v2 · 2026-08-06) |
| 반입일 | 2026-08-07 |

> ⚠ 상류에 리모트가 없어 **커밋 SHA 는 담당자 기기 안에서만 의미가 있다.**
> 그래서 각 파일의 **본문 sha256** 을 함께 기록한다 — 저장소만 가진 사람도
> "반입 후 손대지 않았다"를 검증할 수 있는 유일한 수단이다. 특히 `momentory.css` 는
> 상류 git 에도 없는 파일이라(상류 `.gitignore` 가 `07_반입/_archive/` 제외)
> **이 해시가 유일한 출처 증명이다.** 상류에 리모트가 생기면 SHA 대조 자동화를 재론한다.

## 헤더 규약 (scripts/sync-theme.mjs 와 동일)

md·css 파일은 머리에 출처 주석과 `@generated-sha256`(구분선 **아래 본문**의 해시)을 달고 있다.
json 2개는 주석을 넣으면 파일이 깨지므로 **바이트 무수정**으로 두고 아래 대장으로만 검증한다.

**본문은 원칙적으로 상류 원본 그대로다. 유일한 허용 보정은 「저장소 안에서 깨지는
링크의 경로 보정」** — 상류 폴더 구조 기준의 상대 링크를 이 폴더 구조에 맞게 고치거나,
미반입 파일로 가는 링크를 일반 텍스트로 바꾸는 것뿐이다. 보정하면 ① 아래 「보정 목록」에
남기고 ② 해시는 **보정 후 본문** 기준으로 기록한다 — 재반입 때 원본과 diff 하면
보정분만 나와야 정상이다. 내용 수정은 어떤 경우에도 하지 않는다.

### 보정 목록 (2026-08-07 반입분)

| 파일 | 보정 |
| --- | --- |
| `screens/C4-b.md` | `(RULES.md)` → `(../RULES.md)` — 상류에선 같은 폴더, 여기선 상위 |
| `screens/W1.md` | 〃 |
| `COMPONENTS.md` | `TOKENS.md` 링크 → 일반 텍스트 — 상류 생성물이라 미반입 |

수동 대조:

```bash
# 구분선 아래 본문만 잘라 해시 (md 는 '<!-- ─── 여기부터 상류 원본 ─── -->' 다음 줄부터)
sed -n '/여기부터 상류 원본/,$p' docs/spec/RULES.md | tail -n +2 | sha256sum
# json 은 파일 전체
sha256sum docs/spec/momentory.states.mvp.json          # macOS: shasum -a 256
```

## 반입 대장

`OPEN-ISSUES-요약.md` 는 스냅샷이 아니라 **fe 가 쓴 발췌**라 이 대장에 없다(해시 대조 대상 아님).

| 스냅샷 | 상류 원본 | 본문 sha256 |
| --- | --- | --- |
| `COMPONENTS.md` | `02_디자인시스템/COMPONENTS.md` | `e5e13baa5682037d2170382a676dc1d11f3a5b828658dfaf6fb8f1dae5d06b50` |
| `momentory.css` | `07_반입/_archive/UXUI리팩토링_MVP_v2_20260806_반입완료/export/mvp/momentory.css` | `fdd6c575be78e85602f2dd4f75d34f1f2895d8c69a9249298bc7f4484e5bddee` |
| `momentory.schema.mvp.json` | `09_MVP/스펙/momentory.schema.mvp.json` | `d51dfd16dfbbb2a94fdc46f1d31b826aca9c1c78451babce86a02be74533060d` |
| `momentory.states.mvp.json` | `09_MVP/스펙/momentory.states.mvp.json` | `cc0123a5fab65be317ca37a835f681f9409a213c742c4ed5648b81a9ba1070b4` |
| `RULES.md` | `09_MVP/docs/RULES.md` | `36e315d5e1c6cb2eb0535cbf2da9822c95f98070efbf419d88c37a831070c610` |
| `screens/03.md` | `09_MVP/docs/03.md` | `3a0544c151b3a63c870e00c5d2759bfa7fd797c085f0cf3315b56fa4e882157b` |
| `screens/04.md` | `09_MVP/docs/04.md` | `66ca1c836eb54291552a63ac4586ead9fde5fdeacd46d70e9ec96db263bb37ec` |
| `screens/05-b.md` | `09_MVP/docs/05-b.md` | `d948956b27df3d7a0eaf545ad3e07e75f776d4ef0dbf9386e2dea29d3c12b631` |
| `screens/06.md` | `09_MVP/docs/06.md` | `beed00654773b34d398cd8fd2f6f2f4fa9ae13038fb99b34ae932730506606de` |
| `screens/06-b.md` | `09_MVP/docs/06-b.md` | `8ec52994d554d2ca35f04be20c6ffa6a28662ccd10012b0e65d3e2c79c4c45a3` |
| `screens/06-c.md` | `09_MVP/docs/06-c.md` | `124a744fe2d9c3c6543169c00a68ae8903de35a8f02835516696a6e112569011` |
| `screens/07.md` | `09_MVP/docs/07.md` | `833071c74aba260fffa7e3a1cae0463a86d6f9c46dfe92641c83243a4cf7346d` |
| `screens/08.md` | `09_MVP/docs/08.md` | `d740b00fb56e1993aff3ff9421a71566e7a8934246e5724a8baeef0910f24c2c` |
| `screens/09.md` | `09_MVP/docs/09.md` | `1d5776f58015c1a45350ed8c4ff0175b09f59acb3961d6c4b2716511271d9928` |
| `screens/10.md` | `09_MVP/docs/10.md` | `80cf91899683407c822a0a7298951fbeb59e134ce4b03e1fad7da91dc0a64281` |
| `screens/10-b.md` | `09_MVP/docs/10-b.md` | `877013ae4ed7590d1af33c5001ea5545c7f805b400846453cf3393d2ccb731ed` |
| `screens/12.md` | `09_MVP/docs/12.md` | `a3bc9fa6e9b6b2dbae2d137e1c82b6fa39a03711498cbe6aa823b8b5bfc32f18` |
| `screens/12-b.md` | `09_MVP/docs/12-b.md` | `e5c631dbb4c435b262c72ef5719cb46c56683ab60cb39a8dfb7f8eb2d351d11e` |
| `screens/12-c.md` | `09_MVP/docs/12-c.md` | `9a73c5fe251f39c1f67141dea5e8c909384cedddedac015e246de09a74e31fca` |
| `screens/12-d.md` | `09_MVP/docs/12-d.md` | `b69c0ae79ed79c946d0e7fcfe96882fe24363a1da083d8261906742493397fca` |
| `screens/12-e.md` | `09_MVP/docs/12-e.md` | `9e100355913cc9ec8043e89da23ac3ddd806ccce419dc0a188e655cbeb108061` |
| `screens/A1.md` | `09_MVP/docs/A1.md` | `c09d9a895e7550aa90e51eed8d85e7175c366cf4309dfc6299d2acf8966aad24` |
| `screens/A2.md` | `09_MVP/docs/A2.md` | `bea6190343ce51d6d34695ab3cbdd57bc964f652dc05d3ffc4dfb14988b81242` |
| `screens/A3.md` | `09_MVP/docs/A3.md` | `2b6219c1f150231c856a1d7c85df1c238ba63d9f7884ea69b2f1a70fdb2551f4` |
| `screens/A3-b.md` | `09_MVP/docs/A3-b.md` | `c77ce47d12ba1518f6f17674a0b948b96f9af9ef70a3ab1a7c316590114aacbc` |
| `screens/A3-c.md` | `09_MVP/docs/A3-c.md` | `c23d15c0c5694e36d4ed2f58e0193406f7b9967bcd5dde4e4f7a479a6520be7f` |
| `screens/A4.md` | `09_MVP/docs/A4.md` | `bd6b9210c58a5d7e93f0cceac6f4efb2cc813776dafff746bd1dc299a36b73b1` |
| `screens/C1.md` | `09_MVP/docs/C1.md` | `37c093807552442e1399ef42d36fcbb10e73ffe51224b7e947331d904d9621d2` |
| `screens/C2.md` | `09_MVP/docs/C2.md` | `dd280471d3173000fd0e9aab0c4f7980a5c032569c3593f09e93c1c021aedd33` |
| `screens/C3.md` | `09_MVP/docs/C3.md` | `39414bca751491a9a4fed0ab545e04247d0f9225294bf83308ac379df06737dc` |
| `screens/C4.md` | `09_MVP/docs/C4.md` | `d29fadd80dd40c4a60cba953548b6fb3a4c6a12e6effb4ddadb6af41194cb09a` |
| `screens/C4-b.md` | `09_MVP/docs/C4-b.md` | `dca9941857b261e166f863810eebedd8d168626e85a76528563e8a4cacf2dd53` |
| `screens/C4-c.md` | `09_MVP/docs/C4-c.md` | `2a82308d790c30c7d923ca86b99ee7f27facbef13d3a7785b45d584d139d7635` |
| `screens/C4-c2.md` | `09_MVP/docs/C4-c2.md` | `1afcde799712c25b6d0800ae3dda0eec460df474b234a80bd7762a93ab0f25d4` |
| `screens/C4-d.md` | `09_MVP/docs/C4-d.md` | `2adb1fe9817fff5f319efc92af899e77207001bae1401a33960c2c60e743d1ee` |
| `screens/C4-e.md` | `09_MVP/docs/C4-e.md` | `cb53820231c66420102e4f75d386bad8ae6c1698f8224c1aafaeeea522699caa` |
| `screens/C6.md` | `09_MVP/docs/C6.md` | `3a8a4dc8c520e36a04657506514e866f2f76e02247cb610faec933dab9999fca` |
| `screens/C6-b.md` | `09_MVP/docs/C6-b.md` | `0840949b7f5d3c5aa81e423623d720305b1430a3e000452dbb38003900904648` |
| `screens/C7.md` | `09_MVP/docs/C7.md` | `739077ca50ae87a09fae41837e55788d61cf3b6966a08794972236a26f5ad3c6` |
| `screens/M1.md` | `09_MVP/docs/M1.md` | `523116656282ae2709b24d74b83ee8a9697562addab8de4a7e92e5cd665b16b4` |
| `screens/M2.md` | `09_MVP/docs/M2.md` | `ac0d2aa83e204c9888958a95c16dc52731ba80cc08812a975820313b07c0ea2f` |
| `screens/M3.md` | `09_MVP/docs/M3.md` | `d6285c1b264061349e6dd272519a279794bd751e9238460c0680f8cd205d2f00` |
| `screens/S0.md` | `09_MVP/docs/S0.md` | `aee67ec41d4f84551e0b7b5e46bd9dd327f6eae536caca30c54cd4cf51211c8d` |
| `screens/S1.md` | `09_MVP/docs/S1.md` | `2b14cbd1373cc91948bf5784bfc1b4545d36ed371900717eda622d03771fd842` |
| `screens/W1.md` | `09_MVP/docs/W1.md` | `3e7d71d6261294880d618781e0e666a17334bd3dc3fd0ffcd28b612164bfcb3c` |
| `범위.md` | `09_MVP/스펙/범위.md` | `4cd16fea03fe86ddd5f0744a2a25d0f0c7b4a338594fbbd2f1815e20a7032f33` |

## 재반입 절차 (담당자 전용)

상류 `07_반입/` 에 새 번들이 들어와 `09_MVP/` 가 갱신되면:

1. 상류 `09_MVP/docs/RULES.md` 「변경 이력」에서 **무엇이 바뀌었는지** 먼저 읽는다
2. `docs/spec/` 파일을 새 원본으로 교체하고 헤더의 기준 커밋·sha256 과 이 대장을 갱신한다
   — `OPEN-ISSUES-요약.md` 도 상류 전문과 대조해 갱신한다
3. `CLAUDE.md`·[PRODUCT.md](../PRODUCT.md) 갱신 — 화면 수 · 상태 기계/엔티티 수 · 매핑 표
4. `ARCHITECTURE.md` §0 표 · `TASKS.md` 마일스톤 화면 목록 갱신
5. `npm run sync:theme` → `npm run check:theme` — 토큰이 바뀌었으면 따라온다.
   `src/design/tokens.mvp.ts` 의 오버라이드 중 상류에 흡수된 것을 지운다
6. **이미 구현된 화면을 새 `screens/<ID>.md` 와 한 장씩 대조**해 어긋난 항목을
   `TASKS.md` 「상류 v2 따라잡기」식 체크리스트로 적는다 — 코드부터 고치지 않는다.
   목록이 먼저다 (무엇이 남았는지 둘이 같이 봐야 하므로)

## `npm run sync:theme` (담당자 전용)

`src/design/theme.ts` 는 상류 `02_디자인시스템/theme.ts` 의 스냅샷 생성물이다.
`sync:theme` 은 **상류 폴더가 부모 디렉터리에 있어야만 돈다** — 없으면 안내 메시지와 함께
실패하며, 이것은 정상이다(일반 개발자는 돌릴 일이 없다).
`npm run check:theme` 는 커밋된 파일의 자기 일관성만 검사하므로 **상류 없이 어디서든 돈다** — CI 도 이걸 쓴다.

현재 `theme.ts` 헤더의 `@generated-from momentory@111e8368… (미커밋 변경 있음)` 은
상류가 리모트 없는 로컬이던 시기의 표식이라 그 SHA 를 체크아웃할 수는 없다 —
본문 sha256 이 실질 검증 수단이라는 위 원칙이 여기서도 같다. 다음 sync 때 깨끗한 기준으로 갱신한다.
