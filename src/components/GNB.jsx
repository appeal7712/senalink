import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './icons/Icon';
import ProfileDropdown from './ProfileDropdown';
import { PAGE } from '../config/routes';
import { TOOL_ITEMS } from '../data/tools';

function ToolsFlyout({ isActive, onOpenTools }) {
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    // 탭 전환(도구 페이지 이동) 시에도 드롭다운이 남아있는 문제 방지
    if (isActive) setOpen(false);
  }, [isActive]);

  const place = () => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom, left: r.left + r.width / 2 });
  };

  useEffect(() => {
    if (!open) return;
    place();
    const onMove = () => place();
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open]);

  return (
    <div
      ref={wrapRef}
      className={`gnb-fly${isActive ? ' is-active' : ''}`}
      onMouseEnter={() => { place(); setOpen(true); }}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={`gnb-link${isActive ? ' active' : ''}`}
        onClick={() => {
          onOpenTools();
          setOpen(false);
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        }}
      >
        <Icon name="flask" size={14} />
        도구
        <Icon name="chevronDown" size={11} />
      </button>
      {open && pos && createPortal(
        <div
          className="gnb-dropdown is-open"
          style={{ top: pos.top, left: pos.left }}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <div className="gnb-dropdown-panel">
            {TOOL_ITEMS.map((tool) => (
              <button
                key={tool.id}
                type="button"
                className={`gnb-dropdown-item${tool.ready ? '' : ' is-soon'}`}
                disabled={!tool.ready}
                onClick={() => {
                  if (!tool.ready) return;
                  onOpenTools();
                  setOpen(false);
                  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
                }}
              >
                <span>{tool.label}</span>
                {!tool.ready && <em>준비 중</em>}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default function GNB({ activeTab, setActiveTab }) {
  const menuItems = [
    { id: PAGE.MAIN, icon: 'globe', label: '메인' },
    { id: PAGE.HUB, icon: 'fortress', label: '길드 허브' },
    { id: PAGE.COMMUNITY, icon: 'users', label: '공용 허브' },
    { id: PAGE.DEX, icon: 'book', label: '도감' },
  ];

  return (
    <header className="gnb-header">
      <div className="gnb-inner">
        <div className="gnb-brand" onClick={() => setActiveTab(PAGE.MAIN)}>
          <div className="gnb-wordmark">세나링크<span>.</span></div>
        </div>

        <nav className="gnb-nav">
          {menuItems.slice(0, 3).map((item) => (
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
          <ToolsFlyout
            isActive={activeTab === PAGE.TOOLS}
            onOpenTools={() => setActiveTab(PAGE.TOOLS)}
          />
          {menuItems.slice(3).map((item) => (
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
          <ProfileDropdown />
        </div>
      </div>
    </header>
  );
}
