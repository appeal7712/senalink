import { useEffect, useRef, useState } from 'react';
import Icon from '../icons/Icon';
import { hubRoleIconName } from '../../data/uiIcons';
import {
  HUB_EMBLEMS,
  LOUNGE_AFFILIATIONS,
  LOUNGE_TAGS,
  MAX_LOUNGE_TAGS,
  loungeTagLabel,
} from '../../data/loungeMeta';
import { useLounge } from '../../context/LoungeContext';
import { formatJoinedAt, formatLastActive } from '../../lib/formatTime';
import { copyText, inviteLink } from '../../lib/invite';
import { backdropDismissProps } from '../../utils/backdropDismiss';
import { compressEmblemFile, uploadHubEmblem } from '../../lib/hubEmblem';
import CopyNotice from './CopyNotice';
import GuildRankBars from './GuildRankBars';
import ModalScrim from '../ModalScrim';
import GuildMark from '../GuildMark';
import { showToast } from '../Toast';

const ROLE_LABEL = { master: '길드마스터', admin: '관리자', member: '길드원', super: '슈퍼관리자' };

const inputStyle = {
  width: '100%', padding: '10px 12px', background: '#07090e', border: '1px solid var(--border-gold)',
  color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: 800, boxSizing: 'border-box'
};

export default function LoungeHubHeader() {
  const {
    activeLounge, me, myRole, isMaster, isAdmin, isSuperAdmin, canManageMembers, canAppointAdmin,
    leaveLounge, updateHubSettings, regenerateInviteCode,
    kickMember, appointAdmin, revokeAdmin, transferMaster, maxMembers, maxAdmins,
  } = useLounge();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [copyNotice, setCopyNotice] = useState('');

  if (!activeLounge || !me) return null;

  const affiliation = LOUNGE_AFFILIATIONS.find(a => a.id === activeLounge.affiliation);
  const emblemId = activeLounge.emblem || 'fortress';
  const tagLabels = (activeLounge.tags || []).map((id) => loungeTagLabel(id));
  const masterNickname = activeLounge.members.find(m => m.role === 'master')?.nickname || '';

  const copyCode = async () => {
    await copyText(activeLounge.inviteCode);
    setCopyNotice('초대 코드를 복사했습니다.');
  };

  const copyLink = async () => {
    await copyText(inviteLink(activeLounge.inviteCode));
    setCopyNotice('초대 링크를 복사했습니다.');
  };

  return (
    <>
      <div className="luxury-panel hub-header">
        <div className="hub-header-main">
          <div className="hub-header-identity">
            <div className="glass-avatar">
              <GuildMark emblem={emblemId} emblemUrl={activeLounge.emblemUrl} size={28} fill />
            </div>
            <div className="hub-header-copy">
              <div className="hub-header-name-row">
                <h2>{activeLounge.name}</h2>
                <span className="kind-pill kind-pill--sm" style={{ background: affiliation?.color || '#3dce9a' }}>
                  {affiliation?.label || '길드'}
                </span>
              </div>
              <div className="hub-header-meta">
                {ROLE_LABEL[myRole] || myRole} · {activeLounge.members.length}/{maxMembers}명
                {masterNickname ? ` · 마스터 ${masterNickname}` : ''}
              </div>
              {tagLabels.length > 0 && (
                <div className="hub-header-tags">
                  {tagLabels.map(t => (
                    <span key={t} className="glass-badge" style={{ padding: '4px 10px', fontSize: 11 }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="hub-header-ranks">
            <GuildRankBars
              lounge={activeLounge}
              canEdit={canManageMembers || isSuperAdmin}
              showDueMarks={canManageMembers || isSuperAdmin}
              onSave={(patch) => updateHubSettings(patch)}
            />
          </div>

          <div className="hub-header-actions">
            {canManageMembers && (
              <ActionBtn icon="hubMembers" label="길드원 관리" onClick={() => setMembersOpen(true)} tone="cyan" />
            )}
            <ActionBtn icon="copy" label="코드 복사" onClick={copyCode} tone="muted" />
            <ActionBtn icon="copy" label="링크 복사" onClick={copyLink} tone="cyan" />
            {isAdmin && (
              <ActionBtn icon="settings" label="설정" onClick={() => setSettingsOpen(true)} />
            )}
          </div>
        </div>
      </div>

      {settingsOpen && (
        <HubSettingsModal
          onClose={() => setSettingsOpen(false)}
          lounge={activeLounge}
          isMaster={isMaster || isSuperAdmin}
          isAdmin={isAdmin}
          updateHubSettings={updateHubSettings}
          regenerateInviteCode={regenerateInviteCode}
        />
      )}
      {membersOpen && (
        <HubMembersModal
          onClose={() => setMembersOpen(false)}
          lounge={activeLounge}
          me={me}
          canAppointAdmin={canAppointAdmin}
          canManageMembers={canManageMembers}
          kickMember={kickMember}
          appointAdmin={appointAdmin}
          revokeAdmin={revokeAdmin}
          transferMaster={transferMaster}
          maxAdmins={maxAdmins}
          maxMembers={maxMembers}
        />
      )}
      <CopyNotice message={copyNotice} onClose={() => setCopyNotice('')} />
      {leaveOpen && (
        <ModalShell title="허브 나가기" onClose={() => setLeaveOpen(false)}>
          <p style={{ margin: 0, fontSize: '14px', color: '#fff', fontWeight: 600, lineHeight: 1.55 }}>
            이 길드 허브에서 나갈까요? 멤버 목록에서 빠지고, 다시 들어오려면 초대 코드가 필요합니다.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={() => setLeaveOpen(false)} className="btn-steel" style={{ flex: 1, padding: '12px', justifyContent: 'center' }}>
              취소
            </button>
            <button
              type="button"
              onClick={() => {
                setLeaveOpen(false);
                void leaveLounge().catch((e) => {
                  showToast(e?.message || '허브 나가기에 실패했습니다.', 'error');
                });
              }}
              className="btn-ops"
              style={{ flex: 1, padding: '12px', justifyContent: 'center', background: 'rgba(239,68,68,0.92)', color: '#fff' }}
            >
              나가기
            </button>
          </div>
        </ModalShell>
      )}
    </>
  );
}

function ActionBtn({ icon, label, onClick, tone = 'gold' }) {
  const tones = {
    gold: { bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.14)', color: '#fff' },
    cyan: { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)', color: '#fff' },
    muted: { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.14)', color: '#fff' },
    red: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.4)', color: '#fca5a5' },
  }[tone];
  return (
    <button type="button" onClick={onClick} className="hub-action-btn"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        padding: '8px 12px', borderRadius: '999px', cursor: 'pointer', fontWeight: 600, fontSize: '12px',
        background: tones.bg, border: `1px solid ${tones.border}`, color: tones.color,
        whiteSpace: 'nowrap', flexShrink: 0,
      }}>
      <Icon name={icon} size={13} color={tones.color} /> {label}
    </button>
  );
}

function HubSettingsModal({ onClose, lounge, isMaster, isAdmin, updateHubSettings, regenerateInviteCode }) {
  const [name, setName] = useState(lounge.name || '');
  const [affiliation, setAffiliation] = useState(lounge.affiliation || 'lounge');
  const [tags, setTags] = useState([...(lounge.tags || [])]);
  const [emblem, setEmblem] = useState(lounge.emblem || 'fortress');
  const [emblemUrl, setEmblemUrl] = useState(lounge.emblemUrl || '');
  const [pendingMark, setPendingMark] = useState(null);
  const [description, setDescription] = useState(lounge.description || '');
  const [error, setError] = useState('');
  const [markBusy, setMarkBusy] = useState(false);
  const markPreviewRef = useRef(null);

  useEffect(() => () => {
    if (markPreviewRef.current) URL.revokeObjectURL(markPreviewRef.current);
  }, []);

  const toggleTag = (id) => {
    setTags(prev => {
      if (prev.includes(id)) return prev.filter(t => t !== id);
      if (prev.length >= MAX_LOUNGE_TAGS) return prev;
      return [...prev, id];
    });
  };

  const clearPendingMarkPreview = () => {
    if (markPreviewRef.current) {
      URL.revokeObjectURL(markPreviewRef.current);
      markPreviewRef.current = null;
    }
    setPendingMark(null);
  };

  const save = async () => {
    try {
      setError('');
      if (isAdmin) {
        let nextEmblemUrl = emblemUrl || null;
        let nextEmblem = emblem;
        if (pendingMark) {
          setMarkBusy(true);
          nextEmblemUrl = await uploadHubEmblem(lounge.id, pendingMark);
          nextEmblem = 'custom';
          clearPendingMarkPreview();
          setEmblemUrl(nextEmblemUrl);
          setEmblem(nextEmblem);
        }
        if (nextEmblemUrl?.startsWith('blob:')) {
          throw new Error('길드 마크 업로드가 끝나지 않았습니다. 다시 올려 주세요.');
        }
        const patch = {
          name,
          affiliation,
          tags,
          emblem: nextEmblem,
          emblemUrl: nextEmblemUrl || null,
          description,
        };
        await updateHubSettings(patch);
      }
      onClose();
    } catch (e) {
      setError(e.message || '저장에 실패했습니다.');
    } finally {
      setMarkBusy(false);
    }
  };

  const regen = async () => {
    try {
      if (!confirm('초대 코드를 새로 발급할까요? 기존 코드는 더 이상 사용할 수 없습니다.')) return;
      const code = await regenerateInviteCode();
      alert(`새 초대 코드: ${code}`);
    } catch (e) {
      alert(e.message);
    }
  };

  const onPickMark = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setError('');
      setMarkBusy(true);
      const blob = await compressEmblemFile(file);
      if (markPreviewRef.current) URL.revokeObjectURL(markPreviewRef.current);
      const preview = URL.createObjectURL(blob);
      markPreviewRef.current = preview;
      setPendingMark(blob);
      setEmblemUrl(preview);
      setEmblem('custom');
    } catch (err) {
      setError(err.message || '마크를 올리지 못했습니다.');
    } finally {
      setMarkBusy(false);
    }
  };

  return (
    <ModalShell title="허브 설정" onClose={onClose} wide={isAdmin}>
      {isAdmin && (
        <>
          <Field label="길드 마크">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <div className="glass-avatar" style={{ width: 52, height: 52 }}>
                <GuildMark emblem={emblem} emblemUrl={emblemUrl} size={26} fill />
              </div>
              <label className="btn-steel" style={{ padding: '8px 12px', fontSize: '12px', cursor: markBusy ? 'wait' : 'pointer' }}>
                {markBusy ? '준비 중…' : '이미지 올리기'}
                <input type="file" accept="image/*" onChange={onPickMark} hidden disabled={markBusy} />
              </label>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>
                저장 시 반영 · 덮어쓰기
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
              {HUB_EMBLEMS.map(e => {
                const active = !emblemUrl && emblem === e.id;
                return (
                  <button key={e.id} type="button" onClick={() => {
                    clearPendingMarkPreview();
                    setEmblem(e.id);
                    setEmblemUrl('');
                  }}
                    style={{
                      padding: '10px 6px', borderRadius: '10px', cursor: 'pointer',
                      background: active ? 'rgba(255,255,255,0.86)' : 'rgba(255,255,255,0.06)',
                      border: active ? '1px solid transparent' : '1px solid rgba(255,255,255,0.12)',
                      color: active ? '#161616' : 'var(--text-muted)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                      fontSize: '10px', fontWeight: 800
                    }}>
                    <Icon name={e.id} size={20} color={active ? '#161616' : 'var(--text-muted)'} />
                    {e.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="길드 이름">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <input value={name} onChange={e => setName(e.target.value)} style={{ ...inputStyle, flex: '1 1 180px', minWidth: 0 }} />
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {LOUNGE_AFFILIATIONS.map(a => {
                  const active = affiliation === a.id;
                  return (
                    <button key={a.id} type="button" onClick={() => setAffiliation(a.id)}
                      className="kind-pill kind-pill--sm"
                      style={{
                        cursor: 'pointer', border: 'none',
                        background: active ? a.color : 'rgba(255,255,255,0.10)',
                        color: active ? '#161616' : 'var(--text-muted)',
                      }}>
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </Field>

          <Field label="한 줄 소개 (선택)">
            <input
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, 120))}
              placeholder="길드 분위기나 모집 포인트를 짧게"
              style={inputStyle}
            />
          </Field>

          <Field label={`해시태그 (${tags.length}/${MAX_LOUNGE_TAGS})`}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {LOUNGE_TAGS.map(t => {
                const active = tags.includes(t.id);
                return (
                  <button key={t.id} type="button" onClick={() => toggleTag(t.id)}
                    style={{
                      padding: '6px 10px', borderRadius: '999px', cursor: 'pointer', fontSize: '11px', fontWeight: 900,
                      background: active ? 'rgba(255,255,255,0.86)' : 'rgba(255,255,255,0.06)',
                      border: active ? '1px solid transparent' : '1px solid rgba(255,255,255,0.12)',
                      color: active ? '#161616' : 'var(--text-muted)'
                    }}>
                    {t.label}
                  </button>
                );
              })}
            </div>
          </Field>

          {isMaster && (
            <button type="button" onClick={regen} className="btn-steel" style={{
              padding: '10px 12px', fontSize: '12px', alignSelf: 'flex-start'
            }}>
              초대 코드 재발급
            </button>
          )}
        </>
      )}

      {error && <div style={{ color: '#fca5a5', fontSize: '13px', fontWeight: 800 }}>{error}</div>}

      <button type="button" onClick={save} className="btn-ops" style={{ padding: '12px', justifyContent: 'center', fontSize: '14px' }}>
        <Icon name="save" size={14} /> 저장
      </button>
    </ModalShell>
  );
}

function HubMembersModal({
  onClose, lounge, me, canAppointAdmin, canManageMembers,
  kickMember, appointAdmin, revokeAdmin, transferMaster, maxAdmins, maxMembers,
}) {
  const sorted = [...lounge.members].sort((a, b) => {
    const rank = { master: 0, admin: 1, member: 2 };
    return (rank[a.role] ?? 9) - (rank[b.role] ?? 9) || a.nickname.localeCompare(b.nickname, 'ko');
  });

  const onKick = async (id) => {
    try {
      if (!confirm('이 길드원을 추방할까요?')) return;
      await kickMember(id);
    } catch (e) {
      alert(e.message);
    }
  };

  const onTransfer = async (id, nick) => {
    try {
      if (!confirm(`${nick} 님에게 길드마스터를 위임할까요?\n위임 후 당신은 관리자(또는 길드원)로 변경됩니다.`)) return;
      await transferMaster(id);
      alert('길드마스터를 위임했습니다.');
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <ModalShell title="길드원 관리" onClose={onClose} wide>
      <div style={{ marginBottom: '4px' }}>
        <div style={{ fontSize: '12px', color: '#fff', fontWeight: 700 }}>
          {lounge.members.length}/{maxMembers}명 · 관리자 {lounge.members.filter(m => m.role === 'master' || m.role === 'admin').length}/{maxAdmins}
          <span style={{ marginLeft: '10px', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.65)' }}>
            마스터 = 전체 권한 · 관리자 = 공지·추방·점수 (위임·다른 관리자 추방 불가)
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '60vh', overflowY: 'auto' }}>
        {sorted.map(m => {
          const showTransfer = canAppointAdmin && m.id !== me.id && m.role !== 'master';
          const showAppoint = canAppointAdmin && m.role === 'member';
          const showRevoke = canAppointAdmin && m.role === 'admin';
          const showKick = canManageMembers && m.id !== me.id && m.role !== 'master';
          const hasActions = showTransfer || showAppoint || showRevoke || showKick;
          return (
            <div key={m.id} className="glass-inset" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
              padding: '12px', textAlign: 'center',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '8px 10px', flexWrap: 'wrap',
              }}>
                <strong style={{ color: '#fff', fontSize: '14px' }}>{m.nickname}</strong>
                <span style={{
                  fontSize: '11px', fontWeight: 900, padding: '3px 8px', borderRadius: '999px',
                  background: m.role === 'master' ? 'var(--gold-primary)' : m.role === 'admin' ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.08)',
                  color: m.role === 'master' ? '#000' : m.role === 'admin' ? '#7dd3fc' : '#fff',
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                }}>
                  {hubRoleIconName(m.role) ? <Icon name={hubRoleIconName(m.role)} size={13} /> : null}
                  {ROLE_LABEL[m.role]}
                </span>
                <span style={{ fontSize: '11px', color: '#fff' }}>
                  {m.googleEmail || m.googleName || `입장 ${formatJoinedAt(m.joinedAt)}`}
                </span>
                <span style={{ fontSize: '11px', color: '#fff' }}>
                  {m.googleEmail || m.googleName ? `입장 ${formatJoinedAt(m.joinedAt)} · ` : ''}{formatLastActive(m.lastActiveAt)}
                </span>
              </div>
              {hasActions && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {showTransfer && (
                    <MiniBtn onClick={() => onTransfer(m.id, m.nickname)} label="마스터 위임" tone="gold" />
                  )}
                  {showAppoint && (
                    <MiniBtn onClick={async () => { try { await appointAdmin(m.id); } catch (e) { alert(e.message); } }} label="관리자 임명" tone="cyan" />
                  )}
                  {showRevoke && (
                    <MiniBtn onClick={async () => { try { await revokeAdmin(m.id); } catch (e) { alert(e.message); } }} label="관리자 해제" tone="muted" />
                  )}
                  {showKick && (
                    <MiniBtn onClick={() => onKick(m.id)} label="추방" tone="red" />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
}

function ModalShell({ title, onClose, children, wide }) {
  return (
    <ModalScrim style={{ padding: '16px' }}
      {...backdropDismissProps(onClose)}>
      <div className="glass-modal" onClick={e => e.stopPropagation()} style={{
        width: wide ? 'min(560px, 96vw)' : 'min(440px, 96vw)', maxHeight: '90vh', overflowY: 'auto',
        padding: '22px', borderRadius: '28px',
        display: 'flex', flexDirection: 'column', gap: '14px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff' }}>{title}</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <Icon name="closeBtn" size={18} />
          </button>
        </div>
        {children}
      </div>
    </ModalScrim>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: '12px', color: '#fff', fontWeight: 700, marginBottom: '7px' }}>{label}</div>
      {children}
    </div>
  );
}

function MiniBtn({ onClick, label, tone }) {
  const styles = {
    gold: { background: 'rgba(255,255,255,0.86)', border: '1px solid transparent', color: '#161616' },
    cyan: { background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.16)', color: '#fff' },
    red: { background: 'rgba(239,68,68,0.15)', border: '1px solid var(--accent-red)', color: '#fca5a5' },
    muted: { background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' },
  }[tone] || {};
  return (
    <button type="button" onClick={onClick}
      style={{ padding: '5px 10px', fontSize: '11px', fontWeight: 900, borderRadius: '7px', cursor: 'pointer', ...styles }}>
      {label}
    </button>
  );
}
