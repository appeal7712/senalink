import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import HeroPortraitCard from '../../components/HeroPortraitCard';
import HeroGridPicker from '../../components/HeroGridPicker';
import Icon from '../../components/icons/Icon';
import SafeImg from '../../components/icons/SafeImg';
import { accessories } from '../../data/equipments';
import { formationsData } from '../../data/formations';
import InGameDeckCard from '../../components/InGameDeckCard';
import { UI_IMAGE_ICONS, formationIconName } from '../../data/uiIcons';
import { pets } from '../../data/pets';
import { ROLE_ICONS, ROLE_LABELS } from '../../data/roleIcons';
import { skillIconUrl } from '../../lib/skillIcon';
import { effectIconUrl } from '../../lib/effectIcons';
import { LEGEND_RINGS, ROLE_TILES, effectLabel, entryValue, fmtFxValue, fmtValue, listLabel, targetLabel } from '../../lib/teamBuilderAnalysis';
import { fxBoxCount, groupEffectCards, groupSkillCards } from './fxGroups';

const plainName = (n) => String(n || '').replace('(각성)', '').trim();

/* ───────────── 공통 ───────────── */

/** 버프 · 디버프 · 특수 효과 아이콘 (lib/effectIcons — 없으면 안 그림) */
export function FxIcon({ name, size = 20, className = '' }) {
  const src = effectIconUrl(name);
  if (!src) return null;
  return <img className={`tb-fx-icon${className ? ` ${className}` : ''}`} src={src} alt="" width={size} height={size} loading="lazy" decoding="async" />;
}

/** 대상이 유형으로 정해진 효과(「아군 방어형 · 만능형」)의 역할 아이콘 — 비어 있으면 안 그림 */
function RoleMarks({ roles }) {
  if (!roles?.length) return null;
  const label = `${roles.map((r) => ROLE_LABELS[r] || r).join(' · ')}만`;
  return (
    <span className="tb-role-marks" title={label} aria-label={label}>
      {roles.map((r) => (ROLE_ICONS[r] ? <img key={r} src={ROLE_ICONS[r]} alt="" draggable={false} /> : null))}
    </span>
  );
}

const PET_BY_NAME = new Map(pets.map((p) => [p.name, p]));
const FORMATION_BY_NAME = new Map(formationsData.map((f) => [f.name, f]));
/** 효과를 주는 쪽이 영웅이 아니면 — 「크리(펫)」 = 펫 · 「공격 진형」 = 진형 */
const petOfGiver = (name) => PET_BY_NAME.get(String(name || '').replace(/\(펫\)$/, '')) || null;
const formationOfGiver = (name) => FORMATION_BY_NAME.get(name) || null;
const formationIconSrc = (f) => UI_IMAGE_ICONS[formationIconName(f.id)]?.src || '';

/** 영웅 얼굴 · 펫 초상화 · 진형 아이콘 중 하나 (효과 주는 쪽) */
export function GiverFace({ name, resolveHero, size = 22 }) {
  const hero = resolveHero(name);
  if (hero) return <MiniHero hero={hero} size={size} />;
  const pet = petOfGiver(name);
  if (pet?.portraitUrl) return <img className="tb-giver-face is-pet" src={pet.portraitUrl} alt="" width={size} height={size} loading="lazy" />;
  const f = formationOfGiver(name);
  if (f) return <img className="tb-giver-face is-formation" src={formationIconSrc(f)} alt="" width={size} height={size} loading="lazy" />;
  return null;
}

export function MiniHero({ hero, size = 30 }) {
  if (!hero) return null;
  return (
    <span className="tb-mini-hero" style={{ width: size }}>
      <HeroPortraitCard hero={hero} showStars={false} showRole={false} />
    </span>
  );
}

/* ───────────── 모드 선택 ───────────── */

export function ModePicker({ onPick }) {
  const modes = [
    { id: 'arena', icon: 'tbArena', iconSize: 70, title: '결투장', vs: '5 vs 5', desc: '5인 덱 버프 · 디버프 · 세팅 체크' },
    { id: 'guildwar', icon: 'tbGuildwar', iconSize: 76, title: '길드전', vs: '3 vs 3', desc: '3인 덱 · 상대가 노리는 대상까지' },
    { id: 'pve', icon: 'tbPve', iconSize: 76, title: 'PvE', vs: '5인 · 아군만', desc: '보스 · 아군 버프 · 보스 디버프' },
    { id: 'effects', icon: 'tbEffects', iconSize: 76, title: '효과 사전', vs: '영웅 찾기', desc: '효과로 영웅 찾기 · 비교' },
  ];
  return (
    <div className="tb-mode-grid">
      {modes.map((m, i) => (
        <button key={m.id} type="button" className={`tb-mode-card luxury-panel is-${m.id}`} style={{ '--i': i }} onClick={() => onPick(m.id)} aria-label={`${m.title} ${m.vs} — ${m.desc}`}>
          <span className="tb-mode-art" aria-hidden="true">
            <span className="tb-mode-art-in"><Icon name={m.icon} size={m.iconSize} /></span>
          </span>
          <span className="tb-mode-label" aria-hidden="true">{m.title}</span>
          <span className="tb-mode-text" aria-hidden="true">
            <span className="tb-mode-title">{m.title}</span>
            <span className="tb-mode-vs">{m.vs}</span>
            <span className="tb-mode-desc">{m.desc}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/* ───────────── 상단 덱 바 ───────────── */

/**
 * 덱 한쪽 = 사이트 공용 덱 배치 카드(`InGameDeckCard` — 길드 허브 공략과 같은 [후방 | 전방 | 펫 · 진형], 결투장 준비 화면과 같은 배치).
 * 칸을 누르면 아래 영웅 선택 창(빼기도 거기서), 펫 · 진형 아이콘을 누르면 공용 고르기 창. 5칸 진형, 길드전은 5칸 중 `size`(3)명.
 * 카드 아래 한 줄 = 진형 버프(B · 빨강 별 × 후방 인원 · 모공 / F · 파랑 별 × 전방 인원 · 방어) + 펫.
 */
function DeckSide({ side, size, names, formationId, onFormation, pet, onPet, active, onSelect, onClear, onDrop }) {
  const filled = names.filter(Boolean).length;
  const isMine = side === 'mine';
  const f = formationsData.find((x) => x.id === formationId) || formationsData[0];
  const stars = (n, src) => Array.from({ length: n }, (_, i) => <img key={i} src={src} alt="" />);
  return (
    <div className={`tb-deck-side is-${side}`}>
      <div className="tb-deck-card-wrap">
        <span className="tb-deck-aura" aria-hidden="true" />
        <InGameDeckCard
          teamName={isMine ? '내 덱' : '상대 덱'}
          headerSlot={(
            <span className="tb-deck-meta">
              <span className="tb-deck-count">{filled}/{size}</span>
              {filled ? (
                <button type="button" className="tb-deck-clear" onClick={onClear} aria-label={`${isMine ? '내 덱' : '상대 덱'} 비우기`}>
                  <Icon name="close" size={10} /> 비우기
                </button>
              ) : null}
            </span>
          )}
          formationId={f.id}
          heroList={names}
          petObj={pet}
          allowNoPet
          onFormationChange={(fid) => onFormation(side, fid)}
          onPetChange={(p) => onPet(side, p)}
          onSlotClick={(idx) => onSelect(side, idx)}
          onHeroDrop={onDrop ? (payload, toIdx) => onDrop(side, payload, toIdx) : null}
          dragScope={`tb-${side}`}
          selectedSlotIdx={active?.side === side ? active.idx : -1}
          contentMode="pvp"
          hideReservationBtn
          maxHeroes={size}
          isSelected
          accentColor={isMine ? 'rgba(147, 197, 253, 0.6)' : 'rgba(252, 165, 165, 0.6)'}
        />
      </div>
      <div className="tb-deck-buffs" title={f.description}>
        <span className="tb-deck-buff is-back">
          <img className="tb-deck-buff-row" src={UI_IMAGE_ICONS.tbRowBack.src} alt="후방" />
          <span className="tb-deck-buff-stars" aria-hidden="true">{stars(f.backCount, UI_IMAGE_ICONS.tbStarBack.src)}</span>
          모공 {f.backBuff.replace('모든 공격력 ', '')}
        </span>
        <span className="tb-deck-buff is-front">
          <img className="tb-deck-buff-row" src={UI_IMAGE_ICONS.tbRowFront.src} alt="전방" />
          <span className="tb-deck-buff-stars" aria-hidden="true">{stars(5 - f.backCount, UI_IMAGE_ICONS.tbStarFront.src)}</span>
          방어 {f.frontBuff.replace('방어력 ', '')}
        </span>
      </div>
    </div>
  );
}

/** 두 덱 사이 VS — 금색 VS(크게) + 긴 「/」 · 짧은 「\」 빛줄기(흰 심 + 금빛 번짐) · 가운데 섬광 · 반짝이(결투장 준비 화면처럼) */
function DeckVs() {
  return (
    <div className="tb-vs-stage" aria-hidden="true">
      <span className="tb-vs-ray is-long"><i /><b className="is-r" /><b className="is-l" /></span>
      <span className="tb-vs-ray is-short"><i /><b className="is-r" /><b className="is-l" /></span>
      <img className="tb-vs-img" src={UI_IMAGE_ICONS.tbVsGold.src} alt="" />
      <span className="tb-vs-shine" />
      <span className="tb-vs-flare" />
      <span className="tb-vs-spark is-a" />
      <span className="tb-vs-spark is-b" />
      <span className="tb-vs-spark is-c" />
    </div>
  );
}

export function DeckBar({ size, deck, enemyOn, allowEnemy = true, active, onSelect, onClear, onDrop, onToggleEnemy, formation, onFormation, pet, onPet }) {
  const side = (s) => (
    <DeckSide side={s} size={size} names={deck[s]} formationId={formation?.[s]} onFormation={onFormation} pet={pet?.[s] || null} onPet={onPet} active={active} onSelect={onSelect} onClear={() => onClear(s)} onDrop={onDrop} />
  );
  const barRef = useRef(null);
  /* 두 덱은 어떤 폭에서도 나란히(인게임 결투 화면처럼) — 자리가 모자라면 카드 전체를 같은 비율로 줄임(--tb-pair-zoom) */
  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar || !allowEnemy) return undefined;
    const fit = () => {
      const first = bar.querySelector(':scope > .tb-deck-side');
      const card = first?.querySelector('.tb-deck-card-wrap');
      if (!card) return;
      /* 줄인 상태의 크기 값은 브라우저마다 달라서 — 원래 크기(1)로 잰 뒤 비율을 넣음 */
      bar.style.setProperty('--tb-pair-zoom', '1');
      /* 상대 덱 없을 때 빈 카드(「상대 덱 추가」) = 내 덱 카드와 같은 크기 */
      bar.style.setProperty('--tb-ghost-w', `${card.offsetWidth}px`);
      bar.style.setProperty('--tb-ghost-h', `${card.offsetHeight}px`);
      const W = bar.clientWidth;
      /* 두 덱 사이 최소 간격 — 폰은 0 → 64px, 그보다 넓으면 150 → 350px로 폭 따라 서서히. 폰에서 30px보다 좁으면 VS는 카드 위로 */
      const phone = window.matchMedia('(max-width: 760px)').matches;
      const midMin = Math.round(phone
        ? Math.max(0, Math.min(64, (W - 290) * 0.6))
        : Math.max(150, Math.min(350, (W - 500) * 0.6)));
      const top = phone && midMin < 30;
      bar.style.setProperty('--tb-vs-gap', `${midMin}px`);
      bar.dataset.vs = top ? 'top' : 'mid';
      const cs = getComputedStyle(first);
      const natural = card.getBoundingClientRect().width + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      if (!(natural > 0)) return;
      const zoom = Math.max(0.4, Math.min(1, (W - midMin) / 2 / natural));
      bar.style.setProperty('--tb-pair-zoom', zoom.toFixed(3));
      /* VS 크기 = 두 덱 사이 실제 빈 폭에 맞춤(그림 원래 폭 148px 기준 배율, 36 – 150px) */
      const mid = W - natural * zoom * 2;
      const vsW = top ? 46 : Math.max(36, Math.min(150, mid * 0.55 + 22));
      bar.style.setProperty('--tb-vs-k', (vsW / 148).toFixed(3));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(bar);
    return () => {
      ro.disconnect();
      bar.style.removeProperty('--tb-pair-zoom');
      bar.style.removeProperty('--tb-vs-gap');
      bar.style.removeProperty('--tb-vs-k');
      bar.style.removeProperty('--tb-ghost-w');
      bar.style.removeProperty('--tb-ghost-h');
      delete bar.dataset.vs;
    };
  }, [enemyOn, allowEnemy, size]);
  if (!allowEnemy) {
    return <div className="tb-deck-bar is-solo">{side('mine')}</div>;
  }
  /* 상대 덱이 없어도 자리는 같게 — 내 덱 왼쪽 끝 · 오른쪽 끝 상대 덱 자리에 같은 크기 빈 카드, 누르면 그 자리에 상대 덱(밍봉 2026-11-11) */
  return (
    <div ref={barRef} className={`tb-deck-bar has-enemy${enemyOn ? '' : ' is-waiting'}`}>
      {side('mine')}
      {enemyOn ? (
        <>
          <DeckVs />
          {side('enemy')}
        </>
      ) : (
        <div className="tb-deck-side is-enemy is-ghost">
          <button type="button" className="tb-enemy-add" onClick={onToggleEnemy}>
            <Icon name="deckEnemy" size={20} />
            <strong>상대 덱 추가</strong>
            <span>상대가 우리 누구를 노리는지, 무엇을 조심할지 알려줘요</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ───────────── 영웅 선택 드롭다운 (필요한 효과로 찾기 · 이 영웅 효과) ───────────── */

const FINDER_GROUPS = [
  { id: 'ally', label: '팀 버프', sub: '상시 · 시작 턴' },
  { id: 'enemy', label: '적 디버프', sub: '상시 · 시작 턴' },
  { id: 'role', label: '역할', sub: '스킬 전체' },
];
const ROLE_HINT = new Map(ROLE_TILES.map((t) => [`role|${t.id}`, t.hint]));

/** 스킬별로 묶고, 같은 효과 · 턴 · 대상 · 수치 줄은 하나로 합쳐 조건만 이어 붙인다 */
function groupHeroEffects(entries, includeEnhance) {
  const map = new Map();
  for (const e of entries) {
    if (e.kind !== 'effect') continue;
    if (!map.has(e.skillLabel)) map.set(e.skillLabel, new Map());
    const rows = map.get(e.skillLabel);
    const k = [e.name, e.duration?.label || '', e.target, entryValue(e, includeEnhance) ?? ''].join('|');
    if (!rows.has(k)) rows.set(k, { ...e, conds: [], plain: false, sources: new Set() });
    const row = rows.get(k);
    row.sources.add(e.source);
    if (e.condition) {
      if (!row.conds.includes(e.condition)) row.conds.push(e.condition);
    } else row.plain = true;
  }
  return [...map.entries()].map(([label, rows]) => [label, [...rows.values()].map((r) => ({
    ...r,
    source: r.sources.has('base') ? 'base' : [...r.sources][0],
    condition: [r.plain && r.conds.length ? (r.skillType === 'passive' ? '전투 시작' : '스킬 사용 시') : '', ...r.conds].filter(Boolean).join(' · ') || null,
  }))]);
}

function HeroEffects({ hero, groups, includeEnhance }) {
  if (!groups.length) return <div className="tb-empty">정리할 효과가 없어요.</div>;
  const skillOf = (name) => (hero?.skills || []).find((s) => s.name === name);
  return (
    <div className="tb-hero-fx">
      {groups.map(([label, list]) => (
        <div key={label} className="tb-hero-fx-col">
          <h6>
            {skillOf(list[0]?.skillName)?.iconUrl ? (
              <img className="tb-hero-fx-icon" src={skillOf(list[0].skillName).iconUrl} alt="" loading="lazy" />
            ) : null}
            <span className="tb-hero-fx-head">
              <b>{label}</b>
              <small>{list[0]?.skillName}</small>
            </span>
            <i className="tb-hero-fx-count">{list.length}</i>
          </h6>
          <ul>
            {list.map((e) => {
              const v = entryValue(e, includeEnhance);
              return (
                <li key={e.id} className={`is-${e.side}`}>
                  <span className="tb-hero-fx-mark" aria-hidden="true">{{ up: '▲', down: '▼' }[effectLabel(e.name).dir] || '◆'}</span>
                  <span className="tb-hero-fx-main">
                    <span className="tb-hero-fx-name">{e.name}</span>
                    {e.duration ? <span className={`tb-badge ${e.duration.type === 'permanent' ? 'is-perm' : 'is-turn'}`}>{e.duration.label}</span> : null}
                    {v != null ? <span className="tb-badge is-val">{v}%</span> : null}
                    {e.source !== 'base' ? <span className="tb-badge is-src">{e.source}</span> : null}
                    {e.tower ? <span className="tb-badge is-tower">탑 전용</span> : null}
                  </span>
                  <em className="tb-hero-fx-to" title={targetLabel(e.target)}>{targetLabel(e.target)}</em>
                  {e.condition ? <small>{e.condition}</small> : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/**
 * 덱 영웅 한 명의 스킬별 효과 요약 — 덱 칸과 분석 사이 칸.
 * 상대 덱이 있으면 버튼을 내 덱 | 상대 덱 반반으로 나누고, 고른 영웅을 한 번 더 누르면 접힌다(영웅 선택 창과 같은 동작).
 */
export function HeroFxPanel({ deck, size = 5, enemyOn, resolveHero, heroEntriesFor, focus, open, onFocus, onToggle, includeEnhance = true }) {
  const mine = deck.mine.filter(Boolean).map((name) => ({ side: 'mine', name }));
  const enemy = enemyOn ? deck.enemy.filter(Boolean).map((name) => ({ side: 'enemy', name })) : [];
  const list = [...mine, ...enemy];
  const cur = list.find((x) => x.side === focus?.side && x.name === focus?.name) || list[0] || null;
  const curName = cur?.name || '';
  const hero = curName ? resolveHero(curName) : null;
  const groups = curName && open ? groupHeroEffects(heroEntriesFor(curName), includeEnhance) : [];
  const count = groups.reduce((n, [, rows]) => n + rows.length, 0);
  if (!cur) return null;
  const isCur = (x) => x.side === cur.side && x.name === cur.name;
  const press = (x) => (isCur(x) ? onToggle() : onFocus({ side: x.side, name: x.name }));
  const chips = (items) => items.map((x) => (
    <button
      key={`${x.side}-${x.name}`}
      type="button"
      aria-pressed={open && isCur(x)}
      className={`tb-herofx-chip is-${x.side}${open && isCur(x) ? ' is-on' : ''}`}
      onClick={() => press(x)}
      title={open && isCur(x) ? '한 번 더 누르면 접혀요' : `${x.name} 효과 요약 보기`}
    >
      <MiniHero hero={resolveHero(x.name)} size={32} />
      <span title={x.name}>{x.name}</span>
    </button>
  ));
  return (
    <section className={`luxury-panel tb-herofx-panel${open ? ' is-open' : ''}`}>
      <div className="tb-herofx-head">
        <h3>
          <Icon name="dexEffectSummary" size={15} />
          {open ? <><b>{cur.name}</b> 효과 요약 <i className="tb-herofx-count">{count}</i></> : '영웅 효과 요약'}
        </h3>
        <span className="tb-herofx-sub">{open ? '스킬별 버프 · 디버프 · 조건 (스킬 강화 · 초월 기준)' : '영웅을 누르면 스킬별 효과가 펼쳐져요'}</span>
      </div>
      <div className={`tb-herofx-sides${enemy.length ? ' is-split' : ''}`} style={{ '--n': size }}>
        <div className="tb-herofx-side is-mine">
          {enemy.length ? <span className="tb-herofx-side-label is-mine"><Icon name="deckAlly" size={13} /> 내 덱</span> : null}
          <div className="tb-herofx-chips">{chips(mine)}</div>
        </div>
        {enemy.length ? (
          <div className="tb-herofx-side is-enemy">
            <span className="tb-herofx-side-label is-enemy"><Icon name="deckEnemy" size={13} /> 상대 덱</span>
            <div className="tb-herofx-chips">{chips(enemy)}</div>
          </div>
        ) : null}
      </div>
      {open ? <HeroEffects hero={hero} groups={groups} includeEnhance={includeEnhance} /> : null}
    </section>
  );
}

export function FinderTile({ chip, group, on, have, dim = false, onClick }) {
  const { label, dir } = group === 'role' ? { label: chip.label, dir: null } : { label: listLabel(chip.label), dir: effectLabel(chip.label).dir };
  const hint = group === 'role' ? ` · ${ROLE_HINT.get(chip.id)}` : '';
  return (
    <button
      type="button"
      className={`tb-ftile is-${group}${on ? ' is-on' : ''}${have ? ' is-have' : ''}${dim ? ' is-dim' : ''}`}
      onClick={onClick}
      aria-pressed={on}
      title={`${chip.label}${hint} — 가진 영웅 ${chip.count}명${have ? ' · 이미 덱에 있어요' : ''}`}
    >
      <span className="tb-ftile-mark" aria-hidden="true">{have ? '✓' : '+'}</span>
      <span className="tb-ftile-label">{label}</span>
      {dir ? <i className={`tb-dir is-${dir}`} aria-hidden="true">{dir === 'up' ? '▲' : '▼'}</i> : null}
      <span className="tb-ftile-count">{chip.count}</span>
    </button>
  );
}

export function PickerDropdown({
  active, names, heroes, onPick, onClose, onRemove, resolveHero, narrow,
  index, finder, setFinder,
}) {
  const ref = useRef(null);
  const current = names[active.idx] || '';
  const hero = current ? resolveHero(current) : null;
  const group = finder?.group || 'ally';

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const onDown = (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      if (ref.current?.contains(t)) return;
      if (t.closest('.deck-hero-slot-face') || t.closest('[data-finder]')) return;
      /* PC는 창이 덱 아래 끼어 있어서 닫히면 아래 내용이 창 높이만큼 올라감 → 누른 버튼이 포인터에서 벗어나 클릭이 안 됨
         (「전력 비교」를 두 번 눌러야 했음). 바로 닫고 올라간 만큼 스크롤을 맞춰 누른 자리를 그대로 둠 */
      const before = t.getBoundingClientRect().top;
      flushSync(onClose);
      if (!t.isConnected) return;
      const shift = t.getBoundingClientRect().top - before;
      if (Math.abs(shift) > 1) window.scrollBy({ top: shift, behavior: 'instant' });
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [onClose]);

  useEffect(() => {
    if (!narrow) return undefined;
    const raf = requestAnimationFrame(() => {
      /* 덱 칸 전체(안 줄어든 바깥 틀)로 잼 — 줄인(zoom) 카드 안쪽 좌표는 브라우저마다 달라서. 아래 진형 버프 줄(16px)과 위 덱 이름 줄(32px)은 가려져도 됨 */
      const bar = document.querySelector('.tb-deck-bar')?.getBoundingClientRect();
      if (!ref.current || !bar || getComputedStyle(ref.current).position !== 'fixed') return;
      const sheetTop = window.innerHeight - ref.current.offsetHeight;
      const head = document.querySelector('.gnb-header')?.getBoundingClientRect().bottom || 0;
      const room = sheetTop - head - 8;
      const shift = bar.height - 16 <= room + 32 ? bar.bottom - 16 - (sheetTop - 4) : bar.top - (head + 8);
      if (Math.abs(shift) > 4) window.scrollBy({ top: shift, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(raf);
  }, [narrow, active.side]);

  const withSkill = !!finder?.skill;
  const ix = withSkill ? index.withSkill : index;

  const have = useMemo(() => {
    const set = new Set();
    for (const n of names) {
      const m = n ? ix.byHero.get(plainName(n)) : null;
      if (m) m.forEach((_, id) => set.add(id));
    }
    return set;
  }, [names, ix]);

  const chips = ix.groups[group] || [];
  const finderOpen = !!finder?.open;
  const chipId = finderOpen ? finder?.chipId || '' : '';
  const chipLabel = chipId ? (ix.groups[chipId.split('|')[0]] || []).find((c) => c.id === chipId)?.label : '';
  const shownHeroes = chipId ? heroes.filter((h) => ix.byHero.get(plainName(h.name))?.has(chipId)) : heroes;
  const renderBadge = chipId
    ? (h) => {
      const text = ix.byHero.get(plainName(h.name))?.get(chipId);
      return text ? <span className="tb-find-badge">{text}</span> : null;
    }
    : null;
  const toggleSkill = () => {
    const next = !withSkill;
    const keep = !chipId || [...(next ? index.withSkill : index).byHero.values()].some((m) => m.has(chipId));
    setFinder({ ...finder, group, skill: next, chipId: keep ? chipId : '' });
  };
  const toggleFinder = () => setFinder({ ...finder, group, open: !finderOpen, chipId: '' });

  return (
    <div ref={ref} className={`tb-picker-drop is-${active.side}`} role="dialog" aria-label="영웅 선택">
      <div className="tb-picker-drop-head">
        <span className={`tb-side-title is-${active.side}`}>
          <Icon name={active.side === 'mine' ? 'deckAlly' : 'deckEnemy'} size={14} />
          {active.side === 'mine' ? '내 덱' : '상대 덱'} {active.idx + 1}번 칸
        </span>
        {hero ? (
          <div className="tb-picker-tabs">
            <span className="tb-picker-hint">영웅을 누르면 {current} 자리에 넣어요</span>
            <button type="button" className="tb-picker-out" onClick={() => onRemove(active.side, active.idx)}>빼기</button>
          </div>
        ) : <span className="tb-picker-hint">영웅을 누르면 넣고 다음 칸으로 넘어가요</span>}
        <button type="button" className="tb-picker-close" onClick={onClose} aria-label="닫기"><Icon name="close" size={14} /></button>
      </div>

      <>
          <div className={`tb-finder${finderOpen ? ' is-open' : ''}`}>
            <div className="tb-finder-head">
              <button type="button" className="tb-finder-toggle" aria-expanded={finderOpen} onClick={toggleFinder}>
                <Icon name="search" size={13} /> 필요한 효과로 찾기
                <i className="tb-finder-caret" aria-hidden="true">▾</i>
              </button>
              {finderOpen ? <>
              <div className="tb-finder-groups" role="tablist">
                {FINDER_GROUPS.map((g) => (
                  <button key={g.id} type="button" role="tab" aria-selected={group === g.id} className={`is-${g.id}${group === g.id ? ' is-on' : ''}`} onClick={() => setFinder({ ...finder, group: g.id, chipId })}>
                    {g.label} <small>{g.sub}</small>
                  </button>
                ))}
              </div>
              <button type="button" className={`tb-skill-toggle${withSkill ? ' is-on' : ''}`} aria-pressed={withSkill} onClick={toggleSkill} title="기본 공격 · 스킬 · 각성기 · 조건 발동(부활 시 등)으로 거는 버프 · 디버프도 찾기에 넣어요">
                <i aria-hidden="true" /> 스킬 효과 포함
              </button>
              <span className="tb-finder-legend"><i>✓</i> 이미 덱에 있음</span>
              {chipId ? (
                <button type="button" className="tb-finder-clear" onClick={() => setFinder({ ...finder, group, chipId: '' })}>
                  「{chipLabel}」 영웅만 보는 중 ✕
                </button>
              ) : null}
              </> : <span className="tb-finder-off">효과를 골라 그 효과를 가진 영웅만 볼 수 있어요</span>}
            </div>
            {finderOpen ? (
              <div className="tb-ftiles">
                {chips.map((c) => (
                  <FinderTile
                    key={c.id}
                    chip={c}
                    group={group}
                    on={chipId === c.id}
                    have={have.has(c.id)}
                    onClick={() => setFinder({ ...finder, group, chipId: chipId === c.id ? '' : c.id })}
                  />
                ))}
              </div>
            ) : null}
          </div>
          <HeroGridPicker
            heroes={shownHeroes}
            selectedNames={names.filter(Boolean)}
            currentSlotName={current}
            onPick={onPick}
            height={narrow ? 250 : 290}
            showSearch
            loungeDensity
            renderBadge={renderBadge}
            touchDrag={false}
          />
      </>
    </div>
  );
}

/* ───────────── 블록 ───────────── */

/** `tag` = 제목 옆 작은 뱃지 글자 — 같은 색 칸끼리(내 덱 탭 파랑 · 상대 덱 탭 빨강) 무슨 칸인지 구분 */
export function Block({ tone, icon, iconPlain = 0, iconSize = 17, title, tag, sub, children, aside, index = 0, className = '' }) {
  return (
    <section className={`tb-block is-${tone}${className ? ` ${className}` : ''}`} style={{ '--i': index }}>
      <header className="tb-block-head">
        <span className={`tb-block-icon${iconPlain ? ' is-plain' : ''}`}><Icon name={icon} size={iconPlain || iconSize} /></span>
        <div className="tb-block-title">
          <h3>{title}{tag ? <span className="tb-block-tag">{tag}</span> : null}</h3>
          {sub ? <p>{sub}</p> : null}
        </div>
        {aside}
      </header>
      <div className="tb-block-body">{children}</div>
    </section>
  );
}

/* ───────────── 덱 세팅 체크 ───────────── */

const CHECK_MARK = { good: '✓', warn: '!', info: 'i', purple: '✦' };

/** 중복 — 적용되는 쪽은 초록 알약, 나머지는 흐리게 + 취소선 */
function CheckGivers({ givers }) {
  return (
    <div className="tb-ck-row">
      {givers.map((g) => (
        <span key={`${g.name}${g.value}`} className={`tb-ck-chip ${g.applied ? 'is-on' : 'is-lost'}`} title={g.applied ? '적용' : '반영 안 됨'}>
          {g.applied ? <i aria-hidden="true">✓</i> : null}
          {g.name} <b>{g.value}</b>
        </span>
      ))}
    </div>
  );
}

/** 편성 조건 — 1줄 역할 수(채움 초록 · 부족 빨강) + 발동 뱃지, 2줄 스킬 태그 + 효과 알약(효과는 항상 둘째 줄부터) */
function CheckReq({ req }) {
  return (
    <>
      <div className="tb-ck-row">
        {req.have.map((h) => (
          <span key={h.role} className={`tb-ck-chip ${h.short ? 'is-short' : 'is-on'}`}>
            <i aria-hidden="true">{h.short ? '✕' : '✓'}</i>
            {h.role} <b>{h.n}명</b>{h.boosted ? <small>({h.boostedBy ? `${h.boostedBy} ` : ''}+1)</small> : null}
            {h.short ? <em>{h.short}명 부족</em> : null}
          </span>
        ))}
        <span className={`tb-ck-state ${req.met ? 'is-on' : 'is-off'}`}>{req.met ? '발동' : '미발동'}</span>
      </div>
      <div className="tb-ck-row">
        {req.groups.map((g) => {
          const fx = (n) => <span key={n} className={`tb-ck-fx${req.met ? '' : ' is-off'}`}>{n}</span>;
          const [first, ...rest] = g.names;
          return (
            <span key={`${g.skills.join()}|${g.names.join()}`} className="tb-ck-group">
              {/* 스킬 이름은 첫 효과와 붙여서 줄 끝에 혼자 남지 않게(스킬이 여럿일 때) */}
              <span className="tb-ck-lead">
                {g.skills.length ? <span className="tb-ck-skill">{g.skills.join(' · ')}</span> : null}
                {first ? fx(first) : null}
              </span>
              {rest.map(fx)}
            </span>
          );
        })}
      </div>
    </>
  );
}

export function CheckList({ items, resolveHero, onFinder }) {
  return (
    <ul className="tb-checks">
      {items.map((it, i) => (
        <li key={it.id} className={`tb-check is-${it.tone}${it.finders ? ' is-wide' : ''}`} style={{ '--i': Math.min(i, 12), '--faces': Math.min(it.heroes?.length || 0, 5) }}>
          <span className="tb-check-mark" aria-hidden="true">{CHECK_MARK[it.tone]}</span>
          <div className="tb-check-body">
            <strong>{it.title}</strong>
            {it.givers ? <CheckGivers givers={it.givers} /> : null}
            {it.req ? <CheckReq req={it.req} /> : null}
            {Array.isArray(it.detail)
              ? <p>{it.detail.map((line) => <span key={line} className="tb-check-line">{line}</span>)}</p>
              : it.detail ? <p>{it.detail}</p> : null}
            {it.finders?.length ? (
              <div className="tb-check-finders">
                {it.finders.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    data-finder
                    className={`tb-check-finder is-${g.id}${g.missing ? '' : ' is-full'}`}
                    onClick={() => onFinder?.(g.id)}
                    title={`${g.label} ${g.total}가지 중 ${g.missing}가지가 덱에 없어요 — 눌러서 찾기`}
                  >
                    <span className="tb-check-finder-plus" aria-hidden="true">{g.missing ? '+' : '✓'}</span>
                    <span>{g.label}</span>
                    <b>{g.missing ? `${g.missing}개 없음` : '모두 있음'}</b>
                    <small>/ {g.total}</small>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {it.heroes?.length ? (
            <span className="tb-check-heroes">
              {it.heroes.slice(0, 5).map((n) => <MiniHero key={n} hero={resolveHero(n)} size={26} />)}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/* ───────────── 전설 장신구 체크 ───────────── */

const RING_ICON = new Map(accessories.map((a) => [a.shortLabel, a.iconUrl]));

export function RingCheck({ rows, resolveHero }) {
  const blocked = rows
    .map((r) => ({ ...r, rings: LEGEND_RINGS.filter((k) => r.own[k]) }))
    .filter((r) => r.rings.length);
  return (
    <div className="tb-rings">
      <div className="tb-rings-head">
        <strong>전설 장신구 체크 <small className="tb-rings-note">(해당 효과는 중복 적용 안 돼요)</small></strong>
        <span>{blocked.length ? '이 반지는 패시브와 겹쳐서 껴도 효과가 없어요' : '패시브와 겹치는 반지가 없어요 — 불사 · 권능 · 부활 모두 효과 있어요'}</span>
      </div>
      {blocked.length ? (
        <div className="tb-rings-list">
          {blocked.map((r, i) => (
            <span key={r.name} className="tb-ring-chip" style={{ '--i': i }}>
              <MiniHero hero={resolveHero(r.name)} size={26} />
              <b>{r.name}</b>
              {r.rings.map((k) => (
                <span
                  key={k}
                  className="tb-ring-no"
                  title={`${k}의 반지 — 패시브에 ${k}${r.own[k].source ? `(${r.own[k].source})` : ''}이 있어 효과 없음`}
                >
                  <img src={RING_ICON.get(k)} alt="" loading="lazy" />
                  <i aria-hidden="true">✕</i>
                  <em>{k}{r.own[k].source ? <small>{r.own[k].source}</small> : null}</em>
                </span>
              ))}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ───────────── 효과 목록 (받는 버프 · 거는 디버프) ───────────── */

const DIR_MARK = { up: '▲', down: '▼' };

/** 분석 칸 「자세히 보기」 수치 뱃지 — 칸 종류로 부호(버프 목록 「+25%」 · 디버프 목록 「−24%」, 표 합계와 같은 규칙) */
const badgeValue = (c, side) => fmtValue(c.value, side === 'enemy' ? 'down' : 'up');

/**
 * 상대 덱 기준 목록 — 엔진의 대상 글은 그 덱 입장(「아군 전체」 · 「적 1명」)이라 우리 입장으로 바꿈:
 * 아군 → 상대 · 적 → 우리 (「자신만」은 그대로).
 */
function flipScope(text) {
  return String(text || '')
    .replace(/(^|[\s·(+])아군/g, '$1상대')
    .replace(/(^|[\s·(+])적(?=[\s·)]|$)/g, '$1우리');
}
const scopeFor = (perspective) => (perspective === 'enemy' ? flipScope : (t) => t);
/** 색 — side(버프/디버프 뱃지)와 별개로 칸 강조색만: 받는 버프 파랑 · 거는 디버프 보라 · 받는 디버프 빨강 · 상대 버프 주황 */
const toneClass = (tone) => (tone ? ` tone-${tone}` : '');

/** 버프 · 디버프 칸 안 [패시브 | 스킬 · 발동] 전환 */
export function FxTabs({ side, tone, value, onChange, passiveCount, skillCount }) {
  const tabs = [
    { id: 'passive', label: '패시브', n: passiveCount },
    { id: 'skill', label: '액티브 · 발동', n: skillCount },
  ];
  return (
    <div className={`tb-fx-tabs is-${side}${toneClass(tone)}`} role="tablist">
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={value === t.id} className={value === t.id ? 'is-on' : ''} onClick={() => onChange(t.id)}>
          {t.label} <b>{t.n}</b>
        </button>
      ))}
    </div>
  );
}

/** 목록 안 가장 긴 효과 이름 너비를 --fxl-name 으로 넣어, 이름 뒤 수치 뱃지가 세로 한 줄로 서게 한다 */
function useAlignedNames(ref) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let alive = true;
    const measure = () => {
      if (!alive) return;
      el.style.removeProperty('--fxl-name');
      let max = 0;
      el.querySelectorAll('.tb-fxl-name').forEach((n) => { max = Math.max(max, n.getBoundingClientRect().width); });
      if (max) el.style.setProperty('--fxl-name', `${Math.ceil(max)}px`);
    };
    measure();
    document.fonts?.ready?.then(measure);
    return () => { alive = false; };
  });
}

export function EffectList({ cards, side, tone, perspective, teamSize, resolveHero, onFind, emptyText }) {
  const listRef = useRef(null);
  useAlignedNames(listRef);
  if (!cards.length) return <div className="tb-empty">{emptyText}</div>;
  const rows = groupEffectCards(cards);
  const scopeText = scopeFor(perspective);
  const findable = perspective !== 'enemy';
  return (
    <ul ref={listRef} className={`tb-fxl is-${side}${toneClass(tone)}`}>
      {rows.map((row, i) => {
        const { applied } = row;
        const head = row.cards[0];
        const lost = row.cards.length === 1 ? head.sources.filter((s) => !s.applied) : [];
        const sameDir = row.cards.every((c) => c.dir === head.dir);
        const dir = sameDir ? head.dir : side === 'enemy' ? 'down' : 'up';
        const src = applied[0];
        const iconUrl = src?.skillName ? skillIconUrl(resolveHero(src.heroName), src.skillName, src.skillLabel) : null;
        return (
          <li key={row.id} className={`tb-fxl-row${head.overlap || head.wasted || head.note?.warn ? ' is-warn' : ''}`} style={{ '--i': Math.min(i, 14) }}>
            {iconUrl ? (
              <span className="tb-fxl-skicon" title={src.skillName}>
                <SafeImg src={iconUrl} alt={src.skillName} fallbackIcon="swords" loading="lazy" />
              </span>
            ) : (
              <span className={`tb-fxl-dir is-${dir || 'none'}`} aria-hidden="true">{DIR_MARK[dir] || '◆'}</span>
            )}
            <div className="tb-fxl-body">
              <div className="tb-fxl-flows">
                {applied.map((s) => {
                  const partial = side === 'ally' && s.scopeKind !== 'all' && s.scopeKind !== 'self' && s.recipients && s.recipients.length < teamSize;
                  const none = partial && s.recipients.length === 0;
                  return (
                    <span key={s.id} className="tb-fxl-flow" title={`${s.heroName} · ${s.skillLabel}`}>
                      <span className="tb-fxl-giver">
                        <MiniHero hero={resolveHero(s.heroName)} size={22} />
                        <b>{s.heroName}</b>
                        {s.skillLabel === '각성기' ? <i className="tb-fxl-tag">각성 중</i> : null}
                      </span>
                      <span className="tb-fxl-arrow" aria-label="에게">→</span>
                      <span className={`tb-fxl-to${none ? ' is-none' : ''}`}>
                        {scopeText(s.scope)}
                        {partial && !none ? s.recipients.map((n) => <MiniHero key={n} hero={resolveHero(n)} size={18} />) : null}
                        {none ? <em>받는 영웅 없음</em> : null}
                      </span>
                    </span>
                  );
                })}
              </div>
              <div className="tb-fxl-main">
                {row.cards.map((c) => (
                  <span key={c.id} className="tb-fxl-fx">
                    <span className="tb-fxl-key">
                      <FxIcon name={c.label} size={20} />
                      {findable ? (
                        <button type="button" data-finder className="tb-fxl-name" onClick={() => onFind?.(c)} title="이 효과를 가진 영웅 찾기">{c.label}</button>
                      ) : <span className="tb-fxl-name">{c.label}</span>}
                    </span>
                    {c.value != null ? <span className="tb-fxl-val">{badgeValue(c, side)}</span> : null}
                    {c.timing === 'start' ? <span className="tb-fxl-when" title="전투 시작 시 적용 — [상시] 효과와는 중첩돼요">시작 {c.turns}턴</span> : null}
                    {c.tower ? <span className="tb-fxl-tower" title="무한의 탑 · 시련의 탑에서만 적용">탑 전용</span> : null}
                    {c.overlap ? <span className="tb-fxl-flag">중복</span> : null}
                  </span>
                ))}
              </div>
              {lost.length ? (
                <p className="tb-fxl-note">
                  같은 효과는 가장 높은 수치 하나만 적용돼요. {lost.map((s) => `${s.heroName} ${fmtValue(s.value, head.dir)}`).join(' · ')}는 반영 안 돼요.
                </p>
              ) : null}
              {row.cards.length === 1 && head.overlapNote ? <p className="tb-fxl-note">같은 효과는 겹치는 대상만 높은 수치 하나를 받아요. {head.overlapNote}</p> : null}
              {head.selfClash ? <p className="tb-fxl-note">{selfClashText(head)}</p> : null}
              {head.note ? <p className="tb-fxl-note">{head.note.text}</p> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** 스킬 · 발동 탭 목록 — 영웅 · 스킬 하나에 상자 하나, 대상이 줄마다 다르면 줄에 대상 표시 */
export function SkillEffectList({ cards, side, tone, perspective, resolveHero, emptyText }) {
  const listRef = useRef(null);
  useAlignedNames(listRef);
  if (!cards.length) return <div className="tb-empty">{emptyText}</div>;
  const rows = groupSkillCards(cards);
  const scopeText = scopeFor(perspective);
  return (
    <ul ref={listRef} className={`tb-fxl is-${side} is-skill${toneClass(tone)}`}>
      {rows.map((row, i) => {
        const scopes = [...new Set(row.cards.map((c) => scopeText(c.sources[0].scope)))];
        const oneScope = scopes.length === 1 ? scopes[0] : null;
        const icon = skillIconUrl(resolveHero(row.heroName), row.skillName, row.skillLabel);
        return (
          <li key={row.id} className="tb-fxl-row" style={{ '--i': Math.min(i, 14) }}>
            <span className="tb-fxl-skicon" title={row.skillName || row.tag}>
              <SafeImg src={icon} alt={row.skillName || row.tag} fallbackIcon="swords" loading="lazy" />
            </span>
            <div className="tb-fxl-body">
              <div className="tb-fxl-flows">
                <span className="tb-fxl-flow">
                  <span className="tb-fxl-giver">
                    <MiniHero hero={resolveHero(row.heroName)} size={22} />
                    <b>{row.heroName}</b>
                    <i className="tb-fxl-tag is-skill">{row.tag}</i>
                  </span>
                  {oneScope ? (
                    <>
                      <span className="tb-fxl-arrow" aria-label="에게">→</span>
                      <span className="tb-fxl-to">{oneScope}</span>
                    </>
                  ) : null}
                </span>
              </div>
              <div className="tb-fxl-main">
                {row.cards.map((c) => (
                  <span key={c.id} className="tb-fxl-fx">
                    <span className="tb-fxl-key"><FxIcon name={c.label} size={20} /><span className="tb-fxl-name">{c.label}</span></span>
                    {c.value != null ? <span className="tb-fxl-val">{badgeValue(c, side)}</span> : null}
                    {c.amountText ? <span className="tb-fxl-amt">{c.amountText}</span> : null}
                    {c.chance ? <span className="tb-fxl-amt">{c.chance}% 확률</span> : null}
                    {c.duration ? <span className="tb-fxl-when">{c.duration}</span> : null}
                    {c.stack ? <span className="tb-fxl-stack">{c.stack}</span> : null}
                    {c.tower ? <span className="tb-fxl-tower" title="무한의 탑 · 시련의 탑에서만 적용">탑 전용</span> : null}
                    {oneScope ? null : <span className="tb-fxl-scope">→ {scopeText(c.sources[0].scope)}</span>}
                    {c.condition ? <span className="tb-fxl-cond" title={c.condition}>{c.condition}</span> : null}
                  </span>
                ))}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function selfClashText(c) {
  const me = c.sources[0]?.heroName || '';
  const others = c.selfClash.others.map((o) => `${o.heroName}${o.value != null ? ` ${fmtValue(o.value, c.dir)}` : ''}`).join(' · ');
  const head = `${others} 팀 버프와 같은 효과라 ${me} 본인은 가장 높은 수치 하나만 받아요.`;
  if (c.selfClash.selfWins === true) return `${head} ${others}는 ${me}에게만 반영 안 돼요.`;
  if (c.selfClash.selfWins === false) return `${head} 이 자기 버프는 반영 안 돼요.`;
  return head;
}

/** 버프 칸 안 아래쪽 — 자기 자신만 받는 버프. 영웅 알약을 누르면 그 영웅 것만 펼침 */
export function SelfBuffSection({ cards, kind = 'passive', tone, perspective, teamSize, resolveHero, open, onToggle }) {
  const heroOf = (c) => c.sources[0]?.heroName;
  const heroes = [...new Set(cards.map(heroOf).filter(Boolean))];
  if (!heroes.length) return null;
  const cur = heroes.includes(open) ? open : null;
  const shown = cur ? cards.filter((c) => heroOf(c) === cur) : [];
  return (
    <div className={`tb-selfbuff${toneClass(tone)}`}>
      <div className="tb-selfbuff-head">
        <span className="tb-selfbuff-title">
          <Icon name="hero" size={14} /> 자기 자신만 받는 버프
          <em>{cur ? '한 번 더 누르면 접혀요' : '영웅을 누르면 펼쳐져요'}</em>
        </span>
        <div className="tb-selfbuff-chips" data-n={Math.min(heroes.length, 5)}>
          {heroes.map((name) => {
            const on = cur === name;
            return (
              <button
                key={name}
                type="button"
                aria-pressed={on}
                className={`tb-selfbuff-chip${on ? ' is-on' : ''}`}
                onClick={() => onToggle(on ? null : name)}
                title={on ? `${name} · 한 번 더 누르면 접혀요` : `${name} 자기 버프 보기`}
              >
                <MiniHero hero={resolveHero(name)} size={22} />
                <span className="tb-selfbuff-name">{name}</span>
                <b>{fxBoxCount(cards.filter((c) => heroOf(c) === name), kind)}</b>
              </button>
            );
          })}
        </div>
      </div>
      {shown.length && kind === 'skill' ? <SkillEffectList key={cur} cards={shown} side="ally" tone={tone} perspective={perspective} resolveHero={resolveHero} emptyText="" /> : null}
      {shown.length && kind !== 'skill' ? <EffectList key={cur} cards={shown} side="ally" tone={tone} perspective={perspective} teamSize={teamSize} resolveHero={resolveHero} emptyText="" /> : null}
    </div>
  );
}

/* ───────────── 버프 · 디버프 칸 표 (효과별 패시브 · 액티브 · 합계) ───────────── */

function partWhen(p, kind) {
  if (kind === 'skill') return null;
  return p.timing === 'start' ? `시작 ${p.turns}턴` : '상시';
}

/** 펼친 줄 한 칸 — 주는 영웅 · 스킬마다 (스킬 아이콘 · 슬롯 · 수치 · 대상 · 지속 · 확률 · 중첩 · 조건) */
function LedgerSource({ p, s, kind, fmt, scopeText, resolveHero }) {
  const hero = resolveHero(s.heroName);
  const slot = kind === 'skill' ? (s.skillTag || s.skillLabel) : s.skillLabel;
  const triggered = kind === 'skill' && s.skillLabel === '패시브';
  const tag = triggered ? '조건 발동' : slot === '패시브' ? null : slot;
  const kindId = kind === 'skill' && !triggered ? 'skill' : 'passive';
  const when = partWhen(p, kind);
  const pet = s.skillLabel === '펫' ? petOfGiver(s.heroName) : null;
  const formation = s.skillLabel === '진형' ? formationOfGiver(s.heroName) : null;
  const sourceIcon = pet?.skillIconUrl || (formation ? formationIconSrc(formation) : skillIconUrl(hero, s.skillName, s.skillLabel));
  return (
    <li className="tb-tot-src">
      <span className={`tb-tot-src-icon${formation ? ' is-formation' : ''}`} title={s.skillName || tag}>
        <SafeImg src={sourceIcon} alt={s.skillName || tag || ''} fallbackIcon="swords" loading="lazy" />
      </span>
      <div className="tb-tot-src-body">
        <div className="tb-tot-src-top">
          <GiverFace name={s.heroName} resolveHero={resolveHero} size={22} />
          <span className="tb-tot-part-who">{s.heroName}</span>
          <span className={`tb-tot-kind is-${kindId}`}>{kindId === 'skill' ? '액티브' : '패시브'}</span>
          {tag ? <span className="tb-tot-part-when">{tag === '각성기' && kind !== 'skill' ? '각성 중' : tag}</span> : null}
          {when ? <span className="tb-tot-part-when">{when}</span> : null}
          {(s.value ?? p.value) != null ? <b>{fmt(s.value ?? p.value)}</b> : null}
        </div>
        <div className="tb-tot-src-meta">
          {s.scope ? <span>→ {scopeText(s.scope)}</span> : null}
          {p.duration ? <span className="is-turn">{p.duration}</span> : null}
          {p.chance ? <span>{p.chance}% 확률</span> : null}
          {p.amountText ? <span className="is-amt">{p.amountText}</span> : null}
          {p.stack ? <span className="is-stack">{p.stack}</span> : null}
          {s.condition ? <span className="is-cond" title={s.condition}>{s.condition}</span> : null}
        </div>
      </div>
    </li>
  );
}

const ledgerParts = (r) => [
  ...(r.passive?.parts || []).map((p) => ({ ...p, kind: 'passive' })),
  ...(r.skill?.parts || []).map((p) => ({ ...p, kind: 'skill' })),
  ...(r.pet?.parts || []).map((p) => ({ ...p, kind: 'passive' })),
];

/* 모든 출처가 유형 대상(「아군 방어형 · 만능형」)일 때만 역할 아이콘 — 한 곳이라도 전체 대상이면 안 붙임 */
function ledgerRowRoles(parts) {
  const srcs = parts.flatMap((p) => p.srcs);
  return srcs.length && srcs.every((s) => s.scopeKind === 'roles' && s.scopeRoles?.length) ? [...new Set(srcs.flatMap((s) => s.scopeRoles))] : [];
}

/** PC 모양 얼굴 칸 너비(px) — 표에서 가장 넓은 줄 기준이라 줄마다 얼굴이 같은 열에서 시작(얼굴 24 · 간격 3 · 역할 아이콘 16 + 테두리 여백 10, teamBuilder.css .tb-tot-faces) */
function ledgerFacesWidth(rows) {
  let faces = 0;
  let roles = 0;
  for (const r of rows) {
    faces = Math.max(faces, Math.min(r.heroes.length, 3));
    roles = Math.max(roles, ledgerRowRoles(ledgerParts(r)).length);
  }
  const faceW = faces ? faces * 24 + (faces - 1) * 3 : 0;
  const roleW = roles ? (faces ? 3 : 0) + roles * 16 + (roles - 1) * 2 + 10 : 0;
  return faceW + roleW + 2;
}

function LedgerRow({ r, side, scopeText, resolveHero, index }) {
  const [open, setOpen] = useState(false);
  const fmt = (v) => fmtFxValue(v, r.label, r.dir);
  /* 합계 · 펼침 영웅별 수치는 칸 종류로 부호 — 버프 칸 「+25%」 · 디버프 칸 「−24%」(밍봉 2026-11-11) */
  const signed = (v) => fmtValue(v, side === 'enemy' ? 'down' : 'up');
  const sumText = signed(r.total);
  const passiveTurn = r.passive?.segs.some((s) => s.timing === 'start');
  const petInfo = r.pet ? petOfGiver(r.pet.heroes[0]) : null;
  const petTurn = r.pet?.segs.some((s) => s.timing === 'start');
  const parts = ledgerParts(r);
  const notes = parts.flatMap((p) => [
    p.lost.length ? `같은 효과는 가장 높은 수치 하나만 적용돼요. ${p.lost.map((x) => `${x.heroName} ${fmtValue(x.value, r.dir)}`).join(' · ')}는 반영 안 돼요.` : null,
    p.overlapNote ? `같은 효과는 겹치는 대상만 높은 수치 하나를 받아요. ${p.overlapNote}` : null,
    p.wasted ? `${p.srcs[0]?.heroName || ''}의 효과 대상(${scopeText(p.scope)})이 덱에 없어요.` : null,
    p.note?.text || null,
  ]).filter(Boolean);
  const rowRoles = ledgerRowRoles(parts);
  return (
    <li className={`tb-tot-row${open ? ' is-open' : ''}${r.overlap || r.warn ? ' is-warn' : ''}`} style={{ '--i': Math.min(index, 20) }}>
      <button type="button" className="tb-tot-line" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="tb-tot-name">
          <FxIcon name={r.label} size={22} />
          <span className="tb-tot-label">{r.label}</span>
          {r.overlap ? <em className="tb-tot-flagtag">중복</em> : r.warn ? <em className="tb-tot-flagtag">확인</em> : null}
          <span className="tb-tot-faces">
            {r.heroes.slice(0, 3).map((n) => <GiverFace key={n} name={n} resolveHero={resolveHero} size={24} />)}
            <RoleMarks roles={rowRoles} />
          </span>
        </span>
        <span className="tb-tot-pcell">
          <span className={`tb-tot-cell is-passive${r.passive ? '' : ' is-none'}`}>
            {r.passive ? fmt(r.passive.total) : '—'}
            {passiveTurn ? <i title="전투 시작 턴 효과 포함">턴</i> : null}
          </span>
          {r.pet ? (
            <span className="tb-tot-pet" title={`펫 ${petInfo?.name || ''} ${fmt(r.pet.total)} — 펫 효과는 영웅 효과와 따로 더해져요`}>
              {petInfo?.skillIconUrl ? <img src={petInfo.skillIconUrl} alt="" draggable={false} /> : null}
              {r.passive || r.skill ? '+' : ''}{fmt(r.pet.total)}
              {petTurn ? <em className="tb-tot-pet-turn" title="전투 시작 턴 효과">턴</em> : null}
            </span>
          ) : null}
        </span>
        <span className={`tb-tot-cell is-skill${r.skill ? '' : ' is-none'}`}>
          {r.skill ? fmt(r.skill.total) : '—'}
        </span>
        <span className="tb-tot-cell is-sum"><b>{sumText}</b></span>
      </button>
      {open ? (
        <div className="tb-tot-detail">
          <ul className="tb-tot-srcs">
            {parts.flatMap((p) => p.srcs.map((s) => (
              <LedgerSource key={`${p.kind}-${p.id}-${s.id}`} p={p} s={s} kind={p.kind} fmt={signed} scopeText={scopeText} resolveHero={resolveHero} />
            )))}
          </ul>
          {notes.map((n) => <p key={n} className="tb-tot-warn">{n}</p>)}
          {r.pet && (r.passive || r.skill) ? <p className="tb-tot-note">펫 효과는 영웅 효과와 따로 중첩돼서 합계에 더했어요.</p> : null}
          {r.skill && r.skill.parts.length > 1 ? <p className="tb-tot-note">액티브는 같은 효과 중 가장 높은 수치 하나만 합계에 더했어요.</p> : null}
        </div>
      ) : null}
    </li>
  );
}

/** 버프 · 디버프 칸 본문 — `data` = fxGroups `fxLedger(패시브 카드, 액티브 카드, 펫 카드)` */
export function FxLedger({ data, side, tone, perspective, resolveHero, emptyText }) {
  const scopeText = scopeFor(perspective);
  const { groups, rows, flags, nPassive, nSkill } = data;
  if (!rows.length && !flags.length) return <div className="tb-empty">{emptyText}</div>;
  return (
    <div className={`tb-tot-col is-${side}${toneClass(tone)}`}>
      {rows.length ? (
        <div className="tb-tot-sheet" style={{ '--tot-faces-w': `${ledgerFacesWidth(rows)}px` }}>
          <div className="tb-tot-thead" aria-hidden="true">
            <span>효과</span>
            <span className="tb-tot-th is-passive">패시브 <small>{nPassive}</small></span>
            <span className="tb-tot-th is-skill">액티브 <small>{nSkill}</small></span>
            <span className="tb-tot-th is-sum"><Icon name="tbTotals" size={13} /> 합계</span>
          </div>
          {groups.map((g) => (
            <div key={g.id} className="tb-tot-group">
              <div className="tb-tot-group-label">{g.label}</div>
              <ul className="tb-tot-rows">
                {g.rows.map((r, i) => (
                  <LedgerRow key={r.id} r={r} side={side} scopeText={scopeText} resolveHero={resolveHero} index={i} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
      {flags.length ? <LedgerFlags flags={flags} scopeText={scopeText} resolveHero={resolveHero} /> : null}
    </div>
  );
}

/** 특수 효과(수치 없음 — 관통 · 기절 · 면역 …) — 알약을 누르면 그 아래 누가 · 어떤 스킬로 · 누구에게 · 몇 턴 거는지 */
function LedgerFlags({ flags, scopeText, resolveHero }) {
  const [openId, setOpenId] = useState(null);
  const cur = flags.find((f) => f.id === openId) || null;
  return (
    <div className="tb-tot-uniq">
      <div className="tb-tot-uniq-head">
        <span className="tb-tot-uniq-title">특수 효과</span>
        <span className="tb-tot-uniq-num">{flags.length}</span>
        <em>수치 없는 효과 · 누르면 누가 어떻게 쓰는지</em>
      </div>
      <div className="tb-tot-flags">
        {flags.map((f) => {
          const on = cur?.id === f.id;
          return (
            <button
              key={f.id}
              type="button"
              className={`tb-tot-flag${on ? ' is-on' : ''}`}
              aria-expanded={on}
              onClick={() => setOpenId(on ? null : f.id)}
              title={f.label}
            >
              <FxIcon name={f.label} size={24} className="tb-tot-flag-icon" />
              <span className="tb-tot-flag-name">{f.label}</span>
              <span className="tb-tot-flag-faces">
                {f.heroes.slice(0, 2).map((n) => <MiniHero key={n} hero={resolveHero(n)} size={20} />)}
                {f.heroes.length > 2 ? <em>+{f.heroes.length - 2}</em> : null}
              </span>
            </button>
          );
        })}
      </div>
      {cur ? (
        <div className="tb-tot-detail is-flag">
          <div className="tb-tot-flag-title"><FxIcon name={cur.label} size={20} /> {cur.label}</div>
          <ul className="tb-tot-srcs">
            {cur.parts.flatMap((p) => p.srcs.map((s) => (
              <LedgerSource key={`${p.kind}-${p.id}-${s.id}`} p={p} s={s} kind={p.kind} fmt={(v) => fmtValue(v, null)} scopeText={scopeText} resolveHero={resolveHero} />
            )))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** 버프 · 디버프 칸 맨 아래 「자세히 보기」 — 누르면 영웅 · 스킬 상자 목록(패시브 | 액티브 · 발동 탭)이 펼쳐짐 */
export function FxFold({ open, onToggle, tone, hint, children }) {
  return (
    <div className={`tb-fx-detail${open ? ' is-open' : ''}${toneClass(tone)}`}>
      <button type="button" className="tb-fx-detail-btn" aria-expanded={open} onClick={onToggle}>
        <Icon name="hero" size={15} />
        <span>{open ? '자세히 접기' : '자세히 보기'}</span>
        {hint ? <small>{hint}</small> : null}
        <i aria-hidden="true">▾</i>
      </button>
      {open ? <div className="tb-fx-detail-body">{children}</div> : null}
    </div>
  );
}

/** 분석 탭 내 덱 · 상대 덱 버튼 안 영웅 얼굴 줄 */
export function ClashFaces({ heroes }) {
  return (
    <span className="tb-clash-faces" aria-hidden="true">
      {heroes.length
        ? heroes.map((h) => <MiniHero key={h.id || h.name} hero={h} size={22} />)
        : <span className="tb-clash-faces-empty">영웅을 넣어 주세요</span>}
    </span>
  );
}

/* ───────────── 상대 덱 — 노리는 대상 · 조심할 것 ───────────── */

export function TargetStrip({ groups, resolveHero }) {
  if (!groups.length) return null;
  return (
    <div className="tb-targets">
      <span className="tb-targets-title"><Icon name="tbAim" size={15} /> 상대가 노리는 우리 배치</span>
      {groups.map((g, i) => (
        <span key={g.label} className="tb-target" style={{ '--i': i }} title={`우리 ${g.label} ← ${g.heroes.join(' · ')}`}>
          <b>{g.label}</b>
          <span className="tb-target-heroes">
            {g.heroes.map((n) => <MiniHero key={n} hero={resolveHero(n)} size={20} />)}
          </span>
        </span>
      ))}
    </div>
  );
}

export function ThreatCards({ cards, resolveHero, emptyText }) {
  if (!cards.length) return <div className="tb-empty">{emptyText}</div>;
  return (
    <div className="tb-threats">
      {cards.map((c, i) => (
        <article key={c.id} className={`tb-threat is-${c.level}${c.inactive ? ' is-inactive' : ''}`} style={{ '--i': Math.min(i, 12) }}>
          <header className="tb-threat-head">
            <MiniHero hero={resolveHero(c.heroName)} size={44} />
            <div className="tb-threat-id">
              <strong>{c.heroName}</strong>
              {c.targets.length ? (
                <span className="tb-threat-aim">
                  <Icon name="tbAim" size={15} />
                  {c.targets.map((t, k) => <span key={t}>{k ? ' · ' : ''}우리 <b>{t}</b></span>)} 노림
                </span>
              ) : <span className="tb-threat-aim is-gimmick">특수 기믹 주의</span>}
            </div>
          </header>
          <div className="tb-threat-body">
            {c.lines.map((l) => (
              <div key={l.id} className={`tb-threat-line${l.cond && !l.cond.met ? ' is-off' : ''}`}>
                <p className="tb-threat-what">{l.what}</p>
                {l.cond ? (
                  <p className={`tb-threat-cond${l.cond.met ? ' is-met' : ''}`}>
                    조건 · 상대 {l.cond.label} — 지금 {l.cond.have} → {l.cond.effectText ? `${l.cond.effectText} ` : ''}{l.cond.met ? '발동해요' : '발동 안 함'}
                  </p>
                ) : null}
                <p className="tb-threat-todo"><Icon name="check" size={12} /> {l.todo}</p>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
