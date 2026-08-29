import { useEffect, useId, useState } from 'react';
import { getUiTheme, setUiTheme, UI_THEME_GLASS, UI_THEME_SOLID } from '../lib/uiTheme';

function ThemeMoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.1 2.2a9.8 9.8 0 1 0 9.6 11.6A7.5 7.5 0 0 1 12.1 2.2z" />
    </svg>
  );
}

function ThemeSunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

/** 유리(꺼짐) ↔ 선명 다크(켜짐) — 마이프로필 메뉴 */
export default function UiThemeToggle() {
  const inputId = useId();
  const [theme, setTheme] = useState(() => getUiTheme());

  useEffect(() => {
    const onTheme = (e) => setTheme(e.detail.theme);
    window.addEventListener('app:ui-theme', onTheme);
    return () => window.removeEventListener('app:ui-theme', onTheme);
  }, []);

  const isSolid = theme === UI_THEME_SOLID;

  return (
    <div className="ui-theme-switch">
      <input
        type="checkbox"
        id={inputId}
        className="ui-theme-switch-input"
        checked={isSolid}
        onChange={(e) => setUiTheme(e.target.checked ? UI_THEME_SOLID : UI_THEME_GLASS)}
        aria-label="화면 스타일"
      />
      <label htmlFor={inputId}>
        <div className="ui-theme-switch-thumb" />
        <span>
          <ThemeMoonIcon />
        </span>
        <span>
          <ThemeSunIcon />
        </span>
      </label>
    </div>
  );
}
