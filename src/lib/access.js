/**
 * 클라이언트 권한 표시용.
 * 잠금은 firestore.rules 의 isSuperAdmin() 만 유효하다.
 * 버튼을 숨기거나 /ops 주소를 숨기는 것은 UX일 뿐 보안이 아니다.
 */
export function isGoogleUser(user) {
  if (!user) return false;
  return user.providerData?.some((p) => p.providerId === 'google.com')
    || user.providerId === 'google.com';
}
