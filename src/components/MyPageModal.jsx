import { useEffect, useRef, useState } from 'react';
import Icon from './icons/Icon';
import ModalScrim from './ModalScrim';
import { useUserProfile } from '../context/UserProfileContext';
import { uploadAvatar } from '../lib/avatarUpload';
import { TOTALWAR_TIERS } from '../data/totalwarTiers';
import { backdropDismissProps } from '../utils/backdropDismiss';

const ALL_TIERS = [
  ...TOTALWAR_TIERS,
  { id: 'legend_plus', label: '전설 이상', deckCount: 5, color: '#f472b6', iconUrl: '/images/totalwar/legend.png' },
];

const formatScore = (n) => (n || 0).toLocaleString('ko-KR');
const parseScore = (s) => Number(String(s).replace(/[^0-9]/g, '')) || 0;

export default function MyPageModal({ onClose }) {
  const { authUser, profile, saveProfile } = useUserProfile();
  const [nickname, setNickname] = useState(profile.nickname || '');
  const [tier, setTier] = useState(profile.totalwarTier || 'normal');
  const [scoreRaw, setScoreRaw] = useState(formatScore(profile.destructionScore));
  const [photoPreview, setPhotoPreview] = useState(profile.photoURL || null);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const blobUrlRef = useRef(null);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    const url = URL.createObjectURL(f);
    blobUrlRef.current = url;
    setPhotoPreview(url);
  };

  const handleScoreChange = (e) => {
    const num = parseScore(e.target.value);
    setScoreRaw(num ? formatScore(num) : '');
  };

  const handleSave = async () => {
    const trimmed = nickname.trim();
    if (trimmed.length < 2 || trimmed.length > 12) {
      setError('닉네임은 2~12자로 입력해 주세요.');
      return;
    }
    if (/[<>"'&\\]/.test(trimmed)) {
      setError('닉네임에 특수문자(<>"\'&\\)는 사용할 수 없습니다.');
      return;
    }
    try {
      setSaving(true);
      setError('');
      let photoURL = profile.photoURL || null;
      if (file && authUser?.uid) {
        photoURL = await uploadAvatar(authUser.uid, file);
      }
      await saveProfile({
        nickname: trimmed,
        totalwarTier: tier,
        destructionScore: parseScore(scoreRaw),
        photoURL,
      });
      onClose();
    } catch (err) {
      setError(err.message || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '11px 12px', background: '#07090e',
    border: '1px solid var(--border-gold)', color: '#fff', borderRadius: '8px',
    fontSize: '14px', fontWeight: 800, boxSizing: 'border-box',
  };

  return (
    <ModalScrim {...backdropDismissProps(onClose)}>
      <div className="glass-modal" onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 420, borderRadius: 20, padding: 28, maxHeight: 'min(92dvh, 92vh)', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#fff' }}>마이페이지</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20, gap: 10 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', overflow: 'hidden',
            border: '2px solid var(--border-gold)', background: '#0a0e18',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {photoPreview
              ? <img src={photoPreview} alt="프로필" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <Icon name="user" size={36} color="rgba(255,255,255,0.3)" />}
          </div>
          <button type="button" className="btn-ops" style={{ padding: '6px 14px', fontSize: 12 }}
            onClick={() => fileRef.current?.click()}>
            사진 변경
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png" onChange={handleFile}
            style={{ display: 'none' }} />
        </div>

        <label style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 4, display: 'block', textAlign: 'center' }}>닉네임 (2~12자)</label>
        <input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="닉네임 입력"
          maxLength={12} style={{ ...inputStyle, marginBottom: 14, textAlign: 'center' }} />

        <label style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 6, display: 'block', textAlign: 'center' }}>총력전 등급</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6, justifyContent: 'center' }}>
          {ALL_TIERS.slice(0, 4).map((t) => (
            <button key={t.id} type="button"
              onClick={() => setTier(t.id)}
              style={{
                padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 800,
                border: tier === t.id ? `2px solid ${t.color}` : '1px solid rgba(255,255,255,0.14)',
                background: tier === t.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: t.color, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              }}>
              <img src={t.iconUrl} alt="" style={{ width: 18, height: 18 }} />
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          {ALL_TIERS.slice(4).map((t) => (
            <button key={t.id} type="button"
              onClick={() => setTier(t.id)}
              style={{
                padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 800,
                border: tier === t.id ? `2px solid ${t.color}` : '1px solid rgba(255,255,255,0.14)',
                background: tier === t.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: t.color, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              }}>
              <img src={t.iconUrl} alt="" style={{ width: 18, height: 18 }} />
              {t.label}
            </button>
          ))}
        </div>

        <label style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 4, display: 'block', textAlign: 'center' }}>파괴신 3합 점수</label>
        <input value={scoreRaw} onChange={handleScoreChange} placeholder="예: 34,555,000"
          inputMode="numeric" style={{ ...inputStyle, marginBottom: 18, textAlign: 'center' }} />

        {error && <div style={{ color: '#fca5a5', fontSize: 13, fontWeight: 800, marginBottom: 10, textAlign: 'center' }}>{error}</div>}

        <button type="button" className="btn-ops" disabled={saving}
          onClick={handleSave}
          style={{ width: '100%', padding: '13px 0', fontSize: 15, fontWeight: 900, justifyContent: 'center' }}>
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </ModalScrim>
  );
}
