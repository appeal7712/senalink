import { useEffect, useRef, useState } from 'react';

let _show = () => {};

export function showToast(message, type = 'info') {
  _show({ message, type, id: Date.now() });
}

export default function ToastContainer() {
  const [items, setItems] = useState([]);
  const timersRef = useRef(new Set());

  useEffect(() => {
    _show = (item) => {
      setItems(prev => [...prev.slice(-4), item]);
      const tid = setTimeout(() => {
        timersRef.current.delete(tid);
        setItems(prev => prev.filter(i => i.id !== item.id));
      }, 3500);
      timersRef.current.add(tid);
    };
    return () => {
      _show = () => {};
      timersRef.current.forEach(clearTimeout);
      timersRef.current.clear();
    };
  }, []);

  if (!items.length) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'none', maxWidth: 'min(400px, 90vw)',
    }}>
      {items.map((item) => (
        <div key={item.id} style={{
          padding: '12px 20px', borderRadius: 12, fontSize: 13, fontWeight: 800,
          color: '#fff', textAlign: 'center', pointerEvents: 'auto',
          background: item.type === 'error' ? 'rgba(239,68,68,0.92)'
            : item.type === 'success' ? 'rgba(34,197,94,0.92)'
            : 'rgba(16,18,24,0.92)',
          border: '1px solid rgba(255,255,255,0.14)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(12px)',
          animation: 'toastIn 0.25s ease',
        }}>
          {item.message}
        </div>
      ))}
    </div>
  );
}
