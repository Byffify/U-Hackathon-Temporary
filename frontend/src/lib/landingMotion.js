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
  const stacked = window.matchMedia("(min-width: 1024px)");
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
    const loops = new Set();
    let disposed = false;
    const slides = new Map();
    const visibleSlides = new Set();
    const panels = [...root.querySelectorAll("[data-landing-slide]")];
    const stack = stacked.matches;
    const panelFilters = new Map();
    function sizePanels() {
      if (!stack) return;
      const heights = panels.map((panel) => panel.offsetHeight);
      panels.forEach((panel, index) => {
        // Tall panels finish reading before pinning; short panels stop below the header.
        panel.style.top = `${Math.min(88, window.innerHeight - heights[index])}px`;
      });
    }
    if (stack) {
      root.classList.add("landing-stack");
      panels.forEach((panel, index) => {
        panel.classList.add("landing-stack-panel");
        panel.style.zIndex = String(index + 1);
      });
      sizePanels();
    }
    let frame = 0;
    let heroActive = false;
    const hero = root.querySelector(".hero");
    const heroAnchor = hero?.closest("[data-landing-slide]") || hero;
    const track = root.querySelector(".hero-word-track");
    const wordWindow = root.querySelector(".hero-word-window");
    track?.classList.add("hero-words-active");
    const underline = root.querySelector(".highlight-word svg");
    const wordFrames = [];
    for (let index = 0; index < 4; index++) {
      wordFrames.push(
        { transform: `translateY(-${index * 1.15}em)`, offset: index * 0.25 },
        {
          transform: `translateY(-${index * 1.15}em)`,
          offset: index * 0.25 + 0.19,
        },
      );
    }
    wordFrames.push({ transform: "translateY(-4.6em)", offset: 1 });
    const widthFrames = () => {
      const words = [...(track?.children || [])];
      const widths = words.map(
        (word) => `${word.getBoundingClientRect().width}px`,
      );
      return wordFrames.map((frame, index) => ({
        width: widths[Math.min(4, Math.floor(index / 2))],
        offset: frame.offset,
        easing: EASE,
      }));
    };
    let widthAnimation;
    for (const [element, frames, duration, id] of [
      [track, wordFrames, 12000, "landing-word-loop"],
      [
        wordWindow,
        wordWindow ? widthFrames() : [],
        12000,
        "landing-word-width",
      ],
      [
        underline,
        [
          { clipPath: "inset(0 100% 0 0)", offset: 0 },
          { clipPath: "inset(0 0% 0 0)", offset: 0.25 },
          { clipPath: "inset(0 0% 0 0)", offset: 0.8 },
          { clipPath: "inset(0 0 0 100%)", offset: 0.95 },
          { clipPath: "inset(0 0 0 100%)", offset: 1 },
        ],
        3200,
        "landing-underline-loop",
      ],
    ]) {
      if (!element) continue;
      const animation = element.animate(frames, {
        duration,
        iterations: Infinity,
        easing: "linear",
      });
      animation.id = id;
      if (id === "landing-word-width") widthAnimation = animation;
      animation.pause();
      animations.add(animation);
      loops.add(animation);
    }
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
      if (stack) continue;
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
      const stackRects = stack
        ? panels.map((panel) => panel.getBoundingClientRect())
        : [];
      const heroVisible =
        heroRect &&
        heroRect.bottom > 0 &&
        (!stack || !stackRects[1] || stackRects[1].top > 88);
      for (const animation of loops) {
        if (heroVisible && animation.playState !== "running") animation.play();
        else if (!heroVisible && animation.playState !== "paused")
          animation.pause();
      }
      if (stack) {
        const keyboardMode = root.classList.contains("landing-keyboard");
        panels.forEach((panel, index) => {
          const content = panel.firstElementChild;
          if (!content) return;
          const next = stackRects[index + 1];
          const pinned =
            stackRects[index].top <= parseFloat(panel.style.top) + 1;
          const progress =
            next &&
            pinned &&
            !keyboardMode &&
            !panel.contains(document.activeElement)
              ? clamp(
                  (window.innerHeight - next.top) /
                    Math.max(1, window.innerHeight - 88),
                )
              : 0;
          const filter =
            progress > 0 ? `blur(${(progress * 6).toFixed(2)}px)` : "";
          if (panelFilters.get(content) !== filter) {
            content.style.filter = filter;
            panelFilters.set(content, filter);
          }
        });
      }
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
      if (
        !frame &&
        (stack || heroActive || visibleSlides.size) &&
        !document.hidden
      )
        frame = requestAnimationFrame(update);
    }
    const heroObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target !== heroAnchor) continue;
        heroActive = entry.isIntersecting;
        if (heroActive) schedule();
        else for (const animation of loops) animation.pause();
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
    const keyboard = (event) => {
      if (stack && event.key === "Tab") {
        root.classList.add("landing-keyboard");
        schedule();
      }
    };
    const pointer = () => {
      root.classList.remove("landing-keyboard");
      schedule();
    };
    document.addEventListener("keydown", keyboard);
    root.addEventListener("pointerdown", pointer);
    const resized = () => {
      widthAnimation?.effect.setKeyframes(widthFrames());
      sizePanels();
      schedule();
    };
    window.addEventListener("resize", resized, { passive: true });
    document.fonts?.ready.then(() => {
      if (!disposed) resized();
    });
    const visibility = () => {
      for (const animation of animations) {
        if (scrubbed.has(animation)) continue;
        if (document.hidden) animation.pause();
        else if (!loops.has(animation)) animation.play();
      }
      schedule();
    };
    document.addEventListener("visibilitychange", visibility);
    root.addEventListener("focusin", schedule);
    root.addEventListener("focusout", schedule);
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(resized)
        : null;
    resizeObserver?.observe(root);
    if (stack) for (const panel of panels) resizeObserver?.observe(panel);
    stop = () => {
      disposed = true;
      cancelAnimationFrame(frame);
      frame = 0;
      heroObserver.disconnect();
      arrivalObserver.disconnect();
      sectionObserver.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("scroll", schedule);
      document.removeEventListener("keydown", keyboard);
      root.removeEventListener("pointerdown", pointer);
      window.removeEventListener("resize", resized);
      document.removeEventListener("visibilitychange", visibility);
      root.removeEventListener("focusin", schedule);
      root.removeEventListener("focusout", schedule);
      for (const animation of animations) animation.cancel();
      animations.clear();
      track?.classList.remove("hero-words-active");
      for (const content of panelFilters.keys())
        content.style.removeProperty("filter");
      panelFilters.clear();
      root.classList.remove("landing-stack");
      root.classList.remove("landing-keyboard");
      for (const panel of panels) {
        panel.classList.remove("landing-stack-panel");
        panel.style.removeProperty("top");
        panel.style.removeProperty("z-index");
      }
    };
  }
  start();
  reduced.addEventListener("change", start);
  compact.addEventListener("change", start);
  stacked.addEventListener("change", start);
  return () => {
    stop();
    reduced.removeEventListener("change", start);
    compact.removeEventListener("change", start);
    stacked.removeEventListener("change", start);
  };
}
