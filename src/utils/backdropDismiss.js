/** 바깥을 누르고 바깥에서 뗐을 때만 닫기. 안쪽에서 누른 채 밖으로 드래그해 떼면 닫히지 않는다. */
export function backdropDismissProps(onClose) {
  return {
    onPointerDown: (e) => {
      e.currentTarget.dataset.bd = e.target === e.currentTarget ? '1' : '0';
    },
    onPointerUp: (e) => {
      const startedOutside = e.currentTarget.dataset.bd === '1';
      e.currentTarget.dataset.bd = '0';
      if (startedOutside && e.target === e.currentTarget) onClose?.();
    },
  };
}
