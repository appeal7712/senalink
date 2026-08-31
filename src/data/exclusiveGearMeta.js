import generated from './exclusiveGearMeta.generated.json';

/** heroId → { heroName, iconUrl } — scripts/sync_exclusive_gear_from_asset.py 로 갱신 */
export const exclusiveGearByHeroId = generated;

export function getExclusiveGearIconUrl(heroId) {
  return exclusiveGearByHeroId[heroId]?.iconUrl || '';
}

export function heroIdsWithExclusiveGear() {
  return Object.keys(exclusiveGearByHeroId);
}
