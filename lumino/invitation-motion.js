// 서로 다른 구도의 원본을 찢거나 분리하지 않고, 같은 5.2초 안에서 겹침 전환합니다.
export const invitationMotion = [
  {
    selector: '.invitation-photo-closed',
    frames: [
      { offset: 0, opacity: 1, transform: 'scale(.99) translateY(0)' },
      { offset: .24, opacity: 1, transform: 'scale(1) translateY(0)', easing: 'ease-in-out' },
      { offset: .62, opacity: 0, transform: 'scale(1) translateY(-.4%)' },
      { offset: 1, opacity: 0, transform: 'scale(1) translateY(-.4%)' }
    ]
  },
  {
    selector: '.invitation-photo-open',
    frames: [
      { offset: 0, opacity: 0, transform: 'scale(.985) translateY(.5%)' },
      { offset: .24, opacity: 0, transform: 'scale(.985) translateY(.5%)', easing: 'ease-in-out' },
      { offset: .62, opacity: 1, transform: 'scale(1) translateY(0)' },
      { offset: 1, opacity: 1, transform: 'scale(1) translateY(0)' }
    ]
  },
  {
    selector: '.invitation-open-button',
    frames: [{ offset: 0, opacity: 1 }, { offset: .08, opacity: 0 }, { offset: 1, opacity: 0 }]
  },
  {
    selector: 'self',
    frames: [{ offset: 0, opacity: 1 }, { offset: .9, opacity: 1, easing: 'ease-in-out' }, { offset: 1, opacity: 0 }]
  }
];
