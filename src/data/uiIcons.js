/**
 * 게임 원본 UI 아이콘 (public/images/ui) — Icon.jsx IMAGE_ICONS
 * asset 동기화: python scripts/sync_ui_icons_from_asset.py
 */

/** PNG 글리프만 확대 (레이어·모달 칸 크기는 size prop 기준 유지) */
export const UI_GAME_ICON_DISPLAY_SCALE = 1.15;
export const UI_IMAGE_ICONS = {
  closeBtn: { src: '/images/ui/close.png', w: 52, h: 52 },
  hero: { src: '/images/ui/hero.png', w: 54, h: 74 },
  pet: { src: '/images/ui/pet.png', w: 54, h: 65 },
  plus: { src: '/images/ui/plus.png', w: 35, h: 35 },
  speed: { src: '/images/ui/speed-attack.png', w: 44, h: 31 },
  copy: { src: '/images/ui/setting-share.png', w: 50, h: 50, activeInvert: false },
  edit: { src: '/images/ui/btn-edit.png', w: 34, h: 30, activeInvert: false, displayScale: 0.8 },
  close: { src: '/images/ui/btn-delete.png', w: 60, h: 60, activeInvert: false, displayScale: 1.2 },
  altDeck: { src: '/images/ui/alt-deck.png', w: 50, h: 50, activeInvert: false },
  share: { src: '/images/ui/share.png', w: 44, h: 44 },
  settings: { src: '/images/ui/settings.png', w: 44, h: 42 },
  download: { src: '/images/ui/download.png', w: 44, h: 44 },
  minus: { src: '/images/ui/minus.png', w: 44, h: 44 },
  clock: { src: '/images/ui/time.png', w: 42, h: 51 },
  awaken: { src: '/images/ui/awaken.png', w: 103, h: 86 },

  /* GNB · 허브 탭 · 도감 등 — game PNG (활성 pill 시 CSS filter) */
  main: { src: '/images/ui/main.png', w: 60, h: 60 },
  hub: { src: '/images/ui/hub.png', w: 50, h: 50 },
  hubMembers: { src: '/images/ui/hub-members.png', w: 50, h: 50 },
  hubNotice: { src: '/images/ui/hub-notice.png', w: 47, h: 44, activeInvert: false },
  hubWrite: { src: '/images/ui/hub-write.png', w: 34, h: 34 },
  hubMaster: { src: '/images/ui/hub-master.png', w: 30, h: 25, activeInvert: false },
  hubAdmin: { src: '/images/ui/hub-admin.png', w: 30, h: 25, activeInvert: false },
  encyclopedia: { src: '/images/ui/encyclopedia.png', w: 60, h: 60 },
  toolsMenu: { src: '/images/ui/tools.png', w: 60, h: 60 },
  winCalc: { src: '/images/ui/win-calc.png', w: 60, h: 60 },

  arena: { src: '/images/ui/arena.png', w: 55, h: 55 },
  arenaAdvanced: { src: '/images/ui/arena-advanced.png', w: 68, h: 64 },
  news: { src: '/images/ui/hub-notice.png', w: 47, h: 44, activeInvert: false },
  siege: { src: '/images/ui/siege.png', w: 60, h: 60 },
  pve: { src: '/images/ui/pve.png', w: 60, h: 60 },
  pvp: { src: '/images/ui/pvp.png', w: 55, h: 55 },
  metaDeck: { src: '/images/ui/meta-deck.png', w: 60, h: 60 },
  pvpPickRate: { src: '/images/ui/pvp-pick-rate.png', w: 49, h: 49 },
  guildwar: { src: '/images/ui/pvp.png', w: 55, h: 55 },
  totalwar: { src: '/images/ui/totalwar.png', w: 60, h: 60 },
  expedition: { src: '/images/ui/expedition.png', w: 60, h: 60 },
  volcano: { src: '/images/ui/expedition.png', w: 60, h: 60 },
  boss: { src: '/images/ui/boss.png', w: 54, h: 51 },
  gearSetting: { src: '/images/ui/gear-setting.png', w: 50, h: 50 },
  settingConfirm: { src: '/images/ui/setting-confirm.png', w: 60, h: 60 },
  exclusiveGear: { src: '/images/ui/exclusive-gear-tool.png', w: 60, h: 60 },
  system: { src: '/images/ui/system.png', w: 60, h: 60 },
  hubExit: { src: '/images/ui/hub-exit.png', w: 50, h: 45 },
  deckAlly: { src: '/images/ui/deck-ally.png', w: 40, h: 40, activeInvert: false },
  deckEnemy: { src: '/images/ui/deck-enemy.png', w: 40, h: 40, activeInvert: false },
  chart: { src: '/images/ui/rank.png', w: 60, h: 50 },
  rank: { src: '/images/ui/rank.png', w: 60, h: 50 },
  medal: { src: '/images/ui/rank.png', w: 60, h: 50 },

  formationBasic: { src: '/images/ui/formation-basic.png', w: 90, h: 66 },
  formationBalance: { src: '/images/ui/formation-balance.png', w: 90, h: 66 },
  formationAttack: { src: '/images/ui/formation-attack.png', w: 90, h: 66 },
  formationProtect: { src: '/images/ui/formation-protect.png', w: 90, h: 66 },

  skillReserve0: { src: '/images/ui/skill-reserve-0.png', w: 62, h: 67 },
  skillReserve1: { src: '/images/ui/skill-reserve-1.png', w: 62, h: 67 },
  skillReserve2: { src: '/images/ui/skill-reserve-2.png', w: 62, h: 67 },
  skillReserve3: { src: '/images/ui/skill-reserve-3.png', w: 62, h: 67 },

  skillFormationLayer: { src: '/images/ui/skill-formation-layer.png', w: 62, h: 63 },

  leagueMajor: { src: '/images/ui/league-major.png', w: 400, h: 360, activeInvert: false },
  leagueMinor: { src: '/images/ui/league-minor.png', w: 400, h: 360, activeInvert: false },
  newBadge: { src: '/images/ui/new-badge.png', w: 32, h: 32 },

  pickRate1: { src: '/images/ui/pick-rate-1.png', w: 80, h: 80 },
  pickRate2: { src: '/images/ui/pick-rate-2.png', w: 80, h: 80 },
  pickRate3: { src: '/images/ui/pick-rate-3.png', w: 80, h: 80 },

  transcend2: { src: '/images/ui/transcend-2.png', w: 128, h: 128 },
  transcend6: { src: '/images/ui/transcend-6.png', w: 128, h: 128 },
};

const FORMATION_ICON_BY_ID = {
  basic: 'formationBasic',
  balance: 'formationBalance',
  attack: 'formationAttack',
  protect: 'formationProtect',
  '2f1b': 'formationProtect',
  '1f2b': 'formationBasic',
};

export function formationIconName(formationId) {
  return FORMATION_ICON_BY_ID[formationId] || FORMATION_ICON_BY_ID.protect;
}

export function hubRoleIconName(role) {
  if (role === 'master') return 'hubMaster';
  if (role === 'admin') return 'hubAdmin';
  return null;
}

/** 덱 카드·진형 모달 진형 PNG 표시 높이(px) — Icon size prop */
export const FORMATION_ICON_SIZE = 44;
export const FORMATION_ICON_SIZE_COMPACT = 36;
export const FORMATION_ICON_SIZE_MODAL = 44;
