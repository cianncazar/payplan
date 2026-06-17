import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// IntersectionObserver is not implemented in jsdom. Must use a class so `new` works.
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});
