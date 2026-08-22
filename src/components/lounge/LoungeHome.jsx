import { useRef, useState } from 'react';
import Icon from '../icons/Icon';
import { LOUNGE_AFFILIATIONS, LOUNGE_TAGS } from '../../data/loungeMeta';
import { useLounge } from '../../context/LoungeContext';
import { formatJoinedAt, formatLastActive } from '../../lib/formatTime';
import { backdropDismissProps } from '../../utils/backdropDismiss';
import { showToast } from '../Toast';
import ModalScrim from '../ModalScrim';

const ROLE_LABEL = { master: '길드마스터', admin: '관리자', member: '길드원', super: '슈퍼관리자' };
const ACTION_LABEL = {
  create_lounge: '허브 생성',
  join: '입장',
  leave: '나가기',
  kick: '추방',
  appoint_admin: '관리자 임명',
  revoke_admin: '관리자 해제',
  transfer_master: '마스터 위임',
  rename: '닉네임 변경',
  notice: '공지',
  post: '게시글',
  delete_notice: '공지 삭제',
  delete_post: '게시글 삭제',
  update_hub: '허브 설정',
  regen_invite: '초대코드 재발급',
  create_build: '공략 생성',
  update_build: '공략 수정',
  delete_build: '공략 삭제',
};

const MAX_IMAGES = 4;
/**
 * 첨부 이미지는 base64로 Firestore 문서에 함께 저장된다.
 * 문서 한도(1MiB)를 넘기면 글 자체가 저장되지 않으므로 여유를 두고 상한을 건다.
 */
const MAX_SINGLE_IMAGE_BYTES = 200_000;
const MAX_IMAGES_TOTAL_BYTES = 700_000;
/** 상한에 걸리면 화질·크기를 순서대로 낮춰 재인코딩한다. */
const COMPRESS_STEPS = [
  { edge: 1280, quality: 0.72 },
  { edge: 1280, quality: 0.6 },
  { edge: 1024, quality: 0.56 },
  { edge: 1024, quality: 0.46 },
  { edge: 860, quality: 0.44 },
  { edge: 720, quality: 0.4 },
  { edge: 600, quality: 0.34 },
];

export default function LoungeHome() {
  const {
    activeLounge, me, canPostNotice, canManageMembers, canAppointAdmin,
    loungeNotices, loungePosts, loungeHistory,
    addNotice, addPost, deleteNotice, deletePost, canDeleteFeedItem,
    kickMember, appointAdmin, revokeAdmin, transferMaster, maxAdmins, maxMembers,
    leaveLounge,
  } = useLounge();

  const [writeMode, setWriteMode] = useState(null); // 'notice' | 'post' | null
  const [err, setErr] = useState('');
  const [lightbox, setLightbox] = useState(null);

  if (!activeLounge || !me) return null;

  const affiliation = LOUNGE_AFFILIATIONS.find(a => a.id === activeLounge.affiliation);
  const tagLabels = (activeLounge.tags || []).map(id => LOUNGE_TAGS.find(t => t.id === id)?.label || id);
  const sortedMembers = [...activeLounge.members].sort((a, b) => {
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

  const onAppoint = async (id) => {
    try {
      await appointAdmin(id);
    } catch (e) {
      alert(e.message);
    }
  };

  const onRevoke = async (id) => {
    try {
      await revokeAdmin(id);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {err && <div style={{ color: '#fca5a5', fontWeight: 800, fontSize: '13px' }}>{err}</div>}

      <div className="luxury-panel" style={{ padding: '18px 20px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
        <span className="kind-pill kind-pill--md" style={{ background: affiliation?.color || '#3dce9a' }}>
          {affiliation?.label || '소속'}
        </span>
        {tagLabels.map(t => (
          <span key={t} style={{
            padding: '5px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 900,
            background: 'rgba(236,232,224,0.14)', border: '1px solid var(--border-gold)', color: 'var(--gold-light)'
          }}>{t}</span>
        ))}
            <span style={{ marginLeft: 'auto', fontSize: '12.5px', color: '#fff', fontWeight: 700 }}>
          멤버 {activeLounge.members.length}/{maxMembers} · 관리자 {activeLounge.members.filter(m => m.role === 'master' || m.role === 'admin').length}/{maxAdmins}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        <section className="luxury-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '7px' }}>
              <Icon name="flame" size={14} /> 공지
            </h3>
            <span style={{ fontSize: '12px', color: '#fff', fontWeight: 700 }}>관리자만 작성</span>
            {canPostNotice && (
              <button type="button" onClick={() => setWriteMode('notice')} className="btn-ops"
                style={{ marginLeft: 'auto', padding: '7px 12px', fontSize: '12px' }}>
                <Icon name="plus" size={12} /> 공지 작성
              </button>
            )}
          </div>
          <FeedList
            items={loungeNotices}
            empty="등록된 공지가 없습니다."
            onImageClick={setLightbox}
            canDeleteItem={canDeleteFeedItem}
            onDelete={async (id) => {
              try {
                if (!confirm('삭제하시겠습니까?')) return;
                await deleteNotice(id);
                showToast('공지가 삭제되었습니다.', 'success');
              } catch (e) {
                showToast(e.message, 'error');
              }
            }}
          />
        </section>

        <section className="luxury-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '7px' }}>
              <Icon name="users" size={14} /> 커뮤니티
            </h3>
            <span style={{ fontSize: '12px', color: '#fff', fontWeight: 700 }}>전원 작성 가능</span>
            <button type="button" onClick={() => setWriteMode('post')} className="btn-ops"
              style={{ marginLeft: 'auto', padding: '7px 12px', fontSize: '12px' }}>
              <Icon name="plus" size={12} /> 글 작성
            </button>
          </div>
          <FeedList
            items={loungePosts}
            empty="아직 게시글이 없습니다."
            onImageClick={setLightbox}
            canDeleteItem={canDeleteFeedItem}
            onDelete={async (id) => {
              try {
                if (!confirm('삭제하시겠습니까?')) return;
                await deletePost(id);
                showToast('게시글이 삭제되었습니다.', 'success');
              } catch (e) {
                showToast(e.message, 'error');
              }
            }}
          />
        </section>
      </div>

      <section className="luxury-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '7px' }}>
            <Icon name="crown" size={14} color="var(--gold-primary)" /> 참여 길드원
          </h3>
          <span style={{ fontSize: '12px', color: '#fff', fontWeight: 700 }}>
            {activeLounge.members.length} / {maxMembers}
          </span>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '8px',
          maxHeight: '360px',
          overflowY: 'auto',
          paddingRight: '2px',
        }}>
          {sortedMembers.map(m => (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 10px', background: 'rgba(255,255,255,0.08)', borderRadius: '12px',
              border: '1px solid var(--border-subtle)', minHeight: '44px'
            }}>
              {m.avatarURL ? (
                <img src={m.avatarURL} alt="" style={{
                  width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                  objectFit: 'cover',
                  border: m.role === 'master' ? '2px solid var(--gold-primary)' : m.role === 'admin' ? '2px solid #7dd3fc' : '1px solid var(--border-subtle)',
                }} loading="lazy" />
              ) : (
                <div style={{
                  width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                  background: m.role === 'master'
                    ? 'linear-gradient(135deg, var(--gold-primary), var(--gold-dark))'
                    : m.role === 'admin' ? 'rgba(56,189,248,0.25)' : 'rgba(255,255,255,0.08)',
                  color: m.role === 'master' ? '#041018' : m.role === 'admin' ? '#7dd3fc' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 900
                }}>
                  {m.nickname.slice(0, 1)}
                </div>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 900, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {m.nickname}
                </div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: m.role === 'master' ? 'var(--accent-gold)' : m.role === 'admin' ? '#7dd3fc' : '#fff' }}>
                  {ROLE_LABEL[m.role]} · {formatLastActive(m.lastActiveAt)}
                </div>
                <div style={{ fontSize: '11px', color: '#fff', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {m.googleEmail || m.googleName || `입장 ${formatJoinedAt(m.joinedAt)}`}
                </div>
              </div>
              {/* 참여 길드원 리스트에서는 액션 버튼을 숨기고, 관리는 '길드원 관리' 모달에서만 수행합니다. */}
            </div>
          ))}
        </div>
      </section>

      <section className="luxury-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Icon name="clock" size={14} /> 활동 히스토리
          <span style={{ fontSize: '12px', color: '#fff', fontWeight: 700 }}>30일 보관 후 자동 삭제</span>
        </h3>
        {loungeHistory.length === 0 && <div style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>기록이 없습니다.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
          {loungeHistory.map(h => (
            <div key={h.id} style={{
              padding: '10px 12px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              display: 'flex', flexDirection: 'column', gap: '4px'
            }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 900, color: 'var(--accent-cyan)' }}>{ACTION_LABEL[h.action] || h.action}</span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>{h.target}</span>
                <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#fff' }}>{new Date(h.createdAt).toLocaleString('ko-KR')}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#fff' }}>{h.actor}{h.detail ? ` · ${h.detail}` : ''}</div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
        <button type="button" className="hub-action-btn" onClick={() => {
          if (confirm('이 길드 허브에서 나갈까요?')) leaveLounge();
        }} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', fontSize: 12, fontWeight: 800,
          background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)',
          color: '#fca5a5', borderRadius: 10, cursor: 'pointer',
        }}>
          <Icon name="logout" size={13} /> 허브 나가기
        </button>
      </div>

      {writeMode && (
        <WritePostModal
          mode={writeMode}
          onClose={() => setWriteMode(null)}
          onSubmit={async (payload) => {
            try {
              setErr('');
              if (writeMode === 'notice') await addNotice(payload);
              else await addPost(payload);
              setWriteMode(null);
              showToast(writeMode === 'notice' ? '공지가 등록되었습니다.' : '게시글이 작성되었습니다.', 'success');
            } catch (e) {
              setErr(e.message);
              showToast(e.message, 'error');
            }
          }}
        />
      )}

      {lightbox && (
        <div
          {...backdropDismissProps(() => setLightbox(null))}
          style={{
            position: 'fixed', inset: 0, zIndex: 6000, background: 'rgba(0,0,0,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', cursor: 'zoom-out'
          }}>
          <img src={lightbox} alt="첨부 이미지" style={{ maxWidth: '96vw', maxHeight: '90vh', borderRadius: '10px', objectFit: 'contain' }} />
        </div>
      )}
    </div>
  );
}

function WritePostModal({ mode, onClose, onSubmit }) {
  const isNotice = mode === 'notice';
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState('');
  const fileRef = useRef(null);

  const addFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      setLocalErr(`이미지는 최대 ${MAX_IMAGES}장까지 첨부할 수 있습니다.`);
      return;
    }
    setBusy(true);
    setLocalErr('');
    try {
      const merged = [...images];
      let total = merged.reduce((sum, src) => sum + src.length, 0);
      let dropped = 0;
      for (const file of files.slice(0, room)) {
        let compressed = null;
        try {
          compressed = await compressImageFile(file);
        } catch {
          dropped += 1;
          continue;
        }
        if (total + compressed.length > MAX_IMAGES_TOTAL_BYTES) {
          dropped += 1;
          continue;
        }
        merged.push(compressed);
        total += compressed.length;
      }
      setImages(merged.slice(0, MAX_IMAGES));
      if (dropped) {
        setLocalErr(`이미지 ${dropped}장은 용량 한도 때문에 첨부하지 못했습니다. 더 작은 이미지를 올려 주세요.`);
      }
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const submit = async () => {
    if (!title.trim() || !body.trim()) {
      setLocalErr('제목과 내용을 입력해 주세요.');
      return;
    }
    if (title.trim().length > 50) {
      setLocalErr('제목은 50자 이내로 입력해 주세요.');
      return;
    }
    if (body.trim().length > 2000) {
      setLocalErr('내용은 2000자 이내로 입력해 주세요.');
      return;
    }
    setBusy(true);
    try {
      await onSubmit({ title, body, images });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalScrim
      style={{ zIndex: 5000, padding: '16px' }}
      {...backdropDismissProps(onClose)}
    >
      <div className="glass-modal" onClick={e => e.stopPropagation()} style={{
        width: 'min(560px, 96vw)', maxHeight: '90vh', overflowY: 'auto',
        padding: '22px', borderRadius: '28px',
        display: 'flex', flexDirection: 'column', gap: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#fff' }}>
            {isNotice ? '공지 작성' : '커뮤니티 글 작성'}
          </h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <Icon name="closeBtn" size={18} />
          </button>
        </div>

        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="제목" maxLength={50} style={fieldInput} />
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={isNotice ? '공지 내용을 입력하세요' : '자유롭게 남겨주세요'}
          maxLength={2000}
          rows={6}
          style={{ ...fieldInput, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy || images.length >= MAX_IMAGES}
            style={{
              padding: '8px 12px', borderRadius: '8px', cursor: busy ? 'wait' : 'pointer', fontWeight: 900, fontSize: '12px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.16)', color: '#e2e8f0',
              display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: images.length >= MAX_IMAGES ? 0.5 : 1
            }}>
            <Icon name="image" size={14} /> 이미지 추가 ({images.length}/{MAX_IMAGES})
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={e => addFiles(e.target.files)}
          />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>jpg/png · 자동 압축</span>
        </div>

        {images.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: '8px' }}>
            {images.map((src, idx) => (
              <div key={idx} style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.12)', aspectRatio: '1' }}>
                <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <button type="button" onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                  style={{
                    position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%',
                    border: 'none', background: 'rgba(0,0,0,0.7)', color: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                  <Icon name="close" size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        {localErr && <div style={{ color: '#fca5a5', fontSize: '13px', fontWeight: 800 }}>{localErr}</div>}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} className="btn-steel" style={{ padding: '10px 14px', fontSize: '12px' }}>
            취소
          </button>
          <button type="button" onClick={submit} disabled={busy} className="btn-ops" style={{ padding: '10px 16px', fontSize: '13px' }}>
            {busy ? '처리 중…' : (isNotice ? '공지 등록' : '게시하기')}
          </button>
        </div>
      </div>
    </ModalScrim>
  );
}

function FeedList({ items, empty, onImageClick, canDeleteItem, onDelete }) {
  if (!items?.length) return <div style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>{empty}</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto' }}>
      {items.map(item => {
        const showDelete = canDeleteItem?.(item);
        return (
          <div key={item.id} style={{ padding: '11px 12px', background: 'rgba(255,255,255,0.08)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#fff', marginBottom: '4px', flex: 1, minWidth: 0 }}>{item.title}</div>
              {showDelete && (
                <button type="button" className="btn-danger-solid" onClick={() => onDelete?.(item.id)}
                  style={{ flexShrink: 0, padding: '5px 9px', fontSize: '11px' }}>
                  삭제
                </button>
              )}
            </div>
            <div style={{ fontSize: '13px', color: '#fff', lineHeight: 1.45, whiteSpace: 'pre-line' }}>{item.body}</div>
            {!!item.images?.length && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: '6px', marginTop: '10px' }}>
                {item.images.map((src, i) => (
                  <button key={i} type="button" onClick={() => onImageClick?.(src)}
                    style={{ padding: 0, border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', overflow: 'hidden', cursor: 'zoom-in', background: '#000', aspectRatio: '1' }}>
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </button>
                ))}
              </div>
            )}
            <div style={{ fontSize: '12px', color: '#fff', marginTop: '6px', fontWeight: 700 }}>{item.author} · {new Date(item.createdAt).toLocaleString('ko-KR')}</div>
          </div>
        );
      })}
    </div>
  );
}

function MiniBtn({ onClick, label, title, tone }) {
  const styles = {
    cyan: { background: 'rgba(56,189,248,0.15)', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)' },
    red: { background: 'rgba(239,68,68,0.15)', border: '1px solid var(--accent-red)', color: '#fca5a5' },
    muted: { background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', color: '#fff' },
  }[tone] || {};
  return (
    <button type="button" onClick={onClick} title={title || label}
      style={{ width: '28px', height: '28px', fontSize: '11px', fontWeight: 900, borderRadius: '7px', cursor: 'pointer', ...styles }}>
      {label}
    </button>
  );
}

function encodeAtStep(img, edge, quality) {
  const scale = Math.min(1, edge / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('decode failed'));
      img.onload = () => {
        let out = '';
        for (const step of COMPRESS_STEPS) {
          out = encodeAtStep(img, step.edge, step.quality);
          if (out.length <= MAX_SINGLE_IMAGE_BYTES) break;
        }
        if (!out || out.length > MAX_SINGLE_IMAGE_BYTES) {
          reject(new Error('too large'));
          return;
        }
        resolve(out);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const fieldInput = {
  width: '100%', padding: '9px 10px', background: '#07090e', border: '1px solid var(--border-gold)',
  color: '#fff', borderRadius: '7px', fontSize: '13px', fontWeight: 800, boxSizing: 'border-box'
};
