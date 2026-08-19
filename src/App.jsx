import { lazy, Suspense, useEffect, useState } from 'react';
import GNB from './components/GNB';
import PublicMainPage from './pages/main/PublicMainPage';
import HubPage from './pages/hub/HubPage';
import ToastContainer from './components/Toast';
import { PAGE, navigateTo, pathToPage } from './config/routes';
import { useSuperAdmin } from './context/SuperAdminContext';
import { usingEmulators } from './lib/firebase';

const OpsPage = lazy(() => import('./pages/ops/OpsPage'));
const CommunityPage = lazy(() => import('./pages/community/CommunityPage'));
const EncyclopediaPage = lazy(() => import('./pages/encyclopedia/EncyclopediaPage'));
const ToolsPage = lazy(() => import('./pages/tools/ToolsPage'));

export default function App() {
  const { isSuperAdmin, authReady, adminReady } = useSuperAdmin();
  const [activeTab, setActiveTab] = useState(() => pathToPage(window.location.pathname));

  useEffect(() => {
    const sync = () => setActiveTab(pathToPage(window.location.pathname));
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
  const canSeeOps = onOpsPath && (usingEmulators || (authReady && adminReady && isSuperAdmin));
  const gnbTab = canSeeOps ? PAGE.OPS : (onOpsPath ? PAGE.MAIN : activeTab);
  const showMain = activeTab === PAGE.MAIN || (onOpsPath && !canSeeOps);

  return (
    <div className="app-shell">
      <GNB activeTab={gnbTab} setActiveTab={go} />

      <main className="app-main">
        {canSeeOps ? (
          <Suspense fallback={null}>
            <OpsPage onOpenHub={() => go(PAGE.HUB)} />
          </Suspense>
        ) : (
          <>
            {showMain && (
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
      <ToastContainer />
    </div>
  );
}
