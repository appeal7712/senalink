/** 메인페이지 골격값. 실제 내용은 전부 Firestore site/main 이 담당한다.
 *  덱·픽률 같은 표시용 데이터를 여기에 넣어 두면 스냅샷이 도착하기 전
 *  1프레임 동안 화면에 스쳐 보이므로 비워 둔다. */

export const SITE_MAIN_DEFAULTS = {
  headline: '세븐나이츠 리버스 | 세나링크',
  subhead: '길드허브를 가입해서 길드원들끼리 공략을 공유하세요!',
  highlight: {
    title: '',
    subtitle: '',
    badge: '',
  },
  metaDecks: [],
  pickRates: [],
  news: [],
  entranceBanner: {
    enabled: false,
    title: '',
    body: '',
    updatedAt: '',
  },
};
