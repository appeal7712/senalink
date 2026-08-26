import { lazy, Suspense, useEffect, useState } from 'react';
import GNB from './components/GNB';
import SiteFooter from './components/SiteFooter';
import PublicMainPage from './pages/main/PublicMainPage';
import HubPage from './pages/hub/HubPage';
import ToastContainer from './components/Toast';
import SiteEntranceBanner from './components/SiteEntranceBanner';
import NicknameGate from './components/NicknameGate';
import { PAGE, navigateTo, navigateToTools, pathToPage } from './config/routes';
import { handleOverlayPopState, readHubTabFromState } from './utils/overlayHistory';
import { useSuperAdmin } from './context/SuperAdminContext';
import { applyPageSeo } from './lib/seo';
import { redirectInviteToHubIfNeeded } from './lib/invite';

const OpsPage = lazy(() => import('./pages/ops/OpsPage'));
const CommunityPage = lazy(() => import('./pages/community/CommunityPage'));
const EncyclopediaPage = lazy(() => import('./pages/encyclopedia/EncyclopediaPage'));
const ToolsPage = lazy(() => import('./pages/tools/ToolsPage'));

function RouteFallback() {
  return (
    <div className="container fade-in page-section" style={{ paddingTop: 48, opacity: 0.55 }}>
      <div className="luxury-panel" style={{ padding: '28px 22px', minHeight: 120 }}>
        <div style={{ height: 14, width: 96, background: 'rgba(255,255,255,0.12)', borderRadius: 4, marginBottom: 14 }} />
        <div style={{ height: 22, width: '42%', background: 'rgba(255,255,255,0.16)', borderRadius: 4, marginBottom: 10 }} />
        <div style={{ height: 12, width: '68%', background: 'rgba(255,255,255,0.08)', borderRadius: 4 }} />
      </div>
    </div>
  );
}

export default function App() {
  const { isSuperAdmin, authReady, adminReady } = useSuperAdmin();
  const [activeTab, setActiveTab] = useState(() => {
    redirectInviteToHubIfNeeded();
    return pathToPage(window.location.pathname);
  });

  useEffect(() => {
    if (redirectInviteToHubIfNeeded()) {
      setActiveTab(PAGE.HUB);
    }
  }, []);

  useEffect(() => {
    const sync = () => {
      if (handleOverlayPopState()) return;
      setActiveTab(pathToPage(window.location.pathname));
      const hubTab = readHubTabFromState(window.history.state);
      window.dispatchEvent(new CustomEvent('app:hub-tab-pop', { detail: { tab: hubTab } }));
    };
    window.addEventListener('popstate', sync);
    window.addEventListener('app:navigate', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('app:navigate', sync);
    };
  }, []);

  useEffect(() => {
    applyPageSeo(activeTab);
  }, [activeTab]);

  const go = (page) => {
    navigateTo(page);
    setActiveTab(page);
  };

  const goTools = (toolId) => {
    navigateToTools(toolId);
    setActiveTab(PAGE.TOOLS);
  };

  const onOpsPath = activeTab === PAGE.OPS;
  // /ops 는 항상 OpsPage(로그인 게이트 포함). 쓰기 잠금은 Firestore isSuperAdmin().
  const opsUnlocked = authReady && adminReady && isSuperAdmin;
  const gnbTab = onOpsPath && opsUnlocked ? PAGE.OPS : (onOpsPath ? PAGE.MAIN : activeTab);

  return (
    <div className="app-shell">
      <GNB activeTab={gnbTab} setActiveTab={go} onOpenTools={goTools} />

      <main className="app-main">
        {onOpsPath ? (
          <Suspense fallback={<RouteFallback />}>
            <OpsPage onOpenHub={() => go(PAGE.HUB)} />
          </Suspense>
        ) : (
          <>
            {activeTab === PAGE.MAIN && (
              <PublicMainPage
                onNavigateToLounge={() => go(PAGE.HUB)}
                onNavigateToCommunity={() => go(PAGE.COMMUNITY)}
              />
            )}
            {activeTab === PAGE.HUB && <HubPage />}
            {activeTab === PAGE.COMMUNITY && (
              <Suspense fallback={<RouteFallback />}><CommunityPage /></Suspense>
            )}
            {activeTab === PAGE.TOOLS && (
              <Suspense fallback={<RouteFallback />}><ToolsPage /></Suspense>
            )}
            {activeTab === PAGE.DEX && (
              <Suspense fallback={<RouteFallback />}><EncyclopediaPage /></Suspense>
            )}
          </>
        )}
      </main>
      <SiteFooter onNavigate={go} />
      {!onOpsPath ? <SiteEntranceBanner /> : null}
      {!onOpsPath ? <NicknameGate /> : null}
      <ToastContainer />
    </div>
  );
}
