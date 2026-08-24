import { useEffect, useState } from 'react';
import { getContentSeasonStatuses } from '../lib/contentSeasonSchedule';

const THEME_CLASS = {
  expedition: 'theme-expedition',
  guildwar: 'theme-guildwar',
  advanced_arena: 'theme-arena',
  totalwar: 'theme-totalwar',
};

/** public/images/content-season — asset/공용 아이콘 중앙 스퀘어 + 라운드 */
const SEASON_ICON_SRC = {
  guildwar: '/images/content-season/guildwar.png',
  advanced_arena: '/images/content-season/advanced-arena.png',
  totalwar: '/images/content-season/totalwar.png',
  expedition: '/images/content-season/expedition.png',
};

function msUntilNextMinute() {
  const now = Date.now();
  return 60_000 - (now % 60_000);
}

/**
 * 히어로 아래 — 플립 시즌 카드
 * 앞: 아이콘 + 시간대 상태 / 뒤: 이름 + 시즌 종료일 + 게이지
 */
export default function ContentSeasonBadges() {
  const [items, setItems] = useState(() => getContentSeasonStatuses());

  useEffect(() => {
    const tick = () => setItems(getContentSeasonStatuses());
    tick();

    let minuteTimer = 0;
    minuteTimer = window.setTimeout(() => {
      tick();
      minuteTimer = window.setInterval(tick, 60_000);
    }, msUntilNextMinute());

    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearTimeout(minuteTimer);
      window.clearInterval(minuteTimer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (!items.length) return null;

  return (
    <section className="season-board" aria-label="컨텐츠 시즌 현황">
      <div className="season-board-grid">
        {items.map((item) => {
          const theme = THEME_CLASS[item.id] || '';
          const pct = Math.round((item.progress || 0) * 100);
          const iconSrc = SEASON_ICON_SRC[item.id];
          const frontStatus = item.frontStatus || item.status || '시즌 준비';

          return (
            <article
              key={item.id}
              className={`season-card ${theme}${item.burning ? ' is-live' : ' is-prep'}`}
              tabIndex={0}
            >
              <div className="season-card-inner">
                <div className="season-card-face season-card-face--front">
                  <div className="season-card-spin-rim" aria-hidden="true">
                    <div className="season-card-spin-rotor">
                      <span className="season-card-spin-beam" />
                    </div>
                  </div>
                  <div className="season-card-front-panel">
                    <div className="season-card-icon-wrap">
                      {iconSrc ? (
                        <img
                          className="season-card-icon"
                          src={iconSrc}
                          alt=""
                          width={68}
                          height={68}
                          decoding="async"
                          draggable={false}
                        />
                      ) : null}
                    </div>
                    <p className="season-card-status">{frontStatus}</p>
                  </div>
                </div>

                <div className="season-card-face season-card-face--back">
                  <div className="season-card-back-panel">
                    <h3 className="season-card-title">{item.name}</h3>
                    <p className="season-card-end">{item.endsAtLabel || '시즌 일정 확인'}</p>
                    <div
                      className="season-card-meter"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${item.name} 시즌 진행`}
                    >
                      <div
                        className="season-card-meter-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
