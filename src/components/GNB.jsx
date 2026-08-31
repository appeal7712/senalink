import Icon from './icons/Icon';
import ProfileDropdown from './ProfileDropdown';
import DailyTarotButton from './DailyTarotButton';
import { PAGE } from '../config/routes';

export default function GNB({ activeTab, setActiveTab }) {
  const menuItems = [
    { id: PAGE.MAIN, icon: 'main', label: '메인' },
    { id: PAGE.HUB, icon: 'hub', label: '길드 허브' },
    { id: PAGE.COMMUNITY, icon: 'hubMembers', label: '공용 허브' },
    { id: PAGE.TOOLS, icon: 'toolsMenu', label: '도구' },
    { id: PAGE.DEX, icon: 'encyclopedia', label: '도감' },
  ];

  return (
    <header className="gnb-header">
      <div className="gnb-inner">
        <div className="gnb-brand" onClick={() => setActiveTab(PAGE.MAIN)}>
          <div className="gnb-wordmark">세나링크<span>.</span></div>
        </div>

        <nav className="gnb-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`gnb-link${activeTab === item.id ? ' active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon name={item.icon} size={14} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="gnb-status">
          <DailyTarotButton />
          <ProfileDropdown />
        </div>
      </div>
    </header>
  );
}
