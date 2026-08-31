/** Firestore 경로 — 규칙(firestore.rules)과 클라이언트 경로를 맞출 때 여기만 본다 */

export const COL = {
  ADMINS: 'admins',
  SITE: 'site',
  HUBS: 'hubs',
  INVITE_INDEX: 'inviteIndex',
  PUBLIC_GUILDS: 'publicGuilds',
  USERS: 'users',
  PROFILE_DAILY_RECOMMENDS: 'profileDailyRecommends',
  COMMUNITY_GUIDES: 'communityGuides',
  COMMUNITY_TIER_LISTS: 'communityTierLists',
  EXCLUSIVE_GEAR_GUIDES: 'exclusiveGearGuides',
};

export const EXCLUSIVE_GEAR_GUIDE_DOC_ID = 'main';

export const profileDailyRecommendDocId = (fromUid, toUid, day) => `${fromUid}_${toUid}_${day}`;


export const communityGuideDoc = (guideId) => [COL.COMMUNITY_GUIDES, guideId];
export const communityTierListDoc = (listId) => [COL.COMMUNITY_TIER_LISTS, listId];
export const exclusiveGearGuideDoc = (docId) => [COL.EXCLUSIVE_GEAR_GUIDES, docId];

export const SITE_MAIN_ID = 'main';

export const SITE_MAIN_DOC = [COL.SITE, SITE_MAIN_ID];

export const adminDoc = (uid) => [COL.ADMINS, uid];
export const hubDoc = (hubId) => [COL.HUBS, hubId];
export const hubMembersCol = (hubId) => [COL.HUBS, hubId, 'members'];
export const hubMemberDoc = (hubId, uid) => [COL.HUBS, hubId, 'members', uid];
export const inviteDoc = (code) => [COL.INVITE_INDEX, code];
