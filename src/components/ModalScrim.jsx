import { createPortal } from 'react-dom';

/** 모든 모달을 body에 올려, 뒤 페이지 블러가 같은 방식으로 걸리게 한다. */
export default function ModalScrim({ className = '', style, children, ...rest }) {
  return createPortal(
    <div className={['modal-scrim', className].filter(Boolean).join(' ')} style={style} {...rest}>
      {children}
    </div>,
    document.body,
  );
}
