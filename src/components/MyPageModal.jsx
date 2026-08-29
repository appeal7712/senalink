import { useEffect, useRef, useState } from 'react';
import Icon from './icons/Icon';
import ModalScrim from './ModalScrim';
import { useUserProfile } from '../context/UserProfileContext';
import { useLounge } from '../context/LoungeContext';
import { uploadAvatar } from '../lib/avatarUpload';
import { TOTALWAR_TIERS } from '../data/totalwarTiers';
import { ARENA_TIERS, normalizeArenaTier } from '../data/arenaTiers';
import { backdropDismissProps } from '../utils/backdropDismiss';

const ALL_TIERS = [
  ...TOTALWAR_TIERS,
  { id: 'legend_plus', label: '전설 이상', deckCount: 5, color: '#f472b6', iconUrl: '/images/totalwar/legend_plus.png' },
];

const formatScore = (n) => (n || 0).toLocaleString('ko-KR');
const parseScore = (s) => Number(String(s).replace(/[^0-9]/g, '')) || 0;

/**
 * mandatory=true 는 최초 로그인 직후 닉네임을 받는 모드.
 * 닉네임을 저장할 때까지 닫을 수 없다. 총력전 등급과 파괴신 점수는 선택.
 */
export default function MyPageModal({ onClose, mandatory = false }) {
  const { authUser, profile, saveProfile } = useUserProfile();
  const { me, updateMyNickname } = useLounge();
  const [nickname, setNickname] = useState(profile.nickname || '');
  const [tier, setTier] = useState(profile.totalwarTier || 'normal');
  const [arenaTier, setArenaTier] = useState(normalizeArenaTier(profile.arenaTier || 'bronze'));
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
      if (me && !me.isSuperAdminObserver && String(me.nickname || '').trim() !== trimmed) {
        await updateMyNickname(trimmed);
      }
      let photoURL = profile.photoURL || null;
      if (file && authUser?.uid) {
        photoURL = await uploadAvatar(authUser.uid, file);
      }
      await saveProfile({
        nickname: trimmed,
        totalwarTier: tier,
        arenaTier,
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

  return (
    <ModalScrim
      style={mandatory ? { zIndex: 9700 } : undefined}
      {...(mandatory ? {} : backdropDismissProps(onClose))}
    >
      <div
        className="glass-modal mypage-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mypage-modal-header">
          <h2 className="mypage-modal-title">
            {mandatory ? '닉네임 설정' : '마이페이지'}
          </h2>
          {!mandatory && (
            <div className="mypage-recommend-chip" title="다른 유저가 내 공개 프로필에서 누른 추천 수">
              <Icon name="thumbUp" size={13} color="var(--accent-cyan)" />
              받은 추천 {(Number(profile.recommendCount) || 0).toLocaleString('ko-KR')}
            </div>
          )}
          {!mandatory && (
            <button type="button" className="mypage-close-btn" onClick={onClose} aria-label="닫기">
              <Icon name="closeBtn" size={18} />
            </button>
          )}
        </header>

        {mandatory && (
          <p className="mypage-mandatory-note">
            사이트에서 사용할 닉네임을 정해 주세요. 길드 허브에서도 이 닉네임으로 표시됩니다.
            총력전 등급과 파괴신 점수는 나중에 입력해도 됩니다.
          </p>
        )}

        <section className="mypage-profile-block" aria-label="프로필">
          <div className="mypage-avatar-wrap">
            {photoPreview
              ? <img src={photoPreview} alt="프로필" className="mypage-avatar-img" />
              : <Icon name="user" size={36} color="rgba(255,255,255,0.3)" />}
          </div>
          <button type="button" className="btn-ops mypage-photo-btn" onClick={() => fileRef.current?.click()}>
            사진 변경
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png" onChange={handleFile} hidden />

          <label className="mypage-field-label" htmlFor="mypage-nickname">닉네임 (2~12자)</label>
          <input
            id="mypage-nickname"
            className="mypage-input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임 입력"
            maxLength={12}
          />
        </section>

        <section className="mypage-stats-panel glass-inset" aria-label="게임 정보">
          <div className="mypage-stats-panel-head">
            <h3 className="mypage-stats-panel-title">게임 정보</h3>
            <p className="mypage-stats-panel-hint">선택 · 공개 프로필에 표시</p>
          </div>

          <div className="mypage-stats-field">
            <span className="mypage-field-label">총력전 등급</span>
            <div className="mypage-tier-grid">
              {ALL_TIERS.slice(0, 4).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`mypage-tier-btn${tier === t.id ? ' is-on' : ''}`}
                  onClick={() => setTier(t.id)}
                  style={{
                    '--tier-color': t.color,
                    borderColor: tier === t.id ? t.color : undefined,
                    color: t.color,
                  }}
                >
                  <img src={t.iconUrl} alt="" />
                  {t.label}
                </button>
              ))}
            </div>
            <div className="mypage-tier-grid mypage-tier-grid--center">
              {ALL_TIERS.slice(4).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`mypage-tier-btn${tier === t.id ? ' is-on' : ''}`}
                  onClick={() => setTier(t.id)}
                  style={{
                    '--tier-color': t.color,
                    borderColor: tier === t.id ? t.color : undefined,
                    color: t.color,
                  }}
                >
                  <img src={t.iconUrl} alt="" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mypage-stats-field">
            <span className="mypage-field-label">결투장 티어</span>
            <div className="mypage-tier-grid">
              {ARENA_TIERS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`mypage-tier-btn mypage-tier-btn--arena${arenaTier === t.id ? ' is-on' : ''}`}
                  onClick={() => setArenaTier(t.id)}
                >
                  <img src={t.iconUrl} alt="" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mypage-stats-field mypage-stats-field--last">
            <label className="mypage-field-label" htmlFor="mypage-destruction-score">파괴신 3합 평균 점수</label>
            <input
              id="mypage-destruction-score"
              className="mypage-input"
              value={scoreRaw}
              onChange={handleScoreChange}
              placeholder="예: 34,555,000"
              inputMode="numeric"
            />
          </div>
        </section>

        {error && <div className="mypage-error">{error}</div>}

        <button
          type="button"
          className="btn-ops mypage-save-btn"
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? '저장 중...' : (mandatory ? '닉네임 저장하고 시작하기' : '저장')}
        </button>
      </div>
    </ModalScrim>
  );
}
