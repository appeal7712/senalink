import { lazy, Suspense, useEffect, useState } from 'react';
import GNB from './components/GNB';
import PublicMainPage from './pages/main/PublicMainPage';
import HubPage from './pages/hub/HubPage';
import ToastContainer from './components/Toast';
import SiteEntranceBanner from './components/SiteEntranceBanner';
import NicknameGate from './components/NicknameGate';
import { PAGE, navigateTo, pathToPage } from './config/routes';
import { handleOverlayPopState, readHubTabFromState } from './utils/overlayHistory';
import { useSuperAdmin } from './context/SuperAdminContext';

const OpsPage = lazy(() => import('./pages/ops/OpsPage'));
const CommunityPage = lazy(() => import('./pages/community/CommunityPage'));
const EncyclopediaPage = lazy(() => import('./pages/encyclopedia/EncyclopediaPage'));
const ToolsPage = lazy(() => import('./pages/tools/ToolsPage'));

export default function App() {
  const { isSuperAdmin, authReady, adminReady } = useSuperAdmin();
  const [activeTab, setActiveTab] = useState(() => pathToPage(window.location.pathname));

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

  const go = (page) => {
    navigateTo(page);
    setActiveTab(page);
  };

  const onOpsPath = activeTab === PAGE.OPS;
  // /ops 는 항상 OpsPage(로그인 게이트 포함). 쓰기 잠금은 Firestore isSuperAdmin().
  const opsUnlocked = authReady && adminReady && isSuperAdmin;
  const gnbTab = onOpsPath && opsUnlocked ? PAGE.OPS : (onOpsPath ? PAGE.MAIN : activeTab);

  return (
    <div className="app-shell">
      <GNB activeTab={gnbTab} setActiveTab={go} />

      <main className="app-main">
        {onOpsPath ? (
          <Suspense fallback={null}>
            <OpsPage onOpenHub={() => go(PAGE.HUB)} />
          </Suspense>
        ) : (
          <>
            {activeTab === PAGE.MAIN && (
              <PublicMainPage onNavigateToLounge={() => go(PAGE.HUB)} />
            )}
            {activeTab === PAGE.HUB && <HubPage />}
            {activeTab === PAGE.COMMUNITY && (
              <Suspense fallback={null}><CommunityPage /></Suspense>
            )}
            {activeTab === PAGE.TOOLS && (
              <Suspense fallback={null}><ToolsPage /></Suspense>
            )}
            {activeTab === PAGE.DEX && (
              <Suspense fallback={null}><EncyclopediaPage /></Suspense>
            )}
          </>
        )}
      </main>
      {!onOpsPath ? <SiteEntranceBanner /> : null}
      {!onOpsPath ? <NicknameGate /> : null}
      <ToastContainer />
    </div>
  );
}
