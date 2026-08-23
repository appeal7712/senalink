import { useEffect, useState } from 'react';
import { TOOL_ITEMS } from '../../data/tools';
import GuildWarWinCalc from '../../components/tools/GuildWarWinCalc';
import TierListMaker from '../../components/tools/TierListMaker';
import {
  DEFAULT_TOOL_ID,
  navigateToTools,
  toolIdFromPath,
} from '../../config/routes';

function resolveReadyToolId(raw) {
  const id = raw || DEFAULT_TOOL_ID;
  const hit = TOOL_ITEMS.find((t) => t.id === id && t.ready);
  return hit ? hit.id : DEFAULT_TOOL_ID;
}

export default function ToolsPage() {
  const [active, setActive] = useState(() => resolveReadyToolId(toolIdFromPath(window.location.pathname)));

  useEffect(() => {
    const sync = () => {
      setActive(resolveReadyToolId(toolIdFromPath(window.location.pathname)));
    };
    window.addEventListener('popstate', sync);
    window.addEventListener('app:navigate', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('app:navigate', sync);
    };
  }, []);

  const selectTool = (toolId) => {
    if (!TOOL_ITEMS.some((t) => t.id === toolId && t.ready)) return;
    setActive(toolId);
    navigateToTools(toolId);
  };

  return (
    <div className="container fade-in tools-page">
      <div className="tools-switch">
        {TOOL_ITEMS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            className={`tools-chip${active === tool.id ? ' is-on' : ''}${tool.ready ? '' : ' is-soon'}`}
            disabled={!tool.ready}
            onClick={() => tool.ready && selectTool(tool.id)}
          >
            {tool.label}
            {!tool.ready && <span>준비 중</span>}
          </button>
        ))}
      </div>
      {active === 'win-calc' && <GuildWarWinCalc />}
      {active === 'tierlist' && <TierListMaker />}
    </div>
  );
}
