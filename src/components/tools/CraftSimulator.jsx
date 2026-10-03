import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../icons/Icon';
import ModalScrim from '../ModalScrim';
import { backdropDismissProps } from '../../utils/backdropDismiss';
import {
  CRAFT_CHARMS,
  CRAFT_STARS,
  LEGEND_PITY_STEP,
  RARITY_LABEL,
  bonusFromDisplayRate,
  craftAccessories,
  effectText,
  expectedLegendTries,
  fixedBaseRate,
  fixedSuccessRate,
  formatRate,
  legendDisplayColumns,
  pityApplies,
  randomOptionTable,
  ringIconUrl,
  ringName,
  rollFixed,
  rollRandomOption,
  roundRate,
  sameEffect,
  trimRate,
} from '../../lib/craftSim';
import '../../styles/craftSim.css';

const CRAFT_ANIM_MS = 1500;
const AUTO_LIMIT = 100000;
const RANDOM_MAT_RARITIES = ['legendary', 'rare', 'advanced', 'normal'];
const RARITY_FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'legendary', label: '전설' },
  { id: 'rare', label: '희귀' },
  { id: 'advanced', label: '고급' },
  { id: 'normal', label: '일반' },
];
const PARTICLES = Array.from({ length: 18 }, (_, i) => i);
const NPC_STREAK = 3;
const NPC_TYPE_MS = 45;
const NPC_SPARKS = Array.from({ length: 12 }, (_, i) => i);
const NPC_SCENES = {
  lucky: {
    img: '/images/craft/npc-lucky.webp',
    badge: `연속 ${NPC_STREAK}회 성공`,
    line: '지금은 여기다 운을 다 쓴 것 같아..\n진짜 세공은 다음에 하자',
    replies: [
      { label: '알겠어…' },
      { label: '니가 뭔데?', next: 'sulk' },
    ],
  },
  sulk: {
    img: '/images/craft/npc-sulk.webp',
    badge: `연속 ${NPC_STREAK}회 성공`,
    line: '흥! 니 맘대로 해라!!',
    replies: [{ label: '흥!' }],
  },
  jinx: {
    img: '/images/craft/npc-jinx.webp',
    badge: `연속 ${NPC_STREAK}회 실패`,
    line: '액땜했다\n빨리 진짜 세공 시도해!',
    replies: [{ label: '바로 간다!' }],
  },
};

const emptyStats = () => ({
  tries: 0,
  success: 0,
  fail: 0,
  legend: 0,
  materials: 0,
  charms: Object.fromEntries(CRAFT_CHARMS.map((c) => [c.id, 0])),
});

function Stars({ count, size = 'md' }) {
  return (
    <span className={`craft-stars craft-stars--${size}`} aria-label={`${count}성`}>
      {'★'.repeat(count)}
    </span>
  );
}

function RingIcon({ acc, star = 6, size = 'md', plus = true, dim = false, stars = true }) {
  if (!acc) {
    return (
      <span className={`craft-ring craft-ring--empty craft-ring--${size}`} aria-hidden>
        <img className="craft-ring-empty-icon" src="/images/ui/accessory-ring.png" alt="" draggable={false} />
        <span className="craft-ring-empty-add">+</span>
      </span>
    );
  }
  return (
    <span className={`craft-ring craft-ring--${acc.rarity} craft-ring--${size}${dim ? ' is-dim' : ''}`}>
      <img src={ringIconUrl(acc, star)} alt="" draggable={false} />
      {plus ? <span className="craft-ring-plus">+15</span> : null}
      {stars ? <Stars count={star} size={size === 'lg' ? 'md' : 'sm'} /> : null}
    </span>
  );
}

function MaterialRarityIcon({ rarity, star, size = 'md' }) {
  return (
    <span className={`craft-ring craft-ring--${rarity} craft-ring--${size} craft-ring--generic`}>
      <img src="/images/craft/mode-random.png" alt="" draggable={false} />
      {star ? <Stars count={star} size="sm" /> : null}
    </span>
  );
}

function StarPicker({ value, options, onChange, label, compact = false }) {
  return (
    <div className={`craft-star-picker${compact ? ' craft-star-picker--compact' : ''}`} role="radiogroup" aria-label={label}>
      {CRAFT_STARS.map((s) => {
        const enabled = options.includes(s);
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={value === s}
            disabled={!enabled}
            className={`craft-star-btn${value === s ? ' is-on' : ''}`}
            onClick={() => onChange(s)}
          >
            {s}★
          </button>
        );
      })}
    </div>
  );
}

function RateInput({ value, onCommit, label, disabled = false }) {
  const [draft, setDraft] = useState(trimRate(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(trimRate(value));
  }, [value]);

  const change = (raw) => {
    const clean = raw.replace(/[^0-9.]/g, '');
    setDraft(clean);
    const n = parseFloat(clean);
    if (Number.isFinite(n)) onCommit(n);
  };

  const commit = () => {
    focused.current = false;
    setDraft(trimRate(value));
  };

  return (
    <span className="craft-rate-input">
      <input
        type="text"
        inputMode="decimal"
        aria-label={label}
        disabled={disabled}
        value={draft}
        onFocus={() => { focused.current = true; }}
        onChange={(e) => change(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      />
      <i>%</i>
    </span>
  );
}

function ResultOverlay({ result, onClose }) {
  if (!result) return null;
  const { kind, acc, star, rate, tries, pityNote, charmUsed } = result;
  const title = kind === 'legend' ? '전설 옵션 세공!' : kind === 'success' ? '세공 성공!' : '세공 실패';
  return (
    <div className={`craft-result craft-result--${kind}`} role="dialog" aria-live="assertive" aria-label={title}>
      <div className="craft-result-burst" aria-hidden>
        {kind !== 'fail' && <span className="craft-result-rays" />}
        {kind !== 'fail' && PARTICLES.map((i) => (
          <span key={i} className="craft-particle" style={{ '--a': `${i * 20}deg`, '--d': `${90 + (i % 3) * 28}px` }} />
        ))}
        {kind === 'fail' && <span className="craft-result-crack" />}
      </div>
      <div className="craft-result-card">
        <div className="craft-result-title">{title}</div>
        {kind === 'fail' ? (
          <p className="craft-result-sub">
            {charmUsed ? '재료 장신구와 사용한 부적이 소멸했습니다.' : '재료 장신구가 소멸했습니다.'}
          </p>
        ) : (
          <>
            <RingIcon acc={acc} star={star} size="lg" plus={false} />
            <div className="craft-result-name">{ringName(acc, star)}</div>
            <p className="craft-result-effect">{effectText(acc, star)}</p>
          </>
        )}
        <div className="craft-result-meta">
          {rate != null ? <span>적용 확률 {formatRate(rate)}</span> : null}
          {tries > 1 ? <span>자동 {tries.toLocaleString()}회 시도</span> : null}
        </div>
        {pityNote ? <p className="craft-result-pity">{pityNote}</p> : null}
        <button type="button" className="craft-btn craft-btn--ghost" onClick={onClose}>
          확인
        </button>
      </div>
    </div>
  );
}

function NpcStreakModal({ kind, onClose }) {
  const [sceneKey, setSceneKey] = useState(kind);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <ModalScrim className="craft-npc-scrim" {...backdropDismissProps(onClose)}>
      <NpcScene
        key={sceneKey}
        sceneKey={sceneKey}
        onReply={(reply) => (reply.next ? setSceneKey(reply.next) : onClose())}
      />
    </ModalScrim>
  );
}

function NpcScene({ sceneKey, onReply }) {
  const scene = NPC_SCENES[sceneKey];
  const full = scene.line.length;
  const [reduceMotion] = useState(() => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const [typed, setTyped] = useState(() => (reduceMotion ? full : 0));

  useEffect(() => {
    if (reduceMotion) return undefined;
    let n = 0;
    let timer = 0;
    const start = window.setTimeout(() => {
      timer = window.setInterval(() => {
        n += 1;
        setTyped(n);
        if (n >= full) window.clearInterval(timer);
      }, NPC_TYPE_MS);
    }, 650);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(timer);
    };
  }, [full, reduceMotion]);

  const done = typed >= full;

  return (
      <div className={`craft-npc craft-npc--${sceneKey}`} role="dialog" aria-modal="true" aria-label={scene.badge}>
        <div className="craft-npc-badge">{scene.badge}</div>
        <div className="craft-npc-stage">
          <span className="craft-npc-glow" aria-hidden />
          <div className="craft-npc-sparks" aria-hidden>
            {NPC_SPARKS.map((i) => (
              <span key={i} style={{ '--x': `${(i * 37) % 100}%`, '--dl': `${(i % 6) * 0.35}s`, '--dur': `${2.2 + (i % 4) * 0.4}s` }} />
            ))}
          </div>
          <div className="craft-npc-portrait">
            <img src={scene.img} alt="세공 NPC" width={416} height={480} draggable={false} />
          </div>
        </div>
        <button
          type="button"
          className="craft-npc-bubble"
          onClick={() => setTyped(full)}
          aria-label={scene.line}
        >
          <span className="craft-npc-text" aria-hidden>
            {scene.line.slice(0, typed)}
            {!done ? <i className="craft-npc-caret" /> : null}
          </span>
          <span className="craft-npc-text craft-npc-text--ghost" aria-hidden>{scene.line}</span>
        </button>
        <div className="craft-npc-replies">
          {scene.replies.map((reply, i) => (
            <button
              key={reply.label}
              type="button"
              className={`craft-btn ${i === 0 ? 'craft-btn--main' : 'craft-btn--sub'} craft-npc-ok`}
              onClick={() => onReply(reply)}
            >
              {reply.label}
            </button>
          ))}
        </div>
      </div>
  );
}

export default function CraftSimulator() {
  const [mode, setMode] = useState('fixed');
  const [activeSlot, setActiveSlot] = useState('base');
  const [rarityFilter, setRarityFilter] = useState('all');
  const [base, setBase] = useState({ acc: null, star: 6, option: null });
  const [material, setMaterial] = useState({ acc: null, star: 6 });
  const [randomMatRarity, setRandomMatRarity] = useState('legendary');
  const [charm, setCharm] = useState(null);
  const charms = charm ? [charm] : [];
  const [phase, setPhase] = useState('idle');
  const [result, setResult] = useState(null);
  const [fast, setFast] = useState(false);
  const [stats, setStats] = useState(emptyStats);
  const [log, setLog] = useState([]);
  const [pityBonus, setPityBonus] = useState(0);
  const [npc, setNpc] = useState(null);
  const timerRef = useRef(null);
  const streakRef = useRef({ kind: null, count: 0 });
  const npcQueueRef = useRef(null);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const materialStarOptions = CRAFT_STARS.filter((s) => fixedBaseRate(base.star, s) != null);

  const changeBaseStar = (s) => {
    setBase((b) => ({ ...b, star: s }));
    setMaterial((m) => (fixedBaseRate(s, m.star) != null
      ? m
      : { ...m, star: CRAFT_STARS.find((x) => fixedBaseRate(s, x) != null) }));
  };

  const listed = useMemo(
    () => craftAccessories.filter((a) => rarityFilter === 'all' || a.rarity === rarityFilter),
    [rarityFilter],
  );

  const fixedRate = fixedSuccessRate(base.star, material.star, charms);
  const pityOn = mode === 'random' && pityApplies(material.star);
  const table = useMemo(
    () => (mode === 'random' ? randomOptionTable(base.acc, randomMatRarity, material.star, pityBonus) : []),
    [mode, base.acc, randomMatRarity, material.star, pityBonus],
  );
  const legendRows = table.filter((r) => r.legendary);
  const legendTotal = legendRows.reduce((s, r) => s + r.rate, 0);
  const randomExpected = useMemo(
    () => (mode === 'random' ? expectedLegendTries(base.acc, randomMatRarity, material.star, pityBonus) : null),
    [mode, base.acc, randomMatRarity, material.star, pityBonus],
  );
  const displayColumns = legendDisplayColumns(pityOn ? pityBonus : 0);

  const blockReason = (() => {
    if (!base.acc) return '세공할 장신구(베이스)를 선택해 주세요.';
    if (mode === 'fixed' && !material.acc) return '재료 장신구를 선택해 주세요.';
    if (fixedBaseRate(base.star, material.star) == null) return '재료 성급은 베이스 성급 이하만 가능합니다.';
    if (mode === 'fixed' && sameEffect(base.acc, material.acc)) return '같은 효과의 장신구는 세공할 수 없습니다.';
    return '';
  })();

  const busy = phase === 'crafting';
  const canCraft = !blockReason && !busy;

  const pickAccessory = (acc) => {
    if (busy) return;
    if (activeSlot === 'base' || mode === 'random') {
      setBase((b) => ({ ...b, acc, option: null }));
      if (mode === 'fixed') setActiveSlot('material');
    } else {
      setMaterial((m) => ({ ...m, acc }));
    }
  };

  const toggleCharm = (id) => {
    if (busy) return;
    setCharm((cur) => (cur === id ? null : id));
  };

  const isGoal = (r) => (mode === 'fixed' ? r.kind === 'success' : r.kind === 'legend');

  const craft = (auto = false) => {
    if (!canCraft) return;
    const pityStep = pityOn ? LEGEND_PITY_STEP[randomMatRarity] ?? LEGEND_PITY_STEP.normal : 0;
    let bonus = pityBonus;
    let rollTable = table;
    let tries = 0;
    let fails = 0;
    let legends = 0;
    let last;
    const legendPair = mode === 'fixed'
      && base.acc?.rarity === 'legendary'
      && material.acc?.rarity === 'legendary';
    let streak = legendPair ? { ...streakRef.current } : { kind: null, count: 0 };
    do {
      if (mode === 'fixed') {
        const ok = rollFixed(fixedRate);
        last = { kind: ok ? 'success' : 'fail', acc: ok ? material.acc : null, star: material.star, rate: fixedRate };
        if (legendPair) {
          streak = streak.kind === last.kind
            ? { kind: last.kind, count: streak.count + 1 }
            : { kind: last.kind, count: 1 };
        }
      } else {
        const row = rollRandomOption(rollTable);
        last = { kind: row.legendary ? 'legend' : 'success', acc: row.acc, star: material.star, rate: row.rate };
        if (pityOn) {
          bonus = row.legendary ? 0 : roundRate(bonus + pityStep);
          rollTable = randomOptionTable(base.acc, randomMatRarity, material.star, bonus);
        }
      }
      tries += 1;
      if (last.kind === 'fail') fails += 1;
      if (last.kind === 'legend') legends += 1;
    } while (auto && !isGoal(last) && tries < AUTO_LIMIT);

    let pityNote = '';
    if (pityOn) {
      const nextRate = legendDisplayColumns(bonus).find((c) => c.rarity === randomMatRarity)?.rate;
      pityNote = last.kind === 'legend'
        ? '전설 옵션 등장 — 누적 증가 확률이 초기화됩니다.'
        : `다음 세공 전설 옵션 확률 ${formatRate(nextRate)} (+${trimRate(pityStep * tries)}%p)`;
    }
    const outcome = { ...last, tries, pityNote, charmUsed: mode === 'fixed' && charms.length > 0 };
    const usedCharms = mode === 'fixed' ? charms : [];
    const finalBonus = bonus;
    let npcKind = null;
    if (streak.count >= NPC_STREAK) {
      npcKind = streak.kind === 'success' ? 'lucky' : 'jinx';
      streak = { kind: null, count: 0 };
    }
    const finalStreak = streak;

    const finish = () => {
      setStats((s) => ({
        tries: s.tries + tries,
        success: s.success + (tries - fails),
        fail: s.fail + fails,
        legend: s.legend + legends,
        materials: s.materials + tries,
        charms: Object.fromEntries(
          Object.entries(s.charms).map(([id, n]) => [id, n + (usedCharms.includes(id) ? tries : 0)]),
        ),
      }));
      if (outcome.kind !== 'fail') setBase((b) => ({ ...b, option: { acc: outcome.acc, star: outcome.star } }));
      if (pityOn) setPityBonus(finalBonus);
      streakRef.current = finalStreak;
      if (npcKind) npcQueueRef.current = npcKind;
      setLog((l) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          mode,
          kind: outcome.kind,
          name: outcome.acc
            ? ringName(outcome.acc, outcome.star)
            : (mode === 'fixed' && material.acc ? ringName(material.acc, material.star) : ''),
          detail: mode === 'fixed'
            ? (CRAFT_CHARMS.find((c) => c.id === charm)?.label || '부적 없음')
            : `${RARITY_LABEL[randomMatRarity]} 재료`,
          detailTone: mode === 'fixed' ? (charm || 'none') : randomMatRarity,
          tries,
        },
        ...l,
      ].slice(0, 12));
      setResult(outcome);
      setPhase('result');
    };

    setResult(null);
    if (fast) {
      finish();
    } else {
      setPhase('crafting');
      timerRef.current = window.setTimeout(finish, CRAFT_ANIM_MS);
    }
  };

  const closeResult = () => {
    setResult(null);
    setPhase('idle');
    if (npcQueueRef.current) {
      setNpc(npcQueueRef.current);
      npcQueueRef.current = null;
    }
  };

  const closeNpc = useCallback(() => setNpc(null), []);

  const resetAll = () => {
    window.clearTimeout(timerRef.current);
    streakRef.current = { kind: null, count: 0 };
    npcQueueRef.current = null;
    setStats(emptyStats());
    setLog([]);
    setResult(null);
    setPhase('idle');
    setBase((b) => ({ ...b, option: null }));
  };

  const expected = mode === 'fixed'
    ? (fixedRate ? 100 / fixedRate : null)
    : randomExpected;

  const commitDisplayRate = (rarity, value) => {
    if (busy) return;
    setPityBonus(bonusFromDisplayRate(rarity, value));
  };

  return (
    <div className="craft-sim">
      <div className="craft-sim-head luxury-panel">
        <div>
          <h2 className="craft-sim-title"><Icon name="ring" size={18} /> 세공 시뮬레이터</h2>
          <p className="craft-sim-copy">
            실제 재화 소모 없이 장신구 세공을 연습해 보세요. 결과는 이 화면에서만 기록되며 저장되지 않습니다.
          </p>
        </div>
        <label className="craft-fast-toggle">
          <input type="checkbox" checked={fast} onChange={(e) => setFast(e.target.checked)} />
          <span>연출 생략</span>
        </label>
      </div>

      <div className="craft-sim-grid">
        <section className="luxury-panel craft-left">
          <div className="craft-panel-title">세공 장신구</div>
          <div className="craft-base-card">
            <button
              type="button"
              className={`craft-slot-btn${activeSlot === 'base' ? ' is-active' : ''}`}
              onClick={() => setActiveSlot('base')}
              aria-label="베이스 장신구 선택"
            >
              <RingIcon acc={base.acc} star={base.star} size="lg" />
            </button>
            <div className="craft-base-info">
              <div className="craft-base-name">
                {base.acc ? <>{ringName(base.acc, base.star)} <em>+15</em></> : '보관함에서 세공할 장신구를 선택하세요'}
              </div>
              {base.acc ? (
                <>
                  <div className="craft-opt craft-opt--main"><span aria-hidden>✦</span>{effectText(base.acc, base.star)}</div>
                  {base.option ? (
                    <div className={`craft-opt craft-opt--sub craft-opt--${base.option.acc.rarity}`}>
                      <span aria-hidden>⊕</span>
                      <b>[{RARITY_LABEL[base.option.acc.rarity]}]</b> {effectText(base.option.acc, base.option.star)}
                    </div>
                  ) : (
                    <div className="craft-opt craft-opt--empty"><span aria-hidden>⊕</span>세공 옵션 없음</div>
                  )}
                </>
              ) : null}
            </div>
          </div>

          <div className="craft-mode-label">세공 방식을 선택해 주세요.</div>
          <div className="craft-modes">
            {[
              { id: 'fixed', title: '고정 옵션 세공', desc: '재료로 사용한 장신구의 옵션 추가', icon: '/images/craft/mode-fixed.png' },
              { id: 'random', title: '임의 옵션 세공', desc: '장신구 옵션 임의 추가', icon: '/images/craft/mode-random.png' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                className={`craft-mode${mode === m.id ? ' is-on' : ''}`}
                onClick={() => {
                  if (busy) return;
                  setMode(m.id);
                  if (m.id === 'random') setActiveSlot('base');
                }}
                aria-pressed={mode === m.id}
              >
                <span className="craft-mode-chev" aria-hidden />
                <span className="craft-mode-title">{m.title}</span>
                <span className="craft-mode-icon" aria-hidden>
                  <img src={m.icon} alt="" width={40} height={40} draggable={false} />
                </span>
                <span className="craft-mode-desc">{m.desc}</span>
              </button>
            ))}
          </div>

          <div className={`craft-stage${busy ? ' is-crafting' : ''}`}>
            <div className="craft-stage-pair">
              {[
                {
                  key: 'base',
                  cap: '세공 대상',
                  item: base,
                  starOptions: CRAFT_STARS,
                  onStar: changeBaseStar,
                  empty: '대상 선택',
                },
                {
                  key: 'material',
                  cap: '재료',
                  item: material,
                  starOptions: materialStarOptions,
                  onStar: (s) => setMaterial((m) => ({ ...m, star: s })),
                  empty: '재료 선택',
                },
              ].map((slot, i) => {
                const rarityMat = mode === 'random' && slot.key === 'material';
                return (
                <Fragment key={slot.key}>
                  {i === 1 ? <span className="craft-stage-plus" aria-hidden>+</span> : null}
                  <div
                    className={`craft-stage-slot craft-stage-slot--${slot.key === 'base' ? 'base' : 'mat'}${activeSlot === slot.key && !rarityMat ? ' is-active' : ''}`}
                  >
                    <span className="craft-stage-cap">{slot.cap}</span>
                    {rarityMat ? (
                      <MaterialRarityIcon rarity={randomMatRarity} star={material.star} />
                    ) : (
                      <button
                        type="button"
                        className="craft-slot-btn"
                        onClick={() => setActiveSlot(slot.key)}
                        aria-label={`${slot.cap} 장신구 선택`}
                      >
                        <RingIcon acc={slot.item.acc} star={slot.item.star} />
                      </button>
                    )}
                    <span className={`craft-stage-name${slot.item.acc || rarityMat ? '' : ' is-empty'}`}>
                      {rarityMat
                        ? `${RARITY_LABEL[randomMatRarity]} 재료`
                        : slot.item.acc ? ringName(slot.item.acc, slot.item.star) : slot.empty}
                    </span>
                    <StarPicker
                      compact
                      label={`${slot.cap} 성급`}
                      value={slot.item.star}
                      options={slot.starOptions}
                      onChange={(s) => !busy && slot.onStar(s)}
                    />
                  </div>
                </Fragment>
                );
              })}
              <div className="craft-forge" aria-hidden>
                <span className="craft-forge-ring" />
                <span className="craft-forge-core" />
              </div>
            </div>

            <div className="craft-stage-rate">
              <span className="craft-stage-cap">{mode === 'fixed' ? '성공 확률' : '전설 옵션 확률'}</span>
              <strong>{mode === 'fixed' ? formatRate(fixedRate) : formatRate(legendTotal || null)}</strong>
              {expected ? <small>평균 약 {Math.ceil(expected).toLocaleString()}회</small> : null}
            </div>

            {mode === 'fixed' ? (
              <div className="craft-charms">
                <div className="craft-sub-title">
                  확률 증가 재료
                  <em>{charm ? CRAFT_CHARMS.find((c) => c.id === charm)?.label : '1개만 선택 가능'}</em>
                </div>
                <div className="craft-charm-row" role="radiogroup" aria-label="세공 부적">
                  {CRAFT_CHARMS.map((c) => {
                    const on = charm === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        className={`craft-charm craft-charm--${c.tone}${on ? ' is-on' : ''}${charm && !on ? ' is-off' : ''}`}
                        onClick={() => toggleCharm(c.id)}
                        title={`${c.label} · 성공 확률 ${c.bonus}% 증가`}
                      >
                        <span className="craft-charm-img">
                          <img src={c.iconUrl} alt="" />
                          {on ? <span className="craft-charm-check" aria-hidden>✓</span> : null}
                        </span>
                        <span className="craft-charm-bonus">+{c.bonus}%</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="craft-odds">
                <div className="craft-sub-title">재료 등급</div>
                <div className="craft-mat-rarity" role="radiogroup" aria-label="재료 등급">
                  {RANDOM_MAT_RARITIES.map((r) => {
                    const on = randomMatRarity === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        className={`craft-mat-rarity-btn craft-mat-rarity-btn--${r}${on ? ' is-on' : ''}`}
                        onClick={() => !busy && setRandomMatRarity(r)}
                      >
                        <MaterialRarityIcon rarity={r} size="sm" />
                        <span>{RARITY_LABEL[r]}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="craft-sub-title">임의 옵션 정보</div>
                <div className={`craft-pity${pityOn ? '' : ' is-locked'}`}>
                    <div className="craft-pity-head">
                      <span>내 전설 옵션 확률 <small>(게임 화면 수치 입력)</small></span>
                      <button
                        type="button"
                        className="craft-chip"
                        disabled={busy || !pityOn || pityBonus === 0}
                        onClick={() => setPityBonus(0)}
                      >
                        기본값
                      </button>
                    </div>
                    <div className="craft-pity-cols">
                      {displayColumns.map((c) => (
                        <label
                          key={c.rarity}
                          className={`craft-pity-col craft-pity-col--${c.rarity}${randomMatRarity === c.rarity ? ' is-on' : ''}`}
                        >
                          <span>{RARITY_LABEL[c.rarity]} 재료</span>
                          <RateInput
                            value={c.rate}
                            label={`${RARITY_LABEL[c.rarity]} 재료 전설 옵션 확률`}
                            onCommit={(v) => commitDisplayRate(c.rarity, v)}
                            disabled={!pityOn}
                          />
                        </label>
                      ))}
                    </div>
                    {pityOn ? (
                      <p className="craft-pity-note">
                        누적 증가 <b>+{trimRate(pityBonus)}%p</b>
                        {' '}· 전설 미만 등장 시 +{trimRate(LEGEND_PITY_STEP[randomMatRarity] ?? 0)}%p
                        {' '}· 한 칸만 입력하면 나머지도 같이 맞춰집니다.
                      </p>
                    ) : (
                      <p className="craft-pity-note">
                        ★6 재료일 때만 전설 옵션 확률이 누적 증가합니다. 재료 성급을 6★로 바꾸면 입력할 수 있어요.
                      </p>
                    )}
                  </div>
                {legendRows.length ? (
                  <ul className="craft-odds-list">
                    {legendRows.map((r) => (
                      <li key={r.acc.id}>
                        <RingIcon acc={r.acc} star={material.star} size="sm" plus={false} stars={false} />
                        <span className="craft-odds-effect">{effectText(r.acc, material.star)}</span>
                        <b>{formatRate(r.rate)}</b>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="craft-odds-empty">베이스와 재료를 고르면 확률표가 표시됩니다.</p>
                )}
                <p className="craft-note">
                  공식 확률표 기준. 대상 장신구와 동일 효과는 제외하고 남은 옵션 비율대로 다시 계산했습니다.
                </p>
              </div>
            )}

            <div className="craft-actions">
              <button type="button" className="craft-btn craft-btn--main" disabled={!canCraft} onClick={() => craft(false)}>
                {busy ? '세공 중…' : '세공하기'}
              </button>
              <button type="button" className="craft-btn craft-btn--sub" disabled={!canCraft} onClick={() => craft(true)}>
                {mode === 'fixed' ? '성공할 때까지' : '전설 나올 때까지'}
              </button>
            </div>
            {blockReason ? <p className="craft-block">{blockReason}</p> : null}

            <ResultOverlay result={phase === 'result' ? result : null} onClose={closeResult} />
          </div>
        </section>

        <section className="luxury-panel craft-right">
          <div className="craft-inv-head">
            <div className="craft-slot-tabs" role="tablist" aria-label="선택 대상">
              {[
                { id: 'base', label: '베이스 선택' },
                { id: 'material', label: '재료 선택' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={activeSlot === t.id}
                  className={`nav-tab-btn${activeSlot === t.id ? ' active' : ''}`}
                  disabled={mode === 'random' && t.id === 'material'}
                  title={mode === 'random' && t.id === 'material' ? '임의 옵션 세공은 왼쪽에서 재료 등급을 고릅니다.' : undefined}
                  onClick={() => setActiveSlot(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="craft-filter">
              {RARITY_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`craft-chip${rarityFilter === f.id ? ' is-on' : ''}`}
                  onClick={() => setRarityFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {(() => {
              const starSlot = mode === 'random' ? 'base' : activeSlot;
              const isBaseSlot = starSlot === 'base';
              return (
                <div className="craft-inv-star">
                  <span className="craft-inv-star-label">{isBaseSlot ? '베이스' : '재료'} 성급</span>
                  <StarPicker
                    label={`${isBaseSlot ? '베이스' : '재료'} 성급`}
                    value={isBaseSlot ? base.star : material.star}
                    options={isBaseSlot ? CRAFT_STARS : materialStarOptions}
                    onChange={(s) => {
                      if (busy) return;
                      if (isBaseSlot) changeBaseStar(s);
                      else setMaterial((m) => ({ ...m, star: s }));
                    }}
                  />
                </div>
              );
            })()}
          </div>

          <div className="craft-inv-grid">
            {listed.map((acc) => {
              const isBase = base.acc?.id === acc.id;
              const isMat = mode === 'fixed' && material.acc?.id === acc.id;
              const locked = activeSlot === 'material' && mode === 'fixed' && sameEffect(base.acc, acc);
              const star = activeSlot === 'base' ? base.star : material.star;
              return (
                <button
                  key={acc.id}
                  type="button"
                  className={`craft-inv-cell${isBase ? ' is-base' : ''}${isMat ? ' is-mat' : ''}`}
                  disabled={locked || busy}
                  onClick={() => pickAccessory(acc)}
                  title={`${acc.name}\n${effectText(acc, star)}`}
                >
                  <RingIcon acc={acc} star={star} size="md" dim={locked} />
                  {locked ? <span className="craft-inv-lock"><Icon name="lock" size={12} /></span> : null}
                  {isBase ? <span className="craft-inv-tag">베이스</span> : null}
                  {isMat ? <span className="craft-inv-tag craft-inv-tag--mat">재료</span> : null}
                  <span className="craft-inv-name">{acc.displayName}</span>
                </button>
              );
            })}
          </div>

          <div className="craft-stats">
            <div className="craft-stats-head">
              <span className="craft-sub-title">세공 기록</span>
              <button type="button" className="craft-chip" onClick={resetAll}>초기화</button>
            </div>
            <div className="craft-stats-grid">
              <div><span>시도</span><b>{stats.tries.toLocaleString()}</b></div>
              <div><span>성공</span><b className="is-ok">{stats.success.toLocaleString()}</b></div>
              <div><span>실패</span><b className="is-bad">{stats.fail.toLocaleString()}</b></div>
              <div><span>전설 옵션</span><b className="is-legend">{stats.legend.toLocaleString()}</b></div>
              <div><span>소모 재료</span><b>{stats.materials.toLocaleString()}</b></div>
              <div>
                <span>소모 부적</span>
                <b>{Object.values(stats.charms).reduce((a, b) => a + b, 0).toLocaleString()}</b>
              </div>
            </div>
            <ul className="craft-log">
              {log.length ? (
                log.map((l) => (
                  <li key={l.id} className={`craft-log-item craft-log-item--${l.kind}`}>
                    <span>{l.mode === 'fixed' ? '고정' : '임의'}</span>
                    <b>{l.kind === 'fail' ? (l.name ? `실패 · ${l.name}` : '실패') : l.kind === 'legend' ? `전설 · ${l.name}` : `성공 · ${l.name}`}</b>
                    {l.detail ? (
                      <small className={`craft-log-detail craft-log-detail--${l.detailTone}`}>{l.detail}</small>
                    ) : null}
                    {l.tries > 1 ? <em>{l.tries.toLocaleString()}회</em> : null}
                  </li>
                ))
              ) : (
                <li className="craft-log-empty">세공 결과가 여기에 기록됩니다.</li>
              )}
            </ul>
          </div>
        </section>
      </div>
      {npc ? <NpcStreakModal kind={npc} onClose={closeNpc} /> : null}
    </div>
  );
}
