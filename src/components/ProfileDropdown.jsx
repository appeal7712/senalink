import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import Icon from './icons/Icon';
import MyPageModal from './MyPageModal';
import { useUserProfile } from '../context/UserProfileContext';
import { auth } from '../lib/firebase';

const googleProvider = new GoogleAuthProvider();

export default function ProfileDropdown() {
  const { authUser, profile } = useUserProfile();
  const [open, setOpen] = useState(false);
  const [myPage, setMyPage] = useState(false);
  const wrapRef = useRef(null);
  const menuRef = useRef(null);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!open) return;
    const el = wrapRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    const close = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const avatar = authUser ? profile.photoURL : null;

  const handleLogin = async () => {
    setOpen(false);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (_) { /* user cancelled */ }
  };

  const menuStyle = {
    position: 'fixed', zIndex: 9000,
    background: 'var(--glass-modal)', border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 14, padding: '6px 0', minWidth: 150,
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)',
  };

  const btnStyle = {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '10px 16px', background: 'none', border: 'none',
    fontSize: 13, fontWeight: 800, cursor: 'pointer',
  };

  return (
    <>
      <div ref={wrapRef} style={{ position: 'relative' }}>
        <button type="button" onClick={() => setOpen(v => !v)}
          aria-label="프로필 메뉴"
          style={{
            width: 32, height: 32, borderRadius: '50%', overflow: 'hidden',
            border: '1.5px solid rgba(255,255,255,0.25)', background: '#0a0e18',
            cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          {avatar
            ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <Icon name="user" size={16} color="rgba(255,255,255,0.5)" />}
        </button>
        {open && pos && createPortal(
          <div ref={menuRef} style={{ ...menuStyle, top: pos.top, right: pos.right }}>
            {authUser ? (
              <>
                <button type="button" onClick={() => { setOpen(false); setMyPage(true); }}
                  style={{ ...btnStyle, color: '#fff' }}>
                  <Icon name="user" size={14} /> 마이페이지
                </button>
                <button type="button" onClick={() => { setOpen(false); signOut(auth); }}
                  style={{ ...btnStyle, color: '#fca5a5' }}>
                  <Icon name="close" size={14} /> 로그아웃
                </button>
              </>
            ) : (
              <button type="button" onClick={handleLogin}
                style={{ ...btnStyle, color: '#93c5fd' }}>
                <Icon name="user" size={14} /> Google 로그인
              </button>
            )}
          </div>,
          document.body,
        )}
      </div>
      {myPage && <MyPageModal onClose={() => setMyPage(false)} />}
    </>
  );
}
