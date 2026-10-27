import { invitation } from '../data/invitation.js';
import { invitationMotion } from './invitation-motion.js';

export function createInvitation(dialog, { openDialog, onFinish, reducedMotion, lowPower }) {
  let opening = false;
  let run = 0;
  let animations = [];
  let ready;

  function cancelAnimations() {
    animations.forEach(animation => animation.cancel());
    animations = [];
  }

  function show() {
    run++;
    cancelAnimations();
    opening = false;
    dialog.classList.remove('fantasy-invitation');
    dialog.classList.add('photo-invitation');
    dialog.classList.remove('intro-opening', 'intro-still');
    dialog.innerHTML = `
      <div class="invitation-photo-ambient" aria-hidden="true"><img src="${invitation.closed}" alt=""></div>
      <div class="invitation-photo-theatre">
        <div class="invitation-photo-stage">
          <img class="invitation-photo-closed" src="${invitation.closed}" alt="성 배경과 여행 소품 앞에 놓인 핑크 새틴 리본과 별 모양 왁스 실링의 닫힌 초대장" fetchpriority="high" width="1536" height="1024">
          <img class="invitation-photo-open" src="${invitation.open}" alt="열린 핑크 봉투 속 아이보리 카드: LUMINO. A Sparkling Little Journey. A Cozy and Lovely World." aria-hidden="true" width="1536" height="1024">
        </div>
        <button type="button" class="l-btn invitation-open-button" data-action="open-intro" autofocus>OPEN YOUR INVITATION <span aria-hidden="true">›</span></button>
      </div>
      <p class="sr-only" role="status" id="invitation-status"></p>
      <button type="button" class="skip-intro" data-action="skip-intro">SKIP INTRO <span aria-hidden="true">→</span></button>`;
    // 클릭 전부터 부품을 디코딩합니다. 모션 중 네트워크 요청/이미지 교체가 없습니다.
    ready = Promise.allSettled([...dialog.querySelectorAll('img')].map(img => typeof img.decode === 'function' ? img.decode() : Promise.resolve()));
    openDialog('intro-dialog');
  }

  async function open() {
    if (opening || !dialog.open) return;
    opening = true;
    const currentRun = run;
    dialog.querySelectorAll('[data-action="open-intro"]').forEach(button => { button.disabled = true; });
    dialog.querySelector('#invitation-status').textContent = '초대장이 열리고 있습니다.';
    const loaded = await ready;
    if (currentRun !== run || !dialog.open) return;
    if (loaded.some(result => result.status === 'rejected')) {
      opening = false;
      dialog.querySelector('#invitation-status').textContent = '초대장 이미지를 불러오지 못했습니다. SKIP INTRO로 여행을 시작할 수 있습니다.';
      dialog.querySelector('[data-action="open-intro"]').disabled = false;
      return;
    }
    dialog.classList.add('intro-opening');
    dialog.querySelector('.invitation-photo-closed').setAttribute('aria-hidden', 'true');
    dialog.querySelector('.invitation-photo-open').setAttribute('aria-hidden', 'false');

    // 부품마다 같은 시작 시각을 적용합니다. 별도 종료 타이머가 화면을 끊지 않습니다.
    const still = reducedMotion.matches || lowPower;
    dialog.classList.toggle('intro-still', still);
    const duration = still ? 1400 : invitation.duration;
    const startTime = document.timeline.currentTime;
    const motion = still ? invitationMotion.filter(item => item.selector === 'self') : invitationMotion;
    animations = motion.flatMap(({ selector, frames }) => (selector === 'self' ? [dialog] : [...dialog.querySelectorAll(selector)]).map(element => {
      const animation = element.animate(frames, { duration, fill: 'both', easing: 'linear' });
      animation.startTime = startTime;
      return animation;
    }));
    try {
      await Promise.all(animations.map(animation => animation.finished));
      if (currentRun === run && dialog.open) finish();
    } catch { /* SKIP / ESC / 다시 보기로 취소한 재생은 완료 처리하지 않습니다. */ }
  }

  function finish() {
    if (!dialog.open) return;
    run++;
    cancelAnimations();
    dialog.close();
    dialog.classList.remove('intro-opening', 'intro-still');
    opening = false;
    onFinish();
  }
  return { show, open, finish };
}
