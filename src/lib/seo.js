import { PAGE } from '../config/routes';

const SITE_NAME = '세나링크';
const DEFAULT_TITLE = '세나링크 - 세븐나이츠 리버스 공략, 길드 관리 사이트';
const DEFAULT_DESCRIPTION =
  '세븐나이츠 리버스 길드 관리·공략 사이트입니다. 길드 허브에서 공략을 공유하고, 공용 허브·티어리스트·도구로 덱과 메타를 정리하세요.';

/** 검색/탭용 페이지별 타이틀·설명 (사이트링크 후보 문구와 맞춤) */
export const PAGE_SEO = {
  [PAGE.MAIN]: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  [PAGE.HUB]: {
    title: `길드 허브 | ${SITE_NAME}`,
    description: '길드원과 공략·세팅을 공유하는 세븐나이츠 리버스 길드 전용 허브입니다.',
  },
  [PAGE.COMMUNITY]: {
    title: `공용 허브 | ${SITE_NAME}`,
    description: 'PvP·PvE 공략과 티어리스트를 모아보는 세븐나이츠 리버스 공용 허브입니다.',
  },
  [PAGE.TOOLS]: {
    title: `도구 | ${SITE_NAME}`,
    description: '승률 계산, 티어리스트 메이커 등 세븐나이츠 리버스 실전 유틸 모음입니다.',
  },
  [PAGE.DEX]: {
    title: `도감 | ${SITE_NAME}`,
    description: '세븐나이츠 리버스 영웅·장비 정보를 한눈에 보는 도감입니다.',
  },
  [PAGE.OPS]: {
    title: `운영 | ${SITE_NAME}`,
    description: '세나링크 사이트 운영 페이지입니다.',
  },
};

function setMetaByName(name, content) {
  if (!content) return;
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setMetaByProperty(property, content) {
  if (!content) return;
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** 클라이언트 라우트 전환 시 탭 제목·기본 메타 동기화 */
export function applyPageSeo(page) {
  const seo = PAGE_SEO[page] || PAGE_SEO[PAGE.MAIN];
  document.title = seo.title;
  setMetaByName('description', seo.description);
  setMetaByProperty('og:title', seo.title);
  setMetaByProperty('og:description', seo.description);
  setMetaByName('twitter:title', seo.title);
  setMetaByName('twitter:description', seo.description);
}
