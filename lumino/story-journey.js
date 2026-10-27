// 페이지 확인 여부는 이 방문에만 보관합니다. 기존 스탬프 저장 형식은 유지합니다.
export function bindStoryJourney({ root, end, link, store, view = window }) {
  if (!root || !end || !link) return () => {};
  let scrolled = false;
  let seenEnd = false;
  const imagesReady = () => [...root.querySelectorAll('img')].every(image => image.complete && image.naturalWidth > 0);
  const ready = () => root.dataset.portfolioStatus === 'ready' && imagesReady();
  const check = () => {
    if (!ready()) { seenEnd = false; return; }
    const rect = end.getBoundingClientRect();
    if (scrolled && rect.top >= 0 && rect.bottom <= view.innerHeight && view.document.visibilityState !== 'hidden') seenEnd = true;
  };
  const scroll = () => { scrolled = true; check(); };
  const reset = () => { scrolled = false; seenEnd = false; };
  const click = event => {
    // 새 탭·보조 클릭은 이 탭에서의 완료 동작으로 처리하지 않습니다.
    if (event.defaultPrevented || event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (ready() && seenEnd) {
      // storyRead/ribbonFound는 기존 CUTE 기록과 호환하기 위한 저장 필드입니다.
      store.update({ storyRead: true, ribbonFound: true });
    }
    // 로딩 실패나 미확인 상태에도 기존 링크 이동은 막지 않습니다.
  };
  const imageError = () => { seenEnd = false; };
  view.addEventListener('scroll', scroll, { passive: true });
  view.addEventListener('resize', check);
  root.addEventListener('story-portfolio-state', reset);
  root.addEventListener('load', check, true);
  root.addEventListener('error', imageError, true);
  link.addEventListener('click', click);
  return () => {
    view.removeEventListener('scroll', scroll);
    view.removeEventListener('resize', check);
    root.removeEventListener('story-portfolio-state', reset);
    root.removeEventListener('load', check, true);
    root.removeEventListener('error', imageError, true);
    link.removeEventListener('click', click);
  };
}
