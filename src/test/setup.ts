import "@testing-library/jest-dom/vitest";

// IntersectionObserver polyfill for the infinite-scroll sentinel.
class IO {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
// @ts-expect-error - test env
globalThis.IntersectionObserver = globalThis.IntersectionObserver ?? IO;