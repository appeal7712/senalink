/** test = 임시 오픈 허브 / formal = 정식 서비스용 */
export const DEPLOY_MODE = 'formal';
export const isTestDeploy = DEPLOY_MODE === 'test';

/**
 * 길드 허브 입장용 구글 로그인.
 * 정식: true (구글 계정 하나 = 허브 하나). /ops 슈퍼관리자는 이 플래그와 무관하게 구글을 쓴다.
 */
export const USE_GOOGLE_AUTH = true;
