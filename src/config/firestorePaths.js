/** Firestore 경로 — 규칙(firestore.rules)과 클라이언트 경로를 맞출 때 여기만 본다 */

export const COL = {
  ADMINS: 'admins',
  SITE: 'site',
  HUBS: 'hubs',
  INVITE_INDEX: 'inviteIndex',
  PUBLIC_GUILDS: 'publicGuilds',
  USERS: 'users',
  COMMUNITY_GUIDES: 'communityGuides',
};

export const communityGuideDoc = (guideId) => [COL.COMMUNITY_GUIDES, guideId];

export const SITE_MAIN_ID = 'main';

export const SITE_MAIN_DOC = [COL.SITE, SITE_MAIN_ID];

export const adminDoc = (uid) => [COL.ADMINS, uid];
export const hubDoc = (hubId) => [COL.HUBS, hubId];
export const hubMembersCol = (hubId) => [COL.HUBS, hubId, 'members'];
export const hubMemberDoc = (hubId, uid) => [COL.HUBS, hubId, 'members', uid];
export const inviteDoc = (code) => [COL.INVITE_INDEX, code];
