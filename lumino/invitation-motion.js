// 모든 레이어는 같은 5.2초 타임라인을 공유합니다.
const soft = 'cubic-bezier(.22,.61,.36,1)';
const silk = 'cubic-bezier(.45,0,.2,1)';
export const invitationMotion = [
  {
    selector: '.invitation-ribbon',
    frames: [
      { offset: 0, opacity: 1, transform: 'translateY(0) scale(1)' },
      { offset: .08, opacity: 1, transform: 'translateY(-5%) scale(1.03)', easing: soft },
      { offset: .24, opacity: 0, transform: 'translateY(30%) scale(.9)' },
      { offset: 1, opacity: 0, transform: 'translateY(30%) scale(.9)' }
    ]
  },
  {
    selector: '.invitation-flap',
    frames: [
      { offset: 0, transform: 'rotateX(0deg)', zIndex: 5 },
      { offset: .1, transform: 'rotateX(0deg)', zIndex: 5, easing: silk },
      { offset: .27, transform: 'rotateX(-90deg)', zIndex: 5 },
      { offset: .271, transform: 'rotateX(-90.1deg)', zIndex: 1, easing: soft },
      { offset: .48, transform: 'rotateX(-178deg)', zIndex: 1 },
      { offset: 1, transform: 'rotateX(-178deg)', zIndex: 1 }
    ]
  },
  {
    selector: '.invitation-letter',
    frames: [
      { offset: 0, transform: 'translateY(0)', clipPath: 'inset(0 0 34% 0)' },
      { offset: .32, transform: 'translateY(0)', clipPath: 'inset(0 0 34% 0)', easing: silk },
      { offset: .7, transform: 'translateY(-38cqw)', clipPath: 'inset(0 0 0% 0)' },
      { offset: 1, transform: 'translateY(-38cqw)', clipPath: 'inset(0 0 0% 0)' }
    ]
  },
  {
    selector: '.invitation-letter-copy h2',
    frames: [
      { offset: 0, opacity: .65, transform: 'scale(.96)' },
      { offset: .55, opacity: .65, transform: 'scale(.96)', easing: soft },
      { offset: .79, opacity: 1, transform: 'scale(1)' },
      { offset: 1, opacity: 1, transform: 'scale(1)' }
    ]
  },
  {
    selector: '.invitation-address, .invitation-open-button, .invitation-caption',
    frames: [{ offset: 0, opacity: 1 }, { offset: .1, opacity: 0 }, { offset: 1, opacity: 0 }]
  },
  {
    selector: 'self',
    frames: [{ offset: 0, opacity: 1 }, { offset: .9, opacity: 1, easing: 'ease-in-out' }, { offset: 1, opacity: 0 }]
  }
];
