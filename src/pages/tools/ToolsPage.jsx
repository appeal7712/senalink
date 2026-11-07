import { useEffect, useRef, useState } from 'react';
import HoverGateCard from '../../components/HoverGateCard';
import { TOOL_ITEMS } from '../../data/tools';
import GuildWarWinCalc from '../../components/tools/GuildWarWinCalc';
import TierListMaker from '../../components/tools/TierListMaker';
import ExclusiveGearGuide from '../../components/tools/ExclusiveGearGuide';
import CraftSimulator from '../../components/tools/CraftSimulator';
import {
  navigateToTools,
  toolIdFromPath,
} from '../../config/routes';

function resolveActiveTool(raw) {
  if (!raw) return null;
  const hit = TOOL_ITEMS.find((t) => t.id === raw && t.ready && !t.href);
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
    if (tool.href) {
      window.open(tool.href, '_blank', 'noopener,noreferrer');
      return;
    }
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
          {TOOL_ITEMS.map((tool) => (
            <HoverGateCard
              key={tool.id}
              icon={tool.icon}
              title={tool.label}
              desc={tool.ready ? tool.hint : '준비 중'}
              on={active === tool.id}
              soon={!tool.ready}
              role="tab"
              aria-selected={active === tool.id}
              disabled={!tool.ready}
              onClick={() => selectTool(tool)}
            />
          ))}
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
      {active === 'craft' && (
        <div className="tools-body" ref={bodyRef}>
          <CraftSimulator />
        </div>
      )}
    </div>
  );
}
