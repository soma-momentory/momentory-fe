// Shared random-but-deterministic sample data: 2025-08-01 ~ 2026-08-13
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export const MOODS=['행복함','두근함','평온함','피곤함','무기력','우울함','불안함','막막함','화남/답답'];
const TITLES=['아침 산책 30분','약 챙겨 먹기','보고서 초안 정리','저녁에 통화하기','방 정리하기','장보기','책 20쪽 읽기','스트레칭 10분','일찍 잠들기','메일함 비우기'];
const EXCERPTS=[
'별일 없는 하루. 별일 없다는 게 이렇게 조용한 일인 줄 몰랐다.',
'미뤄둔 정리를 끝냈다. 책상이 넓어지니 생각도 조금 넓어졌다.',
'회의가 길었다. 집에 오자마자 아무것도 하지 않고 누워 있었다.',
'괜히 사람들 소식을 오래 들여다봤다. 오늘은 그냥 그런 날.',
'하고 싶던 말을 한 문장 꺼냈다. 생각보다 아무 일도 일어나지 않았다.',
'날이 좋아서 멀리 돌아 걸었다.',
'할 일을 하나만 줄였더니 하루가 조금 헐거워졌다.',
'잠이 얕았다. 그래도 약은 챙겨 먹었다.',
'오래 미룬 연락을 했다. 목소리를 들으니 마음이 놓였다.',
'비 소리만 듣다가 잠들었다.',
'아무것도 하지 않은 날. 그래도 밥은 챙겨 먹었다.',
'작은 일 하나를 끝냈을 뿐인데 하루가 달라 보였다.',
'생각이 많아서 걷는 길을 한 바퀴 더 돌았다.',
'좋아하는 노래를 오래 들었다. 그걸로 충분했다.'
];
const CARD_POOL=[
['할 일이 밀리면 숨이 막히는 것 같다고 했어요','가장 작은 하나만 골라 10분만 해보기'],
['사람들 앞에서 말할 일이 계속 미뤄진다고 했어요','하고 싶은 말 한 문장만 소리 내어 읽어보기'],
['잠들기 전 생각이 많아진다고 했어요','자기 전 걱정 세 줄만 적어 상자에 넣어두기'],
['혼자 있는 시간이 길어졌다고 했어요','가까운 사람에게 안부 한 줄 보내기'],
['몸이 무거운 날이 이어진다고 했어요','창문 열고 3분만 크게 숨 쉬기'],
['화면을 오래 보다 하루가 끝난다고 했어요','자기 전 30분은 화면 없이 보내보기'],
['해야 할 말을 삼키는 날이 많다고 했어요','오늘 느낀 것 한 줄만 적어보기'],
['쉬어도 쉰 것 같지 않다고 했어요','알람 없이 눈 감고 10분 쉬어보기']
];
const NOTES=[
'생각보다 금방 끝났다. 시작이 제일 무거웠다.',
'소리 내어 읽었는데, 생각만 할 때보다 덜 떨렸다.',
'세 줄을 다 못 채웠지만 눕는 게 조금 가벼웠다.',
'답장이 와서 생각보다 오래 이야기했다.',
'별거 아닌데 기분이 조금 나아졌다.',
'하다 말았지만 안 한 것보단 나았다.',
'막상 해보니 5분도 안 걸렸다.'
];
const START=Date.UTC(2025,7,1), TODAY=Date.UTC(2026,7,13);
const CANON={
tasks:[['아침 산책 30분',true,'행복함'],['약 챙겨 먹기',true,'평온함'],['보고서 초안 정리',true,null],['저녁에 통화하기',false,null]],
diary:{mood:'행복함',excerpt:'보고서 초안을 오래 붙잡고 있었다. 점심에 잠깐 밖에 나가 걸었다.'},
card:{situation:'보고서를 오래 붙잡고 있었다고 했어요',action:'마치기 전에 10분 밖으로 나가 걷기',done:false,note:''}
};
export function getDay(y,m,d){
  const t=Date.UTC(y,m-1,d);
  if(t<START||t>TODAY)return null;
  if(y===2026&&m===8&&d===13)return CANON;
  const r=mulberry32(y*10000+m*100+d);
  const n=Math.floor(r()*6); // 0~5 tasks
  const startIdx=Math.floor(r()*TITLES.length);
  const tasks=[];
  for(let i=0;i<n;i++){
    const title=TITLES[(startIdx+i*3)%TITLES.length];
    const done=r()<0.7;
    const mood=done&&r()<0.6?MOODS[Math.floor(r()*MOODS.length)]:null;
    tasks.push([title,done,mood]);
  }
  const diary=r()<0.55?{mood:MOODS[Math.floor(r()*MOODS.length)],excerpt:EXCERPTS[Math.floor(r()*EXCERPTS.length)]}:null;
  let card=null;
  if(r()<0.32){
    const c=CARD_POOL[Math.floor(r()*CARD_POOL.length)];
    const done=r()<0.6;
    card={situation:c[0],action:c[1],done,note:done&&r()<0.7?NOTES[Math.floor(r()*NOTES.length)]:''};
  }
  return {tasks,diary,card};
}
export function monthKeys(){
  const ks=[];let y=2026,m=8;
  while(y>2025||m>=8){ks.push(y+'-'+m);m--;if(m<1){m=12;y--;}if(y<2025)break;}
  return ks;
}
export function cardLog(y,m,d,count){
  const out=[];let t=Date.UTC(y,m-1,d)-86400000;
  while(out.length<count&&t>=START){
    const dt=new Date(t);
    const g=getDay(dt.getUTCFullYear(),dt.getUTCMonth()+1,dt.getUTCDate());
    if(g&&g.card)out.push({y:dt.getUTCFullYear(),m:dt.getUTCMonth()+1,d:dt.getUTCDate(),card:g.card});
    t-=86400000;
  }
  return out;
}
export function latestCardDay(y,m){
  const len=new Date(y,m,0).getDate();
  for(let d=len;d>=1;d--){const g=getDay(y,m,d);if(g&&g.card)return d;}
  return null;
}
const MINE_MID=[
'점심에 잠깐 밖에 나가 걸었다. 그 사이 어깨가 조금 내려갔다.',
'밥을 챙겨 먹은 게 오늘의 제일 큰 일이었다.',
'짧게라도 몸을 움직이니 머리가 덜 무거웠다.',
'오늘은 사람 말소리보다 조용한 게 좋았다.',
'창밖을 오래 봤다. 별 이유는 없었다.',
'미루던 연락 하나를 보냈다. 손이 몇 번 멈캆다.'
];
const MINE_END=[
'내일은 조금 덜 미루는 것부터 해보기로 했다.',
'오늘은 여기까지만 하기로 했다.',
'자기 전엔 아무 생각도 하지 않기로 했다.',
'내일은 충분히 쉬는 것부터 챙기기로 했다.'
];
const OTHER_A=[
'오늘 지현님은 무거운 하루를 그냥 흘려보내지 않았어요.',
'오늘의 기록엔 버텨낸 시간이 그대로 담겨 있어요.',
'지현님이 스스로를 챙긴 순간들이 곳곳에 보였어요.'
];
const OTHER_B=[
'밥을 챙겨 먹은 것도, 하루를 적어낸 것도 스스로를 돌본 일이에요.',
'미룬 일은 게으름이 아니라 남은 힘을 아껴둔 선택이었어요.',
'조용히 보낸 시간은 도망이 아니라 회복이었어요.'
];
const OTHER_C=[
'내일의 지현님을 저도 함께 응원할게요.',
'그 마음, 제가 기억하고 있을게요.',
'오늘도 이야기해 줘서 고마워요.'
];
export function diaryText(y,m,d){
  const g=getDay(y,m,d);
  if(!g||!g.diary)return null;
  const r=mulberry32(y*10000+m*100+d+7);
  const score=4+Math.floor(r()*5);
  const mine=[
    [g.diary.excerpt, MINE_MID[Math.floor(r()*MINE_MID.length)]],
    [MINE_MID[Math.floor(r()*MINE_MID.length)], '하루를 점수로 매기면 '+score+'점. 생각보다 나쁘지 않았다.', MINE_END[Math.floor(r()*MINE_END.length)]]
  ];
  const other=[
    [OTHER_A[Math.floor(r()*OTHER_A.length)], OTHER_B[Math.floor(r()*OTHER_B.length)]],
    [OTHER_B[Math.floor(r()*OTHER_B.length)], score+'점이라는 숫자 안에는 오늘을 지나온 시간이 전부 들어 있어요.', OTHER_C[Math.floor(r()*OTHER_C.length)]]
  ];
  return {mine,other,score};
}
