import { PAGE } from '../config/routes';
import { OPERATOR_EMAIL } from '../config/siteContact';
import { APP_VERSION_LABEL } from '../config/appVersion';
import { usingEmulators } from '../lib/firebase';
import { showToast } from './Toast';

const NAV_LINKS = [
  { id: PAGE.MAIN, label: '메인' },
  { id: PAGE.HUB, label: '길드 허브' },
  { id: PAGE.COMMUNITY, label: '공용 허브' },
  { id: PAGE.TOOLS, label: '도구' },
  { id: PAGE.DEX, label: '도감' },
];

async function copyOperatorEmail() {
  const email = String(OPERATOR_EMAIL || '').trim();
  if (!email) {
    showToast('운영자 이메일이 아직 없습니다.', 'info');
    return;
  }
  try {
    await navigator.clipboard.writeText(email);
    showToast(`운영자 이메일 ${email} 을 복사했습니다. 메일을 보내 주세요.`, 'success');
  } catch {
    showToast(`운영자 이메일: ${email} — 메일을 보내 주세요.`, 'info');
  }
}

export default function SiteFooter({ onNavigate }) {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-glass">
          <div className="site-footer-top">
            <div className="site-footer-brand">
              <div className="site-footer-wordmark">
                세나링크<span>.</span>
              </div>
              <p className="site-footer-tagline">
                세븐나이츠 리버스 길드 관리·공략 허브.
              </p>
            </div>

            <div className="site-footer-cols">
              <nav className="site-footer-col" aria-label="바로가기">
                <div className="site-footer-col-title">바로가기</div>
                <ul className="site-footer-col-list">
                  {NAV_LINKS.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="site-footer-link"
                        onClick={() => onNavigate?.(item.id)}
                      >
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              <nav className="site-footer-col" aria-label="Support">
                <div className="site-footer-col-title">Support</div>
                <ul className="site-footer-col-list">
                  <li>
                    <button
                      type="button"
                      className="site-footer-link"
                      onClick={() => { void copyOperatorEmail(); }}
                    >
                      개선 사항 건의하기
                    </button>
                  </li>
                </ul>
                <p className="site-footer-email-hint">
                  운영자 이메일
                  {' '}
                  <button
                    type="button"
                    className="site-footer-email"
                    onClick={() => { void copyOperatorEmail(); }}
                    title="클릭하면 복사됩니다"
                  >
                    {OPERATOR_EMAIL}
                  </button>
                  <span className="site-footer-email-note"> · 메일을 보내 주세요</span>
                </p>
              </nav>
            </div>
          </div>

          <div className="site-footer-rule" aria-hidden="true" />

          <div className="site-footer-bottom">
            <span className="site-footer-copy">
              © 2026 Senalink. All rights reserved. This website and its original content are the exclusive property of its creator.
            </span>
            <div className="site-footer-meta">
              <span className="site-footer-version" title="패치 버전">{APP_VERSION_LABEL}</span>
              <div className="site-footer-live">
                <span
                  className="site-footer-live-dot"
                  style={{ background: usingEmulators ? '#8eb8c4' : '#8fbfa5' }}
                />
                <span>{usingEmulators ? 'Local' : 'Live'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="site-footer-peek" aria-hidden="true">
        <span className="site-footer-peek-text">SENALINK</span>
      </div>
    </footer>
  );
}
