import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COL } from '../config/firestorePaths';
import Icon from './icons/Icon';
import ModalScrim from './ModalScrim';
import SafeImg from './icons/SafeImg';
import { TOTALWAR_TIERS } from '../data/totalwarTiers';
import { arenaTierById } from '../data/arenaTiers';
import { backdropDismissProps } from '../utils/backdropDismiss';

const TW_ALL = [
  ...TOTALWAR_TIERS,
  { id: 'legend_plus', label: '전설 이상', color: '#f472b6', iconUrl: '/images/totalwar/legend_plus.png' },
];

function formatScore(n) {
  return (n || 0).toLocaleString('ko-KR');
}

/**
 * 읽기 전용 공개 프로필 — 수정은 본인 마이페이지만.
 */
export default function PublicProfileModal({ uid, onClose }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!uid) {
        setError('프로필을 찾을 수 없습니다.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const snap = await getDoc(doc(db, COL.USERS, uid));
        if (cancelled) return;
        if (!snap.exists()) {
          setError('프로필이 아직 없습니다.');
          setProfile(null);
        } else {
          setProfile(snap.data());
          setError('');
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || '프로필을 불러오지 못했습니다. 로그인이 필요할 수 있습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [uid]);

  const tw = TW_ALL.find((t) => t.id === profile?.totalwarTier) || TW_ALL[0];
  const arena = arenaTierById(profile?.arenaTier);

  return (
    <ModalScrim style={{ zIndex: 9600 }} {...backdropDismissProps(onClose)}>
      <div
        className="glass-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 380, borderRadius: 20, padding: 28 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#fff' }}>프로필</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}>
            <Icon name="closeBtn" size={18} />
          </button>
        </div>

        {loading && (
          <p style={{ margin: 0, textAlign: 'center', color: '#94a3b8', fontWeight: 700, fontSize: 13 }}>불러오는 중…</p>
        )}
        {!loading && error && (
          <p style={{ margin: 0, textAlign: 'center', color: '#f87171', fontWeight: 700, fontSize: 13 }}>{error}</p>
        )}
        {!loading && !error && profile && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 84, height: 84, borderRadius: '50%', overflow: 'hidden',
              border: '2px solid var(--border-gold)', background: '#0a0e18',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {profile.photoURL
                ? <SafeImg src={profile.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <Icon name="user" size={36} color="rgba(255,255,255,0.3)" />}
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>{profile.nickname || '이름 없음'}</div>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="glass-inset" style={{ padding: '12px 14px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={tw.iconUrl} alt="" style={{ width: 28, height: 28 }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8' }}>총력전 등급</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: tw.color || '#fff' }}>{tw.label}</div>
                </div>
              </div>
              <div className="glass-inset" style={{ padding: '12px 14px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                {arena
                  ? <img src={arena.iconUrl} alt="" style={{ width: 28, height: 28 }} />
                  : <Icon name="swords" size={22} color="#94a3b8" />}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8' }}>결투장 티어</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>{arena?.label || '미설정'}</div>
                </div>
              </div>
              <div className="glass-inset" style={{ padding: '12px 14px', borderRadius: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', marginBottom: 4 }}>파괴신 3합 평균 점수</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--gold-light)' }}>{formatScore(profile.destructionScore)}</div>
              </div>
            </div>

            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b', fontWeight: 700, textAlign: 'center' }}>
              보기 전용 · 수정은 본인 마이페이지에서만 가능합니다
            </p>
          </div>
        )}
      </div>
    </ModalScrim>
  );
}

/** 작성자 아바타+닉 — authorId 있을 때만 클릭 가능 */
export function AuthorMeta({
  author,
  authorId,
  updatedAt,
  prefix = '수정 및 고정자',
  onOpenProfile,
}) {
  const clickable = Boolean(authorId && onOpenProfile);
  return (
    <div className="build-title-meta" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {prefix ? <span>{prefix}:</span> : null}
      <button
        type="button"
        disabled={!clickable}
        onClick={() => clickable && onOpenProfile(authorId)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: 0, border: 'none', background: 'none',
          cursor: clickable ? 'pointer' : 'default',
          color: 'inherit', font: 'inherit',
        }}
        title={clickable ? '프로필 보기' : undefined}
      >
        <AuthorAvatar uid={authorId} nickname={author} size={22} />
        <strong>{author || '알 수 없음'}</strong>
      </button>
      {updatedAt ? <span>({updatedAt})</span> : null}
    </div>
  );
}

function AuthorAvatar({ uid, nickname, size = 22 }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let cancelled = false;
    if (!uid) {
      setUrl(null);
      return undefined;
    }
    getDoc(doc(db, COL.USERS, uid)).then((snap) => {
      if (cancelled) return;
      setUrl(snap.exists() ? (snap.data()?.photoURL || null) : null);
    }).catch(() => {
      if (!cancelled) setUrl(null);
    });
    return () => { cancelled = true; };
  }, [uid]);

  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
      border: '1px solid rgba(255,255,255,0.25)', background: '#0a0e18',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {url
        ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: Math.max(9, size * 0.4), fontWeight: 900, color: '#94a3b8' }}>
            {(nickname || '?').slice(0, 1)}
          </span>}
    </span>
  );
}
