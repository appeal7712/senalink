import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import Icon from './icons/Icon';
import MyPageModal from './MyPageModal';
import UiThemeToggle from './UiThemeToggle';
import { useUserProfile } from '../context/UserProfileContext';
import { useLounge } from '../context/LoungeContext';
import { auth } from '../lib/firebase';

const googleProvider = new GoogleAuthProvider();

export default function ProfileDropdown() {
  const { authUser, profile } = useUserProfile();
  const { signOutAccount } = useLounge();
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
    borderRadius: 12, padding: '4px 0',
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)',
  };

  const btnStyle = {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '8px 12px', background: 'none', border: 'none',
    fontSize: 13, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
  };

  return (
    <>
      <div ref={wrapRef} className="gnb-profile" style={{ position: 'relative' }}>
        <button
          type="button"
          className="gnb-profile-btn"
          onClick={() => setOpen(v => !v)}
          aria-label="마이프로필"
        >
          <span className="gnb-profile-label">마이프로필</span>
          <span className="gnb-profile-avatar">
            {avatar
              ? <img src={avatar} alt="" />
              : <Icon name="user" size={15} color="rgba(255,255,255,0.65)" />}
          </span>
        </button>
        {open && pos && createPortal(
          <div ref={menuRef} className="gnb-profile-menu" style={{ ...menuStyle, top: pos.top, right: pos.right }}>
            {authUser ? (
              <>
                <button type="button" onClick={() => { setOpen(false); setMyPage(true); }}
                  style={{ ...btnStyle, color: '#fff' }}>
                  <Icon name="user" size={14} /> 마이페이지
                </button>
                <button type="button" onClick={() => { setOpen(false); void signOutAccount(); }}
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
            <div className="gnb-profile-theme-row">
              <UiThemeToggle />
            </div>
          </div>,
          document.body,
        )}
      </div>
      {myPage && <MyPageModal onClose={() => setMyPage(false)} />}
    </>
  );
}
