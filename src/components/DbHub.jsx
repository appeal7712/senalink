import { lazy, Suspense, useState } from 'react';
const HeroDB = lazy(() => import('./HeroDB'));
const EquipDB = lazy(() => import('./EquipDB'));
const SystemDB = lazy(() => import('./SystemDB'));
const PetDB = lazy(() => import('./PetDB'));
import HoverGateCard from './HoverGateCard';

const HUB_TABS = [
  { id: 'hero', icon: 'hero', label: '영웅 도감', desc: '역할 · 세력 · 스킬', accent: '#ece8e0' },
  { id: 'pet', icon: 'pet', label: '펫 도감', desc: '전설 · 희귀 펫 스킬', accent: '#d4c4a8' },
  { id: 'equip', icon: 'gearSetting', label: '장비 / 장신구', desc: '세트 · 실전 장비 · 반지', accent: '#8eb8c4' },
  { id: 'system', icon: 'system', label: '시스템', desc: '전투 규칙 · 잠재능력', accent: '#9a9388' },
];

export default function DbHub() {
  const [subTab, setSubTab] = useState('hero');

  return (
    <div className="fade-in">
      <div className="container" style={{ paddingTop: 22, paddingBottom: 8 }}>
        <div className="dex-hub-tabs">
          {HUB_TABS.map((tab) => (
            <HoverGateCard
              key={tab.id}
              icon={tab.icon}
              title={tab.label}
              desc={tab.desc}
              on={subTab === tab.id}
              aria-pressed={subTab === tab.id}
              onClick={() => setSubTab(tab.id)}
            />
          ))}
        </div>
      </div>

      {subTab === 'hero' && <Suspense fallback={null}><HeroDB /></Suspense>}

      {subTab === 'pet' && <Suspense fallback={null}><PetDB /></Suspense>}

      {subTab === 'equip' && <Suspense fallback={null}><EquipDB /></Suspense>}

      {subTab === 'system' && (
        <div className="container fade-in" style={{ paddingBottom: 60 }}>
          <Suspense fallback={null}><SystemDB /></Suspense>
        </div>
      )}
    </div>
  );
}
