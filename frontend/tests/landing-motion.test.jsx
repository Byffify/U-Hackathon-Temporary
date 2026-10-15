import { afterEach, describe, it, expect, vi } from "vitest";
import {
  createLandingMotion,
  sectionSlideProgress,
} from "../src/lib/landingMotion.js";

let dispose;
afterEach(() => {
  dispose?.();
  dispose = undefined;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function environment(reduced = false) {
  document.body.innerHTML =
    '<main><section class="hero"><div class="hero-flora"></div><div class="hero-orbit-card"></div><div class="hero-folio"></div><span class="highlight-word"><svg></svg></span></section><div class="creator-cover"></div><button>Start creating</button><input></main>';
  const listeners = new Map();
  const query = {
    matches: reduced,
    addEventListener: vi.fn((_, fn) => listeners.set("motion", fn)),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal(
    "matchMedia",
    vi.fn((q) =>
      q.includes("reduced-motion")
        ? query
        : {
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          },
    ),
  );
  const observers = [];
  const observe = vi.fn();
  const disconnect = vi.fn();
  class Observer {
    constructor(callback) {
      this.callback = callback;
      this.observe = observe;
      this.disconnect = disconnect;
      this.unobserve = vi.fn();
      observers.push(this);
    }
  }
  vi.stubGlobal("IntersectionObserver", Observer);
  const animations = [];
  const animate = vi.fn(function () {
    const animation = {
      id: "",
      currentTime: 0,
      pause: vi.fn(),
      play: vi.fn(),
      cancel: vi.fn(),
      finished: Promise.resolve(),
    };
    animations.push(animation);
    return animation;
  });
  vi.stubGlobal("requestAnimationFrame", (fn) => {
    fn();
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  Object.defineProperty(Element.prototype, "animate", {
    configurable: true,
    writable: true,
    value: animate,
  });
  return {
    query,
    listeners,
    observers,
    animations,
    animate,
    observe,
    disconnect,
    root: document.querySelector("main"),
  };
}
describe("landing motion accessibility and lifecycle", () => {
  it("slides incoming and outgoing sections continuously and reverses with scroll position", () => {
    const incoming = { top: 850, bottom: 1550 },
      settled = { top: 200, bottom: 1000 },
      outgoing = { top: -600, bottom: 100 };
    expect(sectionSlideProgress(incoming, 1000)).toBeLessThan(0.5);
    expect(sectionSlideProgress(settled, 1000)).toBe(0.5);
    expect(sectionSlideProgress(outgoing, 1000)).toBeGreaterThan(0.5);
    expect(sectionSlideProgress(settled, 1000)).toBe(0.5);
    expect(sectionSlideProgress(outgoing, 1000, true)).toBe(0.5);
  });
  it("never starts nonessential motion for reduced-motion users", () => {
    const env = environment(true);
    dispose = createLandingMotion(env.root);
    expect(env.animate).not.toHaveBeenCalled();
    expect(document.querySelector("button").textContent).toBe("Start creating");
  });
  it("observes selected artwork, leaves controls alone and cancels animations when preference changes", () => {
    const env = environment();
    dispose = createLandingMotion(env.root);
    expect(env.observers.length).toBeGreaterThan(0);
    for (const observer of env.observers)
      observer.callback([
        { target: document.querySelector(".hero"), isIntersecting: true },
        {
          target: document.querySelector(".creator-cover"),
          isIntersecting: true,
        },
      ]);
    expect(env.animate).toHaveBeenCalled();
    for (const target of env.animate.mock.contexts)
      expect(["BUTTON", "INPUT", "H1"]).not.toContain(target.tagName);
    env.query.matches = true;
    env.listeners.get("motion")();
    for (const animation of env.animations)
      expect(animation.cancel).toHaveBeenCalled();
    expect(env.disconnect).toHaveBeenCalled();
  });
});
