export function sectionProgress(scroll, start, end) {
  if (![scroll, start, end].every(Number.isFinite) || end <= start) return 0;
  return Math.max(0, Math.min(1, (scroll - start) / (end - start)));
}
export function smoothRange(value, start, end) {
  const p = sectionProgress(value, start, end);
  return p * p * (3 - 2 * p);
}
export function easeOutCubic(p) {
  return 1 - Math.pow(1 - p, 3);
}
export function easeInOutCubic(p) {
  return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}
/** Move toward a target at a rate that stays the same at any frame rate. */
export function follow(current, target, rate, seconds) {
  return target + (current - target) * Math.exp(-rate * seconds);
}
