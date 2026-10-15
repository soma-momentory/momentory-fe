import { useEffect, useState } from "react";

import { AllScreensScreen } from "./screens/AllScreensScreen";
import { ScreenPreview } from "./screens/ScreenPreview";
import { SCREEN_GROUPS } from "./screens/currentAppScreens";
import { PREVIEW_DEVICES, type PreviewDeviceId } from "./devicePresets";
import "./styles/lab.css";

export function App() {
  const [deviceId, setDeviceId] = useState<PreviewDeviceId>("iphone-16e");
  const [locationHash, setLocationHash] = useState(() => window.location.hash);
  const device = PREVIEW_DEVICES.find((item) => item.id === deviceId) ?? PREVIEW_DEVICES[1];
  const allScreens = SCREEN_GROUPS.flatMap((group) => group.screens);
  const isPreview = locationHash.startsWith("#preview/");
  const selectedId = isPreview ? locationHash.slice("#preview/".length) : "home-main";
  const selectedScreen = allScreens.find((screen) => screen.id === selectedId) ?? allScreens[0];

  useEffect(() => {
    const syncLocation = () => setLocationHash(window.location.hash);
    window.addEventListener("hashchange", syncLocation);
    return () => window.removeEventListener("hashchange", syncLocation);
  }, []);

  return (
    <main className="lab-shell">
      <aside className="lab-sidebar" aria-label="Design Lab 제어판">
        <div>
          <p className="lab-eyebrow">MOMENTORY</p>
          <h1>Design Lab</h1>
          <p className="lab-description">
            전체 화면을 훑거나, 하나를 골라 스마트폰 크기로 미리볼 수 있습니다.
          </p>
        </div>

        <nav className="lab-pages" aria-label="디자인 랩 페이지">
          <span>페이지</span>
          <a href="#atlas" aria-current={!isPreview ? "page" : undefined}>
            기존 앱 · 전체 화면
          </a>
          <a href={`#preview/${selectedScreen.id}`} aria-current={isPreview ? "page" : undefined}>
            현재 앱 · 화면 미리보기
          </a>
        </nav>

        {isPreview && (
          <nav className="screen-picker" aria-label="미리볼 앱 화면">
            <span>화면 선택</span>
            {SCREEN_GROUPS.map((group) => (
              <div className="screen-picker-group" key={group.id}>
                <h2>{group.title}</h2>
                {group.screens.map((screen) => (
                  <a
                    href={`#preview/${screen.id}`}
                    key={screen.id}
                    aria-current={screen.id === selectedScreen.id ? "page" : undefined}
                  >
                    {screen.title}
                  </a>
                ))}
              </div>
            ))}
          </nav>
        )}

        <fieldset className="device-control">
          <legend>스마트폰 종류</legend>
          <div className="device-options">
            {PREVIEW_DEVICES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={deviceId === item.id ? "is-selected" : undefined}
                aria-pressed={deviceId === item.id}
                onClick={() => setDeviceId(item.id)}
              >
                <span>{item.label}</span>
                <small>
                  {item.width} × {item.height}
                </small>
              </button>
            ))}
          </div>
        </fieldset>

        <p className="lab-note">화면 크기만 재현하며 실제 기기 동작은 에뮬레이션하지 않습니다.</p>
      </aside>

      <section
        className="preview-stage"
        aria-label={isPreview ? `${selectedScreen.title} 화면 미리보기` : "기존 앱 전체 화면"}
      >
        {isPreview ? (
          <ScreenPreview screen={selectedScreen} device={device} />
        ) : (
          <AllScreensScreen device={device} />
        )}
      </section>
    </main>
  );
}
