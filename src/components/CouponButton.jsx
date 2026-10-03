import { useEffect, useState } from 'react';
import CouponModal from './CouponModal';
import { countPendingCoupons, loadCoupons } from '../lib/coupons';
import '../styles/coupon.css';

/**
 * GNB 쿠폰 — 일일 타로카드와 마이프로필 사이. 모달에서 UID로 쿠폰 일괄 사용.
 * 저장된 UID 기준 안 쓴 쿠폰이 남아 있으면 초록 테두리(is-live), 다 썼으면 꺼짐.
 * 목록 로딩 전에는 빛나지 않음(is-pending).
 */
export default function CouponButton() {
  const [open, setOpen] = useState(false);
  const [coupons, setCoupons] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let alive = true;
    loadCoupons().then((list) => {
      if (!alive) return;
      setCoupons(list);
      setPendingCount(countPendingCoupons(list));
    });
    return () => {
      alive = false;
    };
  }, []);

  const onClose = () => {
    setOpen(false);
    if (coupons) setPendingCount(countPendingCoupons(coupons));
  };

  const toneClass = !coupons ? ' is-pending' : pendingCount > 0 ? ' is-live' : '';

  return (
    <>
      <button
        type="button"
        className={`gnb-coupon${toneClass}`}
        onClick={() => setOpen(true)}
        aria-label="쿠폰 사용"
        title={pendingCount > 0 ? `사용 가능한 쿠폰 ${pendingCount}개` : '쿠폰 사용'}
      >
        <span className="gnb-coupon-label">쿠폰</span>
      </button>
      {open && <CouponModal onClose={onClose} />}
    </>
  );
}
