import type { AppScreen } from "../screens/currentAppScreens";
import type { PreviewDevice } from "../devicePresets";
import { currentScreenUrl } from "./ReferenceImage";

import splashIcon from "../../../assets/splash-icon.png";
import splashWordmark from "../../../assets/splash-wordmark.png";
import googleIcon from "../../../assets/brand/google-g.png";
import capybara from "../../../assets/home/capybara-idle.png";
import grass from "../../../assets/home/cta-grass.png";
import baba from "../../../assets/retro/baba-beanbag.png";
import happy from "../../../assets/emotion-pebble/happy.png";
import calm from "../../../assets/emotion-pebble/calm.png";
import worryBox from "../../../assets/worry-box/box-closed.webp";
import treasureBox from "../../../assets/treasure-box/chest-closed.webp";
import bodyRelease from "../../../assets/body-release/capybara-calm.webp";
import { ICON_PATHS } from "../../../src/components/ds/icons/paths";

const tabs = ["홈", "쉼터", "보관함", "리포트", "마이"];
const tabIcons = ["home", "heart", "folder-job", "document", "nav-my-page"] as const;

function AppIcon({ name, size = 24 }: { name: keyof typeof ICON_PATHS; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {ICON_PATHS[name].map((part, index) => (
        <path
          key={index}
          d={part.d}
          transform={"transform" in part ? part.transform : undefined}
          fillRule={"evenOdd" in part && part.evenOdd ? "evenodd" : undefined}
          fill={"stroke" in part && part.stroke ? "none" : undefined}
          stroke={"stroke" in part && part.stroke ? "currentColor" : undefined}
          strokeWidth={"stroke" in part && part.stroke ? 2 : undefined}
        />
      ))}
    </svg>
  );
}

function TabBar({ active }: { active: string }) {
  return (
    <div className="app-tabbar" aria-hidden="true">
      {tabs.map((tab, index) => (
        <div className={tab === active ? "active" : ""} key={tab}>
          <AppIcon name={tabIcons[index]} size={24} />
          <small>{tab}</small>
        </div>
      ))}
    </div>
  );
}

function Header({ title, back = false }: { title: string; back?: boolean }) {
  return (
    <div className="app-header">
      {back && <span className="app-back">‹</span>}
      <strong>{title}</strong>
    </div>
  );
}

function PrimaryButton({ children }: { children: React.ReactNode }) {
  return <div className="app-primary">{children}</div>;
}

function HomeContent({ withTabs = true }: { withTabs?: boolean }) {
  return (
    <>
      <div className="app-home-scroll">
        <div className="app-home-date">
          <div>
            <strong>10월 14일</strong>
            <small>수요일</small>
          </div>
          <AppIcon name="bell" />
        </div>
        <div className="app-home-card">
          <div className="app-home-card-copy">
            <strong>오늘 하루는 어땠어요?</strong>
            <p>편할 때 언제든 돌아볼 수 있어요</p>
            <div className="app-grass" style={{ backgroundImage: `url(${grass})` }}>
              지금 하루 돌아보기 <span>↗</span>
            </div>
          </div>
          <img className="app-home-capy" src={capybara} alt="" />
        </div>
        <section className="app-home-section">
          <h3>이번 주 감정</h3>
          <div className="app-week-dots">
            {"월화수목금토일".split("").map((day, index) => (
              <div key={index}>
                <i />
                <small>{day}</small>
              </div>
            ))}
          </div>
        </section>
        <section className="app-home-section">
          <div className="app-section-heading">
            <h3>오늘 일정</h3>
            <b>＋ 추가</b>
          </div>
          <div className="app-empty-schedule">
            <strong>오늘 하루를 차곡차곡 담아볼까요?</strong>
            <p>일정을 추가하면 하루를 돌아볼 때 더 풍부한 대화를 나눌 수 있어요.</p>
          </div>
        </section>
      </div>
      {withTabs && <TabBar active="홈" />}
    </>
  );
}

function ScheduleOverlay({ edit }: { edit: boolean }) {
  return (
    <div className="app-schedule-overlay">
      <div className="app-schedule-dock">
        <small>{edit ? "일정 수정" : "모멘토리에만 저장돼요 · 캘린더에는 추가되지 않아요"}</small>
        <div className="app-schedule-input">
          <span className={edit ? "filled" : ""}>
            {edit ? "산책하기" : "어떤 일정을 더할까요?"}
          </span>
          <b>{edit ? "×" : "+"}</b>
        </div>
        {edit && (
          <div className="app-schedule-actions">
            <span>취소</span>
            <span>저장</span>
          </div>
        )}
      </div>
      <div className="app-keyboard">
        <div className="app-keyboard-suggestions">
          <span>⧉</span>
          <span>자동 완성</span>
          <span>⌄</span>
        </div>
        {["ㅂㅈㄷㄱㅅㅛㅕㅑ", "ㅁㄴㅇㄹㅎㅗㅓㅏㅣ", "⇧ㅋㅌㅊㅍㅠㅜㅡ⌫"].map((row) => (
          <div className="app-key-row" key={row}>
            {[...row].map((letter, index) => (
              <span key={index}>{letter}</span>
            ))}
          </div>
        ))}
        <div className="app-key-row bottom">
          <span>123</span>
          <span>🌐</span>
          <span className="space">간격</span>
          <span>완료</span>
        </div>
      </div>
    </div>
  );
}

const onboarding: Record<string, { question: string; options?: string[]; hint?: string }> = {
  welcome: {
    question: "안녕! 나는 바바야.\n오늘을 함께 돌아볼 수 있어서 반가워.",
    options: ["시작하기"],
  },
  nickname: { question: "어떻게 불러주면 좋을까?", hint: "답장을 입력해 주세요" },
  age: { question: "몇 살인지 알려줄래?", hint: "나이 입력 (선택)" },
  gender: { question: "성별을 알려줄래?", options: ["여성", "남성", "기타"] },
  interests: {
    question: "요즘 관심 있는 것은 뭐야?",
    options: ["음악", "영화", "책", "운동", "여행", "기타"],
  },
  "onboarding-rest": {
    question: "쉴 때는 주로 뭘 하고 싶어?",
    options: ["음악 듣기", "산책", "잠자기", "영상 보기", "맛있는 것 먹기", "기타"],
  },
  "retro-time": {
    question: "하루를 돌아볼 시간을 정해볼까?",
    options: ["오후 9:00", "시간 선택하기"],
  },
  calendar: { question: "캘린더를 연결해볼까?", options: ["캘린더 연결하기", "나중에 할게요"] },
  done: { question: "준비가 끝났어!\n이제 하루를 함께 모아보자.", options: ["모멘토리 시작하기"] },
};

function OnboardingContent({ screen }: { screen: AppScreen }) {
  const info = onboarding[screen.id];
  return (
    <div className="app-onboarding">
      <div className="app-onboarding-top">
        {screen.id !== "welcome" && <span>‹</span>}
        <span>모멘토리</span>
      </div>
      <div className="app-onboarding-chat">
        <img src={baba} alt="" />
        <div className="app-chat-bubble">{info.question}</div>
        {screen.id !== "welcome" && <div className="app-previous-reply">안녕, 바바!</div>}
      </div>
      <div className="app-onboarding-bottom">
        {info.hint && (
          <div className="app-pill-input">
            {info.hint}
            <span>↗</span>
          </div>
        )}
        {info.options && (
          <div className="app-options">
            {info.options.map((option) => (
              <span key={option}>{option}</span>
            ))}
          </div>
        )}
        {screen.id !== "welcome" && screen.id !== "done" && <div className="app-next">다음</div>}
      </div>
    </div>
  );
}

function RetroContent({ screen }: { screen: AppScreen }) {
  if (screen.id === "retro-confirm")
    return (
      <div className="app-page">
        <Header title="오늘 일정" back />
        <div className="app-soft-intro">
          오늘 있었던 일을
          <br />
          함께 돌아볼까요?
        </div>
        <div className="app-paper">
          <span>10월 14일 수요일</span>
          <p>
            오늘의 일정이 아직 없어요.
            <br />
            그래도 괜찮아요.
          </p>
        </div>
        <div className="app-bottom-action">
          <PrimaryButton>이야기 시작하기</PrimaryButton>
        </div>
      </div>
    );
  if (screen.id === "retro-draft")
    return (
      <div className="app-page">
        <Header title="오늘의 일기" back />
        <div className="app-paper diary-paper">
          <span>10월 14일 수요일</span>
          <h3>오늘의 기록</h3>
          <p>
            오늘 하루를 돌아보며 내 마음을 천천히 들여다봤다. 작지만 소중한 순간을 기억하고 싶다.
          </p>
        </div>
        <div className="app-bottom-action">
          <PrimaryButton>저장하기</PrimaryButton>
        </div>
      </div>
    );
  return (
    <div className="app-page app-centered">
      <img className="app-character" src={baba} alt="" />
      <h2>
        오늘의 이야기를
        <br />잘 담아뒀어
      </h2>
      <p>내일도 이곳에서 만나요.</p>
      <div className="app-bottom-action">
        <PrimaryButton>쉼터로 가기</PrimaryButton>
      </div>
    </div>
  );
}

function RestContent({ screen }: { screen: AppScreen }) {
  const art: Record<string, string> = {
    "worry-box": worryBox,
    "treasure-box": treasureBox,
    "body-release": bodyRelease,
  };
  if (art[screen.id])
    return (
      <div className="app-page app-rest-scene">
        <Header title={screen.title} back />
        <div className="app-soft-intro">잠깐 쉬어가도 괜찮아요</div>
        <img src={art[screen.id]} alt="" />
        <div className="app-bottom-action">
          <PrimaryButton>시작하기</PrimaryButton>
        </div>
      </div>
    );
  if (screen.id === "sense-pond")
    return (
      <div className="app-page app-pond">
        <Header title="감각연못" back />
        <div className="app-soft-intro">
          지금 느껴지는 감각에
          <br />귀 기울여볼까요?
        </div>
        <div className="app-pond-rings">
          <i />
          <i />
          <i />
        </div>
        <div className="app-bottom-action">
          <PrimaryButton>시작하기</PrimaryButton>
        </div>
      </div>
    );
  if (screen.id === "wish-cards")
    return (
      <div className="app-page">
        <Header title="바람카드" back />
        <div className="app-soft-intro">마음에 남은 바람을 모았어요</div>
        <div className="app-paper">
          <span>나에게 보내는 작은 바람</span>
          <p>조금 더 편안한 하루가 찾아오기를.</p>
        </div>
      </div>
    );
  return (
    <div className="app-page">
      <Header title={screen.title} back />
      <div className="app-soft-intro">
        차곡차곡 모아둔
        <br />
        나의 쉼 기록
      </div>
      <div className="app-list-card">
        아직 기록이 없어요.
        <br />
        쉼터에서 천천히 시작해 보세요.
      </div>
    </div>
  );
}

function RecordsContent({ screen }: { screen: AppScreen }) {
  if (screen.id === "archive")
    return (
      <div className="app-page app-tab-page">
        <Header title="보관함" />
        <div className="app-segment">
          <span>달력</span>
          <span>목록</span>
        </div>
        <div className="app-calendar-head">‹　2026년 10월　›</div>
        <div className="app-calendar">
          {"일월화수목금토".split("").map((v, i) => (
            <b key={i}>{v}</b>
          ))}
          {Array.from({ length: 35 }, (_, i) => (
            <span key={i}>{i < 4 || i > 34 ? "" : i - 3}</span>
          ))}
        </div>
        <div className="app-list-card">선택한 날짜의 기록을 볼 수 있어요.</div>
        <TabBar active="보관함" />
      </div>
    );
  return (
    <div className="app-page app-tab-page">
      <Header title="리포트" />
      <div className="app-calendar-head">‹　10월 12일 – 10월 18일　›</div>
      <div className="app-soft-intro">
        이번 주의 나를
        <br />
        천천히 살펴볼까요?
      </div>
      <div className="app-list-card app-report-emotions">
        <img src={happy} alt="" />
        <img src={calm} alt="" />
        <img src={happy} alt="" />
        <p>한 주의 감정이 이곳에 모여요</p>
      </div>
      <div className="app-list-card">이번 주의 바람카드와 일기를 모아 볼 수 있어요.</div>
      <TabBar active="리포트" />
    </div>
  );
}

function MyContent({ screen }: { screen: AppScreen }) {
  if (screen.id === "my-main")
    return (
      <div className="app-page app-tab-page">
        <Header title="마이" />
        <div className="app-profile-card">
          <img src={capybara} alt="" />
          <div>
            <strong>나의 모멘토리</strong>
            <small>나의 하루를 기록해요</small>
          </div>
        </div>
        <div className="app-list-card app-menu">
          {[
            "알림 설정",
            "캘린더 연결",
            "기본 정보",
            "문의하기",
            "이용약관",
            "개인정보 처리방침",
          ].map((x) => (
            <div key={x}>
              {x}
              <span>›</span>
            </div>
          ))}
        </div>
        <TabBar active="마이" />
      </div>
    );
  if (screen.id === "profile")
    return (
      <div className="app-page">
        <Header title="기본 정보" back />
        <div className="app-list-card app-menu">
          {["닉네임", "나이", "성별", "관심 분야", "쉬는 방법"].map((x) => (
            <div key={x}>
              {x}
              <span>›</span>
            </div>
          ))}
        </div>
      </div>
    );
  if (screen.id === "inquiry")
    return (
      <div className="app-page">
        <Header title="문의하기" back />
        <div className="app-soft-intro">무엇을 도와드릴까요?</div>
        <div className="app-list-card">문의 내용을 적어 주세요.</div>
        <div className="app-bottom-action">
          <PrimaryButton>문의 보내기</PrimaryButton>
        </div>
      </div>
    );
  const options: Record<string, string[]> = {
    "my-gender": ["여성", "남성", "기타"],
    "my-interests": ["음악", "영화", "책", "운동", "여행"],
    "my-rest": ["산책", "음악 듣기", "잠자기", "영상 보기"],
  };
  return (
    <div className="app-page">
      <Header title={screen.title} back />
      <div className="app-soft-intro">
        {screen.title.replace(" 수정", "")}을(를)
        <br />
        알려주세요
      </div>
      {options[screen.id] ? (
        <div className="app-options">
          {options[screen.id].map((x) => (
            <span key={x}>{x}</span>
          ))}
        </div>
      ) : (
        <div className="app-pill-input">{screen.id === "my-nickname" ? "닉네임" : "나이"}</div>
      )}
      <div className="app-bottom-action">
        <PrimaryButton>저장</PrimaryButton>
      </div>
    </div>
  );
}

function AppDisplay({ screen, loading }: { screen: AppScreen; loading: "lazy" | "eager" }) {
  if (screen.capture)
    return (
      <img
        className={`app-capture ${screen.capture.startsWith("app-captures/") ? "native" : ""}`}
        src={
          screen.capture.startsWith("app-captures/")
            ? `/${screen.capture}`
            : currentScreenUrl(screen.capture)
        }
        alt={`${screen.title} 실제 앱 화면 캡처`}
        loading={loading}
      />
    );
  if (screen.kind === "splash")
    return (
      <div className="app-splash">
        <img className="app-splash-face" src={splashIcon} alt="" />
        <img className="app-splash-wordmark" src={splashWordmark} alt="모멘토리" />
        <div className="app-splash-spinner" />
      </div>
    );
  if (screen.kind === "login")
    return (
      <div className="app-login">
        <div className="app-login-hero">
          <h2>모멘토리</h2>
          <p>오늘을 돌아보고, 내일을 조금 다르게.</p>
        </div>
        <div className="app-login-bottom">
          <span>SNS 로그인</span>
          <div className="app-socials">
            <div className="kakao">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                {ICON_PATHS["logo-kakao"].map((part, index) => (
                  <path
                    key={index}
                    d={part.d}
                    transform={part.transform}
                    fillRule={part.evenOdd ? "evenodd" : undefined}
                  />
                ))}
              </svg>
            </div>
            <div className="google">
              <img src={googleIcon} alt="" />
            </div>
            <div className="apple"></div>
          </div>
          <small>
            로그인하면 <u>이용약관</u>과 <u>개인정보 처리방침</u>에 동의하게 돼요.
            <br />
            마이에서 언제든 다시 확인할 수 있어요.
          </small>
        </div>
      </div>
    );
  if (screen.kind === "onboarding") return <OnboardingContent screen={screen} />;
  if (screen.kind === "home") return <HomeContent />;
  if (screen.kind.startsWith("schedule"))
    return (
      <>
        <HomeContent />
        <ScheduleOverlay edit={screen.kind === "schedule-edit"} />
      </>
    );
  if (screen.kind === "retro") return <RetroContent screen={screen} />;
  if (screen.kind === "diary")
    return (
      <div className="app-page">
        <Header title="일기" back />
        <div className="app-paper diary-paper">
          <span>10월 14일 수요일</span>
          <h3>오늘의 기록</h3>
          <p>오늘의 마음과 이야기가 여기에 차곡차곡 담겨 있어요.</p>
        </div>
      </div>
    );
  if (screen.kind === "rest") return <RestContent screen={screen} />;
  if (screen.kind === "archive" || screen.kind === "report")
    return <RecordsContent screen={screen} />;
  return <MyContent screen={screen} />;
}

export function CurrentAppPreview({
  screen,
  device,
  scale = 0.65,
}: {
  screen: AppScreen;
  device: PreviewDevice;
  scale?: number;
}) {
  const outerWidth = device.width + 14;
  const outerHeight = device.height + 14;
  return (
    <div
      className="atlas-device-stage"
      style={{ width: outerWidth * scale, height: outerHeight * scale }}
    >
      <div
        className="atlas-phone"
        style={{ width: outerWidth, height: outerHeight, transform: `scale(${scale})` }}
      >
        <div className="atlas-phone-screen">
          {!screen.capture && screen.kind !== "splash" && (
            <div className="app-status">
              <span>9:41</span>
              <span>●●● ▰</span>
            </div>
          )}
          <AppDisplay screen={screen} loading={scale < 1 ? "lazy" : "eager"} />
          {!screen.capture && screen.kind !== "splash" && <div className="app-home-indicator" />}
        </div>
      </div>
    </div>
  );
}
