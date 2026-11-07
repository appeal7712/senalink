import { useEffect, useState } from 'react';
import Icon from './icons/Icon';
import ModalScrim from './ModalScrim';
import { showToast } from './Toast';
import OpsMetaDeckModal from '../pages/ops/OpsMetaDeckModal';
import { useUserProfile } from '../context/UserProfileContext';
import { signInWithGoogleNow } from '../lib/googleSignIn';
import { getMyMetaDeckSubmission, parseSubmissionDeck, submitMetaDeck } from '../lib/metaDeckSubmissions';
import { backdropDismissProps } from '../utils/backdropDismiss';

const STATUS_TEXT = {
  pending: { text: '관리자 확인 중', color: '#fde68a' },
  approved: { text: '승인됨 · 메인에 걸렸어요', color: '#86efac' },
  rejected: { text: '이번에는 반영되지 않았어요', color: '#fca5a5' },
};

const EMPTY_DECK = { title: '', kind: 'attack', formationId: 'balance', heroNames: ['', '', '', '', ''], reservedSkills: [] };

/** 메인 「메타 덱 공유하기」 — 안내 → (로그인) → 결투장 덱 짜기 → 관리자에게 제출. 계정당 제출 1개. */
export default function MetaDeckShare({ onClose }) {
  const { authUser, authReady, profile } = useUserProfile();
  const [step, setStep] = useState('guide');
  const [mine, setMine] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!authUser?.uid) return undefined;
    getMyMetaDeckSubmission(authUser.uid)
      .then((s) => { if (alive) setMine(s); })
      .catch(() => {});
    return () => { alive = false; };
  }, [authUser?.uid]);

  const login = async () => {
    try {
      await signInWithGoogleNow();
    } catch (e) {
      showToast(e?.message || '로그인에 실패했어요.', 'error');
    }
  };

  const submit = async ({ deck, ingameName }) => {
    setBusy(true);
    try {
      await submitMetaDeck({
        uid: authUser.uid,
        ingameName,
        siteNickname: profile?.nickname || '',
        deck,
        createdAt: mine?.status === 'pending' ? mine.createdAt : undefined,
      });
      showToast('제출했어요. 관리자가 확인한 뒤 메인에 걸려요.', 'success');
      onClose();
    } catch (e) {
      showToast(e?.message || '제출에 실패했어요. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (step === 'edit' && authUser) {
    const prev = mine ? parseSubmissionDeck(mine) : null;
    return (
      <OpsMetaDeckModal
        variant="submit"
        deck={prev?.heroNames ? prev : EMPTY_DECK}
        initialIngameName={mine?.ingameName || ''}
        busy={busy}
        onClose={onClose}
        onSave={submit}
      />
    );
  }

  const status = mine ? STATUS_TEXT[mine.status] : null;
  return (
    <ModalScrim style={{ padding: 16, zIndex: 5200 }} {...backdropDismissProps(onClose)}>
      <div className="glass-modal meta-share-guide" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="meta-share-title">
        <div className="meta-share-head">
          <h3 id="meta-share-title"><Icon name="metaDeck" size={20} /> 메타 덱 공유하기</h3>
          <button type="button" onClick={onClose} aria-label="닫기"><Icon name="closeBtn" size={20} /></button>
        </div>
        <p className="meta-share-thanks">공략 작성에 감사드려요! 공유해 주신 덱은 많은 분들께 큰 도움이 될 거예요.</p>
        <ul className="meta-share-points">
          <li>공략은 되도록 <b>결투장 랭킹 300위 안</b>에 드는 분들이 작성해 주시면 좋겠어요.</li>
          <li>관리자가 확인하고 승인하면 <b>메인 페이지 「결투장 메타 덱」 배너</b>에 공략이 걸리고, <b>인게임 닉네임</b>도 함께 표시돼요.</li>
          <li>계정당 하나만 제출할 수 있어요. 다시 제출하면 이전에 낸 덱을 대신해요.</li>
        </ul>
        {status ? (
          <p className="meta-share-status">
            내 제출 · <b>{mine.title}</b> <span style={{ color: status.color }}>{status.text}</span>
          </p>
        ) : null}
        <div className="meta-share-actions">
          <button type="button" className="btn-steel" onClick={onClose}>닫기</button>
          {authUser ? (
            <button type="button" className="btn-ops" onClick={() => setStep('edit')}>
              {mine ? '덱 다시 짜서 제출하기' : '결투장 덱 짜러 가기'}
            </button>
          ) : (
            <button type="button" className="btn-ops" onClick={login} disabled={!authReady}>
              구글로 로그인하고 시작하기
            </button>
          )}
        </div>
      </div>
    </ModalScrim>
  );
}
