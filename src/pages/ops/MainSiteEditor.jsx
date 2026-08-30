import { useEffect, useState } from 'react';
import { useSuperAdmin } from '../../context/SuperAdminContext';
import { saveSiteMain, useSiteMain } from '../../lib/siteMain';
import { subscribeSiteVisitStats } from '../../lib/siteVisitStats';
import { heroes } from '../../data/heroes';
import { pets } from '../../data/pets';
import Icon from '../../components/icons/Icon';
import InGameDeckCard from '../../components/InGameDeckCard';
import HeroGridPicker from '../../components/HeroGridPicker';
import { metaDeckKindTheme, MetaDeckKindToggle } from '../../components/ArenaDeckKind';
import { ROLE_ICONS } from '../../data/roleIcons';
import OpsMetaDeckModal from './OpsMetaDeckModal';
import HeroPortraitCard from '../../components/HeroPortraitCard';

const ghostBtn = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.22)',
  background: 'rgba(8, 12, 22, 0.45)', color: '#fff', fontWeight: 800, cursor: 'pointer',
};
const ROLE_LABEL = { offensive: '공격형', magic: '마법형', defensive: '방어형', support: '지원형', universal: '만능형' };
const NEWS_TAGS = ['라운지', '패치', '세나링크', '공지', '이벤트'];
const resolvePetById = (petId) => pets.find((p) => p.id === petId) || pets[0];

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function emptyNewsItem() {
  return {
    id: `n_${Date.now()}`,
    title: '',
    body: '',
    url: '',
    date: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
    tag: '세나링크',
  };
}

function resolveHeroByName(name) {
  if (!name) return null;
  const clean = String(name).replace('(각성)', '').trim();
  return heroes.find((h) => h.name === name)
    || heroes.find((h) => h.name.replace('(각성)', '').trim() === clean)
    || null;
}

function PickHeroCell({ name, taken, onPick }) {
  const [open, setOpen] = useState(false);
  const hero = resolveHeroByName(name);
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="ops-glass-field" style={{
        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left',
      }}>
        {hero ? (
          <div style={{ width: 36 }}><HeroPortraitCard hero={hero} showStars showRole showName={false} /></div>
        ) : (
          <span style={{ width: 36, height: 40, borderRadius: 6, background: 'rgba(255,255,255,0.12)', display: 'inline-block' }} />
        )}
        <span style={{ flex: 1, minWidth: 0, color: '#fff' }}>{name || '도감에서 영웅 고르기'}</span>
      </button>
      {open && (
        <div className="ops-hero-dropdown">
          <HeroGridPicker
            heroes={heroes}
            selectedNames={taken.filter((n) => n && n !== name)}
            currentSlotName={name || ''}
            height={220}
            showSearch
            onPick={(picked) => {
              onPick(picked);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function MainSiteEditor() {
  const { authUser } = useSuperAdmin();
  const { content, fromServer } = useSiteMain();
  const [draft, setDraft] = useState(null);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingDeck, setEditingDeck] = useState(null);
  /** null | { index: number|null, item } — 게시판형 글쓰기/수정 (카드 무한 증식 방지) */
  const [newsComposer, setNewsComposer] = useState(null);
  const [visits, setVisits] = useState({ total: 0, dayCount: 0 });

  useEffect(() => {
    return subscribeSiteVisitStats(
      (data) => setVisits({ total: data.total, dayCount: data.dayCount }),
      () => {},
    );
  }, []);

  const form = draft || content;

  const setForm = (next) => {
    setDraft(next);
    setStatus('');
  };

  const onSave = async () => {
    setBusy(true);
    setStatus('');
    try {
      await saveSiteMain(form, authUser.uid);
      setDraft(null);
      setStatus('저장했습니다. 메인페이지에 바로 반영됩니다.');
    } catch (err) {
      setStatus(err?.message || '저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const updateDeck = (index, patch) => {
    const metaDecks = clone(form.metaDecks || []);
    metaDecks[index] = { ...metaDecks[index], ...patch };
    setForm({ ...form, metaDecks });
  };

  const updatePick = (index, patch) => {
    const pickRates = clone(form.pickRates || []).slice(0, 5);
    while (pickRates.length < 5) pickRates.push({ name: '', role: 'offensive', pickRate: '', winRate: '' });
    pickRates[index] = { ...pickRates[index], ...patch };
    if (patch.name) {
      const hero = resolveHeroByName(patch.name);
      if (hero?.role) pickRates[index].role = hero.role;
    }
    setForm({ ...form, pickRates });
  };

  const openNewsCreate = () => {
    setNewsComposer({ index: null, item: emptyNewsItem() });
  };

  const openNewsEdit = (index) => {
    const item = form.news?.[index];
    if (!item) return;
    setNewsComposer({ index, item: clone(item) });
  };

  const patchNewsComposer = (patch) => {
    setNewsComposer((prev) => (prev ? { ...prev, item: { ...prev.item, ...patch } } : prev));
  };

  const commitNewsComposer = () => {
    if (!newsComposer) return;
    const title = String(newsComposer.item.title || '').trim();
    if (!title) {
      alert('제목을 입력해 주세요.');
      return;
    }
    const nextItem = {
      ...newsComposer.item,
      title,
      body: String(newsComposer.item.body || '').trim(),
      url: String(newsComposer.item.url || '').trim(),
      tag: newsComposer.item.tag || '세나링크',
      date: newsComposer.item.date || emptyNewsItem().date,
    };
    const news = clone(form.news || []);
    if (newsComposer.index == null) news.unshift(nextItem);
    else news[newsComposer.index] = nextItem;
    setForm({ ...form, news });
    setNewsComposer(null);
  };

  const removeNews = (index) => {
    const item = form.news?.[index];
    if (!item) return;
    if (!window.confirm(`「${item.title || '제목 없음'}」글을 삭제할까요?`)) return;
    setForm({ ...form, news: (form.news || []).filter((_, i) => i !== index) });
    if (newsComposer?.index === index) setNewsComposer(null);
  };

  const pickRows = (() => {
    const rows = clone(form.pickRates || []).slice(0, 5);
    while (rows.length < 5) rows.push({ name: '', role: 'offensive', pickRate: '', winRate: '' });
    return rows;
  })();

  const newsList = form.news || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="luxury-panel" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--gold-primary)', margin: 0 }}>메인페이지 편집</h2>
          <div style={{ fontSize: 12, color: '#fff', marginTop: 4, textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}>
            {fromServer ? '저장본 사용 중' : '아직 저장본 없음 — 지금 저장해야 메인이 바뀝니다'}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
            오늘 방문자 {visits.dayCount.toLocaleString('ko-KR')}
            <span aria-hidden="true"> · </span>
            전체 {visits.total.toLocaleString('ko-KR')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn-ops" disabled={busy} onClick={onSave}>저장</button>
        </div>
      </div>

      {status && (
        <div style={{ fontSize: 13, fontWeight: 800, color: status.includes('실패') ? 'var(--accent-red)' : 'var(--accent-cyan)' }}>
          {status}
        </div>
      )}

      <section className="luxury-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#fff' }}>사이트 입장 배너</h3>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              켜면 방문자가 메인·허브 등에서 글라스 공지 모달을 봅니다. 「오늘 하루 안 보기」는 브라우저에만 저장됩니다.
            </div>
          </div>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, color: '#fff', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={!!form.entranceBanner?.enabled}
              onChange={(e) => setForm({
                ...form,
                entranceBanner: {
                  ...(form.entranceBanner || {}),
                  enabled: e.target.checked,
                  updatedAt: new Date().toISOString(),
                },
              })}
            />
            배너 표시
          </label>
        </div>
        <label className="ops-glass-label">제목
          <input
            className="ops-glass-field"
            value={form.entranceBanner?.title || ''}
            placeholder="예: 오픈 안내 / 점검 공지"
            onChange={(e) => setForm({
              ...form,
              entranceBanner: {
                ...(form.entranceBanner || {}),
                title: e.target.value,
                updatedAt: new Date().toISOString(),
              },
            })}
          />
        </label>
        <label className="ops-glass-label">내용
          <textarea
            className="ops-glass-field"
            rows={4}
            value={form.entranceBanner?.body || ''}
            placeholder="공지 본문 (줄바꿈 가능)"
            onChange={(e) => setForm({
              ...form,
              entranceBanner: {
                ...(form.entranceBanner || {}),
                body: e.target.value,
                updatedAt: new Date().toISOString(),
              },
            })}
            style={{ resize: 'vertical', minHeight: 96 }}
          />
        </label>
      </section>

      <section className="luxury-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'visible' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#fff' }}>결투장 & 상급결투장 메타 덱</h3>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>결투장 덱 수정이랑 같은 화면입니다. 유형(공덱/마덱/방덱/하이브리드/즉사덱)은 덱마다 직접 고르세요.</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
          {(form.metaDecks || []).map((deck, di) => {
            const kind = metaDeckKindTheme(deck.kind);
            return (
              <div key={deck.id || di} style={{ border: '1px solid var(--border-subtle)', borderRadius: 16, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span className="kind-pill kind-pill--sm" style={{ background: kind.pill, color: kind.id === 'hybrid' ? '#161616' : undefined }}>{kind.label}</span>
                  <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 800 }}>{deck.type || '결투장'}</span>
                </div>
                <MetaDeckKindToggle kind={deck.kind || 'attack'} onChange={(k) => updateDeck(di, { kind: k })} />
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <InGameDeckCard
                    embedded
                    teamName=""
                    overviewTitle={deck.title || ''}
                    formationId={deck.formationId}
                    petObj={resolvePetById(deck.petId)}
                    heroList={(deck.heroNames || []).map((name, idx) => {
                      const baseHero = resolveHeroByName(name);
                      return baseHero ? { hero: baseHero, gearConfig: (deck.heroGearConfigs || [])[idx] } : name;
                    })}
                    contentMode="pvp"
                    reservedSkills={deck.reservedSkills || deck.skillSequence || []}
                    pvpMode={deck.mode}
                  />
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{deck.title || '제목 없음'}</div>
                <button type="button" className="btn-ops" onClick={() => setEditingDeck({ index: di, deck })} style={{ justifyContent: 'center' }}>
                  덱 세팅
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="luxury-panel ops-pick-rates-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'visible' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#fff' }}>결투장 & 상급결투장 기용률 TOP 5</h3>
          <div style={{ fontSize: 12, color: '#fff', marginTop: 4, textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}>도감에 있는 영웅을 고르고, 기용률·승률만 숫자로 적으면 됩니다. 유형은 영웅을 고르면 자동으로 들어갑니다.</div>
        </div>
        <div className="ops-pick-head">
          <span>순위</span>
          <span>영웅</span>
          <span>유형</span>
          <span>기용률</span>
          <span>승률</span>
        </div>
        {pickRows.map((row, i) => (
          <div key={i} className="ops-pick-row">
            <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--gold-light)', textAlign: 'center' }}>{i + 1}위</div>
            <PickHeroCell
              name={row.name}
              taken={pickRows.map((r) => r.name)}
              onPick={(name) => updatePick(i, { name })}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, color: '#fff' }}>
              {ROLE_ICONS[row.role] ? <img src={ROLE_ICONS[row.role]} alt="" style={{ width: 16, height: 16 }} /> : null}
              {ROLE_LABEL[row.role] || '—'}
            </div>
            <label className="ops-glass-label">기용률
              <input className="ops-glass-field" value={row.pickRate || ''} placeholder="예: 78.4%" onChange={(e) => updatePick(i, { pickRate: e.target.value })} />
            </label>
            <label className="ops-glass-label">승률
              <input className="ops-glass-field" value={row.winRate || ''} placeholder="예: 64.2%" onChange={(e) => updatePick(i, { winRate: e.target.value })} />
            </label>
          </div>
        ))}
      </section>

      <section className="luxury-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'visible' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="news" size={16} /> 세나리 뉴스 & 패치 브리핑
            </h3>
            <div style={{ fontSize: 12, color: '#fff', marginTop: 4, textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}>
              슈퍼 관리자 전용 게시판입니다. 본문만 써도 되고(패치노트), 라운지 링크만 넣어도 됩니다.
              「목록에 넣기」는 편집 초안에만 반영되고, <strong style={{ color: '#fff' }}>위쪽 「저장」</strong>을 눌러야 라이브 메인에 올라갑니다.
            </div>
          </div>
          <button
            type="button"
            className="btn-ops"
            onClick={openNewsCreate}
            disabled={!!newsComposer}
            style={{ padding: '8px 12px', fontSize: 12 }}
          >
            <Icon name="plus" size={13} /> 글쓰기
          </button>
        </div>

        {newsComposer && (
          <div className="ops-glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--gold-light)' }}>
              {newsComposer.index == null ? '새 글 작성' : '글 수정'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
              <label className="ops-glass-label" style={{ gridColumn: '1 / -1' }}>제목
                <input
                  className="ops-glass-field"
                  value={newsComposer.item.title || ''}
                  onChange={(e) => patchNewsComposer({ title: e.target.value })}
                  placeholder="예: 세나링크 v2026.08.22 패치 / 라운지 공지"
                />
              </label>
              <label className="ops-glass-label">태그
                <select
                  className="ops-glass-field"
                  value={newsComposer.item.tag || '세나링크'}
                  onChange={(e) => patchNewsComposer({ tag: e.target.value })}
                >
                  {NEWS_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="ops-glass-label">날짜
                <input
                  className="ops-glass-field"
                  value={newsComposer.item.date || ''}
                  onChange={(e) => patchNewsComposer({ date: e.target.value })}
                  placeholder="2026.08.22"
                />
              </label>
            </div>
            <label className="ops-glass-label">본문 (패치노트 · 선택)
              <textarea
                className="ops-glass-field"
                rows={6}
                value={newsComposer.item.body || ''}
                onChange={(e) => patchNewsComposer({ body: e.target.value })}
                placeholder={'링크 없이 여기다 패치노트를 적어도 됩니다.\n예:\n- 세팅 공유 PC 포맷 캡처\n- 공용 허브 공략 UI 정리'}
                style={{ resize: 'vertical', minHeight: 120, lineHeight: 1.5 }}
              />
            </label>
            <label className="ops-glass-label">외부 링크 (선택)
              <input
                className="ops-glass-field"
                value={newsComposer.item.url || ''}
                onChange={(e) => patchNewsComposer({ url: e.target.value })}
                placeholder="있으면 입력 · 없으면 비워두기"
              />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" style={ghostBtn} onClick={() => setNewsComposer(null)}>취소</button>
              <button type="button" className="btn-ops" onClick={commitNewsComposer} style={{ padding: '8px 14px' }}>
                목록에 넣기
              </button>
            </div>
          </div>
        )}

        <div className="ops-news-board">
          {newsList.length === 0 && (
            <div className="ops-news-board-empty">등록된 글이 없습니다. 「글쓰기」로 첫 글을 올려 보세요.</div>
          )}
          {newsList.map((n, i) => (
            <div
              key={n.id || i}
              className={`ops-news-board-row${newsComposer?.index === i ? ' is-editing' : ''}`}
            >
              <div className="ops-news-board-main">
                <div className="ops-news-board-meta">
                  <span className="ops-news-board-tag">{n.tag || '라운지'}</span>
                  <span className="ops-news-board-date">{n.date || '—'}</span>
                  {n.body ? <span className="ops-news-board-kind">본문</span> : null}
                  {n.url ? <span className="ops-news-board-kind">링크</span> : null}
                </div>
                <div className="ops-news-board-title">{n.title || '제목 없음'}</div>
                {n.body ? (
                  <div className="ops-news-board-body">{n.body}</div>
                ) : null}
                {n.url ? (
                  <div className="ops-news-board-url" title={n.url}>{n.url}</div>
                ) : null}
              </div>
              <div className="ops-news-board-actions">
                <button type="button" className="btn-edit" onClick={() => openNewsEdit(i)} disabled={!!newsComposer && newsComposer.index !== i}>
                  수정
                </button>
                <button type="button" className="btn-danger-solid" onClick={() => removeNews(i)}>
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {editingDeck && (
        <OpsMetaDeckModal
          deck={editingDeck.deck}
          onClose={() => setEditingDeck(null)}
          onSave={(next) => {
            updateDeck(editingDeck.index, next);
            setEditingDeck(null);
          }}
        />
      )}
    </div>
  );
}
