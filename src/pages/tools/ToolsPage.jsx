import { useState } from 'react';
import { TOOL_ITEMS } from '../../data/tools';
import GuildWarWinCalc from '../../components/tools/GuildWarWinCalc';
import TierListMaker from '../../components/tools/TierListMaker';

export default function ToolsPage() {
  const [active, setActive] = useState('win-calc');

  return (
    <div className="container fade-in tools-page">
      <div className="tools-switch">
        {TOOL_ITEMS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            className={`tools-chip${active === tool.id ? ' is-on' : ''}${tool.ready ? '' : ' is-soon'}`}
            disabled={!tool.ready}
            onClick={() => tool.ready && setActive(tool.id)}
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
