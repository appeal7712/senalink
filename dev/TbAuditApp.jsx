/**
 * 팀 빌더 효과 점검표 — 로컬 개발 서버 전용 (http://127.0.0.1:5173/dev/tb-audit.html).
 * 빌드 입력이 index.html 하나라 배포본에는 포함되지 않는다. Firestore 무접근, 점검 메모는 localStorage만.
 */
import { useEffect, useMemo, useState } from 'react';
import { heroes } from '../src/data/heroes';
import { buildRareEffectSet, effectLabel, entryValue, fmtValue } from '../src/lib/teamBuilderAnalysis';
import HeroEffectSummary from '../src/components/HeroEffectSummary';
import { auditHero, scopeOf, usageOf } from './tbAuditLogic';
import './tbAudit.css';

const STORE_KEY = 'senalink_tb_audit_v1';
const ROLE_KR = { offensive: '공격형', magic: '마법형', defensive: '방어형', support: '지원형', universal: '만능형' };

function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function EntryChip({ e }) {
  const use = usageOf(e);
  const v = e.kind === 'effect' ? entryValue(e) : null;
  const dir = e.kind === 'effect' ? effectLabel(e.name).dir : null;
  return (
    <div className={`au-fx is-${e.kind === 'damage' ? 'dmg' : e.side}`}>
      <div className="au-fx-main">
        <b>{e.kind === 'damage' ? '피해' : e.name}</b>
        {v != null ? <span className="au-val">{fmtValue(v, dir)}</span> : null}
        {e.duration ? <span className="au-dur">{e.duration.label}</span> : null}
        {e.chance ? <span className="au-dur">{e.chance}% 확률</span> : null}
        <span className="au-scope">{e.side === 'enemy' ? '적' : '아군'} · {scopeOf(e)}</span>
        <span className={`au-use is-${use.tone}`}>{use.text}</span>
      </div>
      {e.condition ? <p className="au-cond">조건: {e.condition}</p> : null}
    </div>
  );
}

function SkillBlock({ s }) {
  return (
    <section className="au-skill">
      <header className="au-skill-head">
        {s.skill.iconUrl ? <img src={s.skill.iconUrl} alt="" /> : null}
        <span className="au-skill-slot">{s.label}</span>
        <b>{s.skill.name}</b>
      </header>
      {s.lines.length ? s.lines.map((l, i) => (
        <div key={i} className={`au-line${l.flags.some((f) => f.lv === 'hard') ? ' is-hard' : l.flags.length ? ' is-soft' : ''}`}>
          <div className="au-src">
            <span className={`au-tag is-${l.kind}`}>{l.tag}</span>
            <span>{l.text}</span>
          </div>
          <div className="au-out">
            {l.entries.map((e) => <EntryChip key={e.id} e={e} />)}
            {l.note ? <span className={`au-use is-${l.note.tone}`}>{l.note.text}</span> : null}
            {l.flags.map((f, j) => <p key={j} className={`au-flag is-${f.lv}`}>{f.lv === 'hard' ? '⚠' : '•'} {f.text}</p>)}
          </div>
        </div>
      )) : <p className="au-empty">효과 문장 없음</p>}
    </section>
  );
}

export default function TbAuditApp() {
  const rareSet = useMemo(() => buildRareEffectSet(heroes), []);
  const audits = useMemo(() => heroes.map((h) => auditHero(h, rareSet)), [rareSet]);
  const [store, setStore] = useState(loadStore);
  const [selId, setSelId] = useState(heroes[0]?.id);
  const [query, setQuery] = useState('');
  const [onlyFlag, setOnlyFlag] = useState(false);
  const [onlyTodo, setOnlyTodo] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }, [store]);

  const list = audits.filter((a) => {
    if (query && !a.hero.name.includes(query.trim())) return false;
    if (onlyFlag && !a.hard && !a.soft) return false;
    if (onlyTodo && store[a.hero.id]?.status) return false;
    return true;
  });
  const cur = audits.find((a) => a.hero.id === selId) || list[0] || audits[0];
  const review = store[cur?.hero.id] || {};
  const done = audits.filter((a) => store[a.hero.id]?.status).length;
  const bad = audits.filter((a) => store[a.hero.id]?.status === 'bad');

  const setReview = (patch) => setStore((s) => ({ ...s, [cur.hero.id]: { ...s[cur.hero.id], ...patch } }));
  const move = (d) => {
    const i = list.findIndex((a) => a.hero.id === cur.hero.id);
    const next = list[Math.min(list.length - 1, Math.max(0, i + d))];
    if (next) setSelId(next.hero.id);
  };

  useEffect(() => {
    const onKey = (ev) => {
      if (/INPUT|TEXTAREA/.test(ev.target.tagName)) return;
      if (ev.key === 'ArrowDown') { ev.preventDefault(); move(1); }
      if (ev.key === 'ArrowUp') { ev.preventDefault(); move(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const copyMemos = async () => {
    const text = ['[팀 빌더 점검 메모]', ...bad.map((a) => `- ${a.hero.name}: ${store[a.hero.id]?.memo || '(메모 없음)'}`)].join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!cur) return null;
  return (
    <div className="au">
      <aside className="au-side">
        <div className="au-side-head">
          <h1>팀 빌더 효과 점검표</h1>
          <p>로컬 전용 · 스킬 강화 · 초월 기준 · ↑↓ 키로 이동</p>
          <div className="au-progress"><i style={{ width: `${(done / audits.length) * 100}%` }} /></div>
          <p className="au-progress-text">확인 {done} / {audits.length} · 틀림 {bad.length}</p>
          <input className="au-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="영웅 이름 검색" />
          <div className="au-toggles">
            <label><input type="checkbox" checked={onlyFlag} onChange={(e) => setOnlyFlag(e.target.checked)} /> 의심만</label>
            <label><input type="checkbox" checked={onlyTodo} onChange={(e) => setOnlyTodo(e.target.checked)} /> 안 본 것만</label>
          </div>
          <button type="button" className="au-copy" onClick={copyMemos} disabled={!bad.length}>{copied ? '복사됨' : `틀림 메모 복사 (${bad.length})`}</button>
        </div>
        <ul className="au-list">
          {list.map((a) => {
            const st = store[a.hero.id]?.status;
            return (
              <li key={a.hero.id}>
                <button type="button" className={`au-item${a.hero.id === cur.hero.id ? ' is-on' : ''}${st ? ` is-${st}` : ''}`} onClick={() => setSelId(a.hero.id)}>
                  <img src={a.hero.portraitUrl} alt="" loading="lazy" />
                  <span className="au-item-name">{a.hero.name}</span>
                  {a.hard ? <b className="au-badge is-hard">{a.hard}</b> : null}
                  {a.soft ? <b className="au-badge is-soft">{a.soft}</b> : null}
                  {st ? <span className="au-st">{st === 'ok' ? '✓' : '✕'}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <main className="au-main">
        <header className="au-hero">
          <img src={cur.hero.portraitUrl} alt="" />
          <div className="au-hero-id">
            <h2>{cur.hero.name}</h2>
            <p>{ROLE_KR[cur.hero.role] || cur.hero.role} · {cur.hero.group || cur.hero.category}</p>
            <p className="au-hero-flags">
              <span className="au-badge is-hard">확실히 이상 {cur.hard}</span>
              <span className="au-badge is-soft">확인 필요 {cur.soft}</span>
            </p>
          </div>
          <div className="au-review">
            <div className="au-review-btns">
              <button type="button" className={review.status === 'ok' ? 'is-ok' : ''} onClick={() => setReview({ status: review.status === 'ok' ? null : 'ok' })}>맞아요</button>
              <button type="button" className={review.status === 'bad' ? 'is-bad' : ''} onClick={() => setReview({ status: review.status === 'bad' ? null : 'bad' })}>틀린 게 있어요</button>
              <button type="button" onClick={() => move(1)}>다음 →</button>
            </div>
            {review.status === 'bad' ? (
              <textarea value={review.memo || ''} onChange={(e) => setReview({ memo: e.target.value })} placeholder="뭐가 틀렸는지 적어 주세요 (예: 스킬2 관통 빠짐)" />
            ) : null}
          </div>
        </header>

        <div className="au-cols">
          <div className="au-col">
            <h3>원문 → 엔진이 읽은 결과</h3>
            {cur.tipOnly.length ? (
              <p className="au-flag is-soft au-tip-only">• 툴팁엔 있는데 효과로 안 뽑힌 이름: {cur.tipOnly.join(' · ')}</p>
            ) : null}
            {cur.skills.map((s) => <SkillBlock key={s.skill.id || s.skill.name} s={s} />)}
          </div>
          <div className="au-col is-preview">
            <h3>도감 · 팀 빌더에 보이는 모습</h3>
            <HeroEffectSummary hero={cur.hero} />
          </div>
        </div>
      </main>
    </div>
  );
}
