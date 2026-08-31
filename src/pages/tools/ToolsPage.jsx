import { useEffect, useRef, useState } from 'react';
import Icon from '../../components/icons/Icon';
import { TOOL_ITEMS } from '../../data/tools';
import GuildWarWinCalc from '../../components/tools/GuildWarWinCalc';
import TierListMaker from '../../components/tools/TierListMaker';
import ExclusiveGearGuide from '../../components/tools/ExclusiveGearGuide';
import {
  navigateToTools,
  toolIdFromPath,
} from '../../config/routes';

function resolveActiveTool(raw) {
  if (!raw) return null;
  const hit = TOOL_ITEMS.find((t) => t.id === raw && t.ready);
  return hit ? hit.id : null;
}

export default function ToolsPage() {
  const [active, setActive] = useState(() => resolveActiveTool(toolIdFromPath(window.location.pathname)));
  const bodyRef = useRef(null);

  useEffect(() => {
    const sync = () => {
      setActive(resolveActiveTool(toolIdFromPath(window.location.pathname)));
    };
    window.addEventListener('popstate', sync);
    window.addEventListener('app:navigate', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('app:navigate', sync);
    };
  }, []);

  useEffect(() => {
    if (!active || !bodyRef.current) return;
    const id = window.requestAnimationFrame(() => {
      bodyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(id);
  }, [active]);

  const selectTool = (tool) => {
    if (!tool.ready) return;
    setActive(tool.id);
    navigateToTools(tool.id);
  };

  return (
    <div className="container fade-in tools-page">
      <div className="luxury-panel tools-hero">
        <div className="tools-hero-intro">
          <span className="ops-tag" style={{ marginBottom: 12 }}>Tools</span>
          <h1 className="tools-hero-title">도구</h1>
          <p className="tools-hero-copy">
            길드전 계산, 티어 표 제작 등 플레이에 도움이 되는 유틸을 모아 두었습니다.
          </p>
        </div>

        <div className="tools-hero-gates" role="tablist" aria-label="도구 선택">
          {TOOL_ITEMS.map((tool) => {
            const on = active === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                role="tab"
                aria-selected={on}
                disabled={!tool.ready}
                className={`nav-tab-btn tools-hero-gate${on ? ' active is-on' : ''}${tool.ready ? '' : ' is-soon'}`}
                onClick={() => selectTool(tool)}
              >
                <span className="tools-hero-gate-lead">
                  <span className="tools-hero-gate-icon" aria-hidden>
                    <Icon name={tool.icon} size={15} />
                  </span>
                  <span className="tools-hero-gate-label">{tool.label}</span>
                </span>
                <span className="tools-hero-gate-hint">{tool.ready ? tool.hint : '준비 중'}</span>
              </button>
            );
          })}
        </div>
      </div>

      {active === 'win-calc' && (
        <div className="tools-body" ref={bodyRef}>
          <GuildWarWinCalc />
        </div>
      )}
      {active === 'tierlist' && (
        <div className="tools-body" ref={bodyRef}>
          <TierListMaker />
        </div>
      )}
      {active === 'exclusive-gear' && (
        <div className="tools-body" ref={bodyRef}>
          <ExclusiveGearGuide />
        </div>
      )}
    </div>
  );
}
