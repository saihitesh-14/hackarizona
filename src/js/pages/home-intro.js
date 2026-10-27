// The home page's scroll story, after the ERA Residence reference Sai liked: smooth scrolling (Lenis) and, on wide
// screens, a pinned hero that changes as you scroll (GSAP ScrollTrigger, scrubbed to the scroll position):
//   0.00 to 0.35  the copy lifts away, the auditorium comes into full view and the logo glides to the centre
//   0.38 to 0.62  the logo rises and the mission line lights up word by word
//   0.64 to 1.00  a dome in the page colour rises with words running round its edge, and the next section follows
// Paused or reduced motion: no smooth scrolling, no pinning, the plain banner hero. Phones get smooth scrolling only.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { isPaused, onMotionChange } from '../shell.js';

gsap.registerPlugin(ScrollTrigger);

export function initIntro(hero) {
  if (!hero) return;
  const roomy = window.matchMedia('(min-width: 768px) and (min-height: 600px)');
  let lenis = null;
  let story = null;
  const raf = time => lenis?.raf(time * 1000);

  const build = () => {
    story?.revert();
    story = null;
    lenis?.destroy();
    lenis = null;
    gsap.ticker.remove(raf);
    hero.classList.remove('is-scrolly');
    if (isPaused()) {
      ScrollTrigger.refresh();
      return;
    }
    lenis = new Lenis({ anchors: true, lerp: 0.09 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    if (!roomy.matches) {
      ScrollTrigger.refresh();
      return;
    }
    hero.classList.add('is-scrolly');
    story = gsap.context(() => {
      const mark = hero.querySelector('.home-mark');
      // Where the logo's centre sits in the pinned hero, so it can be moved to a point on screen.
      const centre = () => {
        const h = hero.getBoundingClientRect();
        const m = mark.getBoundingClientRect();
        return { x: m.left - h.left + m.width / 2, y: m.top - h.top + m.height / 2 };
      };
      const timeline = gsap.timeline({
        defaults: { ease: 'power2.inOut' },
        scrollTrigger: { trigger: hero, start: 'top top', end: '+=230%', pin: true, scrub: 0.8, invalidateOnRefresh: true },
      });
      timeline
        .to('.home-hero-copy', { y: -90, autoAlpha: 0, duration: 0.3, ease: 'power2.in' }, 0)
        .to('.home-banner-wash', { opacity: 0.4, duration: 0.35 }, 0)
        .fromTo('.home-banner picture', { scale: 1.14 }, { scale: 1, duration: 0.6, ease: 'none' }, 0)
        .to(mark, { x: () => window.innerWidth / 2 - centre().x, y: () => window.innerHeight * 0.44 - centre().y, scale: 1.12, duration: 0.35 }, 0)
        .to(mark, { y: () => window.innerHeight * 0.3 - centre().y, scale: 0.62, duration: 0.24 }, 0.38)
        .fromTo('.home-mission', { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.1 }, 0.4)
        .to('.home-mission span', { opacity: 1, stagger: 0.022, duration: 0.05, ease: 'none' }, 0.44)
        .to('.home-dome', { y: () => -window.innerHeight * 0.84, duration: 0.36 }, 0.64)
        .fromTo('.home-dome-arc', { rotate: -26 }, { rotate: 8, duration: 0.36, ease: 'none' }, 0.64);
    }, hero);
    ScrollTrigger.refresh();
  };

  onMotionChange(build);
  roomy.addEventListener('change', build);
  build();
}
