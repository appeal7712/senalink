import { backdropDismissProps } from '../../utils/backdropDismiss';
import ModalScrim from '../ModalScrim';

export default function CopyNotice({ message, onClose }) {
  if (!message) return null;
  return (
    <ModalScrim
      style={{ zIndex: 7200, padding: '16px' }}
      {...backdropDismissProps(onClose)}
    >
      <div
        className="glass-modal"
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(380px, 92vw)',
          padding: '22px 20px',
          borderRadius: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', lineHeight: 1.55, whiteSpace: 'pre-line' }}>{message}</div>
        <button type="button" onClick={onClose} className="btn-ops" style={{ justifyContent: 'center' }}>
          확인
        </button>
      </div>
    </ModalScrim>
  );
}
