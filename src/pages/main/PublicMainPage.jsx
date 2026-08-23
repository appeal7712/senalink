import PublicMainDashboard from '../../components/PublicMainDashboard';

export default function PublicMainPage({ onNavigateToLounge, onNavigateToCommunity }) {
  return (
    <PublicMainDashboard
      onNavigateToLounge={onNavigateToLounge}
      onNavigateToCommunity={onNavigateToCommunity}
    />
  );
}
