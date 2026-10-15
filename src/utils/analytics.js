/** Local integration event only; no third-party analytics or wallet data. */
export function trackInteraction(action, placement) {
  window.dispatchEvent(
    new CustomEvent("utopia:interaction", {
      detail: { action, placement, locale: "en" },
    }),
  );
}
