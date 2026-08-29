import { useEffect, useMemo, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { heroes, sortHeroesForList } from '../data/heroes';
import InGameDeckCard from './InGameDeckCard';
import GuildWarAttackPanel from './GuildWarAttackPanel';
import GuildWarDefensePanel from './GuildWarDefensePanel';
import TotalWarPanel from './TotalWarPanel';
import { TOTALWAR_TIERS } from '../data/totalwarTiers';
import { EQUIPMENT_SET_ICONS, accessories, weaponOptions, armorOptions } from '../data/equipments';
import { pets } from '../data/pets';
import Icon from './icons/Icon';
import SafeImg from './icons/SafeImg';
import AwakenMark from './AwakenMark';
import HeroPortraitCard from './HeroPortraitCard';
import SkillTimelineSteps from './SkillTimelineSteps';
import { setDeckDragData, startDeckPointerDrag, markDeckPointerDown, allowHtml5DeckDrag, markDeckHtml5DragStarted, shouldSuppressDeckClick, resetDeckDragState } from '../utils/deckDrag';
import { useLounge } from '../context/LoungeContext';
import { db } from '../lib/firebase';
import { showToast } from './Toast';
import PvpModeToggle, { PvpModeBadge } from './PvpModeToggle';
import ArenaDeckKindToggle, { ArenaDeckKindBadge, arenaKindTheme, normalizeArenaKind } from './ArenaDeckKind';
import { LoungeLanding, InviteReadyModal, LoungeJoinModal } from './lounge/LoungeGate';
import LoungeHome from './lounge/LoungeHome';
import LoungeHubHeader from './lounge/LoungeHubHeader';
import GuildMark from './GuildMark';
import StrategyActionBar from './StrategyActionBar';
import DeckLikeButton, { likedByList, toggleLikedBy } from './DeckLikeButton';
import SkillReservationBoard from './SkillReservationBoard';
import { backdropDismissProps } from '../utils/backdropDismiss';
import { closeOverlayFromUI, collapseOverlayHistory, pushHubTab, pushOverlay } from '../utils/overlayHistory';
import { parseInviteCode } from '../lib/invite';
import HeroGearPanel from './HeroGearPanel';
import ModalScrim from './ModalScrim';
import PublicProfileModal, { AuthorMeta } from './PublicProfileModal';
import { useUserProfile } from '../context/UserProfileContext';
import { LOUNGE_STORAGE_KEYS } from '../data/loungeMeta';

// 정확 일치 우선 탐색 — 짧은 이름(예: '린')이 다른 영웅 이름(예: '카린', '아일린')의
// 부분 문자열로 오탐되는 것을 방지하기 위해 느슨한 부분일치는 최후 수단으로만 사용
function resolveHeroByName(name) {
  if (!name || !String(name).trim()) return null;
  const raw = String(name);
  const clean = raw.replace('(각성)', '').trim();
  if (!clean) return null;
  return (
    heroes.find(x => x.name === raw) ||
    heroes.find(x => x.name.replace('(각성)', '').trim() === clean) ||
    (clean.length >= 2
      ? heroes.find(x => {
          const xn = x.name.replace('(각성)', '').trim();
          return x.name.includes(clean) || (xn.length >= 2 && clean.includes(xn));
        })
      : null) ||
    null
  );
}

function parseRoundNumber(round) {
  const s = String(round || '');
  // 0-1 합침 버튼 — 잠금·정렬은 1턴으로 취급
  if (/0\s*[-~∼]\s*1/.test(s)) return 1;
  const m = s.match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

/** 스킬 시전 순서 턴 라벨 표시 (저장값이 1라여도 1턴으로 보이게 · 0-1턴 포함) */
function formatSkillTurnLabel(round) {
  const s = String(round || '').trim();
  if (!s) return '';
  if (/0\s*[-~∼]\s*1/.test(s)) return '0-1턴';
  const m = s.match(/(\d+)/);
  if (m) return `${Number(m[1])}턴`;
  return s.replace(/라/g, '턴');
}

/** 덱 수정 · 스킬 시전 순서 추가 — 턴 고르기 (4턴 간격 · 6×3) */
const SKILL_TURN_PICKS = [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68];

function snapSkillTurnPick(minRound) {
  const n = Math.max(0, Number(minRound) || 0);
  const hit = SKILL_TURN_PICKS.find((t) => t >= n);
  return `${hit != null ? hit : SKILL_TURN_PICKS[SKILL_TURN_PICKS.length - 1]}턴`;
}

function SkillDirBadge({ dir }) {
  const meta = dir === 'upper'
    ? { label: '위 스킬', bg: '#5eb0ff' }
    : dir === 'down'
      ? { label: '아래 스킬', bg: '#ff7a7a' }
      : dir === 'awaken'
        ? { label: '각성', bg: '#e879f9' }
        : null;
  if (!meta) return null;
  return (
    <span className="kind-pill kind-pill--xs skill-dir-badge" style={{ background: meta.bg }}>
      {meta.label}
    </span>
  );
}

function RoundMark({ round }) {
  return <span className="round-mark">{formatSkillTurnLabel(round)}</span>;
}

const defaultGear5 = () => Array.from({ length: 5 }, () => ({
  setName: '복수자',
  weapon1: '치명타 확률',
  weapon2: '치명타 확률',
  armor1: '모든 공격력(%)',
  armor2: '모든 공격력(%)',
  accessory: '불사의 반지',
  optionCode: '',
  detailNote: '',
}));

const padHeroNames5 = (names = []) => {
  const next = (names || []).map(n => n || '');
  while (next.length < 5) next.push('');
  return next.slice(0, 5);
};

const emptyExpeditionRound = () => ({
  formationId: 'protect',
  petId: pets[0]?.id || 'pet_1',
  heroNames: ['', '', '', '', ''],
  skillSequence: [],
  speedOrderNames: [],
  speedIgnoredNames: [],
  heroGearConfigs: defaultGear5(),
});

const roundFromFields = (src = {}) => ({
  formationId: src.formationId || 'protect',
  petId: src.petId || pets[0]?.id || 'pet_1',
  heroNames: padHeroNames5(src.heroNames),
  skillSequence: [...(src.skillSequence || [])],
  speedOrderNames: [...(src.speedOrderNames || [])],
  speedIgnoredNames: [...(src.speedIgnoredNames || [])],
  heroGearConfigs: Array.from({ length: 5 }, (_, i) => ({
    ...defaultGear5()[0],
    ...(src.heroGearConfigs?.[i] || {}),
  })),
});

const normalizeExpeditionRounds = (build = {}) => {
  // 구형: 빌드에만 petId 있던 경우 → 라운드에 폴백 (서로 다른 펫은 라운드별 petId)
  const legacyPet = build.petId || pets[0]?.id || 'pet_1';
  const raw1 = build.rounds?.[1] || build.round1 || (build.heroNames ? build : {});
  const raw2 = build.rounds?.[2] || build.round2 || {};
  return {
    1: roundFromFields({ ...raw1, petId: raw1.petId || legacyPet }),
    2: roundFromFields({ ...raw2, petId: raw2.petId || legacyPet }),
  };
};

const emptyTotalwarDeck = () => ({
  formationId: 'protect',
  petId: pets[0]?.id || 'pet_1',
  heroNames: ['', '', '', '', ''],
  reservedSkills: [],
  mode: '속공',
  heroGearConfigs: defaultGear5(),
});

const totalwarDeckFromFields = (src = {}) => ({
  formationId: src.formationId || 'protect',
  petId: src.petId || pets[0]?.id || 'pet_1',
  heroNames: padHeroNames5(src.heroNames),
  reservedSkills: [...(src.reservedSkills || src.skillSequence || [])],
  mode: src.mode === '내실' ? '내실' : '속공',
  heroGearConfigs: Array.from({ length: 5 }, (_, i) => ({
    ...defaultGear5()[0],
    ...(src.heroGearConfigs?.[i] || {}),
  })),
});

const normalizeTotalwarDecks = (build = {}, count = 2) => {
  const raw = Array.isArray(build.decks) ? build.decks : [];
  const next = raw.map(totalwarDeckFromFields);
  while (next.length < count) next.push(emptyTotalwarDeck());
  return next.slice(0, count);
};

const resolvePetById = (petId) => pets.find(p => p.id === petId) || pets[0];

const ROLE_ICONS = {
  offensive: '/images/common/공격형 아이콘.png',
  magic:     '/images/common/마법형 아이콘.png',
  defensive: '/images/common/방어형 아이콘.png',
  support:   '/images/common/지원형 아이콘.png',
  universal: '/images/common/만능형 아이콘.png',
};

const CARD_BG = {
  old_seven:    'linear-gradient(180deg, #fde047 0%, #ca8a04 100%)',
  special:      'linear-gradient(180deg, #facc15 0%, #ca8a04 100%)',
  semi_special: 'linear-gradient(180deg, #facc15 0%, #d97706 100%)',
  normal:       'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)',
};

const CONTENT_META = {
  siege:      { mode: 'pve', slotCount: 5 },
  expedition: { mode: 'pve', slotCount: 5 },
  arena:      { mode: 'pvp', slotCount: 5 },
  totalwar:   { mode: 'pvp', slotCount: 5 },
  gw_attack:  { mode: 'pvp', slotCount: 3 },
  gw_defense: { mode: 'pvp', slotCount: 3 },
};

// 공성전/강림원정대: 수정 버튼은 우측 타이틀 영역 (조회는 덱 카드의 세팅 확인)
const editButtonOnRight = (category) => category === 'siege' || category === 'expedition' || category === 'arena';

const EXPEDITION_BOSS_THEMES = {
  taeho:   { id: 'taeho',   label: '태오',   kind: 'shadow', accent: '#60a5fa', soft: 'rgba(96,165,250,0.22)',  border: 'rgba(147,197,253,0.32)', text: '#93c5fd' },
  yeonhee: { id: 'yeonhee', label: '연희',   kind: 'shadow', accent: '#facc15', soft: 'rgba(250,204,21,0.20)',  border: 'rgba(253,224,71,0.32)', text: '#fde047' },
  kyle:    { id: 'kyle',    label: '카일',   kind: 'shadow', accent: '#f87171', soft: 'rgba(248,113,113,0.22)', border: 'rgba(252,165,165,0.38)', text: '#fca5a5' },
  karma:   { id: 'karma',   label: '카르마', kind: 'shadow', accent: '#2dd4bf', soft: 'rgba(45,212,191,0.20)',  border: 'rgba(94,234,212,0.32)', text: '#5eead4' },
  god:     { id: 'god',     label: '파괴신', kind: 'god',    accent: '#94a3b8', soft: 'rgba(148,163,184,0.18)', border: 'rgba(148,163,184,0.38)', text: '#cbd5e1' },
};

const SIEGE_DAY_HISTORY_LABEL = {
  mon: '월·루디', tue: '화·아일린', wed: '수·레이첼', thu: '목·델론즈',
  fri: '금·제이브', sat: '토·스파이크', sun: '일·크리스',
};

const buildHistoryScopeLabel = (category, { siegeDay, expeditionBoss, totalwarTier } = {}) => {
  if (category === 'siege') {
    return `공성전 · ${SIEGE_DAY_HISTORY_LABEL[siegeDay] || siegeDay || ''}`.trim();
  }
  if (category === 'expedition') {
    const boss = EXPEDITION_BOSS_THEMES[expeditionBoss]?.label || expeditionBoss || '';
    return boss ? `강림 원정대 · ${boss}` : '강림 원정대';
  }
  if (category === 'arena') return '결투장';
  if (category === 'totalwar') {
    const tierLabel = TOTALWAR_TIERS.find((t) => t.id === totalwarTier)?.label;
    return tierLabel ? `총력전 · ${tierLabel}` : '총력전';
  }
  return '공략';
};

const expeditionThemeVars = (theme) => ({
  '--exp-accent': theme.text,
  '--exp-fill': theme.accent,
  '--exp-soft': theme.soft,
  '--exp-border': theme.border,
});

const ROLE_LABEL = { master: '길드마스터', admin: '관리자', member: '길드원' };

const EMPTY_ASSIGNMENTS = { taeho: [], yeonhee: [], kyle: [], karma: [] };

/** Firestore 문서 한도(1MiB)에 여유를 둔 공략 번들 저장 상한 */
const BUILDS_DOC_SAFE_BYTES = 900_000;

/** 신규 허브는 공략 없이 시작. 데모 시드(INITIAL_*)는 UI 폴백에 쓰지 않는다. */
const emptyBuildBundle = () => ({
  siege: {},
  expedition: {},
  arena: [],
  totalwar: {},
  gwAttacks: [],
  gwDefenses: [],
  expeditionAssignments: { ...EMPTY_ASSIGNMENTS },
});

const applyBuildBundle = (saved, setters) => {
  const data = saved && typeof saved === 'object' ? saved : {};
  const siege = (data.siege && typeof data.siege === 'object') ? data.siege : {};
  const expedition = (data.expedition && typeof data.expedition === 'object') ? data.expedition : {};
  const arena = Array.isArray(data.arena) ? data.arena : [];
  const totalwar = (data.totalwar && typeof data.totalwar === 'object') ? data.totalwar : {};
  const gwAttacks = Array.isArray(data.gwAttacks) ? data.gwAttacks : [];
  const gwDefenses = Array.isArray(data.gwDefenses) ? data.gwDefenses : [];
  setters.setSiegeBuilds(siege);
  setters.setExpeditionBuilds(expedition);
  setters.setArenaBuilds(arena);
  setters.setTotalwarBuilds(totalwar);
  setters.setGwAttacks(gwAttacks);
  setters.setGwDefenses(gwDefenses);
  // 기본은 접힘. 이미 열어 둔 덱이 목록에 있으면 유지(실시간 동기화 시 강제 접힘 방지)
  setters.setSelectedGwAttackId((prev) => (
    prev && gwAttacks.some((g) => g.id === prev) ? prev : null
  ));
  if (setters.setExpeditionAssignments) {
    setters.setExpeditionAssignments(data.expeditionAssignments || EMPTY_ASSIGNMENTS);
  }
};

/** Firestore는 undefined 필드를 거절함 */
const stripUndefined = (value) => {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out;
  }
  return value;
};

const buildsContentKey = ({ siege, expedition, arena, totalwar, gwAttacks, gwDefenses, expeditionAssignments }) => (
  JSON.stringify({ siege, expedition, arena, totalwar, gwAttacks, gwDefenses, expeditionAssignments })
);

export default function GuildLounge() {
  const {
    activeLounge, me, session, canEditBuilds, isAdmin,
    logBuildHistory, freshInvite, dismissFreshInvite,
    authReady, authUser, hubRecovering,
  } = useLounge();
  const { profile, profileReady } = useUserProfile();

  /** 공략 삭제: 마스터·관리자(슈퍼 포함) 또는 작성자만. 수정은 멤버 전원. */
  const canDeleteBuild = (build) => {
    if (!me || !canEditBuilds || !build) return false;
    if (isAdmin) return true;
    if (build.authorId && build.authorId === me.id) return true;
    if (!build.authorId && build.author && build.author === me.nickname) return true;
    return false;
  };

  const [activeTab, setActiveTab]           = useState('home');
  const [siegeDay, setSiegeDay]             = useState('mon');
  const [expeditionBoss, setExpeditionBoss] = useState('taeho');

  const [siegeBuilds, setSiegeBuilds]           = useState({});
  const [expeditionBuilds, setExpeditionBuilds] = useState({});
  const [arenaBuilds, setArenaBuilds]           = useState([]);
  const [totalwarBuilds, setTotalwarBuilds]     = useState({});
  const [gwAttacks, setGwAttacks]               = useState([]);
  const [gwDefenses, setGwDefenses]             = useState([]);
  const [selectedGwAttackId, setSelectedGwAttackId] = useState(null);
  const [expeditionAssignments, setExpeditionAssignments] = useState(EMPTY_ASSIGNMENTS);
  const [assignModalBoss, setAssignModalBoss] = useState(null);
  const [inspectingCounter, setInspectingCounter]   = useState(null);
  const [profileUid, setProfileUid] = useState(null);
  const [inviteJoinOpen, setInviteJoinOpen] = useState(false);
  const pendingInvite = useMemo(() => {
    const fromUrl = parseInviteCode(window.location.search);
    if (fromUrl) {
      try { localStorage.setItem(LOUNGE_STORAGE_KEYS.inviteHint, fromUrl); } catch { /* ignore */ }
      return fromUrl;
    }
    return '';
  }, []);

  // 이미 다른 허브에 있는 채 초대 링크로 들어온 경우만 Join 모달 (미로그인·닉 없음은 LoungeLanding)
  useEffect(() => {
    if (!pendingInvite) return;
    if (!authReady || !authUser || !profileReady) return;
    if (!String(profile?.nickname || '').trim()) return;
    if (!activeLounge) return;
    if (pendingInvite === activeLounge.inviteCode) return;
    setInviteJoinOpen(true);
  }, [pendingInvite, authReady, authUser, profileReady, profile?.nickname, activeLounge, activeLounge?.inviteCode]);

  const buildsReady = useRef(false);
  /** 원격 스냅샷 반영 직후 1회 저장 스킵 (다른 사람 최신본을 옛 데이터로 덮는 레이스 방지) */
  const skipNextSave = useRef(true);
  const loadedLoungeId = useRef(null);
  const lastAppliedKey = useRef('');
  const lastSavedKey = useRef('');
  /** 용량 초과 안내를 같은 내용으로 반복해서 띄우지 않기 위한 표시 */
  const oversizeWarnedKey = useRef('');

  const guildRoom = useMemo(() => {
    if (!activeLounge || !me) {
      return { name: '', code: '', myNickname: '', masterNickname: '', myMemberId: '' };
    }
    const master = activeLounge.members.find(m => m.role === 'master');
    return {
      name: activeLounge.name,
      code: activeLounge.inviteCode,
      myNickname: me.nickname,
      myMemberId: me.id || '',
      masterNickname: master?.nickname || '',
    };
  }, [activeLounge, me]);

  // Firestore 공략 번들 구독
  useEffect(() => {
    if (!activeLounge?.id) return undefined;
    buildsReady.current = false;
    skipNextSave.current = true;
    lastAppliedKey.current = '';
    lastSavedKey.current = '';
    oversizeWarnedKey.current = '';
    loadedLoungeId.current = activeLounge.id;
    setActiveTab('home');

    const ref = doc(db, 'hubs', activeLounge.id, 'builds', 'main');
    const unsub = onSnapshot(ref, (snap) => {
      // 내가 보낸 쓰기 echo는 무시 (로컬 state가 이미 최신)
      if (snap.metadata.hasPendingWrites) return;

      const data = snap.exists() ? snap.data() : null;
      const key = data
        ? buildsContentKey(data)
        : buildsContentKey(emptyBuildBundle());
      if (key === lastAppliedKey.current || key === lastSavedKey.current) {
        buildsReady.current = true;
        return;
      }

      skipNextSave.current = true;
      lastAppliedKey.current = key;
      applyBuildBundle(data, {
        setSiegeBuilds, setExpeditionBuilds, setArenaBuilds,
        setTotalwarBuilds, setGwAttacks, setGwDefenses, setSelectedGwAttackId,
        setExpeditionAssignments,
      });
      buildsReady.current = true;
    }, (err) => {
      console.error('builds snapshot', err);
      buildsReady.current = true;
      skipNextSave.current = true;
    });

    return () => unsub();
  }, [activeLounge?.id]);

  // 로컬 변경 → Firestore 저장 (원격 반영분·중복·지연 덮어쓰기 방지)
  useEffect(() => {
    if (!activeLounge?.id || !buildsReady.current) return;
    if (loadedLoungeId.current !== activeLounge.id) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    const content = {
      siege: siegeBuilds,
      expedition: expeditionBuilds,
      arena: arenaBuilds,
      totalwar: totalwarBuilds,
      gwAttacks,
      gwDefenses,
      expeditionAssignments,
    };
    const key = buildsContentKey(content);
    if (key === lastSavedKey.current || key === lastAppliedKey.current) return;

    const hubId = activeLounge.id;
    const timer = window.setTimeout(async () => {
      const payload = stripUndefined({
        ...content,
        updatedAt: new Date().toISOString(),
      });
      // Firestore 문서 한도는 1MiB. 넘기면 저장이 통째로 실패하니 미리 막고 알린다.
      if (new Blob([JSON.stringify(payload)]).size > BUILDS_DOC_SAFE_BYTES) {
        if (oversizeWarnedKey.current !== key) {
          oversizeWarnedKey.current = key;
          showToast('공략 데이터가 너무 커서 저장하지 못했습니다. 오래된 덱을 정리해 주세요.', 'error');
        }
        return;
      }
      try {
        await setDoc(doc(db, 'hubs', hubId, 'builds', 'main'), payload, { merge: true });
        lastSavedKey.current = key;
      } catch (err) {
        console.error('builds save failed', err);
        lastSavedKey.current = '';
        lastAppliedKey.current = '';
        showToast('공략 저장에 실패했습니다. 네트워크를 확인하고 다시 시도해 주세요.', 'error');
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [activeLounge?.id, siegeBuilds, expeditionBuilds, arenaBuilds, totalwarBuilds, gwAttacks, gwDefenses, expeditionAssignments]);

  // ── 덱 수정/생성 모달 state ──
  const [editingBuild, setEditingBuild]               = useState(null);
  useEffect(() => {
    if (!editingBuild) resetDeckDragState();
  }, [editingBuild]);
  const [isNewCreateMode, setIsNewCreateMode]         = useState(false);
  const [editingCategory, setEditingCategory]         = useState('siege');
  const [buildTitle, setBuildTitle]                   = useState('');
  const [editingHeroNames, setEditingHeroNames]       = useState(['미호', '나타', '리나', '에반', '비스킷']);
  const [targetSlotIdx, setTargetSlotIdx]             = useState(0);
  const [roleFilter, setRoleFilter]                   = useState('all');
  const [editingSpeedOrder, setEditingSpeedOrder]     = useState([]);
  const [editingSpeedIgnored, setEditingSpeedIgnored] = useState([]);
  
  // 우측 스킬 타임라인
  const [editingSkillTimeline, setEditingSkillTimeline] = useState([]);
  const [editingPvpMode, setEditingPvpMode]             = useState('속공');
  const [editingArenaKind, setEditingArenaKind]         = useState('attack');
  const [turnNumberInput, setTurnNumberInput]           = useState('0턴');
  const [newSkillHero, setNewSkillHero]               = useState('미호');
  const [newSkillDir, setNewSkillDir]                 = useState('upper');
  const [newSkillText, setNewSkillText]               = useState('');
  const [editingExpeditionRound, setEditingExpeditionRound] = useState(1);
  const [editingExpeditionRounds, setEditingExpeditionRounds] = useState(() => ({
    1: emptyExpeditionRound(),
    2: emptyExpeditionRound(),
  }));
  const [editingPetId, setEditingPetId] = useState(pets[0]?.id || 'pet_1');
  const skillTimelineScrollerRef = useRef(null);
  const [showTotalwarTeamPick, setShowTotalwarTeamPick] = useState(false);
  const [editingTotalwarTier, setEditingTotalwarTier] = useState('legend');
  const [editingTotalwarDeckCount, setEditingTotalwarDeckCount] = useState(5);
  const [editingTotalwarDecks, setEditingTotalwarDecks] = useState(() => [emptyTotalwarDeck()]);
  const [editingTotalwarTeam, setEditingTotalwarTeam] = useState(0);
  const [editingTotalwarId, setEditingTotalwarId] = useState(null);

  const lastReservedRound = Math.max(0, ...editingSkillTimeline.map(s => parseRoundNumber(s.round)));

  useEffect(() => {
    if (lastReservedRound > 0 && parseRoundNumber(turnNumberInput) < lastReservedRound) {
      setTurnNumberInput(snapSkillTurnPick(lastReservedRound));
    }
  }, [lastReservedRound, turnNumberInput]);
  
  // 6슬롯 정밀 실전 장비 세팅 state
  const [selectedHeroGearIdx, setSelectedHeroGearIdx] = useState(0);
  const [heroGearConfigs, setHeroGearConfigs] = useState([
    { setName: '복수자', weapon1: '치명타 확률', weapon2: '치명타 확률', armor1: '모든 공격력(%)', armor2: '모든 공격력(%)', accessory: '불사의 반지', detailNote: '' },
    { setName: '복수자', weapon1: '치명타 확률', weapon2: '치명타 확률', armor1: '모든 공격력(%)', armor2: '모든 공격력(%)', accessory: '불사의 반지', detailNote: '' },
    { setName: '성기사', weapon1: '효과 적중', weapon2: '효과 적중', armor1: '받는 피해 감소', armor2: '생명력(%)', accessory: '권능의 반지', detailNote: '' },
    { setName: '수문장', weapon1: '약점 공격 확률', weapon2: '약점 공격 확률', armor1: '막기 확률', armor2: '방어력(%)', accessory: '부활의 반지', detailNote: '' },
    { setName: '선봉장', weapon1: '치명타 피해', weapon2: '치명타 피해', armor1: '모든 공격력(%)', armor2: '모든 공격력(%)', accessory: '부활의 반지', detailNote: '' },
  ]);

  const handleUpdateSelectedHeroGear = (field, value) => {
    setHeroGearConfigs(prev => {
      const next = [...prev];
      if (!next[selectedHeroGearIdx]) {
        next[selectedHeroGearIdx] = { setName: '복수자', weapon1: '치명타 확률', weapon2: '치명타 확률', armor1: '모든 공격력(%)', armor2: '모든 공격력(%)', accessory: '불사의 반지', detailNote: '' };
      }
      next[selectedHeroGearIdx] = { ...next[selectedHeroGearIdx], [field]: value };
      return next;
    });
  };

  const captureCurrentRound = () => ({
    formationId: editingBuild?.formationId || 'protect',
    petId: editingPetId,
    heroNames: padHeroNames5(editingHeroNames),
    skillSequence: [...editingSkillTimeline],
    speedOrderNames: [...editingSpeedOrder],
    speedIgnoredNames: [...editingSpeedIgnored],
    heroGearConfigs: heroGearConfigs.map(g => ({ ...g })),
  });

  const applyRoundToEditor = (round = emptyExpeditionRound()) => {
    const next = roundFromFields(round);
    setEditingBuild(prev => prev ? { ...prev, formationId: next.formationId } : prev);
    setEditingPetId(next.petId);
    setEditingHeroNames(next.heroNames);
    setEditingSkillTimeline(next.skillSequence);
    setEditingSpeedOrder(next.speedOrderNames.length ? next.speedOrderNames : next.heroNames.filter(Boolean));
    setEditingSpeedIgnored(next.speedIgnoredNames);
    setHeroGearConfigs(next.heroGearConfigs);
    setTargetSlotIdx(0);
    setSelectedHeroGearIdx(0);
    setNewSkillHero(next.heroNames.find(Boolean) || '');
    const lastRound = Math.max(0, ...next.skillSequence.map(s => parseRoundNumber(s.round)));
    setTurnNumberInput(`${lastRound > 0 ? lastRound : 1}턴`);
  };

  const switchExpeditionRound = (nextRound) => {
    if (nextRound === editingExpeditionRound) return;
    const nextRounds = { ...editingExpeditionRounds, [editingExpeditionRound]: captureCurrentRound() };
    setEditingExpeditionRounds(nextRounds);
    applyRoundToEditor(nextRounds[nextRound] || emptyExpeditionRound());
    setEditingExpeditionRound(nextRound);
  };

  const NEW_BUILD_TITLE = {
    siege: '새 공성전 전술 빌드',
    expedition: '새 강림원정대 전술 빌드',
    arena: '새 결투장&상급 결투장 전술 빌드',
    totalwar: '새 총력전 전술 빌드',
  };

  const captureCurrentTotalwarDeck = () => ({
    formationId: editingBuild?.formationId || 'protect',
    petId: editingPetId,
    heroNames: padHeroNames5(editingHeroNames),
    reservedSkills: editingSkillTimeline.filter(Boolean),
    mode: editingPvpMode === '내실' ? '내실' : '속공',
    heroGearConfigs,
  });

  const applyTotalwarDeckToEditor = (deck = emptyTotalwarDeck()) => {
    const next = totalwarDeckFromFields(deck);
    setEditingBuild(prev => prev ? { ...prev, formationId: next.formationId } : { id: editingTotalwarId || ('new_' + Date.now()), formationId: next.formationId });
    setEditingHeroNames(next.heroNames);
    setEditingSkillTimeline(next.reservedSkills);
    setEditingPvpMode(next.mode);
    setHeroGearConfigs(next.heroGearConfigs);
    setEditingPetId(next.petId);
    setTargetSlotIdx(0);
    setSelectedHeroGearIdx(0);
    setNewSkillHero(next.heroNames.find(Boolean) || '');
  };

  const openTotalwarTeamEditor = (teamIdx) => {
    const decks = [...editingTotalwarDecks];
    applyTotalwarDeckToEditor(decks[teamIdx] || emptyTotalwarDeck());
    setEditingTotalwarTeam(teamIdx);
    setShowTotalwarTeamPick(false);
  };

  const switchTotalwarTeam = (teamIdx) => {
    if (teamIdx === editingTotalwarTeam) return;
    const next = [...editingTotalwarDecks];
    next[editingTotalwarTeam] = captureCurrentTotalwarDeck();
    setEditingTotalwarDecks(next);
    applyTotalwarDeckToEditor(next[teamIdx] || emptyTotalwarDeck());
    setEditingTotalwarTeam(teamIdx);
  };

  const editingCategoryRef = useRef(editingCategory);
  editingCategoryRef.current = editingCategory;

  const returnToTotalwarTeamPickInternal = () => {
    const next = [...editingTotalwarDecks];
    next[editingTotalwarTeam] = captureCurrentTotalwarDeck();
    setEditingTotalwarDecks(next);
    setEditingBuild(null);
    setShowTotalwarTeamPick(true);
  };

  const closeTotalwarTeamPick = () => {
    closeOverlayFromUI(() => {
      setShowTotalwarTeamPick(false);
      setEditingBuild(null);
    });
  };

  const returnToTotalwarTeamPick = () => {
    closeOverlayFromUI(returnToTotalwarTeamPickInternal);
  };

  const closeEditorModal = () => {
    closeOverlayFromUI(() => {
      if (editingCategoryRef.current === 'totalwar') {
        returnToTotalwarTeamPickInternal();
        return;
      }
      setEditingBuild(null);
    });
  };

  useEffect(() => {
    const onHubTabPop = (e) => {
      setActiveTab(e.detail?.tab || 'home');
    };
    window.addEventListener('app:hub-tab-pop', onHubTabPop);
    return () => window.removeEventListener('app:hub-tab-pop', onHubTabPop);
  }, []);

  useEffect(() => {
    if (!showTotalwarTeamPick) return;
    pushOverlay(() => {
      setShowTotalwarTeamPick(false);
      setEditingBuild(null);
    });
  }, [showTotalwarTeamPick]);

  const isEditingBuildOpen = !!editingBuild;
  const isInspectingCounterOpen = !!inspectingCounter;

  useEffect(() => {
    if (!isEditingBuildOpen) return;
    pushOverlay(() => {
      if (editingCategoryRef.current === 'totalwar') {
        returnToTotalwarTeamPickInternal();
        return;
      }
      setEditingBuild(null);
    });
    // 진형·제목 등 editingBuild 내용 변경 시마다 push하지 않음 (열림 한 번만)
  }, [isEditingBuildOpen]);

  useEffect(() => {
    if (!assignModalBoss) return;
    pushOverlay(() => setAssignModalBoss(null));
  }, [assignModalBoss]);

  useEffect(() => {
    if (!isInspectingCounterOpen) return;
    pushOverlay(() => setInspectingCounter(null));
  }, [isInspectingCounterOpen]);

  const navigateHubTab = (tabId) => {
    if (tabId === activeTab) return;
    pushHubTab(tabId);
    setActiveTab(tabId);
  };

  const persistTotalwarBuild = (decks) => {
    if (!buildTitle) {
      alert('공략 제목을 입력해 주세요!');
      return false;
    }
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const payload = {
      id: editingTotalwarId || ('tw_' + Date.now()),
      title: buildTitle,
      decks,
      author: guildRoom.myNickname,
      authorId: me?.id || authUser?.uid || '',
      updatedAt: now,
      likedBy: likedByList((totalwarBuilds[editingTotalwarTier] || []).find(b => b.id === (editingTotalwarId || ''))),
    };
    setTotalwarBuilds(prev => {
      const list = prev[editingTotalwarTier] || [];
      const exists = list.some(b => b.id === payload.id);
      return {
        ...prev,
        [editingTotalwarTier]: exists
          ? list.map(b => b.id === payload.id ? { ...payload, likedBy: likedByList(b) } : b)
          : [...list, { ...payload, likedBy: [] }],
      };
    });
    logBuildHistory(
      isNewCreateMode ? 'create_build' : 'update_build',
      buildTitle,
      buildHistoryScopeLabel('totalwar', { totalwarTier: editingTotalwarTier })
    );
    setShowTotalwarTeamPick(false);
    setEditingBuild(null);
    collapseOverlayHistory();
    alert(`'${guildRoom.myNickname}' 닉네임으로 공략이 저장 고정되었습니다!`);
    return true;
  };

  const toggleShareLike = (category, buildId, tierId) => {
    if (!me?.id) {
      alert('로그인된 구글 계정으로만 좋아요를 누를 수 있습니다.');
      return;
    }
    const apply = (list) => list.map((b) => (
      b.id === buildId ? { ...b, likedBy: toggleLikedBy(b.likedBy, me.id) } : b
    ));
    if (category === 'arena') {
      setArenaBuilds(prev => apply(prev));
      return;
    }
    if (category === 'totalwar' && tierId) {
      setTotalwarBuilds(prev => ({ ...prev, [tierId]: apply(prev[tierId] || []) }));
    }
  };

  const handleOpenCreateTotalwar = (tierId, deckCount) => {
    if (!canEditBuilds) {
      alert('허브 멤버만 공략을 생성할 수 있습니다.');
      return;
    }
    setIsNewCreateMode(true);
    setEditingCategory('totalwar');
    setEditingTotalwarTier(tierId);
    setEditingTotalwarDeckCount(deckCount);
    setEditingTotalwarDecks(Array.from({ length: deckCount }, () => emptyTotalwarDeck()));
    setEditingTotalwarTeam(0);
    setEditingTotalwarId('tw_' + Date.now());
    setBuildTitle(NEW_BUILD_TITLE.totalwar);
    setEditingPvpMode('속공');
    setEditingPetId(pets[0]?.id || 'pet_1');
    setShowTotalwarTeamPick(true);
  };

  const handleStartEditTotalwar = (build, tierId, deckCount) => {
    if (!canEditBuilds) {
      alert('허브에 입장한 멤버만 공략을 수정할 수 있습니다.');
      return;
    }
    setIsNewCreateMode(false);
    setEditingCategory('totalwar');
    setEditingTotalwarTier(tierId);
    setEditingTotalwarDeckCount(deckCount);
    setEditingTotalwarDecks(normalizeTotalwarDecks(build, deckCount));
    setEditingTotalwarTeam(0);
    setEditingTotalwarId(build.id);
    setBuildTitle(build.title);
    setShowTotalwarTeamPick(true);
  };

  const handleOpenCreateModal = (cat) => {
    setIsNewCreateMode(true);
    setEditingCategory(cat);
    setBuildTitle(NEW_BUILD_TITLE[cat] || '새 전술 빌드');
    setEditingPvpMode('속공');
    setEditingArenaKind('attack');
    if (cat === 'expedition') {
      const round1 = roundFromFields({
        formationId: 'protect',
        heroNames: ['미호', '나타', '리나', '에반', '비스킷'],
        speedOrderNames: ['미호', '나타', '리나', '에반', '비스킷'],
      });
      const rounds = { 1: round1, 2: emptyExpeditionRound() };
      setEditingExpeditionRounds(rounds);
      setEditingExpeditionRound(1);
      setEditingBuild({ id: 'new_' + Date.now(), formationId: round1.formationId });
      setEditingPetId(pets[0]?.id || 'pet_1');
      applyRoundToEditor(round1);
    } else if (cat === 'arena') {
      setEditingHeroNames(['', '', '', '', '']);
      setEditingSkillTimeline([]);
      setEditingSpeedOrder([]);
      setEditingSpeedIgnored([]);
      setHeroGearConfigs(defaultGear5());
      setEditingBuild({ id: 'new_' + Date.now(), formationId: 'protect' });
      setEditingPetId(pets[0]?.id || 'pet_1');
      setTargetSlotIdx(0);
      setSelectedHeroGearIdx(0);
      setNewSkillHero('');
    } else {
      setEditingHeroNames(['미호', '나타', '리나', '에반', '비스킷']);
      setEditingSkillTimeline([]);
      setEditingSpeedOrder(['미호', '나타', '리나', '에반', '비스킷']);
      setEditingSpeedIgnored([]);
      setHeroGearConfigs(defaultGear5());
      setEditingBuild({ id: 'new_' + Date.now(), formationId: 'protect' });
      setEditingPetId(pets[0]?.id || 'pet_1');
    }
  };

  const handleStartEditBuild = (build, cat) => {
    setIsNewCreateMode(false);
    setEditingBuild(build);
    setEditingCategory(cat);
    setBuildTitle(build.title);
    setEditingPvpMode(build.mode === '내실' ? '내실' : '속공');
    setEditingArenaKind(normalizeArenaKind(build.deckKind));
    if (cat === 'expedition') {
      const rounds = normalizeExpeditionRounds(build);
      setEditingExpeditionRounds(rounds);
      setEditingExpeditionRound(1);
      applyRoundToEditor(rounds[1]);
      return;
    }
    setEditingHeroNames([...(build.heroNames || [])]);
    setEditingSkillTimeline([...(build.skillSequence || [])]);
    setEditingSpeedOrder([...(build.speedOrderNames || (build.heroNames || []).filter(Boolean))]);
    setEditingSpeedIgnored([...(build.speedIgnoredNames || [])]);
    if (Array.isArray(build.heroGearConfigs) && build.heroGearConfigs.length) {
      const next = Array.from({ length: 5 }, (_, i) => ({
        ...defaultGear5()[0],
        ...(build.heroGearConfigs[i] || {}),
      }));
      setHeroGearConfigs(next);
    } else {
      setHeroGearConfigs(defaultGear5());
    }
    setTargetSlotIdx(0);
    setNewSkillHero((build.heroNames || [])[0] || '미호');
    setEditingPetId(build.petId || pets[0]?.id || 'pet_1');
    const lastRound = Math.max(0, ...(build.skillSequence || []).map(s => parseRoundNumber(s.round)));
    setTurnNumberInput(`${lastRound > 0 ? lastRound : 1}턴`);
  };

  const handleSelectHeroFromBottom = (heroObj) => {
    const hName = heroObj.name.replace('(각성)', '');
    // 다른 슬롯에 이미 있으면된 영웅은 선택 불가
    if (editingHeroNames.some((n, i) => n === hName && i !== targetSlotIdx)) {
      alert('이미 다른 슬롯에 배치된 영웅입니다.');
      return;
    }
    const next = [...editingHeroNames];
    next[targetSlotIdx] = hName;
    setEditingHeroNames(next);
  };

  const handleHeroDrop = (payload, toIdx) => {
    const next = [...editingHeroNames];
    while (next.length < 5) next.push('');
    if (payload?.source === 'slot' && typeof payload.fromIdx === 'number') {
      const tmp = next[toIdx];
      next[toIdx] = next[payload.fromIdx];
      next[payload.fromIdx] = tmp;
      setEditingHeroNames(next);
      setTargetSlotIdx(toIdx);
      setSelectedHeroGearIdx(toIdx);
      return;
    }
    if (payload?.source === 'picker' && payload.name) {
      const existingIdx = next.findIndex((n, i) => i !== toIdx && n === payload.name);
      if (existingIdx !== -1) {
        const tmp = next[toIdx];
        next[toIdx] = next[existingIdx];
        next[existingIdx] = tmp;
      } else {
        next[toIdx] = payload.name;
      }
      setEditingHeroNames(next);
      setTargetSlotIdx(toIdx);
      setSelectedHeroGearIdx(toIdx);
    }
  };

  const handleAddSkillStep = () => {
    if (!newSkillHero) return;
    const raw = String(turnNumberInput || '').trim();
    const turnMatch = raw.match(/(\d+)/);
    const picked = turnMatch ? Number(turnMatch[1]) : 0;
    if (lastReservedRound > 0 && picked < lastReservedRound) {
      alert(`${lastReservedRound}턴 이전은 선택할 수 없습니다. ${lastReservedRound}턴부터 추가해 주세요.`);
      setTurnNumberInput(snapSkillTurnPick(lastReservedRound));
      return;
    }
    const roundStr = `${picked}턴`;
    const newStep = {
      round: roundStr,
      heroName: newSkillHero,
      dir: newSkillDir,
      text: newSkillText || ''
    };
    setEditingSkillTimeline([...editingSkillTimeline, newStep]);
    setNewSkillText('');
    requestAnimationFrame(() => {
      const scroller = skillTimelineScrollerRef.current;
      if (!scroller) return;
      scroller.scrollTop = scroller.scrollHeight;
    });
  };

  const handleRemoveSkillStep = (idx) => {
    setEditingSkillTimeline(editingSkillTimeline.filter((_, i) => i !== idx));
  };

  const handleSaveEditedBuild = () => {
    if (!buildTitle) {
      alert('공략 제목을 입력해 주세요!');
      return;
    }

    const updated = editingCategory === 'expedition'
      ? (() => {
          const rounds = {
            ...editingExpeditionRounds,
            [editingExpeditionRound]: captureCurrentRound(),
          };
          return {
            id: editingBuild.id,
            title: buildTitle,
            // 구형 폴백용(1라운드 펫). 실제 표시·편집은 rounds[n].petId
            petId: rounds[1]?.petId || editingPetId,
            rounds,
            author: guildRoom.myNickname,
            authorId: me?.id || authUser?.uid || '',
            updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          };
        })()
      : editingCategory === 'totalwar'
      ? null
      : {
          id: editingBuild.id,
          title: buildTitle,
          formationId: editingBuild.formationId || 'protect',
          petId: editingPetId,
          heroNames: editingHeroNames,
          skillSequence: editingSkillTimeline.filter(Boolean),
          mode: (CONTENT_META[editingCategory] || CONTENT_META.siege).mode === 'pvp'
            ? (editingPvpMode === '내실' ? '내실' : '속공')
            : undefined,
          deckKind: editingCategory === 'arena' ? normalizeArenaKind(editingArenaKind) : undefined,
          speedOrderNames: editingSpeedOrder.length ? editingSpeedOrder : editingHeroNames.filter(Boolean),
          speedIgnoredNames: editingSpeedIgnored,
          heroGearConfigs: heroGearConfigs,
          author: guildRoom.myNickname,
          authorId: me?.id || authUser?.uid || '',
          updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          likedBy: likedByList(editingBuild),
        };

    if (editingCategory === 'totalwar') {
      const decks = [...editingTotalwarDecks];
      decks[editingTotalwarTeam] = captureCurrentTotalwarDeck();
      persistTotalwarBuild(decks);
      return;
    }

    const saveIntoKeyedState = (state, setState, key) => {
      const list = state[key] || [];
      const exists = list.some(b => b.id === updated.id);
      setState({ ...state, [key]: exists ? list.map(b => b.id === updated.id ? updated : b) : [...list, updated] });
    };
    const saveIntoFlatState = (setState) => {
      setState(prev => {
        const exists = prev.some(b => b.id === updated.id);
        return exists
          ? prev.map(b => b.id === updated.id ? { ...updated, likedBy: likedByList(b) } : b)
          : [...prev, { ...updated, likedBy: likedByList(updated) }];
      });
    };

    if (editingCategory === 'siege') {
      saveIntoKeyedState(siegeBuilds, setSiegeBuilds, siegeDay);
    } else if (editingCategory === 'expedition') {
      saveIntoKeyedState(expeditionBuilds, setExpeditionBuilds, expeditionBoss);
    } else if (editingCategory === 'arena') {
      saveIntoFlatState(setArenaBuilds);
    }

    logBuildHistory(
      isNewCreateMode ? 'create_build' : 'update_build',
      buildTitle,
      buildHistoryScopeLabel(editingCategory, { siegeDay, expeditionBoss })
    );

    setEditingBuild(null);
    collapseOverlayHistory();
    alert(`'${guildRoom.myNickname}' 닉네임으로 공략이 저장 고정되었습니다!`);
  };

  const filteredHeroesByRole = sortHeroesForList(heroes.filter(h => {
    if (roleFilter !== 'all' && h.role !== roleFilter) return false;
    const cleanName = h.name.replace('(각성)', '');
    // 다른 슬롯에 배치된 영웅은 목록에서 숨김
    if (editingHeroNames.some((n, i) => n === cleanName && i !== targetSlotIdx)) return false;
    return true;
  }));

  // 공성전/강림원정대(PvE)와 결투장/총력전(PvP) 공략 게시판 카드 — 공통 렌더러
  const renderBuildPanel = (build, category) => {
    const meta = CONTENT_META[category] || CONTENT_META.siege;
    const isPvp = meta.mode === 'pvp';
    const editOnRight = editButtonOnRight(category);
    const arenaKind = category === 'arena' ? arenaKindTheme(build.deckKind) : null;

    const requestEdit = () => {
      if (!canEditBuilds) {
        alert('허브에 입장한 멤버만 공략을 수정할 수 있습니다.');
        return;
      }
      handleStartEditBuild(build, category);
    };

    const deleteLabel = category === 'arena'
      ? '이 결투장&상급 결투장 공략을 삭제할까요?'
      : category === 'siege'
        ? '이 공성전 공략을 삭제할까요?'
        : '이 공략을 삭제할까요?';

    const requestDelete = () => {
      if (!canDeleteBuild(build)) {
        alert('공략 삭제는 길드마스터·관리자 또는 작성자만 할 수 있습니다.');
        return;
      }
      if (!confirm(deleteLabel)) return;
      if (category === 'arena') {
        setArenaBuilds((prev) => prev.filter((b) => b.id !== build.id));
        logBuildHistory('delete_build', build.title || build.id, '결투장');
      } else if (category === 'siege') {
        setSiegeBuilds((prev) => ({
          ...prev,
          [siegeDay]: (prev[siegeDay] || []).filter((b) => b.id !== build.id),
        }));
        logBuildHistory('delete_build', build.title || build.id, buildHistoryScopeLabel('siege', { siegeDay }));
      }
    };

    return (
      <div key={build.id} className="luxury-panel build-panel" style={arenaKind ? {
        boxShadow: `inset 3px 0 0 ${arenaKind.text}`,
      } : undefined}>
        <div className="build-panel-deck">
          <InGameDeckCard
            embedded
            teamName=""
            overviewTitle={build.title || ''}
            formationId={build.formationId}
            petObj={resolvePetById(build.petId)}
            heroList={(build.heroNames || []).map((name, idx) => {
              const baseHero = resolveHeroByName(name);
              return baseHero ? { hero: baseHero, gearConfig: (build.heroGearConfigs || [])[idx] } : name;
            })}
            contentMode={meta.mode}
            reservedSkills={build.skillSequence || build.reservedSkills}
            speedOrderNames={build.speedOrderNames}
            speedIgnoredNames={build.speedIgnoredNames}
            onEditClick={editOnRight ? undefined : requestEdit}
            pvpMode={isPvp ? build.mode : null}
            headerSlot={isPvp ? (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {arenaKind ? <ArenaDeckKindBadge kind={build.deckKind} /> : null}
                <PvpModeBadge mode={build.mode} size="sm" />
              </div>
            ) : null}
          />
        </div>

        <div className="build-panel-body">
          <div className="build-title-strip" style={{
            borderLeft: `3px solid ${arenaKind ? arenaKind.text : 'var(--gold-primary)'}`
          }}>
            <div className="build-title-heading" style={{ minWidth: 0, flex: '1 1 180px' }}>
              {arenaKind ? <ArenaDeckKindBadge kind={build.deckKind} /> : null}
              <h3 className="build-title-name">{build.title}</h3>
              <AuthorMeta
                author={build.author}
                authorId={build.authorId}
                updatedAt={build.updatedAt}
                onOpenProfile={setProfileUid}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: 'auto' }}>
              {category === 'arena' && (
                <DeckLikeButton
                  likedBy={build.likedBy}
                  myId={me?.id}
                  onToggle={() => toggleShareLike('arena', build.id)}
                />
              )}
              {editOnRight && (
                <button
                  type="button"
                  onClick={requestEdit}
                  className="btn-edit"
                >
                  <Icon name="edit" size={14} /> 수정
                </button>
              )}
              {canDeleteBuild(build) && (
                <button
                  type="button"
                  onClick={requestDelete}
                  className="btn-danger-solid"
                >
                  <Icon name="close" size={14} /> 삭제
                </button>
              )}
            </div>
          </div>

          {isPvp ? (
            <div className="build-panel-playbook">
              <div className="build-panel-playbook-title">
                <Icon name="target" size={15} />
                스킬 예약
              </div>
              <SkillReservationBoard
                heroNames={build.heroNames || []}
                resolveHeroByName={resolveHeroByName}
                value={build.skillSequence || build.reservedSkills || []}
                readOnly
              />
            </div>
          ) : (
            <div className="build-panel-timeline">
              <div className="build-panel-timeline-title">
                <Icon name="clock" size={15} />
                스킬 시전 순서 타임라인 (최대 70턴)
              </div>
              <SkillTimelineSteps
                steps={build.skillSequence || []}
                resolveHeroByName={resolveHeroByName}
                formatRound={(round) => <RoundMark round={round} />}
                renderDir={(dir) => <SkillDirBadge dir={dir} />}
                arrowColor="var(--gold-primary)"
                arrowSize={13}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const expTheme = EXPEDITION_BOSS_THEMES[expeditionBoss] || EXPEDITION_BOSS_THEMES.taeho;

  const renderExpeditionRoundDeck = (round, guideTitle = '') => (
    <div className="expedition-round-deck">
      <InGameDeckCard
        teamName=""
        overviewTitle={guideTitle}
        formationId={round.formationId}
        petObj={resolvePetById(round.petId)}
        heroList={(round.heroNames || []).map((name, idx) => {
          const baseHero = resolveHeroByName(name);
          return baseHero ? { hero: baseHero, gearConfig: (round.heroGearConfigs || [])[idx] } : name;
        })}
        contentMode="pve"
        speedOrderNames={round.speedOrderNames}
        speedIgnoredNames={round.speedIgnoredNames}
        accentColor={expTheme.text}
      />
    </div>
  );

  const renderExpeditionRoundGuide = (roundNo, round) => {
    const seq = round.skillSequence || [];
    return (
      <div className="expedition-round-guide">
        <div style={{ fontSize: '16px', fontWeight: 700, color: expTheme.text, display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Icon name="clock" size={15} color={expTheme.text} />
          {roundNo}라운드 스킬 시전 순서
        </div>
        <SkillTimelineSteps
          steps={seq}
          resolveHeroByName={resolveHeroByName}
          formatRound={(round) => <RoundMark round={round} />}
          renderDir={(dir) => <SkillDirBadge dir={dir} />}
          arrowColor={expTheme.text}
          arrowSize={16}
        />
      </div>
    );
  };

  const renderExpeditionBuildPanel = (build) => {
    const rounds = normalizeExpeditionRounds(build);
    const requestEdit = () => {
      if (!canEditBuilds) {
        alert('허브에 입장한 멤버만 공략을 수정할 수 있습니다.');
        return;
      }
      handleStartEditBuild(build, 'expedition');
    };
    const requestDelete = () => {
      if (!canDeleteBuild(build)) {
        alert('공략 삭제는 길드마스터·관리자 또는 작성자만 할 수 있습니다.');
        return;
      }
      if (!confirm('이 강림원정대 공략을 삭제할까요?')) return;
      setExpeditionBuilds((prev) => ({
        ...prev,
        [expeditionBoss]: (prev[expeditionBoss] || []).filter((b) => b.id !== build.id),
      }));
      logBuildHistory('delete_build', build.title || build.id, buildHistoryScopeLabel('expedition', { expeditionBoss }));
    };

    return (
      <div key={build.id} className="luxury-panel expedition-tint expedition-build-panel" style={{
        padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px',
      }}>
        <div className="build-title-strip" style={{
          borderLeft: `3px solid ${expTheme.text}`
        }}>
          <div className="build-title-heading" style={{ minWidth: 0, flex: '1 1 180px' }}>
            <h3 className="build-title-name">{build.title}</h3>
            <AuthorMeta
              author={build.author}
              authorId={build.authorId}
              updatedAt={build.updatedAt}
              onOpenProfile={setProfileUid}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: 'auto' }}>
            <button
              type="button"
              onClick={requestEdit}
              className="btn-edit"
            >
              <Icon name="edit" size={14} /> 수정
            </button>
            {canDeleteBuild(build) && (
              <button
                type="button"
                onClick={requestDelete}
                className="btn-danger-solid"
              >
                <Icon name="close" size={14} /> 삭제
              </button>
            )}
          </div>
        </div>

        <div className="expedition-round-block">
          <div className="expedition-round-title">
            <Icon name="volcano" size={16} color={expTheme.text} />
            1라운드
          </div>
          <div className="expedition-round-row">
            {renderExpeditionRoundDeck(rounds[1], build.title || '')}
            {renderExpeditionRoundGuide(1, rounds[1])}
          </div>
        </div>
        <div className="expedition-round-divider" />
        <div className="expedition-round-block">
          <div className="expedition-round-title">
            <Icon name="volcano" size={16} color={expTheme.text} />
            2라운드
          </div>
          <div className="expedition-round-row">
            {renderExpeditionRoundDeck(rounds[2], build.title || '')}
            {renderExpeditionRoundGuide(2, rounds[2])}
          </div>
        </div>
      </div>
    );
  };

  if (!session || !activeLounge || !me) {
    // 로그인이 풀린 채 로컬 세션만 남아 있으면 허브를 영원히 못 불러온다.
    // 인증이 끝났는데 계정이 없으면 로딩 대신 로그인 화면을 보여준다.
    if (hubRecovering || (session && (!authReady || authUser))) {
      return (
        <div className="container fade-in" style={{ padding: '48px 24px', color: '#fff', fontWeight: 800, textAlign: 'center' }}>
          {hubRecovering ? '소속 길드 허브를 찾는 중…' : '허브를 불러오는 중…'}
        </div>
      );
    }
    return <LoungeLanding />;
  }

  return (
    <div className="container fade-in lounge-page">
      {freshInvite && (
        <InviteReadyModal hub={freshInvite} onClose={dismissFreshInvite} />
      )}
      {inviteJoinOpen && pendingInvite && pendingInvite !== activeLounge.inviteCode && (
        <LoungeJoinModal
          initialCode={pendingInvite}
          onClose={() => setInviteJoinOpen(false)}
        />
      )}
      
      <LoungeHubHeader />

      {/* ── 2. 서브 탭: 홈(허브) 분리 + 컨텐츠 모드 ── */}
      <div className="luxury-panel tab-bar-wrap" style={{ padding: '12px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="tab-bar" style={{ flex: 1 }}>
          <button
            className={`nav-tab-btn ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => navigateHubTab('home')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GuildMark
              emblem={activeLounge.emblem || 'fortress'}
              emblemUrl={activeLounge.emblemUrl}
              size={16}
              color={activeTab === 'home' ? '#161616' : 'var(--text-muted)'}
            />
            <span>홈</span>
          </button>
          <span className="tab-bar-split" aria-hidden="true" />
          {[
            { id: 'siege',      label: '공성전', short: '공성전', icon: 'siege' },
            { id: 'expedition', label: '강림 원정대', short: '원정대', icon: 'volcano' },
            { id: 'gw_attack',  label: '길드전 공격', short: '공격', icon: 'guildwar' },
            { id: 'gw_defense', label: '길드전 방어', short: '방어', icon: 'shield' },
            { id: 'arena',      label: '결투장&상급 결투장', short: '결투장', icon: 'arena' },
            { id: 'totalwar',   label: '총력전', short: '총력전', icon: 'totalwar' },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id}
                className={`nav-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => navigateHubTab(tab.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name={tab.icon} size={16} color={isActive ? '#161616' : 'var(--text-muted)'} />
                <span className="tab-label-full">{tab.label}</span>
                <span className="tab-label-short">{tab.short}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'home' && <LoungeHome />}

      {/* ── 3. [공성전] ── */}
      {activeTab === 'siege' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* 요일 선택 — 컴팩트 글래스 필 스트립 */}
          <div className="luxury-panel day-pill-row" style={{ padding: '8px' }}>
            {[
              { id: 'mon', day: '월', boss: '루디',    type: '마법', color: '#2563eb', glow: 'rgba(37,99,235,0.4)' },
              { id: 'tue', day: '화', boss: '아일린',  type: '마법', color: '#2563eb', glow: 'rgba(37,99,235,0.4)' },
              { id: 'wed', day: '수', boss: '레이첼',  type: '마법', color: '#2563eb', glow: 'rgba(37,99,235,0.4)' },
              { id: 'thu', day: '목', boss: '델론즈',  type: '물리', color: '#dc2626', glow: 'rgba(220,38,38,0.4)'  },
              { id: 'fri', day: '금', boss: '제이브',  type: '물리', color: '#dc2626', glow: 'rgba(220,38,38,0.4)'  },
              { id: 'sat', day: '토', boss: '스파이크',type: '물리', color: '#dc2626', glow: 'rgba(220,38,38,0.4)'  },
              { id: 'sun', day: '일', boss: '크리스',  type: '단일', color: '#7c3aed', glow: 'rgba(124,58,237,0.4)' },
            ].map(d => {
              const isActive = siegeDay === d.id;
              return (
                <button key={d.id} onClick={() => setSiegeDay(d.id)}
                  className="day-pill"
                  style={{
                    background: isActive ? `${d.color}55` : 'rgba(255,255,255,0.04)',
                    border: isActive ? `1px solid ${d.color}` : '1px solid rgba(255,255,255,0.10)',
                    boxShadow: isActive ? `0 0 12px ${d.glow}` : 'none',
                  }}>
                  <span className="day-letter">{d.day}</span>
                  <span className="day-boss">{d.boss}</span>
                  <span className="day-type" style={{
                    marginLeft: 'auto', fontSize: '9px', fontWeight: 900, padding: '2px 7px', borderRadius: '999px', flexShrink: 0,
                    background: isActive ? d.color : 'rgba(255,255,255,0.18)',
                    color: '#fff',
                  }}>{d.type}</span>
                </button>
              );
            })}
          </div>

          <StrategyActionBar
            icon="siege"
            title={`${({ mon: '월·루디', tue: '화·아일린', wed: '수·레이첼', thu: '목·델론즈', fri: '금·제이브', sat: '토·스파이크', sun: '일·크리스' })[siegeDay] || '공성전'} 공략`}
            hint="선택한 요일 보스 기준으로 공략을 등록합니다"
            actionLabel="공략 추가"
            onAction={() => {
              if (!canEditBuilds) { alert('허브 멤버만 공략을 생성할 수 있습니다.'); return; }
              handleOpenCreateModal('siege');
            }}
          />

          {(siegeBuilds[siegeDay] || []).map(build => renderBuildPanel(build, 'siege'))}

        </div>
      )}

      {/* ── 4. [강림 원정대] ── */}
      {activeTab === 'expedition' && (
        <div className="expedition-themed" style={{ display: 'flex', flexDirection: 'column', gap: '16px', ...expeditionThemeVars(expTheme) }}>
          
          <div className="luxury-panel expedition-boss-grid" style={{ padding: '8px' }}>
            {Object.values(EXPEDITION_BOSS_THEMES).map(b => {
              const isActive = expeditionBoss === b.id;
              if (b.kind === 'god') {
                return (
                  <button key={b.id} type="button" onClick={() => setExpeditionBoss(b.id)}
                    className={`exp-boss-btn exp-boss-btn--god${isActive ? ' is-on' : ''}`}
                    style={{
                      '--exp-btn-soft': b.soft,
                      '--exp-btn-text': b.text,
                      borderColor: isActive ? b.text : undefined,
                    }}>
                    <Icon name="volcano" size={18} color={isActive ? b.text : 'var(--text-muted)'} />
                    <div style={{ textAlign: 'left', minWidth: 0 }}>
                      <div className="exp-boss-caption">최종</div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap' }}>파괴신</div>
                    </div>
                  </button>
                );
              }
              return (
                <button key={b.id} type="button" onClick={() => setExpeditionBoss(b.id)}
                  className={`exp-boss-btn${isActive ? ' is-on' : ''}`}
                  style={{
                    '--exp-btn-soft': b.soft,
                    '--exp-btn-text': b.text,
                    color: isActive ? b.text : '#fff',
                    borderColor: isActive ? b.text : undefined,
                  }}>
                  <span className="exp-boss-caption">파괴의 그림자</span>
                  <strong style={{ fontSize: '15px', fontWeight: 800, color: isActive ? b.text : '#fff' }}>{b.label}</strong>
                </button>
              );
            })}
          </div>

          {expTheme.kind === 'shadow' ? (
            <div className="luxury-panel" style={{
              padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 0,
              borderColor: expTheme.border,
              boxShadow: `inset 3px 0 0 ${expTheme.text}`,
              flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap', padding: '4px 0' }}>
                {(expeditionAssignments[expeditionBoss] || []).length > 0
                  ? (expeditionAssignments[expeditionBoss] || []).map((m, i) => (
                      <span key={i} style={{
                        padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 800,
                        background: expTheme.accent, border: `1px solid ${expTheme.accent}`,
                        color: expTheme.id === 'yeonhee' ? '#1a1a00' : '#fff',
                        textShadow: expTheme.id === 'yeonhee' ? 'none' : '0 1px 2px rgba(0,0,0,0.5)',
                      }}>{m.nickname}</span>
                    ))
                  : <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>배치된 길드원 없음</span>
                }
              </div>
              <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.16)', margin: '0 12px', flexShrink: 0 }} />
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button type="button" onClick={() => setAssignModalBoss(expeditionBoss)}
                  style={{
                    padding: '8px 12px', fontSize: 12, fontWeight: 900, borderRadius: 8, cursor: 'pointer',
                    background: 'rgba(56,189,248,0.12)', border: '1.5px solid var(--accent-cyan)', color: 'var(--accent-cyan)',
                    display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
                  }}>
                  <Icon name="users" size={13} color="var(--accent-cyan)" /> 길드원 배치
                </button>
                <button type="button" onClick={() => {
                  if (!canEditBuilds) { alert('허브 멤버만 공략을 생성할 수 있습니다.'); return; }
                  handleOpenCreateModal('expedition');
                }} className="btn-ops" style={{ padding: '8px 12px', fontSize: 12, flexShrink: 0 }}>
                  <Icon name="plus" size={13} /> 공략 추가
                </button>
              </div>
            </div>
          ) : (
            <StrategyActionBar
              icon="volcano"
              title="파괴신 공략"
              actionLabel="공략 추가"
              accentColor={expTheme.text}
              onAction={() => {
                if (!canEditBuilds) { alert('허브 멤버만 공략을 생성할 수 있습니다.'); return; }
                handleOpenCreateModal('expedition');
              }}
            />
          )}

          {(expeditionBuilds[expeditionBoss] || []).map(build => renderExpeditionBuildPanel(build))}

        </div>
      )}

      {/* ── 4-1. [결투장&상급 결투장] (PvP, 스킬 예약 최대 3개) ── */}
      {activeTab === 'arena' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <StrategyActionBar
            icon="arena"
            title="결투장&상급 결투장 공략"
            hint="스킬 예약 최대 3개 · PvP"
            actionLabel="공략 추가"
            onAction={() => {
              if (!canEditBuilds) { alert('허브 멤버만 공략을 생성할 수 있습니다.'); return; }
              handleOpenCreateModal('arena');
            }}
          />
          {arenaBuilds.length === 0 && (
            <div className="luxury-panel" style={{ padding: '40px', textAlign: 'center', color: '#fff', fontWeight: 700 }}>등록된 결투장&상급 결투장 공략이 없습니다. 위 「공략 추가」로 첫 공략을 등록해 보세요.</div>
          )}
          {arenaBuilds.map(build => renderBuildPanel(build, 'arena'))}
        </div>
      )}

      {/* ── 4-2. [총력전] (PvP, 등급별 참전 덱 개수 상이) ── */}
      {activeTab === 'totalwar' && (
        <TotalWarPanel
          totalwarBuilds={totalwarBuilds}
          resolveHeroByName={resolveHeroByName}
          likeUserId={me?.id}
          canDeleteBuild={canDeleteBuild}
          onToggleLike={(id, tierId) => toggleShareLike('totalwar', id, tierId)}
          onCreate={handleOpenCreateTotalwar}
          onEdit={handleStartEditTotalwar}
          onDelete={(id, title, tierId) => {
            setTotalwarBuilds(prev => ({ ...prev, [tierId]: (prev[tierId] || []).filter(b => b.id !== id) }));
            logBuildHistory('delete_build', title || id, buildHistoryScopeLabel('totalwar', { totalwarTier: tierId }));
          }}
          onOpenProfile={setProfileUid}
        />
      )}

      {/* ── 5. [길드전 공격 3v3] — 상대 덱 탐색형 UI ── */}
      {activeTab === 'gw_attack' && (
        <GuildWarAttackPanel
          gwAttacks={gwAttacks}
          setGwAttacks={setGwAttacks}
          selectedGwAttackId={selectedGwAttackId}
          setSelectedGwAttackId={setSelectedGwAttackId}
          inspectingCounter={inspectingCounter}
          setInspectingCounter={setInspectingCounter}
          guildRoom={guildRoom}
          onBuildHistory={logBuildHistory}
          resolveHeroByName={resolveHeroByName}
          heroes={heroes}
          canDeleteBuild={canDeleteBuild}
        />
      )}

      {/* ── 6. [길드전 방어 3v3] — 구조화된 세팅 카드 UI ── */}
      {activeTab === 'gw_defense' && (
        <GuildWarDefensePanel
          gwDefenses={gwDefenses}
          setGwDefenses={setGwDefenses}
          guildRoom={guildRoom}
          onBuildHistory={logBuildHistory}
          resolveHeroByName={resolveHeroByName}
          heroes={heroes}
          canDeleteBuild={canDeleteBuild}
        />
      )}

      {/* ── 총력전 팀 선택 (세팅 창 전 단계) ── */}
      {showTotalwarTeamPick && (
        <ModalScrim style={{ zIndex: 3490, padding: '16px' }}
          {...backdropDismissProps(closeTotalwarTeamPick)}>
          <div onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} className="glass-modal totalwar-team-pick-modal" style={{
            width: 'min(920px, 96vw)', padding: '24px', borderRadius: '18px',
            display: 'flex', flexDirection: 'column', gap: '18px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icon name="totalwar" size={18} color="var(--gold-primary)" />
                총력전 팀 선택 · {(TOTALWAR_TIERS.find(t => t.id === editingTotalwarTier) || {}).label || ''} 등급
              </h3>
              <button type="button" onClick={closeTotalwarTeamPick}
                style={{ background: 'none', border: 'none', color: '#fff', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="closeBtn" size={26} />
              </button>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#fff', marginBottom: '5px', fontWeight: 800 }}>제목</div>
              <input value={buildTitle} onChange={e => setBuildTitle(e.target.value)} placeholder="예: 전설 등급 5팀 편성"
                style={{ width: '100%', padding: '9px 12px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '7px', fontSize: '14px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>세팅할 팀을 고르세요. 장비 · 펫 · 스킬 예약은 결투장과 같은 창에서 설정합니다.</div>
            <div className="totalwar-team-pick-grid" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(editingTotalwarDeckCount, 5)}, minmax(0, 1fr))`, gap: '10px' }}>
              {editingTotalwarDecks.map((deck, i) => {
                const filled = (deck.heroNames || []).filter(Boolean);
                const leadHero = filled[0] ? resolveHeroByName(filled[0]) : null;
                return (
                  <div
                    key={i}
                    style={{
                      padding: '14px 10px', borderRadius: '14px',
                      background: 'rgba(255,255,255,0.04)',
                      border: editingTotalwarTeam === i && editingBuild ? '1.5px solid var(--gold-primary)' : '1px solid var(--border-subtle)',
                      color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px'
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 900, color: 'var(--gold-light)' }}>{i + 1}팀</div>
                    <div className="totalwar-team-lead-face" style={{
                      width: '48px', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {leadHero
                        ? <HeroPortraitCard hero={leadHero} showStars showRole showName={false} />
                        : <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 800 }}>빈 덱</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => openTotalwarTeamEditor(i)}
                      style={{
                        width: '100%', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                        fontSize: '12px', fontWeight: 900,
                        background: 'rgba(56,189,248,0.16)',
                        border: '1.5px solid var(--accent-cyan)',
                        color: 'var(--accent-cyan)'
                      }}
                    >
                      세팅하기
                    </button>
                  </div>
                );
              })}
            </div>
            <button type="button" onClick={() => persistTotalwarBuild(editingTotalwarDecks)} className="btn-ops" style={{ padding: '12px', justifyContent: 'center', fontSize: '15px' }}>
              공략 저장
            </button>
          </div>
        </ModalScrim>
      )}

      {/* ── 8. 덱 생성/수정 대시보드 모달 (isEditMode 전달 + 영웅 서랍 168px 하단 공백 100% 제거) ── */}
      {editingBuild && (
        <ModalScrim style={{ zIndex: 3500, padding: '16px', overflow: 'hidden' }}>
          <div
            className={`luxury-panel glass-modal editing-build-modal${editingCategory === 'arena' ? ' arena-body-scroll-modal' : ''}`}
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            style={{ width: '94vw', maxWidth: '1520px', maxHeight: '88vh', padding: '0', display: 'flex', flexDirection: 'column', borderRadius: '28px', minHeight: 0, overflow: 'hidden' }}
          >
            {/* 1. 모달 헤더 */}
            <div className="editing-build-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.10)', flexShrink: 0 }}>
              <div className="editing-build-modal-header-main" style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, flexWrap: 'wrap' }}>
                <div className="editing-build-modal-title-row">
                  <h3 className="editing-build-title" style={{ fontSize: '17px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', margin: 0 }}>
                    {isNewCreateMode ? '신규 공략 생성' : '공략 덱 & 영웅 장비 세팅 수정'}
                  </h3>
                  <button
                    type="button"
                    className="editing-build-modal-close editing-build-modal-close--mobile"
                    onClick={closeEditorModal}
                    title="모달 닫기"
                  >
                    <Icon name="closeBtn" size={26} />
                  </button>
                </div>
                <div className="editing-build-title-input-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '540px' }}>
                  <span style={{ fontSize: '12px', color: '#fff', fontWeight: 800, whiteSpace: 'nowrap' }}>제목:</span>
                  <input type="text" value={buildTitle} onChange={e => setBuildTitle(e.target.value)} placeholder="예: 월요일 마법 공성 (루디) - 600만 극딜 전술" style={{ width: '100%', padding: '6px 12px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '6px', fontSize: '12px', fontWeight: 800, boxSizing: 'border-box' }} />
                </div>
                {editingCategory === 'arena' ? (
                  <div className="editing-build-arena-toggles" style={{
                    display: 'flex', alignItems: 'stretch', flexShrink: 0,
                    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', overflow: 'hidden',
                    background: 'rgba(255,255,255,0.05)'
                  }}>
                    <div className="editing-build-arena-toggle-col" style={{ padding: '7px 12px', display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '210px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#fff', letterSpacing: '0.4px' }}>세팅</div>
                      <PvpModeToggle mode={editingPvpMode} onChange={setEditingPvpMode} />
                    </div>
                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.14)', flexShrink: 0 }} />
                    <div className="editing-build-arena-toggle-col" style={{ padding: '7px 12px', display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '210px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#fff', letterSpacing: '0.4px' }}>덱 유형</div>
                      <ArenaDeckKindToggle kind={editingArenaKind} onChange={setEditingArenaKind} />
                    </div>
                  </div>
                ) : (CONTENT_META[editingCategory] || CONTENT_META.siege).mode === 'pvp' ? (
                  <div className="editing-build-arena-toggle-col" style={{ width: '220px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#fff', letterSpacing: '0.4px' }}>세팅</div>
                    <PvpModeToggle mode={editingPvpMode} onChange={setEditingPvpMode} />
                  </div>
                ) : null}
                {editingCategory === 'totalwar' && (
                  <div className="editing-build-round-toggles" style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    {Array.from({ length: editingTotalwarDeckCount }, (_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => switchTotalwarTeam(i)}
                        style={{
                          padding: '8px 14px', fontSize: '13px', fontWeight: 900, borderRadius: '8px', cursor: 'pointer',
                          border: editingTotalwarTeam === i ? '1.5px solid var(--gold-primary)' : '1px solid var(--border-subtle)',
                          background: editingTotalwarTeam === i ? 'rgba(236,232,224,0.28)' : 'rgba(0,0,0,0.35)',
                          color: editingTotalwarTeam === i ? 'var(--gold-light)' : '#94a3b8',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {i + 1}팀
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={returnToTotalwarTeamPick}
                      style={{
                        padding: '8px 12px', fontSize: '12px', fontWeight: 800, borderRadius: '8px', cursor: 'pointer',
                        border: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.35)', color: '#94a3b8',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      팀 선택
                    </button>
                  </div>
                )}
                {editingCategory === 'expedition' && (
                  <div className="editing-build-round-toggles" style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    {[1, 2].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => switchExpeditionRound(r)}
                        style={{
                          padding: '8px 14px', fontSize: '13px', fontWeight: 900, borderRadius: '8px', cursor: 'pointer',
                          border: editingExpeditionRound === r ? `1.5px solid ${expTheme.text}` : '1px solid var(--border-subtle)',
                          background: editingExpeditionRound === r ? expTheme.soft : 'rgba(0,0,0,0.35)',
                          color: editingExpeditionRound === r ? expTheme.text : '#94a3b8',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {r}라운드 세팅
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="editing-build-author-row" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <button
                  type="button"
                  className="editing-build-modal-close editing-build-modal-close--desktop"
                  onClick={closeEditorModal}
                  title="모달 닫기"
                >
                  <Icon name="closeBtn" size={26} />
                </button>
              </div>
            </div>

            {/* 2. 바디 — PC: PvE 3열(덱·장비·타임라인) / PvP 2열+영웅목록 · 결투장만 본문 통스크롤 */}
            <div
              className={editingCategory === 'arena' ? 'arena-edit-scroll-body' : undefined}
              style={editingCategory === 'arena' ? undefined : { display: 'contents' }}
            >
            <div
              className={`editing-build-grid editing-build-modal-body ${(CONTENT_META[editingCategory] || CONTENT_META.siege).mode === 'pvp' ? 'is-pvp' : 'is-pve'}`}
              style={editingCategory === 'arena'
                ? { gap: '20px', alignItems: 'stretch', boxSizing: 'border-box' }
                : { flex: 1, minHeight: 0, overflow: 'hidden', padding: '16px 20px', gap: '20px', alignItems: 'stretch', boxSizing: 'border-box' }}
            >
              <div className="editing-build-left-stack">
              <div className="editing-build-deck-slot" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <InGameDeckCard
                      teamName={
                        editingCategory === 'expedition' ? `${editingExpeditionRound}라운드`
                        : editingCategory === 'totalwar' ? `${editingTotalwarTeam + 1}팀`
                        : ''
                      }
                      overviewTitle={buildTitle || ''}
                      formationId={editingBuild.formationId || 'protect'}
                      onFormationChange={(fid) => setEditingBuild(prev => prev ? { ...prev, formationId: fid } : prev)}
                      petObj={resolvePetById(editingPetId)}
                      onPetChange={p => setEditingPetId(p.id)}
                      heroList={editingHeroNames.map((name, idx) => {
                        const baseHero = resolveHeroByName(name);
                        return baseHero ? { hero: baseHero, gearConfig: heroGearConfigs[idx] } : name;
                      })}
                      onSlotClick={(slotIdx) => {
                        setTargetSlotIdx(slotIdx);
                        setSelectedHeroGearIdx(slotIdx);
                      }}
                      selectedSlotIdx={targetSlotIdx}
                      isSelected={true}
                      isEditMode={true}
                      contentMode={(CONTENT_META[editingCategory] || CONTENT_META.siege).mode}
                      reservedSkills={editingSkillTimeline.filter(Boolean)}
                      onReservationChange={(CONTENT_META[editingCategory] || CONTENT_META.siege).mode === 'pvp' ? setEditingSkillTimeline : undefined}
                      onHeroDrop={handleHeroDrop}
                      speedOrderNames={editingSpeedOrder}
                      speedIgnoredNames={editingSpeedIgnored}
                      onSpeedConfigChange={({ orderNames, ignoredNames }) => {
                        setEditingSpeedOrder(orderNames);
                        setEditingSpeedIgnored(ignoredNames);
                      }}
                      accentColor={editingCategory === 'expedition' ? expTheme.text : null}
                    />
              </div>

              <div className="glass-inset editing-build-detail-panel" style={{ padding: '8px 12px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 800 }}>
                  세팅 디테일{editingHeroNames[selectedHeroGearIdx] ? ` · ${editingHeroNames[selectedHeroGearIdx]}` : ''}
                </div>
                <textarea
                  className="editing-build-detail-textarea"
                  rows={3}
                  value={heroGearConfigs[selectedHeroGearIdx]?.detailNote || ''}
                  onChange={e => handleUpdateSelectedHeroGear('detailNote', e.target.value)}
                  placeholder={'예: 치확 67% · 약공 46%에 가깝게'}
                  style={{
                    width: '100%', padding: '8px 12px', background: '#07090e', border: '1px solid var(--border-gold)',
                    color: '#e2e8f0', borderRadius: '7px', fontSize: '14px', fontWeight: 700, lineHeight: 1.5,
                    boxSizing: 'border-box', resize: 'none', fontFamily: 'inherit'
                  }}
                />
              </div>
              </div>

              {/* 장비 세팅 — 결투장은 공용 허브와 동일: 영웅 배치 전 비활성 */}
              {editingCategory === 'arena' ? (
              <div className="glass-inset editing-build-gear-panel editing-build-right-panel" style={{
                    flex: 1, minWidth: 0, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px',
                    alignSelf: 'stretch', minHeight: 0, boxSizing: 'border-box'
                  }}>
                <HeroGearPanel
                  embedded
                  showDetail={false}
                  heroNames={editingHeroNames}
                  configs={heroGearConfigs}
                  selectedIdx={selectedHeroGearIdx}
                  onSelectIdx={(idx) => {
                    setSelectedHeroGearIdx(idx);
                    setTargetSlotIdx(idx);
                  }}
                  onChange={setHeroGearConfigs}
                />
              </div>
              ) : (
              <div className="glass-inset editing-build-gear-panel editing-build-right-panel" style={{
                    flex: 1, minWidth: 0, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px',
                    alignSelf: 'stretch', minHeight: 0, boxSizing: 'border-box'
                  }}>
                    <div style={{ flexShrink: 0, fontSize: '13px', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Icon name="swords" size={13} /> 장비 세팅
                    </div>

                    <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                      {editingHeroNames.filter(Boolean).map((hName, idx) => (
                        <button key={idx} onClick={() => {
                          setSelectedHeroGearIdx(idx);
                          setTargetSlotIdx(idx);
                        }}
                          style={{
                            flex: 1, minWidth: 0, padding: '8px 4px', fontSize: '12px', fontWeight: 900, borderRadius: '6px', border: 'none', cursor: 'pointer',
                            background: selectedHeroGearIdx === idx ? 'var(--gold-primary)' : 'rgba(255,255,255,0.08)',
                            color: selectedHeroGearIdx === idx ? '#000' : '#cbd5e1',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center'
                          }}>
                          {hName}
                        </button>
                      ))}
                    </div>

                    {/* 세트 3줄 → flex 3 */}
                    <div className="editing-build-gear-section editing-build-gear-section--sets" style={{ flex: 3, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginBottom: '6px', fontWeight: 800, flexShrink: 0 }}>1. 장비 세트 선택</div>
                      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', gap: '6px' }}>
                        {['선봉장', '추적자', '성기사', '수문장', '수호자', '암살자', '복수자', '주술사', '조율자'].map(setName => {
                          const isCur = (heroGearConfigs[selectedHeroGearIdx]?.setName || '복수자') === setName;
                          return (
                            <button key={setName} onClick={() => handleUpdateSelectedHeroGear('setName', setName)}
                              style={{
                                minHeight: 0, height: '100%', padding: '4px 8px', fontSize: '12px', fontWeight: 800, borderRadius: '8px',
                                border: isCur ? '1.5px solid var(--gold-primary)' : '1px solid rgba(255,255,255,0.1)',
                                cursor: 'pointer',
                                background: isCur ? 'rgba(236,232,224,0.22)' : 'rgba(255,255,255,0.04)',
                                color: isCur ? 'var(--gold-light)' : '#cbd5e1',
                                display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                transition: 'all 0.12s ease'
                              }}>
                              <span>{setName}</span>
                              <img src={EQUIPMENT_SET_ICONS[setName]} alt="" style={{ width: '22px', height: '22px', flexShrink: 0 }} />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 무기/방어구 2줄 → flex 2 */}
                    <div className="editing-build-gear-section editing-build-gear-section--weapons" style={{ flex: 2, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                          <div style={{ fontSize: '11px', color: '#fff', marginBottom: '4px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}><Icon name="swords" size={11} /> 무기 1</div>
                          <select value={heroGearConfigs[selectedHeroGearIdx]?.weapon1 || '치명타 확률'} onChange={e => handleUpdateSelectedHeroGear('weapon1', e.target.value)} style={{ width: '100%', flex: 1, minHeight: '36px', padding: '0 8px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '5px', fontSize: '12.5px', fontWeight: 800, boxSizing: 'border-box', colorScheme: 'dark' }}>
                            {weaponOptions.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                          <div style={{ fontSize: '11px', color: '#fff', marginBottom: '4px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}><Icon name="shield" size={11} /> 방어구 1</div>
                          <select value={heroGearConfigs[selectedHeroGearIdx]?.armor1 || '모든 공격력(%)'} onChange={e => handleUpdateSelectedHeroGear('armor1', e.target.value)} style={{ width: '100%', flex: 1, minHeight: '36px', padding: '0 8px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '5px', fontSize: '12.5px', fontWeight: 800, boxSizing: 'border-box', colorScheme: 'dark' }}>
                            {armorOptions.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                      </div>

                      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                          <div style={{ fontSize: '11px', color: '#fff', marginBottom: '4px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}><Icon name="swords" size={11} /> 무기 2</div>
                          <select value={heroGearConfigs[selectedHeroGearIdx]?.weapon2 || '치명타 확률'} onChange={e => handleUpdateSelectedHeroGear('weapon2', e.target.value)} style={{ width: '100%', flex: 1, minHeight: '36px', padding: '0 8px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '5px', fontSize: '12.5px', fontWeight: 800, boxSizing: 'border-box', colorScheme: 'dark' }}>
                            {weaponOptions.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                          <div style={{ fontSize: '11px', color: '#fff', marginBottom: '4px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}><Icon name="shield" size={11} /> 방어구 2</div>
                          <select value={heroGearConfigs[selectedHeroGearIdx]?.armor2 || '모든 공격력(%)'} onChange={e => handleUpdateSelectedHeroGear('armor2', e.target.value)} style={{ width: '100%', flex: 1, minHeight: '36px', padding: '0 8px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '5px', fontSize: '12.5px', fontWeight: 800, boxSizing: 'border-box', colorScheme: 'dark' }}>
                            {armorOptions.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* 장신구 2줄 → flex 2 */}
                    <div className="editing-build-gear-section editing-build-gear-section--accessories" style={{ flex: 2, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: '11px', color: '#c084fc', marginBottom: '6px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}><Icon name="ring" size={11} /> 장신구 선택</div>
                      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(2, 1fr)', gap: '6px' }}>
                        {accessories.map(acc => {
                          const isCur = (heroGearConfigs[selectedHeroGearIdx]?.accessory || '불사의 반지') === acc.name;
                          return (
                            <button key={acc.id} onClick={() => handleUpdateSelectedHeroGear('accessory', acc.name)}
                              title={acc.effect}
                              style={{
                                minHeight: 0, height: '100%', padding: '4px 8px', borderRadius: '8px', cursor: 'pointer',
                                border: isCur ? '1.5px solid #c084fc' : '1px solid rgba(255,255,255,0.1)',
                                background: isCur ? 'rgba(192,132,252,0.22)' : 'rgba(255,255,255,0.04)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.12s ease'
                              }}>
                              <span style={{ fontSize: '12px', fontWeight: 900, color: isCur ? '#e9d5ff' : '#cbd5e1', whiteSpace: 'nowrap' }}>{acc.shortLabel || acc.name}</span>
                              <img src={acc.iconUrl} alt="" style={{ width: '26px', height: '26px', objectFit: 'contain', flexShrink: 0 }} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
              </div>
              )}

              <div className="glass-inset editing-build-hero-picker" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', boxSizing: 'border-box', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flexShrink: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name="hero" size={14} /> 영웅 목록
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {[
                        { id: 'all',       label: '전체', icon: null },
                        { id: 'offensive', label: '공격형', icon: ROLE_ICONS.offensive },
                        { id: 'magic',     label: '마법형', icon: ROLE_ICONS.magic },
                        { id: 'defensive', label: '방어형', icon: ROLE_ICONS.defensive },
                        { id: 'support',   label: '지원형', icon: ROLE_ICONS.support },
                        { id: 'universal', label: '만능형', icon: ROLE_ICONS.universal },
                      ].map(r => (
                        <button key={r.id} onClick={() => setRoleFilter(r.id)}
                          style={{
                            padding: '8px 12px', fontSize: '13px', fontWeight: 800, borderRadius: '8px', border: 'none', cursor: 'pointer',
                            background: roleFilter === r.id ? 'var(--gold-primary)' : 'rgba(255,255,255,0.06)',
                            color: roleFilter === r.id ? '#000' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px'
                          }}>
                          {r.icon && <img src={r.icon} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />}
                          <span>{r.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    className={`editing-build-hero-grid${editingCategory === 'arena' ? ' arena-hero-grid' : ''}`}
                    style={editingCategory === 'arena'
                      ? { display: 'grid', gap: '6px', overflowY: 'auto', paddingRight: '4px' }
                      : { minHeight: '168px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(62px, 1fr))', gap: '6px', overflowY: 'auto', paddingRight: '4px' }}
                  >
                    {filteredHeroesByRole.map(h => {
                      const cleanName = h.name.replace('(각성)', '');
                      return (
                        <div
                          key={h.id}
                          draggable
                          onPointerDown={e => {
                            markDeckPointerDown(e);
                            startDeckPointerDrag(e, { source: 'picker', name: cleanName }, { label: cleanName });
                          }}
                          onDragStart={e => {
                            if (!allowHtml5DeckDrag(e)) {
                              e.preventDefault();
                              return;
                            }
                            markDeckHtml5DragStarted();
                            setDeckDragData(e, { source: 'picker', name: cleanName });
                          }}
                          onClick={() => {
                            if (shouldSuppressDeckClick()) return;
                            handleSelectHeroFromBottom(h);
                          }}
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', touchAction: 'manipulation' }}
                        >
                          <div style={{ width: '58px', outline: (editingHeroNames[targetSlotIdx] || '') === cleanName ? '2px solid var(--accent-cyan)' : 'none', outlineOffset: 1, borderRadius: 8 }}>
                            <HeroPortraitCard hero={h} showStars showRole showName={false} />
                          </div>
                          <div style={{ width: '58px', marginTop: '2px', background: '#000', borderRadius: '3px', padding: '1px 0', textAlign: 'center', fontSize: '8px', color: '#fff', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {cleanName}
                          </div>
                        </div>
                      );
                    })}
                  </div>
              </div>

              {/* ─── PvE 우측: 스킬 시전 순서 (PvP는 덱 카드 위 스킬 예약) ─── */}
              {(CONTENT_META[editingCategory] || CONTENT_META.siege).mode !== 'pvp' && (
                <div className="editing-build-timeline-col" style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
                  {/* 등록 목록 — 제목을 같은 줄에 넣어 세로 공간 절약 */}
                  <div className="glass-inset editing-build-timeline-list" style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div className="editing-build-timeline-list-head" style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
                      marginBottom: '4px', flexShrink: 0, flexWrap: 'wrap'
                    }}>
                      <div style={{
                        fontSize: '13px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '6px',
                        color: editingCategory === 'expedition' ? expTheme.text : '#fff', minWidth: 0
                      }}>
                        <Icon name="clock" size={13} color={editingCategory === 'expedition' ? expTheme.text : undefined} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {editingCategory === 'expedition' ? `${editingExpeditionRound}라운드 스킬 시전 순서` : '스킬 시전 순서'}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        등록 {editingSkillTimeline.length}개 · 휠 스크롤
                      </div>
                    </div>

                    <div className="skill-timeline-scroller" ref={skillTimelineScrollerRef}>
                      {editingSkillTimeline.length === 0 && (
                        <div style={{ fontSize: '11px', color: '#fff', fontWeight: 700, textAlign: 'center', padding: '16px 0' }}>아직 등록된 스킬 순서가 없습니다. 아래에서 추가해 주세요.</div>
                      )}

                      {editingSkillTimeline.map((step, idx) => (
                        <div key={idx} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '5px',
                          borderLeft: `3px solid ${editingCategory === 'expedition' ? expTheme.text : 'var(--gold-primary)'}`, flexShrink: 0
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                            <RoundMark round={step.round} />
                            <strong style={{ color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{step.heroName}</span>
                              <SkillDirBadge dir={step.dir} />
                            </strong>
                            {step.text && <span style={{ color: '#fff', fontSize: '11px', fontWeight: 700 }}>- {step.text}</span>}
                          </div>
                          <button onClick={() => handleRemoveSkillStep(idx)}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-red)', fontWeight: 900, cursor: 'pointer', fontSize: '13px', display: 'flex' }}><Icon name="close" size={12} /></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 스킬 추가 입력 폼 */}
                  <div className="glass-inset editing-build-timeline-add" style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>+ 스킬 시전 순서 추가</div>

                    {/* 턴 선택 버튼 — 4턴 간격 · 6×3 (이 그리드만 변경) */}
                    <div>
                      <div style={{ fontSize: '10px', color: '#fff', marginBottom: '3px', fontWeight: 800 }}>
                        턴 선택 (0·4·8…68)
                        {lastReservedRound > 0 ? ` · ${lastReservedRound}턴 이전 잠금` : ''}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px' }}>
                        {SKILL_TURN_PICKS.map((n) => {
                          const r = `${n}턴`;
                          const picked = parseRoundNumber(turnNumberInput);
                          const isLocked = lastReservedRound > 0 && n < lastReservedRound;
                          const isSelected = turnNumberInput === r || picked === n;
                          return (
                            <button
                              key={r}
                              type="button"
                              disabled={isLocked}
                              onClick={() => setTurnNumberInput(r)}
                              title={isLocked ? `${lastReservedRound}턴 이전은 선택할 수 없습니다` : undefined}
                              style={{
                                padding: '8px 0', fontSize: '13px', fontWeight: 800, borderRadius: '6px',
                                border: isSelected ? '1px solid var(--gold-light)' : '1px solid rgba(255,255,255,0.08)',
                                cursor: isLocked ? 'not-allowed' : 'pointer',
                                background: isLocked
                                  ? 'rgba(255,255,255,0.03)'
                                  : isSelected ? 'var(--gold-primary)' : 'rgba(255,255,255,0.04)',
                                color: isLocked ? '#64748b' : (isSelected ? '#000' : '#fff'),
                                opacity: isLocked ? 0.4 : 1,
                                textAlign: 'center', transition: 'all 0.15s ease'
                              }}>{n}</button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 스킬 선택 */}
                    <div>
                      <div style={{ fontSize: '12px', color: '#fff', marginBottom: '4px', fontWeight: 800 }}>스킬</div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <select value={newSkillHero} onChange={e => setNewSkillHero(e.target.value)} style={{ flex: 1, width: '100%', padding: '10px 10px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '7px', fontSize: '14px', fontWeight: 800, colorScheme: 'dark' }}>
                          {editingHeroNames.filter(Boolean).map((hN, i) => (
                            <option key={i} value={hN}>{hN}</option>
                          ))}
                        </select>
                        <select value={newSkillDir} onChange={e => setNewSkillDir(e.target.value)} style={{ flex: 1, width: '100%', padding: '10px 10px', background: '#07090e', border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '7px', fontSize: '14px', fontWeight: 800, colorScheme: 'dark' }}>
                          <option value="upper">위 스킬</option>
                          <option value="down">아래 스킬</option>
                          <option value="awaken">각성</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '13px', color: '#fff', marginBottom: '5px', fontWeight: 800 }}>메모 (선택)</div>
                      <textarea
                        className="editing-build-timeline-memo"
                        placeholder="예: 여기서 도트가 걸려있어야함"
                        value={newSkillText}
                        onChange={e => setNewSkillText(e.target.value)}
                        rows={2}
                        style={{
                          width: '100%', padding: '8px 12px', background: '#07090e', border: '1.5px solid var(--border-gold)',
                          color: '#fff', borderRadius: '8px', fontSize: '14px', fontWeight: 700, lineHeight: 1.4,
                          boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', minHeight: '52px'
                        }}
                      />
                    </div>

                    <button onClick={handleAddSkillStep} className="btn-ops" style={{
                      padding: '8px', width: '100%', justifyContent: 'center', borderRadius: '10px', fontSize: '12px'
                    }}>
                      + 타임라인 단계 추가
                    </button>
                  </div>

                </div>
              )}

            </div>
            </div>

            {/* 3. 하단 푸터 저장 버튼 */}
            <div style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.04)', borderTop: '1px solid rgba(255,255,255,0.10)', flexShrink: 0 }}>
              <button onClick={handleSaveEditedBuild} className="btn-ops" style={{ width: '100%', padding: '11px', justifyContent: 'center', borderRadius: '12px', fontSize: '14px' }}>
                <Icon name="save" size={15} /> 공략 저장 및 게시판 고정
              </button>
            </div>

          </div>
        </ModalScrim>
      )}

      {assignModalBoss && (
        <ExpeditionAssignModal
          bossId={assignModalBoss}
          bossLabel={EXPEDITION_BOSS_THEMES[assignModalBoss]?.label || ''}
          accentColor={EXPEDITION_BOSS_THEMES[assignModalBoss]?.text || '#fff'}
          members={activeLounge?.members || []}
          assigned={expeditionAssignments[assignModalBoss] || []}
          allAssignments={expeditionAssignments}
          canEdit={canEditBuilds}
          onSave={(list) => {
            setExpeditionAssignments(prev => ({ ...prev, [assignModalBoss]: list }));
            setAssignModalBoss(null);
          }}
          onClose={() => setAssignModalBoss(null)}
        />
      )}

      {profileUid && (
        <PublicProfileModal uid={profileUid} onClose={() => setProfileUid(null)} />
      )}

    </div>
  );
}

function ExpeditionAssignModal({ bossId, bossLabel, accentColor, members, assigned, allAssignments, canEdit, onSave, onClose }) {
  const [selected, setSelected] = useState(() => assigned.map(a => a.uid));

  const otherAssigned = useMemo(() => {
    const set = new Set();
    for (const [boss, list] of Object.entries(allAssignments)) {
      if (boss === bossId) continue;
      for (const m of list) set.add(m.uid);
    }
    return set;
  }, [allAssignments, bossId]);

  const toggle = (uid) => {
    if (!canEdit) return;
    setSelected(prev => {
      if (prev.includes(uid)) return prev.filter(id => id !== uid);
      if (prev.length >= 10) return prev;
      return [...prev, uid];
    });
  };

  const handleSave = () => {
    const list = selected.map(uid => {
      const m = members.find(mm => mm.id === uid);
      return { uid, nickname: m?.nickname || uid };
    });
    onSave(list);
  };

  const sorted = [...members].sort((a, b) => {
    const roleOrder = { master: 0, admin: 1, member: 2 };
    return (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3);
  });

  return (
    <ModalScrim style={{ padding: '16px' }} {...backdropDismissProps(onClose)}>
      <div className="glass-modal" onClick={e => e.stopPropagation()} style={{
        width: 'min(480px, 96vw)', maxHeight: '85vh', overflowY: 'auto',
        padding: '22px', borderRadius: '24px',
        display: 'flex', flexDirection: 'column', gap: '14px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#fff' }}>
            <span style={{ color: accentColor }}>파괴의 그림자 · {bossLabel}</span> 길드원 배치
          </h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <Icon name="closeBtn" size={18} />
          </button>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center' }}>
          {selected.length}/10명 선택됨
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '50vh', overflowY: 'auto' }}>
          {sorted.map(m => {
            const isSelected = selected.includes(m.id);
            const isOther = otherAssigned.has(m.id);
            return (
              <button key={m.id} type="button"
                onClick={() => toggle(m.id)}
                disabled={!canEdit}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                  borderRadius: 12, cursor: canEdit ? 'pointer' : 'default',
                  background: isSelected ? `rgba(255,255,255,0.12)` : 'rgba(255,255,255,0.03)',
                  border: isSelected ? `1.5px solid ${accentColor}` : '1px solid rgba(255,255,255,0.10)',
                  color: '#fff', fontSize: 13, fontWeight: 800, textAlign: 'left',
                }}>
                <span style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  border: isSelected ? `2px solid ${accentColor}` : '2px solid rgba(255,255,255,0.2)',
                  background: isSelected ? accentColor : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isSelected && <Icon name="check" size={12} color="#000" />}
                </span>
                <span style={{ flex: 1 }}>{m.nickname}</span>
                <span style={{
                  fontSize: 10, fontWeight: 900, padding: '2px 7px', borderRadius: 999,
                  background: m.role === 'master' ? 'var(--gold-primary)' : m.role === 'admin' ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.06)',
                  color: m.role === 'master' ? '#000' : m.role === 'admin' ? '#7dd3fc' : 'var(--text-muted)',
                }}>{m.role === 'master' ? '마스터' : m.role === 'admin' ? '관리자' : '길드원'}</span>
                {isOther && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>다른 보스 배치됨</span>
                )}
              </button>
            );
          })}
        </div>

        {canEdit && (
          <button type="button" className="btn-ops" onClick={handleSave}
            style={{ width: '100%', padding: '12px 0', fontSize: 14, fontWeight: 900, justifyContent: 'center' }}>
            배치 저장
          </button>
        )}
      </div>
    </ModalScrim>
  );
}
