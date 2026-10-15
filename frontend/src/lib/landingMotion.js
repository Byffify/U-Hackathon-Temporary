const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const clamp = (value) => Math.max(0, Math.min(1, value));
export function sectionSlideProgress(rect, viewportHeight, focused = false) {
  if (focused) return 0.5;
  const height = Math.max(1, viewportHeight);
  if (rect.top > height * 0.3)
    return 0.5 * (1 - clamp((rect.top - height * 0.3) / (height * 0.7)));
  if (rect.bottom < height * 0.55)
    return 0.5 + 0.5 * clamp((height * 0.55 - rect.bottom) / (height * 0.55));
  return 0.5;
}

/** Progressive enhancement: native scrolling with reversible, bounded section slides. */
export function createLandingMotion(root) {
  if (!root || !window.matchMedia) return () => {};
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const compact = window.matchMedia("(max-width: 640px)");
  let stop = () => {};
  function start() {
    stop();
    if (
      reduced.matches ||
      typeof IntersectionObserver === "undefined" ||
      !Element.prototype.animate
    ) {
      stop = () => {};
      return;
    }
    const animations = new Set();
    const scrubbed = new Set();
    const slides = new Map();
    const visibleSlides = new Set();
    let frame = 0;
    let heroActive = false;
    const hero = root.querySelector(".hero");
    const heroAnchor = hero?.closest("[data-landing-slide]") || hero;
    const drift = [];
    const distance = compact.matches ? 0.45 : 1;
    for (const [selector, x, y, rotation] of [
      [".hero-flora", -28, -38, -3],
      [".hero-orbit-card", 26, 30, 3],
      [".hero-folio", 12, -24, 2],
    ]) {
      const card = root.querySelector(selector);
      if (!card) continue;
      const animation = card.animate(
        [
          { translate: "0px 0px", rotate: "0deg" },
          {
            translate: `${x * distance}px ${y * distance}px`,
            rotate: `${rotation * distance}deg`,
          },
        ],
        { duration: 1000, fill: "both", easing: "linear" },
      );
      animation.id = `landing-orbit-${selector.slice(1)}`;
      animation.pause();
      animation.currentTime = 0;
      animations.add(animation);
      scrubbed.add(animation);
      drift.push(animation);
    }
    for (const anchor of root.querySelectorAll("[data-landing-slide]")) {
      const content = anchor.firstElementChild;
      if (!content) continue;
      const animation = content.animate(
        [
          { translate: `0 ${compact.matches ? 48 : 96}px`, offset: 0 },
          { translate: "0px 0px", offset: 0.5 },
          { translate: `0 -${compact.matches ? 32 : 64}px`, offset: 1 },
        ],
        { duration: 1000, fill: "both", easing: "linear" },
      );
      animation.id = "landing-section-slide";
      animation.pause();
      animation.currentTime = 500;
      slides.set(anchor, { content, animation });
      animations.add(animation);
      scrubbed.add(animation);
    }
    function update() {
      frame = 0;
      if (document.hidden) return;
      const heroRect =
        heroActive && heroAnchor ? heroAnchor.getBoundingClientRect() : null;
      const positions = [...visibleSlides].map((anchor) => ({
        slide: slides.get(anchor),
        rect: anchor.getBoundingClientRect(),
      }));
      if (heroRect) {
        const progress = clamp(
          -heroRect.top / Math.max(1, heroRect.height * 0.9),
        );
        for (const animation of drift) animation.currentTime = progress * 1000;
      }
      for (const { slide, rect } of positions) {
        slide.animation.currentTime =
          sectionSlideProgress(
            rect,
            window.innerHeight,
            slide.content.contains(document.activeElement),
          ) * 1000;
      }
    }
    function schedule() {
      if (!frame && (heroActive || visibleSlides.size) && !document.hidden)
        frame = requestAnimationFrame(update);
    }
    const heroObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target !== heroAnchor) continue;
        heroActive = entry.isIntersecting;
        if (heroActive) schedule();
      }
    });
    if (heroAnchor) heroObserver.observe(heroAnchor);
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!slides.has(entry.target)) continue;
          entry.isIntersecting
            ? visibleSlides.add(entry.target)
            : visibleSlides.delete(entry.target);
        }
        schedule();
      },
      { rootMargin: "120px 0px 120px 0px" },
    );
    for (const anchor of slides.keys()) sectionObserver.observe(anchor);
    const arrivals = new Map();
    const add = (selector, frames, duration) => {
      const element = root.querySelector(selector);
      if (element) arrivals.set(element, { frames, duration });
    };
    add(
      ".highlight-word svg",
      [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)" }],
      700,
    );
    const arrivalObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const config = arrivals.get(entry.target);
          if (!entry.isIntersecting || !config) continue;
          arrivalObserver.unobserve(entry.target);
          arrivals.delete(entry.target);
          const animation = entry.target.animate(config.frames, {
            duration: config.duration,
            easing: EASE,
            fill: "none",
          });
          animation.id = "landing-arrival";
          animations.add(animation);
          animation.finished.then(
            () => {
              animation.cancel();
              animations.delete(animation);
            },
            () => {},
          );
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -5% 0px" },
    );
    for (const element of arrivals.keys()) arrivalObserver.observe(element);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    const visibility = () => {
      for (const animation of animations) {
        if (scrubbed.has(animation)) continue;
        document.hidden ? animation.pause() : animation.play();
      }
      schedule();
    };
    document.addEventListener("visibilitychange", visibility);
    root.addEventListener("focusin", schedule);
    root.addEventListener("focusout", schedule);
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(schedule)
        : null;
    resizeObserver?.observe(root);
    stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      heroObserver.disconnect();
      arrivalObserver.disconnect();
      sectionObserver.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", visibility);
      root.removeEventListener("focusin", schedule);
      root.removeEventListener("focusout", schedule);
      for (const animation of animations) animation.cancel();
      animations.clear();
    };
  }
  start();
  reduced.addEventListener("change", start);
  compact.addEventListener("change", start);
  return () => {
    stop();
    reduced.removeEventListener("change", start);
    compact.removeEventListener("change", start);
  };
}
