/**
 * jsdom has no layout. Give elements a width and add a no-op ResizeObserver
 * so the timeline draws in component tests.
 */
export function stubLayout(width = 1200) {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => width });
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
