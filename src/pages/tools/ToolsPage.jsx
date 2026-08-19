import { TOOL_ITEMS } from '../../data/tools';
import GuildWarWinCalc from '../../components/tools/GuildWarWinCalc';

export default function ToolsPage() {
  return (
    <div className="container fade-in tools-page">
      <div className="tools-switch">
        {TOOL_ITEMS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            className={`tools-chip${tool.id === 'win-calc' ? ' is-on' : ''}${tool.ready ? '' : ' is-soon'}`}
            disabled={!tool.ready}
          >
            {tool.label}
            {!tool.ready && <span>준비 중</span>}
          </button>
        ))}
      </div>
      <GuildWarWinCalc />
    </div>
  );
}
