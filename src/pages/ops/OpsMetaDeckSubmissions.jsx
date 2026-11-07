import { useCallback, useEffect, useState } from 'react';
import Icon from '../../components/icons/Icon';
import InGameDeckCard from '../../components/InGameDeckCard';
import ModalScrim from '../../components/ModalScrim';
import { heroes } from '../../data/heroes';
import { pets } from '../../data/pets';
import { deleteMetaDeckSubmission, listMetaDeckSubmissions, markMetaDeckSubmission, parseSubmissionDeck } from '../../lib/metaDeckSubmissions';
import { backdropDismissProps } from '../../utils/backdropDismiss';

const TABS = [
  { id: 'pending', label: '대기' },
  { id: 'approved', label: '승인됨' },
  { id: 'rejected', label: '반려 (휴지통)' },
  { id: 'all', label: '전체' },
];

const STATUS = {
  pending: { label: '대기', color: '#facc15' },
  approved: { label: '승인됨', color: '#4ade80' },
  rejected: { label: '반려', color: '#f87171' },
};

const resolveHeroByName = (name) => {
  if (!name) return null;
  const clean = String(name).replace('(각성)', '').trim();
  return heroes.find((h) => h.name === name) || heroes.find((h) => h.name.replace('(각성)', '').trim() === clean) || null;
};
const resolvePetById = (petId) => pets.find((p) => p.id === petId) || pets[0];
const fmtTime = (iso) => (iso ? new Date(iso).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');

/** 승인할 칸 · 티어 · 픽률 고르기 */
function ApproveBox({ slots, busy, onCancel, onConfirm }) {
  const [slot, setSlot] = useState(0);
  const [tier, setTier] = useState('');
  const [usageRate, setUsageRate] = useState('');
  return (
    <div className="opsx-approve">
      <div className="opsx-approve-slots">
        {slots.map((title, i) => (
          <button key={i} type="button" className={slot === i ? 'is-on' : ''} onClick={() => setSlot(i)}>
            <b>{i + 1}번 칸</b>
            <small>{title || '비어 있음'}</small>
          </button>
        ))}
      </div>
      <div className="opsx-approve-fields">
        <input value={tier} onChange={(e) => setTier(e.target.value)} placeholder="티어 (예: 0티어)" />
        <input value={usageRate} onChange={(e) => setUsageRate(e.target.value)} placeholder="픽률 (예: 12.5%)" />
      </div>
      <p className="opsx-muted" style={{ margin: 0 }}>{slot + 1}번 칸의 지금 덱을 이 덱으로 바꾸고 메인에 바로 저장해요.</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn-steel" onClick={onCancel} disabled={busy} style={{ flex: 1, justifyContent: 'center' }}>취소</button>
        <button type="button" className="btn-ops" onClick={() => onConfirm({ slot, tier: tier.trim(), usageRate: usageRate.trim() })} disabled={busy} style={{ flex: 1, justifyContent: 'center' }}>
          {busy ? '저장 중…' : `${slot + 1}번 칸에 승인`}
        </button>
      </div>
    </div>
  );
}

/**
 * /ops 메인 편집 — 유저가 낸 메타 덱 목록. 승인 = 칸 고르기 → onApprove(덱, 칸)로 메인 저장 → 제출 상태 「승인됨」.
 * onApprove는 MainSiteEditor가 넘김(편집 중인 폼과 같은 저장 경로라 폼 · 서버가 어긋나지 않음).
 */
export default function OpsMetaDeckSubmissions({ slots, reviewerUid, onApprove, onClose }) {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [approving, setApproving] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('pending');

  const [reloadKey, setReloadKey] = useState(0);
  const load = useCallback(() => {
    setError('');
    setReloadKey((k) => k + 1);
  }, []);
  useEffect(() => {
    let alive = true;
    listMetaDeckSubmissions()
      .then((l) => { if (alive) setList(l); })
      .catch((e) => { if (alive) setError(e?.message || '목록을 불러오지 못했어요.'); });
    return () => { alive = false; };
  }, [reloadKey]);

  const reject = async (sub) => {
    const note = sub.status === 'approved' ? '\n반려 탭(휴지통)으로 옮겨요. 메인에 이미 걸린 덱은 그대로예요.' : '\n반려 탭(휴지통)으로 옮겨요. 거기서 기록을 지울 수 있어요.';
    if (!window.confirm(`「${sub.title}」 (${sub.ingameName}) 제출을 반려할까요?${note}`)) return;
    setBusy(true);
    try {
      await markMetaDeckSubmission(sub.id, 'rejected', { reviewerUid });
      load();
    } catch (e) {
      setError(e?.message || '반려에 실패했어요.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (sub) => {
    if (!window.confirm(`「${sub.title}」 (${sub.ingameName}) 기록을 완전히 지울까요? 되돌릴 수 없어요.\n메인에 이미 걸린 덱은 그대로 남아요. 제출자는 다시 낼 수 있어요.`)) return;
    setBusy(true);
    try {
      await deleteMetaDeckSubmission(sub.id);
      load();
    } catch (e) {
      setError(e?.message || '삭제에 실패했어요.');
    } finally {
      setBusy(false);
    }
  };

  const approve = async (sub, { slot, tier, usageRate }) => {
    setBusy(true);
    try {
      const d = parseSubmissionDeck(sub);
      await onApprove({
        ...d,
        type: '결투장',
        tier,
        usageRate,
        author: { ingameName: sub.ingameName, uid: sub.uid, submissionId: sub.id },
      }, slot);
      await markMetaDeckSubmission(sub.id, 'approved', { reviewerUid, slot });
      setApproving(null);
      load();
    } catch (e) {
      setError(e?.message || '승인에 실패했어요.');
    } finally {
      setBusy(false);
    }
  };

  const shown = (list || []).filter((s) => tab === 'all' || s.status === tab);

  return (
    <ModalScrim style={{ zIndex: 5200, padding: 16 }} {...backdropDismissProps(onClose)}>
      <div className="luxury-panel glass-modal opsx-subs" onClick={(e) => e.stopPropagation()}>
        <div className="opsx-subs-head">
          <h3><Icon name="metaDeck" size={18} /> 제출된 메타 덱</h3>
          <button type="button" onClick={onClose} aria-label="닫기"><Icon name="closeBtn" size={22} /></button>
        </div>
        <div className="opsx-subs-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-on' : ''} onClick={() => { setTab(t.id); setApproving(null); }}>
              {t.label} <b>{(list || []).filter((s) => t.id === 'all' || s.status === t.id).length}</b>
            </button>
          ))}
        </div>
        <p className="opsx-muted" style={{ margin: 0 }}>계정당 1건만 남아요(다시 내면 덮어씀). 반려 탭이 휴지통이에요 — 정리할 기록은 반려한 뒤 반려 탭에서 「기록 삭제」. 메인에 걸린 덱은 그대로예요.</p>
        {error ? <p className="opsx-subs-error">{error}</p> : null}
        {!list ? <p className="opsx-muted">불러오는 중…</p> : null}
        {list && !shown.length ? <p className="opsx-muted">{tab === 'pending' ? '확인할 제출이 없어요.' : '없어요.'}</p> : null}
        <div className="opsx-subs-list">
          {shown.map((sub) => {
            const d = parseSubmissionDeck(sub);
            const st = STATUS[sub.status] || STATUS.pending;
            return (
              <div key={sub.id} className="opsx-sub">
                <div className="opsx-sub-deck">
                  <InGameDeckCard
                    embedded
                    teamName=""
                    overviewTitle={d.title || ''}
                    formationId={d.formationId}
                    petObj={resolvePetById(d.petId)}
                    heroList={(d.heroNames || []).map((name, idx) => {
                      const h = resolveHeroByName(name);
                      return h ? { hero: h, gearConfig: (d.heroGearConfigs || [])[idx] } : name;
                    })}
                    contentMode="pvp"
                    reservedSkills={d.reservedSkills || []}
                    pvpMode={d.mode}
                  />
                </div>
                <div className="opsx-sub-info">
                  <span className="opsx-sub-status" style={{ color: st.color, borderColor: st.color }}>
                    {st.label}{sub.status === 'approved' && typeof sub.approvedSlot === 'number' ? ` · ${sub.approvedSlot + 1}번 칸` : ''}
                  </span>
                  <b className="opsx-sub-title">{sub.title}</b>
                  <span>인게임 <b>{sub.ingameName}</b>{sub.siteNickname ? ` · 사이트 ${sub.siteNickname}` : ''}</span>
                  <span className="opsx-muted">제출 {fmtTime(sub.updatedAt)}</span>
                  {d.desc ? <span className="opsx-sub-desc">{d.desc}</span> : null}
                  {approving === sub.id ? (
                    <ApproveBox slots={slots} busy={busy} onCancel={() => setApproving(null)} onConfirm={(o) => approve(sub, o)} />
                  ) : (
                    <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                      <button type="button" className="btn-ops" disabled={busy} onClick={() => setApproving(sub.id)} style={{ flex: 1, justifyContent: 'center' }}>
                        {sub.status === 'approved' ? '다른 칸에 다시 승인' : sub.status === 'rejected' ? '다시 승인' : '승인'}
                      </button>
                      {sub.status === 'rejected' ? (
                        <button type="button" className="btn-danger-solid" disabled={busy} onClick={() => remove(sub)} style={{ flex: 1 }}>기록 삭제</button>
                      ) : (
                        <button type="button" className="btn-steel" disabled={busy} onClick={() => reject(sub)} style={{ flex: 1, justifyContent: 'center' }}>반려</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ModalScrim>
  );
}
