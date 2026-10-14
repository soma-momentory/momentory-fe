import type { PreviewDevice } from "../devicePresets";
import { CurrentAppPreview } from "../components/CurrentAppPreview";
import { SCREEN_COUNT, SCREEN_GROUPS, screenSourceLabel } from "./currentAppScreens";
import "../styles/all-screens.css";

export function AllScreensScreen({ device }: { device: PreviewDevice }) {
  return (
    <div className="atlas-page">
      <header className="atlas-intro">
        <p>APP SCREEN ATLAS</p>
        <h2>기존 앱 · 전체 화면</h2>
        <span>
          현행 앱의 {SCREEN_COUNT}개 화면을 시뮬레이터에서 직접 캡처해 한 페이지에 펼쳤습니다.
        </span>
        <div className="atlas-meta">
          {device.label} · {device.width} × {device.height}pt <span>축소 표시 65%</span>
        </div>
      </header>
      <nav className="atlas-jump" aria-label="화면 그룹으로 이동">
        {SCREEN_GROUPS.map((group) => (
          <a href={`#${group.id}`} key={group.id}>
            {group.title} <small>{group.screens.length}</small>
          </a>
        ))}
      </nav>
      {SCREEN_GROUPS.map((group) => (
        <section
          className="atlas-group"
          id={group.id}
          key={group.id}
          aria-labelledby={`${group.id}-heading`}
        >
          <div className="atlas-group-heading">
            <h3 id={`${group.id}-heading`}>{group.title}</h3>
            <span>{group.screens.length}개 화면</span>
          </div>
          <div
            className="atlas-grid"
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(${Math.ceil((device.width + 14) * 0.65 + 34)}px, 1fr))`,
            }}
          >
            {group.screens.map((screen) => (
              <article className="atlas-card" key={screen.id} id={`screen-${screen.id}`}>
                <div className="atlas-card-head">
                  <div>
                    <span className="atlas-route">{screen.route}</span>
                    <h4>{screen.title}</h4>
                  </div>
                  <span className={`atlas-badge ${screen.capture ? "capture" : ""}`}>
                    {screenSourceLabel(screen)}
                  </span>
                </div>
                <CurrentAppPreview screen={screen} device={device} />
                <a
                  className="atlas-open"
                  href={`#preview/${screen.id}`}
                  aria-label={`${screen.title} 화면 크게 보기`}
                >
                  화면 크게 보기 ↗
                </a>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
