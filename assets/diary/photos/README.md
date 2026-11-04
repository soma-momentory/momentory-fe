# 일기 감정 사진

2026-10-31~2026-11-01 사용자가 제공한 카피바라 사진이다. 원본(1774×887 또는 1536×768)의 화면비 2:1을 유지하며 긴 변 1200px, JPEG 품질 85로 앱에 반입했다. 그림 내용이나 배경은 바꾸지 않았다. 2026-11-04 막막함(`stuck.jpg`)과 불안함(`anxious.jpg`)을 사용자가 새로 제공한 그림(원본 1774×887)으로 같은 방식으로 교체했다.

| 감정 id | 이름   | 파일           |
| ------- | ------ | -------------- |
| 1       | 행복함 | happy.jpg      |
| 2       | 뿌듯함 | proud.jpg      |
| 3       | 평온함 | calm.jpg       |
| 4       | 피곤함 | tired.jpg      |
| 5       | 막막함 | stuck.jpg      |
| 6       | 무기력 | lethargic.jpg  |
| 7       | 불안함 | anxious.jpg    |
| 8       | 우울함 | depressed.jpg  |
| 9       | 화남   | angry.jpg      |
| 10      | 답답함 | frustrated.jpg |
| 없음    | 무감정 | neutral.jpg    |

감정 10종과 감정 태그가 없는 일기용 무감정 사진까지 총 11장을 연결했다. 무감정은 새 감정 id가 아니라 빈 감정 배열의 표시용 그림이며, 스티커를 붙이지 않는다. 감정 id와 이름의 정본은 `src/features/emotion/model/emotion.ts`다.

추가할 때 이 폴더에 그림을 넣고 `src/components/diary/diaryPhotos.ts`의 `DIARY_PHOTOS`에 정적 `require`를 추가한다. Metro가 파일을 번들에 포함하도록 동적 경로를 사용하지 않는다. 배열 순서에서 사진이 등록된 첫 감정의 그림을 쓴다. 감정 배열이 비어 있으면 `NEUTRAL_DIARY_PHOTO`를 쓴다. 감정이 있을 때는 기록된 조약돌 스티커를 모두 유지한다. 스티커를 눌러 이름을 확인해도 사진은 바뀌지 않는다.
